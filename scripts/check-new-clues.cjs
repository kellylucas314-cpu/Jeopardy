/**
 * Repeat and copying guard for NEW clue files, before they join a pack.
 *
 * Usage: node scripts/check-new-clues.cjs <file-or-dir> [more…]
 *   Files use the authoring prefixes (n1-/n2-/nf- for Fresh, e1-/e2-/ef- for Easy Breezy).
 *
 * Checks every new category and clue against:
 *   1. our deployed packs (Fresh, Easy Breezy, Campaign): no reused category name,
 *      no clue that restates an existing clue's fact (same response + overlapping words),
 *      no identical clue text;
 *   2. the Deep Archive of televised clues: no category name taken from the show, no clue
 *      that shares a seven-word run with a real clue or closely matches one with the same
 *      response (we write our own sentences);
 *   3. the other new files in the same run (same rules, so two writers can't collide).
 * Structure and banned phrases are checked by scripts/check-questions.cjs; run both.
 * Exit code 1 on any problem.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'data');

const STOP = new Set(('the a an and or of to in on at by for with from as is was were be been his her its their this that these those ' +
  'he she it they who whom which what when where why how one ones into than then also only first named name called known ' +
  'after before over under about can could would will may did does do has have had not no but so if some such').split(' '));

function norm(s) {
  return String(s || '').toLowerCase().replace(/\\(["'])/g, '$1').replace(/<[^>]+>/g, ' ')
    .replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function normResponse(r) {
  return norm(String(r).replace(/\(.*?\)/g, ' ')).replace(/^(a|an|the) /, '').replace(/'s\b/g, '').trim();
}
function tokens(s) {
  return new Set(norm(s).split(' ').map(w => w.replace(/'s$|'/g, '')).filter(w => w.length > 2 && !STOP.has(w)));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}
// 32-bit FNV-1a: cheap shingle hashing for the 470k-clue archive.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const SHINGLE = 7;
function shingles(s) {
  const w = norm(s).split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i + SHINGLE <= w.length; i++) out.push(hash(w.slice(i, i + SHINGLE).join(' ')));
  return out;
}

function readChunks(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.json')) out.push(...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  return out;
}
function flatten(items, source) {
  // board categories → one entry per clue; finals are already flat
  const rows = [];
  for (const it of items) {
    if (Array.isArray(it.clues)) for (const c of it.clues) rows.push({ cat: it.name, clue: c.clue, response: c.response, source });
    else rows.push({ cat: it.name, clue: it.clue, response: it.response, source });
  }
  return rows;
}

// ——— existing material ———
const ours = [];
const ourNames = new Map();
for (const [pack, label] of [['original', 'Fresh'], ['easy', 'Easy Breezy']]) {
  for (const dir of ['jeopardy', 'double', 'final']) {
    const items = readChunks(path.join(DATA, pack, dir));
    for (const it of items) ourNames.set(String(it.name).trim().toUpperCase(), `${label} ${dir}`);
    ours.push(...flatten(items, `${label} ${dir}`));
  }
}
const campaignPath = path.join(DATA, 'campaign', 'chapters.json');
if (fs.existsSync(campaignPath)) {
  const camp = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
  for (const ch of camp.chapters || []) {
    for (const it of [ch.era, ch.chapter, ch.final]) {
      if (!it || !it.name) continue;
      ourNames.set(String(it.name).trim().toUpperCase(), 'Campaign');
      ours.push(...flatten([it], 'Campaign'));
    }
  }
}

const archiveNames = new Set();
const archiveShingles = new Set();
const archiveByResponse = new Map();
let archiveCount = 0;
for (const dir of ['jeopardy', 'double', 'final']) {
  for (const it of readChunks(path.join(DATA, dir))) {
    archiveNames.add(norm(it.name).toUpperCase());
    for (const row of flatten([it], 'archive')) {
      archiveCount++;
      for (const h of shingles(row.clue)) archiveShingles.add(h);
      const key = normResponse(row.response);
      if (!key) continue;
      if (!archiveByResponse.has(key)) archiveByResponse.set(key, []);
      archiveByResponse.get(key).push(row.clue);
    }
  }
}

const ourByResponse = new Map();
const ourExact = new Map();
for (const row of ours) {
  const key = normResponse(row.response);
  if (!ourByResponse.has(key)) ourByResponse.set(key, []);
  ourByResponse.get(key).push(row);
  ourExact.set(norm(row.clue), row);
}

// ——— new material ———
const targets = process.argv.slice(2);
if (!targets.length) { console.error('usage: node scripts/check-new-clues.cjs <file-or-dir> […]'); process.exit(1); }
const files = [];
for (const t of targets) {
  const st = fs.statSync(t);
  if (st.isDirectory()) for (const f of fs.readdirSync(t).sort()) { if (/^(n1|n2|nf|e1|e2|ef)-.*\.json$/.test(f)) files.push(path.join(t, f)); }
  else files.push(t);
}

const problems = [];
const warnings = [];
const newNames = new Map();
const newByResponse = new Map();
let newClues = 0;

const SAME_FACT = 0.34;     // same response + this much word overlap = the same fact restated
const ARCHIVE_CLOSE = 0.5;  // same response + this much overlap with a televised clue = too close

for (const file of files) {
  const base = path.basename(file);
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { problems.push(`${base}: unparseable JSON — ${e.message}`); continue; }
  const fileResponses = new Map();
  for (const it of data) {
    const name = String(it.name || '').trim();
    const key = name.toUpperCase();
    if (ourNames.has(key)) problems.push(`${base} "${name}": category name already used in ${ourNames.get(key)}`);
    if (archiveNames.has(norm(name).toUpperCase())) problems.push(`${base} "${name}": category name is a televised category name, invent your own`);
    if (newNames.has(key)) problems.push(`${base} "${name}": name also used in ${newNames.get(key)}`);
    newNames.set(key, base);

    for (const row of flatten([it], base)) {
      newClues++;
      const where = `${base} "${name}" → ${row.response}`;
      const rKey = normResponse(row.response);
      const tok = tokens(row.clue);

      if (ourExact.has(norm(row.clue))) problems.push(`${where}: identical to an existing clue (${ourExact.get(norm(row.clue)).source})`);
      for (const old of ourByResponse.get(rKey) || []) {
        const j = jaccard(tok, tokens(old.clue));
        if (j >= SAME_FACT) { problems.push(`${where}: restates an existing ${old.source} clue (${old.cat}): "${old.clue}"`); break; }
      }
      for (const old of newByResponse.get(rKey) || []) {
        const j = jaccard(tok, old.tok);
        if (j >= SAME_FACT) { problems.push(`${where}: restates a new clue in ${old.where}`); break; }
      }
      if (shingles(row.clue).some(h => archiveShingles.has(h))) problems.push(`${where}: shares a ${SHINGLE}-word run with a televised clue, rewrite in your own words`);
      for (const old of archiveByResponse.get(rKey) || []) {
        if (jaccard(tok, tokens(old)) >= ARCHIVE_CLOSE) { problems.push(`${where}: too close to a televised clue: "${old}"`); break; }
      }
      if (fileResponses.has(rKey)) warnings.push(`${where}: response also used in "${fileResponses.get(rKey)}" in the same file`);
      fileResponses.set(rKey, name);
      if (!newByResponse.has(rKey)) newByResponse.set(rKey, []);
      newByResponse.get(rKey).push({ tok, where: `${base} "${name}"` });
    }
  }
}

console.log(`checked ${files.length} files · ${newClues} new clues · against ${ours.length} of ours and ${archiveCount} archive clues`);
if (warnings.length) { console.log(`\n${warnings.length} warnings:`); for (const w of warnings) console.log('  ~', w); }
if (problems.length) { console.log(`\n${problems.length} PROBLEMS:`); for (const p of problems) console.log('  -', p); process.exit(1); }
console.log('OK — no repeats of our clues, no copying from the archive');

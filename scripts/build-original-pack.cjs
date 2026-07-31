/**
 * Assemble the original "Fresh Pack" from authored category files.
 *
 * Usage: node scripts/build-original-pack.cjs <source-dir>
 *   <source-dir> contains r1-*.json (round 1), r2-*.json (round 2), final-*.json.
 *
 * Validates structure, dedupes category names, and writes chunked JSON to
 * public/data/original/{jeopardy,double,final}/ plus updates public/data/manifest.json.
 */

const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const PACK = process.argv[3] || 'fresh';
if (!SRC) { console.error('usage: node build-original-pack.cjs <source-dir> [fresh|easy]'); process.exit(1); }

// File-name prefixes per pack: fresh boards were authored as r1-*/n1-* (round 1)
// and r2-*/n2-* (round 2) with finals in final-*/nf-*; the easy pack uses e1-/e2-/ef-.
const PACKS = {
  fresh: { outDir: 'original', manifestKey: 'original', r1: ['r1-', 'n1-'], r2: ['r2-', 'n2-'], finals: ['final-', 'nf-'] },
  easy: { outDir: 'easy', manifestKey: 'easy', r1: ['e1-'], r2: ['e2-'], finals: ['ef-'] },
};
const cfg = PACKS[PACK];
if (!cfg) { console.error(`unknown pack "${PACK}"`); process.exit(1); }

const OUT = path.join(__dirname, '..', 'public', 'data', cfg.outDir);
const CHUNK_SIZE = 12;
const MEDIA_RE = /\b(seen here|shown here|heard here|pictured|depicted|audio clue|video clue)\b/i;
const ROUND1_VALUES = [200, 400, 600, 800, 1000];
const ROUND2_VALUES = [400, 800, 1200, 1600, 2000];

const problems = [];

function loadRound(prefixes, expected) {
  const files = fs.readdirSync(SRC)
    .filter(f => prefixes.some(p => f.startsWith(p)) && f.endsWith('.json') && !f.startsWith('fixes-'))
    .sort();
  const cats = [];
  const seenNames = new Set();
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
    } catch (e) {
      problems.push(`${f}: unparseable JSON — ${e.message}`);
      continue;
    }
    if (!Array.isArray(data)) { problems.push(`${f}: not an array`); continue; }
    for (const cat of data) {
      const name = (cat.name || '').trim();
      if (!name) { problems.push(`${f}: category with no name`); continue; }
      const key = name.toUpperCase();
      if (seenNames.has(key)) { problems.push(`${f}: duplicate category "${name}" dropped`); continue; }
      if (!Array.isArray(cat.clues) || cat.clues.length !== 5) {
        problems.push(`${f}: "${name}" has ${cat.clues?.length ?? 0} clues, need 5`); continue;
      }
      let ok = true;
      const cleaned = [];
      for (let i = 0; i < 5; i++) {
        const c = cat.clues[i];
        const clue = (c.clue || '').trim();
        const response = String(c.response ?? '').trim();
        if (clue.length < 8 || !response) { problems.push(`${f}: "${name}" row ${i} empty/short`); ok = false; break; }
        if (MEDIA_RE.test(clue)) { problems.push(`${f}: "${name}" row ${i} references media`); ok = false; break; }
        if (c.value !== expected[i]) { problems.push(`${f}: "${name}" row ${i} value ${c.value} ≠ ${expected[i]} (fixed)`); }
        cleaned.push({ clue, response, value: expected[i], isDailyDouble: false });
      }
      if (!ok) continue;
      seenNames.add(key);
      cats.push({ name, clues: cleaned });
    }
  }
  return cats;
}

function loadFinals(prefixes) {
  const files = fs.readdirSync(SRC)
    .filter(f => prefixes.some(p => f.startsWith(p)) && f.endsWith('.json') && !f.startsWith('fixes-'))
    .sort();
  const finals = [];
  const seen = new Set();
  for (const f of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')); }
    catch (e) { problems.push(`${f}: unparseable JSON — ${e.message}`); continue; }
    for (const c of data) {
      const name = (c.name || '').trim();
      const clue = (c.clue || '').trim();
      const response = String(c.response ?? '').trim();
      if (!name || clue.length < 8 || !response) { problems.push(`${f}: bad final "${name}"`); continue; }
      if (seen.has(name.toUpperCase())) { problems.push(`${f}: duplicate final "${name}" dropped`); continue; }
      seen.add(name.toUpperCase());
      finals.push({ name, clue, response });
    }
  }
  return finals;
}

function writeChunks(dir, items, size) {
  const full = path.join(OUT, dir);
  fs.rmSync(full, { recursive: true, force: true });
  fs.mkdirSync(full, { recursive: true });
  let n = 0;
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    fs.writeFileSync(path.join(full, `chunk-${String(n).padStart(3, '0')}.json`), JSON.stringify(chunk));
    n++;
  }
  return n;
}

// Shuffle so each chunk mixes domains (agents wrote by topic).
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const r1 = shuffle(loadRound(cfg.r1, ROUND1_VALUES));
const r2 = shuffle(loadRound(cfg.r2, ROUND2_VALUES));
const finals = shuffle(loadFinals(cfg.finals));

const counts = {
  jeopardy: writeChunks('jeopardy', r1, CHUNK_SIZE),
  double: writeChunks('double', r2, CHUNK_SIZE),
  final: writeChunks('final', finals, 30),
};

const manifestPath = path.join(__dirname, '..', 'public', 'data', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest[cfg.manifestKey] = counts;
fs.writeFileSync(manifestPath, JSON.stringify(manifest));

console.log(`Round 1: ${r1.length} categories → ${counts.jeopardy} chunks`);
console.log(`Round 2: ${r2.length} categories → ${counts.double} chunks`);
console.log(`Finals:  ${finals.length} clues → ${counts.final} chunks`);
if (problems.length) {
  console.log(`\n${problems.length} issues:`);
  for (const p of problems) console.log('  -', p);
}

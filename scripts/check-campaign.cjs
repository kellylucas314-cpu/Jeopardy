/**
 * Campaign content checker — validates public/data/campaign/chapters.json.
 *
 * Usage: node scripts/check-campaign.cjs
 *
 * Applies the same engine rules as check-questions.cjs (lengths, banned media /
 * dated phrases, giveaway warnings, ALL-CAPS names, R1 value ladder) plus the
 * campaign's own invariants: chapter numbering, unique category and final names
 * (also against the deployed packs), no repeated answer inside one chapter's
 * game, and a valid empire ledger.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'public', 'data', 'campaign', 'chapters.json');

const MEDIA_RE = /\b(seen here|shown here|heard here|pictured|depicted|this song|audio clue|video clue|in this picture|in the picture|the following clip|sung here|played here|read the|this painting shown|this logo)\b/i;
const DATED_RE = /\b(currently|to date|as of now|reigning|incumbent|is now called|now stars|now plays|newest|most recently)\b/i;
const R1 = [200, 400, 600, 800, 1000];
const STATUSES = new Set(['core', 'annexed', 'satellite', 'allied', 'occupied', 'lost', 'exile']);

const problems = [];
const warnings = [];

// Names already living in the deployed packs — a campaign category must not collide,
// because the no-repeat memory tracks names.
const deployed = new Set();
for (const pack of ['original', 'easy']) {
  for (const dir of ['jeopardy', 'double', 'final']) {
    const d = path.join(ROOT, 'public', 'data', pack, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      for (const c of JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) deployed.add(String(c.name).toUpperCase());
    }
  }
}

function checkText(where, clue, response) {
  if (!clue || clue.length < 25) problems.push(`${where}: clue too short (${clue ? clue.length : 0} chars)`);
  if (clue && clue.length > 160) problems.push(`${where}: clue too long (${clue.length} chars, max 160)`);
  if (clue && MEDIA_RE.test(clue)) problems.push(`${where}: banned media phrase "${clue.match(MEDIA_RE)[0]}"`);
  if (clue && DATED_RE.test(clue)) problems.push(`${where}: banned dated phrase "${clue.match(DATED_RE)[0]}"`);
  if (!response || !response.trim()) problems.push(`${where}: empty response`);
  if (response && response.length > 45) problems.push(`${where}: response too long (${response.length} chars)`);
  if (clue && response) {
    const clueLower = ` ${clue.toLowerCase().replace(/[^a-z0-9']+/g, ' ')} `;
    for (const w of response.toLowerCase().split(/[^a-z0-9']+/)) {
      if (w.length >= 4 && !['this', 'the', 'and'].includes(w) && clueLower.includes(` ${w} `)) {
        warnings.push(`${where}: response word "${w}" appears in the clue — giveaway?`);
        break;
      }
    }
  }
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
if (!Array.isArray(data.chapters) || !data.chapters.length) { console.error('no chapters'); process.exit(1); }

const names = new Map();
function registerName(name, where) {
  const key = name.toUpperCase();
  if (name !== key) problems.push(`${where}: name must be ALL CAPS`);
  if (deployed.has(key)) problems.push(`${where}: name "${name}" already exists in a deployed pack`);
  if (names.has(key)) problems.push(`${where}: duplicate name "${name}" also in ${names.get(key)}`);
  else names.set(key, where);
}

function normResp(r) {
  return String(r).toLowerCase().replace(/\(.*?\)/g, '').replace(/^(a|an|the)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

let clues = 0;
data.chapters.forEach((ch, i) => {
  const where = `ch${ch.number} "${ch.title}"`;
  if (ch.number !== i + 1) problems.push(`${where}: number ${ch.number} out of sequence (expected ${i + 1})`);
  for (const k of ['id', 'years', 'title', 'stage', 'place', 'blurb', 'quote', 'empire', 'era', 'chapter', 'final']) {
    if (ch[k] === undefined) problems.push(`${where}: missing "${k}"`);
  }
  if (!(ch.tier >= 1 && ch.tier <= 5)) problems.push(`${where}: tier must be 1–5`);
  if (ch.blurb && ch.blurb.length > 520) warnings.push(`${where}: blurb is long (${ch.blurb.length} chars)`);
  if (!ch.quote || !ch.quote.text || !ch.quote.by) problems.push(`${where}: quote needs text + by`);

  // Empire ledger
  const emp = ch.empire || {};
  if (!emp.headline || !Array.isArray(emp.holdings) || !emp.holdings.length) problems.push(`${where}: empire needs headline + holdings`);
  else {
    const seenH = new Set();
    for (const h of emp.holdings) {
      if (!h.name || !STATUSES.has(h.status)) problems.push(`${where}: holding "${h.name}" has bad status "${h.status}"`);
      if (seenH.has(h.name)) problems.push(`${where}: holding "${h.name}" listed twice`);
      seenH.add(h.name);
    }
    if (!emp.holdings.some(h => h.status === 'core')) problems.push(`${where}: empire has no core holding`);
  }

  // Categories: era + chapter, R1 ladder
  const responses = new Map();
  for (const key of ['era', 'chapter']) {
    const cat = ch[key];
    if (!cat || !cat.name || !Array.isArray(cat.clues) || cat.clues.length !== 5) {
      problems.push(`${where}: ${key} category needs a name and exactly 5 clues`); continue;
    }
    registerName(cat.name, `${where} ${key}`);
    cat.clues.forEach((c, r) => {
      clues++;
      const w = `${where} ${key} "${cat.name}" row ${r}`;
      if (c.value !== R1[r]) problems.push(`${w}: value ${c.value}, expected ${R1[r]}`);
      checkText(w, (c.clue || '').trim(), String(c.response ?? '').trim());
      const n = normResp(c.response);
      if (responses.has(n)) problems.push(`${w}: response "${c.response}" repeats ${responses.get(n)} within the chapter`);
      responses.set(n, key);
    });
  }
  const fin = ch.final;
  if (!fin || !fin.name || !fin.clue || !fin.response) problems.push(`${where}: final needs name, clue, response`);
  else {
    registerName(fin.name, `${where} final`);
    checkText(`${where} final "${fin.name}"`, fin.clue.trim(), String(fin.response).trim());
    const n = normResp(fin.response);
    if (responses.has(n)) problems.push(`${where} final: response "${fin.response}" repeats a ${responses.get(n)} clue in the same chapter`);
  }
});

console.log(`${data.chapters.length} chapters · ${clues} board clues · ${data.chapters.length} finals · ${names.size} unique names`);
if (warnings.length) {
  console.log(`\n${warnings.length} warnings (judgment calls):`);
  for (const w of warnings) console.log('  ~', w);
}
if (problems.length) {
  console.log(`\n${problems.length} PROBLEMS:`);
  for (const p of problems) console.log('  -', p);
  process.exit(1);
}
console.log('OK — campaign content passes');

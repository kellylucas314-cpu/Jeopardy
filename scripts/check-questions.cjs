/**
 * Question-pack checker — validates authored source files before grading/compiling.
 *
 * Usage:
 *   node scripts/check-questions.cjs                 # check everything under packs-src/
 *   node scripts/check-questions.cjs <file-or-dir>   # check one file / directory
 *
 * File-name prefix decides the rules:
 *   n1-/e1- → round 1 boards, values 200/400/600/800/1000
 *   n2-/e2- → round 2 boards, values 400/800/1200/1600/2000
 *   nf-/ef- → finals ({name, clue, response})
 *   r1-/r2-/final- → legacy fresh sources (same rules as n1/n2/nf)
 * Errors block acceptance; warnings need grader judgment.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(ROOT, 'packs-src', 'exclusion-baseline.txt');

// Mirrors the game's runtime filters in src/data.js — a hit makes a category unplayable.
const MEDIA_RE = /\b(seen here|shown here|heard here|pictured|depicted|this song|audio clue|video clue|in this picture|in the picture|the following clip|sung here|played here|read the|this painting shown|this logo)\b/i;
const DATED_RE = /\b(currently|to date|as of now|reigning|incumbent|is now called|now stars|now plays|newest|most recently)\b/i;

const R1 = [200, 400, 600, 800, 1000];
const R2 = [400, 800, 1200, 1600, 2000];

const target = process.argv[2] || path.join(ROOT, 'packs-src');
const files = [];
(function collect(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(p)) {
      if (f === 'grades' || f === 'reports') continue;
      collect(path.join(p, f));
    }
  } else if (p.endsWith('.json') && /(^|\/)(n1|n2|nf|e1|e2|ef|r1|r2|final)-[^/]*\.json$/.test(p)) {
    files.push(p);
  }
})(target);

if (!files.length) { console.error(`no authored .json files found under ${target}`); process.exit(1); }

const exclude = fs.existsSync(BASELINE)
  ? new Set(fs.readFileSync(BASELINE, 'utf8').split('\n').map(s => s.trim().toUpperCase()).filter(Boolean))
  : new Set();

const problems = [];
const warnings = [];
const globalNames = new Map(); // NAME -> first file (cross-file dupes)
let categories = 0, clues = 0, finals = 0;

function checkText(where, clue, response) {
  if (!clue || clue.length < 25) problems.push(`${where}: clue too short (${clue ? clue.length : 0} chars)`);
  if (clue && clue.length > 160) problems.push(`${where}: clue too long (${clue.length} chars, max 160)`);
  if (clue && MEDIA_RE.test(clue)) problems.push(`${where}: banned media phrase "${clue.match(MEDIA_RE)[0]}"`);
  if (clue && DATED_RE.test(clue)) problems.push(`${where}: banned dated phrase "${clue.match(DATED_RE)[0]}"`);
  if (!response || !response.trim()) problems.push(`${where}: empty response`);
  if (response && response.length > 45) problems.push(`${where}: response too long (${response.length} chars)`);
  if (clue && response) {
    const clueLower = ` ${clue.toLowerCase()} `;
    for (const w of response.toLowerCase().split(/[^a-z0-9']+/)) {
      if (w.length >= 4 && !['this', 'the', 'and'].includes(w) && clueLower.includes(` ${w}`)) {
        warnings.push(`${where}: response word "${w}" appears in the clue — giveaway?`);
        break;
      }
    }
  }
}

function registerName(name, file, where) {
  const key = name.toUpperCase();
  if (exclude.has(key)) problems.push(`${where}: name already exists in deployed packs (baseline) — pick another`);
  if (globalNames.has(key)) problems.push(`${where}: duplicate name also in ${path.basename(globalNames.get(key))}`);
  else globalNames.set(key, file);
  if (name !== name.toUpperCase()) problems.push(`${where}: name must be ALL CAPS`);
}

for (const file of files) {
  const base = path.basename(file);
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { problems.push(`${base}: unparseable JSON — ${e.message}`); continue; }
  if (!Array.isArray(data)) { problems.push(`${base}: top level must be an array`); continue; }

  const isFinal = /^(nf|ef|final)-/.test(base);
  const values = /^(n1|e1|r1)-/.test(base) ? R1 : /^(n2|e2|r2)-/.test(base) ? R2 : null;

  if (isFinal) {
    for (const [i, c] of data.entries()) {
      finals++;
      const name = (c.name || '').trim();
      if (!name) { problems.push(`${base} final ${i}: no name`); continue; }
      registerName(name, file, `${base} final "${name}"`);
      checkText(`${base} final "${name}"`, (c.clue || '').trim(), String(c.response ?? '').trim());
    }
  } else {
    for (const cat of data) {
      categories++;
      const name = (cat.name || '').trim();
      if (!name) { problems.push(`${base}: category with no name`); continue; }
      registerName(name, file, `${base} "${name}"`);
      if (!Array.isArray(cat.clues) || cat.clues.length !== 5) {
        problems.push(`${base} "${name}": ${cat.clues?.length ?? 0} clues, need exactly 5`); continue;
      }
      const responses = new Set();
      for (const [i, c] of cat.clues.entries()) {
        clues++;
        if (c.value !== values[i]) problems.push(`${base} "${name}" row ${i}: value ${c.value}, expected ${values[i]}`);
        const resp = String(c.response ?? '').trim();
        checkText(`${base} "${name}" row ${i}`, (c.clue || '').trim(), resp);
        if (responses.has(resp.toLowerCase())) problems.push(`${base} "${name}": response "${resp}" used twice`);
        responses.add(resp.toLowerCase());
      }
    }
  }
}

console.log(`${files.length} files · ${categories} categories · ${clues} board clues · ${finals} finals`);
if (warnings.length) {
  console.log(`\n${warnings.length} warnings (grader judgment):`);
  for (const w of warnings) console.log('  ~', w);
}
if (problems.length) {
  console.log(`\n${problems.length} PROBLEMS:`);
  for (const p of problems) console.log('  -', p);
  process.exit(1);
}
console.log('OK — all files pass');

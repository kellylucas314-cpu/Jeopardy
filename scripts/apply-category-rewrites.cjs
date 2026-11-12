#!/usr/bin/env node
/**
 * Rewrites the clues of categories that were near twins of another category, from a
 * list such as packs-src/twin-rewrites-2026-11-12.json. Values and Daily Double flags
 * stay on their rows; clue and response text are replaced row by row.
 *
 *   node scripts/apply-category-rewrites.cjs <file>          apply
 *   node scripts/apply-category-rewrites.cjs <file> --check  report only
 *   node scripts/apply-category-rewrites.cjs <file> --drafts <dir>
 *        write the new categories as n1-/n2- draft files, so the usual guards
 *        (check-questions, check-new-clues, repeat-candidates) can read them
 *
 * Running it twice changes nothing the second time. A `note` on a rewrite also
 * updates packs-src/category-notes.json (run apply-category-notes.cjs afterwards).
 */
const fs = require('fs');
const path = require('path');
const [file, flag, outDir] = process.argv.slice(2);
if (!file) { console.error('usage: node scripts/apply-category-rewrites.cjs <file> [--check | --drafts <dir>]'); process.exit(1); }
const ROOT = path.join(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
const chunks = (pack, round) => {
  const dir = path.join(ROOT, 'public', 'data', pack, round);
  return fs.readdirSync(dir).filter(x => /^chunk-\d+\.json$/.test(x)).map(f => path.join(dir, f));
};
const find = (pack, round, name) => {
  for (const full of chunks(pack, round)) {
    const cats = JSON.parse(fs.readFileSync(full, 'utf8'));
    const cat = cats.find(c => c.name === name);
    if (cat) return { full, cats, cat };
  }
  return null;
};

if (flag === '--drafts') {
  fs.mkdirSync(outDir, { recursive: true });
  const by = { jeopardy: [], double: [] };
  for (const r of doc.rewrites) {
    const hit = find(r.pack, r.round, r.name);
    if (!hit) { console.error('missing', r.name); process.exit(1); }
    by[r.round].push({ name: r.name, clues: r.rows.map(([clue, response], i) => ({ clue, response, value: hit.cat.clues[i].value })) });
  }
  fs.writeFileSync(path.join(outDir, 'n1-rewrites.json'), JSON.stringify(by.jeopardy, null, 1));
  fs.writeFileSync(path.join(outDir, 'n2-rewrites.json'), JSON.stringify(by.double, null, 1));
  console.log(`drafts written: ${by.jeopardy.length} round-one and ${by.double.length} round-two categories`);
  process.exit(0);
}

const check = flag === '--check';
let applied = 0, already = 0, missing = 0;
const notesPath = path.join(ROOT, 'packs-src', 'category-notes.json');
const notes = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
let notesChanged = false;

for (const r of doc.rewrites) {
  const hit = find(r.pack, r.round, r.name);
  if (!hit || hit.cat.clues.length !== r.rows.length) { missing++; console.error('NOT FOUND or wrong size:', r.name); continue; }
  const same = hit.cat.clues.every((c, i) => c.clue === r.rows[i][0] && c.response === r.rows[i][1]);
  if (same) already++;
  else {
    applied++;
    if (!check) {
      hit.cat.clues.forEach((c, i) => { c.clue = r.rows[i][0]; c.response = r.rows[i][1]; });
      if (r.note) hit.cat.note = r.note;
      fs.writeFileSync(hit.full, JSON.stringify(hit.cats));
    }
  }
  if (r.note && notes[r.name] !== r.note) { notes[r.name] = r.note; notesChanged = true; }
}
for (const s of doc.singles || []) {
  const hit = find(s.pack, s.round, s.name);
  if (!hit) { missing++; console.error('NOT FOUND:', s.name); continue; }
  if (hit.cat.clues.some(c => c.clue === s.clue)) { already++; continue; }
  const row = hit.cat.clues.find(c => c.response === s.oldResponse);
  if (!row) { missing++; console.error('NO ROW with response', s.oldResponse, 'in', s.name); continue; }
  applied++;
  if (!check) { row.clue = s.clue; row.response = s.response; fs.writeFileSync(hit.full, JSON.stringify(hit.cats)); }
}
if (notesChanged && !check) fs.writeFileSync(notesPath, '{\n' + Object.entries(notes).map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n}\n');
console.log(`${check ? 'would apply' : 'applied'} ${applied}, already done ${already}, not found ${missing}`);
process.exit(missing ? 1 : 0);

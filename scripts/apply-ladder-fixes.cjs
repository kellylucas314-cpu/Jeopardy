#!/usr/bin/env node
/**
 * Reorders the clues of categories whose difficulty ladder was out of step, from a
 * fix list such as packs-src/ladder-fixes-2026-11-12.json. Values and Daily Double
 * flags stay on their rows; only the clue and response move. Clue text never changes,
 * so nothing needs a new fact check.
 *
 *   node scripts/apply-ladder-fixes.cjs <fix-file>          apply
 *   node scripts/apply-ladder-fixes.cjs <fix-file> --check  report only
 *
 * Each fix records the first clue it expects on top afterwards, so running it twice
 * does nothing the second time.
 */
const fs = require('fs');
const path = require('path');
const [file, flag] = process.argv.slice(2);
if (!file) { console.error('usage: node scripts/apply-ladder-fixes.cjs <fix-file> [--check]'); process.exit(1); }
const ROOT = path.join(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
let applied = 0, already = 0, missing = 0;
for (const fix of doc.fixes) {
  const dir = path.join(ROOT, 'public', 'data', fix.pack, fix.round);
  let found = false;
  for (const f of fs.readdirSync(dir).filter(x => /^chunk-\d+\.json$/.test(x))) {
    const full = path.join(dir, f);
    const cats = JSON.parse(fs.readFileSync(full, 'utf8'));
    const cat = cats.find(c => c.name === fix.name);
    if (!cat) continue;
    found = true;
    if (fix.done && cat.clues.map(c => c.response).join('|') === fix.done) { already++; break; }
    const old = cat.clues.map(c => ({ clue: c.clue, response: c.response }));
    if (fix.order.slice().sort().join() !== '1,2,3,4,5') throw new Error('bad order for ' + fix.name);
    fix.order.forEach((from, i) => { cat.clues[i].clue = old[from - 1].clue; cat.clues[i].response = old[from - 1].response; });
    fix.done = cat.clues.map(c => c.response).join('|');
    if (flag !== '--check') fs.writeFileSync(full, JSON.stringify(cats));
    applied++;
    break;
  }
  if (!found) { missing++; console.log('not found: ' + fix.pack + '/' + fix.round + ' ' + fix.name); }
}
if (flag !== '--check') fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
console.log(`${applied} reordered, ${already} already in order, ${missing} not found`);

#!/usr/bin/env node
/**
 * Every board category carries a one-line explainer, the way a quiz host says what a
 * category is about before anyone picks from it ("ENERGY DRINKS: kinds of energy in
 * physics"). The explainers live in packs-src/category-notes.json, keyed by category
 * name. This script writes each one into the compiled chunks as the category's `note`,
 * which the game shows on the clue card, on the board and in the category roll call.
 *
 *   node scripts/apply-category-notes.cjs          write the notes into public/data
 *   node scripts/apply-category-notes.cjs --check  only report categories without one
 *
 * Run it after adding categories. A category without a note still plays; it just has
 * no explainer, and this script lists it so one can be written.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const notes = JSON.parse(fs.readFileSync(path.join(ROOT, 'packs-src', 'category-notes.json'), 'utf8'));
const check = process.argv.includes('--check');

let total = 0, changed = 0;
const missing = [];
const used = new Set();
for (const pack of ['original', 'easy']) {
  for (const round of ['jeopardy', 'double']) {
    const dir = path.join(ROOT, 'public', 'data', pack, round);
    for (const file of fs.readdirSync(dir).filter(f => /^chunk-\d+\.json$/.test(f)).sort()) {
      const full = path.join(dir, file);
      const before = fs.readFileSync(full, 'utf8');
      const cats = JSON.parse(before).map(cat => {
        total++;
        const note = notes[cat.name];
        if (!note) { missing.push(`${pack}/${round}: ${cat.name}`); return cat; }
        used.add(cat.name);
        const { name, note: _old, ...rest } = cat;
        return { name, note, ...rest };
      });
      const after = JSON.stringify(cats);
      if (after !== before.trim()) {
        changed++;
        if (!check) fs.writeFileSync(full, after);
      }
    }
  }
}
const orphans = Object.keys(notes).filter(n => !used.has(n));
console.log(`${total} categories, ${total - missing.length} with a note; ${changed} chunk files ${check ? 'would change' : 'written'}`);
if (missing.length) console.log(`No note yet:\n  ${missing.join('\n  ')}`);
if (orphans.length) console.log(`Notes for categories that no longer exist:\n  ${orphans.join('\n  ')}`);
if (check && (missing.length || changed)) process.exit(1);

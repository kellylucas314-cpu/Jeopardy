#!/usr/bin/env node
/**
 * Applies wording fixes to the recent shelf from a list such as
 * notes/second-read-2026-11-12.json: each edit swaps one clue's text (and, when
 * given, its answer) in src/*.txt and in public/data/recent, then the drafts are
 * rebuilt. Safe to run twice: an edit whose old text is gone is counted as done.
 *
 *   node packs-src/wave6/apply-edits.cjs packs-src/wave6/notes/second-read-2026-11-12.json
 */
const fs = require('fs');
const path = require('path');
const file = process.argv[2];
if (!file) { console.error('usage: node packs-src/wave6/apply-edits.cjs <edit-file>'); process.exit(1); }
const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, 'src');
const SHELF = path.join(ROOT, 'public', 'data', 'recent');
const { edits } = JSON.parse(fs.readFileSync(file, 'utf8'));
let applied = 0, done = 0, missing = 0;
const srcFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.txt')).map(f => path.join(SRC, f));
const chunkFiles = [];
for (const d of ['jeopardy', 'double', 'final']) for (const f of fs.readdirSync(path.join(SHELF, d))) chunkFiles.push(path.join(SHELF, d, f));
for (const e of edits) {
  let hitSrc = false, hitShelf = false, seenNew = false;
  for (const f of srcFiles) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    let changed = false;
    lines.forEach((line, i) => {
      const at = line.indexOf(' => ');
      if (at < 0) return;
      const clue = line.slice(0, at);
      if (clue === e.new) seenNew = true;
      if (clue !== e.old) return;
      lines[i] = e.new + ' => ' + (e.answer || line.slice(at + 4));
      changed = hitSrc = true;
    });
    if (changed) fs.writeFileSync(f, lines.join('\n'));
  }
  for (const f of chunkFiles) {
    const items = JSON.parse(fs.readFileSync(f, 'utf8'));
    let changed = false;
    for (const it of items) for (const c of (it.clues || [it])) {
      if (c.clue !== e.old) continue;
      c.clue = e.new;
      if (e.answer) c.response = e.answer;
      changed = hitShelf = true;
    }
    if (changed) fs.writeFileSync(f, JSON.stringify(items));
  }
  if (hitSrc && hitShelf) applied++;
  else if (seenNew) done++;
  else { missing++; console.log('not found: ' + e.old); }
}
console.log(`${applied} applied, ${done} already done, ${missing} not found`);

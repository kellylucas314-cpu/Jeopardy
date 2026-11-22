#!/usr/bin/env node
/**
 * Wave 6 is written in a plain-text shorthand (src/*.txt) and compiled to the usual
 * authoring JSON (drafts/*.json) plus the category explainers (notes/category-notes.json).
 *
 *   ## CATEGORY NAME | one-line explainer
 *   clue text => response          (five lines per category; one line per final)
 *
 * File names carry the usual prefixes: n1- (round 1), n2- (round 2), nf- (finals).
 * Run: node packs-src/wave6/build-drafts.cjs
 */
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'src'), OUT = path.join(__dirname, 'drafts');
const VALUES = { n1: [200, 400, 600, 800, 1000], n2: [400, 800, 1200, 1600, 2000] };
const notes = {};
let cats = 0, clues = 0, finals = 0;
for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.txt')).sort()) {
  const kind = f.slice(0, 2);
  const out = [];
  let cur = null;
  fs.readFileSync(path.join(SRC, f), 'utf8').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    if (line.startsWith('## ')) {
      const [name, note] = line.slice(3).split(' | ').map(s => s.trim());
      if (!note) throw new Error(`${f}:${i + 1} category needs "| explainer"`);
      cur = kind === 'nf' ? { name } : { name, clues: [] };
      if (kind !== 'nf') notes[name] = note;
      out.push(cur);
      return;
    }
    const at = line.lastIndexOf(' => ');
    if (at < 0 || !cur) throw new Error(`${f}:${i + 1} expected "clue => response"`);
    const clue = line.slice(0, at).trim(), response = line.slice(at + 4).trim();
    if (kind === 'nf') { cur.clue = clue; cur.response = response; finals++; }
    else { cur.clues.push({ clue, response, value: VALUES[kind][cur.clues.length] }); clues++; }
  });
  if (kind !== 'nf') { cats += out.length; out.forEach(c => { if (c.clues.length !== 5) throw new Error(`${f}: ${c.name} has ${c.clues.length} clues`); }); }
  fs.writeFileSync(path.join(OUT, f.replace(/\.txt$/, '.json')), JSON.stringify(out, null, 1) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'notes', 'category-notes.json'), JSON.stringify(notes, null, 1) + '\n');
console.log(`${cats} categories, ${clues} board clues, ${finals} finals`);

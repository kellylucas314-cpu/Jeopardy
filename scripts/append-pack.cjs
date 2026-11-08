/**
 * Add a wave of NEW categories to a deployed pack without touching what is there.
 *
 * Usage: node scripts/append-pack.cjs <source-dir> <fresh|easy>
 *   fresh reads n1-/n2-/nf- files, easy reads e1-/e2-/ef- files.
 *
 * The compiled chunks in public/data are the source of truth for clues already
 * shipped (build-original-pack.cjs rebuilds a pack from scratch and is only for
 * a full rebuild). This script shuffles the new categories, writes them as new
 * chunks after the existing ones, and updates manifest.json. Run
 * scripts/check-questions.cjs and scripts/check-new-clues.cjs on the source first.
 */
const fs = require('fs');
const path = require('path');

const [SRC, PACK] = process.argv.slice(2);
const PACKS = {
  fresh: { outDir: 'original', r1: 'n1-', r2: 'n2-', finals: 'nf-' },
  easy: { outDir: 'easy', r1: 'e1-', r2: 'e2-', finals: 'ef-' },
};
const cfg = PACKS[PACK];
if (!SRC || !cfg) { console.error('usage: node scripts/append-pack.cjs <source-dir> <fresh|easy>'); process.exit(1); }

const OUT = path.join(__dirname, '..', 'public', 'data', cfg.outDir);
const R1 = [200, 400, 600, 800, 1000];
const R2 = [400, 800, 1200, 1600, 2000];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function load(prefix) {
  const out = [];
  for (const f of fs.readdirSync(SRC).sort()) if (f.startsWith(prefix) && f.endsWith('.json')) out.push(...JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')));
  return out;
}
function board(cats, values) {
  return cats.map(c => ({
    name: c.name.trim(),
    clues: c.clues.map((x, i) => ({ clue: x.clue.trim(), response: String(x.response).trim(), value: values[i], isDailyDouble: false })),
  }));
}
function append(dir, items, size) {
  const full = path.join(OUT, dir);
  const existing = fs.readdirSync(full).filter(f => /^chunk-\d+\.json$/.test(f)).length;
  let n = existing;
  for (let i = 0; i < items.length; i += size) {
    fs.writeFileSync(path.join(full, `chunk-${String(n).padStart(3, '0')}.json`), JSON.stringify(items.slice(i, i + size)));
    n++;
  }
  return { before: existing, after: n };
}

const r1 = shuffle(board(load(cfg.r1), R1));
const r2 = shuffle(board(load(cfg.r2), R2));
const finals = shuffle(load(cfg.finals).map(c => ({ name: c.name.trim(), clue: c.clue.trim(), response: String(c.response).trim() })));

const counts = { jeopardy: append('jeopardy', r1, 12), double: append('double', r2, 12), final: append('final', finals, 30) };
const manifestPath = path.join(__dirname, '..', 'public', 'data', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest[cfg.outDir] = { jeopardy: counts.jeopardy.after, double: counts.double.after, final: counts.final.after };
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
console.log(`${PACK}: +${r1.length} round-1 categories, +${r2.length} round-2 categories, +${finals.length} finals`);
console.log('chunks', JSON.stringify(counts));

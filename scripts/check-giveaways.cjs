#!/usr/bin/env node
// Clues that hand over their answer: a word in the clue shares a root with a word in the
// response ("this body of 538 electors" => the Electoral College). Kelly spotted these while
// playing on Nov 11 2026.
//
//   node scripts/check-giveaways.cjs               list every hit that is not on the allowlist
//   node scripts/check-giveaways.cjs --check       the same, and exit 1 if there are any
//   node scripts/check-giveaways.cjs --write-allow accept the current hits (after reading them)
//
// The allowlist (packs-src/giveaway-allow.json) holds clues read by a person and judged fair:
// the shared word is the generic half of the answer ("this hat" => a Panama hat) or the clue
// is about where the word comes from ("the word 'cereal' comes from this goddess" => Ceres).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public', 'data');
const ALLOW = path.join(__dirname, '..', 'packs-src', 'giveaway-allow.json');
const STOP = new Set(('the a an of and or in on at to for with by from his her its their this that these those is are was were be been it he she they who whom what which as but not no saint st mr mrs dr sir lord lady king queen new old great big little first second one two three four five six seven eight nine ten city island islands river lake mount mountain sea ocean bay state states united north south east west war day man men woman women de la le el du van von der di da los las del').split(' '));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']s\b/g, '').replace(/[^a-z0-9 ]+/g, ' ');
const SUF = ['ational', 'ization', 'ations', 'ation', 'ments', 'ment', 'ingly', 'ings', 'ing', 'ness', 'ists', 'ist', 'isms', 'ism', 'ians', 'ian', 'ers', 'ors', 'er', 'or', 'ies', 'ied', 'ed', 'es', 'ly', 'al', 'ic', 'y', 's'];
const stem = w => {
  let s = w;
  for (let pass = 0; pass < 3; pass++) {
    const suf = SUF.find(x => s.length - x.length >= 3 && s.endsWith(x));
    if (!suf) break;
    s = s.slice(0, -suf.length);
    if (s.length > 3 && s[s.length - 1] === s[s.length - 2]) s = s.slice(0, -1); // jumpp -> jump, runn -> run
  }
  return s;
};
const words = s => norm(s).split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w));
const share = (a, b) => { const x = stem(a), y = stem(b); if (x === y) return true; const n = Math.min(x.length, y.length); return n >= 5 && x.slice(0, n) === y.slice(0, n); };
const hits = [];
let total = 0;
for (const pack of ['original', 'easy']) for (const dir of ['jeopardy', 'double', 'final']) {
  const d = path.join(root, pack, dir);
  for (const f of fs.readdirSync(d).filter(x => x.endsWith('.json')).sort()) {
    const arr = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
    const cats = dir === 'final' ? arr.map(c => ({ name: c.name || c.category, clues: [c] })) : arr;
    cats.forEach((c) => (c.clues || []).forEach((q, qi) => {
      total++;
      const resp = String(q.response || '').replace(/\(.*?\)/g, ' ');
      const rw = words(resp), cw = words(q.clue || '');
      const shared = [...new Set(rw.filter(r => cw.some(w => share(r, w))))];
      if (shared.length) hits.push({ file: `${pack}/${dir}/${f}`, cat: c.name, i: qi, clue: q.clue, response: q.response, shared, frac: shared.length / Math.max(1, new Set(rw).size) });
    }));
  }
}
const allow = new Set(fs.existsSync(ALLOW) ? JSON.parse(fs.readFileSync(ALLOW, 'utf8')) : []);
if (process.argv.includes('--write-allow')) {
  fs.writeFileSync(ALLOW, JSON.stringify(hits.map(h => h.clue).sort(), null, 1) + '\n');
  console.log(`allowlist written: ${hits.length} clues`);
  process.exit(0);
}
const fresh = hits.filter(h => !allow.has(h.clue));
for (const h of fresh) console.log(`[${h.shared.join(', ')}] ${h.clue}  =>  ${h.response}   (${h.file}, ${h.cat})`);
console.log(`${total} clues, ${hits.length} share a root with their answer, ${hits.length - fresh.length} of those allowed, ${fresh.length} to look at`);
if (process.argv.includes('--check') && fresh.length) process.exit(1);

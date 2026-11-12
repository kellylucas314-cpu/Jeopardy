/**
 * Second-opinion repeat finder: lists PAIRS for a human (or agent) to read.
 * check-new-clues.cjs only fails a clue when it shares a lot of wording with an
 * existing clue that has the same response. The same fact told in fresh words slips
 * through. This lists every new clue whose response matches an existing clue's
 * response (loosely: either contains the other) AND shares at least one uncommon
 * word with it, so a reader can judge "same fact or not" in seconds.
 *
 * Usage: node scripts/repeat-candidates.cjs <file-or-dir> [more…] > pairs.txt
 * Categories whose names appear in the inputs are excluded from the "existing" side,
 * so an already-appended wave can be audited against everything else.
 */
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'public', 'data');
const STOP = new Set(('the a an and or of to in on at by for with from as is was were be been his her its their this that these those he she it they who whom which what when where why how one into than then also only first named name called known after before over under about can could would will may did does do has have had not no but so if some such').split(' '));
const norm = s => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const normResp = r => norm(String(r).replace(/\(.*?\)/g, ' ')).replace(/^(a|an|the) /, '').replace(/'s\b/g, '').trim();
const toks = s => new Set(norm(s).split(' ').map(w => w.replace(/'s$|'/g, '')).filter(w => w.length > 2 && !STOP.has(w)));
const read = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : [];
const rows = (items, src) => items.flatMap(it => Array.isArray(it.clues) ? it.clues.map(c => ({ cat: it.name, clue: c.clue, resp: c.response, src })) : [{ cat: it.name, clue: it.clue, resp: it.response, src }]);

const files = process.argv.slice(2).flatMap(t => fs.statSync(t).isDirectory() ? fs.readdirSync(t).filter(f => /^(n1|n2|nf|e1|e2|ef)-.*\.json$/.test(f)).map(f => path.join(t, f)) : [t]);
const fresh = files.flatMap(f => rows(JSON.parse(fs.readFileSync(f, 'utf8')), path.basename(f)));
const newNames = new Set(fresh.map(r => r.cat.toUpperCase()));

let old = [];
for (const [p, label] of [['original', 'Fresh'], ['easy', 'Easy'], ['recent', 'Recent']]) for (const d of ['jeopardy', 'double', 'final']) old.push(...rows(read(path.join(DATA, p, d)), `${label} ${d}`));
const camp = JSON.parse(fs.readFileSync(path.join(DATA, 'campaign', 'chapters.json'), 'utf8'));
for (const ch of camp.chapters) old.push(...rows([ch.era, ch.chapter, ch.final].filter(Boolean), 'Campaign'));
old = old.filter(r => !newNames.has(String(r.cat).toUpperCase()));
// include the other new files too, so writers in the same wave are compared
const all = old.concat(fresh);

const df = new Map();
for (const r of all) for (const w of toks(r.clue)) df.set(w, (df.get(w) || 0) + 1);
const RARE = 40;

let n = 0;
for (const r of fresh) {
  const k = normResp(r.resp); if (!k) continue;
  const rt = toks(r.clue); const respWords = toks(r.resp);
  for (const o of all) {
    if (o === r || (o.src === r.src && o.cat === r.cat)) continue;
    const ok = normResp(o.resp); if (!ok) continue;
    if (!(ok === k || (ok.length > 3 && k.length > 3 && (ok.includes(k) || k.includes(ok))))) continue;
    const shared = [...toks(o.clue)].filter(w => rt.has(w) && !respWords.has(w) && (df.get(w) || 0) <= RARE);
    if (!shared.length) continue;
    n++;
    console.log(`${r.src} [${r.cat}] ${r.resp}\n  NEW: ${r.clue}\n  OLD (${o.src} / ${o.cat}): ${o.clue}\n  shared: ${shared.join(', ')}\n`);
  }
}
console.error(`${n} candidate pairs from ${fresh.length} new clues`);

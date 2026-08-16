/**
 * Data loading — fetches random chunks from the question packs.
 *
 * Three packs ship with the game:
 *  - 'fresh'   → data/original/…  Original clues written for Ring In (default).
 *  - 'easy'    → data/easy/…      Gentler original clues, nostalgia-friendly.
 *  - 'archive' → data/…           A large unofficial archive of televised clues,
 *                                 kept as an opt-in for personal play.
 *
 * Repeat avoidance: every category you actually get on a board is remembered in
 * localStorage (per pack). Boards never reuse a remembered category until the
 * whole pack has been cycled, at which point that pack's memory resets.
 */

import { loadPrefs } from './state.js';

let manifest = null;

async function loadManifest() {
  if (manifest) return manifest;
  const res = await fetch('./data/manifest.json');
  manifest = await res.json();
  return manifest;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

export function currentPack() {
  const p = loadPrefs().pack;
  return p === 'archive' || p === 'easy' ? p : 'fresh';
}

/** The archive was scraped with literal backslash-escapes baked into ~20% of rows. */
function clean(text) {
  return (text || '').replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
}

// Clues that lean on audio/video/images we don't have — unanswerable on their own.
const MEDIA_RE = /\b(seen here|shown here|heard here|pictured|depicted|this song|audio clue|video clue|in this picture|in the picture|the following clip|sung here|played here|read the|this painting shown|this logo)\b/i;
// Clues whose answer may have gone stale since the clue aired.
const DATED_RE = /\b(currently|to date|as of now|reigning|incumbent|is now called|now stars|now plays|newest|most recently)\b/i;

function isPlayable(clue) {
  const t = clue.clue || '';
  if (MEDIA_RE.test(t)) return false;
  if (DATED_RE.test(t)) return false;
  if (t.length < 8) return false;          // truncated/broken rows
  return true;
}

function categoryIsPlayable(cat) {
  return cat.clues.length === 5 && cat.clues.every(isPlayable);
}

async function loadChunk(baseDir, roundDir, chunkIndex) {
  const filename = `chunk-${String(chunkIndex).padStart(3, '0')}.json`;
  const res = await fetch(`./data/${baseDir}${roundDir}/${filename}`);
  return res.json();
}

/** Chunk-count + base dir for the active pack, falling back to the archive. */
async function packInfo(round) {
  const m = await loadManifest();
  const dirNames = { 1: 'jeopardy', 2: 'double', final: 'final' };
  const dir = dirNames[round] || dirNames.final;
  const pack = currentPack();
  if (pack === 'fresh' && m.original && m.original[dir] > 0) {
    return { pack, base: 'original/', dir, total: m.original[dir] };
  }
  if (pack === 'easy' && m.easy && m.easy[dir] > 0) {
    return { pack, base: 'easy/', dir, total: m.easy[dir] };
  }
  return { pack: pack === 'archive' ? 'archive' : pack, base: '', dir, total: m[dir] };
}

// ——— Cross-game repeat memory (per pack + round, persisted) ———

const PLAYED_KEY = 'jeopardy-played';
const PLAYED_CAP = 3000; // archive safety valve — oldest entries fall off
const RESET_KEEP = 18;   // when a pack cycles, the last few boards stay excluded

function loadPlayed() {
  try {
    return JSON.parse(localStorage.getItem(PLAYED_KEY)) || {};
  } catch {
    return {};
  }
}

function savePlayed(all) {
  try {
    localStorage.setItem(PLAYED_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable — repeats across sessions become possible, nothing worse
  }
}

// Memory used to be keyed by pack alone, which let round 2 running dry wipe
// round 1's memory too. Split any legacy per-pack list into per-round keys.
let migrated = false;
function migrateLegacyMemory() {
  if (migrated) return;
  migrated = true;
  const all = loadPlayed();
  let changed = false;
  for (const pack of ['fresh', 'easy', 'archive']) {
    const legacy = all[pack];
    if (!Array.isArray(legacy)) continue;
    for (const dir of ['jeopardy', 'double']) {
      const key = `${pack}:${dir}`;
      if (!all[key]) { all[key] = legacy; changed = true; }
    }
    delete all[pack];
    changed = true;
  }
  if (changed) savePlayed(all);
}

function playedList(key) {
  migrateLegacyMemory();
  return loadPlayed()[key] || [];
}

function playedSet(key) {
  return new Set(playedList(key));
}

function rememberPlayed(key, names) {
  migrateLegacyMemory();
  const all = loadPlayed();
  const list = (all[key] || []).concat(names);
  all[key] = list.slice(Math.max(0, list.length - PLAYED_CAP));
  savePlayed(all);
}

/** Start a fresh cycle for this key, keeping only the most recent entries. */
function resetPlayed(key, keep) {
  migrateLegacyMemory();
  const all = loadPlayed();
  const list = all[key] || [];
  all[key] = keep > 0 ? list.slice(Math.max(0, list.length - keep)) : [];
  savePlayed(all);
}

/**
 * Load 6 random categories for the given round.
 * `seen` guards within the current game; the persisted memory guards across games.
 * Returns an array of { name, clues: [{ clue, response, value }] }
 */
export async function loadRoundCategories(round, seen = new Set()) {
  const { pack, base, dir, total } = await packInfo(round);
  const memKey = `${pack}:${dir}`;
  const played = playedSet(memKey);
  // A few category names exist in both rounds' pools — a name played in either
  // round recently shouldn't reappear from the other round's pool.
  const playedOther = playedSet(`${pack}:${dir === 'jeopardy' ? 'double' : 'jeopardy'}`);

  // Visit chunks in random order, pooling unplayed categories from several
  // chunks so a board never mirrors one chunk's little neighborhood.
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  const POOL_TARGET = 18;
  // Keep scanning chunks until the pool fills — a late-cycle board may need to
  // visit every chunk of an original pack before we can say it's exhausted.
  // The archive is capped at 40 chunks, but it can never truly run dry: its
  // memory cap holds fewer names than 40 chunks contain.
  const MAX_CHUNKS = Math.min(total, 40);
  const pool = [];
  const fallback = []; // playable but already played — used only if the pack runs dry
  // Always sample at least 3 chunks — archive chunks group clues from the same
  // era, and a board drawn from one chunk feels samey.
  for (let k = 0; k < MAX_CHUNKS && (pool.length < POOL_TARGET || k < 3); k++) {
    const categories = await loadChunk(base, dir, order[k]);
    for (const cat of categories) {
      if (!categoryIsPlayable(cat) || seen.has(cat.name)) continue;
      if (played.has(cat.name)) fallback.push(cat);
      else if (!playedOther.has(cat.name)) pool.push(cat);
    }
  }

  // Every chunk in reach scanned and still under a boardful of new categories:
  // the pack has genuinely cycled. Start a new cycle, but keep the most recent
  // boards excluded so nothing repeats back-to-back.
  if (pool.length < 6) {
    const recent = new Set(playedList(memKey).slice(-RESET_KEEP));
    resetPlayed(memKey, RESET_KEEP);
    for (const cat of fallback) {
      if (pool.length >= POOL_TARGET) break;
      if (!recent.has(cat.name)) pool.push(cat);
    }
    // Tiny-pack edge case: better a recent repeat than no board at all.
    if (pool.length < 6) {
      for (const cat of fallback) {
        if (pool.length >= 6) break;
        if (recent.has(cat.name)) pool.push(cat);
      }
    }
  }

  // Pick 6 at random from the pool.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, 6);
  for (const cat of chosen) seen.add(cat.name);
  rememberPlayed(memKey, chosen.map(c => c.name));

  return chosen.map(cat => ({
    name: clean(cat.name),
    clues: cat.clues.map(c => ({
      clue: clean(c.clue),
      response: clean(c.response),
      value: c.value,
      answered: false,
      isDailyDouble: false, // We assign these ourselves
    })),
  }));
}

/**
 * Load a random Final clue, avoiding ones already played on this device.
 */
export async function loadFinalClue(seen = new Set()) {
  const { pack, base, dir, total } = await packInfo('final');
  const playedKey = `${pack}-final`;
  const played = playedSet(playedKey);

  for (let attempt = 0; attempt < 8; attempt++) {
    const chunkIdx = randomInt(total);
    const clues = await loadChunk(base, dir, chunkIdx);
    const fresh = clues.filter(c => isPlayable(c) && !seen.has(c.name) && !played.has(c.name));
    if (fresh.length) {
      const pick = fresh[randomInt(fresh.length)];
      seen.add(pick.name);
      rememberPlayed(playedKey, [pick.name]);
      return { name: clean(pick.name), clue: clean(pick.clue), response: clean(pick.response) };
    }
  }

  // Every final in reach has been played — start a new cycle, still steering
  // clear of the handful of finals played most recently.
  const recent = new Set(playedList(playedKey).slice(-8));
  resetPlayed(playedKey, 8);
  const clues = await loadChunk(base, dir, randomInt(total));
  const playable = clues.filter(c => isPlayable(c) && !seen.has(c.name) && !recent.has(c.name));
  const pick = (playable.length ? playable : clues)[randomInt(playable.length ? playable.length : clues.length)];
  seen.add(pick.name);
  rememberPlayed(playedKey, [pick.name]);
  return { name: clean(pick.name), clue: clean(pick.clue), response: clean(pick.response) };
}

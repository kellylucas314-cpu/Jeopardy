/**
 * Data loading — fetches random chunks from the question packs.
 *
 * Three packs ship with the game:
 *  - 'fresh'   → data/original/…  Original clues written for the game (default).
 *  - 'easy'    → data/easy/…      Gentler original clues, nostalgia-friendly.
 *  - 'archive' → data/…           A large unofficial archive of televised clues,
 *                                 kept as an opt-in for personal play.
 *
 * Repeat avoidance: every category you actually get on a board is remembered in
 * localStorage (per pack + round). Boards never reuse a remembered category
 * until the whole pack has been cycled, at which point that pack's memory resets.
 *
 * Recipes: the Campaign asks for boards mixed from several packs at once
 * ("three Easy Breezy round-one categories plus two Fresh round-two ones").
 * `loadRoundCategories` accepts such a recipe and re-scales each drawn
 * category's values to the round being played.
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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

const ROUND_DIRS = { 1: 'jeopardy', 2: 'double', final: 'final' };
const ROUND_VALUES = { jeopardy: [200, 400, 600, 800, 1000], double: [400, 800, 1200, 1600, 2000] };

/** Chunk-count + base dir for a pack's round directory, falling back to the archive. */
async function packInfoFor(pack, dir) {
  const m = await loadManifest();
  if (pack === 'fresh' && m.original && m.original[dir] > 0) {
    return { pack, base: 'original/', dir, total: m.original[dir] };
  }
  if (pack === 'easy' && m.easy && m.easy[dir] > 0) {
    return { pack, base: 'easy/', dir, total: m.easy[dir] };
  }
  return { pack: 'archive', base: '', dir, total: m[dir] };
}

/** Pack info for the active pack and a round number (1, 2, or 'final'). */
async function packInfo(round) {
  const dir = ROUND_DIRS[round] || ROUND_DIRS.final;
  return packInfoFor(currentPack(), dir);
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
 * Draw `count` unplayed categories from one pack directory.
 * `seen` guards within the current game; the persisted memory guards across games.
 * Returns raw categories (uncleaned, unscaled).
 */
async function drawCategories({ pack, base, dir, total }, count, seen) {
  const memKey = `${pack}:${dir}`;
  const played = playedSet(memKey);
  // A few category names exist in both rounds' pools — a name played in either
  // round recently shouldn't reappear from the other round's pool.
  const playedOther = playedSet(`${pack}:${dir === 'jeopardy' ? 'double' : 'jeopardy'}`);

  // Visit chunks in random order, pooling unplayed categories from several
  // chunks so a board never mirrors one chunk's little neighborhood.
  const order = shuffle(Array.from({ length: total }, (_, i) => i));

  const POOL_TARGET = Math.max(18, count * 3);
  // Scan every chunk of an original pack before declaring it exhausted: a
  // late-cycle board may have its last unplayed categories sitting in the one
  // chunk a capped scan would skip, and stopping early resets the memory while
  // fresh categories remain. The archive keeps a cap — it holds hundreds of
  // chunks and can never truly run dry, since its memory cap (3000 names) is
  // smaller than what 40 chunks already contain.
  const MAX_CHUNKS = pack === 'archive' ? Math.min(total, 40) : total;
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

  // Every chunk in reach scanned and still short of what the board needs:
  // the pack has genuinely cycled. Start a new cycle, but keep the most recent
  // boards excluded so nothing repeats back-to-back.
  if (pool.length < count) {
    const recent = new Set(playedList(memKey).slice(-RESET_KEEP));
    resetPlayed(memKey, RESET_KEEP);
    for (const cat of fallback) {
      if (pool.length >= POOL_TARGET) break;
      if (!recent.has(cat.name)) pool.push(cat);
    }
    // Tiny-pack edge case: better a recent repeat than no board at all.
    if (pool.length < count) {
      for (const cat of fallback) {
        if (pool.length >= count) break;
        if (recent.has(cat.name)) pool.push(cat);
      }
    }
  }

  shuffle(pool);
  const chosen = pool.slice(0, count);
  for (const cat of chosen) seen.add(cat.name);
  rememberPlayed(memKey, chosen.map(c => c.name));
  return chosen;
}

/** Normalize a raw category for the board, re-scaling values to the round's ladder. */
function toBoardCategory(cat, values) {
  return {
    name: clean(cat.name),
    clues: cat.clues.map((c, i) => ({
      clue: clean(c.clue),
      response: clean(c.response),
      value: values ? values[i] : c.value,
      answered: false,
      isDailyDouble: false, // We assign these ourselves
    })),
  };
}

/**
 * Load categories for the given round.
 *
 * Default: 6 categories from the active pack's directory for that round.
 * With `opts.recipe` ([{ pack, dir, count }]) the board is mixed from several
 * pack directories; `opts.count` (default 6) caps the total and any shortfall
 * is topped up from the active pack. Values are always re-scaled to the round.
 *
 * Returns an array of { name, clues: [{ clue, response, value }] }
 */
export async function loadRoundCategories(round, seen = new Set(), opts = {}) {
  const dir = ROUND_DIRS[round] || ROUND_DIRS[1];
  const values = ROUND_VALUES[dir];
  const want = opts.count || 6;
  const drawn = [];

  if (Array.isArray(opts.recipe) && opts.recipe.length) {
    for (const entry of opts.recipe) {
      if (!entry.count) continue;
      const info = await packInfoFor(entry.pack, entry.dir);
      drawn.push(...(await drawCategories(info, entry.count, seen)));
    }
  }
  if (drawn.length < want) {
    const info = await packInfo(round);
    drawn.push(...(await drawCategories(info, want - drawn.length, seen)));
  }

  return shuffle(drawn.slice(0, want)).map(cat => toBoardCategory(cat, values));
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

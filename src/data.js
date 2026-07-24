/**
 * Data loading — fetches random chunks from the question packs.
 *
 * Two packs ship with the game:
 *  - 'fresh'   → data/original/…  Original clues written for Ring In (default).
 *  - 'archive' → data/…           A large unofficial archive of televised clues,
 *                                 kept as an opt-in for personal play.
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
  return p === 'archive' ? 'archive' : 'fresh';
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
  if (currentPack() === 'fresh' && m.original && m.original[dir] > 0) {
    return { base: 'original/', dir, total: m.original[dir] };
  }
  return { base: '', dir, total: m[dir] };
}

/**
 * Load 6 random categories for the given round.
 * Returns an array of { name, clues: [{ clue, response, value }] }
 */
export async function loadRoundCategories(round, seen = new Set()) {
  const { base, dir, total } = await packInfo(round);

  // Gather playable, unseen categories, pulling extra chunks if a chunk runs thin.
  const pool = [];
  const triedChunks = new Set();
  const maxTries = Math.min(total, 8);
  while (pool.length < 6 && triedChunks.size < maxTries) {
    const chunkIdx = randomInt(total);
    if (triedChunks.has(chunkIdx)) continue;
    triedChunks.add(chunkIdx);

    const categories = await loadChunk(base, dir, chunkIdx);
    for (let i = categories.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [categories[i], categories[j]] = [categories[j], categories[i]];
    }
    for (const cat of categories) {
      if (categoryIsPlayable(cat) && !seen.has(cat.name)) pool.push(cat);
    }
  }

  // A small pack can run dry against a long `seen` list — allow repeats rather than stall.
  if (pool.length < 6) {
    for (const idx of triedChunks) {
      const categories = await loadChunk(base, dir, idx);
      for (const cat of categories) {
        if (categoryIsPlayable(cat) && !pool.includes(cat)) pool.push(cat);
      }
      if (pool.length >= 6) break;
    }
  }

  const chosen = pool.slice(0, 6);
  for (const cat of chosen) seen.add(cat.name);

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
 * Load a random Final clue.
 */
export async function loadFinalClue(seen = new Set()) {
  const { base, dir, total } = await packInfo('final');
  for (let attempt = 0; attempt < 8; attempt++) {
    const chunkIdx = randomInt(total);
    const clues = await loadChunk(base, dir, chunkIdx);
    const playable = clues.filter(c => isPlayable(c) && !seen.has(c.name));
    if (playable.length) {
      const pick = playable[randomInt(playable.length)];
      seen.add(pick.name);
      return { name: clean(pick.name), clue: clean(pick.clue), response: clean(pick.response) };
    }
  }
  // Fallback: any clue from a random chunk
  const clues = await loadChunk(base, dir, randomInt(total));
  const pick = clues[randomInt(clues.length)];
  return { name: clean(pick.name), clue: clean(pick.clue), response: clean(pick.response) };
}

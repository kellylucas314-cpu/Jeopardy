/**
 * Data loading — fetches random chunks from the processed dataset.
 */

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

// Clues that lean on audio/video/images we don't have — unanswerable on their own.
const MEDIA_RE = /\b(seen here|shown here|heard here|pictured|depicted|this song|audio clue|video clue|in this picture|in the picture|the following clip|sung here|played here|read the|this painting shown|this logo)\b/i;

function isPlayable(clue) {
  const t = clue.clue || '';
  if (MEDIA_RE.test(t)) return false;
  if (t.length < 8) return false;          // truncated/broken rows
  return true;
}

function categoryIsPlayable(cat) {
  return cat.clues.length === 5 && cat.clues.every(isPlayable);
}

async function loadChunk(roundDir, chunkIndex) {
  const filename = `chunk-${String(chunkIndex).padStart(3, '0')}.json`;
  const res = await fetch(`./data/${roundDir}/${filename}`);
  return res.json();
}

/**
 * Load 6 random categories for the given round.
 * Returns an array of { name, clues: [{ clue, response, value }] }
 */
export async function loadRoundCategories(round, seen = new Set()) {
  const m = await loadManifest();
  const dir = round === 1 ? 'jeopardy' : 'double';
  const totalChunks = round === 1 ? m.jeopardy : m.double;

  // Gather playable, unseen categories, pulling extra chunks if a chunk runs thin.
  const pool = [];
  const triedChunks = new Set();
  while (pool.length < 6 && triedChunks.size < totalChunks && triedChunks.size < 6) {
    const chunkIdx = randomInt(totalChunks);
    if (triedChunks.has(chunkIdx)) continue;
    triedChunks.add(chunkIdx);

    const categories = await loadChunk(dir, chunkIdx);
    for (let i = categories.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [categories[i], categories[j]] = [categories[j], categories[i]];
    }
    for (const cat of categories) {
      if (categoryIsPlayable(cat) && !seen.has(cat.name)) pool.push(cat);
    }
  }

  const chosen = pool.slice(0, 6);
  for (const cat of chosen) seen.add(cat.name);

  return chosen.map(cat => ({
    name: cat.name,
    clues: cat.clues.map(c => ({
      clue: c.clue,
      response: c.response,
      value: c.value,
      answered: false,
      isDailyDouble: false, // We assign these ourselves
    })),
  }));
}

/**
 * Load a random Final Jeopardy clue.
 */
export async function loadFinalClue(seen = new Set()) {
  const m = await loadManifest();
  for (let attempt = 0; attempt < 8; attempt++) {
    const chunkIdx = randomInt(m.final);
    const clues = await loadChunk('final', chunkIdx);
    const playable = clues.filter(c => isPlayable(c) && !seen.has(c.name));
    if (playable.length) {
      const pick = playable[randomInt(playable.length)];
      seen.add(pick.name);
      return pick;
    }
  }
  // Fallback: any clue from a random chunk
  const clues = await loadChunk('final', randomInt(m.final));
  return clues[randomInt(clues.length)];
}

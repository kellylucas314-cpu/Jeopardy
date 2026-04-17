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

async function loadChunk(roundDir, chunkIndex) {
  const filename = `chunk-${String(chunkIndex).padStart(3, '0')}.json`;
  const res = await fetch(`./data/${roundDir}/${filename}`);
  return res.json();
}

/**
 * Load 6 random categories for the given round.
 * Returns an array of { name, clues: [{ clue, response, value }] }
 */
export async function loadRoundCategories(round) {
  const m = await loadManifest();
  const dir = round === 1 ? 'jeopardy' : 'double';
  const totalChunks = round === 1 ? m.jeopardy : m.double;

  // Pick a random chunk
  const chunkIdx = randomInt(totalChunks);
  const categories = await loadChunk(dir, chunkIdx);

  // Shuffle and pick 6
  for (let i = categories.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [categories[i], categories[j]] = [categories[j], categories[i]];
  }

  return categories.slice(0, 6).map(cat => ({
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
export async function loadFinalClue() {
  const m = await loadManifest();
  const chunkIdx = randomInt(m.final);
  const clues = await loadChunk('final', chunkIdx);
  return clues[randomInt(clues.length)];
}

// aiCategories.js
// Client-side helper for AI-generated custom categories.
// Talks to the local server (server/index.js), which holds the API key.

const REQUEST_TIMEOUT_MS = 120_000;

// Session cache so the same category isn't regenerated twice in one sitting.
const cache = new Map();

export function normalizeCategoryName(name) {
  return (name || '').trim().replace(/\s+/g, ' ');
}

function cacheKey(name) {
  return normalizeCategoryName(name).toLowerCase();
}

/**
 * Ask the server whether AI categories are usable right now.
 * Never throws — returns { reachable, credentialsDetected, model }.
 */
export async function checkAiStatus() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return { reachable: false };
    const data = await res.json();
    return { reachable: true, ...data };
  } catch {
    return { reachable: false };
  }
}

/**
 * Generate 5 clues for a custom category.
 * @returns {Promise<{name: string, clues: Array<{value: number, clue: string, response: string}>}>}
 * Throws an Error with a human-readable message (and .code) on failure.
 */
export async function generateCategory(name, { fresh = false } = {}) {
  const cleanName = normalizeCategoryName(name);
  if (!cleanName) throw new Error('Category name is empty');

  const key = cacheKey(cleanName);
  if (!fresh && cache.has(key)) return cache.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch('/api/generate-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cleanName, fresh }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const e = new Error(
      err.name === 'AbortError'
        ? 'Timed out waiting for the writers\' room'
        : 'Could not reach the game server (is it running?)'
    );
    e.code = err.name === 'AbortError' ? 'timeout' : 'unreachable';
    throw e;
  }
  clearTimeout(timer);

  let data = null;
  try {
    data = await res.json();
  } catch {
    // fall through — handled below
  }

  if (!res.ok) {
    const e = new Error(data?.error || `Server error (${res.status})`);
    e.code = data?.code || 'server_error';
    throw e;
  }

  const result = validateCategory(data, cleanName);
  cache.set(key, result);
  return result;
}

function validateCategory(data, fallbackName) {
  const clues = Array.isArray(data?.clues) ? data.clues : [];
  const expected = [200, 400, 600, 800, 1000];
  const ok =
    clues.length === 5 &&
    clues.every(
      (c, i) =>
        Number(c.value) === expected[i] &&
        typeof c.clue === 'string' && c.clue.trim() &&
        typeof c.response === 'string' && c.response.trim()
    );
  if (!ok) {
    const e = new Error('The generated category came back malformed');
    e.code = 'malformed';
    throw e;
  }
  return {
    name: normalizeCategoryName(data.name) || fallbackName,
    clues: clues.map((c, i) => ({
      value: expected[i],
      clue: c.clue.trim(),
      response: c.response.trim(),
    })),
  };
}

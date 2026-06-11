/**
 * Forgiving answer matching for trivia responses.
 *
 * Real responses are messy: "Their boots/shoes", "(Albert) Einstein",
 * "George Washington", "Paris, France". Players type fragments and
 * typos. This module is deliberately lenient — in a party game, a
 * frustrated "that should've counted!" is worse than the rare gift.
 *
 * Strategy: expand the correct response into a set of acceptable
 * candidate strings (handling slashes, parentheses, possessives,
 * surnames), then accept the user's answer if it matches ANY of them
 * exactly, as a typo, as a subset, or by sharing a significant word.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'his', 'her', 'hers', 'their', 'its', 'your', 'my',
  'our', 'of', 'and', 'or', 'to', 'in', 'on', 'at', 'for', 'with', 'de',
  'la', 'le', 'el', 'los', 'las', 'von', 'van',
]);

const LEADING_ARTICLE = /^(a|an|the|his|her|their|its|your|my|our)\s+/;
const QUESTION_PREFIX = /^(what|who|where|when|why|how)(?:'s|s)?\s+(is|are|was|were|did|do|does|it'?s)\s+/;

function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Light normalization shared by both sides. */
function clean(str) {
  let s = stripDiacritics(String(str).toLowerCase()).trim();
  s = s.replace(QUESTION_PREFIX, '');
  s = s.replace(/[^a-z0-9\s]/g, ' ');   // drop punctuation
  s = s.replace(/\s+/g, ' ').trim();
  // Strip leading articles/possessives, possibly stacked ("the a" is rare but cheap)
  let prev;
  do { prev = s; s = s.replace(LEADING_ARTICLE, ''); } while (s !== prev);
  return s.trim();
}

function tokens(s) {
  return s ? s.split(' ').filter(Boolean) : [];
}

function significant(tok) {
  return tok.length >= 4 && !STOPWORDS.has(tok);
}

/**
 * Build the set of acceptable answer strings from a raw response.
 */
function candidates(correctResponse) {
  const raw = stripDiacritics(String(correctResponse).toLowerCase());

  // Two parenthetical readings: keep the inner words, and drop them.
  const withParens = raw.replace(/[()]/g, ' ');
  const withoutParens = raw.replace(/\([^)]*\)/g, ' ');

  const set = new Set();
  for (const variant of [withParens, withoutParens]) {
    // Split on alternative separators: / , ; & "and" "or"
    const pieces = variant.split(/\s*(?:\/|,|;|&|\bor\b|\band\b)\s*/);
    for (const piece of pieces) {
      const c = clean(piece);
      if (!c) continue;
      set.add(c);
      // A multi-word answer's surname/keyword often suffices ("Washington").
      const tk = tokens(c);
      if (tk.length > 1) {
        const last = tk[tk.length - 1];
        if (significant(last)) set.add(last);
      }
    }
  }
  // Always include the whole cleaned response too.
  const whole = clean(raw.replace(/[()]/g, ' '));
  if (whole) set.add(whole);

  return [...set].filter(Boolean);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function sim(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Are two single words the same allowing for a small typo? */
function tokenMatch(a, b) {
  if (a === b) return true;
  const d = levenshtein(a, b);
  if (a.length <= 5 || b.length <= 5) return d <= 1;
  return d <= 2;
}

/**
 * Check if the user's answer matches the correct response.
 * Returns { correct: boolean, similarity: number }.
 */
export function checkAnswer(userAnswer, correctResponse) {
  const user = clean(userAnswer);
  if (!user) return { correct: false, similarity: 0 };

  const userTokens = tokens(user);
  const userSig = userTokens.filter(significant);
  // Did the user type at least one real word (not just articles like "of")?
  const userMeaningful = userTokens.some(t => t.length >= 3 && !STOPWORDS.has(t));
  const cands = candidates(correctResponse);

  let best = 0;

  for (const c of cands) {
    if (!c) continue;

    // 1. Exact (after normalization)
    if (user === c) return { correct: true, similarity: 1 };

    // 2. Whole-phrase typo tolerance
    const s = sim(user, c);
    best = Math.max(best, s);
    const threshold = Math.max(c.length, user.length) <= 6 ? 0.78 : 0.72;
    if (s >= threshold) return { correct: true, similarity: s };

    const cTokens = tokens(c);

    // 3. Subset: everything the user typed appears in the answer (or vice-versa),
    //    as long as a meaningful word is involved ("gatsby" → "the great gatsby").
    if (userTokens.length && cTokens.length && userMeaningful) {
      const userInC = userTokens.every(ut => cTokens.some(ct => tokenMatch(ut, ct)));
      const cInUser = cTokens.every(ct => userTokens.some(ut => tokenMatch(ut, ct)));
      if (userInC || cInUser) {
        return { correct: true, similarity: 0.9 };
      }
    }

    // 4. Single keyword the player gave matches a key word of the answer
    //    ("boots" → "boots/shoes", "Einstein" → "Albert Einstein").
    //    Only when the user gave essentially ONE keyword, so two distinct
    //    full names sharing a first name ("Michael Jordan"/"Jackson") don't match.
    if (userSig.length <= 1) {
      const cSig = cTokens.filter(significant);
      for (const us of userSig) {
        for (const cs of cSig) {
          if (tokenMatch(us, cs)) return { correct: true, similarity: 0.85 };
        }
      }
    }
  }

  return { correct: false, similarity: best };
}

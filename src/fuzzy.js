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

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
  // regnal and war numbers: "Henry 8" for "Henry VIII", "World War 2" for "World War II"
  ii: 2, iii: 3, iv: 4, vi: 6, vii: 7, viii: 8, ix: 9, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16,
};

function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Light normalization shared by both sides. */
function clean(str) {
  let s = stripDiacritics(String(str).toLowerCase()).trim();
  s = s.replace(QUESTION_PREFIX, '');
  s = s.replace(/[^a-z0-9\s]/g, ' ');   // drop punctuation
  s = s.replace(/\s+/g, ' ').trim();
  s = s.split(' ').map(w => (w in NUMBER_WORDS ? String(NUMBER_WORDS[w]) : w)).join(' ');
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

const digits = s => (s.match(/\d+/g) || []).join(' ');

/** Are two single words the same allowing for a small typo? */
function tokenMatch(a, b) {
  if (a === b) return true;
  // Numbers are never typos: 1888 is not 1889.
  if (/\d/.test(a) || /\d/.test(b)) return false;
  // Short words are too close to each other to forgive a letter ("five" / "fire", "cat" / "car"):
  // only a plural is let through ("bee" / "bees").
  if (Math.min(a.length, b.length) <= 4) {
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    return long === short + 's' || long === short + 'es';
  }
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
  const userMeaningful = userTokens.some(t => (t.length >= 3 && !STOPWORDS.has(t)) || /\d/.test(t));
  const userDigits = digits(user);
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
    // a near miss in the spelling counts, but the numbers in it must be the same numbers,
    // and a short answer must be the same word
    const sameNumbers = digits(user) === digits(c);
    const shortWord = Math.max(c.length, user.length) <= 4;
    if (s >= threshold && sameNumbers && !shortWord) return { correct: true, similarity: s };

    const cTokens = tokens(c);
    // From here on a fragment can count, but never with a different number in it
    // ("Apollo 13" is not "Apollo 11").
    if (userDigits && userDigits !== digits(c)) continue;

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

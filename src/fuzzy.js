/**
 * Fuzzy answer matching for Jeopardy responses.
 *
 * Handles: case insensitivity, leading "what is/who is/where is",
 * articles (a/an/the), punctuation, partial matches, common typos.
 */

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/^(what|who|where|when|how)\s+(is|are|was|were|did)\s+/i, '')
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Check if the user's answer matches the correct response.
 * Returns { correct: boolean, similarity: number }
 */
export function checkAnswer(userAnswer, correctResponse) {
  const user = normalize(userAnswer);
  const correct = normalize(correctResponse);

  if (!user) return { correct: false, similarity: 0 };

  // Exact match after normalization
  if (user === correct) return { correct: true, similarity: 1 };

  // Check if one contains the other
  if (correct.includes(user) && user.length >= correct.length * 0.6) {
    return { correct: true, similarity: 0.9 };
  }
  if (user.includes(correct)) {
    return { correct: true, similarity: 0.9 };
  }

  // Levenshtein distance — allow typos proportional to length
  const dist = levenshtein(user, correct);
  const maxLen = Math.max(user.length, correct.length);
  const similarity = 1 - dist / maxLen;

  // Allow ~20% character errors for longer answers
  const threshold = maxLen <= 4 ? 0.75 : 0.8;

  return {
    correct: similarity >= threshold,
    similarity,
  };
}

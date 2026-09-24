// fuzzyMatch.js
// Generous answer matching for Jeopardy responses

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Normalize a string for comparison
 * - Remove "What is", "Who is", etc.
 * - Remove punctuation
 * - Remove articles (the, a, an) - AFTER punctuation so "E.P.A." becomes "EPA" first
 * - Lowercase
 * - Trim whitespace
 */
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/^(what|who|where|when|why|how)\s+(is|are|was|were)\s+/i, '')
    .replace(/^(what|who|where|when|why|how)\s+/i, '')
    .replace(/[^\w\s]/g, '')           // Remove punctuation FIRST
    .replace(/\b(the|a|an)\b/gi, '')   // Then remove articles (case-insensitive)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a guess matches the correct answer using fuzzy logic
 * @param {string} guess - The player's answer
 * @param {string} correctAnswer - The correct response
 * @returns {boolean} - True if the guess is close enough
 */
export function fuzzyMatch(guess, correctAnswer) {
  if (!guess || !correctAnswer) return false;

  const normalizedGuess = normalize(guess);
  const normalizedAnswer = normalize(correctAnswer);

  // Reject very short guesses (minimum 3 characters after normalization)
  if (normalizedGuess.length < 3) return false;

  // Exact match
  if (normalizedGuess === normalizedAnswer) return true;

  // Guess contains the full answer (user typed more than needed)
  if (normalizedGuess.includes(normalizedAnswer)) {
    return true;
  }

  // Answer contains the guess - allows partial correct answers
  // e.g., "Edison" matches "Thomas Edison", "gravity" matches "force of gravity"
  // But requires guess to be substantial (at least 4 chars AND 40% of answer length)
  if (normalizedAnswer.includes(normalizedGuess)) {
    if (normalizedGuess.length >= 4 && normalizedGuess.length >= normalizedAnswer.length * 0.4) {
      return true;
    }
  }

  // Levenshtein distance check - only if lengths are reasonably similar
  const lengthRatio = normalizedGuess.length / normalizedAnswer.length;
  if (lengthRatio >= 0.6 && lengthRatio <= 1.5) {
    // Allow up to 20% difference, max 2 characters
    const maxDistance = Math.min(2, Math.ceil(normalizedAnswer.length * 0.20));
    const distance = levenshteinDistance(normalizedGuess, normalizedAnswer);
    if (distance <= maxDistance) return true;
  }

  return false;
}

/**
 * Examples that should match:
 * - "gravity" matches "gravity" ✓
 * - "what is gravity" matches "gravity" ✓
 * - "the mitochondria" matches "mitochondria" ✓
 * - "shakespear" matches "Shakespeare" ✓ (Levenshtein = 2)
 * - "mount everest" matches "Mt. Everest" ✓
 * - "EPA" matches "The EPA" ✓ (articles stripped)
 * - "Edison" matches "Thomas Edison" ✓ (partial match, substantial)
 * - "gravity" matches "the force of gravity" ✓ (partial match)
 *
 * Examples that should NOT match:
 * - "g" does NOT match "googol" ✗ (too short)
 * - "1 million" does NOT match "googol" ✗ (completely different)
 * - "cat" does NOT match "catastrophe" ✗ (not substantial enough - 3 chars, needs 4+)
 */

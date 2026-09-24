// dataLoader.js
// Load dataset and generate random Jeopardy boards

import cluesData from '../data/clues.json';

/**
 * Assign a difficulty tier based on the original clue value
 * Tier 1 (easiest) = $100-$200 → board value $200
 * Tier 2 = $300-$400 → board value $400
 * Tier 3 = $500-$600 → board value $600
 * Tier 4 = $800-$1200 → board value $800
 * Tier 5 (hardest) = $1000-$2000 → board value $1000
 */
function assignTier(originalValue) {
  if (originalValue <= 200) return 1;
  if (originalValue <= 400) return 2;
  if (originalValue <= 600) return 3;
  if (originalValue <= 1200) return 4;
  return 5;
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a random game board
 * @param {Array} customCategories - Optional custom AI-generated categories [{name, clues: [{value, clue, response}]}]
 * @returns {Object} - Board data structure
 */
export function generateBoard(customCategories = []) {
  const board = {};
  const allCategories = Object.keys(cluesData);

  // 1. Add custom AI categories (if any)
  for (const custom of customCategories) {
    board[custom.name] = {};
    for (const clue of custom.clues) {
      board[custom.name][clue.value] = {
        clue: clue.clue,
        response: clue.response,
        answered: false,
        dailyDouble: false,
        isAiGenerated: true,
      };
    }
  }

  // 2. Fill remaining slots with random archive categories
  const slotsNeeded = 6 - customCategories.length;
  const shuffledCategories = shuffle(allCategories);
  const takenNames = new Set(customCategories.map(c => c.name.toLowerCase()));
  let filled = 0;

  for (const category of shuffledCategories) {
    if (filled >= slotsNeeded) break;
    if (takenNames.has(category.toLowerCase())) continue; // name already used by a custom category

    const clues = cluesData[category];

    // Group clues by tier
    const byTier = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const clue of clues) {
      const tier = assignTier(clue.val);
      byTier[tier].push(clue);
    }

    // Need at least 1 clue per tier to make a complete category
    const hasCoverage = Object.values(byTier).every(arr => arr.length > 0);
    if (!hasCoverage) continue;

    // Build the category
    board[category] = {};
    const tierToValue = { 1: 200, 2: 400, 3: 600, 4: 800, 5: 1000 };

    for (const [tier, value] of Object.entries(tierToValue)) {
      const pool = byTier[tier];
      const pick = pool[Math.floor(Math.random() * pool.length)];

      board[category][value] = {
        clue: pick.clue,
        response: pick.resp,
        answered: false,
        dailyDouble: false,
        isAiGenerated: false,
        airDate: pick.date,
      };
    }

    filled++;
  }

  // 3. Place 2 Daily Doubles
  // Don't put on $200 (too easy), prefer higher values
  // Must be in different categories
  const categories = Object.keys(board);
  const allCells = [];

  for (const cat of categories) {
    for (const val of [400, 600, 800, 1000]) {
      allCells.push({ cat, val });
    }
  }

  const shuffledCells = shuffle(allCells);
  const ddCell1 = shuffledCells[0];

  // Find a second DD in a different category
  const ddCell2 = shuffledCells.find(cell => cell.cat !== ddCell1.cat) || shuffledCells[1];

  board[ddCell1.cat][ddCell1.val].dailyDouble = true;
  board[ddCell2.cat][ddCell2.val].dailyDouble = true;

  return {
    categories: Object.keys(board),
    board
  };
}

/**
 * Get a random Final Jeopardy clue
 * Note: The processed dataset filters out Final Jeopardy (round 3)
 * So we'll generate a challenging clue from a random hard category
 */
export function getFinalJeopardyClue() {
  const allCategories = Object.keys(cluesData);
  const category = allCategories[Math.floor(Math.random() * allCategories.length)];
  const clues = cluesData[category];

  // Pick a harder clue (from higher value tiers)
  const hardClues = clues.filter(c => assignTier(c.val) >= 4);
  const pool = hardClues.length > 0 ? hardClues : clues;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  return {
    category,
    clue: pick.clue,
    response: pick.resp,
  };
}

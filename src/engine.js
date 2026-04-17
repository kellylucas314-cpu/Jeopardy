/**
 * Game engine — orchestrates the full Jeopardy game flow.
 */

import { getState, setState } from './state.js';
import { loadRoundCategories, loadFinalClue } from './data.js';
import { checkAnswer } from './fuzzy.js';
import * as sounds from './sounds.js';

/**
 * Start a new game with the given player names.
 */
export async function startGame(playerNames) {
  setState({
    players: playerNames.map(name => ({ name, score: 0 })),
    activePlayer: 0,
    lastCorrectPlayer: 0,
    round: 1,
    cluesAnswered: 0,
    screen: 'loading',
  });

  await loadRound(1);
}

/**
 * Load categories for a round and set up the board.
 */
async function loadRound(round) {
  const categories = await loadRoundCategories(round);

  // Place daily doubles
  const ddLocations = placeDailyDoubles(categories, round);
  for (const dd of ddLocations) {
    categories[dd.catIndex].clues[dd.clueIndex].isDailyDouble = true;
  }

  setState({
    round,
    categories,
    dailyDoubleLocations: ddLocations,
    cluesAnswered: 0,
    totalClues: 30,
    screen: 'board',
  });

  sounds.playFanfare();
}

/**
 * Place daily doubles on the board.
 * Round 1: 1 daily double. Round 2: 2 daily doubles.
 * They tend to appear on higher-value clues (rows 3-5).
 */
function placeDailyDoubles(categories, round) {
  const count = round === 1 ? 1 : 2;
  const locations = [];
  const used = new Set();

  while (locations.length < count) {
    const catIndex = Math.floor(Math.random() * 6);
    // Weighted toward higher values (rows 2-4, 0-indexed)
    const weights = [1, 2, 4, 6, 8];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let clueIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { clueIndex = i; break; }
    }

    const key = `${catIndex}-${clueIndex}`;
    if (!used.has(key)) {
      used.add(key);
      locations.push({ catIndex, clueIndex });
    }
  }

  return locations;
}

/**
 * Player selects a clue on the board.
 */
export function selectClue(catIndex, clueIndex) {
  const { categories } = getState();
  const cat = categories[catIndex];
  const clue = cat.clues[clueIndex];

  if (clue.answered) return;

  const currentClue = {
    catIndex,
    clueIndex,
    clue: clue.clue,
    response: clue.response,
    value: clue.value,
    isDailyDouble: clue.isDailyDouble,
    categoryName: cat.name,
  };

  setState({ currentClue });

  if (clue.isDailyDouble) {
    sounds.playDailyDouble();
    setState({ screen: 'daily-double' });
  } else {
    sounds.playSelect();
    setState({ screen: 'clue', timerSeconds: 30, timerRunning: true });
  }
}

/**
 * Submit a daily double wager and show the clue.
 */
export function submitWager(amount) {
  setState({
    wagerAmount: amount,
    screen: 'clue',
    timerSeconds: 30,
    timerRunning: true,
  });
}

/**
 * Submit an answer to the current clue.
 */
export function submitAnswer(userAnswer) {
  const { currentClue, players, activePlayer, categories, cluesAnswered, wagerAmount } = getState();
  if (!currentClue) return null;

  setState({ timerRunning: false });

  const result = checkAnswer(userAnswer, currentClue.response);
  const value = currentClue.isDailyDouble ? wagerAmount : currentClue.value;

  const updatedPlayers = [...players];
  if (result.correct) {
    updatedPlayers[activePlayer] = {
      ...updatedPlayers[activePlayer],
      score: updatedPlayers[activePlayer].score + value,
    };
    sounds.playCorrect();
  } else {
    updatedPlayers[activePlayer] = {
      ...updatedPlayers[activePlayer],
      score: updatedPlayers[activePlayer].score - value,
    };
    sounds.playWrong();
  }

  // Mark clue as answered
  const updatedCategories = categories.map((cat, ci) =>
    ci === currentClue.catIndex
      ? {
          ...cat,
          clues: cat.clues.map((cl, cli) =>
            cli === currentClue.clueIndex ? { ...cl, answered: true } : cl
          ),
        }
      : cat
  );

  const newCluesAnswered = cluesAnswered + 1;
  const lastCorrect = result.correct ? activePlayer : getState().lastCorrectPlayer;

  setState({
    players: updatedPlayers,
    categories: updatedCategories,
    cluesAnswered: newCluesAnswered,
    lastCorrectPlayer: lastCorrect,
  });

  return {
    correct: result.correct,
    correctResponse: currentClue.response,
    value,
  };
}

/**
 * Called when the answer result has been shown and we return to the board.
 */
export function returnToBoard() {
  const { cluesAnswered, totalClues, round, players, activePlayer, lastCorrectPlayer } = getState();

  // Rotate to next player (or last correct player stays for next pick)
  let nextPlayer;
  if (players.length > 1) {
    nextPlayer = lastCorrectPlayer;
  } else {
    nextPlayer = 0;
  }

  if (cluesAnswered >= totalClues) {
    // Round is complete
    if (round === 1) {
      setState({ currentClue: null, screen: 'round-transition' });
    } else {
      // Go to Final Jeopardy
      setState({ currentClue: null, screen: 'loading' });
      startFinalJeopardy();
    }
  } else {
    setState({ currentClue: null, wagerAmount: 0, activePlayer: nextPlayer, screen: 'board' });
  }
}

/**
 * Handle time running out.
 */
export function timeExpired() {
  const { currentClue, players, activePlayer, categories, cluesAnswered, wagerAmount } = getState();
  if (!currentClue) return;

  setState({ timerRunning: false });
  sounds.playBuzzer();

  const value = currentClue.isDailyDouble ? wagerAmount : currentClue.value;

  const updatedPlayers = [...players];
  updatedPlayers[activePlayer] = {
    ...updatedPlayers[activePlayer],
    score: updatedPlayers[activePlayer].score - value,
  };

  const updatedCategories = categories.map((cat, ci) =>
    ci === currentClue.catIndex
      ? {
          ...cat,
          clues: cat.clues.map((cl, cli) =>
            cli === currentClue.clueIndex ? { ...cl, answered: true } : cl
          ),
        }
      : cat
  );

  setState({
    players: updatedPlayers,
    categories: updatedCategories,
    cluesAnswered: cluesAnswered + 1,
  });

  return { correctResponse: currentClue.response, value };
}

/**
 * Skip the current clue without penalty.
 */
export function skipClue() {
  const { currentClue, categories, cluesAnswered } = getState();
  if (!currentClue) return;

  setState({ timerRunning: false });

  const updatedCategories = categories.map((cat, ci) =>
    ci === currentClue.catIndex
      ? {
          ...cat,
          clues: cat.clues.map((cl, cli) =>
            cli === currentClue.clueIndex ? { ...cl, answered: true } : cl
          ),
        }
      : cat
  );

  setState({
    categories: updatedCategories,
    cluesAnswered: cluesAnswered + 1,
  });

  return { correctResponse: currentClue.response };
}

/**
 * Advance to Double Jeopardy round.
 */
export async function startDoubleJeopardy() {
  setState({ screen: 'loading' });
  sounds.playRoundTransition();
  await loadRound(2);
}

/**
 * Start Final Jeopardy.
 */
async function startFinalJeopardy() {
  const finalClue = await loadFinalClue();
  setState({
    round: 3,
    finalClue,
    finalWagers: getState().players.map(() => 0),
    finalAnswers: getState().players.map(() => ({ answer: '', correct: false })),
    screen: 'final-category',
  });
  sounds.playFanfare();
}

/**
 * Submit Final Jeopardy wagers.
 */
export function submitFinalWagers(wagers) {
  setState({
    finalWagers: wagers,
    screen: 'final-clue',
  });
  sounds.startThinkMusic();
}

/**
 * Submit Final Jeopardy answers and calculate results.
 */
export function submitFinalAnswers(answers) {
  sounds.stopThinkMusic();

  const { finalClue, finalWagers, players } = getState();
  const results = answers.map((answer, i) => {
    const result = checkAnswer(answer, finalClue.response);
    return { answer, correct: result.correct };
  });

  const updatedPlayers = players.map((player, i) => ({
    ...player,
    score: player.score + (results[i].correct ? finalWagers[i] : -finalWagers[i]),
  }));

  setState({
    finalAnswers: results,
    players: updatedPlayers,
    screen: 'final-answer',
  });

  return results;
}

/**
 * Show final results.
 */
export function showResults() {
  setState({ screen: 'results' });
}

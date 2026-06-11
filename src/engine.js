/**
 * Game engine — orchestrates the full Jeopardy game flow.
 */

import { getState, setState } from './state.js';
import { loadRoundCategories, loadFinalClue } from './data.js';
import { checkAnswer } from './fuzzy.js';
import * as sounds from './sounds.js';

function newPlayer(name) {
  return { name, score: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0 };
}

/**
 * Start a new game with the given player names and mode ('turns' | 'buzz').
 */
export async function startGame(playerNames, gameMode = 'turns') {
  setState({
    players: playerNames.map(newPlayer),
    gameMode: playerNames.length > 1 ? gameMode : 'turns',
    activePlayer: 0,
    answeringPlayer: 0,
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
    showCategoryIntro: true,
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
  const { categories, players, activePlayer } = getState();
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

  setState({
    currentClue,
    answeringPlayer: activePlayer,
    buzzAttempted: players.map(() => false),
    lastJudgment: null,
  });

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
 * A player buzzes in (buzz mode) — they become the answering player.
 */
export function buzzIn(playerIndex) {
  setState({ answeringPlayer: playerIndex });
  sounds.playBuzzIn();
}

/** Mark the current clue answered on the board. */
function markClueAnswered() {
  const { categories, currentClue, cluesAnswered } = getState();
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
  setState({ categories: updatedCategories, cluesAnswered: cluesAnswered + 1 });
}

/**
 * Submit an answer to the current clue (from the answering player).
 * Returns { correct, correctResponse, value, canRebuzz, remaining }.
 */
export function submitAnswer(userAnswer) {
  const { currentClue, players, answeringPlayer, gameMode, buzzAttempted, wagerAmount } = getState();
  if (!currentClue) return null;

  setState({ timerRunning: false });

  const result = checkAnswer(userAnswer, currentClue.response);
  const value = currentClue.isDailyDouble ? wagerAmount : currentClue.value;

  const updatedPlayers = [...players];
  const p = updatedPlayers[answeringPlayer];

  if (result.correct) {
    const streak = p.streak + 1;
    updatedPlayers[answeringPlayer] = {
      ...p,
      score: p.score + value,
      correct: p.correct + 1,
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
    };
    sounds.playCorrect();
  } else {
    updatedPlayers[answeringPlayer] = {
      ...p,
      score: p.score - value,
      wrong: p.wrong + 1,
      streak: 0,
    };
    sounds.playWrong();
  }

  const updatedAttempted = [...buzzAttempted];
  updatedAttempted[answeringPlayer] = true;
  const remaining = updatedAttempted.filter(a => !a).length;

  // In buzz mode a wrong answer reopens the buzzers for everyone else
  // (daily doubles belong to the picker only — no rebuzz).
  const canRebuzz =
    !result.correct &&
    gameMode === 'buzz' &&
    !currentClue.isDailyDouble &&
    remaining > 0;

  setState({
    players: updatedPlayers,
    buzzAttempted: updatedAttempted,
    lastJudgment: { playerIndex: answeringPlayer, value, correct: result.correct },
    lastCorrectPlayer: result.correct ? answeringPlayer : getState().lastCorrectPlayer,
  });

  if (!canRebuzz) markClueAnswered();

  return {
    correct: result.correct,
    correctResponse: currentClue.response,
    value,
    canRebuzz,
    remaining,
  };
}

/**
 * "We'll accept it" — the table overrules a wrong judgment.
 * Refunds the penalty and awards the clue value.
 */
export function overrideCorrect() {
  const { lastJudgment, players, currentClue, gameMode, buzzAttempted, cluesAnswered } = getState();
  if (!lastJudgment || lastJudgment.correct) return null;

  const { playerIndex, value } = lastJudgment;
  const updatedPlayers = [...players];
  const p = updatedPlayers[playerIndex];
  const streak = p.streak + 1;
  updatedPlayers[playerIndex] = {
    ...p,
    score: p.score + value * 2, // refund the penalty + award the value
    correct: p.correct + 1,
    wrong: Math.max(0, p.wrong - 1),
    streak,
    bestStreak: Math.max(p.bestStreak, streak),
  };

  setState({
    players: updatedPlayers,
    lastCorrectPlayer: playerIndex,
    lastJudgment: { ...lastJudgment, correct: true },
  });

  // If the clue was left open for a rebuzz, close it now.
  const clueStillOpen =
    gameMode === 'buzz' &&
    currentClue &&
    !currentClue.isDailyDouble &&
    buzzAttempted.some(a => !a);
  if (clueStillOpen) markClueAnswered();

  sounds.playCorrect();
  return { value };
}

/**
 * Buzz mode: nobody buzzed in — reveal the answer with no penalty.
 */
export function noBuzz() {
  const { currentClue } = getState();
  if (!currentClue) return null;

  setState({ timerRunning: false });
  sounds.playBuzzer();
  markClueAnswered();

  return { correctResponse: currentClue.response };
}

/**
 * Called when the answer result has been shown and we return to the board.
 */
export function returnToBoard() {
  const { cluesAnswered, totalClues, round, players, lastCorrectPlayer } = getState();

  // The last player to answer correctly picks the next clue
  const nextPlayer = players.length > 1 ? lastCorrectPlayer : 0;

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
 * Handle time running out (turns mode, or a buzzed-in player going silent).
 * Scores it as a wrong answer with no rebuzz.
 */
export function timeExpired() {
  const { currentClue, players, answeringPlayer, wagerAmount } = getState();
  if (!currentClue) return;

  setState({ timerRunning: false });
  sounds.playBuzzer();

  const value = currentClue.isDailyDouble ? wagerAmount : currentClue.value;

  const updatedPlayers = [...players];
  const p = updatedPlayers[answeringPlayer];
  updatedPlayers[answeringPlayer] = {
    ...p,
    score: p.score - value,
    wrong: p.wrong + 1,
    streak: 0,
  };

  setState({ players: updatedPlayers, lastJudgment: null });
  markClueAnswered();

  return { correctResponse: currentClue.response, value };
}

/**
 * Skip the current clue without penalty (turns mode).
 */
export function skipClue() {
  const { currentClue } = getState();
  if (!currentClue) return;

  setState({ timerRunning: false, lastJudgment: null });
  markClueAnswered();

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
  const results = answers.map((answer) => {
    const result = checkAnswer(answer, finalClue.response);
    return { answer, correct: result.correct };
  });

  const updatedPlayers = players.map((player, i) => ({
    ...player,
    score: player.score + (results[i].correct ? finalWagers[i] : -finalWagers[i]),
    correct: player.correct + (results[i].correct ? 1 : 0),
    wrong: player.wrong + (results[i].correct ? 0 : finalWagers[i] > 0 || answers[i] ? 1 : 0),
  }));

  setState({
    finalAnswers: results,
    players: updatedPlayers,
    screen: 'final-answer',
  });

  return results;
}

/**
 * Toggle a Final Jeopardy judgment ("we'll accept it" / "actually no").
 * Flips the player's result and re-applies the wager both ways.
 */
export function overrideFinalAnswer(playerIndex) {
  const { finalAnswers, finalWagers, players } = getState();
  const entry = finalAnswers[playerIndex];
  const wager = finalWagers[playerIndex];
  const nowCorrect = !entry.correct;

  // Reverse old wager effect, apply new: delta = 2 * wager in the new direction
  const delta = (nowCorrect ? 1 : -1) * wager * 2;

  const updatedPlayers = [...players];
  updatedPlayers[playerIndex] = {
    ...updatedPlayers[playerIndex],
    score: updatedPlayers[playerIndex].score + delta,
  };

  const updatedAnswers = [...finalAnswers];
  updatedAnswers[playerIndex] = { ...entry, correct: nowCorrect };

  setState({ players: updatedPlayers, finalAnswers: updatedAnswers });
  if (nowCorrect) sounds.playCorrect();
}

/**
 * Show final results.
 */
export function showResults() {
  setState({ screen: 'results' });
}

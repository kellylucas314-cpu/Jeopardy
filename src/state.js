/**
 * Centralized game state with event-driven updates.
 */

const listeners = new Set();

const state = {
  screen: 'setup', // setup | board | clue | daily-double | round-transition | final-category | final-wager | final-clue | final-answer | results
  round: 1,        // 1 = Jeopardy, 2 = Double Jeopardy, 3 = Final Jeopardy

  gameMode: 'turns', // 'turns' = take turns | 'buzz' = race to buzz in
  gameLength: 'full', // 'quick' = 1 round + final | 'full' = 2 rounds + final

  players: [],       // [{ name, score, correct, wrong, streak, bestStreak }]
  activePlayer: 0,   // index of the player picking clues
  answeringPlayer: 0, // index of the player answering the current clue
  lastCorrectPlayer: 0,

  categories: [],    // [{ name, clues: [{ clue, response, value, answered, isDailyDouble }] }]
  finalClue: null,   // { name, clue, response }
  finalWagers: [],   // [amount] per player
  finalAnswers: [],  // [{ answer, correct }] per player

  currentClue: null, // { catIndex, clueIndex, clue, response, value, isDailyDouble }
  wagerAmount: 0,

  buzzAttempted: [], // [bool] per player — who already missed this clue
  lastJudgment: null, // { playerIndex, value } — for "we'll accept it" overrides

  cluesAnswered: 0,
  totalClues: 30,    // 6 categories x 5 clues

  timerRunning: false,
  timerSeconds: 30,

  showCategoryIntro: false, // play the category reveal sequence on next board render

  dailyDoubleLocations: [], // [{ catIndex, clueIndex }]

  soundEnabled: true,
};

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);
  notify();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn(state);
}

export function resetForNewGame() {
  state.screen = 'setup';
  state.round = 1;
  state.gameLength = 'full';
  state.players = [];
  state.activePlayer = 0;
  state.answeringPlayer = 0;
  state.lastCorrectPlayer = 0;
  state.categories = [];
  state.finalClue = null;
  state.finalWagers = [];
  state.finalAnswers = [];
  state.currentClue = null;
  state.wagerAmount = 0;
  state.buzzAttempted = [];
  state.lastJudgment = null;
  state.cluesAnswered = 0;
  state.totalClues = 30;
  state.timerRunning = false;
  state.timerSeconds = 30;
  state.showCategoryIntro = false;
  state.dailyDoubleLocations = [];
  notify();
}

// ——— Saved preferences (player names, mode, sound) ———

const PREFS_KEY = 'jeopardy-prefs';

export function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...prefs }));
  } catch {
    // localStorage unavailable (private browsing etc.) — no big deal
  }
}

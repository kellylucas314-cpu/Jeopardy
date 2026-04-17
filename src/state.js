/**
 * Centralized game state with event-driven updates.
 */

const listeners = new Set();

const state = {
  screen: 'setup', // setup | board | clue | daily-double | round-transition | final-category | final-wager | final-clue | final-answer | results
  round: 1,        // 1 = Jeopardy, 2 = Double Jeopardy, 3 = Final Jeopardy

  players: [],       // [{ name, score }]
  activePlayer: 0,   // index into players array
  lastCorrectPlayer: 0,

  categories: [],    // [{ name, clues: [{ clue, response, value, answered, isDailyDouble }] }]
  finalClue: null,   // { name, clue, response }
  finalWagers: [],   // [amount] per player
  finalAnswers: [],  // [{ answer, correct }] per player

  currentClue: null, // { catIndex, clueIndex, clue, response, value, isDailyDouble }
  wagerAmount: 0,

  cluesAnswered: 0,
  totalClues: 30,    // 6 categories x 5 clues

  timerRunning: false,
  timerSeconds: 30,

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
  state.players = [];
  state.activePlayer = 0;
  state.lastCorrectPlayer = 0;
  state.categories = [];
  state.finalClue = null;
  state.finalWagers = [];
  state.finalAnswers = [];
  state.currentClue = null;
  state.wagerAmount = 0;
  state.cluesAnswered = 0;
  state.totalClues = 30;
  state.timerRunning = false;
  state.timerSeconds = 30;
  state.dailyDoubleLocations = [];
  notify();
}

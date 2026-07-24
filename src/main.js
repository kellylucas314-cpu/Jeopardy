/**
 * Main entry — renders all screens based on game state.
 */

import { getState, setState, subscribe, resetForNewGame, loadPrefs, savePrefs, loadRecords, recordGame } from './state.js';
import {
  startGame, selectClue, submitWager, submitAnswer, buzzIn, noBuzz,
  overrideCorrect, overrideFinalAnswer, returnToBoard, timeExpired,
  skipClue, startDoubleJeopardy, submitFinalWagers, submitFinalAnswers, showResults, rerollBoard,
} from './engine.js';
import * as sounds from './sounds.js';

const app = document.getElementById('app');
let timerInterval = null;
let lastScreen = null;
let boardRevealDone = false;

// Player identity
const PLAYER_COLORS = ['var(--p0)', 'var(--p1)', 'var(--p2)'];
const AVATARS = ['🦊', '🐙', '🦉', '🐸', '🦄', '🐯', '🐼', '👾', '🤖', '🍕', '🌟', '🐳'];
let prevScores = []; // for score-bump animation on the board
let prevLeader = null; // for lead-change announcements

// Personality — the game reacts like a host, not a spreadsheet
const CORRECT_LINES = ['Nailed it!', 'Big brain energy!', 'Money in the bank!', 'Too easy for you!', "That's the one!", 'Scholar alert!', 'Certified genius!'];
const WRONG_LINES = ['Not this time!', 'Ooh, so close!', 'The judges say no!', 'Swing and a miss!', "That's gonna sting!", 'Bold... but no.'];
const TIMEOUT_LINES = ["Time's up!", 'The clock got you!', 'Frozen at the buzzer!'];
const NOBUZZ_LINES = ['No takers!', 'Crickets...', 'Tough crowd!', "Nobody's biting!"];
const STEAL_LINES = ['It can be stolen!', 'Free money on the table!', 'Who wants it?'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Buzz-mode bookkeeping (imperative, within the clue screen)
const BUZZ_KEYS = ['q', 'p', 'b']; // player 1, 2, 3
let buzzPhase = null; // 'reading' | 'open' | 'answering' | 'done'
let buzzLockedUntil = [];
let buzzTimeouts = [];
let buzzKeyHandler = null;

// ——— Screen Router ———

function render() {
  const state = getState();

  // Avoid re-rendering when only the timer ticked (no screen change)
  if (state.screen === lastScreen && state.screen === 'clue') return;
  lastScreen = state.screen;

  // Stop any running timer when leaving the clue screen
  if (state.screen !== 'clue') cleanupClue();

  // Clear celebratory confetti when leaving the results screen
  if (state.screen !== 'results') {
    document.querySelectorAll('.confetti-container').forEach(el => el.remove());
  }

  // Board keyboard nav only lives on the board
  if (state.screen !== 'board') detachBoardKeys();

  switch (state.screen) {
    case 'setup': renderSetup(); break;
    case 'loading': renderLoading(); break;
    case 'error': renderError(); break;
    case 'board': renderBoard(); break;
    case 'clue': renderClue(); break;
    case 'daily-double': renderDailyDouble(); break;
    case 'round-transition': renderRoundTransition(); break;
    case 'final-category': renderFinalCategory(); break;
    case 'final-wager': renderFinalWager(); break;
    case 'final-clue': renderFinalClue(); break;
    case 'final-answer': renderFinalAnswer(); break;
    case 'results': renderResults(); break;
  }
}

subscribe(render);

// ——— Timer ———

function startTimer(totalSeconds, onExpire) {
  clearInterval(timerInterval);
  let seconds = totalSeconds;
  updateTimerDisplay(seconds, totalSeconds);

  timerInterval = setInterval(() => {
    seconds--;

    if (seconds <= 5 && seconds > 0) sounds.playTick();
    updateTimerDisplay(seconds, totalSeconds);

    if (seconds <= 0) {
      clearInterval(timerInterval);
      onExpire();
    }
  }, 1000);
}

function updateTimerDisplay(seconds, total) {
  const urgent = seconds <= 5;
  const timerEl = document.getElementById('timer-bar');
  if (timerEl) {
    timerEl.style.width = `${(Math.max(0, seconds) / total) * 100}%`;
    timerEl.classList.toggle('urgent', urgent);
  }
  const timerText = document.getElementById('timer-text');
  if (timerText) {
    timerText.textContent = seconds;
    timerText.classList.toggle('urgent', urgent);
  }
}

function stopTimer() {
  clearInterval(timerInterval);
  setState({ timerRunning: false });
}

function cleanupClue() {
  clearInterval(timerInterval);
  for (const t of buzzTimeouts) clearTimeout(t);
  buzzTimeouts = [];
  buzzPhase = null;
  if (buzzKeyHandler) {
    window.removeEventListener('keydown', buzzKeyHandler);
    buzzKeyHandler = null;
  }
  cancelAdvance();
}

// Auto-return to the board after `ms`, but let the player skip the wait by
// clicking or pressing Enter/Space. Keeps repeat play snappy.
let advanceTimer = null;
let advanceHandler = null;

function scheduleReturn(ms) {
  cancelAdvance();
  const go = () => { cancelAdvance(); lastScreen = null; returnToBoard(); };
  advanceTimer = setTimeout(go, ms);
  advanceHandler = (e) => {
    if (e.type === 'keydown' && !['Enter', ' ', 'Spacebar'].includes(e.key)) return;
    if (e.target && e.target.closest && e.target.closest('button')) return; // let buttons work
    go();
  };
  // Delay attaching so the same keypress/click that submitted doesn't instantly skip.
  setTimeout(() => {
    if (!advanceHandler) return;
    document.addEventListener('click', advanceHandler);
    window.addEventListener('keydown', advanceHandler);
    const hint = document.getElementById('clue-feedback');
    if (hint && hint.classList.contains('show') && !hint.querySelector('.tap-hint')
        && !hint.querySelector('.feedback-actions')) {
      const el = document.createElement('div');
      el.className = 'tap-hint';
      el.textContent = 'tap or press space to continue';
      hint.appendChild(el);
    }
  }, 350);
}

function cancelAdvance() {
  if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
  if (advanceHandler) {
    document.removeEventListener('click', advanceHandler);
    window.removeEventListener('keydown', advanceHandler);
    advanceHandler = null;
  }
}

function handleTimeExpired() {
  const result = timeExpired();
  if (!result) return;

  showFeedback(`
    <div class="feedback-wrong">
      <div class="feedback-icon">&#x23F0;</div>
      <div>${pick(TIMEOUT_LINES)} -$${formatMoney(result.value)}</div>
      <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
    </div>
  `);
  scheduleReturn(3000);
}

// ——— Setup Screen ———

function renderSetup() {
  const prefs = loadPrefs();
  const savedNames = prefs.names || [];
  const savedAvatars = prefs.avatars || [];
  const playerCount = prefs.playerCount || 2;
  const gameMode = prefs.gameMode || 'turns';
  const gameLength = prefs.gameLength || 'full';
  const pack = prefs.pack === 'archive' ? 'archive' : 'fresh';
  if (typeof prefs.sound === 'boolean') sounds.setEnabled(prefs.sound);
  prevLeader = null;
  prevScores = [];
  recordedThisGame = false;

  const records = loadRecords();
  const hof = records.lastWinner ? `
    <div class="hall-of-fame">
      <span class="hof-item">👑 Last win: <strong>${escapeHtml(records.lastWinner.name)}</strong> · ${money(records.lastWinner.score)}</span>
      ${records.best ? `<span class="hof-item">🏆 Best: <strong>${escapeHtml(records.best.name)}</strong> · ${money(records.best.score)}</span>` : ''}
    </div>` : '';

  app.innerHTML = `
    <div class="setup-screen">
      <div class="logo-container">
        <h1 class="logo">RING IN</h1>
        <div class="logo-subtitle">Trivia Night</div>
      </div>
      ${hof}
      <div class="setup-card">
        <h2>How many players?</h2>
        <div class="player-count-buttons">
          ${[1, 2, 3].map(n => `
            <button class="btn-player-count ${n === playerCount ? 'selected' : ''}" data-count="${n}">
              ${n} Player${n > 1 ? 's' : ''}
            </button>
          `).join('')}
        </div>
        <div id="player-names"></div>
        <h2 class="mode-title">Game length</h2>
        <div class="player-count-buttons length-buttons">
          <button class="btn-player-count btn-length ${gameLength === 'quick' ? 'selected' : ''}" data-length="quick">
            Quick &middot; ~20 min
          </button>
          <button class="btn-player-count btn-length ${gameLength === 'full' ? 'selected' : ''}" data-length="full">
            Full &middot; ~45 min
          </button>
        </div>
        <h2 class="mode-title">Questions</h2>
        <div class="mode-buttons pack-buttons">
          <button class="btn-mode btn-pack ${pack === 'fresh' ? 'selected' : ''}" data-pack="fresh">
            <span class="mode-name">&#x2728; Fresh Pack</span>
            <span class="mode-desc">1,500+ original clues written for Ring In</span>
          </button>
          <button class="btn-mode btn-pack ${pack === 'archive' ? 'selected' : ''}" data-pack="archive">
            <span class="mode-name">&#x1F4FC; Deep Archive</span>
            <span class="mode-desc">460,000+ classic clues from trivia history</span>
          </button>
        </div>
        <div id="mode-section">
          <h2 class="mode-title">Game mode</h2>
          <div class="mode-buttons">
            <button class="btn-mode ${gameMode === 'turns' ? 'selected' : ''}" data-mode="turns">
              <span class="mode-name">Take Turns</span>
              <span class="mode-desc">Pass the keyboard, answer one at a time</span>
            </button>
            <button class="btn-mode ${gameMode === 'buzz' ? 'selected' : ''}" data-mode="buzz">
              <span class="mode-name">&#x1F514; Buzz In!</span>
              <span class="mode-desc">Race to the buzzer like the real show</span>
            </button>
          </div>
        </div>
        <button class="btn-start" id="btn-start-game">Start Game</button>
      </div>
      <div class="setup-footer">
        <label class="sound-toggle">
          <input type="checkbox" id="sound-checkbox" ${sounds.isEnabled() ? 'checked' : ''}>
          <span>Sound Effects</span>
        </label>
        <button class="link-btn" id="btn-how-to">How to play</button>
      </div>
    </div>
  `;

  renderPlayerInputs(playerCount, savedNames, savedAvatars);
  updateModeVisibility(playerCount);

  // Player count buttons
  document.querySelectorAll('.btn-player-count:not(.btn-length)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-player-count:not(.btn-length)').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const count = parseInt(btn.dataset.count);
      renderPlayerInputs(count, savedNames, savedAvatars);
      updateModeVisibility(count);
    });
  });

  // Game length buttons
  document.querySelectorAll('.btn-length').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-length').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Mode buttons
  document.querySelectorAll('.btn-mode:not(.btn-pack)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-mode:not(.btn-pack)').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Question pack buttons
  document.querySelectorAll('.btn-pack').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-pack').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      savePrefs({ pack: btn.dataset.pack });
    });
  });

  // Sound toggle
  document.getElementById('sound-checkbox').addEventListener('change', (e) => {
    sounds.setEnabled(e.target.checked);
    savePrefs({ sound: e.target.checked });
  });

  // How to play
  document.getElementById('btn-how-to').addEventListener('click', showHowTo);

  // Start button
  document.getElementById('btn-start-game').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.player-name-input');
    const names = Array.from(inputs).map((input, i) =>
      input.value.trim() || `Player ${i + 1}`
    );
    const avatars = Array.from(document.querySelectorAll('.avatar-btn')).map(b => b.textContent.trim());
    const mode = document.querySelector('.btn-mode.selected:not(.btn-pack)')?.dataset.mode || 'turns';
    const length = document.querySelector('.btn-length.selected')?.dataset.length || 'full';
    const packSel = document.querySelector('.btn-pack.selected')?.dataset.pack || 'fresh';
    savePrefs({ names, avatars, playerCount: names.length, gameMode: mode, gameLength: length, pack: packSel, sound: sounds.isEnabled() });
    sounds.playSelect();
    startGame(names, mode, avatars, length);
  });
}

function updateModeVisibility(count) {
  const section = document.getElementById('mode-section');
  if (section) section.style.display = count > 1 ? '' : 'none';
}

function renderPlayerInputs(count, savedNames = [], savedAvatars = []) {
  const container = document.getElementById('player-names');
  let html = '';
  for (let i = 0; i < count; i++) {
    const value = savedNames[i] || `Player ${i + 1}`;
    const avatar = savedAvatars[i] || AVATARS[i];
    html += `
      <div class="name-input-group">
        <button class="avatar-btn" data-index="${i}" title="Tap to change avatar" type="button">${avatar}</button>
        <label>Player ${i + 1}</label>
        <input type="text" class="player-name-input" placeholder="Enter name"
               value="${escapeHtml(value)}" data-index="${i}"
               style="--pc: ${PLAYER_COLORS[i]}">
      </div>
    `;
  }
  container.innerHTML = html;

  // Tap an avatar to cycle through the set
  container.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = AVATARS.indexOf(btn.textContent.trim());
      btn.textContent = AVATARS[(current + 1) % AVATARS.length];
      sounds.playSelect();
    });
  });
}

// ——— Loading Screen ———

function renderLoading() {
  app.innerHTML = `
    <div class="loading-screen">
      <div class="logo">RING IN</div>
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading clues...</div>
    </div>
  `;
}

function renderError() {
  app.innerHTML = `
    <div class="loading-screen">
      <div class="logo">RING IN</div>
      <div class="error-box">
        <div class="error-title">Couldn't load the clues</div>
        <div class="error-body">Check your connection and try again.</div>
        <button class="btn-cta" id="btn-error-retry">Back to Menu</button>
      </div>
    </div>
  `;
  document.getElementById('btn-error-retry').addEventListener('click', () => {
    lastScreen = null;
    resetForNewGame();
  });
}

// ——— Game Board ———

function renderBoard() {
  const { categories, players, activePlayer, round, cluesAnswered, totalClues, gameMode } = getState();
  const roundName = round === 1 ? 'Round 1' : 'Round 2 · Doubled';
  const progress = Math.round((cluesAnswered / totalClues) * 100);

  app.innerHTML = `
    <div class="board-screen">
      <div class="board-header">
        <button class="btn-menu" id="btn-menu" aria-label="Game menu" title="Menu (Esc)">☰</button>
        <div class="round-meta">
          <div class="round-name">${roundName}</div>
          <div class="round-progress"><div class="round-progress-fill" style="width:${progress}%"></div></div>
          ${players.length > 1 ? `<div class="picks-cue" style="--pc: ${PLAYER_COLORS[activePlayer]}">🎯 ${escapeHtml(players[activePlayer].name)} picks</div>` : ''}
        </div>
        <div class="scoreboard">
          ${players.map((p, i) => `
            <div class="player-score ${i === activePlayer ? 'active' : ''}" style="--pc: ${PLAYER_COLORS[i]}">
              <div class="player-avatar">${p.avatar || '🎲'}</div>
              <div class="player-meta">
                <div class="player-name">${escapeHtml(p.name)}${p.streak >= 2 ? ` <span class="streak">&#x1F525;${p.streak}</span>` : ''}</div>
                <div class="player-amount ${p.score < 0 ? 'negative' : ''}" data-index="${i}">$${formatMoney(p.score)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="game-board" id="game-board">
        ${categories.map((cat, ci) => `
          <div class="board-category" data-cat="${ci}">
            <div class="category-header">${escapeHtml(cat.name)}</div>
            ${cat.clues.map((clue, cli) => `
              <div class="board-clue ${clue.answered ? 'answered' : ''}"
                   data-cat="${ci}" data-clue="${cli}">
                ${clue.answered ? '' : '$' + clue.value}
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
      <div class="board-footer">
        ${cluesAnswered === 0 ? '<button class="link-btn reroll-btn" id="btn-reroll">🎲 New categories</button>' : ''}
        <div class="clues-remaining">
          ${totalClues - cluesAnswered} clues left
          ${gameMode === 'buzz' ? ` &nbsp;&middot;&nbsp; buzzers: ${players.map((p, i) => `${escapeHtml(p.name)} <span class="key-hint">${BUZZ_KEYS[i].toUpperCase()}</span>`).join(' ')}` : ''}
        </div>
      </div>
    </div>
  `;

  // Animate board reveal
  if (!boardRevealDone) {
    boardRevealDone = true;
    const board = document.getElementById('game-board');
    board.classList.add('revealing');
    setTimeout(() => board.classList.remove('revealing'), 800);
  }

  // Pulse any score that changed since the last board render
  players.forEach((p, i) => {
    if (prevScores[i] !== undefined && prevScores[i] !== p.score) {
      const el = document.querySelector(`.player-amount[data-index="${i}"]`);
      if (el) el.classList.add('bump');
    }
  });
  prevScores = players.map(p => p.score);

  // Lead-change announcement — keeps the race dramatic and visible
  if (players.length > 1) {
    const top = Math.max(...players.map(p => p.score));
    const leaders = players.map((p, i) => i).filter(i => players[i].score === top);
    const leader = leaders.length === 1 ? leaders[0] : null;
    if (leader !== null && prevLeader !== null && leader !== prevLeader) {
      showToast(`👑 ${escapeHtml(players[leader].name)} takes the lead!`, PLAYER_COLORS[leader]);
      sounds.playLeadChange();
    }
    if (leader !== null) prevLeader = leader;
  }

  document.getElementById('btn-menu').addEventListener('click', confirmQuit);
  const rerollBtn = document.getElementById('btn-reroll');
  if (rerollBtn) rerollBtn.addEventListener('click', () => { boardRevealDone = false; rerollBoard(); });

  const openClue = (el) => {
    const ci = parseInt(el.dataset.cat);
    const cli = parseInt(el.dataset.clue);
    zoomFromCell(el, () => selectClue(ci, cli));
  };

  // Clue click handlers — zoom the cell into the clue screen
  document.querySelectorAll('.board-clue:not(.answered)').forEach(el => {
    el.addEventListener('click', () => openClue(el));
  });

  attachBoardKeys(openClue);

  // Category intro sequence (once per round)
  if (getState().showCategoryIntro) {
    getState().showCategoryIntro = false; // consume without re-render
    playCategoryIntro(categories);
  }
}

/** First-timer rules card. */
function showHowTo() {
  if (document.querySelector('.modal-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal how-to" role="dialog" aria-modal="true" aria-label="How to play">
      <div class="modal-title">How to play</div>
      <ul class="how-to-list">
        <li><strong>Pick a clue</strong> from the board — higher rows are worth more.</li>
        <li><strong>Answer</strong> in plain words. Spelling and phrasing are forgiven, and you don't need "What is…".</li>
        <li><strong>Right</strong> adds the value; <strong>wrong</strong> subtracts it. Get 3 right in a row for a 🔥 streak bonus.</li>
        <li><strong>Buzz In! mode:</strong> race to ring in with your key (or tap) once the clue is read. Buzz too early and you're locked out briefly.</li>
        <li><strong>Daily Doubles</strong> let you wager. Then it's <strong>Final</strong> — one clue, secret wagers, winner takes the night.</li>
        <li>The table is the judge: hit <strong>"We'll accept it"</strong> if a close answer got marked wrong.</li>
        <li><strong>Playing solo?</strong> Chase a Rank — S is Grand Champion — and beat your personal best.</li>
        <li><strong>Question packs:</strong> the Fresh Pack is written for Ring In; the Deep Archive holds 460k+ classic clues.</li>
      </ul>
      <div class="modal-actions">
        <button class="btn-cta modal-cancel">Got it</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.modal-cancel').focus();
}

/** Quit-to-menu confirmation. Reachable from the board menu or Escape. */
function confirmQuit() {
  if (document.querySelector('.modal-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Leave game">
      <div class="modal-title">Leave this game?</div>
      <div class="modal-body">Your scores won't be saved.</div>
      <div class="modal-actions">
        <button class="btn-quiet modal-cancel">Keep Playing</button>
        <button class="btn-danger modal-confirm">Leave Game</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.modal-confirm').addEventListener('click', () => {
    close();
    cleanupClue();
    lastScreen = null;
    boardRevealDone = false;
    prevScores = [];
    prevLeader = null;
    sounds.stopThinkMusic();
    resetForNewGame();
  });
  overlay.querySelector('.modal-cancel').focus();
}

// Escape opens the quit prompt while a game is in progress.
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = document.querySelector('.modal-overlay');
  if (open) { open.remove(); return; }
  const screen = getState().screen;
  if (['board', 'clue', 'daily-double', 'round-transition',
       'final-category', 'final-wager', 'final-clue', 'final-answer'].includes(screen)) {
    confirmQuit();
  }
});

// Keyboard navigation of the board grid (arrows move, Enter picks).
let boardKeyHandler = null;
let boardCursor = { c: 0, r: 0 };

function detachBoardKeys() {
  if (boardKeyHandler) { window.removeEventListener('keydown', boardKeyHandler); boardKeyHandler = null; }
}

function attachBoardKeys(openClue) {
  detachBoardKeys();
  const cellAt = (c, r) => document.querySelector(`.board-clue[data-cat="${c}"][data-clue="${r}"]`);
  const paint = () => {
    document.querySelectorAll('.board-clue.cursor').forEach(el => el.classList.remove('cursor'));
    const el = cellAt(boardCursor.c, boardCursor.r);
    if (el) el.classList.add('cursor');
  };
  // Start the cursor on the first unanswered cell.
  outer: for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
    const el = cellAt(c, r);
    if (el && !el.classList.contains('answered')) { boardCursor = { c, r }; break outer; }
  }
  boardKeyHandler = (e) => {
    if (getState().screen !== 'board') return;
    if (document.querySelector('.modal-overlay, .category-intro')) return;
    let handled = true;
    if (e.key === 'ArrowLeft') boardCursor.c = (boardCursor.c + 5) % 6;
    else if (e.key === 'ArrowRight') boardCursor.c = (boardCursor.c + 1) % 6;
    else if (e.key === 'ArrowUp') boardCursor.r = (boardCursor.r + 4) % 5;
    else if (e.key === 'ArrowDown') boardCursor.r = (boardCursor.r + 1) % 5;
    else if (e.key === 'Enter') {
      const el = cellAt(boardCursor.c, boardCursor.r);
      if (el && !el.classList.contains('answered')) { detachBoardKeys(); openClue(el); }
      handled = true;
    } else handled = false;
    if (handled) { e.preventDefault(); paint(); }
  };
  window.addEventListener('keydown', boardKeyHandler);
  paint();
}

/** TV-chyron style announcement banner. */
function showToast(html, color = 'var(--accent-1)') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.setProperty('--pc', color);
  toast.innerHTML = html;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('leaving'), 2200);
  setTimeout(() => toast.remove(), 2700);
}

/** Animate the clicked board cell expanding to fill the screen, then run `then`. */
function zoomFromCell(cell, then) {
  const rect = cell.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'cell-ghost';
  ghost.style.top = `${rect.top}px`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.appendChild(ghost);

  requestAnimationFrame(() => requestAnimationFrame(() => ghost.classList.add('expand')));
  setTimeout(() => { then(); ghost.remove(); }, 340);
}

function playCategoryIntro(categories) {
  const overlay = document.createElement('div');
  overlay.className = 'category-intro';
  overlay.innerHTML = `
    <div class="ci-label">The categories are...</div>
    <div class="ci-name" id="ci-name"></div>
    <div class="ci-skip">tap to skip</div>
  `;
  // Mounted on <body> so board re-renders can't wipe it mid-sequence
  document.body.appendChild(overlay);

  const nameEl = overlay.querySelector('#ci-name');
  let i = 0;
  let timeout = null;

  function showNext() {
    if (i >= categories.length) { finish(); return; }
    nameEl.textContent = categories[i].name;
    nameEl.classList.remove('pop');
    void nameEl.offsetWidth; // restart animation
    nameEl.classList.add('pop');
    sounds.playCategoryBlip();
    i++;
    timeout = setTimeout(showNext, 1100);
  }

  function finish() {
    clearTimeout(timeout);
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 400);
  }

  overlay.addEventListener('click', finish);
  showNext();
}

// ——— Clue Screen ———

function renderClue() {
  const { currentClue, gameMode } = getState();
  if (!currentClue) return;

  if (gameMode === 'buzz' && !currentClue.isDailyDouble) {
    renderBuzzClue();
  } else {
    renderTurnsClue();
  }
}

function clueShell(extraHtml) {
  const { currentClue } = getState();
  const isDailyDouble = currentClue.isDailyDouble;
  const displayValue = isDailyDouble ? getState().wagerAmount : currentClue.value;

  return `
    <div class="clue-screen">
      <div class="clue-header">
        <span class="clue-category">${escapeHtml(currentClue.categoryName)}</span>
        <span class="clue-value">${isDailyDouble ? 'DD ' : ''}$${formatMoney(displayValue)}</span>
      </div>
      <div class="clue-timer">
        <div class="timer-bar-bg">
          <div class="timer-bar" id="timer-bar"></div>
        </div>
        <span class="timer-text" id="timer-text"></span>
      </div>
      <div class="clue-text">${escapeHtml(currentClue.clue)}</div>
      ${extraHtml}
      <div class="clue-feedback" id="clue-feedback" role="status" aria-live="polite"></div>
    </div>
  `;
}

function showFeedback(html) {
  const feedback = document.getElementById('clue-feedback');
  if (!feedback) return;
  feedback.innerHTML = html;
  feedback.classList.add('show');
}

/** Brief full-screen tint for a juicy correct/wrong beat. */
function flashScreen(kind) {
  const el = document.createElement('div');
  el.className = `screen-flash ${kind}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 550);
}

/** "🔥 3 in a row" bonus callout when a streak pays extra. */
function bonusHtml(result) {
  if (!result.bonus) return '';
  return `<div class="streak-callout">&#x1F525; ${result.streak} in a row &middot; +$${formatMoney(result.bonus)} streak bonus</div>`;
}

// — Turns mode (and daily doubles in any mode) —

function renderTurnsClue() {
  const { players, answeringPlayer, gameMode, currentClue } = getState();

  app.innerHTML = clueShell(`
    <div class="clue-player">
      ${players.length > 1 ? `<span>${escapeHtml(players[answeringPlayer].name)}'s ${currentClue.isDailyDouble && gameMode === 'buzz' ? 'Daily Double' : 'turn'}</span>` : ''}
    </div>
    <div class="clue-answer-area">
      <input type="text" id="answer-input" class="answer-input"
             placeholder="What is..." autocomplete="off">
      <div class="clue-buttons">
        <button class="btn-submit" id="btn-submit">Submit</button>
        <button class="btn-skip" id="btn-skip">Pass</button>
      </div>
    </div>
  `);

  startTimer(30, handleTimeExpired);

  const input = document.getElementById('answer-input');
  setTimeout(() => input.focus(), 50);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmitAnswer();
  });

  document.getElementById('btn-submit').addEventListener('click', handleSubmitAnswer);
  document.getElementById('btn-skip').addEventListener('click', handleSkip);
}

function handleSubmitAnswer() {
  const input = document.getElementById('answer-input');
  if (!input) return;
  const answer = input.value.trim();
  if (!answer) return;

  stopTimer();
  input.disabled = true;
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-skip').disabled = true;

  const result = submitAnswer(answer);
  if (!result) return;
  flashScreen(result.correct ? "correct" : "wrong");

  if (result.correct) {
    showFeedback(`
      <div class="feedback-correct">
        <div class="feedback-icon">&#x2713;</div>
        <div>${pick(CORRECT_LINES)} +$${formatMoney(result.value)}</div>
        ${bonusHtml(result)}
      </div>
    `);
    scheduleReturn(result.bonus ? 2400 : 2000);
  } else {
    showFeedback(`
      <div class="feedback-wrong">
        <div class="feedback-icon">&#x2717;</div>
        <div>${pick(WRONG_LINES)} -$${formatMoney(result.value)}</div>
        <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
        <div class="feedback-actions">
          <button class="btn-feedback-continue" id="btn-fb-continue">Continue</button>
          <button class="btn-feedback-accept" id="btn-fb-accept">We'll accept it &#x2713;</button>
        </div>
      </div>
    `);
    document.getElementById('btn-fb-continue').addEventListener('click', () => {
      lastScreen = null; returnToBoard();
    });
    document.getElementById('btn-fb-accept').addEventListener('click', handleOverride);
  }
}

function handleOverride() {
  const result = overrideCorrect();
  if (!result) return;
  showFeedback(`
    <div class="feedback-correct">
      <div class="feedback-icon">&#x2713;</div>
      <div>We'll accept it! +$${formatMoney(result.value)} (penalty refunded)</div>
      ${bonusHtml(result)}
    </div>
  `);
  scheduleReturn(result.bonus ? 2200 : 1800);
}

function handleSkip() {
  stopTimer();
  const result = skipClue();
  if (!result) return;

  showFeedback(`
    <div class="feedback-skip">
      <div>Passed</div>
      <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
    </div>
  `);
  scheduleReturn(2500);
}

// — Buzz mode —

function renderBuzzClue() {
  const { currentClue } = getState();

  app.innerHTML = clueShell(`
    <div class="buzz-status" id="buzz-status" title="Space to open buzzers">Read the clue&hellip; <span class="buzz-skip-hint">(space to ring in)</span></div>
    <div class="clue-answer-area" id="answer-area" style="display:none">
      <div class="clue-player" id="answering-name"></div>
      <input type="text" id="answer-input" class="answer-input"
             placeholder="What is..." autocomplete="off">
      <div class="clue-buttons">
        <button class="btn-submit" id="btn-submit">Submit</button>
      </div>
    </div>
    <div class="buzzer-row" id="buzzer-row"></div>
  `);

  buzzPhase = 'reading';
  buzzLockedUntil = getState().players.map(() => 0);
  renderBuzzerRow();
  attachBuzzKeys();

  // Tap the status to open buzzers early (the reader controls the pace).
  document.getElementById('buzz-status').addEventListener('click', () => {
    if (buzzPhase === 'reading') openBuzzers();
  });

  // Reading time scales with clue length, then the buzzers open
  const readingMs = Math.min(1500 + currentClue.clue.length * 25, 6000);
  buzzTimeouts.push(setTimeout(openBuzzers, readingMs));
}

function renderBuzzerRow() {
  const { players, buzzAttempted } = getState();
  const row = document.getElementById('buzzer-row');
  if (!row) return;

  row.innerHTML = players.map((p, i) => `
    <button class="btn-buzzer ${buzzAttempted[i] ? 'out' : ''}" data-player="${i}"
            style="--pc: ${PLAYER_COLORS[i]}" ${buzzAttempted[i] ? 'disabled' : ''}>
      <span class="buzzer-name">${p.avatar || ''} ${escapeHtml(p.name)}</span>
      <span class="buzzer-key">${buzzAttempted[i] ? '&#x2717;' : BUZZ_KEYS[i].toUpperCase()}</span>
    </button>
  `).join('');

  row.querySelectorAll('.btn-buzzer:not(.out)').forEach(btn => {
    btn.addEventListener('click', () => tryBuzz(parseInt(btn.dataset.player)));
  });
}

function attachBuzzKeys() {
  buzzKeyHandler = (e) => {
    if (e.repeat) return;
    if (buzzPhase === 'answering' || buzzPhase === 'done') return;
    // Space opens the buzzers early during the reading beat.
    if ((e.key === ' ' || e.key === 'Spacebar') && buzzPhase === 'reading') {
      e.preventDefault();
      openBuzzers();
      return;
    }
    const idx = BUZZ_KEYS.indexOf(e.key.toLowerCase());
    if (idx >= 0 && idx < getState().players.length) {
      e.preventDefault();
      tryBuzz(idx);
    }
  };
  window.addEventListener('keydown', buzzKeyHandler);
}

function openBuzzers() {
  if (buzzPhase === 'done') return;
  buzzPhase = 'open';

  const status = document.getElementById('buzz-status');
  if (status) {
    status.innerHTML = '&#x1F514; BUZZ IN!';
    status.classList.add('open');
  }
  sounds.playBuzzersOpen();

  // Nobody buzzes within the window → reveal the answer, no penalty
  startTimer(7, handleNoBuzz);
}

function tryBuzz(playerIndex) {
  const { buzzAttempted } = getState();
  if (buzzAttempted[playerIndex]) return;
  if (Date.now() < buzzLockedUntil[playerIndex]) return;

  if (buzzPhase === 'reading') {
    // Buzzed too early — brief lockout, just like the show
    buzzLockedUntil[playerIndex] = Date.now() + 1200;
    sounds.playLockout();
    navigator.vibrate?.([30, 40, 30]);
    const btn = document.querySelector(`.btn-buzzer[data-player="${playerIndex}"]`);
    if (btn) {
      btn.classList.add('locked');
      setTimeout(() => btn.classList.remove('locked'), 1200);
    }
    return;
  }

  if (buzzPhase !== 'open') return;
  buzzPhase = 'answering';
  clearInterval(timerInterval);
  navigator.vibrate?.(40);
  buzzIn(playerIndex);

  const { players } = getState();

  // Highlight who buzzed, hide the rest
  const status = document.getElementById('buzz-status');
  if (status) {
    status.innerHTML = '';
    status.classList.remove('open');
  }
  document.getElementById('buzzer-row').style.display = 'none';

  const area = document.getElementById('answer-area');
  area.style.display = '';
  document.getElementById('answering-name').innerHTML =
    `<span class="buzzed-flash" style="--pc: ${PLAYER_COLORS[playerIndex]}">${players[playerIndex].avatar || ''} ${escapeHtml(players[playerIndex].name)} buzzed in!</span>`;

  const input = document.getElementById('answer-input');
  setTimeout(() => input.focus(), 50);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleBuzzAnswer();
    e.stopPropagation();
  });
  document.getElementById('btn-submit').addEventListener('click', handleBuzzAnswer);

  startTimer(12, () => resolveBuzzAnswer('', true));
}

function handleBuzzAnswer() {
  const input = document.getElementById('answer-input');
  if (!input) return;
  const answer = input.value.trim();
  if (!answer) return;
  resolveBuzzAnswer(answer, false);
}

function resolveBuzzAnswer(answer, timedOut) {
  clearInterval(timerInterval);

  const input = document.getElementById('answer-input');
  if (input) input.disabled = true;
  const submitBtn = document.getElementById('btn-submit');
  if (submitBtn) submitBtn.disabled = true;

  const result = submitAnswer(answer);
  if (!result) return;
  flashScreen(result.correct ? "correct" : "wrong");

  if (result.correct) {
    buzzPhase = 'done';
    showFeedback(`
      <div class="feedback-correct">
        <div class="feedback-icon">&#x2713;</div>
        <div>${pick(CORRECT_LINES)} +$${formatMoney(result.value)}</div>
        ${bonusHtml(result)}
      </div>
    `);
    scheduleReturn(result.bonus ? 2400 : 2000);
    return;
  }

  // Wrong (or silent) — maybe others can still steal it
  const header = timedOut
    ? `<div class="feedback-icon">&#x23F0;</div><div>${pick(TIMEOUT_LINES)} -$${formatMoney(result.value)}</div>`
    : `<div class="feedback-icon">&#x2717;</div><div>${pick(WRONG_LINES)} -$${formatMoney(result.value)}</div>`;

  if (result.canRebuzz) {
    showFeedback(`
      <div class="feedback-wrong">
        ${header}
        <div class="correct-response">${pick(STEAL_LINES)} ${result.remaining} player${result.remaining > 1 ? 's' : ''} can buzz.</div>
        <div class="feedback-actions">
          <button class="btn-feedback-continue" id="btn-fb-continue">Open Buzzers &#x1F514;</button>
          ${timedOut ? '' : `<button class="btn-feedback-accept" id="btn-fb-accept">We'll accept it &#x2713;</button>`}
        </div>
      </div>
    `);
    document.getElementById('btn-fb-continue').addEventListener('click', reopenBuzzers);
    const acceptBtn = document.getElementById('btn-fb-accept');
    if (acceptBtn) acceptBtn.addEventListener('click', handleOverride);
  } else {
    buzzPhase = 'done';
    showFeedback(`
      <div class="feedback-wrong">
        ${header}
        <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
        <div class="feedback-actions">
          <button class="btn-feedback-continue" id="btn-fb-continue">Continue</button>
          ${timedOut ? '' : `<button class="btn-feedback-accept" id="btn-fb-accept">We'll accept it &#x2713;</button>`}
        </div>
      </div>
    `);
    document.getElementById('btn-fb-continue').addEventListener('click', () => {
      lastScreen = null; returnToBoard();
    });
    const acceptBtn = document.getElementById('btn-fb-accept');
    if (acceptBtn) acceptBtn.addEventListener('click', handleOverride);
  }
}

function reopenBuzzers() {
  const feedback = document.getElementById('clue-feedback');
  if (feedback) { feedback.innerHTML = ''; feedback.classList.remove('show'); }

  const area = document.getElementById('answer-area');
  if (area) {
    area.style.display = 'none';
    const input = document.getElementById('answer-input');
    if (input) { input.disabled = false; input.value = ''; }
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) submitBtn.disabled = false;
  }

  const row = document.getElementById('buzzer-row');
  if (row) row.style.display = '';
  renderBuzzerRow();
  openBuzzers();
}

function handleNoBuzz() {
  buzzPhase = 'done';
  const result = noBuzz();
  if (!result) return;

  const status = document.getElementById('buzz-status');
  if (status) { status.innerHTML = ''; status.classList.remove('open'); }

  showFeedback(`
    <div class="feedback-skip">
      <div>${pick(NOBUZZ_LINES)}</div>
      <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
    </div>
  `);
  scheduleReturn(2500);
}

// ——— Daily Double ———

function renderDailyDouble() {
  const { currentClue, players, answeringPlayer } = getState();
  const player = players[answeringPlayer];
  const maxWager = Math.max(player.score, currentClue.value * 2);

  app.innerHTML = `
    <div class="daily-double-screen">
      <div class="dd-flash">
        <div class="dd-title">DAILY<br>DOUBLE!</div>
      </div>
      <div class="dd-content">
        <div class="dd-category">${escapeHtml(currentClue.categoryName)}</div>
        <div class="dd-player">${escapeHtml(player.name)}</div>
        <div class="dd-score">Current score: $${formatMoney(player.score)}</div>
        <div class="dd-wager-area">
          <label>Your wager:</label>
          <div class="wager-input-row">
            <span class="wager-dollar">$</span>
            <input type="number" id="wager-input" class="wager-input"
                   min="5" max="${maxWager}" value="${Math.min(1000, maxWager)}" step="100">
          </div>
          <div class="wager-range">$5 to $${formatMoney(maxWager)}</div>
          <div class="wager-presets">
            <button class="btn-preset" data-amount="500">$500</button>
            <button class="btn-preset" data-amount="1000">$1,000</button>
            <button class="btn-preset" data-amount="${Math.floor(maxWager / 2)}">Half</button>
            <button class="btn-preset" data-amount="${maxWager}">All In</button>
          </div>
          <button class="btn-wager-submit" id="btn-wager">Lock In Wager</button>
        </div>
      </div>
    </div>
  `;

  const input = document.getElementById('wager-input');
  input.focus();
  input.select();

  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.amount;
    });
  });

  document.getElementById('btn-wager').addEventListener('click', () => {
    let amount = parseInt(input.value) || 0;
    amount = Math.max(5, Math.min(amount, maxWager));
    submitWager(amount);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      let amount = parseInt(input.value) || 0;
      amount = Math.max(5, Math.min(amount, maxWager));
      submitWager(amount);
    }
  });
}

// ——— Round Transition ———

function renderRoundTransition() {
  const { players } = getState();
  const lowest = players.reduce((minI, p, i, arr) => (p.score < arr[minI].score ? i : minI), 0);

  app.innerHTML = `
    <div class="transition-screen">
      <div class="transition-scores">
        <h3>End of Round 1</h3>
        ${players.map(p => `
          <div class="transition-player">
            <span>${p.avatar || ''} ${escapeHtml(p.name)}</span>
            <span class="${p.score < 0 ? 'negative' : ''}">$${formatMoney(p.score)}</span>
          </div>
        `).join('')}
      </div>
      <div class="transition-title">Round 2</div>
      <div class="transition-subtitle">All values are doubled!</div>
      ${players.length > 1 ? `<div class="transition-note">${players[lowest].avatar || ''} <strong>${escapeHtml(players[lowest].name)}</strong> is trailing and gets first pick</div>` : ''}
      <button class="btn-continue" id="btn-continue">Continue</button>
    </div>
  `;

  sounds.playRoundTransition();

  document.getElementById('btn-continue').addEventListener('click', () => {
    boardRevealDone = false;
    startDoubleJeopardy();
  });
}

// ——— Final Jeopardy ———

function renderFinalCategory() {
  const { finalClue, players } = getState();

  app.innerHTML = `
    <div class="final-screen">
      <div class="final-header">The Final</div>
      <div class="final-scores">
        ${players.map(p => `
          <div class="transition-player">
            <span>${escapeHtml(p.name)}</span>
            <span class="${p.score < 0 ? 'negative' : ''}">$${formatMoney(p.score)}</span>
          </div>
        `).join('')}
      </div>
      <div class="final-category-reveal">
        <div class="final-category-label">The category is:</div>
        <div class="final-category-name">${escapeHtml(finalClue.name)}</div>
      </div>
      <button class="btn-continue" id="btn-final-wager">Place Wagers</button>
    </div>
  `;

  sounds.playFanfare();

  document.getElementById('btn-final-wager').addEventListener('click', () => {
    setState({ screen: 'final-wager' });
  });
}

// A "hand the device to X" cover so nobody sees the next player's secret entry.
function passCover(playerIdx, sub, onReady) {
  const p = getState().players[playerIdx];
  app.innerHTML = `
    <div class="final-screen">
      <div class="final-header">The Final</div>
      <div class="pass-card">
        <div class="pass-avatar" style="--pc: ${PLAYER_COLORS[playerIdx]}">${p.avatar || '🎲'}</div>
        <div class="pass-name">Pass the device to ${escapeHtml(p.name)}</div>
        <div class="pass-sub">${sub}</div>
        <button class="btn-cta pass-go" id="pass-go">I'm ${escapeHtml(p.name)} — Ready</button>
      </div>
    </div>
  `;
  const go = document.getElementById('pass-go');
  go.focus();
  go.addEventListener('click', onReady);
}

function renderFinalWager() {
  const { players } = getState();
  const wagers = players.map(() => 0);
  const queue = players.map((_, i) => i).filter(i => players[i].score > 0);
  const solo = players.length === 1;

  if (queue.length === 0) { submitFinalWagers(wagers); return; }

  let qi = 0;
  const nextWager = () => {
    if (qi >= queue.length) { submitFinalWagers(wagers); return; }
    const idx = queue[qi];
    if (solo) wagerEntry(idx);
    else passCover(idx, 'Place your secret wager', () => wagerEntry(idx));
  };

  function wagerEntry(idx) {
    const p = players[idx];
    const maxW = Math.max(0, p.score);
    app.innerHTML = `
      <div class="final-screen">
        <div class="final-header">The Final</div>
        <div class="final-subtitle" style="--pc:${PLAYER_COLORS[idx]}">${p.avatar || ''} ${escapeHtml(p.name)} — you have $${formatMoney(p.score)}</div>
        <div class="dd-wager-area" style="max-width:380px;width:100%">
          <label>Your secret wager</label>
          <div class="wager-input-row">
            <span class="wager-dollar">$</span>
            <input type="number" id="wager-input" class="wager-input" min="0" max="${maxW}" value="${Math.min(1000, maxW)}" step="100">
          </div>
          <div class="wager-range">$0 to $${formatMoney(maxW)}</div>
          <div class="wager-presets">
            <button class="btn-preset" data-amount="0">Nothing</button>
            <button class="btn-preset" data-amount="${Math.floor(maxW / 2)}">Half</button>
            <button class="btn-preset" data-amount="${maxW}">All In</button>
          </div>
          <button class="btn-wager-submit" id="btn-lock">${qi < queue.length - 1 ? 'Lock In &amp; Pass' : 'Lock In Wager'}</button>
        </div>
      </div>
    `;
    const input = document.getElementById('wager-input');
    input.focus(); input.select();
    document.querySelectorAll('.btn-preset').forEach(b =>
      b.addEventListener('click', () => { input.value = b.dataset.amount; }));
    const lock = () => {
      let v = parseInt(input.value) || 0;
      wagers[idx] = Math.max(0, Math.min(v, maxW));
      qi++;
      nextWager();
    };
    document.getElementById('btn-lock').addEventListener('click', lock);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') lock(); });
  }

  nextWager();
}

function renderFinalClue() {
  const { finalClue, players, finalWagers } = getState();
  const solo = players.length === 1;
  const answers = players.map(() => '');
  const queue = players.map((_, i) => i).filter(i => finalWagers[i] > 0 || players[i].score > 0);

  // Everyone reads the clue together, think music playing.
  app.innerHTML = `
    <div class="final-screen">
      <div class="final-header">The Final</div>
      <div class="final-category-name small">${escapeHtml(finalClue.name)}</div>
      <div class="final-clue-text">${escapeHtml(finalClue.clue)}</div>
      <div class="think-music-note">&#9835; Think music playing…</div>
      <button class="btn-submit" id="btn-begin-answers" style="max-width:340px">
        ${solo ? 'Enter Answer' : 'Enter Answers'}
      </button>
    </div>
  `;

  document.getElementById('btn-begin-answers').addEventListener('click', () => {
    if (queue.length === 0) { sounds.stopThinkMusic(); submitFinalAnswers(answers); return; }
    let qi = 0;
    const nextAnswer = () => {
      if (qi >= queue.length) { sounds.stopThinkMusic(); submitFinalAnswers(answers); return; }
      const idx = queue[qi];
      if (solo) answerEntry(idx);
      else passCover(idx, 'Type your response (no peeking!)', () => answerEntry(idx));
    };
    function answerEntry(idx) {
      const p = players[idx];
      app.innerHTML = `
        <div class="final-screen">
          <div class="final-header">The Final</div>
          <div class="final-category-name small">${escapeHtml(finalClue.name)}</div>
          <div class="final-clue-text" style="font-size:1.3rem">${escapeHtml(finalClue.clue)}</div>
          <div class="final-answer-form">
            <div class="final-answer-player">
              <label style="--pc:${PLAYER_COLORS[idx]}">${p.avatar || ''} ${escapeHtml(p.name)} — your response</label>
              <input type="text" id="final-answer-input" class="answer-input" placeholder="What is…" autocomplete="off">
            </div>
            <button class="btn-submit" id="btn-lock-answer">${qi < queue.length - 1 ? 'Lock In &amp; Pass' : 'Reveal Answers'}</button>
          </div>
        </div>
      `;
      const input = document.getElementById('final-answer-input');
      input.focus();
      const lock = () => { answers[idx] = input.value.trim(); qi++; nextAnswer(); };
      document.getElementById('btn-lock-answer').addEventListener('click', lock);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') lock(); });
    }
    nextAnswer();
  });
}

function renderFinalAnswer() {
  const { finalClue, finalAnswers, finalWagers, players } = getState();

  app.innerHTML = `
    <div class="final-screen">
      <div class="final-header">The Final</div>
      <div class="final-correct-response">
        <div class="label">Correct response:</div>
        <div class="response">${escapeHtml(finalClue.response)}</div>
      </div>
      <div class="final-results-list">
        ${players.map((p, i) => `
          <div class="final-result-player ${finalAnswers[i].correct ? 'correct' : 'wrong'}">
            <div class="frp-name">${escapeHtml(p.name)}</div>
            <div class="frp-answer">"${escapeHtml(finalAnswers[i].answer || '(no answer)')}"</div>
            <div class="frp-wager">${finalAnswers[i].correct ? '+' : '-'}$${formatMoney(finalWagers[i])}</div>
            <div class="frp-total">$${formatMoney(p.score)}</div>
            ${finalWagers[i] > 0 || finalAnswers[i].answer ? `
              <button class="btn-final-override" data-player="${i}">
                ${finalAnswers[i].correct ? 'Mark wrong &#x2717;' : "We'll accept it &#x2713;"}
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn-continue" id="btn-show-results">Final Scores</button>
    </div>
  `;

  document.querySelectorAll('.btn-final-override').forEach(btn => {
    btn.addEventListener('click', () => {
      overrideFinalAnswer(parseInt(btn.dataset.player));
    });
  });

  document.getElementById('btn-show-results').addEventListener('click', showResults);
}

// ——— Results Screen ———

let recordedThisGame = false;

/** Solo report card: rank letter, title, and emoji from accuracy + volume. */
const SOLO_TIERS = [
  { letter: 'S', title: 'Grand Champion', emoji: '🏆', acc: 0.9, full: 22, quick: 12 },
  { letter: 'A', title: 'Tournament Ready', emoji: '🌟', acc: 0.8, full: 17, quick: 9 },
  { letter: 'B', title: 'Sharp Contender', emoji: '💪', acc: 0.65, full: 12, quick: 6 },
  { letter: 'C', title: 'Warming Up', emoji: '📚', acc: 0.5, full: 8, quick: 4 },
  { letter: 'D', title: 'Rookie Round', emoji: '🌱', acc: 0, full: 0, quick: 0 },
];

function soloRank(p, gameLength) {
  const attempts = p.correct + p.wrong;
  const acc = attempts ? p.correct / attempts : 0;
  const len = gameLength === 'full' ? 'full' : 'quick';
  for (let i = 0; i < SOLO_TIERS.length; i++) {
    const t = SOLO_TIERS[i];
    const lastTier = i === SOLO_TIERS.length - 1;
    // C is a soft tier: either decent accuracy or enough correct answers gets you in.
    const qualifies = t.letter === 'C'
      ? (acc >= t.acc || p.correct >= t[len])
      : (acc >= t.acc && p.correct >= t[len]);
    if (qualifies || lastTier) {
      const next = i > 0 ? SOLO_TIERS[i - 1] : null;
      return { ...t, next: next ? `Rank ${next.letter} needs ${next[len]}+ correct at ${Math.round(next.acc * 100)}% accuracy` : null };
    }
  }
}

function renderResults() {
  const { players, gameLength } = getState();
  const rec = loadRecords();
  const prevBest = rec.best ? rec.best.score : null;
  if (!recordedThisGame) { recordGame(players); recordedThisGame = true; }
  const ranked = players
    .map((p, originalIndex) => ({ ...p, originalIndex }))
    .sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const isTie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  const solo = players.length === 1;
  const rank = solo ? soloRank(winner, gameLength) : null;
  const newBest = solo && winner.score > 0 && (prevBest === null || winner.score > prevBest);

  // Podium display order: 2nd, 1st, 3rd (1st in the middle, tallest)
  const podiumOrder = ranked.length === 3 ? [ranked[1], ranked[0], ranked[2]]
    : ranked.length === 2 ? [ranked[1], ranked[0]]
    : [ranked[0]];
  const medal = ['&#x1F947;', '&#x1F948;', '&#x1F949;'];

  app.innerHTML = `
    <div class="results-screen">
      <div class="results-title">${solo
        ? `${rank.emoji} Rank ${rank.letter} — ${rank.title}`
        : isTie ? "It's a Tie!" : `${escapeHtml(winner.name)} Wins!`}</div>
      ${newBest ? '<div class="solo-best-callout">🎉 New personal best!</div>' : ''}
      ${solo && rank.next ? `<div class="solo-next-hint">${rank.next}</div>` : ''}
      ${solo ? `
      <div class="solo-scorecard" style="--pc: ${PLAYER_COLORS[0]}">
        <div class="podium-avatar">${winner.avatar || '🎲'}</div>
        <div class="solo-score-money ${winner.score < 0 ? 'negative' : ''}">${money(winner.score)}</div>
        <div class="solo-score-sub">${escapeHtml(winner.name)}'s winnings</div>
      </div>
      ` : `
      <div class="podium">
        ${podiumOrder.map(p => {
          const place = ranked.indexOf(p) + 1;
          return `
            <div class="podium-col rank-${place}" style="--pc: ${PLAYER_COLORS[p.originalIndex]}">
              <div class="podium-avatar">${p.avatar || '🎲'}</div>
              <div class="podium-name">${escapeHtml(p.name)}</div>
              <div class="podium-money ${p.score < 0 ? 'negative' : ''}">$${formatMoney(p.score)}</div>
              <div class="podium-block">${medal[place - 1]}</div>
            </div>
          `;
        }).join('')}
      </div>
      `}
      <div class="results-stats-list">
        ${ranked.map(p => {
          const attempts = p.correct + p.wrong;
          const accuracy = attempts > 0 ? Math.round((p.correct / attempts) * 100) : 0;
          return `
            <div class="result-stats-row">
              <span class="rsr-name" style="--pc: ${PLAYER_COLORS[p.originalIndex]}">${p.avatar || ''} ${escapeHtml(p.name)}</span>
              <span class="rsr-stats">
                <span class="stat-good">&#x2713; ${p.correct}</span>
                <span class="stat-bad">&#x2717; ${p.wrong}</span>
                <span>${accuracy}%</span>
                ${p.bestStreak >= 2 ? `<span>&#x1F525;${p.bestStreak}</span>` : ''}
              </span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="results-actions">
        <button class="btn-play-again" id="btn-play-again">Play Again</button>
        <button class="btn-quiet btn-share" id="btn-share">Share Result</button>
      </div>
    </div>
  `;

  sounds.playFanfare();
  if (!isTie || ranked[0].score > 0) spawnConfetti();

  document.getElementById('btn-play-again').addEventListener('click', () => {
    lastScreen = null;
    boardRevealDone = false;
    prevScores = [];
    prevLeader = null;
    resetForNewGame();
  });

  document.getElementById('btn-share').addEventListener('click', () => shareResult(ranked, isTie));
}

/** Copy a shareable summary of the game to the clipboard. */
function shareResult(ranked, isTie) {
  const medals = ['🥇', '🥈', '🥉'];
  const solo = ranked.length === 1;
  const lines = ranked.map((p, i) => `${medals[i] || '•'} ${p.name} — ${money(p.score)}`);
  const rank = solo ? soloRank(ranked[0], getState().gameLength) : null;
  const header = solo ? `${ranked[0].name} hit Rank ${rank.letter} (${rank.title}) on Ring In! ${rank.emoji}`
    : isTie ? "It's a tie on Ring In! 🔔" : `${ranked[0].name} won Ring In! 🔔`;
  const text = `${header}\n${lines.join('\n')}\n\nPlay: https://kellylucas314-cpu.github.io/Jeopardy/`;
  const done = () => showToast('📋 Result copied — go brag!', 'var(--brass)');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch { /* ignore */ }
  ta.remove();
}

function spawnConfetti() {
  const colors = ['#d8a85a', '#ecc578', '#34b88a', '#f3ead8', '#e2795c', '#5bb0b8'];
  const container = document.createElement('div');
  container.className = 'confetti-container';

  for (let i = 0; i < 120; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2.5 + Math.random() * 2.5}s`;
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.width = `${6 + Math.random() * 6}px`;
    piece.style.height = `${8 + Math.random() * 8}px`;
    container.appendChild(piece);
  }

  document.body.appendChild(container);
  setTimeout(() => container.remove(), 7000);
}

// ——— Helpers ———

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMoney(amount) {
  if (amount < 0) return '-' + Math.abs(amount).toLocaleString();
  return amount.toLocaleString();
}

/** Signed dollar amount with the $ inside the sign: "-$1,200", "$3,400". */
function money(amount) {
  return (amount < 0 ? '-$' : '$') + Math.abs(amount).toLocaleString();
}

// ——— Bootstrap ———
render();

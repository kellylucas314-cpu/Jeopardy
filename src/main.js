/**
 * Main entry — renders all screens based on game state.
 */

import { getState, setState, subscribe, resetForNewGame, loadPrefs, savePrefs } from './state.js';
import {
  startGame, selectClue, submitWager, submitAnswer, buzzIn, noBuzz,
  overrideCorrect, overrideFinalAnswer, returnToBoard, timeExpired,
  skipClue, startDoubleJeopardy, submitFinalWagers, submitFinalAnswers, showResults,
} from './engine.js';
import * as sounds from './sounds.js';

const app = document.getElementById('app');
let timerInterval = null;
let lastScreen = null;
let boardRevealDone = false;

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

  switch (state.screen) {
    case 'setup': renderSetup(); break;
    case 'loading': renderLoading(); break;
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
  const timerEl = document.getElementById('timer-bar');
  if (timerEl) timerEl.style.width = `${(Math.max(0, seconds) / total) * 100}%`;

  const timerText = document.getElementById('timer-text');
  if (timerText) timerText.textContent = seconds;
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
}

function handleTimeExpired() {
  const result = timeExpired();
  if (!result) return;

  showFeedback(`
    <div class="feedback-wrong">
      <div class="feedback-icon">&#x23F0;</div>
      <div>Time's up! -$${formatMoney(result.value)}</div>
      <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
    </div>
  `);
  setTimeout(() => { lastScreen = null; returnToBoard(); }, 3000);
}

// ——— Setup Screen ———

function renderSetup() {
  const prefs = loadPrefs();
  const savedNames = prefs.names || [];
  const playerCount = prefs.playerCount || 2;
  const gameMode = prefs.gameMode || 'turns';
  if (typeof prefs.sound === 'boolean') sounds.setEnabled(prefs.sound);

  app.innerHTML = `
    <div class="setup-screen">
      <div class="logo-container">
        <h1 class="logo">JEOPARDY!</h1>
        <div class="logo-subtitle">Game Night Edition</div>
      </div>
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
      </div>
    </div>
  `;

  renderPlayerInputs(playerCount, savedNames);
  updateModeVisibility(playerCount);

  // Player count buttons
  document.querySelectorAll('.btn-player-count').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-player-count').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const count = parseInt(btn.dataset.count);
      renderPlayerInputs(count, savedNames);
      updateModeVisibility(count);
    });
  });

  // Mode buttons
  document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Sound toggle
  document.getElementById('sound-checkbox').addEventListener('change', (e) => {
    sounds.setEnabled(e.target.checked);
    savePrefs({ sound: e.target.checked });
  });

  // Start button
  document.getElementById('btn-start-game').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.player-name-input');
    const names = Array.from(inputs).map((input, i) =>
      input.value.trim() || `Player ${i + 1}`
    );
    const mode = document.querySelector('.btn-mode.selected')?.dataset.mode || 'turns';
    savePrefs({ names, playerCount: names.length, gameMode: mode, sound: sounds.isEnabled() });
    sounds.playSelect();
    startGame(names, mode);
  });
}

function updateModeVisibility(count) {
  const section = document.getElementById('mode-section');
  if (section) section.style.display = count > 1 ? '' : 'none';
}

function renderPlayerInputs(count, savedNames = []) {
  const container = document.getElementById('player-names');
  let html = '';
  for (let i = 0; i < count; i++) {
    const value = savedNames[i] || `Player ${i + 1}`;
    html += `
      <div class="name-input-group">
        <label>Player ${i + 1}</label>
        <input type="text" class="player-name-input" placeholder="Enter name" value="${escapeHtml(value)}" data-index="${i}">
      </div>
    `;
  }
  container.innerHTML = html;
}

// ——— Loading Screen ———

function renderLoading() {
  app.innerHTML = `
    <div class="loading-screen">
      <div class="logo">JEOPARDY!</div>
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading clues...</div>
    </div>
  `;
}

// ——— Game Board ———

function renderBoard() {
  const { categories, players, activePlayer, round, cluesAnswered, totalClues, gameMode } = getState();
  const roundName = round === 1 ? 'Jeopardy!' : 'Double Jeopardy!';

  app.innerHTML = `
    <div class="board-screen">
      <div class="board-header">
        <div class="round-name">${roundName}</div>
        <div class="scoreboard">
          ${players.map((p, i) => `
            <div class="player-score ${i === activePlayer ? 'active' : ''}">
              <div class="player-name">${escapeHtml(p.name)}${p.streak >= 2 ? ` <span class="streak">&#x1F525;${p.streak}</span>` : ''}</div>
              <div class="player-amount ${p.score < 0 ? 'negative' : ''}">$${formatMoney(p.score)}</div>
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
        <div class="clues-remaining">
          ${totalClues - cluesAnswered} clues remaining
          ${gameMode === 'buzz' ? ` &nbsp;&middot;&nbsp; Buzzers: ${players.map((p, i) => `${escapeHtml(p.name)} = ${BUZZ_KEYS[i].toUpperCase()}`).join(' &middot; ')}` : ''}
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

  // Clue click handlers
  document.querySelectorAll('.board-clue:not(.answered)').forEach(el => {
    el.addEventListener('click', () => {
      const ci = parseInt(el.dataset.cat);
      const cli = parseInt(el.dataset.clue);
      selectClue(ci, cli);
    });
  });

  // Category intro sequence (once per round)
  if (getState().showCategoryIntro) {
    getState().showCategoryIntro = false; // consume without re-render
    playCategoryIntro(categories);
  }
}

function playCategoryIntro(categories) {
  const overlay = document.createElement('div');
  overlay.className = 'category-intro';
  overlay.innerHTML = `
    <div class="ci-label">The categories are...</div>
    <div class="ci-name" id="ci-name"></div>
    <div class="ci-skip">tap to skip</div>
  `;
  app.appendChild(overlay);

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
      <div class="clue-feedback" id="clue-feedback"></div>
    </div>
  `;
}

function showFeedback(html) {
  const feedback = document.getElementById('clue-feedback');
  if (!feedback) return;
  feedback.innerHTML = html;
  feedback.classList.add('show');
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

  if (result.correct) {
    showFeedback(`
      <div class="feedback-correct">
        <div class="feedback-icon">&#x2713;</div>
        <div>Correct! +$${formatMoney(result.value)}</div>
      </div>
    `);
    setTimeout(() => { lastScreen = null; returnToBoard(); }, 2000);
  } else {
    showFeedback(`
      <div class="feedback-wrong">
        <div class="feedback-icon">&#x2717;</div>
        <div>Incorrect! -$${formatMoney(result.value)}</div>
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
    </div>
  `);
  setTimeout(() => { lastScreen = null; returnToBoard(); }, 1800);
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
  setTimeout(() => { lastScreen = null; returnToBoard(); }, 2500);
}

// — Buzz mode —

function renderBuzzClue() {
  const { currentClue } = getState();

  app.innerHTML = clueShell(`
    <div class="buzz-status" id="buzz-status">Read the clue&hellip;</div>
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

  // Reading time scales with clue length, then the buzzers open
  const readingMs = Math.min(1500 + currentClue.clue.length * 25, 6000);
  buzzTimeouts.push(setTimeout(openBuzzers, readingMs));
}

function renderBuzzerRow() {
  const { players, buzzAttempted } = getState();
  const row = document.getElementById('buzzer-row');
  if (!row) return;

  row.innerHTML = players.map((p, i) => `
    <button class="btn-buzzer ${buzzAttempted[i] ? 'out' : ''}" data-player="${i}" ${buzzAttempted[i] ? 'disabled' : ''}>
      <span class="buzzer-name">${escapeHtml(p.name)}</span>
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
    `<span class="buzzed-flash">${escapeHtml(players[playerIndex].name)} buzzed in!</span>`;

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

  if (result.correct) {
    buzzPhase = 'done';
    showFeedback(`
      <div class="feedback-correct">
        <div class="feedback-icon">&#x2713;</div>
        <div>Correct! +$${formatMoney(result.value)}</div>
      </div>
    `);
    setTimeout(() => { lastScreen = null; returnToBoard(); }, 2000);
    return;
  }

  // Wrong (or silent) — maybe others can still steal it
  const header = timedOut
    ? `<div class="feedback-icon">&#x23F0;</div><div>Time's up! -$${formatMoney(result.value)}</div>`
    : `<div class="feedback-icon">&#x2717;</div><div>Incorrect! -$${formatMoney(result.value)}</div>`;

  if (result.canRebuzz) {
    showFeedback(`
      <div class="feedback-wrong">
        ${header}
        <div class="correct-response">${result.remaining} player${result.remaining > 1 ? 's' : ''} can steal!</div>
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
      <div>No takers!</div>
      <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
    </div>
  `);
  setTimeout(() => { lastScreen = null; returnToBoard(); }, 2500);
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

  app.innerHTML = `
    <div class="transition-screen">
      <div class="transition-scores">
        <h3>End of Jeopardy! Round</h3>
        ${players.map(p => `
          <div class="transition-player">
            <span>${escapeHtml(p.name)}</span>
            <span class="${p.score < 0 ? 'negative' : ''}">$${formatMoney(p.score)}</span>
          </div>
        `).join('')}
      </div>
      <div class="transition-title">Double Jeopardy!</div>
      <div class="transition-subtitle">Values are doubled!</div>
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
      <div class="final-header">Final Jeopardy!</div>
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

function renderFinalWager() {
  const { players } = getState();

  app.innerHTML = `
    <div class="final-screen">
      <div class="final-header">Final Jeopardy!</div>
      <div class="final-subtitle">Place your wagers</div>
      <div class="final-wager-form">
        ${players.map((p, i) => {
          const maxW = Math.max(0, p.score);
          return `
            <div class="final-wager-player">
              <div class="fwp-name">${escapeHtml(p.name)} — $${formatMoney(p.score)}</div>
              <div class="wager-input-row">
                <span class="wager-dollar">$</span>
                <input type="number" class="wager-input final-wager-input"
                       data-player="${i}" min="0" max="${maxW}"
                       value="${Math.min(1000, maxW)}" ${p.score <= 0 ? 'disabled value="0"' : ''}>
              </div>
              ${p.score <= 0 ? '<div class="wager-note">Cannot wager with $0 or less</div>' : `<div class="wager-range">$0 to $${formatMoney(maxW)}</div>`}
            </div>
          `;
        }).join('')}
        <button class="btn-wager-submit" id="btn-final-wagers-submit">Lock In All Wagers</button>
      </div>
    </div>
  `;

  document.getElementById('btn-final-wagers-submit').addEventListener('click', () => {
    const wagers = Array.from(document.querySelectorAll('.final-wager-input')).map((input, i) => {
      const max = Math.max(0, players[i].score);
      let val = parseInt(input.value) || 0;
      return Math.max(0, Math.min(val, max));
    });
    submitFinalWagers(wagers);
  });
}

function renderFinalClue() {
  const { finalClue, players } = getState();

  app.innerHTML = `
    <div class="final-screen">
      <div class="final-header">Final Jeopardy!</div>
      <div class="final-category-name small">${escapeHtml(finalClue.name)}</div>
      <div class="final-clue-text">${escapeHtml(finalClue.clue)}</div>
      <div class="final-answer-form">
        ${players.map((p, i) => `
          <div class="final-answer-player">
            <label>${escapeHtml(p.name)}</label>
            <input type="text" class="answer-input final-answer-input"
                   data-player="${i}" placeholder="What is..."
                   ${p.score <= 0 && getState().finalWagers[i] === 0 ? 'disabled placeholder="No wager"' : ''}>
          </div>
        `).join('')}
        <button class="btn-submit" id="btn-final-answers">Reveal Answers</button>
      </div>
      <div class="think-music-note">&#9835; Think music playing...</div>
    </div>
  `;

  document.getElementById('btn-final-answers').addEventListener('click', () => {
    const answers = Array.from(document.querySelectorAll('.final-answer-input')).map(
      input => input.value.trim()
    );
    submitFinalAnswers(answers);
  });
}

function renderFinalAnswer() {
  const { finalClue, finalAnswers, finalWagers, players } = getState();

  app.innerHTML = `
    <div class="final-screen">
      <div class="final-header">Final Jeopardy!</div>
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

function renderResults() {
  const { players } = getState();
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isTie = sorted.length > 1 && sorted[0].score === sorted[1].score;

  app.innerHTML = `
    <div class="results-screen">
      <div class="results-crown">&#x1F3C6;</div>
      <div class="results-title">${isTie ? "It's a Tie!" : `${escapeHtml(winner.name)} Wins!`}</div>
      <div class="results-scores">
        ${sorted.map((p, i) => {
          const attempts = p.correct + p.wrong;
          const accuracy = attempts > 0 ? Math.round((p.correct / attempts) * 100) : 0;
          return `
            <div class="result-player ${i === 0 ? 'winner' : ''}">
              <div class="result-main">
                <div class="result-rank">${i === 0 ? '&#x1F947;' : i === 1 ? '&#x1F948;' : '&#x1F949;'}</div>
                <div class="result-name">${escapeHtml(p.name)}</div>
                <div class="result-score ${p.score < 0 ? 'negative' : ''}">$${formatMoney(p.score)}</div>
              </div>
              <div class="result-stats">
                <span class="stat-good">&#x2713; ${p.correct}</span>
                <span class="stat-bad">&#x2717; ${p.wrong}</span>
                <span>${accuracy}% accuracy</span>
                ${p.bestStreak >= 2 ? `<span>&#x1F525; best streak ${p.bestStreak}</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn-play-again" id="btn-play-again">Play Again</button>
    </div>
  `;

  sounds.playFanfare();
  if (!isTie || sorted[0].score > 0) spawnConfetti();

  document.getElementById('btn-play-again').addEventListener('click', () => {
    lastScreen = null;
    boardRevealDone = false;
    resetForNewGame();
  });
}

function spawnConfetti() {
  const colors = ['#d4a843', '#f4d03f', '#060ce9', '#ffffff', '#4caf50', '#ff6b9d'];
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

// ——— Bootstrap ———
render();

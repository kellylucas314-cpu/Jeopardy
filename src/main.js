/**
 * Main entry — renders all screens based on game state.
 */

import { getState, setState, subscribe, resetForNewGame } from './state.js';
import {
  startGame, selectClue, submitWager, submitAnswer,
  returnToBoard, timeExpired, skipClue, startDoubleJeopardy,
  submitFinalWagers, submitFinalAnswers, showResults,
} from './engine.js';
import * as sounds from './sounds.js';

const app = document.getElementById('app');
let timerInterval = null;
let lastScreen = null;
let boardRevealDone = false;

// ——— Screen Router ———

function render() {
  const state = getState();

  // Avoid re-rendering when only the timer ticked (no screen change)
  if (state.screen === lastScreen && state.screen === 'clue') return;
  lastScreen = state.screen;

  // Stop any running timer when leaving the clue screen
  if (state.screen !== 'clue') stopTimer();

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

function startTimer() {
  clearInterval(timerInterval);
  let seconds = 30;

  timerInterval = setInterval(() => {
    seconds--;

    if (seconds <= 5 && seconds > 0) sounds.playTick();

    const timerEl = document.getElementById('timer-bar');
    if (timerEl) timerEl.style.width = `${(seconds / 30) * 100}%`;

    const timerText = document.getElementById('timer-text');
    if (timerText) timerText.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(timerInterval);
      handleTimeExpired();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  setState({ timerRunning: false });
}

function handleTimeExpired() {
  const result = timeExpired();
  if (!result) return;

  const feedback = document.getElementById('clue-feedback');
  if (feedback) {
    feedback.innerHTML = `
      <div class="feedback-wrong">
        <div class="feedback-icon">&#x23F0;</div>
        <div>Time's up!</div>
        <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
      </div>
    `;
    feedback.classList.add('show');
  }
  setTimeout(() => { lastScreen = null; returnToBoard(); }, 3000);
}

// ——— Setup Screen ———

function renderSetup() {
  app.innerHTML = `
    <div class="setup-screen">
      <div class="logo-container">
        <h1 class="logo">JEOPARDY!</h1>
        <div class="logo-subtitle">Game Night Edition</div>
      </div>
      <div class="setup-card">
        <h2>How many players?</h2>
        <div class="player-count-buttons">
          <button class="btn-player-count" data-count="1">1 Player</button>
          <button class="btn-player-count selected" data-count="2">2 Players</button>
          <button class="btn-player-count" data-count="3">3 Players</button>
        </div>
        <div id="player-names">
          <div class="name-input-group">
            <label>Player 1</label>
            <input type="text" class="player-name-input" placeholder="Enter name" value="Player 1" data-index="0">
          </div>
          <div class="name-input-group">
            <label>Player 2</label>
            <input type="text" class="player-name-input" placeholder="Enter name" value="Player 2" data-index="1">
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

  // Player count buttons
  document.querySelectorAll('.btn-player-count').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-player-count').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const count = parseInt(btn.dataset.count);
      renderPlayerInputs(count);
    });
  });

  // Sound toggle
  document.getElementById('sound-checkbox').addEventListener('change', (e) => {
    sounds.setEnabled(e.target.checked);
  });

  // Start button
  document.getElementById('btn-start-game').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.player-name-input');
    const names = Array.from(inputs).map((input, i) =>
      input.value.trim() || `Player ${i + 1}`
    );
    sounds.playSelect();
    startGame(names);
  });
}

function renderPlayerInputs(count) {
  const container = document.getElementById('player-names');
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="name-input-group">
        <label>Player ${i + 1}</label>
        <input type="text" class="player-name-input" placeholder="Enter name" value="Player ${i + 1}" data-index="${i}">
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
  const { categories, players, activePlayer, round, cluesAnswered, totalClues } = getState();
  const roundName = round === 1 ? 'Jeopardy!' : 'Double Jeopardy!';

  app.innerHTML = `
    <div class="board-screen">
      <div class="board-header">
        <div class="round-name">${roundName}</div>
        <div class="scoreboard">
          ${players.map((p, i) => `
            <div class="player-score ${i === activePlayer ? 'active' : ''}">
              <div class="player-name">${escapeHtml(p.name)}</div>
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
        <div class="clues-remaining">${totalClues - cluesAnswered} clues remaining</div>
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
}

// ——— Clue Screen ———

function renderClue() {
  const { currentClue, players, activePlayer } = getState();
  if (!currentClue) return;

  const isDailyDouble = currentClue.isDailyDouble;
  const displayValue = isDailyDouble ? getState().wagerAmount : currentClue.value;

  app.innerHTML = `
    <div class="clue-screen">
      <div class="clue-header">
        <span class="clue-category">${escapeHtml(currentClue.categoryName)}</span>
        <span class="clue-value">${isDailyDouble ? 'DD ' : ''}$${formatMoney(displayValue)}</span>
      </div>
      <div class="clue-timer">
        <div class="timer-bar-bg">
          <div class="timer-bar" id="timer-bar"></div>
        </div>
        <span class="timer-text" id="timer-text">30</span>
      </div>
      <div class="clue-text">${escapeHtml(currentClue.clue)}</div>
      <div class="clue-player">
        ${players.length > 1 ? `<span>${escapeHtml(players[activePlayer].name)}'s turn</span>` : ''}
      </div>
      <div class="clue-answer-area">
        <input type="text" id="answer-input" class="answer-input"
               placeholder="What is..." autocomplete="off">
        <div class="clue-buttons">
          <button class="btn-submit" id="btn-submit">Submit</button>
          <button class="btn-skip" id="btn-skip">Pass</button>
        </div>
      </div>
      <div class="clue-feedback" id="clue-feedback"></div>
    </div>
  `;

  startTimer();

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

  const feedback = document.getElementById('clue-feedback');
  if (result.correct) {
    feedback.innerHTML = `
      <div class="feedback-correct">
        <div class="feedback-icon">&#x2713;</div>
        <div>Correct! +$${formatMoney(result.value)}</div>
      </div>
    `;
  } else {
    feedback.innerHTML = `
      <div class="feedback-wrong">
        <div class="feedback-icon">&#x2717;</div>
        <div>Incorrect! -$${formatMoney(result.value)}</div>
        <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
      </div>
    `;
  }
  feedback.classList.add('show');

  setTimeout(() => { lastScreen = null; returnToBoard(); }, result.correct ? 2000 : 3000);
}

function handleSkip() {
  stopTimer();
  const result = skipClue();
  if (!result) return;

  const feedback = document.getElementById('clue-feedback');
  feedback.innerHTML = `
    <div class="feedback-skip">
      <div>Passed</div>
      <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
    </div>
  `;
  feedback.classList.add('show');

  setTimeout(() => { lastScreen = null; returnToBoard(); }, 2500);
}

// ——— Daily Double ———

function renderDailyDouble() {
  const { currentClue, players, activePlayer } = getState();
  const player = players[activePlayer];
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
          </div>
        `).join('')}
      </div>
      <button class="btn-continue" id="btn-show-results">Final Scores</button>
    </div>
  `;

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
        ${sorted.map((p, i) => `
          <div class="result-player ${i === 0 ? 'winner' : ''}">
            <div class="result-rank">${i === 0 ? '&#x1F947;' : i === 1 ? '&#x1F948;' : '&#x1F949;'}</div>
            <div class="result-name">${escapeHtml(p.name)}</div>
            <div class="result-score ${p.score < 0 ? 'negative' : ''}">$${formatMoney(p.score)}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn-play-again" id="btn-play-again">Play Again</button>
    </div>
  `;

  sounds.playFanfare();

  document.getElementById('btn-play-again').addEventListener('click', () => {
    lastScreen = null;
    boardRevealDone = false;
    resetForNewGame();
  });
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

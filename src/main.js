/**
 * Main entry — renders all screens based on game state.
 */


import { getState, setState, subscribe, resetForNewGame, loadPrefs, savePrefs, loadRecords, recordGame } from './state.js';
import {
  startGame, beginChapter, selectClue, submitWager, submitAnswer, buzzIn, noBuzz,
  overrideCorrect, overrideFinalAnswer, returnToBoard, timeExpired,
  skipClue, startDoubleJeopardy, submitFinalWagers, submitFinalAnswers, showResults, rerollBoard,
  LEGION_CLUES,
} from './engine.js';
import {
  loadCampaign, loadProgress, resetProgress, getChapter, chapterCount, chapterTarget,
  chapterTimer, tierLabel, empireHoldings, empireLosses, empireMax, statusLabel,
} from './campaign.js';
import * as sounds from './sounds.js';
import { loadCharacters, characters, characterById, portraitUrl, poseUrl } from './characters.js';
import * as music from './music.js';
import { shape, compassLoader } from './shapes.js';
import { animate, stagger } from 'motion';
import 'number-flow';
import { hostFigure, hostReact, hostSay, hostMove, hostCarry, isLive, poseSrc, faceSrc, bustSrc, setFace, preloadHost, preloadFilms, preloadLive, playFilm } from './host.js';
import { empireMap, statusMark, pointAt } from './empire.js';

loadCharacters();

// Dev-only handle for screenshots and debugging; stripped from production builds.
if (import.meta.env.DEV) window.__cde = { getState, setState, music, empire: async n => { await loadCampaign(); showEmpire(getChapter(n)); } };

const app = document.getElementById('app');
let timerInterval = null;
let lastScreen = null;
let boardRevealDone = false;

// Player identity
const PLAYER_COLORS = ['var(--p0)', 'var(--p1)', 'var(--p2)'];
const ICONS = { check: 'check', cross: 'x', clock: 'clock' };
function icon(name, cls = '') {
  return `<i class="ph ph-${ICONS[name]} icon ${cls}" aria-hidden="true"></i>`;
}

const ROMAN = ['I', 'II', 'III'];

/** A player's mark is their initial, struck like a monogram on a seal. */
function monogram(name, i = 0) {
  const trimmed = (name || '').trim();
  // Unnamed players get a numeral rather than a row of identical "P"s
  if (!trimmed || /^Player\s*\d*$/i.test(trimmed)) return ROMAN[i] || String(i + 1);
  const ch = trimmed.match(/[\p{L}\p{N}]/u);
  return ch ? ch[0].toUpperCase() : ROMAN[i] || String(i + 1);
}

/** A player's face: their character's portrait when they picked one, else the monogram seal. */
function avatarHtml(p, i = 0) {
  const url = portraitUrl(p.character);
  return url
    ? `<img class="avatar-portrait" src="${url}" alt="">`
    : escapeHtml(p.avatar || monogram(p.name, i));
}

/** A remark from the table. Napoleon's own lines carry his face (in the mood of the moment); anyone else's carry their name. */
function hostLine(text, by = 'Napoleon', mood = 'neutral') {
  const his = /^(Napoleon|The Emperor)/.test(by);
  const credit = by === 'Napoleon' ? '' : `<span class="host-attrib">${escapeHtml(by)}</span>`;
  return `<figure class="host-line${his ? ' is-napoleon' : ''}">
      ${his ? `<img class="host-face" src="${faceSrc(mood)}" alt="Napoleon">` : ''}
      <figcaption><span class="host-words">${escapeHtml(text)}</span>${credit}</figcaption>
    </figure>`;
}

/** Napoleon standing at the right of an in-between screen (wide screens only). */
function stageHost(pose, say = false) {
  return hostFigure(pose, 'stage-host', { say });
}

/** Map pieces behind an in-between screen: a compass rose, the Légion star, a route, a facet. */
const SCENES = {
  chapter: [['compass', 'sc-brass sc-tr'], ['route', 'sc-terra sc-bl']],
  wager: [['star', 'sc-terra sc-tl'], ['compass', 'sc-brass sc-br']],
  round: [['compass', 'sc-brass sc-tl'], ['facet', 'sc-jade sc-br']],
  final: [['star', 'sc-terra sc-tr'], ['route', 'sc-brass sc-bl']],
  results: [['facet', 'sc-jade sc-tl'], ['star', 'sc-brass sc-br']],
  loading: [['compass', 'sc-brass sc-br']],
  clue: [],
};
function sceneShapes(name) {
  return `<div class="scene-shapes" aria-hidden="true">${(SCENES[name] || []).map(([sh, c]) => shape(sh, c)).join('')}</div>`;
}

// The table's character picks on setup, kept across player-count changes.
const DEFAULT_CHARACTERS = ['cleopatra', 'leonardo-da-vinci', 'marie-curie'];
let setupCharacters = null;
// Which half of the start is showing: the title (Napoleon and Play) or the table (who is playing)
let setupStep = 'title';
let prevScores = []; // for score-bump animation on the board
let prevLeader = null; // for lead-change announcements

// Personality — the game reacts like a host, not a spreadsheet
// The Emperor's table talk — witty, dry, confident, lightly theatrical.
const CORRECT_LINES = [
  'The Emperor accepts this answer.',
  'A triumph worthy of the Grande Armée.',
  'Précisément. Take the spoils.',
  'History favors the prepared.',
  'A conquest, cleanly executed.',
  'The Emperor is… impressed.',
  'Vive la victoire!',
  'Correct. I am almost surprised.',
  'Exactement.',
  'You may keep your head. And the points.',
  'Well struck.',
  'That is how one takes a hill.',
  'I would have said the same. Naturally.',
  'Correct. Do not let it go to your head.',
  'A clean victory. I allow it.',
  'Bien joué.',
  'The field is yours.',
  'So you do read. Good.',
  'There is a marshal’s baton in your knapsack.',
  'Correct. France is pleased.',
  'Even Talleyrand could not twist that one.',
  'Add it to the treasury.',
  'Magnifique. Carry on.',
  'An answer with good posture.',
  'Right. I expected less, frankly.',
  'Victory. Small, but I collect those too.',
  'You have studied. It shows.',
  'Correct. Josephine would be charmed.',
  'The Emperor nods. That is rare.',
  'Flawless. Suspiciously so.',
  'Take the points. You earned them.',
  'Oui. Next.',
];
const WRONG_LINES = [
  'A tactical retreat.',
  'The Emperor regrets to decline.',
  'Not even my cavalry could save that one.',
  'Bold. Doomed, but bold.',
  'We shall not speak of this again.',
  'Every campaign has its setbacks.',
  'No. But said with confidence.',
  'Wrong. Magnificently wrong.',
  'My horse Marengo would have known that.',
  'A fine answer. To a different question.',
  'Non.',
  'I admire the courage. Only the courage.',
  'That answer has been exiled.',
  'Close. The way Moscow is close to Paris.',
  'History will be kind and forget this.',
  'A brave charge into the wrong valley.',
  'Incorrect. I say this with affection.',
  'The Emperor winces.',
  'You marched north. The answer was south.',
  'Alas. The points desert you.',
  'Wrong. I once misjudged a winter myself.',
  'That is not it. Onward.',
  'I shall pretend I did not hear that.',
  'A loss. I have survived worse.',
  'Not today, general.',
  'An answer only a Bourbon could love.',
  'Mon Dieu.',
  'The treasury takes back its coins.',
  'Wellington sends his thanks.',
  'That one goes in the memoirs. As a warning.',
  'Strike that from the record.',
  'Nearly. In the loosest sense of nearly.',
  'Confidence is not the same as accuracy.',
  'Even emperors miss. Rarely, in my case.',
];
const TIMEOUT_LINES = [
  'Time waits for no emperor.',
  'The clock has outflanked you.',
  'Hesitation, the one enemy I never forgave.',
  'The clock wins. It usually does.',
  'Too slow. Armies starve at that pace.',
  'Ask me for anything but time.',
  'The moment has marched on without you.',
  'You were still thinking. The clock was not.',
  'Late. So was Grouchy at Waterloo.',
  'A fine silence. A costly one.',
  'The sand has run out, general.',
  'Speed wins wars. Remember that.',
];
const NOBUZZ_LINES = [
  'No volunteers? Cowardice.',
  'The salon falls silent…',
  'Even my old guard would not charge at this one.',
  'Very well. The board keeps its secret.',
  'Nobody? I am surrounded by diplomats.',
  'Not one of you. Remarkable.',
  'The clue retires undefeated.',
];
const STEAL_LINES = [
  'The spoils lie unclaimed!',
  'An open flank. Who will take it?',
  'Seize it, or regret it.',
  'The prize is on the table. Take it.',
  'Their loss. Perhaps your gain.',
];
const BOARD_LINES = [
  'Choose your battlefield.',
  'The board awaits your command.',
  'Pick your ground. History is watching.',
  'Retreat is unavailable. Pick a category.',
  'Every square hides a small war.',
  'Where shall we march next?',
  'Name your ground, general.',
  'The map is open. Choose.',
  'I am waiting. I do not do that well.',
  'Pick boldly. I will judge quietly.',
];

const STREAK_LINES = {
  2: ['Twice in a row. A pattern forms.', 'Two for two. Continue.', 'Two. Do not get comfortable.', 'Twice. Luck, or the start of something.'],
  3: ['Three in a row. Now you are dangerous.', 'Three. The enemy begins to worry.', 'Three. I begin to take notes.', 'Three straight. The line holds.'],
  4: ['Four. They are in full retreat.', 'Four in a row. Keep marching.', 'Four. Who taught you this?', 'Four in a row. Europe trembles.'],
  5: ['Five in a row. I have made marshals for less.', 'Unstoppable. I know the feeling.', 'Five. Shall I fetch you a crown?', 'This is becoming an empire.'],
};
const FAST_LINES = [
  'Before I had finished the sentence.',
  'Quick as a cavalry charge.',
  'No hesitation. Good.',
  'Faster than a courier from Paris.',
  'Instant. I like a decisive mind.',
  'You did not even blink.',
  'Swift. The best victories are.',
];
const STREAK_BROKEN_LINES = [
  'And there the advance ends.',
  'Every great march meets its winter.',
  'The run ends. They always do.',
  'A fine streak, now a memory.',
  'So. You are mortal after all.',
];
const WAGER_WON_LINES = [
  'A wager won. That is how empires are made.',
  'Fortune favors the bold. Today.',
  'You bet like an emperor. And won.',
  'The gamble pays. Remember this feeling.',
  'A bold stake, handsomely repaid.',
];
const WAGER_LOST_LINES = [
  'Waterloo. I know the feeling.',
  'A bold wager. A costly one.',
  'You bet the army and lost the army.',
  'The dice were not with you.',
  'An expensive lesson. I have had several.',
];
const BIG_PICK_LINES = [
  'The heavy guns. Good.',
  'Straight for the big prize.',
  'Ambitious. I approve.',
  'The top of the hill. Naturally.',
  'No small skirmishes for you.',
];
const LAST_CLUE_LINES = [
  'The last square. Make it count.',
  'One left. Finish it.',
  'The final square. End it well.',
];
const PASS_LINES = [
  'A strategic withdrawal. Noted.',
  'You decline the field. Very well.',
  'Discretion. I have heard of it.',
  'Silence. The safest answer of all.',
  'A wise general knows which hill to skip.',
  'You keep your powder dry. Fine.',
  'No shot fired, no points lost.',
  'Retreat in good order. I respect it.',
  'Prudence. How very unlike me.',
  'We march around this one.',
  'You live to fight another clue.',
  'Not every battle must be fought.',
  'A shrug. I have seen diplomats do worse.',
  'Very well. The clue wins this round.',
  'Passing. My ministers would be proud.',
  'Caution today, glory tomorrow.',
];
const URGENT_LINES = [
  'Tick, tock.',
  'Decide, general.',
  'The clock is not your ally.',
  'Any moment now.',
  'The drums are getting louder.',
  'Now, general.',
  'Seconds, not minutes.',
];
const AFTER_CORRECT = [
  'Good. Press the advantage.',
  'Momentum, general. Use it.',
  'Again. Just like that.',
  'You hold the field. Choose the next.',
  'Keep the pressure on.',
  'They are wavering. Go on.',
  'Good. Now do it again.',
];
const AFTER_WRONG = [
  'Regroup. Choose again.',
  'A setback. The campaign continues.',
  'Shake it off. Pick your ground.',
  'Forget it. Next square.',
  'Reform the line. Pick again.',
  'One lost skirmish. Choose.',
  'On to the next. Chin up.',
];

/** His opening remark on each chapter's board, in campaign mode. */
const CHAPTER_LINES = {
  1: 'A small island, a large appetite. Begin.',
  2: 'Give me the guns and the high ground. You take the clues.',
  3: 'Paris is restless tonight. Be quick and be certain.',
  4: 'Italy lies ahead. March fast and answer faster.',
  5: 'Forty centuries look down upon you. Do not embarrass them.',
  6: 'A government falls in two days. A board falls faster.',
  7: 'Marengo was lost in the afternoon and won by evening. Never concede early.',
  8: 'I placed the crown on my own head. Take your points the same way.',
  9: 'The sun is rising over Austerlitz. Make it a good day.',
  10: 'Prussia lasted a single afternoon. Let us see how long you last.',
  11: 'An empire at its height has the most to lose. Choose with care.',
  12: 'Moscow is a long walk, and the way back is longer.',
  13: 'All of Europe is on the field against us. Hold your ground.',
  14: 'A hundred days. Waste none of them.',
  15: 'On this rock I have only memory. Let us see how yours holds up.',
};

/** How he takes each outcome: a pose and a move for the big figure, a face for the small one. */
const REACTIONS = {
  correct: { poses: ['victory'], face: 'delighted', move: 'hop', films: ['pleased', 'nod'], big: 'fist', bust: ['face-smirk', 'face-nod'], bigBust: 'face-grin' },
  wrong: { poses: ['stepping-back', 'shocked', 'defeated'], face: 'frustrated', move: 'recoil', films: ['shrug', 'brace'], big: 'yell', bust: ['face-startled', 'face-shock'] },
  timeout: { poses: ['arms-crossed'], face: 'annoyed', move: 'refuse', films: ['stomp'], bust: 'face-stern' },
  pass: { poses: ['shrug'], face: 'puzzled', move: 'settle', films: ['ponder'], bust: 'face-brow' },
  pardon: { poses: ['welcome'], face: 'smirk', move: 'settle', bust: 'face-smirk' },
};
let lastOutcome = null; // how the last clue went, for his stance back at the board
let stanceTurn = 0; // so a late 'back to pointing' never lands on a newer board
let lastPicked = null; // the tile just played, so the board can show it being spent
let clueShownAt = 0; // to notice a quick answer

const MONEY_FMT = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };
const EXPO = [0.16, 1, 0.3, 1];

// Each list is dealt like a deck: nothing comes round again until the rest of the list has
// been used, and a fresh deal never opens with the line just heard. The decks last for the
// visit, so a second game does not start over on the same remarks.
const decks = new Map();
function pick(arr) {
  if (arr.length < 2) return arr[0];
  let deck = decks.get(arr);
  if (!deck || !deck.left.length) {
    const left = arr.slice();
    for (let i = left.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [left[i], left[j]] = [left[j], left[i]];
    }
    // the next one out is the end of the array: keep the line just heard away from it
    if (deck && left[left.length - 1] === deck.last) [left[0], left[left.length - 1]] = [left[left.length - 1], left[0]];
    deck = { left, last: deck && deck.last };
    decks.set(arr, deck);
  }
  deck.last = deck.left.pop();
  return deck.last;
}

/**
 * Napoleon's verdict on an answer. On a wide screen the big figure takes the
 * pose and speaks the line; on a phone his face and the line sit in the feedback.
 */
function verdict(kind, line, { big = false } = {}) {
  const r = REACTIONS[kind];
  const pose = pick(r.poses);
  lastOutcome = kind === 'pardon' ? 'correct' : kind;
  // One of Kelly's reaction clips where there is one: the whole of him on a wide screen,
  // his face in the verdict picture on a phone. The still pose is the fallback for both.
  const film = (big && r.big) || (r.films && pick(r.films));
  const bust = (big && r.bigBust) || (Array.isArray(r.bust) ? pick(r.bust) : r.bust);
  hostReact(pose, { move: r.move, say: line, film });
  if (kind === 'correct' || kind === 'pardon') navigator.vibrate?.(18);
  else if (kind === 'wrong' || kind === 'timeout') navigator.vibrate?.([36, 50, 36]);
  return `<figure class="verdict">
      ${verdictFig(bust, pose, r.move)}
      <figcaption>${escapeHtml(line)}</figcaption>
    </figure>`;
}

/**
 * The small picture beside his verdict on a phone. Where films play it is his head and
 * shoulders from one of the face clips, which then plays in place (`play`); otherwise it
 * is the top of a cut-out pose, which makes one short move.
 */
function verdictFig(bust, pose, move, play = true) {
  return isLive() && bust
    ? `<span class="verdict-fig is-bust"${play ? ` data-film="${bust}"` : ''}><img src="${bustSrc(bust)}" alt=""></span>`
    : `<span class="verdict-fig" data-move="${move}"><img src="${poseSrc(pose)}" alt=""></span>`;
}

/**
 * After a right answer the card still says what the answer was, small: a loose spelling can be
 * accepted, and the player should see the proper one (Kelly, Nov 11 2026).
 */
function answerKey(result) {
  return result.correctResponse
    ? `<div class="answer-key">Answer: <strong>${escapeHtml(result.correctResponse)}</strong></div>`
    : '';
}

/** The line for a right answer: he notices a streak, a quick answer, a wager won. */
function correctLine(result, { wager = false, seconds = 99 } = {}) {
  if (wager) return pick(WAGER_WON_LINES);
  // he calls out a run as it builds; past five in a row he mentions it only now and then,
  // and a quick answer is remarked on some of the time, so neither becomes the only thing he says
  if (result.streak >= 2 && (result.streak <= 5 || Math.random() < 0.3)) return pick(STREAK_LINES[Math.min(result.streak, 5)]);
  if (seconds < 6 && Math.random() < 0.4) return pick(FAST_LINES);
  return pick(CORRECT_LINES);
}
/** ...and for a wrong one: a lost wager, or a good run cut short. */
function wrongLine({ wager = false, streakBefore = 0 } = {}) {
  if (wager) return pick(WAGER_LOST_LINES);
  if (streakBefore >= 3) return pick(STREAK_BROKEN_LINES);
  return pick(WRONG_LINES);
}

/** Fill every <number-flow data-to> on screen. One that carries data-from rolls up (or down) from there. */
function flowNumbers(delay = 320) {
  app.querySelectorAll('number-flow[data-to]').forEach(el => {
    el.format = MONEY_FMT;
    el.locales = 'en-US';
    const to = Number(el.dataset.to);
    const from = el.dataset.from === undefined ? to : Number(el.dataset.from);
    if (from === to || prefersReducedMotion()) { el.update(to); return; }
    el.update(from);
    setTimeout(() => { if (el.isConnected) el.update(to); }, delay);
  });
}
const flowMoney = (to, from) => `<number-flow data-to="${to}"${from === undefined ? '' : ` data-from="${from}"`} aria-label="${money(to)}"></number-flow>`;

/** Break a long word where a reader would: between syllables, so a narrow column never splits it mid-letter. */
function softHyphenate(text) {
  return text.replace(/[A-Za-zÀ-ÿ]{6,}/g, (word) => {
    const cluster = /^(th|ch|sh|ph|wh|qu|ck)/i;
    const vowel = c => /[aeiouyà-ÿ]/i.test(c);
    // Three or more consonants between vowels (pass|ports, high|lights, amend|ment): break near
    // the middle of the run, never inside a pair that is read as one sound (an|thems, chil|dren).
    const extra = new Set();
    const blends = new Set();
    const stop = c => /[bcdfgkpt]/i.test(c);
    for (let s = 1; s < word.length; s++) {
      if (vowel(word[s]) || !vowel(word[s - 1])) continue;
      let e = s;
      while (e + 1 < word.length && !vowel(word[e + 1])) e++;
      const n = e - s + 1;
      if (n >= 3 && e + 1 < word.length) {
        let k = s + (n === 3 ? 2 : Math.ceil(n / 2));
        if (cluster.test(word[k - 1] + word[k]) || (n === 3 && stop(word[k - 1]) && /[lr]/i.test(word[k]))) k -= 1;
        if (k >= 3 && word.length - k >= 3) extra.add(k - 1);
      } else if (n === 2 && e + 1 < word.length && stop(word[s]) && /[lr]/i.test(word[e])) {
        // a blend stays whole: play|ground, se|cret
        blends.add(s);
        if (s >= 3 && word.length - s >= 3) extra.add(s - 1);
      }
      s = e;
    }
    let out = '';
    for (let i = 0; i < word.length; i++) {
      out += word[i];
      const left = i + 1, rest = word.length - left;
      if (left < 3 || rest < 3) continue;
      const a = word[i], b = word[i + 1], c = word[i + 2];
      const vcv = vowel(a) && !vowel(b) && vowel(c);                     // ta|ble: V|CV
      const vccv = !vowel(a) && !vowel(b) && vowel(c) && vowel(word[i - 1]) && !cluster.test(a + b) && !blends.has(i); // VC|CV
      const beforeCluster = cluster.test(b + c) && rest >= 4 && vowel(word[i + 3] || ''); // mean|while, ma|chine
      if ((vcv && !cluster.test(word[i - 1] + a)) || vccv || beforeCluster || extra.has(i)) out += '\u00AD';
    }
    return out;
  });
}

// Buzz-mode bookkeeping (imperative, within the clue screen)
// Buzz in: two players share one keyboard. Player 1 owns the left half and Player 2 the right
// half, so any key on your side rings in (Kelly, Nov 11). Codes are physical keys, so this holds
// on any keyboard layout. Space stays shared: it skips the reading beat.
const BUZZ_LEFT = new Set(['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
  'Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG',
  'ShiftLeft', 'IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'ControlLeft', 'AltLeft', 'MetaLeft']);
const BUZZ_RIGHT = new Set(['Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace',
  'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash',
  'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter',
  'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'AltRight', 'MetaRight', 'ControlRight',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const buzzSide = (code) => (BUZZ_LEFT.has(code) ? 0 : BUZZ_RIGHT.has(code) ? 1 : -1);
const BUZZ_HINTS = ['left half', 'right half'];
const touchOnly = () => window.matchMedia?.('(hover: none)').matches;
let buzzPhase = null; // 'reading' | 'open' | 'answering' | 'done'
let buzzLockedUntil = [];
let buzzTimeouts = [];
let buzzKeyHandler = null;

// ——— Screen Router ———

let shownScreen = null;

// ——— The music button: one clear switch, in reach wherever music plays ———
// (Kelly, Nov 12 2026: "make sure there is a clear button to turn it off".) It lives outside
// #app so a re-render never drops it, and shows only while music is asked for.
function syncMusicButton() {
  let btn = document.getElementById('music-button');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'music-button';
    btn.className = 'music-button';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18V6l11-2v12"/>
        <ellipse cx="6.5" cy="18" rx="2.5" ry="2" fill="currentColor"/>
        <ellipse cx="17.5" cy="16" rx="2.5" ry="2" fill="currentColor"/>
        <path class="music-strike" d="M3.5 3.5l17 17"/>
      </svg>
      <span class="music-label"></span>`;
    btn.addEventListener('click', () => {
      const on = !music.isMusicOn();
      savePrefs({ music: on });
      music.setMusic(on);
    });
    document.body.appendChild(btn);
  }
  const on = music.isMusicOn();
  btn.hidden = !music.asked();
  btn.classList.toggle('is-off', !on);
  btn.querySelector('.music-label').textContent = on ? 'Music on' : 'Music off';
  btn.title = on ? 'Turn the music off' : 'Turn the music on';
  // In the game itself the corner belongs to the scores, so the button shrinks to its note. On
  // the board it sits beside the menu button; on the clue, wager and final screens it takes the
  // top left corner, which those screens keep clear for it (styles.css).
  const compact = music.asked() === 'play';
  btn.classList.toggle('is-compact', compact);
  const r = compact ? document.getElementById('btn-menu')?.getBoundingClientRect() : null;
  const small = window.innerWidth < 600; // a phone's header has no room to spare
  btn.style.left = r?.width ? `${Math.round(r.right + (small ? 4 : 8))}px` : '';
  btn.style.top = r?.width ? `${Math.round(r.top + (r.height - (small ? 40 : 44)) / 2)}px` : '';
}
window.addEventListener('resize', () => { if (document.getElementById('music-button')) syncMusicButton(); });
music.onChange(syncMusicButton);
// A long card scrolled under the note on a phone: the note steps aside (styles.css fades it).
document.addEventListener('scroll', (e) => {
  const t = e.target === document ? document.scrollingElement : e.target;
  if (t === document.scrollingElement || t === document.body || t === app) document.body.classList.toggle('is-scrolled', (t?.scrollTop || 0) > 8);
}, { capture: true, passive: true });
// the screens of the game itself, where the music is only a faint bed (Kelly: "very very soft")
const BED_SCREENS = new Set(['board', 'clue', 'daily-double', 'round-transition', 'final-category', 'final-wager']);

function render() {
  const state = getState();

  // Avoid re-rendering when only the timer ticked (no screen change)
  if (state.screen === lastScreen && state.screen === 'clue') return;
  lastScreen = state.screen;
  const from = shownScreen;
  shownScreen = state.screen;

  // Stop any running timer when leaving the clue screen
  if (state.screen !== 'clue') cleanupClue();

  // Clear celebratory confetti when leaving the results screen
  if (state.screen !== 'results') {
    document.querySelectorAll('.confetti-container').forEach(el => el.remove());
  }

  // Board keyboard nav only lives on the board
  if (state.screen !== 'board') detachBoardKeys();

  // Music by screen: the menu pieces bow out as the game begins, a very faint One Note Quiz
  // runs under the game itself, and the engine asks for the thinking music on the final clue.
  if (BED_SCREENS.has(state.screen)) { if (music.asked() !== 'play') music.play('play'); }
  else if (state.screen === 'results' || state.screen === 'error') { if (music.asked()) music.stop(1.2); }
  else if (state.screen !== 'setup' && music.asked() === 'menu') music.stop(1.2);

  const draw = () => {
    switch (state.screen) {
      case 'setup': renderSetup(); break;
      case 'loading': renderLoading(); break;
      case 'chapter-intro': renderChapterIntro(); break;
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
    // a reaction clip still playing moves over to the new screen's Napoleon
    hostCarry();
    document.body.classList.remove('is-scrolled');
    syncMusicButton();
  };

  // One screen hands over to the next, and Napoleon is carried across (see
  // `view-transition-name: host`). Opening a tile has its own move instead.
  const tileOpens = from === 'board' && (state.screen === 'clue' || state.screen === 'daily-double');
  if (from && from !== state.screen && !tileOpens && document.startViewTransition && !prefersReducedMotion()) {
    const t = document.startViewTransition(draw);
    t.ready.catch(() => {});
    t.finished.catch(() => {});
  } else {
    draw();
  }
}

subscribe(render);

// ——— Timer ———

let urgentShown = false;

function startTimer(totalSeconds, onExpire) {
  clearInterval(timerInterval);
  urgentShown = false;
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
  // The last five seconds: he leans in
  if (urgent && seconds > 0 && seconds < total && !urgentShown) {
    urgentShown = true;
    hostReact('leaning', { move: 'lean', say: pick(URGENT_LINES), film: 'peer' });
  }
  const timerEl = document.getElementById('timer-bar');
  if (timerEl) {
    timerEl.style.setProperty('--fill', Math.max(0, seconds) / total);
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
      el.textContent = touchOnly() ? 'tap to continue' : 'click or press space to continue';
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
      ${verdict('timeout', pick(TIMEOUT_LINES))}
      <div class="verdict-score">${icon('clock')}<span>-$${formatMoney(result.value)}</span></div>
      <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
    </div>
  `);
  scheduleReturn(3000);
}

// ——— Setup Screen ———

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function renderSetup() {
  const prefs = loadPrefs();
  const savedNames = prefs.names || [];
  const savedAvatars = prefs.avatars || [];
  // New tables start with the three guests; older saves keep their monograms until someone picks.
  setupCharacters = Array.isArray(prefs.characters) ? [...prefs.characters]
    : prefs.names ? [] : [...DEFAULT_CHARACTERS];
  const playerCount = Math.min(prefs.playerCount || 1, 2); // a new table starts solo; two at most for now
  const gameMode = prefs.gameMode || 'turns';
  const gameLength = prefs.gameLength || 'full';
  const pack = prefs.pack === 'easy' ? 'easy' : 'fresh';
  const playStyle = prefs.playStyle === 'campaign' ? 'campaign' : 'free';
  if (typeof prefs.sound === 'boolean') sounds.setEnabled(prefs.sound);
  // the music plays on the title and the table (from the first tap or key: browsers insist)
  music.setMusic(prefs.music !== false);
  music.play('menu');
  prevLeader = null;
  prevScores = [];
  recordedThisGame = false;
  preloadLive(); // the still he stands on in play and his idle films, so he is ready by the first board

  const records = loadRecords();
  const hof = records.lastWinner ? `
    <div class="hall-of-fame">
      <span class="hof-item">Last win: <strong>${escapeHtml(records.lastWinner.name)}</strong> · ${money(records.lastWinner.score)}</span>
      ${records.best ? `<span class="hof-item">Best: <strong>${escapeHtml(records.best.name)}</strong> · ${money(records.best.score)}</span>` : ''}
    </div>` : '';

  const seg = (cls, key, value, picked, label, note = '') => `
              <button type="button" class="seg-btn ${cls} ${value === picked ? 'selected' : ''}" data-${key}="${value}"
                      aria-pressed="${value === picked}"${note ? ` data-note="${note}"` : ''}>${label}</button>`;

  app.innerHTML = `
    <div class="setup-screen" data-step="${setupStep}">
      <section class="setup-hero" aria-labelledby="game-title">
        <div class="setup-brand">
          <h1 class="logo" id="game-title">Clue d&rsquo;&Eacute;tat<span class="logo-dot" aria-hidden="true">.</span></h1>
          <p class="setup-deck"><span>A trivia coup hosted by Napoleon.</span> <span>History is watching.</span></p>
          <button type="button" class="btn-start btn-play" id="btn-play">Play</button>
          ${hof}
          <div class="setup-footer">
            <label class="sound-toggle">
              <input type="checkbox" id="sound-checkbox" ${sounds.isEnabled() ? 'checked' : ''}>
              <span>Sound Effects</span>
            </label>
            <button class="link-btn" id="btn-how-to">How to play</button>
            <a class="link-btn" href="https://kellylucas.dev/army.html">The Army</a>
          </div>
        </div>
        <figure class="title-stage title-film" role="img"
                aria-label="Napoleon strides up to a throne, shoves the question card and the crown off it, and takes his place beside it">
          <video class="title-video" src="./assets/title/throne.mp4" poster="./assets/title/throne-last.webp"
                 width="1280" height="746" muted playsinline preload="auto" aria-hidden="true"></video>
          <video class="title-video title-fidget" src="./assets/title/throne-fidget.mp4"
                 width="1280" height="746" muted playsinline preload="none" aria-hidden="true"></video>
        </figure>
      </section>
      <section class="table" aria-labelledby="table-title">
        <div class="table-cast">
          <header class="table-head">
            <button type="button" class="table-back" id="btn-back" aria-label="Back to the title">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <h2 id="table-title" tabindex="-1">Who&rsquo;s playing<span class="logo-dot" aria-hidden="true">?</span></h2>
            <div class="seg seg-count" role="group" aria-label="How many players">
              ${[1, 2].map(n => `
              <button type="button" class="seg-btn btn-count ${n === playerCount ? 'selected' : ''}" data-count="${n}"
                      aria-pressed="${n === playerCount}">${n} player${n > 1 ? 's' : ''}</button>`).join('')}
            </div>
          </header>
          <div id="player-names"></div>
        </div>
        <div class="table-side">
        <div id="player-seats"></div>
        <div class="table-game">
          <div class="tray-card game-card">
            <h2>The game</h2>
            <div class="opt-row">
              <h3 class="opt-label" id="opt-style">Play style</h3>
              <div class="seg" role="group" aria-labelledby="opt-style">
                ${seg('btn-style', 'style', 'free', playStyle, 'Free Play', 'A fresh board every time.')}
                ${seg('btn-style', 'style', 'campaign', playStyle, 'The Campaign', 'Napoleon&rsquo;s life in 15 chapters. Win a chapter and the Empire grows.')}
              </div>
              <p class="opt-note"></p>
            </div>
            <div id="chapter-card" class="chapter-card" ${playStyle === 'campaign' ? '' : 'hidden'}></div>
            <div class="opt-row">
              <h3 class="opt-label" id="opt-pack">Questions</h3>
              <div class="seg" role="group" aria-labelledby="opt-pack">
                ${seg('btn-pack', 'pack', 'easy', pack, 'Easy Breezy', 'Gentler questions: classics, nostalgia, things you half remember.')}
                ${seg('btn-pack', 'pack', 'fresh', pack, 'Fresh Pack', 'The full challenge: trickier clues and more wordplay.')}
              </div>
              <p class="opt-note"></p>
            </div>
            <details class="opt-more">
              <summary><span class="opt-more-sum"></span><span class="opt-more-change">Change</span></summary>
              <div class="opt-row">
                <h3 class="opt-label" id="opt-length">Length</h3>
                <div class="seg" role="group" aria-labelledby="opt-length">
                  ${seg('btn-length', 'length', 'quick', gameLength, 'Quick &middot; ~20 min')}
                  ${seg('btn-length', 'length', 'full', gameLength, 'Full &middot; ~45 min')}
                </div>
              </div>
            </details>
            <div class="opt-row" id="mode-section">
              <h3 class="opt-label" id="opt-mode">How you answer</h3>
              <div class="seg" role="group" aria-labelledby="opt-mode">
                ${seg('btn-answer', 'mode', 'turns', gameMode, 'Take turns', 'Each clue goes to the next player.')}
                ${seg('btn-answer', 'mode', 'buzz', gameMode, 'Buzz in', 'Race to ring in: Player 1 hits any key on the left half of the keyboard, Player 2 any key on the right.')}
              </div>
              <p class="opt-note"></p>
            </div>
          </div>
        </div>
        <div class="table-go">
          <button class="btn-start" id="btn-start-game">${playStyle === 'campaign' ? 'March on' : 'Open the board'}</button>
        </div>
        </div>
      </section>
    </div>
  `;

  renderPlayerInputs(playerCount, savedNames, savedAvatars);
  updateModeVisibility(playerCount);

  // The front screen plays once: he walks up to the throne and clears it, then holds there.
  // A tap on the picture plays it again. Reduced motion, data saver or a refused autoplay
  // leave the last frame up: him beside his empty throne.
  const screen = app.querySelector('.setup-screen');
  const calm = prefersReducedMotion();
  const film = app.querySelector('.title-video');
  const stage = app.querySelector('.title-film');
  const still = () => { film.poster = './assets/title/throne-last.webp'; };
  // Once the film is over he does not freeze: every so often he turns his head to look at you,
  // then looks away again (Kelly, Nov 11: "very subtle movement"). The fidget clip starts and
  // ends on the film's last frame, so it sits on top of the film and nothing jumps.
  const fidget = app.querySelector('.title-fidget');
  let fidgetTimer = 0;
  const rest = () => { clearTimeout(fidgetTimer); fidgetTimer = 0; };
  const settle = () => { rest(); if (fidget) { fidget.pause(); fidget.classList.remove('on'); } };
  const idle = (first = false) => {
    rest();
    if (!fidget || calm || navigator.connection?.saveData) return;
    fidgetTimer = setTimeout(() => {
      if (!fidget.isConnected) return;
      if (document.hidden || setupStep !== 'title' || !film.ended) { idle(); return; }
      fidget.currentTime = 0;
      fidget.play()?.then(() => fidget.classList.add('on')).catch(() => {});
    }, first ? 900 + Math.random() * 400 : 6000 + Math.random() * 6000);
  };
  const roll = () => {
    if (!film || calm || navigator.connection?.saveData) return;
    settle();
    film.poster = './assets/title/throne-first.webp';
    film.currentTime = 0;
    film.play()?.catch(() => { film.removeAttribute('src'); film.load(); still(); });
  };
  if (film) {
    if (calm || navigator.connection?.saveData) film.preload = 'none';
    if (setupStep === 'title') roll();
    stage.addEventListener('click', () => { if (film.paused || film.ended) roll(); });
    // the fidget is fetched while the film plays, so it is ready the moment the film ends
    film.addEventListener('playing', () => { if (fidget && !navigator.connection?.saveData) fidget.preload = 'auto'; }, { once: true });
    film.addEventListener('ended', () => { if (fidget) fidget.preload = 'auto'; idle(true); });
    fidget?.addEventListener('ended', () => { fidget.classList.remove('on'); idle(); });
  }

  // Two steps, one page: the title, then the table. Nothing is re-rendered, so every choice survives a trip back.
  const goTo = step => {
    setupStep = step;
    screen.dataset.step = step;
    window.scrollTo(0, 0);
    screen.scrollTop = 0;
    app.scrollTop = 0;
    if (step === 'table') {
      if (!calm) {
        animate(screen.querySelectorAll('.table-head, .seats, .cast, .table-game, .table-go'),
          { opacity: [0, 1], y: [16, 0] }, { duration: 0.42, ease: EXPO, delay: stagger(0.05) });
      }
      if (film && !film.paused) film.pause();
      settle();
      warmCast();
      document.getElementById('table-title')?.focus({ preventScroll: true });
    } else {
      // back at the title: pick the film up where it stopped, or let him fidget again
      if (film?.ended) idle(true);
      else if (film && film.paused && film.currentTime > 0 && !calm) film.play()?.catch(() => {});
      document.getElementById('btn-play')?.focus({ preventScroll: true });
    }
  };
  document.getElementById('btn-play').addEventListener('click', () => { sounds.playSelect(); goTo('table'); });
  document.getElementById('btn-back').addEventListener('click', () => goTo('title'));

  // A row of choices: one is always picked, and its note (when it has one) sits under the row
  const wire = (selector, onPick) => {
    const btns = Array.from(document.querySelectorAll(selector));
    const sync = () => {
      const on = btns.find(b => b.classList.contains('selected'));
      const note = on?.closest('.opt-row')?.querySelector('.opt-note');
      if (note) note.textContent = on.dataset.note || '';
    };
    btns.forEach(btn => btn.addEventListener('click', () => {
      btns.forEach(b => { b.classList.toggle('selected', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      sync();
      onPick?.(btn);
    }));
    sync();
  };

  wire('.btn-count', btn => {
    const count = parseInt(btn.dataset.count);
    const typed = Array.from(document.querySelectorAll('.player-name-input')).map(el => el.value);
    renderPlayerInputs(count, typed.concat(savedNames.slice(typed.length)), savedAvatars);
    updateModeVisibility(count);
  });
  // Length lives folded under one line that says what is picked. The questions used to sit there
  // too; they are out in the open now, because how hard the game is should be a choice you can see.
  const sumMore = () => {
    const el = app.querySelector('.opt-more-sum');
    if (!el) return;
    el.textContent = app.querySelector('.btn-length.selected')?.dataset.length === 'quick'
      ? 'Quick game \u00b7 about 20 min' : 'Full game \u00b7 about 45 min';
  };
  sumMore();
  wire('.btn-length', () => { sumMore(); renderChapterCard(); }); // the chapter's target depends on game length
  wire('.btn-style', btn => {
    const style = btn.dataset.style;
    savePrefs({ playStyle: style });
    const card = document.getElementById('chapter-card');
    if (card) card.hidden = style !== 'campaign';
    const start = document.getElementById('btn-start-game');
    if (start && style !== 'campaign') start.textContent = 'Open the board';
    renderChapterCard();
  });
  renderChapterCard();
  wire('.btn-answer');
  wire('.btn-pack', btn => savePrefs({ pack: btn.dataset.pack }));

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
    const avatars = names.map((n, i) => monogram(n, i));
    const chars = names.map((_, i) => (characterById(setupCharacters[i]) ? setupCharacters[i] : null));
    const mode = document.querySelector('.btn-answer.selected')?.dataset.mode || 'turns';
    const length = document.querySelector('.btn-length.selected')?.dataset.length || 'full';
    const packSel = document.querySelector('.btn-pack.selected')?.dataset.pack || 'fresh';
    const style = document.querySelector('.btn-style.selected')?.dataset.style || 'free';
    savePrefs({ names, avatars, characters: setupCharacters.slice(0, 3), playerCount: names.length, gameMode: mode, gameLength: length, pack: packSel, playStyle: style, sound: sounds.isEnabled() });
    sounds.playSelect();
    setupStep = 'table'; // a rematch comes back to the table, not the title
    if (style === 'campaign') {
      const number = selectedChapterNumber();
      loadCampaign().then(() => {
        startGame(names, mode, avatars, length, { chapter: getChapter(number), basePack: packSel }, chars);
      }).catch(() => setState({ screen: 'error', errorContext: 'campaign' }));
    } else {
      startGame(names, mode, avatars, length, null, chars);
    }
  });
}

/** The chapter the table picked on the setup card (defaults to the current one). */
function selectedChapterNumber() {
  const progress = loadProgress();
  const card = document.getElementById('chapter-card');
  const picked = Number(document.getElementById('chapter-select')?.value || card?.dataset.selected || 0);
  return picked >= 1 && picked <= progress.current ? picked : progress.current;
}

/** The setup screen's chapter card — where the Campaign stands and what's at stake. */
async function renderChapterCard() {
  const card = document.getElementById('chapter-card');
  if (!card || card.hidden) return;
  if (!card.innerHTML) card.innerHTML = '<div class="chapter-loading">Unrolling the map&hellip;</div>';
  try {
    await loadCampaign();
  } catch {
    card.innerHTML = '<div class="chapter-loading">Couldn&rsquo;t load the Campaign. Check your connection.</div>';
    return;
  }
  if (!document.getElementById('chapter-card')) return; // the screen moved on while loading

  const progress = loadProgress();
  const total = chapterCount();
  const number = selectedChapterNumber();
  const chapter = getChapter(number);
  const length = document.querySelector('.btn-length.selected')?.dataset.length || 'full';
  const target = chapterTarget(chapter, length, progress);
  const won = progress.completed.length;
  const unlocked = Array.from({ length: progress.current }, (_, i) => i + 1);
  const options = unlocked.map(n => {
    const c = getChapter(n);
    const done = progress.completed.some(x => x.number === n);
    return `<option value="${n}" ${n === number ? 'selected' : ''}>Chapter ${n} · ${escapeHtml(c.title)}${done ? ' ✓' : ''}</option>`;
  }).join('');
  const attempts = progress.attempts[number] || 0;
  const ledgerChapter = getChapter(Math.max(1, ...progress.completed.map(c => c.number)));

  card.dataset.selected = String(number);
  card.innerHTML = `
    <div class="chapter-kicker">Chapter ${chapter.number} of ${total} &middot; ${escapeHtml(chapter.years)}</div>
    <div class="chapter-title">${escapeHtml(chapter.title)}</div>
    <div class="chapter-stage">${escapeHtml(chapter.stage)}</div>
    <div class="chapter-facts">
      <span>${tierLabel(chapter.tier)} &middot; tier ${chapter.tier} of 5</span>
      <span>Target ${money(target)}</span>
      <span>${chapterTimer(chapter)}s per clue</span>
      ${attempts ? `<span>${attempts} attempt${attempts > 1 ? 's' : ''} so far</span>` : ''}
    </div>
    <div class="chapter-empire">${escapeHtml(chapter.empire.headline)} &middot; ${empireHoldings(chapter).length} holdings on the ledger</div>
    ${unlocked.length > 1 ? `<label class="chapter-pick">Play chapter <select id="chapter-select">${options}</select></label>` : ''}
    <div class="chapter-links">
      <button class="link-btn" id="btn-empire">The Empire so far</button>
      ${won ? `<span class="chapter-progress">${Math.min(won, total)} of ${total} chapters won</span>` : ''}
      ${won || Object.keys(progress.attempts).length ? '<button class="link-btn" id="btn-campaign-reset">Start over</button>' : ''}
    </div>
  `;
  const start = document.getElementById('btn-start-game');
  if (start) start.textContent = `March on Chapter ${chapter.number}`;

  document.getElementById('chapter-select')?.addEventListener('change', (e) => {
    card.dataset.selected = e.target.value;
    renderChapterCard();
  });
  document.getElementById('btn-empire').addEventListener('click', () => showEmpire(ledgerChapter));
  document.getElementById('btn-campaign-reset')?.addEventListener('click', confirmCampaignReset);
}

function confirmCampaignReset() {
  if (document.querySelector('.modal-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Start the Campaign over">
      <div class="modal-title">Start the Campaign over?</div>
      <div class="modal-body">Every chapter is locked again and the Empire shrinks back to the Kingdom of France. Your Hall of Fame is untouched.</div>
      <div class="modal-actions">
        <button class="btn-quiet modal-cancel">Keep my progress</button>
        <button class="btn-danger modal-confirm">Start over</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.modal-confirm').addEventListener('click', () => {
    resetProgress();
    close();
    const card = document.getElementById('chapter-card');
    if (card) { delete card.dataset.selected; renderChapterCard(); }
  });
  overlay.querySelector('.modal-cancel').focus();
}

const STATUS_ORDER = ['core', 'annexed', 'satellite', 'allied', 'occupied', 'lost', 'exile'];

/** The Empire ledger for a chapter: every holding, its status, and why. */
function showEmpire(chapter) {
  if (!chapter || document.querySelector('.modal-overlay')) return;
  const emp = chapter.empire;
  const holdings = [...emp.holdings].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const size = empireHoldings(chapter).length;
  const max = empireMax();
  const meta = [
    `${size} holding${size === 1 ? '' : 's'}`,
    `zenith ${max}`,
    emp.departements ? `${emp.departements} départements` : '',
    emp.peopleMillions ? `about ${emp.peopleMillions} million people` : '',
  ].filter(Boolean).join(' · ');

  const present = STATUS_ORDER.filter(st => holdings.some(h => h.status === st));
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal empire" role="dialog" aria-modal="true" aria-label="The Empire">
      <div class="modal-title">The Empire &middot; Chapter ${chapter.number} &middot; ${escapeHtml(chapter.years)}</div>
      <div class="empire-body">
        <div class="empire-side">
          <div class="empire-headline">${escapeHtml(emp.headline)}</div>
          <div class="empire-note">${escapeHtml(emp.note || '')}</div>
          <div class="empire-map-wrap">${empireMap(holdings, `Map of Europe with ${holdings.length} places marked. They are listed below.`)}</div>
          <div class="empire-legend">${present.map(st => `<span>${statusMark(st)}${escapeHtml(statusLabel(st))}</span>`).join('')}</div>
          <div class="empire-meta">${escapeHtml(meta)}</div>
        </div>
        <ul class="empire-list">
          ${holdings.map((h, i) => `
            <li class="status-${h.status}" data-pin="${i}" tabindex="0">
              ${statusMark(h.status)}
              <span class="eh-name">${escapeHtml(h.name)}</span>
              <span class="eh-status">${escapeHtml(statusLabel(h.status))}${h.since ? ` &middot; ${escapeHtml(h.since)}` : ''}</span>
              ${h.note ? `<span class="eh-note">${escapeHtml(h.note)}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      <div class="modal-actions">
        <button class="btn-cta modal-cancel">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.modal-cancel').focus({ preventScroll: true });

  // A row and its pin point at each other
  const svg = overlay.querySelector('.empire-map');
  const rows = overlay.querySelectorAll('.empire-list li');
  const point = (i) => {
    rows.forEach(r => r.classList.toggle('is-on', Number(r.dataset.pin) === i));
    pointAt(svg, i, i === null ? '' : holdings[i].name);
  };
  rows.forEach(row => {
    const i = Number(row.dataset.pin);
    row.addEventListener('pointerenter', () => point(i));
    row.addEventListener('focus', () => point(i));
    row.addEventListener('click', () => point(i));
  });
  svg.querySelectorAll('.em-pin').forEach(pin => {
    const i = Number(pin.dataset.pin);
    pin.addEventListener('pointerenter', () => point(i));
    pin.addEventListener('click', () => { point(i); rows[i].scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); });
  });
  svg.addEventListener('pointerleave', () => point(null));

  // The Empire assembles: France first, then each ring of holdings
  if (!prefersReducedMotion()) {
    animate(svg.querySelectorAll('.em-shape'), { scale: [0, 1], opacity: [0, 1] },
      { type: 'spring', stiffness: 380, damping: 18, delay: stagger(0.055, { startDelay: 0.25 }) });
  }
}

function updateModeVisibility(count) {
  const section = document.getElementById('mode-section');
  if (section) section.style.display = count > 1 ? '' : 'none';
}

// Whose turn it is at the shared cast on the setup screen
let castTurn = 0;

// The cast's second pose (a wave, a raised hat) is fetched once the table is open, so the
// first figure the pointer meets answers at once.
let castWarmed = false;
function warmCast() {
  if (castWarmed || navigator.connection?.saveData) return;
  const roster = characters();
  if (!roster.length) return;
  castWarmed = true;
  roster.forEach((rc) => { new Image().src = rc.poseUrls.victory; });
}

/**
 * The table: the whole cast stands in a hall of niches, full length, and each player stands
 * big at the head of the right column over their name. A tap on a player hands them the cast;
 * a tap on a figure makes it theirs. The figure under the pointer greets you (its victory
 * pose), and the one you hold keeps that pose.
 */
function renderPlayerInputs(count, savedNames = [], savedAvatars = []) {
  const container = document.getElementById('player-names');
  const seatsBox = document.getElementById('player-seats');
  if (!container || !seatsBox) return;
  const roster = characters();
  const turn = Math.min(castTurn, count - 1);
  const nameOf = i => savedNames[i] || `Player ${i + 1}`;
  const held = i => characterById(setupCharacters[i]);
  // every player's numbered tag sits on the figure they hold
  const tagsFor = id => (count > 1
    ? Array.from({ length: count }, (_, j) => j)
      .filter(j => (held(j) ? setupCharacters[j] : '') === id)
      .map(j => `<span class="cast-tag" style="--pc: ${PLAYER_COLORS[j]}">${j + 1}</span>`).join('')
    : '');

  const asLine = c => (c ? `as ${c.name}` : 'Initials only');
  let seats = `<div class="seats" data-count="${count}">`;
  let html = '';
  for (let i = 0; i < count; i++) {
    const c = held(i);
    seats += `
      <div class="seat ${count > 1 && i === turn ? 'is-picking' : ''}" data-index="${i}" style="--pc: ${PLAYER_COLORS[i]}">
        <button type="button" class="seat-face" data-index="${i}"${count > 1 ? ` aria-pressed="${i === turn}"` : ''}
                aria-label="${count > 1 ? `Choose a character for player ${i + 1}` : 'Your character'}${c ? `, now ${escapeHtml(c.name)}` : ''}">
          <img class="seat-img" src="${c ? c.poseUrls.ready : ''}" alt="" ${c ? '' : 'hidden'}>
          <span class="seat-seal" ${c ? 'hidden' : ''}>${escapeHtml(monogram(nameOf(i), i))}</span>
          ${count > 1 ? `<span class="seat-num" aria-hidden="true">${i + 1}</span>` : ''}
        </button>
        <div class="seat-text">
          <input type="text" class="player-name-input" placeholder="Name" id="player-name-${i}"
                 aria-label="Player ${i + 1} name" value="${escapeHtml(nameOf(i))}" data-index="${i}"
                 maxlength="24" autocomplete="off" spellcheck="false">
          <span class="seat-as">${escapeHtml(asLine(c))}</span>
        </div>
      </div>
    `;
  }
  seats += '</div>';

  // One cast for the whole table, standing full length: the players take turns at it
  if (roster.length) {
    const mine = held(turn);
    html += `
      <div class="cast">
        <div class="cast-line">
          <p class="cast-for">${count > 1
            ? `Choosing for <strong class="cast-who" style="--pc: ${PLAYER_COLORS[turn]}">${escapeHtml(nameOf(turn))}</strong>`
            : 'Choose your character'}</p>
          <button type="button" class="cast-none ${mine ? '' : 'selected'}" data-id="" aria-pressed="${!mine}">${tagsFor('')}Play with initials</button>
        </div>
        <div class="cast-figures" role="radiogroup" aria-label="Character for ${escapeHtml(nameOf(turn))}">
          ${roster.map(rc => `
            <button type="button" class="char-option${count > 1 && tagsFor(rc.id) ? ' is-held' : ''}" role="radio" data-id="${rc.id}"
                    aria-checked="${rc.id === setupCharacters[turn]}" style="--tone: ${rc.tone}">
              <span class="cast-fig"><img src="${rc.id === setupCharacters[turn] ? rc.poseUrls.victory : rc.poseUrls.ready}" alt="" loading="lazy" decoding="async"></span>
              ${tagsFor(rc.id)}
              <span class="cast-name">${escapeHtml(rc.name)}</span>
            </button>`).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
  seatsBox.innerHTML = seats;
  if (setupStep === 'table') warmCast();

  const typedNames = () => Array.from(seatsBox.querySelectorAll('.player-name-input')).map(el => el.value);
  const redraw = () => renderPlayerInputs(count, typedNames(), savedAvatars);

  // The roster loads once per visit; draw the cast as soon as it arrives.
  if (!roster.length) {
    loadCharacters().then(list => {
      if (list.length && getState().screen === 'setup' && document.getElementById('player-names') === container) redraw();
    });
  }

  // A name restrikes its seal (when no face is chosen) and the line over the cast as it is typed
  seatsBox.querySelectorAll('.player-name-input').forEach(input => {
    input.addEventListener('input', () => {
      const i = Number(input.dataset.index);
      const who = container.querySelector('.cast-who');
      if (who && i === turn) who.textContent = input.value.trim() || `Player ${i + 1}`;
      const seal = seatsBox.querySelector(`.seat[data-index="${i}"] .seat-seal`);
      if (seal) seal.textContent = monogram(input.value, i);
    });
  });

  // A tap on a player hands the cast to that player
  seatsBox.querySelectorAll('.seat-face').forEach(btn => {
    btn.addEventListener('click', () => {
      if (count === 1) { container.querySelector('.cast-figures [aria-checked="true"]')?.focus(); return; }
      castTurn = Number(btn.dataset.index);
      redraw();
      document.querySelector(`.seat-face[data-index="${castTurn}"]`)?.focus({ preventScroll: true });
    });
  });

  // Whoever the pointer or focus is on tries the face on before anyone commits
  const seat = seatsBox.querySelector(`.seat[data-index="${turn}"]`);
  const figures = container.querySelector('.cast-figures');
  const wear = id => {
    const c = characterById(id);
    const img = seat.querySelector('.seat-img');
    if (c && img.getAttribute('src') !== c.poseUrls.ready) img.src = c.poseUrls.ready;
    img.hidden = !c;
    seat.querySelector('.seat-seal').hidden = !!c;
    seat.querySelector('.seat-as').textContent = asLine(c);
  };
  // the figure under the pointer greets you; the one this player holds keeps the pose
  const greet = (hot) => {
    figures.querySelectorAll('.char-option').forEach((opt) => {
      const c = characterById(opt.dataset.id);
      const img = opt.querySelector('.cast-fig img');
      if (!c || !img) return;
      const url = opt === hot || opt.getAttribute('aria-checked') === 'true' ? c.poseUrls.victory : c.poseUrls.ready;
      if (img.getAttribute('src') !== url) img.src = url;
    });
  };
  if (figures && seat) {
    const tryOn = e => {
      const opt = e.target.closest('.char-option');
      if (opt && !(e.pointerType && e.pointerType !== 'mouse')) { wear(opt.dataset.id); greet(opt); }
    };
    const rest = () => { wear(setupCharacters[turn]); greet(null); };
    figures.addEventListener('pointerover', tryOn);
    figures.addEventListener('focusin', tryOn);
    figures.addEventListener('pointerleave', rest);
    figures.addEventListener('focusout', rest);
  }

  container.querySelectorAll('.char-option, .cast-none').forEach(opt => {
    opt.addEventListener('click', () => {
      const id = opt.dataset.id || null;
      // one character per player: taking someone else's hands them yours
      const holder = id ? setupCharacters.findIndex((cid, j) => j !== turn && j < count && cid === id) : -1;
      if (holder >= 0) setupCharacters[holder] = setupCharacters[turn];
      setupCharacters[turn] = id;
      savePrefs({ characters: setupCharacters.slice(0, 3) });
      sounds.playSelect();
      redraw();
      const picked = document.querySelector(id ? '.cast-figures [aria-checked="true"]' : '.cast-none');
      picked?.focus({ preventScroll: true });
      // the chosen figure steps forward, and so does the big one over the player's name
      if (id && picked && !prefersReducedMotion()) {
        animate(picked.querySelector('.cast-fig img'), { y: [10, -4, 0] }, { duration: 0.42, ease: EXPO });
        const big = document.querySelector(`#player-seats .seat[data-index="${turn}"] .seat-img`);
        if (big) animate(big, { y: [14, -6, 0] }, { duration: 0.5, ease: EXPO });
      }
    });
  });
}

// ——— Loading Screen ———

function renderLoading() {
  const { campaign } = getState();
  const ch = campaign && campaign.chapter;
  app.innerHTML = `
    ${sceneShapes('loading')}
    <div class="loading-screen">
      <div class="logo">Clue d&rsquo;&Eacute;tat<span class="logo-dot" aria-hidden="true">.</span></div>
      ${compassLoader('loading-compass')}
      <div class="loading-text">${ch ? 'Drawing up the order of battle&hellip;' : 'Loading clues&hellip;'}</div>
      ${ch ? `<div class="chapter-meta">Chapter ${ch.number} &middot; ${escapeHtml(ch.title)}</div>` : ''}
    </div>
  `;
}

/** The chapter's story, read before the board is drawn. */
function renderChapterIntro() {
  const { campaign, gameLength } = getState();
  const ch = campaign && campaign.chapter;
  if (!ch) { beginChapter(); return; }
  const target = chapterTarget(ch, gameLength);
  app.innerHTML = `
    ${sceneShapes('chapter')}
    <div class="chapter-intro-screen">
      <h1 class="chapter-title">${escapeHtml(ch.title)}</h1>
      <div class="chapter-meta">Chapter ${ch.number} of ${chapterCount()} &middot; ${escapeHtml(ch.years)}</div>
      <div class="chapter-stage">${escapeHtml(ch.stage)} &middot; ${escapeHtml(ch.place)}</div>
      <p class="chapter-blurb">${escapeHtml(ch.blurb)}</p>
      ${hostLine(ch.quote.text, ch.quote.by)}
      <div class="chapter-intro-facts">
        <span>Target ${money(target)}</span>
        <span>${chapterTimer(ch)}s per clue</span>
        <span>${tierLabel(ch.tier)}</span>
        <span>${LEGION_CLUES} chapter clues = Légion d&rsquo;honneur</span>
      </div>
      <button class="btn-continue" id="btn-begin-chapter">To the board</button>
      <button class="link-btn" id="btn-intro-empire">The Empire at this point</button>
    </div>
    ${stageHost('welcome')}
  `;
  const go = document.getElementById('btn-begin-chapter');
  go.focus();
  go.addEventListener('click', () => { boardRevealDone = false; beginChapter(); });
  document.getElementById('btn-intro-empire').addEventListener('click', () => showEmpire(ch));
}

function renderError() {
  app.innerHTML = `
    <div class="loading-screen">
      <div class="logo">Clue d&rsquo;&Eacute;tat<span class="logo-dot" aria-hidden="true">.</span></div>
      <div class="error-box">
        <div class="error-title">Couldn't load the clues</div>
        <div class="error-body">Check your connection and try again.</div>
        <button class="btn-cta" id="btn-error-retry">Back to menu</button>
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
  const { categories, players, activePlayer, round, cluesAnswered, totalClues, gameMode, campaign, gameLength } = getState();
  const chapter = campaign && campaign.chapter;
  const roundName = chapter
    ? `Chapter ${chapter.number} · ${chapter.title} · ${round === 1 ? 'Round I' : 'Round II · Doubled'}`
    : round === 1 ? 'Round I' : 'Round II · Doubled';
  const progress = Math.round((cluesAnswered / totalClues) * 100);

  // He comes back to the board the way the last clue left him, then points at it again.
  const outcome = lastOutcome;
  lastOutcome = null;
  const stance = { correct: 'hands-on-hips', wrong: 'arms-crossed', timeout: 'arms-crossed', pass: 'shrug' }[outcome]
    || (cluesAnswered === 0 ? 'welcome' : 'choose');
  const mood = { correct: 'delighted', wrong: 'annoyed', timeout: 'annoyed', pass: 'puzzled' }[outcome] || 'neutral';
  const spent = lastPicked;
  lastPicked = null;
  const opening = chapter && cluesAnswered === 0 && round === 1 && CHAPTER_LINES[chapter.number];
  // Where the board has no room for the explainers (phones, small windows), he says once
  // that a category can be asked about. A chapter's opening line goes first.
  const notesHidden = !window.matchMedia('(min-width: 1100px) and (min-height: 700px)').matches;
  // a wide column holds a long word whole; only narrow ones need the syllable breaks
  const wideBoard = window.innerWidth >= 900;
  const hint = notesHidden && round === 1 && cluesAnswered === (opening ? 1 : 0) && categories.some(c => c.note)
    ? `${touchOnly() ? 'Tap' : 'Click'} a category and I will explain it.` : '';
  const remark = opening || hint
    || (outcome === 'correct' ? pick(AFTER_CORRECT) : outcome && outcome !== 'pass' ? pick(AFTER_WRONG) : pick(BOARD_LINES));

  app.innerHTML = `
    <div class="board-screen">
      <div class="board-header">
        <button class="btn-menu" id="btn-menu" aria-label="Game menu" title="Menu (Esc)">
          <i class="ph ph-list" aria-hidden="true"></i>
        </button>
        <div class="board-brand">
          <div class="board-title">Clue d&rsquo;&Eacute;tat<span class="logo-dot" aria-hidden="true">.</span></div>
          <div class="round-meta">
            <div class="round-name">${roundName}</div>
            <div class="round-progress"><div class="round-progress-fill" style="--fill:${progress / 100}"></div></div>
          </div>
        </div>
        <div class="scoreboard">
          ${players.map((p, i) => `
            <div class="player-score ${i === activePlayer ? 'active' : ''}" style="--pc: ${PLAYER_COLORS[i]}">
              <div class="player-avatar ${portraitUrl(p.character) ? 'has-portrait' : ''}">${avatarHtml(p, i)}</div>
              <div class="player-meta">
                <div class="player-name">${escapeHtml(p.name)}${p.streak >= 2 ? ` <span class="streak${p.streak >= 3 ? ' is-hot' : ''}">&times;${p.streak}</span>` : ''}</div>
                <div class="player-amount ${p.score < 0 ? 'negative' : ''}" data-index="${i}">${flowMoney(p.score, prevScores[i])}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="board-stage">
        <div class="game-board" id="game-board">
          ${categories.map((cat, ci) => `
            <div class="board-category ${cat.themed ? 'themed' : ''}" data-cat="${ci}">
              <div class="category-header" ${cat.note ? `role="button" tabindex="0" data-cat="${ci}" aria-label="${escapeHtml(cat.name)}: ${escapeHtml(cat.note)}"` : ''} ${cat.themed ? 'title="This chapter\'s category: three right answers earn the Légion d\'honneur"' : ''}><span class="cat-name">${escapeHtml(wideBoard ? cat.name : softHyphenate(cat.name))}</span>${cat.note ? `<span class="cat-note">${escapeHtml(cat.note)}</span>` : ''}</div>
              ${cat.clues.map((clue, cli) => {
                const justSpent = clue.answered && spent && spent.ci === ci && spent.cli === cli;
                return `
                <div class="board-clue ${clue.answered ? 'answered' : ''} ${justSpent ? 'just-spent' : ''}"
                     data-cat="${ci}" data-clue="${cli}">
                  ${clue.answered ? (justSpent ? `<span class="spent" aria-hidden="true">$${clue.value}</span>` : '') : '$' + clue.value}
                </div>
              `; }).join('')}
            </div>
          `).join('')}
        </div>
        <aside class="board-host" aria-label="Napoleon, your host">
          ${hostFigure(stance, 'board-fig', { alt: 'Napoleon, standing by the board' })}
        </aside>
      </div>
      <div class="board-footer">
        <div class="host-dock">
          <div class="host-monogram has-face" aria-hidden="true"><img src="${faceSrc(mood)}" alt=""></div>
          <div class="host-plaque" aria-live="polite">${players.length > 1 && !opening && !hint
            ? `<strong>${escapeHtml(players[activePlayer].name)}</strong>, choose your battlefield.`
            : escapeHtml(remark)}</div>
        </div>
        <div class="board-footer-info">
          ${cluesAnswered === 0 ? '<button class="reroll-btn" id="btn-reroll">Redraw the map</button>' : ''}
          <div class="clues-remaining">
            ${totalClues - cluesAnswered === 1 ? '1 clue left' : `${totalClues - cluesAnswered} clues left`}${chapter ? ` &nbsp;&middot;&nbsp; target ${money(chapterTarget(chapter, gameLength))}` : ''}
            ${gameMode === 'buzz' ? ` &nbsp;&middot;&nbsp; buzzers: ${players.map((p, i) => `${escapeHtml(p.name)} <span class="key-hint">${touchOnly() ? 'tap' : BUZZ_HINTS[i] || ''}</span>`).join(' ')}` : ''}
          </div>
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

  // A score that changed rolls to its new value, and the difference lifts off the pill
  flowNumbers();
  players.forEach((p, i) => {
    if (prevScores[i] === undefined || prevScores[i] === p.score) return;
    const pill = document.querySelector(`.player-amount[data-index="${i}"]`)?.closest('.player-score');
    if (!pill) return;
    const diff = p.score - prevScores[i];
    const chip = document.createElement('span');
    chip.className = `score-delta ${diff > 0 ? 'up' : 'down'}`;
    chip.textContent = `${diff > 0 ? '+' : '-'}$${formatMoney(Math.abs(diff))}`;
    pill.appendChild(chip);
    if (prefersReducedMotion()) setTimeout(() => chip.remove(), 1800);
    else animate(chip, { opacity: [0, 1, 1, 0], y: [-6, 0, 0, 10], scale: [0.8, 1, 1, 1] },
      { duration: 1.9, times: [0, 0.14, 0.78, 1], ease: 'easeOut', delay: 0.25 }).then(() => chip.remove());
  });
  prevScores = players.map(p => p.score);
  if (outcome && !prefersReducedMotion()) {
    const dockFace = document.querySelector('.host-monogram.has-face');
    if (dockFace) animate(dockFace, { scale: [0.7, 1] }, { type: 'spring', stiffness: 420, damping: 14 });
    const badge = document.querySelector('.player-score .streak');
    if (badge && outcome === 'correct') animate(badge, { scale: [0, 1.25, 1] }, { duration: 0.5, ease: EXPO, delay: 0.5 });
  }

  // Ask him about a category: its explainer goes in his speech bubble
  document.querySelectorAll('.category-header[data-cat]').forEach((head) => {
    const explain = () => {
      const cat = getState().categories[+head.dataset.cat];
      const plaque = document.querySelector('.host-plaque');
      if (!cat || !cat.note || !plaque) return;
      plaque.innerHTML = `<strong class="plaque-cat">${escapeHtml(cat.name)}</strong>${escapeHtml(cat.note)}`;
      if (!prefersReducedMotion()) animate(plaque, { scale: [0.94, 1] }, { type: 'spring', stiffness: 480, damping: 20 });
    };
    head.addEventListener('click', explain);
    head.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      explain();
    });
  });

  preloadHost(['delighted', 'frustrated', 'annoyed', 'puzzled', 'smirk', 'surprised', 'suspicious']);
  // Kelly's reaction clips: only the ones this screen size shows. (His idle films are fetched
  // from the title page on.)
  preloadFilms([
    ...(window.matchMedia('(min-width: 1240px)').matches
      ? ['pleased', 'nod', 'shrug', 'brace', 'ponder', 'peer', 'stomp', 'fist', 'yell']
      : ['face-smirk', 'face-nod', 'face-startled', 'face-shock', 'face-brow', 'face-stern', 'face-grin']),
    'bow',
  ]);
  // Where he is not live, he goes back to pointing at the board after his reaction
  const turn = ++stanceTurn;
  if (stance !== 'choose') {
    setTimeout(() => {
      if (turn === stanceTurn && shownScreen === 'board') hostReact('choose');
    }, 1700);
  }

  // Lead-change announcement — keeps the race dramatic and visible
  if (players.length > 1) {
    const top = Math.max(...players.map(p => p.score));
    const leaders = players.map((p, i) => i).filter(i => players[i].score === top);
    const leader = leaders.length === 1 ? leaders[0] : null;
    if (leader !== null && prevLeader !== null && leader !== prevLeader) {
      showToast(`${escapeHtml(players[leader].name)} seizes the lead!`, PLAYER_COLORS[leader]);
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
    lastPicked = { ci, cli };
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
        <li><strong>Pick a clue</strong> from the board. Higher rows are worth more.</li>
        <li><strong>Answer</strong> in plain words. Spelling and phrasing are forgiven, and you don't need "What is…".</li>
        <li><strong>Right</strong> adds the value; <strong>wrong</strong> subtracts it. Get 3 right in a row for <strong>Campaign Momentum</strong>, a growing bonus.</li>
        <li><strong>Playing together?</strong> Everyone plays around one screen. <strong>Take turns</strong> passes each clue to the next player. In <strong>Buzz in</strong>, Napoleon reads the clue and then everyone races to ring in. Player 1 can hit any key on the left half of the keyboard, Player 2 any key on the right half, or tap your buzzer on a phone. Buzz too early and you're locked out briefly.</li>
        <li><strong>Waterloo Wagers</strong> hide on the board and let you bet your winnings. Then it's <strong>Waterloo</strong>: one clue, secret wagers, winner takes the night.</li>
        <li>The table is the judge: hit <strong>"The Emperor accepts it"</strong> if a close answer got marked wrong.</li>
        <li><strong>Playing solo?</strong> Chase a Rank (S is Grand Champion) and beat your personal best.</li>
        <li><strong>Question packs:</strong> Fresh Pack is written just for this game, and Easy Breezy is gentler for casual and older players. The game remembers what you've played, so no categories repeat until you've seen a whole pack.</li>
        <li><strong>The Campaign:</strong> Napoleon's life in 15 chapters, from cadet to Saint Helena. Each chapter is one game with a category about that year and one about Napoleon himself; the rest of the board climbs in difficulty as the chapters do. Reach the chapter's score target and the Empire on your ledger grows, exactly as history did, peaking in 1811. Three right answers in the chapter category earn the <strong>Légion d'honneur</strong> bonus.</li>
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
        <button class="btn-quiet modal-cancel">Keep playing</button>
        <button class="btn-danger modal-confirm">Leave game</button>
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
    music.stop(0.9);
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
  if (['chapter-intro', 'board', 'clue', 'daily-double', 'round-transition',
       'final-category', 'final-wager', 'final-clue', 'final-answer'].includes(screen)) {
    confirmQuit();
  }
});

// Keyboard navigation of the board grid (arrows move, Enter picks).
let boardKeyHandler = null;
let boardCursor = { c: 0, r: 0 };

let boardKeysUsed = false; // the cursor tile appears once someone steers with the keyboard
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
    // the first arrow only shows the cursor where it stands
    if (!boardKeysUsed && e.key.startsWith('Arrow')) { e.preventDefault(); boardKeysUsed = true; paint(); return; }
    if (e.key === 'ArrowLeft') boardCursor.c = (boardCursor.c + 5) % 6;
    else if (e.key === 'ArrowRight') boardCursor.c = (boardCursor.c + 1) % 6;
    else if (e.key === 'ArrowUp') boardCursor.r = (boardCursor.r + 4) % 5;
    else if (e.key === 'ArrowDown') boardCursor.r = (boardCursor.r + 1) % 5;
    else if (e.key === 'Enter') {
      const el = cellAt(boardCursor.c, boardCursor.r);
      if (el && !el.classList.contains('answered')) { detachBoardKeys(); openClue(el); }
      handled = true;
    } else handled = false;
    if (handled) { e.preventDefault(); boardKeysUsed = true; paint(); }
  };
  window.addEventListener('keydown', boardKeyHandler);
  if (boardKeysUsed) paint();
}

/** TV-chyron style announcement banner. */
function showToast(html, color = 'var(--brass)') {
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
    <div class="ci-label">Tonight&rsquo;s battlefields&hellip;</div>
    <div class="ci-card" id="ci-card">
      <div class="ci-name" id="ci-name"></div>
      <div class="ci-note" id="ci-note"></div>
    </div>
    <div class="ci-skip">tap to skip</div>
  `;
  // Mounted on <body> so board re-renders can't wipe it mid-sequence
  document.body.appendChild(overlay);

  const card = overlay.querySelector('#ci-card');
  const nameEl = overlay.querySelector('#ci-name');
  const noteEl = overlay.querySelector('#ci-note');
  let i = 0;
  let timeout = null;

  // Each category is read out with its one-line explainer, the way a quiz host says what a
  // category is about. A name with an explainer stays up long enough to read both.
  function showNext() {
    if (i >= categories.length) { finish(); return; }
    const { name, note } = categories[i];
    nameEl.textContent = name;
    noteEl.textContent = note || '';
    card.classList.remove('pop');
    void card.offsetWidth; // restart animation
    card.classList.add('pop');
    sounds.playCategoryBlip();
    i++;
    timeout = setTimeout(showNext, note ? 1100 + Math.min(900, note.length * 22) : 1100);
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
    ${sceneShapes('clue')}
    <div class="clue-screen">
     <div class="clue-panel">
      <div class="clue-header">
        <span class="clue-category">${escapeHtml(currentClue.categoryName)}</span>
        <span class="clue-value">${isDailyDouble ? '<span class="clue-value-tag">Wager</span> ' : ''}$${formatMoney(displayValue)}</span>
      </div>
      ${currentClue.categoryNote ? `<p class="clue-note">${escapeHtml(currentClue.categoryNote)}</p>` : ''}
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
    </div>
    ${stageHost('thinking', true)}
  `;
}

function showFeedback(html) {
  const feedback = document.getElementById('clue-feedback');
  if (!feedback) return;
  feedback.innerHTML = html;
  feedback.classList.add('show');
  // the result must never sit below the fold: bring Continue into view
  const last = feedback.querySelector('.feedback-actions') || feedback;
  requestAnimationFrame(() => last.scrollIntoView?.({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
  if (prefersReducedMotion()) return;
  const parts = feedback.querySelectorAll('.verdict, .verdict-score, .answer-key, .streak-callout, .correct-response, .feedback-actions');
  if (parts.length) animate(parts, { opacity: [0, 1], y: [10, 0] }, { duration: 0.32, ease: EXPO, delay: stagger(0.07) });
  const fig = feedback.querySelector('.verdict-fig');
  // on a phone his face reacts in the verdict picture; without a film the still pose makes its move
  if (fig && !(fig.offsetWidth > 1 && fig.dataset.film && playFilm(fig, fig.dataset.film))) hostMove(fig.querySelector('img'), fig.dataset.move);
  const score = feedback.querySelector('.verdict-score span');
  if (score) animate(score, { scale: [0.6, 1] }, { type: 'spring', stiffness: 520, damping: 17, delay: 0.07 });
}

/** The answer line itself says how it went: jade when right, a shake and red when wrong. */
function markAnswer(correct) {
  const input = document.getElementById('answer-input');
  if (!input) return;
  input.classList.remove('is-right', 'is-wrong');
  input.classList.add(correct ? 'is-right' : 'is-wrong');
  if (!correct && !prefersReducedMotion()) animate(input, { x: [0, -9, 8, -6, 4, 0] }, { duration: 0.4, ease: 'easeOut' });
}

/** Brief full-screen tint for a juicy correct/wrong beat. */
function flashScreen(kind) {
  markAnswer(kind === 'correct');
  const el = document.createElement('div');
  el.className = `screen-flash ${kind}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 550);
}

/** Campaign Momentum callout when a streak pays extra. */
function bonusHtml(result) {
  let html = '';
  if (result.bonus) html += `<div class="streak-callout">Campaign Momentum &middot; ${result.streak} in a row &middot; +$${formatMoney(result.bonus)}</div>`;
  if (result.legion) html += `<div class="streak-callout legion-callout">Légion d&rsquo;honneur &middot; ${LEGION_CLUES} chapter clues &middot; +$${formatMoney(result.legion)}</div>`;
  return html;
}

// — Turns mode (and daily doubles in any mode) —

function renderTurnsClue() {
  const { players, answeringPlayer, gameMode, currentClue } = getState();

  app.innerHTML = clueShell(`
    <div class="clue-player">
      ${players.length > 1 && portraitUrl(players[answeringPlayer].character) ? `<span class="clue-player-face">${avatarHtml(players[answeringPlayer], answeringPlayer)}</span>` : ''}
      ${players.length > 1 ? `<span>${escapeHtml(players[answeringPlayer].name)}'s ${currentClue.isDailyDouble && gameMode === 'buzz' ? 'Waterloo Wager' : 'turn'}</span>` : ''}
    </div>
    <div class="clue-answer-area">
      <input type="text" id="answer-input" class="answer-input"
             placeholder="What is…" autocomplete="off">
      <div class="clue-buttons">
        <button class="btn-submit" id="btn-submit">Submit</button>
        <button class="btn-skip" id="btn-skip">Pass</button>
      </div>
    </div>
  `);

  startTimer(getState().clueSeconds || 30, handleTimeExpired);
  clueShownAt = Date.now();

  // He remarks on the pick, briefly, then lets you think
  const { cluesAnswered, totalClues, categories } = getState();
  const top = Math.max(...categories.flatMap(c => c.clues.map(cl => cl.value)));
  const remark = totalClues - cluesAnswered === 1 ? pick(LAST_CLUE_LINES)
    : !currentClue.isDailyDouble && currentClue.value === top ? pick(BIG_PICK_LINES) : '';
  if (remark) {
    hostSay(remark);
    setTimeout(() => { if (shownScreen === 'clue' && !document.querySelector('#clue-feedback.show') && !urgentShown) hostSay(''); }, 2400);
  }

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
  if (!input || input.disabled) return;
  const answer = input.value.trim();
  if (!answer) return;

  stopTimer();
  input.disabled = true;
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-skip').disabled = true;

  const { currentClue, players, answeringPlayer } = getState();
  const wager = !!currentClue.isDailyDouble;
  const streakBefore = players[answeringPlayer].streak;
  const seconds = (Date.now() - clueShownAt) / 1000;

  const judge = () => {
    if (shownScreen !== 'clue') return;
    const result = submitAnswer(answer);
    if (!result) return;
    flashScreen(result.correct ? "correct" : "wrong");

    if (result.correct) {
      showFeedback(`
        <div class="feedback-correct">
          ${verdict('correct', correctLine(result, { wager, seconds }), { big: wager || result.streak >= 3 })}
          <div class="verdict-score">${icon('check')}<span>+$${formatMoney(result.value)}</span></div>
          ${answerKey(result)}
          ${bonusHtml(result)}
        </div>
      `);
      scheduleReturn(result.bonus ? 3000 : 2600);
    } else {
      showFeedback(`
        <div class="feedback-wrong">
          ${verdict('wrong', wrongLine({ wager, streakBefore }), { big: wager || streakBefore >= 3 })}
          <div class="verdict-score">${icon('cross')}<span>-$${formatMoney(result.value)}</span></div>
          <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
          <div class="feedback-actions">
            <button class="btn-feedback-continue" id="btn-fb-continue">Continue</button>
            <button class="btn-feedback-accept" id="btn-fb-accept">The Emperor accepts it</button>
          </div>
        </div>
      `);
      document.getElementById('btn-fb-continue').addEventListener('click', () => {
        lastScreen = null; returnToBoard();
      });
      document.getElementById('btn-fb-accept').addEventListener('click', handleOverride);
    }
  };

  // A wager is a big moment, and a big moment gets a windup: he weighs the answer first
  if (wager && !prefersReducedMotion()) {
    hostReact('suspicious', { move: 'lean', say: 'Hm.' });
    showFeedback(`<figure class="verdict">
        ${verdictFig('face-stern', 'suspicious', 'lean', false)}
        <figcaption>Hm.</figcaption>
      </figure>`);
    setTimeout(judge, 750);
  } else {
    judge();
  }
}

function handleOverride() {
  const result = overrideCorrect();
  if (!result) return;
  markAnswer(true);
  showFeedback(`
    <div class="feedback-correct">
      ${verdict('pardon', 'Very well. The Emperor accepts it.')}
      <div class="verdict-score">${icon('check')}<span>+$${formatMoney(result.value)}</span></div>
      <div class="correct-response">Penalty refunded</div>
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
      ${verdict('pass', pick(PASS_LINES))}
      <div class="correct-response">The correct response: <strong>${escapeHtml(result.correctResponse)}</strong></div>
    </div>
  `);
  scheduleReturn(2500);
}

// — Buzz mode —

function renderBuzzClue() {
  const { currentClue } = getState();

  app.innerHTML = clueShell(`
    <div class="buzz-status" id="buzz-status" title="Space to open buzzers">Read the clue&hellip; <span class="buzz-skip-hint">${touchOnly() ? '(tap here to open the buzzers)' : '(space opens the buzzers)'}</span></div>
    <div class="clue-answer-area" id="answer-area" style="display:none">
      <div class="clue-player" id="answering-name"></div>
      <input type="text" id="answer-input" class="answer-input"
             placeholder="What is…" autocomplete="off">
      <div class="clue-buttons">
        <button class="btn-submit" id="btn-submit">Submit</button>
      </div>
    </div>
    <div class="buzzer-row waiting" id="buzzer-row"></div>
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
      <span class="buzzer-name">${escapeHtml(p.name)}</span>
      <span class="buzzer-key">${buzzAttempted[i] ? icon('cross') : touchOnly() ? 'Tap' : `Any key, ${BUZZ_HINTS[i] || ''}`}</span>
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
    if (e.metaKey || e.ctrlKey) return; // leave browser shortcuts alone
    const idx = buzzSide(e.code);
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
    status.innerHTML = 'BUZZ IN!';
    status.classList.add('open');
  }
  document.getElementById('buzzer-row')?.classList.remove('waiting');
  hostReact('welcome', { say: 'Well? Who dares?' });
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
  hostReact('choose', { move: 'lean', say: `${players[playerIndex].name}. Speak.` });

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
    `<span class="buzzed-flash" style="--pc: ${PLAYER_COLORS[playerIndex]}">${escapeHtml(players[playerIndex].name)} buzzed in!</span>`;

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
        ${verdict('correct', correctLine(result), { big: result.streak >= 3 })}
        <div class="verdict-score">${icon('check')}<span>+$${formatMoney(result.value)}</span></div>
        ${answerKey(result)}
        ${bonusHtml(result)}
      </div>
    `);
    scheduleReturn(result.bonus ? 3000 : 2600);
    return;
  }

  // Wrong (or silent) — maybe others can still steal it
  const header = timedOut
    ? `${verdict('timeout', pick(TIMEOUT_LINES))}<div class="verdict-score">${icon('clock')}<span>-$${formatMoney(result.value)}</span></div>`
    : `${verdict('wrong', pick(WRONG_LINES))}<div class="verdict-score">${icon('cross')}<span>-$${formatMoney(result.value)}</span></div>`;

  if (result.canRebuzz) {
    showFeedback(`
      <div class="feedback-wrong">
        ${header}
        <div class="correct-response">${pick(STEAL_LINES)} ${result.remaining} player${result.remaining > 1 ? 's' : ''} can buzz.</div>
        <div class="feedback-actions">
          <button class="btn-feedback-continue" id="btn-fb-continue">Open buzzers</button>
          ${timedOut ? '' : `<button class="btn-feedback-accept" id="btn-fb-accept">The Emperor accepts it</button>`}
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
          ${timedOut ? '' : `<button class="btn-feedback-accept" id="btn-fb-accept">The Emperor accepts it</button>`}
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
  document.getElementById('answer-input')?.classList.remove('is-right', 'is-wrong');

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
      ${verdict('pass', pick(NOBUZZ_LINES))}
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
    ${sceneShapes('wager')}
    <div class="daily-double-screen">
      <div class="dd-flash">
        <div class="dd-title">Waterloo Wager</div>
        ${hostLine('Name your stake. I am watching.', 'Napoleon', 'suspicious')}
      </div>
      <div class="dd-content">
        <div class="dd-category">${escapeHtml(currentClue.categoryName)}${currentClue.categoryNote ? `<span class="dd-note">${escapeHtml(currentClue.categoryNote)}</span>` : ''}</div>
        <div class="dd-player">${escapeHtml(player.name)}</div>
        <div class="dd-score">Current score: $${formatMoney(player.score)}</div>
        <div class="dd-wager-area">
          <label for="wager-input">Your wager</label>
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
            <button class="btn-preset" data-amount="${maxWager}">All in</button>
          </div>
          <button class="btn-wager-submit" id="btn-wager">Lock in wager</button>
        </div>
      </div>
    </div>
    ${stageHost('suspicious')}
  `;

  const input = document.getElementById('wager-input');
  input.focus();
  input.select();

  // He has an opinion about the size of the stake
  const TAKES = {
    all: ['shocked', 'surprised', 'recoil', 'All of it? Even I kept a reserve.'],
    bold: ['hands-on-hips', 'smirk', 'settle', 'Now that is a wager.'],
    small: ['arms-crossed', 'annoyed', 'refuse', 'A skirmish, then. Very well.'],
  };
  let take = null;
  const react = () => {
    const amount = parseInt(input.value) || 0;
    const next = amount >= maxWager ? 'all' : amount >= maxWager / 2 ? 'bold' : 'small';
    if (next === take) return;
    take = next;
    const [pose, face, move, line] = TAKES[next];
    hostReact(pose, { move });
    setFace(document.querySelector('.dd-flash .host-face'), face);
    const words = document.querySelector('.dd-flash .host-words');
    if (words) {
      words.textContent = line;
      if (!prefersReducedMotion()) animate(words, { opacity: [0, 1], y: [6, 0] }, { duration: 0.25, ease: EXPO });
    }
  };
  input.addEventListener('input', react);

  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.amount;
      react();
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
    ${sceneShapes('round')}
    <div class="transition-screen fin" data-step="round">
      <h1 class="end-title">Round II<span class="logo-dot" aria-hidden="true">.</span></h1>
      <div class="fin-panel">
        <p class="fin-label">End of Round I</p>
        <ul class="fin-standings">
          ${players.map((p, i) => `
            <li>
              ${faceChip(p, i)}
              <span class="fin-standing-name">${escapeHtml(p.name)}</span>
              <span class="fin-standing-money ${p.score < 0 ? 'negative' : ''}">${money(p.score)}</span>
            </li>
          `).join('')}
        </ul>
        <p class="fin-doubled">All values are doubled.${getState().campaign ? ' Napoleon&rsquo;s own chapter joins the board.' : ''}</p>
        ${players.length > 1 ? `<p class="fin-stake"><strong>${escapeHtml(players[lowest].name)}</strong> is trailing and gets first pick.</p>` : ''}
        <button class="btn-continue" id="btn-continue">March on</button>
      </div>
    </div>
    ${stageHost('marching')}
  `;
  hostReact('marching', { move: 'march' });

  sounds.playRoundTransition();

  document.getElementById('btn-continue').addEventListener('click', () => {
    boardRevealDone = false;
    startDoubleJeopardy();
  });
}

// ——— Final Jeopardy ———

/** Free play ends at Waterloo; a chapter ends at its own decisive hour. */
function finalHeader() {
  const { campaign } = getState();
  return campaign ? 'The Decisive Hour' : 'Waterloo';
}

/** One frame for every step of the final: the title in the name's face over one white panel. */
function finalShell(step, inner, hostPose) {
  return `
    ${sceneShapes('final')}
    <div class="final-screen fin" data-step="${step}">
      <h1 class="fin-title">${finalHeader()}<span class="logo-dot" aria-hidden="true">.</span></h1>
      <div class="fin-panel">${inner}</div>
    </div>
    ${stageHost(hostPose)}
  `;
}

/** A player's small round face (or their initial) for a row. */
function faceChip(p, i) {
  return `<span class="fin-face ${portraitUrl(p.character) ? 'has-portrait' : ''}" style="--pc: ${PLAYER_COLORS[i]}">${avatarHtml(p, i)}</span>`;
}

function renderFinalCategory() {
  const { finalClue, players } = getState();
  const solo = players.length === 1;

  app.innerHTML = finalShell('category', `
      <p class="fin-label">The final battlefield</p>
      <h2 class="fin-category">${escapeHtml(finalClue.name)}</h2>
      <ul class="fin-standings">
        ${players.map((p, i) => `
          <li>
            ${faceChip(p, i)}
            <span class="fin-standing-name">${escapeHtml(p.name)}</span>
            <span class="fin-standing-money ${p.score < 0 ? 'negative' : ''}">${money(p.score)}</span>
          </li>
        `).join('')}
      </ul>
      ${hostLine(getState().campaign ? 'One question. The chapter turns on it.' : 'Waterloo. Where everything is decided.')}
      <button class="btn-continue" id="btn-final-wager">${solo ? 'Place your wager' : 'Place wagers'}</button>
  `, 'hands-on-hips');

  sounds.playFanfare();

  document.getElementById('btn-final-wager').addEventListener('click', () => {
    setState({ screen: 'final-wager' });
  });
}

// A "hand the device to X" cover so nobody sees the next player's secret entry.
function passCover(playerIdx, sub, onReady) {
  const p = getState().players[playerIdx];
  app.innerHTML = finalShell('pass', `
      <div class="fin-pass">
        ${faceChip(p, playerIdx)}
        <h2 class="fin-pass-name">Pass the device to ${escapeHtml(p.name)}</h2>
        <p class="fin-pass-sub">${sub}</p>
        <button class="btn-cta pass-go" id="pass-go">I'm ${escapeHtml(p.name)}, ready</button>
      </div>
  `, 'pivot');
  const go = document.getElementById('pass-go');
  go.focus();
  go.addEventListener('click', onReady);
}

function renderFinalWager() {
  const { players, finalClue } = getState();
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
    app.innerHTML = finalShell('wager', `
        <span class="clue-category">${escapeHtml(finalClue.name)}</span>
        <div class="fin-who">
          ${faceChip(p, idx)}
          <span><strong>${escapeHtml(p.name)}</strong>, you have ${money(p.score)}</span>
        </div>
        <div class="dd-wager-area fin-wager">
          <label for="wager-input">${solo ? 'Your wager' : 'Your secret wager'}</label>
          <div class="wager-input-row">
            <span class="wager-dollar">$</span>
            <input type="number" id="wager-input" class="wager-input" min="0" max="${maxW}" value="${Math.min(1000, maxW)}" step="100" inputmode="numeric">
          </div>
          <div class="wager-range">$0 to $${formatMoney(maxW)}</div>
          <div class="wager-presets">
            <button class="btn-preset" data-amount="0">Nothing</button>
            <button class="btn-preset" data-amount="${Math.floor(maxW / 2)}">Half</button>
            <button class="btn-preset" data-amount="${maxW}">All in</button>
          </div>
          <button class="btn-wager-submit" id="btn-lock">${qi < queue.length - 1 ? 'Lock in and pass' : 'Lock in wager'}</button>
        </div>
    `, 'suspicious');
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
  // The clue keeps its place and its size from the first reading to the last answer.
  const clueHead = `
      <span class="clue-category">${escapeHtml(finalClue.name)}</span>
      <div class="fin-clue">${escapeHtml(finalClue.clue)}</div>`;
  const stake = solo
    ? (finalWagers[0] > 0 ? `${money(finalWagers[0])} rides on this.` : 'Nothing staked. Answer for honour.')
    : 'The wagers are locked. Read it together.';

  // Everyone reads the clue together, think music playing.
  app.innerHTML = finalShell('clue', `
      ${clueHead}
      <p class="fin-stake">${stake}</p>
      <button class="btn-submit" id="btn-begin-answers">${solo ? 'Enter answer' : 'Enter answers'}</button>
  `, 'thinking');

  document.getElementById('btn-begin-answers').addEventListener('click', () => {
    if (queue.length === 0) { music.stop(); submitFinalAnswers(answers); return; }
    let qi = 0;
    const nextAnswer = () => {
      if (qi >= queue.length) { music.stop(); submitFinalAnswers(answers); return; }
      const idx = queue[qi];
      if (solo) answerEntry(idx);
      else passCover(idx, 'Type your response (no peeking!)', () => answerEntry(idx));
    };
    function answerEntry(idx) {
      const p = players[idx];
      app.innerHTML = finalShell('answer', `
          ${clueHead}
          <div class="final-answer-form fin-answer">
            <label class="fin-answer-label" for="final-answer-input" style="--pc:${PLAYER_COLORS[idx]}">${solo ? 'Your response' : `${escapeHtml(p.name)}, your response`}</label>
            <input type="text" id="final-answer-input" class="answer-input" placeholder="What is…" autocomplete="off">
            <button class="btn-submit" id="btn-lock-answer">${qi < queue.length - 1 ? 'Lock in and pass' : solo ? 'Reveal answer' : 'Reveal answers'}</button>
          </div>
      `, 'thinking');
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
  const played = i => finalWagers[i] > 0 || finalAnswers[i].answer;

  app.innerHTML = finalShell('reveal', `
      <p class="fin-label">The correct response</p>
      <div class="fin-response">${escapeHtml(finalClue.response)}</div>
      <ul class="fin-rows">
        ${players.map((p, i) => `
          <li class="fin-row ${played(i) ? (finalAnswers[i].correct ? 'correct' : 'wrong') : 'sat-out'}">
            ${faceChip(p, i)}
            <div class="fin-row-main">
              <strong class="fin-row-name">${escapeHtml(p.name)}</strong>
              <span class="fin-said">${played(i) ? `&ldquo;${escapeHtml(finalAnswers[i].answer || 'no answer')}&rdquo;` : 'Nothing to stake'}</span>
            </div>
            <div class="fin-row-nums">
              <span class="fin-delta">${finalWagers[i] > 0 ? `${finalAnswers[i].correct ? '+' : '&minus;'}$${formatMoney(finalWagers[i])}` : played(i) ? '$0' : 'Sat out'}</span>
              <span class="fin-total">${flowMoney(p.score, p.score + (finalAnswers[i].correct ? -1 : 1) * finalWagers[i])}</span>
            </div>
            ${played(i) ? `
              <button class="btn-final-override" data-player="${i}">
                ${finalAnswers[i].correct ? 'Mark wrong' : 'The Emperor accepts it'}
              </button>
            ` : ''}
          </li>
        `).join('')}
      </ul>
      <button class="btn-continue" id="btn-show-results">Final scores</button>
  `, finalAnswers.some(a => a.correct) ? 'victory' : 'defeated');
  const finalWon = finalAnswers.some(a => a.correct);
  hostReact(finalWon ? 'victory' : 'defeated', { move: finalWon ? 'hop' : 'settle', film: finalWon ? 'fist' : 'shrug' });

  // The reveal, one player at a time
  const revealRows = document.querySelectorAll('.fin-row');
  if (!prefersReducedMotion() && revealRows.length) {
    animate(revealRows, { opacity: [0, 1], y: [16, 0] }, { duration: 0.4, ease: EXPO, delay: stagger(0.45, { startDelay: 0.35 }) });
  }
  flowNumbers(500 + 450 * Math.max(0, revealRows.length - 1));

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
  { letter: 'S', title: 'Grand Champion', acc: 0.9, full: 22, quick: 12 },
  { letter: 'A', title: 'Tournament Ready', acc: 0.8, full: 17, quick: 9 },
  { letter: 'B', title: 'Sharp Contender', acc: 0.65, full: 12, quick: 6 },
  { letter: 'C', title: 'Warming Up', acc: 0.5, full: 8, quick: 4 },
  { letter: 'D', title: 'Rookie Round', acc: 0, full: 0, quick: 0 },
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
      let hint = null;
      if (next) {
        const more = next[len] - p.correct, pct = Math.round(next.acc * 100);
        const needs = [];
        if (more > 0) needs.push(`${more} more correct`);
        if (acc < next.acc) needs.push(`${pct}% accuracy (you hit ${Math.round(acc * 100)}%)`);
        hint = `Rank ${next.letter} needs ${needs.join(' and ') || `${next[len]}+ correct at ${pct}% accuracy`}`;
      }
      return { ...t, next: hint };
    }
  }
}

function chapterOutcomeHtml() {
  const { campaign, chapterOutcome } = getState();
  if (!campaign || !chapterOutcome) return '';
  const ch = campaign.chapter;
  const o = chapterOutcome;
  const losses = empireLosses(ch);
  let body;
  if (o.won) {
    const parts = [];
    if (o.gained.length) parts.push(`The Empire grows: ${o.gained.map(escapeHtml).join(', ')}.`);
    if (losses.length) parts.push(`History takes its due: ${losses.map(escapeHtml).join(', ')}.`);
    if (!parts.length) parts.push('The Empire holds its ground.');
    body = parts.join(' ');
  } else {
    body = `The table needed ${money(o.target)} and reached ${money(o.topScore)}. Regroup and refight this chapter${o.attempts >= 2 ? '' : '. After two setbacks the target eases'}.`;
  }
  return `
    <div class="chapter-outcome ${o.won ? 'won' : 'lost'}">
      <div class="chapter-kicker">Chapter ${ch.number} &middot; ${escapeHtml(ch.title)} &middot; ${escapeHtml(ch.years)}</div>
      <div class="co-title">${o.won ? 'Victory: the Campaign advances' : 'Setback: the chapter holds'}</div>
      <div class="co-body">${body}</div>
      ${o.won && o.next ? `<div class="co-next">Next: Chapter ${o.next.number} &middot; ${escapeHtml(o.next.title)} (${escapeHtml(o.next.years)})</div>` : ''}
      ${o.campaignComplete ? '<div class="co-next">The Campaign is complete, from Ajaccio to Saint Helena. Replay any chapter from the setup screen.</div>' : ''}
    </div>
  `;
}

// His last word on the game, by how it went. Dealt like every other deck of his lines.
const END_LINES = {
  S: ['I have crowned myself for less.', 'Take the throne. I shall stand, this once.', 'Flawless. I suspect you of cheating, and I approve.'],
  A: ['There is a marshal’s baton in your knapsack.', 'One more campaign like that and I will learn your name.', 'Très bien. The Old Guard would have you.'],
  B: ['Promising. I have promoted worse.', 'You hold the field. Barely, but you hold it.', 'A respectable day. Do not let it be your best.'],
  C: ['A skirmish, not a victory. Again.', 'You survived. That is where every campaign begins.', 'The ground was won slowly. It still counts.'],
  D: ['We shall call that reconnaissance.', 'I have seen retreats with more dignity.', 'History will not mention today. You are welcome.'],
  rout: ['Not since Austerlitz have I seen such form.', 'That was not a contest. That was an annexation.', 'One of you came to play. The other came to watch.'],
  close: ['Decided by a whisker. My favourite kind of war.', 'A near-run thing. I know the feeling.', 'So close. One answer, and history reads differently.'],
  win: ['The field is yours. Be gracious about it. Or do not.', 'A clean victory. Send word to Paris.', 'Well fought. The loser buys the wine.'],
  tie: ['A draw. The diplomats will be thrilled.', 'Nobody wins. How very Congress of Vienna.', 'Evenly matched. Settle it again, at once.'],
};
let endLine = null; // one line per game, so a second look at the page does not change his mind

/** A player standing in their arch on the results page: full length, as on the table. */
function endPlayerHtml(p, { winner, place, solo, rank }) {
  const c = characterById(p.character);
  const pose = c && (winner ? c.poseUrls.victory : c.poseUrls.thinking || c.poseUrls.ready);
  return `
    <figure class="end-player ${winner ? 'is-winner' : ''}" data-place="${place}" style="--pc: ${PLAYER_COLORS[p.originalIndex]}${c ? `; --tone: ${c.tone}` : ''}">
      <div class="end-fig">
        ${c ? `<img class="end-fig-img" src="${pose}" alt="${escapeHtml(c.name)}" draggable="false">`
          : `<span class="end-seal" aria-hidden="true">${escapeHtml(monogram(p.name, p.originalIndex))}</span>`}
        ${solo ? `<span class="end-rank" aria-label="Rank ${rank.letter}"><small>Rank</small>${rank.letter}</span>` : ''}
      </div>
      <figcaption>
        <span class="end-name">${escapeHtml(p.name)}</span>
        <span class="end-money ${p.score < 0 ? 'negative' : ''}">${flowMoney(p.score, 0)}</span>
      </figcaption>
    </figure>`;
}

function renderResults() {
  const { players, gameLength, campaign, missed = [] } = getState();
  const rec = loadRecords();
  const prevBest = rec.best ? rec.best.score : null;
  const firstLook = !recordedThisGame;
  if (firstLook) { recordGame(players); recordedThisGame = true; }
  const ranked = players
    .map((p, originalIndex) => ({ ...p, originalIndex }))
    .sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const isTie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  const solo = players.length === 1;
  const rank = solo ? soloRank(winner, gameLength) : null;
  const newBest = solo && winner.score > 0 && (prevBest === null || winner.score > prevBest);
  const lead = solo ? 0 : winner.score - ranked[1].score;

  // On the stage the winner stands in the middle of three, or last of two (next to Napoleon)
  const stageOrder = ranked.length === 3 ? [ranked[1], ranked[0], ranked[2]]
    : ranked.length === 2 ? [ranked[1], ranked[0]]
    : [ranked[0]];
  const hostPose = solo && winner.score <= 0 ? 'shrug' : isTie ? 'welcome' : 'victory';
  const sour = solo && (winner.score <= 0 || rank.letter === 'D');
  if (firstLook || !endLine) {
    const key = solo ? (winner.score <= 0 ? 'D' : rank.letter)
      : isTie ? 'tie'
      : winner.score > 0 && ranked[1].score <= winner.score / 2 ? 'rout'
      : lead <= Math.max(400, winner.score * 0.1) ? 'close' : 'win';
    endLine = pick(END_LINES[key]);
  }
  const title = solo ? rank.title : isTie ? 'It’s a tie' : `${escapeHtml(winner.name)} wins`;
  const facts = solo
    ? [rank.next ? escapeHtml(rank.next) : 'The top rank. Nothing left to prove.']
    : isTie ? [`Level at ${money(winner.score)}`] : [`Ahead by ${money(lead)}`];

  app.innerHTML = `
    ${sceneShapes('results')}
    <div class="results-screen end" data-players="${players.length}">
      <header class="end-head">
        <h1 class="end-title">${title}<span class="logo-dot" aria-hidden="true">.</span></h1>
        ${newBest ? '<p class="end-best">New personal best</p>' : ''}
        <p class="end-facts">${facts.join(' ')}</p>
      </header>
      ${chapterOutcomeHtml()}
      <div class="end-stage">
        <div class="end-cast">
          ${stageOrder.map(p => endPlayerHtml(p, {
            winner: solo ? !sour : p.score === winner.score,
            place: ranked.indexOf(p) + 1, solo, rank,
          })).join('')}
        </div>
        ${hostFigure(hostPose, 'results-host', { alt: hostPose === 'victory' ? 'Napoleon raises a fist in triumph' : hostPose === 'shrug' ? 'Napoleon shrugs' : 'Napoleon opens a hand to the table' })}
      </div>
      ${hostLine(endLine, 'Napoleon', sour ? 'annoyed' : isTie ? 'puzzled' : 'delighted')}
      <div class="end-stats">
        ${ranked.map(p => {
          const attempts = p.correct + p.wrong;
          const accuracy = attempts > 0 ? Math.round((p.correct / attempts) * 100) : 0;
          return `
            <div class="end-stat-row" style="--pc: ${PLAYER_COLORS[p.originalIndex]}">
              ${solo ? '' : `<span class="end-stat-name">${escapeHtml(p.name)}</span>`}
              <span class="end-stat"><b class="stat-good">${p.correct}</b><small>right</small></span>
              <span class="end-stat"><b class="stat-bad">${p.wrong}</b><small>wrong</small></span>
              <span class="end-stat"><b>${accuracy}%</b><small>accuracy</small></span>
              <span class="end-stat"><b>${p.bestStreak >= 2 ? p.bestStreak : '&ndash;'}</b><small>best run</small></span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="results-actions end-actions">
        <button class="btn-play-again" id="btn-play-again">${campaign && getState().chapterOutcome?.won && !getState().chapterOutcome?.campaignComplete ? 'Next chapter' : 'Play again'}</button>
        ${campaign ? '<button class="btn-quiet" id="btn-results-empire">The Empire</button>' : ''}
        <button class="btn-quiet btn-share" id="btn-share">Share result</button>
      </div>
      ${missed.length ? `
      <details class="missed">
        <summary>The ones that got away <span class="missed-count">${missed.length}</span></summary>
        <ol class="missed-list">
          ${missed.map(m => `
            <li>
              <span class="missed-cat">${escapeHtml(m.category)} &middot; $${formatMoney(m.value)}</span>
              <span class="missed-clue">${escapeHtml(m.clue)}</span>
              <strong class="missed-answer">${escapeHtml(m.response)}</strong>
            </li>`).join('')}
        </ol>
      </details>` : ''}
    </div>
  `;

  sounds.playFanfare();
  if (!isTie || ranked[0].score > 0) spawnConfetti();
  flowNumbers(450);
  if (!prefersReducedMotion()) {
    const figs = document.querySelectorAll('.end-player');
    animate(figs, { opacity: [0, 1], y: [22, 0] }, { duration: 0.5, ease: EXPO, delay: stagger(0.12, { startDelay: 0.1 }) });
    const seal = document.querySelector('.end-rank');
    if (seal) animate(seal, { scale: [0, 1], rotate: [-18, 0] }, { type: 'spring', stiffness: 380, damping: 16, delay: 0.75 });
  }
  // he bows to a winner and shrugs at a solo game that ended in the red, then goes back to watching
  preloadFilms([hostPose === 'victory' ? 'bow' : 'shrug']);
  if (hostPose !== 'welcome') setTimeout(() => {
    if (shownScreen === 'results') hostReact(hostPose, { move: hostPose === 'victory' ? 'hop' : 'settle', film: hostPose === 'victory' ? 'bow' : 'shrug' });
  }, 700);

  document.getElementById('btn-play-again').addEventListener('click', () => {
    lastScreen = null;
    boardRevealDone = false;
    prevScores = [];
    prevLeader = null;
    endLine = null;
    resetForNewGame();
  });

  document.getElementById('btn-share').addEventListener('click', () => shareResult(ranked, isTie));
  document.getElementById('btn-results-empire')?.addEventListener('click', () => showEmpire(campaign.chapter));
}

/** Hand a summary of the game to the phone's share sheet, or copy it where there is none. */
function shareResult(ranked, isTie) {
  const medals = ['I', 'II', 'III'];
  const solo = ranked.length === 1;
  const lines = ranked.map((p, i) => `${medals[i] || '•'} ${p.name}: ${money(p.score)}`);
  const rank = solo ? soloRank(ranked[0], getState().gameLength) : null;
  const { campaign, chapterOutcome } = getState();
  const chapterNote = campaign ? `, Chapter ${campaign.chapter.number}, ${campaign.chapter.title}${chapterOutcome?.won ? ', won' : ''}` : '';
  const header = solo ? `${ranked[0].name} hit Rank ${rank.letter} (${rank.title}) on Clue d'État${chapterNote}!`
    : isTie ? `It's a tie on Clue d'État${chapterNote}!` : `${ranked[0].name} won Clue d'État${chapterNote}!`;
  const url = 'https://kellylucas314-cpu.github.io/Jeopardy/';
  const body = `${header}\n${lines.join('\n')}`;
  const text = `${body}\n\nPlay: ${url}`;
  const done = () => showToast('Result copied. Go brag!', 'var(--brass)');
  const copy = () => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  };
  // a phone has a share sheet (Messages, Mail); a laptop gets the clipboard
  if (touchOnly() && navigator.share) {
    navigator.share({ title: 'Clue d’État', text: body, url }).catch((err) => { if (err?.name !== 'AbortError') copy(); });
  } else copy();
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
  const colors = ['#a07430', '#c8a15c', '#c96f52', '#41684e', '#7e2d21', '#2e7078'];
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

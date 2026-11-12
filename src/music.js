/**
 * The music: Kelly's own recording, "One Note Quiz", and only in the final round.
 *
 * It began (Nov 12 2026) as three pieces on the menus and a faint bed under the game. After
 * a night with it she said: "take the music out except for the final ... put the one note
 * there". So the game is quiet, and the one tune arrives with the final category and stays
 * until the answers are locked.
 *
 * Her brief still holds: "not overwhelming.. not annoying... subtle" and "a clear button to
 * turn it off". The file is mastered quiet (-33 LUFS) and 12% slower than she recorded it,
 * it eases in, and there is a breath before it repeats. The level is baked into the file
 * because an iPhone ignores a page's volume setting. A re-mastered file gets a new name
 * (-m3, -m4...) so a browser never plays a cached older one.
 *
 * Browsers only let sound start after a tap or a key, so play() before that is remembered
 * and begins on the first one. One <audio> element streams it: nothing is fetched until the
 * music actually starts.
 */

const TRACKS = {
  think: ['./assets/music/one-note-quiz-m3.mp3'],
};
const EASE_IN = 1.8;  // seconds from silence to the (quiet) full level
// ms of rest before the tune comes round again
const BREATH = { think: 1400 };

let musicOn = true;   // the player's Music switch
let unlocked = false; // a tap or a key has happened, so sound may start
let wanted = null;    // what should be playing
let playing = null;   // what is playing
let resting = false;  // paused because the tab is hidden
let el = null;
let turn = -1;        // which of a mode's pieces played last
let fadeTimer = 0;
let breathTimer = 0;
let canFade = null;
let listener = null;

function player() {
  if (el) return el;
  el = new Audio();
  el.preload = 'none';
  el.addEventListener('ended', () => {
    // the piece has ended: breathe, then play the next one (or the same one again)
    playing = null;
    clearTimeout(breathTimer);
    breathTimer = setTimeout(() => { breathTimer = 0; sync(); }, BREATH[wanted] ?? 1400);
  });
  el.addEventListener('error', () => { playing = null; }); // a missing file means silence, not a crash
  return el;
}

/** An iPhone ignores volume changes; there the music simply starts and stops. */
function fadable(a) {
  if (canFade === null) {
    const was = a.volume;
    a.volume = 0.5;
    canFade = a.volume === 0.5;
    a.volume = was;
  }
  return canFade;
}

function fade(a, to, seconds, done) {
  clearInterval(fadeTimer);
  fadeTimer = 0;
  if (!fadable(a) || seconds <= 0) {
    if (canFade) a.volume = to;
    done?.();
    return;
  }
  const from = a.volume;
  const t0 = performance.now();
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) {
      clearInterval(fadeTimer);
      fadeTimer = 0;
      done?.();
    }
  }, 40);
}

function halt(seconds = 0.4) {
  clearTimeout(breathTimer);
  breathTimer = 0;
  playing = null;
  resting = false;
  if (!el || el.paused) { clearInterval(fadeTimer); fadeTimer = 0; return; }
  const a = el;
  fade(a, 0, seconds, () => a.pause());
}

function begin(mode) {
  const list = TRACKS[mode];
  const a = player();
  clearInterval(fadeTimer);
  fadeTimer = 0;
  clearTimeout(breathTimer);
  breathTimer = 0;
  turn = (turn + 1) % list.length;
  playing = mode;
  resting = false;
  a.src = list[turn];
  if (fadable(a)) a.volume = 0;
  const ease = () => { if (playing === mode) fade(a, 1, EASE_IN); };
  let started;
  try { started = a.play(); } catch { playing = null; return; }
  // refused (the browser wants a firmer tap): forget it, and the next tap tries again
  if (started?.then) started.then(ease).catch(() => { if (playing === mode) { playing = null; turn -= 1; } });
  else ease();
}

function sync() {
  if (!wanted || !musicOn) { if (playing || (el && !el.paused)) halt(); return; }
  if (document.hidden) {
    if (el && !el.paused) { el.pause(); resting = true; }
    return;
  }
  if (!unlocked) return;
  if (playing === wanted) {
    if (resting) { resting = false; el.play()?.catch?.(() => { playing = null; }); }
    return;
  }
  if (breathTimer) return; // between two pieces
  begin(wanted);
}

/** Ask for music: 'think' (the final round) is the only kind there is. */
export function play(mode) {
  if (!TRACKS[mode]) return;
  if (wanted !== mode) { clearTimeout(breathTimer); breathTimer = 0; }
  wanted = mode;
  sync();
  listener?.();
}

/** Stop the music (with a short fade where the device allows one). */
export function stop(seconds = 0.5) {
  wanted = null;
  halt(seconds);
  listener?.();
}

/** The player's Music switch. */
export function setMusic(on) {
  musicOn = !!on;
  if (!musicOn) halt(0.25);
  else sync();
  listener?.();
}
export function isMusicOn() {
  return musicOn;
}
export function nowPlaying() {
  return playing;
}
/** What was last asked for, playing yet or not: the music button shows while this is set. */
export function asked() {
  return wanted;
}
/** Tell the page when the music is asked for, stopped or switched (it keeps the button right). */
export function onChange(fn) {
  listener = fn;
}

if (typeof window !== 'undefined') {
  const unlock = () => { unlocked = true; sync(); };
  // the events every browser counts as "the person did something"
  for (const type of ['pointerup', 'click', 'keydown', 'touchend']) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
  // rest while the tab is hidden, and pick up where it left off afterwards
  document.addEventListener('visibilitychange', sync);
}

/** Seconds into the current piece (0 when silent); used by the checks. */
export function position() {
  return el && !el.paused ? el.currentTime : 0;
}

/**
 * Sound effects using Web Audio API — no external files needed.
 */

let ctx = null;
let enabled = true;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function ensureResumed() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  return c;
}

export function setEnabled(on) {
  enabled = on;
}

/** The shared audio context, woken if the browser had it asleep (the music plays through it). */
export function audioContext() {
  return ensureResumed();
}

export function isEnabled() {
  return enabled;
}

// A browser keeps a page silent until the first tap or key. Most sounds here answer a tap, so
// they never notice. The ones nobody taps for (the title film) wait for that first touch: it
// wakes the audio here, and until it has they stay quiet instead of piling up and all going
// off at once when the sound does wake.
let woken = false;
if (typeof window !== 'undefined') {
  const types = ['pointerup', 'click', 'keydown', 'touchend'];
  const wake = () => {
    woken = true;
    if (enabled) ensureResumed();
    for (const type of types) window.removeEventListener(type, wake, true);
  };
  for (const type of types) window.addEventListener(type, wake, { capture: true, passive: true });
}

/** May a sound play that nobody tapped for? Only once the browser lets this page be heard. */
function heard() {
  return enabled && woken && ensureResumed().state === 'running';
}

// A shared gentle low-pass keeps everything warm rather than piercing.
let masterFilter = null;
function master() {
  const c = ensureResumed();
  if (!masterFilter) {
    masterFilter = c.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 4200;
    masterFilter.Q.value = 0.4;
    masterFilter.connect(c.destination);
  }
  return masterFilter;
}

/**
 * Play a single tone with a soft attack + smooth release (no clicky edges),
 * routed through the warm master filter.
 */
function playTone(freq, duration, type = 'sine', gain = 0.3, when = 0) {
  if (!enabled) return;
  const c = ensureResumed();
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);

  const attack = Math.min(0.02, duration * 0.25);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);       // soft attack
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);   // smooth release

  osc.connect(g);
  g.connect(master());
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

// A warm chord tone = two detuned oscillators, for body instead of a thin beep.
function playChime(freq, duration, gain = 0.2, when = 0) {
  playTone(freq, duration, 'triangle', gain, when);
  playTone(freq * 2.001, duration * 0.8, 'sine', gain * 0.35, when); // gentle octave shimmer
}

/** Board reveal / category reveal fanfare — warm major arpeggio */
export function playFanfare() {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => playChime(freq, 0.42, 0.16, i * 0.13));
}

/** Clue select — soft muted pluck */
export function playSelect() {
  playTone(587.33, 0.09, 'sine', 0.12);
}

/** Correct answer — bright rising major triad */
export function playCorrect() {
  if (!enabled) return;
  playChime(523.25, 0.16, 0.18, 0);      // C5
  playChime(659.25, 0.16, 0.18, 0.1);    // E5
  playChime(783.99, 0.34, 0.2, 0.2);     // G5
}

/** Wrong answer — soft descending two-note, not a harsh buzz */
export function playWrong() {
  if (!enabled) return;
  playTone(311.13, 0.22, 'sine', 0.16, 0);       // Eb4
  playTone(233.08, 0.34, 'sine', 0.16, 0.16);    // Bb3
}

/** Daily Double reveal — playful bright run */
export function playDailyDouble() {
  if (!enabled) return;
  const notes = [440, 554.37, 659.25, 880, 659.25, 554.37, 440, 554.37, 659.25, 880];
  notes.forEach((freq, i) => playTone(freq, 0.14, 'triangle', 0.16, i * 0.08));
}

/** Timer tick — soft woodblock */
export function playTick() {
  playTone(880, 0.045, 'sine', 0.07);
}

/** Buzz-in — bright confident two-note chirp */
export function playBuzzIn() {
  if (!enabled) return;
  playTone(783.99, 0.07, 'triangle', 0.16, 0);
  playTone(1174.66, 0.13, 'triangle', 0.16, 0.06);
}

/** Buzzed too early — soft low thunk */
export function playLockout() {
  playTone(130.81, 0.16, 'sine', 0.14);
}

/** Buzzers open — quick warm rising sweep */
export function playBuzzersOpen() {
  if (!enabled) return;
  playTone(659.25, 0.08, 'triangle', 0.14, 0);
  playTone(987.77, 0.14, 'triangle', 0.14, 0.07);
}

/** Category intro blip */
export function playCategoryBlip() {
  playTone(698.46, 0.13, 'triangle', 0.1);
}

/** Lead change — a quick regal two-note flourish */
export function playLeadChange() {
  if (!enabled) return;
  playChime(659.25, 0.14, 0.14, 0);
  playChime(987.77, 0.24, 0.16, 0.11);
}

/** Time's up — mellow low tone, not an ear-splitting square */
export function playBuzzer() {
  if (!enabled) return;
  playTone(196, 0.5, 'triangle', 0.16, 0);
  playTone(164.81, 0.5, 'sine', 0.12, 0);
}

/** Round transition dramatic sound */
export function playRoundTransition() {
  if (!enabled) return;
  const notes = [262, 330, 392, 523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.4, 'triangle', 0.15), i * 100);
  });
}

// ---- The title film: Napoleon clears the throne ----------------------------------------------
// Kelly, Nov 12: "when he pushes the thing off the chair i think it should have a sound effect".
// Three small sounds, each fired by the film as it passes the frame (see renderSetup): his hand
// meets the card, the card finds the floor, the crown lands and skips. Made here like the rest,
// so there is nothing to download, and kept soft: a prop falling over, not a crash.

let noiseBuffer = null;
function noiseSource(c) {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  return src;
}

/** A puff of filtered noise: the air of a swish, the pat of card on a floor. */
function playNoise(duration, { filter = 'bandpass', from = 1000, to = from, q = 1, gain = 0.1, attack = 0.004, when = 0 } = {}) {
  const c = ensureResumed();
  const t = c.currentTime + when;
  const src = noiseSource(c);
  const f = c.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  if (to !== from) f.frequency.exponentialRampToValueAtTime(to, t + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(f);
  f.connect(g);
  g.connect(master());
  src.start(t, Math.random() * 0.4);
  src.stop(t + duration + 0.02);
}

/** A struck note: there at once, then falling away. A thump also drops in pitch as it goes. */
function playStrike(freq, duration, { to = freq, gain = 0.1, type = 'sine', when = 0 } = {}) {
  const c = ensureResumed();
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g);
  g.connect(master());
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** The lunge and the shove: the air of his arm coming across, then his hand meeting the card. */
export function playShove() {
  if (!heard()) return;
  playNoise(0.24, { from: 420, to: 2400, q: 0.9, gain: 0.13, attack: 0.11 });
  playStrike(170, 0.15, { to: 70, gain: 0.2, when: 0.13 });
}

/** The card finds the floor on its corner, then slaps flat a moment later. */
export function playCardLand() {
  if (!heard()) return;
  playNoise(0.07, { from: 1900, q: 1.1, gain: 0.13 });
  playStrike(230, 0.07, { to: 140, gain: 0.1 });
  playNoise(0.1, { filter: 'lowpass', from: 1100, q: 0.5, gain: 0.09, when: 0.36 });
}

/** The crown lands, skips twice and rings a little: thin gold on a hard floor. */
export function playCrownLand() {
  if (!heard()) return;
  // one bell-ish clink is a handful of partials that do not line up; each skip is smaller and a touch off the last
  const partials = [[1, 0.085], [1.47, 0.06], [2.09, 0.045], [2.56, 0.03], [3.12, 0.02]];
  const skips = [[0, 1240, 1, 0.46], [0.14, 1300, 0.5, 0.3], [0.24, 1190, 0.28, 0.24]];
  playStrike(420, 0.07, { to: 280, gain: 0.08 });   // the weight of it meeting the floor
  for (const [when, base, level, ring] of skips) {
    playNoise(0.022, { filter: 'highpass', from: 2200, q: 0.6, gain: 0.07 * level, attack: 0.002, when });
    for (const [ratio, gain] of partials) {
      playStrike(base * ratio, ring / Math.sqrt(ratio), { gain: gain * level, when });
    }
  }
  // what is left ringing after it has stopped moving
  playStrike(2592, 0.7, { gain: 0.02, when: 0.26 });
}


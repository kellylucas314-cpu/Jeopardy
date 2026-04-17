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

export function isEnabled() {
  return enabled;
}

function playTone(freq, duration, type = 'sine', gain = 0.3) {
  if (!enabled) return;
  const c = ensureResumed();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

/** Board reveal / category reveal fanfare */
export function playFanfare() {
  if (!enabled) return;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'triangle', 0.2), i * 150);
  });
}

/** Clue select — short blip */
export function playSelect() {
  playTone(880, 0.1, 'sine', 0.15);
}

/** Correct answer */
export function playCorrect() {
  if (!enabled) return;
  playTone(523, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 100);
  setTimeout(() => playTone(784, 0.25, 'sine', 0.2), 200);
}

/** Wrong answer — descending buzz */
export function playWrong() {
  if (!enabled) return;
  playTone(200, 0.5, 'sawtooth', 0.15);
  setTimeout(() => playTone(150, 0.5, 'sawtooth', 0.15), 150);
}

/** Daily Double reveal */
export function playDailyDouble() {
  if (!enabled) return;
  const notes = [440, 554, 659, 880, 659, 554, 440, 554, 659, 880];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, 'triangle', 0.2), i * 80);
  });
}

/** Timer tick */
export function playTick() {
  playTone(1000, 0.05, 'sine', 0.08);
}

/** Time's up buzzer */
export function playBuzzer() {
  if (!enabled) return;
  playTone(150, 0.8, 'square', 0.2);
}

/** Think music for Final Jeopardy — simple melody loop */
let thinkInterval = null;

export function startThinkMusic() {
  if (!enabled) return;
  // Classic think music approximation — repeating pattern
  const melody = [
    392, 440, 392, 330, 392, 440, 392, 0,
    392, 440, 392, 440, 523, 494, 440, 0,
    392, 440, 392, 330, 392, 440, 392, 0,
    330, 349, 330, 294, 262, 294, 330, 0,
  ];
  let i = 0;
  thinkInterval = setInterval(() => {
    if (melody[i] > 0) playTone(melody[i], 0.35, 'triangle', 0.12);
    i = (i + 1) % melody.length;
  }, 400);
}

export function stopThinkMusic() {
  if (thinkInterval) {
    clearInterval(thinkInterval);
    thinkInterval = null;
  }
}

/** Round transition dramatic sound */
export function playRoundTransition() {
  if (!enabled) return;
  const notes = [262, 330, 392, 523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.4, 'triangle', 0.15), i * 100);
  });
}

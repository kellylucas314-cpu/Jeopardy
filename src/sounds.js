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

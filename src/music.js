/**
 * The Clue d'État theme: an original 24-bar march in C, written for this game and played by
 * a small synthesized band (fife, tuba, off-beat chords, snare and bass drum) through the
 * Web Audio API. No audio files. Kelly asked for "a score for the game, very catchy"
 * (Nov 11 2026).
 *
 * Three arrangements of the one tune:
 *   menu    the full band, looping, on the title and the "Who's playing?" table
 *   think   slow and quiet, a music box over a clock tick, while a final answer is weighed
 *   reprise the last eight bars once, for the results page
 *
 * Browsers only let sound start after a tap or a key, so play() before that is remembered
 * and begins on the first one.
 */

import { audioContext, isEnabled } from './sounds.js';

const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const hz = (name) => {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  return 440 * 2 ** ((12 * (Number(m[2]) + 1) + SEMI[m[1]] - 69) / 12);
};

// The tune, a bar per line: note:length in sixteenths (eight to a bar), "-" for a rest.
const TUNE = [
  // A: the call, and its answer
  'E5:3 E5:1 G5:2 E5:2', 'C5:4 D5:2 E5:2', 'F5:3 F5:1 A5:2 F5:2', 'D5:4 -:2 G4:1 G4:1',
  'E5:3 E5:1 G5:2 E5:2', 'C6:4 B5:2 A5:2', 'G5:2 E5:2 F5:2 D5:2', 'C5:4 -:2 G5:1 G5:1',
  // B: the tune leans back, then winds up
  'A5:4 A5:2 G5:2', 'F5:4 E5:4', 'G5:4 G5:2 F5:2', 'E5:4 D5:2 C5:2',
  'A5:4 A5:2 G5:2', 'F5:2 E5:2 D5:2 C5:2', 'D5:3 D5:1 E5:2 F#5:2', 'G5:4 G4:1 G4:1 G4:1 G4:1',
  // A again, with the big finish
  'E5:3 E5:1 G5:2 E5:2', 'C5:4 D5:2 E5:2', 'F5:3 F5:1 A5:2 F5:2', 'D5:4 -:2 G4:1 G4:1',
  'E5:3 E5:1 G5:2 E5:2', 'C6:4 B5:2 A5:2', 'G5:2 A5:2 B5:2 D6:2', 'C6:3 G5:1 C6:2 -:2',
];
// The harmony under it: one chord a bar, or two where the bar turns
const HARMONY = [
  'C', 'C', 'F', 'G', 'C', 'F', 'C G7', 'C',
  'F', 'C', 'G7', 'C', 'F', 'Dm', 'D7', 'G7',
  'C', 'C', 'F', 'G', 'C', 'F', 'G7', 'C',
];
const CHORDS = {
  C: { root: 'C3', fifth: 'G2', tones: ['E4', 'G4', 'C5'] },
  F: { root: 'F2', fifth: 'C3', tones: ['F4', 'A4', 'C5'] },
  G: { root: 'G2', fifth: 'D3', tones: ['D4', 'G4', 'B4'] },
  G7: { root: 'G2', fifth: 'D3', tones: ['F4', 'G4', 'B4'] },
  Dm: { root: 'D3', fifth: 'A2', tones: ['D4', 'F4', 'A4'] },
  D7: { root: 'D3', fifth: 'A2', tones: ['F#4', 'A4', 'C5'] },
};
const BARS = TUNE.length;
const STEPS = BARS * 8;

// One list of events per sixteenth of the tune, worked out once
const SCORE = Array.from({ length: STEPS }, () => ({ lead: null, bass: null, stab: null, kick: false, snare: 0 }));
TUNE.forEach((bar, b) => {
  let at = b * 8;
  for (const tok of bar.split(' ')) {
    const [name, len] = tok.split(':');
    if (name !== '-') SCORE[at].lead = [hz(name), Number(len)];
    at += Number(len);
  }
  const halves = HARMONY[b].split(' ');
  const first = CHORDS[halves[0]];
  const second = CHORDS[halves[1] || halves[0]];
  const s = b * 8;
  SCORE[s].bass = hz(first.root);
  SCORE[s + 4].bass = hz(halves[1] ? second.root : first.fifth);
  SCORE[s + 2].stab = first.tones.map(hz);
  SCORE[s + 6].stab = second.tones.map(hz);
  const last = b === BARS - 1;
  if (last) {
    // the band lands with the tune: ta, da-dum
    for (const [k, v] of [[0, 0.9], [3, 0.6], [4, 1]]) { SCORE[s + k].snare = v; SCORE[s + k].kick = true; }
    SCORE[s + 2].stab = null;
    SCORE[s + 6].stab = null;
    SCORE[s + 4].bass = hz('C3');
  } else {
    SCORE[s].kick = true;
    SCORE[s + 4].kick = true;
    SCORE[s + 2].snare = 0.5;
    if (b % 4 === 3) [0.3, 0.42, 0.58, 0.8].forEach((v, k) => { SCORE[s + 4 + k].snare = v; }); // a roll into the next phrase
    else { SCORE[s + 6].snare = 0.55; SCORE[s + 7].snare = 0.28; }
  }
});

const MODES = {
  menu: { bpm: 116, from: 0, to: STEPS, loop: true, level: 0.62 },
  think: { bpm: 84, from: 0, to: STEPS, loop: true, level: 0.6 },
  reprise: { bpm: 120, from: 16 * 8, to: STEPS, loop: false, level: 0.62 },
};
const stepSeconds = mode => 60 / MODES[mode].bpm / 4;

// ——— the band ———

function envelope(c, out, t, peak, attack, hold, release) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  g.connect(out);
  return g;
}
function voice(c, dest, type, freq, t, end, level = 1) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (level === 1) o.connect(dest);
  else { const g = c.createGain(); g.gain.value = level; o.connect(g); g.connect(dest); }
  o.start(t);
  o.stop(end + 0.03);
  return o;
}
/** The fife: a clear, short-breathed pipe with a little piccolo over it. */
function fife(c, out, freq, t, dur) {
  const g = envelope(c, out, t, 0.12, 0.012, dur * 0.5, Math.max(0.05, dur * 0.36));
  const end = t + dur;
  voice(c, g, 'triangle', freq, t, end);
  voice(c, g, 'square', freq, t, end, 0.16);
  voice(c, g, 'sine', freq * 2, t, end, 0.22);
}
/** The music box of the thinking arrangement: a struck bar that rings on. */
function chime(c, out, freq, t, dur) {
  const ring = Math.max(0.5, dur * 1.5);
  const g = envelope(c, out, t, 0.1, 0.006, 0.02, ring);
  voice(c, g, 'sine', freq, t, t + ring);
  voice(c, g, 'triangle', freq * 2, t, t + ring, 0.18);
}
/** The tuba: round, with an octave on top so a laptop speaker still hears it. */
function tuba(c, out, freq, t, dur, peak = 0.2) {
  const g = envelope(c, out, t, peak, 0.012, dur * 0.4, dur * 0.5);
  voice(c, g, 'triangle', freq, t, t + dur);
  voice(c, g, 'sine', freq * 2, t, t + dur, 0.45);
}
/** The "pah" of the oom-pah: a short chord off the beat. */
function stab(c, out, freqs, t, dur) {
  const g = envelope(c, out, t, 0.042, 0.006, dur * 0.3, dur * 0.5);
  for (const f of freqs) voice(c, g, 'triangle', f, t, t + dur);
}
const noises = new WeakMap();
function noise(c) {
  let buf = noises.get(c);
  if (!buf) {
    buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.25), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noises.set(c, buf);
  }
  return buf;
}
function snare(c, out, t, vel) {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500;
  src.connect(hp);
  hp.connect(envelope(c, out, t, 0.15 * vel, 0.002, 0.008, 0.07));
  src.start(t);
  src.stop(t + 0.12);
  voice(c, envelope(c, out, t, 0.05 * vel, 0.002, 0.005, 0.05), 'triangle', 190, t, t + 0.07);
}
function kick(c, out, t) {
  const g = envelope(c, out, t, 0.24, 0.003, 0.02, 0.13);
  const o = voice(c, g, 'sine', 115, t, t + 0.18);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
}
function tick(c, out, t, high) {
  voice(c, envelope(c, out, t, 0.028, 0.002, 0.004, 0.04), 'sine', high ? 1320 : 990, t, t + 0.06);
}

/** Put one sixteenth of the score on the clock. */
function scheduleStep(c, out, mode, step, t) {
  const s16 = stepSeconds(mode);
  const ev = SCORE[step];
  if (mode === 'think') {
    if (ev.lead) chime(c, out, ev.lead[0], t, ev.lead[1] * s16);
    if (step % 8 === 0 && ev.bass) tuba(c, out, ev.bass, t, s16 * 5, 0.11);
    if (step % 4 === 0) tick(c, out, t, step % 8 === 0);
    return;
  }
  if (ev.lead) fife(c, out, ev.lead[0], t, ev.lead[1] * s16);
  if (ev.bass) tuba(c, out, ev.bass, t, s16 * 2.6);
  if (ev.stab) stab(c, out, ev.stab, t, s16 * 1.3);
  if (ev.kick) kick(c, out, t);
  if (ev.snare) snare(c, out, t, ev.snare);
}

/** Schedule a whole arrangement from t0 (used to render the tune offline in checks). */
export function scheduleAll(c, out, mode, t0 = 0) {
  const { from, to } = MODES[mode];
  for (let step = from; step < to; step++) scheduleStep(c, out, mode, step, t0 + (step - from) * stepSeconds(mode));
  return (to - from) * stepSeconds(mode);
}

// ——— the conductor ———

let musicOn = true;   // the player's Music switch
let unlocked = false; // a tap or a key has happened, so sound may start
let wanted = null;    // what should be playing
let playing = null;   // what is playing
let bus = null;
let timer = 0;
let step = 0;
let nextTime = 0;

const allowed = () => musicOn && isEnabled();

function halt(fade = 0.4) {
  clearInterval(timer);
  timer = 0;
  playing = null;
  if (!bus) return;
  const c = audioContext();
  const old = bus;
  bus = null;
  try {
    old.gain.cancelScheduledValues(c.currentTime);
    old.gain.setValueAtTime(old.gain.value, c.currentTime);
    old.gain.linearRampToValueAtTime(0.0001, c.currentTime + fade);
  } catch { /* the context is gone */ }
  setTimeout(() => { try { old.disconnect(); } catch { /* already gone */ } }, fade * 1000 + 400);
}

function begin(mode) {
  halt(0.2);
  const c = audioContext();
  const m = MODES[mode];
  const warm = c.createBiquadFilter(); // the same gentle roll-off the sound effects use
  warm.type = 'lowpass';
  warm.frequency.value = 5200;
  warm.Q.value = 0.3;
  bus = c.createGain();
  bus.gain.setValueAtTime(m.level, c.currentTime);
  bus.connect(warm);
  warm.connect(c.destination);
  const out = bus;
  playing = mode;
  step = m.from;
  nextTime = c.currentTime + 0.12;
  const pump = () => {
    if (bus !== out) return;
    while (nextTime < c.currentTime + 0.35) {
      scheduleStep(c, out, mode, step, nextTime);
      nextTime += stepSeconds(mode);
      step += 1;
      if (step >= m.to) {
        if (!m.loop) {
          // let the last chord ring, then leave the stage
          clearInterval(timer);
          timer = 0;
          playing = null;
          if (wanted === mode) wanted = null;
          setTimeout(() => { if (bus === out) halt(0.3); }, (nextTime - c.currentTime + 1.2) * 1000);
          return;
        }
        step = m.from;
      }
    }
  };
  timer = setInterval(pump, 70);
  pump();
}

function sync() {
  if (!wanted || !allowed() || document.hidden) { if (playing || bus) halt(); return; }
  if (!unlocked || playing === wanted) return;
  const c = audioContext();
  if (c.state === 'running') begin(wanted);
  else c.resume?.().then(() => { if (wanted && !playing && allowed() && !document.hidden) begin(wanted); }).catch(() => {});
}

/** Ask for an arrangement: 'menu', 'think' or 'reprise'. */
export function play(mode) {
  if (!MODES[mode]) return;
  wanted = mode;
  sync();
}

/** Stop the band (with a short fade). */
export function stop(fade = 0.5) {
  wanted = null;
  halt(fade);
}

/** The player's Music switch. */
export function setMusic(on) {
  musicOn = !!on;
  sync();
}
export function isMusicOn() {
  return musicOn;
}
/** Call when the Sound switch changes, so the band follows it. */
export function refresh() {
  sync();
}
export function nowPlaying() {
  return playing;
}
/** What was last asked for, playing yet or not. */
export function asked() {
  return wanted;
}

if (typeof window !== 'undefined') {
  const unlock = () => { unlocked = true; sync(); };
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true, passive: true });
  // A hidden tab's timers slow to a crawl, which would leave holes in the tune: rest instead.
  document.addEventListener('visibilitychange', sync);
}

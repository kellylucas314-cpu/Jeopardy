/**
 * Napoleon as a live host. One figure on screen whose pose, face and words
 * follow the game: he points at the board, thinks beside a clue, leans in when
 * the clock runs short, celebrates a right answer and recoils from a wrong one.
 *
 * The poses are cut from his character sheets by scripts/build-host-poses.py.
 * A pose change is a cut, like a paper puppet, with one short move after it.
 */
import { animate } from 'motion';
import { POSES } from './host-poses.js';
import { FILMS } from './host-films.js';

export const poseSrc = name => `./assets/host/${name}.webp`;
export const faceSrc = mood => `./assets/host/face-${mood}.webp`;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EXPO = [0.16, 1, 0.3, 1];

/** Height of a pose next to the standing figure, and its width for its height. */
function metrics(pose) {
  const [w, h, k] = POSES[pose] || POSES.neutral;
  return `--k:${k};--ar:${(w / h).toFixed(3)}`;
}

/**
 * The figure. `cls` places it (stage-host, board-fig, results-host); `say` adds
 * the speech bubble he uses on wide screens.
 *
 * Where films can play he is live: he stands with his arms crossed and watches
 * the player, shifts his weight every few seconds, and reacts in film (see the
 * foot of this file). The cut-out poses are for reduced motion, data saver and
 * browsers without WebGL.
 */
export function hostFigure(pose, cls = '', { say = false, alt = '' } = {}) {
  const bubble = say ? '<div class="host-say" aria-hidden="true" hidden></div>' : '';
  if (isLive()) {
    const { k, drop, dx } = FILMS['watch-a'];
    watch();
    return `<div class="host-fig is-live ${cls}" data-pose="watch" style="--fk:${k};--fdrop:${drop};--fdx:${dx}">
      ${bubble}
      <div class="host-body"><img class="host-img" src="${WATCH_STILL}" alt="${alt ? 'Napoleon, arms crossed, watching you' : ''}" draggable="false"></div>
    </div>`;
  }
  const name = POSES[pose] ? pose : 'neutral';
  return `<div class="host-fig ${cls}" data-pose="${name}" style="${metrics(name)}">
      ${bubble}
      <img class="host-img" src="${poseSrc(name)}" alt="${alt}" draggable="false">
    </div>`;
}

/** One short move after a pose change. All transforms; nothing here touches layout. */
const MOVES = {
  settle: img => animate(img, { y: [7, 0], scaleY: [0.965, 1] }, { duration: 0.35, ease: EXPO }),
  // Timings below were set against a frame-by-frame reading of his box on screen.
  // A hop has a windup and a landing: he dips, leaves the ground, and lands with a little give.
  hop: img => animate(img, { y: [0, 6, -36, 0, 0], scaleY: [1, 0.9, 1.05, 0.96, 1] },
    { duration: 0.82, times: [0, 0.17, 0.5, 0.82, 1], ease: ['easeOut', 'easeOut', 'easeIn', 'easeOut'] }),
  // A recoil is thrown back fast and comes forward slowly, or it is over before the eye catches it.
  recoil: img => animate(img, { x: [0, -28, -23, 0], rotate: [0, -4, -3.2, 0] },
    { duration: 0.66, times: [0, 0.15, 0.45, 1], ease: ['easeOut', 'linear', 'easeInOut'] }),
  lean: img => animate(img, { x: [10, 0], scale: [0.97, 1] }, { duration: 0.4, ease: EXPO }),
  refuse: img => animate(img, { rotate: [0, -1.6, 1.4, 0] }, { duration: 0.5, ease: 'easeInOut' }),
  march: img => animate(img, { x: [90, 0], opacity: [0, 1] }, { duration: 0.7, ease: EXPO }),
};

/**
 * He reacts, and optionally says a line. Safe to call when no figure is showing.
 * Live: `film` plays one of Kelly's reaction clips, and he goes back to watching
 * afterwards; without a film he simply keeps watching. Not live: the cut-out
 * pose changes, with one short move.
 */
export function hostReact(pose, { move = 'settle', say, film } = {}) {
  const fig = document.querySelector('.host-fig');
  if (!fig) return;
  if (say !== undefined) hostSay(say);
  if (fig.classList.contains('is-live')) {
    if (film && fig.offsetWidth > 0) playFilm(fig, film, { hold: 1100 });
    return;
  }
  const img = fig.querySelector('.host-img');
  const name = POSES[pose] ? pose : 'neutral';
  if (fig.dataset.pose !== name) {
    fig.dataset.pose = name;
    fig.setAttribute('style', metrics(name));
    img.src = poseSrc(name);
  }
  if (!reduced() && MOVES[move]) MOVES[move](img);
}

/** Play one of the moves on any picture of him (the phone's verdict figure uses this). */
export function hostMove(img, move) {
  if (img && !reduced() && MOVES[move]) MOVES[move](img);
}

/** Put words in his speech bubble (wide screens only; CSS hides it elsewhere). */
export function hostSay(text) {
  const bubble = document.querySelector('.host-fig .host-say');
  if (!bubble) return;
  if (!text) { bubble.hidden = true; return; }
  bubble.textContent = text;
  bubble.hidden = false;
  if (!reduced()) animate(bubble, { opacity: [0, 1], scale: [0.9, 1], y: [8, 0] }, { duration: 0.24, ease: EXPO });
}

/** Swap the small round face beside one of his lines. */
export function setFace(el, mood) {
  if (el) el.src = faceSrc(mood);
}

/** Fetch his faces (and, where he is not live, every pose) once the game is under way, so a reaction never waits on the network. */
let preloaded = false;
export function preloadHost(faces = []) {
  if (preloaded) return;
  preloaded = true;
  const load = () => {
    if (!isLive()) for (const name of Object.keys(POSES)) new Image().src = poseSrc(name);
    for (const mood of faces) new Image().src = faceSrc(mood);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2500 });
  else setTimeout(load, 600);
}

/* — The hat tip on the title page — */

const TIP_SRC = './assets/host/welcome-tip.mp4';
const TIP_SIZE = [528, 756];   // one half of the stacked film (scripts/build-hat-tip.py)
let tip = null;                // the film and its canvas, made on first use
let tipping = false;

/**
 * The film has no see-through background of its own: his colours are in the top
 * half and his outline is a white mask in the bottom half. A small shader puts
 * the two back together on a canvas the size of one half.
 */
function filmStage(size, cls) {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = size;
  canvas.className = cls;
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const shader = (type, source) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    return sh;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `
    attribute vec2 p;
    varying vec2 uv;
    void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D film;
    varying vec2 uv;
    void main() {
      // stay a hair inside each half so one never bleeds into the other
      vec3 colour = texture2D(film, vec2(uv.x, clamp(0.5 + uv.y * 0.5, 0.5015, 0.9985))).rgb;
      float mask = texture2D(film, vec2(uv.x, clamp(uv.y * 0.5, 0.0015, 0.4985))).r;
      float a = clamp((mask - 0.06) / 0.86, 0.0, 1.0);
      gl_FragColor = vec4(colour * a, a);
    }`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  const draw = () => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return { canvas, video, draw };
}

/**
 * He tips his hat, then the still picture takes over again. If the film cannot
 * play (no WebGL, autoplay refused, data saver on) he simply stands there, hat on.
 */
export function tipHat(fig) {
  if (!fig || tipping || reduced() || navigator.connection?.saveData) return;
  try { tip ||= filmStage(TIP_SIZE, 'host-tip'); } catch { tip = null; }
  if (!tip) return;
  const { canvas, video, draw } = tip;
  if (!video.src) video.src = TIP_SRC;
  tipping = true;

  const finish = () => {
    video.pause();
    fig.classList.remove('is-tipping');
    canvas.remove();
    tipping = false;
  };
  const frame = () => {
    if (!tipping) return;
    if (video.ended || !fig.isConnected) return finish();
    if (video.readyState >= 2 && video.currentTime > 0) {
      try { draw(); } catch { return finish(); }
      if (!canvas.isConnected) {
        fig.append(canvas);
        fig.classList.add('is-tipping');
      }
    }
    requestAnimationFrame(frame);
  };

  video.currentTime = 0;
  video.play().then(() => requestAnimationFrame(frame), () => { tipping = false; });
}

/* — Kelly's reaction clips (Nov 11 2026): short films of him cut to his outline, stacked the same
     way as the hat tip (scripts/build-host-films.py). One canvas and one video serve them all.

     The standing host is live. Under everything is one still frame, the one where he looks at
     the player. Every few seconds an idle film leaves that frame and comes back to it. A reaction
     film plays over it, holds its last frame for a moment and fades back to the still. If the
     screen changes mid-film the film moves to the new screen's figure, so he never snaps.

     A face film plays in the small verdict picture on a phone and holds its last frame. — */

const WATCH_STILL = './assets/host/films/watch.webp';
const IDLES = ['watch-a', 'watch-a', 'watch-b', 'watch-c'];   // the plain shift of weight comes up most
export const bustSrc = name => `./assets/host/films/${name}.webp`;

const filmUrl = {};   // name -> a local address, once the film has been fetched
let player = null;    // the shared canvas and video: null until tried, false if this browser cannot
let playing = null;   // { el, name, shown, fading, timer } while a film is on screen or about to be
let live;             // decided once: can he be live here?
let idleFig = null;   // the figure the idle clock was last set for
let idleAt = 0;       // when he may fidget next
let lastIdle = '';
let watching = false;

function stage() {
  if (player === null) {
    try { player = filmStage([480, 656], 'host-film') || false; } catch { player = false; }
  }
  return player || null;
}

/** Films can play here, so the standing host is the live one. */
export function isLive() {
  live ??= !reduced() && !navigator.connection?.saveData && !!stage();
  return live;
}

/** Fetch films ahead of time, in order of need. A film that has not arrived is simply not played. */
export function preloadFilms(names) {
  if (!isLive()) return;
  const wanted = names.filter(n => FILMS[n] && !(n in filmUrl));
  for (const n of wanted) filmUrl[n] = null;
  const next = () => {
    const n = wanted.shift();
    if (!n) return;
    fetch(`./assets/host/films/${n}.mp4`)
      .then(r => (r.ok ? r.blob() : Promise.reject()))
      .then(blob => { filmUrl[n] = URL.createObjectURL(blob); }, () => { delete filmUrl[n]; })
      .then(next);
  };
  next();
}

/** Fetch the still he stands on and his idle films. Called from the title page, so he is ready by the first board. */
export function preloadLive() {
  if (!isLive()) return;
  new Image().src = WATCH_STILL;
  preloadFilms(['watch-a', 'watch-b', 'watch-c']);
}

/** Take the film off the screen at once; the still picture under it shows again. */
export function stopFilm() {
  if (!playing) return;
  const run = playing;
  playing = null;
  clearTimeout(run.timer);
  player.video.pause();
  player.canvas.getAnimations?.().forEach(a => a.cancel());
  run.el.classList.remove('is-filming');
  player.canvas.remove();
}

/** The screen changed under a film of the standing host: move it to the new screen's figure. */
function adopt() {
  const run = playing;
  const fig = run && FILMS[run.name].k && document.querySelector('.host-fig.is-live');
  if (!fig || fig.offsetWidth === 0) return false;
  run.el = fig;
  if (run.shown) {
    fig.querySelector('.host-body').append(player.canvas);
    if (!run.fading) fig.classList.add('is-filming');
    try { player.draw(); } catch { /* the last frame stays as it was */ }
  }
  return true;
}

/** Call right after a screen is drawn, so a film in flight is on the new figure before anyone sees the still. */
export function hostCarry() {
  if (playing && !playing.el.isConnected && !adopt()) stopFilm();
}

/** The film gives way to the still under it. */
function settle(run) {
  if (playing !== run) return;
  if (!run.el.isConnected && !adopt()) return stopFilm();
  run.fading = true;
  run.el.classList.remove('is-filming');
  const end = () => { if (playing === run) { stopFilm(); idleAt = performance.now() + 1700 + Math.random() * 2600; } };
  const fade = player.canvas.animate?.({ opacity: [1, 0] }, { duration: 170, easing: 'ease-out' });
  if (fade) fade.onfinish = end; else end();
}

/**
 * Play a film inside `el` (the standing host, or the verdict picture). Returns
 * false at once if it cannot (not fetched yet, reduced motion, no WebGL), so the
 * caller can fall back to the still picture. `onShow` runs as the first frame
 * appears; `onFail` if the film never gets that far. With `hold` (ms) the last
 * frame stays that long and then gives way to the still; without it, it stays.
 */
export function playFilm(el, name, { hold, onShow, onFail } = {}) {
  const meta = FILMS[name];
  if (!el || !meta || !filmUrl[name] || reduced() || !stage()) return false;
  const { canvas, video, draw } = player;
  // a film already on this figure stays up until the new one has a frame to show
  if (playing && playing.el === el && playing.shown && !playing.fading) {
    clearTimeout(playing.timer);
    video.pause();
  } else {
    stopFilm();
  }
  const run = playing = { el, name, shown: false, fading: false, timer: 0 };
  const fail = () => { if (playing === run) { stopFilm(); onFail?.(); } };
  const show = () => {
    if (!run.shown) {
      if (canvas.width !== meta.w) canvas.width = meta.w;
      if (canvas.height !== meta.h) canvas.height = meta.h;
      canvas.style.cssText = meta.k ? `--fk:${meta.k};--fdrop:${meta.drop};--fdx:${meta.dx}` : '';
    }
    draw();
    if (run.shown) return;
    run.shown = true;
    const home = run.el.querySelector('.host-body') || run.el;
    if (canvas.parentNode !== home) home.append(canvas);
    run.el.classList.add('is-filming');
    onShow?.();
  };
  const frame = () => {
    if (playing !== run) return;
    if (!run.el.isConnected && !adopt()) return stopFilm();
    if (video.readyState >= 2 && video.currentTime > 0) {
      try { show(); } catch { return fail(); }
    }
    if (!video.ended) return requestAnimationFrame(frame);
    if (!run.shown) return fail();
    if (hold !== undefined) run.timer = setTimeout(() => settle(run), hold);
  };
  video.src = filmUrl[name];
  video.play().then(() => requestAnimationFrame(frame), fail);
  setTimeout(() => { if (playing === run && !run.shown) fail(); }, 900);
  return true;
}

/** The idle clock: when he has stood still long enough, he fidgets. */
function watch() {
  if (watching) return;
  watching = true;
  preloadLive();
  setInterval(() => {
    const fig = document.querySelector('.host-fig.is-live');
    const now = performance.now();
    // a figure that has just come on screen fidgets soon, so he is seen to be alive
    if (fig !== idleFig) { idleFig = fig; idleAt = now + 900 + Math.random() * 900; }
    if (!fig || playing || now < idleAt || fig.offsetWidth === 0 || document.hidden) return;
    const ready = IDLES.filter(n => n !== lastIdle && filmUrl[n]);
    idleAt = now + 2500;   // if the film does not start, try again shortly
    if (!ready.length) return;
    lastIdle = ready[Math.floor(Math.random() * ready.length)];
    playFilm(fig, lastIdle, { hold: 0 });
  }, 250);
}

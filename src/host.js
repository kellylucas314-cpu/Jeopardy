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
 * The figure. `cls` places it (stage-host, board-host-fig, results-host);
 * `say` adds the speech bubble he uses on wide screens.
 */
export function hostFigure(pose, cls = '', { say = false, alt = '' } = {}) {
  const name = POSES[pose] ? pose : 'neutral';
  return `<div class="host-fig ${cls}" data-pose="${name}" style="${metrics(name)}">
      ${say ? '<div class="host-say" aria-hidden="true" hidden></div>' : ''}
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
 * Change the pose of the figure on screen, with a move and, optionally, a line.
 * Safe to call when no figure is showing. With `film`, one of Kelly's reaction
 * clips plays in place of the still pose and holds its last frame; if the film
 * cannot play, the still pose and its move stand in. With `until` (seconds) the
 * film hands back to the still pose at that point instead of holding.
 */
export function hostReact(pose, { move = 'settle', say, film, until } = {}) {
  const fig = document.querySelector('.host-fig');
  if (!fig) return;
  const img = fig.querySelector('.host-img');
  const name = POSES[pose] ? pose : 'neutral';
  const stand = () => {
    if (fig.dataset.pose === name) return;
    fig.dataset.pose = name;
    fig.setAttribute('style', metrics(name));
    img.src = poseSrc(name);
  };
  const still = () => { stand(); if (!reduced() && MOVES[move]) MOVES[move](img); };
  if (say !== undefined) hostSay(say);
  stopFilm();
  // the pose under the film changes only once the film covers it, so the old pose never flashes
  if (film && fig.offsetWidth > 0 && playFilm(fig, film, { until, onShow: stand, onFail: still })) return;
  still();
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

/** Fetch every pose and face once the game is under way, so a reaction never waits on the network. */
let preloaded = false;
export function preloadHost(faces = []) {
  if (preloaded) return;
  preloaded = true;
  const load = () => {
    for (const name of Object.keys(POSES)) new Image().src = poseSrc(name);
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
     way as the hat tip (scripts/build-host-films.py). A figure film plays over the standing host;
     a face film plays in the small verdict picture on a phone. One canvas and one video serve
     them all. A film holds its last frame until the next pose, the next film or the next screen. — */

const filmUrl = {};   // name -> a local address, once the film has been fetched
let player = null;    // the shared canvas and video, made on first use
let playing = null;   // { el } while a film is on screen or about to be

/** Fetch films ahead of time, in order of need. A film that has not arrived is simply not played. */
export function preloadFilms(names) {
  if (reduced() || navigator.connection?.saveData) return;
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

/** Take the film off the screen; the still picture under it shows again. */
export function stopFilm() {
  if (!playing) return;
  const { el } = playing;
  playing = null;
  player.video.pause();
  el.classList.remove('is-filming');
  player.canvas.remove();
}

/**
 * Play a film inside `el` (the standing host, or the verdict picture). Returns
 * false at once if it cannot (not fetched yet, reduced motion, no WebGL), so the
 * caller can fall back to the still picture. `onShow` runs as the first frame
 * appears; `onFail` if the film never gets that far. `until` (seconds) takes the
 * film off at that point; without it the last frame holds.
 */
export function playFilm(el, name, { until, onShow, onFail } = {}) {
  const meta = FILMS[name];
  if (!el || !meta || !filmUrl[name] || reduced()) return false;
  try { player ||= filmStage([meta.w, meta.h], 'host-film'); } catch { player = null; }
  if (!player) return false;
  stopFilm();
  const { canvas, video, draw } = player;
  canvas.width = meta.w;
  canvas.height = meta.h;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = meta.k ? `--fk:${meta.k};--fdrop:${meta.drop};--fdx:${meta.dx}` : '';
  const run = playing = { el };
  const fail = () => { if (playing === run) { stopFilm(); onFail?.(); } };
  const frame = () => {
    if (playing !== run) return;
    if (!el.isConnected) return stopFilm();
    if (video.readyState >= 2 && video.currentTime > 0) {
      try { draw(); } catch { return fail(); }
      if (!canvas.isConnected) {
        el.append(canvas);
        el.classList.add('is-filming');
        onShow?.();
      }
    }
    if (until && video.currentTime >= until) return stopFilm();
    if (!video.ended) requestAnimationFrame(frame);
  };
  video.src = filmUrl[name];
  video.play().then(() => requestAnimationFrame(frame), fail);
  setTimeout(() => { if (playing === run && !canvas.isConnected) fail(); }, 700);
  return true;
}

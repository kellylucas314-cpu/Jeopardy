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
 * Safe to call when no figure is showing.
 */
export function hostReact(pose, { move = 'settle', say } = {}) {
  const fig = document.querySelector('.host-fig');
  if (!fig) return;
  const img = fig.querySelector('.host-img');
  const name = POSES[pose] ? pose : 'neutral';
  if (fig.dataset.pose !== name) {
    fig.dataset.pose = name;
    fig.setAttribute('style', metrics(name));
    img.src = poseSrc(name);
  }
  if (say !== undefined) hostSay(say);
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

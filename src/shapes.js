/**
 * Chunky flat shapes, borrowed from kellylucas.dev's sprite: suns, blobs,
 * quatrefoils, asterisks. Colour comes from CSS (`color`), so each screen
 * can paint them in the game's own brass, jade and terracotta.
 */

const SUN_POINTS = (() => {
  const pts = [];
  for (let k = 0; k < 28; k++) {
    const a = (k * Math.PI) / 14 - Math.PI / 2;
    const r = k % 2 === 0 ? 92 : 58;
    pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
})();

const SHAPES = {
  sun: `<polygon fill="currentColor" stroke="currentColor" stroke-width="14" stroke-linejoin="round" points="${SUN_POINTS}"/>`,
  circle: '<circle r="96" fill="currentColor"/>',
  bean: '<path fill="currentColor" d="M-64-46C-40-86 30-94 64-60C94-30 92 24 68 58C42 94-24 96-60 66C-94 40-88-8-64-46Z"/>',
  arch: '<path fill="currentColor" d="M-76 84V-20A76 76 0 0 1 76-20V84Q76 100 60 100H-60Q-76 100-76 84Z"/>',
  quat: '<g fill="currentColor"><circle cx="-40" cy="0" r="42"/><circle cx="40" cy="0" r="42"/><circle cx="0" cy="-40" r="42"/><circle cx="0" cy="40" r="42"/></g>',
  ast: '<g stroke="currentColor" stroke-width="34" stroke-linecap="round"><line x1="0" y1="-72" x2="0" y2="72"/><line x1="-62.4" y1="-36" x2="62.4" y2="36"/><line x1="-62.4" y1="36" x2="62.4" y2="-36"/></g>',
  plus: '<g stroke="currentColor" stroke-width="44" stroke-linecap="round"><line x1="0" y1="-66" x2="0" y2="66"/><line x1="-66" y1="0" x2="66" y2="0"/></g>',
  squig: '<path fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" d="M-82 10 C-70 -40 -42 -40 -36 0 S-6 44 2 0 S38 -44 46 0 S78 40 86 -10"/>',
};

/** An inline SVG shape. Decorative: hidden from assistive tech. */
export function shape(name, cls = '') {
  return `<svg class="shape ${cls}" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">${SHAPES[name] || ''}</svg>`;
}

/**
 * Flat, faceted shapes in the language of the low-poly map: a compass rose,
 * the Légion d'honneur star, a cut facet, and a dotted campaign route with
 * brass pins. Each point is split into a light and a dark half, like the
 * map's own facets. Colour comes from CSS (`color`).
 */

const f = (pts, o = 1) => `<polygon points="${pts}" fill="currentColor"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`;

/** A point from the centre to (r, angle), split down its spine into two facets. */
function spike(r, halfWidth, deg, dark = 1, light = 0.5) {
  const a = (deg * Math.PI) / 180;
  const tip = [r * Math.sin(a), -r * Math.cos(a)];
  const side = d => [halfWidth * Math.sin(a + d), -halfWidth * Math.cos(a + d)];
  const L = side(-Math.PI / 2);
  const R = side(Math.PI / 2);
  const p = q => q.map(n => n.toFixed(1)).join(',');
  return f(`0,0 ${p(tip)} ${p(L)}`, light) + f(`0,0 ${p(tip)} ${p(R)}`, dark);
}

const COMPASS = [
  '<circle r="74" fill="none" stroke="currentColor" stroke-width="4" stroke-opacity="0.55"/>',
  '<circle r="84" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="2 8"/>',
  ...[45, 135, 225, 315].map(d => spike(58, 13, d, 0.75, 0.35)),
  ...[0, 90, 180, 270].map(d => spike(96, 17, d)),
  '<circle r="7" fill="currentColor"/>',
].join('');

const STAR = [0, 72, 144, 216, 288].map(d => spike(94, 34, d, 1, 0.55)).join('') +
  '<circle r="18" fill="currentColor" fill-opacity="0.85"/>';

// A low-poly shard: an irregular hexagon cut into six facets around an off-centre point.
const FACET = (() => {
  const c = '-6,-4';
  const ring = ['-84,-18', '-34,-86', '52,-72', '92,6', '40,84', '-48,72'];
  const tone = [1, 0.62, 0.84, 0.46, 0.74, 0.56];
  return ring.map((p, i) => f(`${c} ${p} ${ring[(i + 1) % ring.length]}`, tone[i])).join('');
})();

const ROUTE =
  '<path d="M-88 58 C-58 4 -22 74 8 14 S62 -50 88 -66" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 13"/>' +
  '<circle cx="-88" cy="58" r="10" fill="currentColor"/><circle cx="8" cy="14" r="10" fill="currentColor"/><circle cx="88" cy="-66" r="10" fill="currentColor"/>';

const SHAPES = { compass: COMPASS, star: STAR, facet: FACET, route: ROUTE };

/** An inline SVG shape. Decorative: hidden from assistive tech. */
export function shape(name, cls = '') {
  return `<svg class="shape ${cls}" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">${SHAPES[name] || ''}</svg>`;
}

/** The loading mark: a still compass rose whose needle settles on north. */
export function compassLoader(cls = '') {
  return `<svg class="shape compass-loader ${cls}" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
    <g class="compass-rose">${COMPASS}</g>
    <g class="compass-needle">
      <polygon points="0,-70 12,0 -12,0" class="needle-north"/>
      <polygon points="0,70 12,0 -12,0" class="needle-south"/>
      <circle r="6" class="needle-pin"/>
    </g>
  </svg>`;
}

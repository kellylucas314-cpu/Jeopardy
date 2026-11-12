/**
 * The map behind "The Empire": a low-poly Europe with one pin per holding,
 * shaped and coloured by its status. Borders of the time are not drawn; a pin
 * stands at the holding's capital or best-known place.
 */
import { MAP_W, MAP_H, LAND, FACETS, PLACES } from './empire-map.js';

const star = (r, r2) => Array.from({ length: 10 }, (_, i) => {
  const a = (Math.PI / 5) * i - Math.PI / 2;
  const d = i % 2 ? r2 : r;
  return `${(d * Math.cos(a)).toFixed(1)},${(d * Math.sin(a)).toFixed(1)}`;
}).join(' ');

/** One mark per status, so the map reads without relying on colour alone. */
const MARKS = {
  core: `<polygon points="${star(13, 5.6)}"/>`,
  annexed: '<circle r="6.5"/>',
  satellite: '<rect x="-5.6" y="-5.6" width="11.2" height="11.2" transform="rotate(45)"/>',
  allied: '<circle r="5.4" class="em-hollow"/>',
  occupied: '<polygon points="0,-7.4 6.8,5 -6.8,5"/>',
  lost: '<path d="M-5 -5 L5 5 M5 -5 L-5 5" class="em-cross"/>',
  exile: '<rect x="-4.6" y="-4.6" width="9.2" height="9.2" class="em-hollow"/>',
};

/** The same mark, small, for a list row or a legend. */
export function statusMark(status) {
  return `<svg class="em-mark status-${status}" viewBox="-14 -14 28 28" aria-hidden="true" focusable="false">${MARKS[status] || MARKS.annexed}</svg>`;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * @param holdings the chapter's ledger rows, in the order they should appear
 * @param label a sentence for people who cannot see the map
 */
export function empireMap(holdings, label) {
  const pins = holdings.map((h, i) => {
    const at = PLACES[h.name];
    if (!at) return '';
    const [x, y, edge] = at;
    const offMap = edge ? `<text class="em-edge" x="14" y="4">${esc(h.name)}</text>` : '';
    return `<g class="em-pin status-${h.status}" data-pin="${i}" transform="translate(${x} ${y})"><g class="em-shape">${MARKS[h.status] || MARKS.annexed}</g>${offMap}</g>`;
  }).join('');

  return `<svg class="empire-map" viewBox="0 0 ${MAP_W} ${MAP_H}" role="img" aria-label="${esc(label)}">
      <defs><clipPath id="em-land"><path d="${LAND}"/></clipPath></defs>
      <path class="em-land" d="${LAND}"/>
      <g clip-path="url(#em-land)">${FACETS.map(([pts, tone]) => `<polygon class="em-f${tone}" points="${pts}"/>`).join('')}</g>
      <g class="em-pins">${pins}</g>
      <g class="em-label" hidden><rect rx="9"/><text></text></g>
    </svg>`;
}

/** Point at one holding on the map: enlarge its pin and name it. */
export function pointAt(svg, index, name) {
  svg.querySelectorAll('.em-pin.is-on').forEach(p => p.classList.remove('is-on'));
  const label = svg.querySelector('.em-label');
  const pin = index === null ? null : svg.querySelector(`.em-pin[data-pin="${index}"]`);
  if (!pin) { label.setAttribute('hidden', ''); return; }
  pin.classList.add('is-on');
  pin.parentNode.appendChild(pin); // draw it above its neighbours
  const [x, y, edge] = PLACES[name];
  if (edge) { label.setAttribute('hidden', ''); return; } // a place off the map already carries its name
  const text = label.querySelector('text');
  text.textContent = name;
  label.removeAttribute('hidden');
  const w = text.getComputedTextLength() + 20;
  const lx = Math.min(Math.max(x - w / 2, 4), MAP_W - w - 4);
  const ly = y > 44 ? y - 40 : y + 16;
  const box = label.querySelector('rect');
  box.setAttribute('x', lx); box.setAttribute('y', ly); box.setAttribute('width', w); box.setAttribute('height', 24);
  text.setAttribute('x', lx + 10); text.setAttribute('y', ly + 16.5);
}

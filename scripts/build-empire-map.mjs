#!/usr/bin/env node
/**
 * Draw the map behind "The Empire": Europe and the Mediterranean as a low-poly
 * landmass, with a pin position for every holding in the campaign ledger.
 *
 *   node scripts/build-empire-map.mjs
 *
 * Reads Natural Earth land (the world-atlas package) and
 * public/data/campaign/chapters.json; writes src/empire-map.js.
 *
 * The coast is simplified hard on purpose, so it reads as cut facets like the
 * rest of the game. Borders of 1800 are not drawn: a holding is a pin at its
 * capital or its best-known place, which is honest about what the data knows.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
import { Delaunay } from 'd3-delaunay';

const require = createRequire(import.meta.url);
const land = feature(require('world-atlas/land-50m.json'), require('world-atlas/land-50m.json').objects.land);

const W = 640, H = 500;
// The corners of the map. (A polygon here would have to be wound the right way round, or d3 fits the whole globe.)
const BOX = { type: 'MultiPoint', coordinates: [[-11.5, 29], [40, 61.5]] };
const projection = geoMercator().fitExtent([[0, 0], [W, H]], BOX);
const path = geoPath(projection.clipExtent([[0, 0], [W, H]]));

/** Where each holding's pin stands: [longitude, latitude], or an edge of the map for places off it. */
const PLACES = {
  'France': [2.35, 48.85],
  'Corsica': [9.05, 42.15],
  'Avignon & the Comtat Venaissin': [4.81, 43.95],
  'Savoy': [6.4, 45.6],
  'Nice': [7.26, 43.7],
  'Avignon, Savoy & Nice': [5.9, 44.5],
  'Savoy, Nice & Avignon': [5.9, 44.5],
  'The Austrian Netherlands & Liège': [4.7, 50.7],
  'Left bank of the Rhine': [7.3, 50.0],
  'Batavian Republic': [4.9, 52.37],
  'Belgium': [4.35, 50.85],
  'Cisalpine Republic': [9.19, 45.46],
  'Ligurian Republic': [8.93, 44.41],
  'Ionian Islands': [19.92, 39.62],
  'Helvetic Republic': [7.45, 46.95],
  'Roman Republic': [12.5, 41.9],
  'Malta': [14.5, 35.9],
  'Egypt': [31.2, 30.05],
  'Piedmont': [7.68, 45.07],
  'Elba': [10.25, 42.78],
  'Italian Republic': [9.19, 45.46],
  'Egypt & Malta': [29.9, 31.2],
  'Swiss Confederation': [8.2, 46.8],
  'Louisiana': 'west',
  'Saint-Domingue': 'west',
  'Liguria': [8.93, 44.41],
  'Kingdom of Italy': [10.6, 45.45],
  'Bavaria': [11.58, 48.14],
  'Württemberg': [9.18, 48.78],
  'Baden': [8.1, 48.4],
  'Command of the sea': [-6.03, 36.18],
  'Kingdom of Naples': [14.27, 40.85],
  'Kingdom of Holland': [4.9, 52.37],
  'Grand Duchy of Berg': [6.78, 51.23],
  'Kingdom of Westphalia': [9.5, 51.6],
  'Duchy of Warsaw': [21.0, 52.23],
  'Confederation of the Rhine': [10.0, 50.2],
  'Russia': [37.62, 55.75],
  'Prussia': [13.4, 52.52],
  'Tuscany & Parma': [11.25, 43.77],
  'Rome & the Papal States': [12.5, 41.9],
  'Illyrian Provinces': [15.6, 45.0],
  'Holland': [4.9, 52.37],
  'Valais': [7.36, 46.23],
  'The North Sea coast': [9.99, 53.55],
  'Kingdom of Spain': [-3.7, 40.42],
  'Austria': [16.37, 48.21],
  'Denmark-Norway': [12.57, 55.68],
  'Sweden': [18.07, 59.33],
  'Belgium & the Rhineland': [5.6, 50.6],
  'Rome & Tuscany': [11.9, 42.8],
  'The Emperor himself': [4.4, 50.68],
  'Saint Helena': 'south',
  'Les Invalides': [2.31, 48.86],
};

// — the coast, as straight cuts —
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let worst = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - points[i][1]) - (ax - points[i][0]) * (by - ay)) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tolerance) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
const area = ring => Math.abs(ring.reduce((s, p, i) => {
  const q = ring[(i + 1) % ring.length];
  return s + p[0] * q[1] - q[0] * p[1];
}, 0)) / 2;

const rings = [];
for (const piece of path(land).split('M').filter(Boolean)) {
  const pts = piece.replace(/Z/g, '').split('L').map(s => s.split(',').map(Number)).filter(p => p.length === 2 && p.every(Number.isFinite));
  if (pts.length < 4 || area(pts) < 9) continue;
  const cut = simplify(pts, 1.5);
  if (cut.length >= 3) rings.push(cut);
}
const landPath = rings.map(r => 'M' + r.map(p => p.map(n => Math.round(n * 10) / 10).join(',')).join('L') + 'Z').join('');

// — facets: a loose mesh of triangles in a few tones, clipped to the land when drawn —
let seed = 1815;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sites = [];
for (let y = -40; y <= H + 40; y += 54) {
  for (let x = -40; x <= W + 40; x += 62) sites.push([x + (rand() - 0.5) * 46, y + (rand() - 0.5) * 40]);
}
const mesh = Delaunay.from(sites);
const facets = [];
for (let i = 0; i < mesh.triangles.length; i += 3) {
  const tri = [0, 1, 2].map(k => sites[mesh.triangles[i + k]].map(Math.round));
  facets.push([tri.map(p => p.join(',')).join(' '), Math.round(rand() * 4)]);
}

// — pins —
const data = JSON.parse(readFileSync(new URL('../public/data/campaign/chapters.json', import.meta.url)));
const places = {};
const missing = new Set();
let west = 0;
for (const chapter of data.chapters) {
  for (const h of chapter.empire.holdings) {
    if (places[h.name]) continue;
    const at = PLACES[h.name];
    if (!at) { missing.add(h.name); continue; }
    if (at === 'west') places[h.name] = [16, 250 + 34 * west++, 'west'];
    else if (at === 'south') places[h.name] = [60, H - 18, 'south'];
    else places[h.name] = projection(at).map(n => Math.round(n * 10) / 10);
  }
}
if (missing.size) throw new Error('No pin position for: ' + [...missing].join(', '));

writeFileSync(new URL('../src/empire-map.js', import.meta.url),
  `// Written by scripts/build-empire-map.mjs. Do not edit by hand.
export const MAP_W = ${W};
export const MAP_H = ${H};
export const LAND = ${JSON.stringify(landPath)};
export const FACETS = ${JSON.stringify(facets)};
export const PLACES = ${JSON.stringify(places, null, 1)};
`);
console.log(`${rings.length} pieces of land, ${landPath.length} bytes of coast, ${facets.length} facets, ${Object.keys(places).length} pins`);

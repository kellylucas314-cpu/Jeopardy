"""Fill in Sacred Empires' engraving (Kelly, Nov 11: she loves the font but wanted it solid, like the
question mark on the throne card). Keeps each glyph's outline and its real counters (the holes in
e, a, d, o, p) and closes the thin engraved cuts. Writes a font whose glyphs for TEXT are solid.

The font is Kelly's (Envato licence) and is not in the repo. With her copy:

    pip install fonttools brotli shapely numpy
    python3 scripts/solidify-sacred-empires.py "Sacred Empires.ttf" /tmp/SE-solid.ttf 0.03 0.04 0.035 55
    pyftsubset /tmp/SE-solid.ttf --text="Clue d’État. Who’s playing?" --flavor=woff2 \
      --layout-features='kern,liga' --output-file=public/assets/fonts/SacredEmpires-logo.woff2

The numbers, all shares of the em except the last:
  0.03   the narrowest hole kept as a counter
  0.04   how hard the edges are ironed (0 leaves the font's rough, hand-cut edge; Kelly asked on
         Nov 11 for edges as clean as the question mark's; above 0.05 the letters start to melt)
  0.035  how far along the outline to look when deciding what is a corner
  55     the turn, in degrees, that counts as a corner; corners are pinned so serifs stay crisp
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import numpy as np

src, out, minw = sys.argv[1], sys.argv[2], float(sys.argv[3])
smooth = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
reach = float(sys.argv[5]) if len(sys.argv) > 5 else 0.03
turn = float(sys.argv[6]) if len(sys.argv) > 6 else 50
allcorners = []
TEXT = "Clue d’État. Who’s playing?"

class Flat(BasePen):
    def __init__(self, gs):
        super().__init__(gs); self.contours = []; self.cur = []
    def _moveTo(self, p): self.cur = [p]
    def _lineTo(self, p): self.cur.append(p)
    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, 13):
            t = i / 12; mt = 1 - t
            self.cur.append((mt**3*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t**3*p3[0],
                             mt**3*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t**3*p3[1]))
    def _closePath(self):
        if len(self.cur) > 2: self.contours.append(self.cur)
        self.cur = []
    _endPath = _closePath

def gauss(xy, sigma, step, closed):
    """Average each point with its neighbours along the line (a Gaussian, sigma in font units).
    An open run is mirrored through its two ends first, so the ends stay exactly where they are."""
    n = len(xy)
    if closed:
        ext = xy
    else:
        ext = np.vstack([xy, (2 * xy[-1] - xy[::-1])[1:-1]])   # odd reflection: a loop of 2n-2
    m = len(ext)
    k = np.fft.fftfreq(m, d=step)
    gain = np.exp(-2 * (np.pi * k * sigma) ** 2)
    if not closed:
        # take out the straight line between the ends, smooth what is left, put the line back
        ramp = np.linspace(0, 1, n)[:, None] * (xy[-1] - xy[0]) + xy[0]
        res = xy - ramp
        ext = np.vstack([res, -res[::-1][1:-1]])
        sm = np.column_stack([np.fft.ifft(np.fft.fft(ext[:, i]) * gain).real for i in (0, 1)])[:n]
        return sm + ramp
    return np.column_stack([np.fft.ifft(np.fft.fft(ext[:, i]) * gain).real for i in (0, 1)])

def smooth_ring(coords, sigma, step, reach, turn):
    """Iron out the font's rough, hand-cut wobble and keep its corners. Walk the outline in even
    steps, find the real corners (where the line turns more than `turn` degrees across `reach`),
    pin them, and smooth each run between two corners on its own."""
    pts = np.asarray(coords[:-1], dtype=float)
    seg = np.linalg.norm(np.roll(pts, -1, axis=0) - pts, axis=1)
    total = seg.sum()
    n = max(int(total / step), 12)
    step = total / n
    cum = np.concatenate([[0], np.cumsum(seg)])
    loop = np.vstack([pts, pts[:1]])
    t = np.linspace(0, total, n, endpoint=False)
    xy = np.column_stack([np.interp(t, cum, loop[:, 0]), np.interp(t, cum, loop[:, 1])])
    calm = gauss(xy, sigma * 0.3, step, True)
    w = max(int(reach / step), 2)
    back = calm - np.roll(calm, w, axis=0); fwd = np.roll(calm, -w, axis=0) - calm
    ang = np.degrees(np.abs(np.arctan2(back[:, 0] * fwd[:, 1] - back[:, 1] * fwd[:, 0],
                                       (back * fwd).sum(axis=1))))
    corners = [i for i in range(n) if ang[i] > turn
               and ang[i] == max(ang[(i + d) % n] for d in range(-w, w + 1))]
    corners = sorted(set(corners))
    if len(corners) < 2:
        return [tuple(q) for q in gauss(xy, sigma, step, True)], []
    out = []
    for a, b in zip(corners, corners[1:] + [corners[0] + n]):
        run = np.array([xy[i % n] for i in range(a, b + 1)])
        out.extend(gauss(run, sigma, step, False)[:-1] if len(run) > 3 else run[:-1])
    return [tuple(q) for q in out], [tuple(xy[i]) for i in corners]

f = TTFont(src); upm = f['head'].unitsPerEm
gs = f.getGlyphSet(); cmap = f.getBestCmap()
cff = f['CFF '].cff; top = cff.topDictIndex[0]; cs = top.CharStrings
w = minw * upm
report = []
for ch in sorted(set(TEXT) - {' '}):
    name = cmap[ord(ch)]
    pen = Flat(gs); gs[name].draw(pen)
    shape = None
    for c in pen.contours:
        p = Polygon(c).buffer(0)
        shape = p if shape is None else shape.symmetric_difference(p)
    if shape is None: continue
    polys = list(shape.geoms) if isinstance(shape, MultiPolygon) else [shape]
    kept, filled = 0, 0
    newpolys = []
    for poly in polys:
        holes = []
        for ring in poly.interiors:
            h = Polygon(ring)
            # a real counter is roomy: wide enough to survive the squeeze and not a long thin slit
            if not h.buffer(-w).is_empty and h.area > 0.25 * h.length * w: holes.append(ring); kept += 1
            else: filled += 1
        newpolys.append(Polygon(poly.exterior, holes))
    # drop slivers of ink that were only the walls of a cut: tiny islands
    solid = unary_union([p for p in newpolys if p.area > (0.0004 * upm * upm)])
    solid = solid.buffer(0.004 * upm).buffer(-0.004 * upm)   # heal hairline seams
    report.append(f'{ch}: kept {kept} counters, filled {filled} cuts')
    width = f['hmtx'][name][0]
    t2 = T2CharStringPen(width, gs)
    geoms = list(solid.geoms) if isinstance(solid, MultiPolygon) else [solid]
    for poly in geoms:
        for ring in [poly.exterior, *poly.interiors]:
            pts = list(ring.coords)[:-1]
            if smooth:
                pts, cs_ = smooth_ring(list(ring.coords), smooth * upm, 0.004 * upm, reach * upm, turn); allcorners += cs_
            t2.moveTo(tuple(round(v) for v in pts[0]))
            for q in pts[1:]: t2.lineTo(tuple(round(v) for v in q))
            t2.closePath()
    private = cs[name].private
    cs[name] = t2.getCharString(private=private, globalSubrs=cff.GlobalSubrs)
f.save(out)
print('\n'.join(report))

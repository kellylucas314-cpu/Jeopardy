"""Fill in Sacred Empires' engraving (Kelly, Nov 11: she loves the font but wanted it solid, like the
question mark on the throne card). Keeps each glyph's outline and its real counters (the holes in
e, a, d, o, p) and closes the thin engraved cuts. Writes a font whose glyphs for TEXT are solid.

The font is Kelly's (Envato licence) and is not in the repo. With her copy:

    pip install fonttools brotli shapely
    python3 scripts/solidify-sacred-empires.py "Sacred Empires.ttf" /tmp/SE-solid.ttf 0.03
    pyftsubset /tmp/SE-solid.ttf --text="Clue d’État. Who’s playing?" --flavor=woff2 \
      --layout-features='kern,liga' --output-file=public/assets/fonts/SacredEmpires-logo.woff2

The last argument is the narrowest hole kept as a counter, as a share of the em (0.03).
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

src, out, minw = sys.argv[1], sys.argv[2], float(sys.argv[3])
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
            if not h.buffer(-w).is_empty: holes.append(ring); kept += 1
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
            t2.moveTo(tuple(round(v) for v in pts[0]))
            for q in pts[1:]: t2.lineTo(tuple(round(v) for v in q))
            t2.closePath()
    private = cs[name].private
    cs[name] = t2.getCharString(private=private, globalSubrs=cff.GlobalSubrs)
f.save(out)
print('\n'.join(report))

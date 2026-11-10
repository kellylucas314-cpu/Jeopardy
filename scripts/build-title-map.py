#!/usr/bin/env python3
"""Make the title screen's folded map whole.

  python3 scripts/build-title-map.py

The map was drawn in two layers with a gap in the middle, for a title where
Napoleon rose out of it. Now he stands on it, so the gap is filled: the two
missing fold panels are mirrored from their neighbours across the fold lines,
which keeps the drawing continuous at each crease.

Reads art-src/napoleon-map-back.webp and -front.webp; writes
public/assets/title-map.webp.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
back = Image.open(ROOT / "art-src" / "napoleon-map-back.webp").convert("RGBA")
front = Image.open(ROOT / "art-src" / "napoleon-map-front.webp").convert("RGBA")
whole = np.asarray(Image.alpha_composite(back, front)).copy()

LEFT_FOLD, RIDGE, RIGHT_FOLD, FLOOR = 580, 745, 862, 232  # the gap, in pixels of the 1485-wide drawing
patch = whole.copy()
for x in range(LEFT_FOLD, RIDGE):                  # left panel, mirrored across its crease
    patch[:FLOOR, x] = whole[:FLOOR, 2 * LEFT_FOLD - 1 - x]
for x in range(RIDGE, RIGHT_FOLD):                 # right panel, mirrored across its crease
    patch[:FLOOR, x] = whole[:FLOOR, 2 * RIGHT_FOLD - x]
# a fold panel faces the other way from its neighbour, so it sits a touch darker
patch[:FLOOR, LEFT_FOLD:RIGHT_FOLD, :3] = (patch[:FLOOR, LEFT_FOLD:RIGHT_FOLD, :3] * 0.965).astype("uint8")

# the patch goes underneath, only inside the gap, and the drawing is laid back over it,
# so the drawing's own soft edge blends into the patch and leaves no outline
under = patch.copy()
under[FLOOR:] = 0
under[:, :LEFT_FOLD - 3] = 0
under[:, RIGHT_FOLD + 3:] = 0
out = Image.alpha_composite(Image.fromarray(under), Image.fromarray(whole))
# the old cut left a pale nick at the top of the left crease: paint it the colour beside it
px = np.asarray(out).copy()
for y in range(80, 106):
    for x in range(LEFT_FOLD - 8, LEFT_FOLD + 5):
        if px[y, x, 3] and int(px[y, x, :3].sum()) > 640:
            px[y, x] = px[y, LEFT_FOLD + 8]
out = Image.fromarray(px)
out.save(ROOT / "public" / "assets" / "title-map.webp", quality=88, method=6)
print(out.size)

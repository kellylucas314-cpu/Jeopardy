"""Split the Napoleon-on-a-map artwork into the title screen's two map layers.

  python3 scripts/build-map-layers.py   (needs Pillow, numpy, opencv-python-headless)

Reads art-src/napoleon-map-hero.png (1536x1024 with alpha, generated Oct 4 2026 with
napoleon-lowpoly-full.webp as the style reference). Removes the painted Napoleon,
repaints the bits of map his elbows covered, and writes:
  public/assets/napoleon-map-back.webp   the whole map, with a notch where he rises
  public/assets/napoleon-map-front.webp  the front fold, drawn over the hat-tip film
Both are 1485x546 and share one box, so they stack exactly. The percentages in
.title-stage (src/styles.css) assume this crop.
"""
import sys, numpy as np, cv2
from PIL import Image
src, out = 'art-src/napoleon-map-hero.png', 'public/assets'
im = np.array(Image.open(src).convert('RGBA')).astype(np.int32)
H, W = im.shape[:2]
a = im[..., 3]
# outer top line: first strongly opaque row per column, outside Napoleon's columns
top = np.full(W, H, dtype=float)
for x in range(W):
    ys = np.where(a[:, x] > 245)[0]
    if len(ys): top[x] = ys[0]
L, R = 495, 1015
xs = np.arange(W)
lx = (xs > 460) & (xs < 605)
top[lx] = np.interp(xs[lx], [460, 605], [top[460], 565])
rx = (xs > 885) & (xs < 1065)
top[rx] = np.interp(xs[rx], [885, 1065], [560, top[1065]])
# center panel zigzag (image coords)
zig_x = [605, 765, 885]; zig_y = [703, 655, 703]
maptop = top.copy()
cx = (xs >= 605) & (xs <= 885)
maptop[cx] = np.interp(xs[cx], zig_x, zig_y)
yy = np.arange(H)[:, None]
inmap = yy > maptop[None, :]
# napoleon pixels inside the map region (wedges)
rgb = im[..., :3]
lum = rgb.mean(-1)
dark = lum < 110
red = (rgb[..., 0] > 140) & (rgb[..., 1] < 100) & (rgb[..., 2] < 100)
gold = (rgb[..., 0] > 170) & (rgb[..., 2] < 90) & (rgb[..., 1] > 110)
body = (dark | red | gold)
wedge = np.zeros((H, W), bool)
wedge[480:712, 455:R] = True
m = (body & wedge & inmap).astype(np.uint8)
m = cv2.dilate(m, np.ones((9, 9), np.uint8))
# force the thin strip where his coat meets the centre panel
m[600:706, 588:612] = 1
m[620:706, 878:900] = 1
m &= inmap.astype(np.uint8)
above = (~inmap).copy(); above[:, :L] = False; above[:, R:] = False; above[:400] = False
m_ip = (m.astype(bool) | above).astype(np.uint8)
src_rgb = im[..., :3].copy()
for x in list(range(0, L)) + list(range(R, W)):
    t = int(min(maptop[x] + 4, H - 1))
    src_rgb[:t, x] = src_rgb[t, x]
bgr = cv2.cvtColor(src_rgb.astype(np.uint8), cv2.COLOR_RGB2BGR)
fill = cv2.inpaint(bgr, m_ip * 255, 15, cv2.INPAINT_TELEA)
rgbf = cv2.cvtColor(fill, cv2.COLOR_BGR2RGB).astype(np.int32)
rng = np.random.default_rng(7)
grain = rng.normal(0, 3.5, (H, W, 1))
mk = m.astype(bool)[..., None]
rgbf = np.where(mk, np.clip(rgbf + grain, 0, 255), rgbf).astype(np.uint8)
alpha = np.where(inmap, 255, 0).astype(np.uint8)
# keep the map's own soft edges below the top line (bottom shadow etc.)
alpha = np.where(inmap, np.maximum(a, 0).clip(0, 255), 0).astype(np.uint8)
alpha[m.astype(bool)] = 255
back = np.dstack([rgbf, alpha])
# front: everything below the zigzag in the centre, below y=703 elsewhere
fronttop = np.maximum(maptop, 0)
fronttop[:] = 703
fronttop[cx] = np.interp(xs[cx], zig_x, zig_y)
front_mask = yy > fronttop[None, :]
front = back.copy()
front[..., 3] = np.where(front_mask, back[..., 3], 0)
# crop canvas: top 60px trimmed, width to 1518
crop = (0, 60, 1518, H)
BOX = (24, 418, 1509, 964)  # the map's bounding box inside the trimmed canvas
Image.fromarray(back).crop(crop).crop(BOX).save(out + '/napoleon-map-back.webp', 'WEBP', quality=84, method=6)
Image.fromarray(front).crop(crop).crop(BOX).save(out + '/napoleon-map-front.webp', 'WEBP', quality=84, method=6)

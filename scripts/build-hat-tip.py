#!/usr/bin/env python3
"""Cut Napoleon's hat tip out of its green screen for the title page.

The film (art-src/napoleon-hat-tip.mp4, 720x1280, 24 fps) was drawn by a video
model from one start frame: public/assets/host/welcome.webp scaled to 900 px
tall and stood on flat green (0, 177, 64) in a 720x1280 frame, its box at
x 110..630, y 324..1224. The same picture was given as the end frame, so he
finishes where he began.

This script keys the green away, keeps only the part where he moves, and eases
the first and last frames into the still pose so the page can swap the still
picture for the film without a jump. Browsers cannot all play a film with a
see-through background, so it writes a stacked film instead: his colours in the
top half, his outline as a white-on-black mask in the bottom half. The page
puts the two back together (tipHat in src/host.js).

    public/assets/host/welcome-tip.mp4

It prints the numbers the stylesheet needs (how much taller the film's box is
than the still picture). Needs ffmpeg, Pillow and numpy.

    python3 scripts/build-hat-tip.py
"""
import glob
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src' / 'napoleon-hat-tip.mp4'
OUT = ROOT / 'public' / 'assets' / 'host' / 'welcome-tip.mp4'

STILL = (110, 324, 630, 1224)   # where the still pose stands in the film frame
BOX = (40, 280, 700, 1224)      # the film's own box: room for the raised elbow and the lifted hat
FIRST, LAST = 9, 82             # frames (1-based) either side of the movement
EASE = 3                        # frames blended into the still pose at each end
HALF = (528, 756)               # one half of the stacked film: the 660x944 box at 0.8
FPS = 24
CRF = 23


def key(frame):
    """Green screen to alpha, with the green taken back out of the edges."""
    a = np.asarray(frame.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = a[:24, :24].reshape(-1, 3).mean(0)
    spill = g - np.maximum(r, b)
    t = np.clip((spill - 24) / (78 - 24), 0, 1)
    alpha = 1 - t * t * (3 - 2 * t)
    # an edge pixel is part figure, part green: take the green share back out
    safe = np.maximum(alpha, 0.2)[..., None]
    rgb = (a - (1 - alpha[..., None]) * bg) / safe
    # and never leave more green than the stronger of red and blue
    rgb[..., 1] = np.minimum(rgb[..., 1], np.maximum(rgb[..., 0], rgb[..., 2]) + 2)
    rgb = np.clip(rgb, 0, 255)
    alpha = np.where(alpha < 0.06, 0, alpha)
    return np.dstack([rgb, alpha * 255])


def main():
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(SRC), f'{tmp}/f_%03d.png'], check=True)
        files = sorted(glob.glob(f'{tmp}/f_*.png'))
        keyed = [key(Image.open(f).crop(BOX)) for f in files[FIRST - 1:LAST]]
        still = key(Image.open(files[0]).crop(BOX))

    # ease in from the still pose and back out to it
    for i in range(EASE):
        w = (i + 1) / (EASE + 1)
        keyed[i] = still * (1 - w) + keyed[i] * w
        keyed[-1 - i] = still * (1 - w) + keyed[-1 - i] * w
    frames = [still] + keyed + [still]

    def blur(plane):
        """A soft blur of one 0..255 plane."""
        im = Image.fromarray(np.clip(plane, 0, 255).round().astype(np.uint8), 'L')
        return np.asarray(im.filter(ImageFilter.GaussianBlur(5))).astype(np.float32)

    def stacked(f):
        """Colours over mask. The colours are spread past his outline so a soft edge never picks up the backdrop."""
        rgb, a = f[..., :3], f[..., 3] / 255
        soft = np.maximum(blur(a * 255) / 255, 1e-3)
        spread = np.dstack([blur(rgb[..., c] * a) / soft for c in range(3)])
        spread = np.where((soft > 0.01)[..., None], spread, 40)
        colour = rgb * a[..., None] + spread * (1 - a[..., None])
        top = Image.fromarray(np.clip(colour, 0, 255).round().astype(np.uint8), 'RGB').resize(HALF, Image.LANCZOS)
        mask = Image.fromarray((a * 255).round().astype(np.uint8), 'L').resize(HALF, Image.LANCZOS)
        sheet = Image.new('RGB', (HALF[0], HALF[1] * 2))
        sheet.paste(top, (0, 0))
        sheet.paste(Image.merge('RGB', [mask] * 3), (0, HALF[1]))
        return sheet.tobytes()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{HALF[0]}x{HALF[1] * 2}', '-r', str(FPS), '-i', '-',
        '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', str(CRF), '-profile:v', 'high',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-movflags', '+faststart', '-an', str(OUT)], stdin=subprocess.PIPE)
    for f in frames:
        ffmpeg.stdin.write(stacked(f))
    ffmpeg.stdin.close()
    if ffmpeg.wait():
        raise SystemExit('ffmpeg could not write the film')

    still_w, still_h = STILL[2] - STILL[0], STILL[3] - STILL[1]
    print(f'{OUT.relative_to(ROOT)}: {len(frames)} frames, two halves of {HALF[0]}x{HALF[1]}, '
          f'{OUT.stat().st_size / 1024:.0f} KB, {len(frames) / FPS:.2f} s')
    print(f'film height / still height: {(BOX[3] - BOX[1]) / still_h:.4f}')
    print(f'film aspect (w/h): {(BOX[2] - BOX[0]) / (BOX[3] - BOX[1]):.4f}')
    print(f'film centre minus still centre, in still widths: '
          f'{((BOX[0] + BOX[2]) / 2 - (STILL[0] + STILL[2]) / 2) / still_w:.4f}')


if __name__ == '__main__':
    main()

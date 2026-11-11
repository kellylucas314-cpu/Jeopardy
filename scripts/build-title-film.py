"""The front screen film: Napoleon walks up to the throne and clears it.

Source: art-src/napoleon-throne.mp4 (1920x1080, 6 s, made by Kelly with a video model).
First cut it to the stage and drop the white side bars, from the repo root:

    mkdir -p /tmp/throne/raw
    ffmpeg -i art-src/napoleon-throne.mp4 -vf "fps=24,crop=1728:1008:96:60,scale=1280:-2:flags=lanczos" /tmp/throne/raw/r_%03d.png

Then run this from /tmp/throne. It reads the film's paper (and its vignette) off the empty first
frame and lifts every frame so the paper is the page's own #fff9f3 right to the edges, which is
what lets the film sit on the page with no box. Finally:

    ffmpeg -framerate 24 -i flat/f_%03d.png -vf format=yuv420p -c:v libx264 -preset veryslow -crf 25 \
      -tune animation -movflags +faststart public/assets/title/throne.mp4

and save the first and last frames as public/assets/title/throne-first.webp and throne-last.webp.
"""
import glob, os, shutil
import numpy as np
from PIL import Image, ImageFilter

PAPER = np.array([255, 249, 243], np.float32)
fs = sorted(glob.glob('raw/r_*.png'))
first = np.asarray(Image.open(fs[0]).convert('RGB'), np.float32)
# paper pixels only: close to the paper's colour, and well away from the throne (a grown mask)
near = np.abs(first - np.array([244, 235, 223], np.float32)).max(2) < 12
far = np.asarray(Image.fromarray((~near * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(31))) == 0
bgmask = near & far
# normalised blur: average of paper pixels only, over a wide radius
def blur(a):
    im = Image.fromarray(a.astype(np.float32), 'F')
    small = im.resize((24, 14), Image.BOX)
    return np.asarray(small.resize(im.size, Image.BICUBIC), np.float32)
w = blur(bgmask.astype(np.float32))
bg = np.dstack([blur(first[..., c] * bgmask) / np.maximum(w, 1e-3) for c in range(3)])
gain = np.clip(PAPER / np.maximum(bg, 1), 1.0, 1.12)
print('gain range', gain.min(), gain.max(), 'bg corners', bg[5, 5], bg[5, -5], bg[-5, 5], bg[373, 640])
shutil.rmtree('flat', ignore_errors=True); os.makedirs('flat')
for i, f in enumerate(fs):
    a = np.asarray(Image.open(f).convert('RGB'), np.float32)
    out = np.clip(a * gain, 0, 255)
    # anything within a few steps of the paper becomes the paper exactly: this settles the faint
    # rings and the pale ghost the model left where the card stood
    w = np.clip(((out - (PAPER - 12)) / 6).min(2), 0, 1)[..., None]
    out = out * (1 - w) + PAPER * w
    Image.fromarray(out.round().astype(np.uint8)).save(f'flat/f_{i:03d}.png')

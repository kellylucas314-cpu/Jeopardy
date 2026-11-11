"""The fidget: after the front screen film ends, Napoleon turns his head to look at you, then looks
away again. Kelly, Nov 11: "very subtle movement" once the animation is over.

Source: art-src/napoleon-throne-fidget.mp4 (1728x1152, 6 s; Kelly made it with a video model from
the film's last frame, which the model stretched to 3:2). Only its first second and a half is used:
after that he changes pose, which is more than a fidget.

    pip install opencv-python-headless numpy pillow
    mkdir -p /tmp/fidget/src && cd /tmp/fidget
    ffmpeg -i <repo>/art-src/napoleon-throne-fidget.mp4 -fps_mode passthrough src/s_%03d.png
    python3 <repo>/scripts/build-title-fidget.py <repo>/public/assets/title/throne-last.webp
    ffmpeg -framerate 24 -i out/f_%03d.png -vf format=yuv420p -c:v libx264 -preset veryslow -crf 25 \
      -tune animation -movflags +faststart <repo>/public/assets/title/throne-fidget.mp4

What it does, so the fidget can start and end on the film's last frame with no jump:
  1. finds where the clip's first frame sits on the film's last frame (matching points, then a
     stretch and a shift) and puts every frame back into the film's 1280x746 box
  2. matches the clip's colours to the film's (one colour matrix, fitted on the first frame)
  3. sets the paper to the page's own #fff9f3, as scripts/build-title-film.py does
  4. keeps only him: outside a soft box around Napoleon every pixel is the film's last frame, so
     the throne, the crown, the card and the paper cannot shimmer
  5. plays frames 0 to TURN and back again, easing the first and last few frames out of and into
     the film's last frame itself
"""
import glob, os, shutil, sys
import numpy as np, cv2

TURN, EASE = 34, 6
BOX, SOFT = (735, 8, 1065, 722), 24                    # left, top, right, bottom of him; the feather
PAPER = np.array([243, 249, 255], np.float32)          # #fff9f3 in OpenCV's blue-green-red order
last = cv2.imread(sys.argv[1])
fs = sorted(glob.glob('src/s_*.png'))[:TURN + 1]
first = cv2.imread(fs[0])

sift = cv2.SIFT_create(4000)
k1, d1 = sift.detectAndCompute(cv2.cvtColor(first, cv2.COLOR_BGR2GRAY), None)
k2, d2 = sift.detectAndCompute(cv2.cvtColor(last, cv2.COLOR_BGR2GRAY), None)
good = [a for a, b in cv2.BFMatcher().knnMatch(d1, d2, k=2) if a.distance < 0.7 * b.distance]
M, inl = cv2.estimateAffine2D(np.float32([k1[g.queryIdx].pt for g in good]),
                              np.float32([k2[g.trainIdx].pt for g in good]), ransacReprojThreshold=2.0)
print('matched points', int(inl.sum()), 'of', len(good), '\n', M.round(4))
h, w = last.shape[:2]
place = lambda a: cv2.warpAffine(a, M, (w, h), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)

# the colour matrix: clip colours -> film colours, fitted on the first frame, twice, the second
# time without the pixels that disagree most (edges, the few places the model redrew)
a0 = place(first).reshape(-1, 3).astype(np.float32); b0 = last.reshape(-1, 3).astype(np.float32)
A = np.hstack([a0, np.ones((len(a0), 1), np.float32)])[::7]; B = b0[::7]
C = np.linalg.lstsq(A, B, rcond=None)[0]
keep = np.abs(A @ C - B).max(1) < 14
C = np.linalg.lstsq(A[keep], B[keep], rcond=None)[0]
print('colour fit on', int(keep.sum()), 'of', len(keep), 'pixels')

def grade(a):
    out = np.clip(np.hstack([a.reshape(-1, 3).astype(np.float32), np.ones((h * w, 1), np.float32)]) @ C, 0, 255)
    out = out.reshape(h, w, 3)
    near = np.clip(((out - (PAPER - 12)) / 6).min(2), 0, 1)[..., None]   # near the paper: the paper
    return out * (1 - near) + PAPER * near

frames = [grade(place(cv2.imread(f))) for f in fs]
lastf = last.astype(np.float32)
print('first frame against the film: mean difference', float(np.abs(frames[0] - lastf).mean()).__round__(2))
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
out_by = np.maximum.reduce([BOX[0] - xx, xx - BOX[2], BOX[1] - yy, yy - BOX[3], np.zeros_like(xx)])
him = np.clip(1 - out_by / SOFT, 0, 1); him = (him * him * (3 - 2 * him))[..., None]
frames = [f * him + lastf * (1 - him) for f in frames]
order = list(range(TURN + 1)) + list(range(TURN - 1, -1, -1))
shutil.rmtree('out', ignore_errors=True); os.makedirs('out')
for n, i in enumerate(order):
    edge = min(n, len(order) - 1 - n)                  # frames from the nearer end
    t = min(edge / EASE, 1.0); t = t * t * (3 - 2 * t)
    f = frames[i] * t + lastf * (1 - t)
    cv2.imwrite(f'out/f_{n:03d}.png', f.round().astype(np.uint8))
print(len(order), 'frames,', round(len(order) / 24, 2), 's')

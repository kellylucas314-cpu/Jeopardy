#!/usr/bin/env python3
"""Cut Napoleon's reaction clips into the films the game plays.

Kelly made the clips (video models, cut up into cues with ChatGPT) and handed
them over as a kit: "Clue Reactions - Claude Kit". Its Game/ folder holds each
cue as a small animated WebP with a see-through background; its MP4/ folder
holds the same cue at full size on a plain backdrop. The kit is not in this
repository (it is 70 MB); it lives in the project's files. Point this script at
the unzipped kit folder:

    python3 scripts/build-host-films.py "/path/to/Clue Reactions - Claude Kit"

The small WebP gives the outline and the full-size video gives the picture: the
script finds where the WebP sits in the video (SIFT), pairs each WebP frame with
its video frame, and cuts the video with the WebP's outline, a third larger
than the WebP itself. Browsers cannot all play a film with a see-through
background, so each cue is written as a stacked film, like the hat tip: his
colours in the top half, his outline as a white-on-black mask in the bottom
half. src/host.js puts the two back together on a canvas.

    public/assets/host/films/<name>.mp4
    public/assets/host/films/watch.webp, face-*.webp   (the still under each film)
    src/host-films.js   (sizes, and where he stands in each film)

Three kinds:
  idle    he stands with his arms crossed and watches the player; each idle
          film leaves the same frame and comes back to it, so they chain
          without a jump
  figure  a reaction with the whole of him (wide screens)
  face    head and shoulders, for the small verdict picture (phones)

Needs ffmpeg, OpenCV, Pillow and numpy.
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'assets' / 'host' / 'films'
MANIFEST = ROOT / 'src' / 'host-films.js'
CRF = 24
FPS = 24
GROW = 4 / 3          # the films are this much larger than the kit's WebPs

# He idles on one frame of the "restless" cue, the one where he looks straight at the player,
# and fidgets away from it and back.
IDLE_CUE = '21-restless-crossed-arms-dance'
HOME = 8
# how far each fidget travels before it turns back, and how long it waits there (ms):
# a shift of his weight, a wider stance, a step aside and a look at the board
IDLES = {'watch-a': (14, 0), 'watch-b': (3, 120), 'watch-c': (26, 900)}

FIGURES = {
    'pleased': '05-pleased-crossed-ankles',
    'fist': '19-raise-victory-fist',
    'shrug': '16-exasperated-shrug',
    'yell': '23-throw-hands-up-and-yell',
    'stomp': '15-impatient-boot-stomps',
    'bow': '20-sweeping-victory-bow',
    # a second way to take each outcome, so the same clip is not the only thing he does
    'nod': '18-pleased-at-attention',
    'brace': '22-straighten-coat-and-brace',
    'ponder': '28-hands-on-hips-to-chin',
    'peer': '25-step-forward-and-peer',
}
FACES = {
    'face-smirk': '38-amused-smirk',
    'face-grin': '31-break-into-a-grin',
    'face-startled': '39-startled-double-take',
    'face-stern': '30-stern-sidelong-look',
    'face-shock': '35-wide-eyed-shock',
    'face-nod': '36-grudging-nod',
    'face-brow': '34-suspicious-brow',
}
FACE_W = 240


def webp_frames(path):
    """The cue's frames and how long each is held (ms)."""
    im = Image.open(path)
    return [(np.asarray(f.convert('RGBA')).astype(np.float32), f.info.get('duration') or 42) for f in ImageSequence.Iterator(im)]


def video_frames(path):
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                            '-of', 'csv=p=0', str(path)], capture_output=True, text=True, check=True).stdout.strip().split(',')
    w, h = int(probe[0]), int(probe[1])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def place(small, big):
    """Where the WebP frame sits in the video frame: scale and offset, WebP to video."""
    backdrop = big[:12, :12].reshape(-1, 3).mean(0)
    a = small[..., 3:] / 255
    flat = (small[..., :3] * a + backdrop * (1 - a)).astype(np.uint8)
    sift = cv2.SIFT_create()
    ka, da = sift.detectAndCompute(cv2.cvtColor(flat, cv2.COLOR_RGB2GRAY), None)
    kb, db = sift.detectAndCompute(cv2.cvtColor(big, cv2.COLOR_RGB2GRAY), None)
    pairs = [m for m, n in cv2.BFMatcher().knnMatch(da, db, k=2) if m.distance < 0.75 * n.distance]
    src = np.float32([ka[m.queryIdx].pt for m in pairs])
    dst = np.float32([kb[m.trainIdx].pt for m in pairs])
    M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2)
    return M, int(inl.sum())


def blur(plane, radius):
    im = Image.fromarray(np.clip(plane, 0, 255).round().astype(np.uint8), 'L')
    return np.asarray(im.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)


def sharp_frames(cue, kit):
    """Each WebP frame, recut from the full-size video at GROW times the size. Returns (frames, held ms)."""
    held = webp_frames(kit / 'Game' / f'{cue}.webp')
    video = video_frames(kit / 'MP4' / f'{cue}.mp4')
    M, inliers = place(held[0][0], video[0])
    scale = float(np.hypot(M[0, 0], M[1, 0]))
    h, w = held[0][0].shape[:2]
    W, H = round(w * GROW / 2) * 2, round(h * GROW / 2) * 2
    # video -> film: undo the placement, then grow
    inv = cv2.invertAffineTransform(M)
    to_small = inv
    to_film = inv * (W / w)
    out, clock, drift = [], 0.0, []
    for frame, ms in held:
        guess = round(clock / (1000 / FPS))
        clock += ms
        a = frame[..., 3] / 255
        solid = a > 0.9
        best, err = guess, 1e9
        for t in range(max(guess - 2, 0), min(guess + 3, len(video))):
            small = cv2.warpAffine(video[t], to_small, (w, h), flags=cv2.INTER_AREA).astype(np.float32)
            e = float(np.abs(small - frame[..., :3])[solid].mean())
            if e < err:
                best, err = t, e
        drift.append(best - guess)
        rgb = cv2.warpAffine(video[best], to_film, (W, H), flags=cv2.INTER_AREA if scale > GROW else cv2.INTER_LANCZOS4).astype(np.float32)
        alpha = np.asarray(Image.fromarray(frame[..., 3].astype(np.uint8), 'L').resize((W, H), Image.LANCZOS)).astype(np.float32)
        # the video's edge pixels carry its backdrop: keep the video only well inside his outline,
        # and let his own colours spread out to the edge
        inside = (blur(alpha, 1.2) > 242).astype(np.float32)
        soft = np.maximum(blur(inside * 255, 2.5) / 255, 1e-3)
        spread = np.dstack([blur(rgb[..., c] * inside, 2.5) / soft for c in range(3)])
        spread = np.where((soft > 0.02)[..., None], spread, 40)
        colour = rgb * inside[..., None] + spread * (1 - inside[..., None])
        out.append((np.dstack([colour, alpha]), ms))
    print(f'  {cue}: video is {scale:.3f}x the WebP ({inliers} matches), frame drift {min(drift)}..{max(drift)}, film {W}x{H}')
    return out


def on_clock(held):
    """Frames on an even 24 fps clock (the kit holds some frames for two ticks)."""
    frames, clock, tick = [], 0.0, 1000 / FPS
    for frame, ms in held:
        clock += ms
        while len(frames) * tick < clock - tick / 2:
            frames.append(frame)
    return frames


def box(frame):
    ys, xs = np.where(frame[..., 3] > 40)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def stacked(f, size=None):
    """Colours over mask."""
    rgb, a = f[..., :3], f[..., 3]
    top = Image.fromarray(np.clip(rgb, 0, 255).round().astype(np.uint8), 'RGB')
    mask = Image.fromarray(np.clip(a, 0, 255).round().astype(np.uint8), 'L')
    if size:
        top, mask = top.resize(size, Image.LANCZOS), mask.resize(size, Image.LANCZOS)
    w, h = top.size
    sheet = Image.new('RGB', (w, h * 2))
    sheet.paste(top, (0, 0))
    sheet.paste(Image.merge('RGB', [mask] * 3), (0, h))
    return sheet.tobytes()


def write(name, frames, size=None):
    out = OUT / f'{name}.mp4'
    h, w = frames[0].shape[:2]
    w, h = size or (w, h)
    ffmpeg = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h * 2}', '-r', str(FPS), '-i', '-',
        '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', str(CRF), '-profile:v', 'high',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-movflags', '+faststart', '-an', str(out)], stdin=subprocess.PIPE)
    for f in frames:
        ffmpeg.stdin.write(stacked(f, size))
    ffmpeg.stdin.close()
    if ffmpeg.wait():
        raise SystemExit(f'ffmpeg could not write {out}')
    print(f'{out.relative_to(ROOT)}: {len(frames)} frames, {w}x{h}, {out.stat().st_size / 1024:.0f} KB')
    return round(len(frames) * 1000 / FPS)


def still(name, frame, size=None):
    im = Image.fromarray(np.clip(frame, 0, 255).round().astype(np.uint8), 'RGBA')
    if size:
        im = im.resize(size, Image.LANCZOS)
    im.save(OUT / f'{name}.webp', quality=88, method=6)


def stand(frames, ref):
    """Where he stands in a film: the box in standing-heights, the drop below his feet, his offset from the middle."""
    h, w = frames[0].shape[:2]
    x0, y0, x1, y1 = box(ref)
    ground = max(box(f)[3] for f in frames)
    return {'k': round(h / (ground - y0 + 1), 4), 'drop': round((h - 1 - ground) / h, 4), 'dx': round(((x0 + x1) / 2 - w / 2) / w, 4)}


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    kit = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*'):
        old.unlink()
    films = {}

    # the idle: away from the home frame and back, so every idle film starts and ends on it
    held = sharp_frames(IDLE_CUE, kit)
    home = held[HOME][0]
    whole = [f for f, _ in held]
    where = stand(whole, home)
    still('watch', home)
    for name, (far, wait) in IDLES.items():
        step = 1 if far > HOME else -1
        there = held[HOME:far + step:step]
        turn = (there[-1][0], there[-1][1] + wait)
        frames = on_clock(there[:-1] + [turn] + there[-2::-1])
        films[name] = {'w': home.shape[1], 'h': home.shape[0], 'ms': write(name, frames), **where}

    for name, cue in FIGURES.items():
        held = sharp_frames(cue, kit)
        frames = on_clock(held)
        # he stands upright in the first frame, except in the bow, which ends upright
        films[name] = {'w': frames[0].shape[1], 'h': frames[0].shape[0], 'ms': write(name, frames),
                       **stand(frames, frames[-1] if name == 'bow' else frames[0])}

    for name, cue in FACES.items():
        frames = on_clock(webp_frames(kit / 'Game' / f'{cue}.webp'))
        boxes = np.array([box(f) for f in frames])
        x0, y0 = max(int(boxes[:, 0].min()) - 4, 0), max(int(boxes[:, 1].min()) - 4, 0)
        x1 = min(int(boxes[:, 2].max()) + 5, frames[0].shape[1])
        y1 = min(int(boxes[:, 3].max()) + 5, frames[0].shape[0])
        h = round(FACE_W * (y1 - y0) / (x1 - x0) / 2) * 2
        cut = [f[y0:y1, x0:x1] for f in frames]
        # spread his colours past his outline, as the full-size cut does
        ready = []
        for f in cut:
            a = f[..., 3] / 255
            soft = np.maximum(blur(a * 255, 3) / 255, 1e-3)
            spread = np.dstack([blur(f[..., c] * a, 3) / soft for c in range(3)])
            spread = np.where((soft > 0.01)[..., None], spread, 40)
            ready.append(np.dstack([f[..., :3] * a[..., None] + spread * (1 - a[..., None]), f[..., 3]]))
        films[name] = {'w': FACE_W, 'h': h, 'ms': write(name, ready, (FACE_W, h))}
        still(name, cut[0], (FACE_W, h))

    MANIFEST.write_text('// Written by scripts/build-host-films.py. Kelly\'s reaction clips, as stacked films.\n'
                        f'export const FILMS = {json.dumps(films, indent=2)};\n')
    total = sum(f.stat().st_size for f in OUT.glob('*'))
    print(f'{len(films)} films, {total / 1024:.0f} KB with their stills')


if __name__ == '__main__':
    main()

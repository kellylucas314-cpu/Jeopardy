#!/usr/bin/env python3
"""Cut Napoleon's reaction clips into the films the game plays.

Kelly made the clips (video models, cut up into cues with ChatGPT) and handed
them over as a kit: "Clue Reactions - Claude Kit", whose Game/ folder holds
each cue as an animated WebP with a see-through background. The kit is not in
this repository (42 MB); it lives in the project's files. Point this script at
the unzipped kit folder:

    python3 scripts/build-host-films.py "/path/to/Clue Reactions - Claude Kit"

Browsers cannot all play a film with a see-through background, so each cue is
written as a stacked film, like the hat tip: his colours in the top half, his
outline as a white-on-black mask in the bottom half. src/host.js puts the two
back together on a canvas.

    public/assets/host/films/<name>.mp4
    src/host-films.js   (sizes, and where he stands in each film)

Two kinds:
  figure  the whole of him, played on the standing host (wide screens)
  face    head and shoulders, played in the small verdict picture (phones)

Needs ffmpeg, Pillow and numpy.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'assets' / 'host' / 'films'
MANIFEST = ROOT / 'src' / 'host-films.js'
CRF = 26

# name in the game: (cue in the kit, the frame where he stands upright: 'first' or 'last')
FIGURES = {
    'pleased': ('05-pleased-crossed-ankles', 'first'),
    'attention': ('18-pleased-at-attention', 'first'),
    'fist': ('19-raise-victory-fist', 'first'),
    'shrug': ('16-exasperated-shrug', 'first'),
    'yell': ('23-throw-hands-up-and-yell', 'first'),
    'stomp': ('15-impatient-boot-stomps', 'first'),
    'point': ('27-point-to-the-board', 'first'),
    'bow': ('20-sweeping-victory-bow', 'last'),
}
FACES = {
    'face-smirk': '38-amused-smirk',
    'face-grin': '31-break-into-a-grin',
    'face-startled': '39-startled-double-take',
    'face-stern': '30-stern-sidelong-look',
}
FACE_W = 240


FPS = 24


def frames_of(path):
    """The cue's frames on an even 24 fps clock (the kit holds some frames for two ticks)."""
    im = Image.open(path)
    held = [(np.asarray(f.convert('RGBA')).astype(np.float32), f.info.get('duration') or 42) for f in ImageSequence.Iterator(im)]
    frames, clock, tick = [], 0.0, 1000 / FPS
    for frame, ms in held:
        clock += ms
        while len(frames) * tick < clock - tick / 2:
            frames.append(frame)
    return frames


def box(frame):
    ys, xs = np.where(frame[..., 3] > 40)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def blur(plane, radius):
    im = Image.fromarray(np.clip(plane, 0, 255).round().astype(np.uint8), 'L')
    return np.asarray(im.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)


def stacked(f, size):
    """Colours over mask. The colours are spread past his outline so a soft edge never picks up the backdrop."""
    rgb, a = f[..., :3], f[..., 3] / 255
    soft = np.maximum(blur(a * 255, 3) / 255, 1e-3)
    spread = np.dstack([blur(rgb[..., c] * a, 3) / soft for c in range(3)])
    spread = np.where((soft > 0.01)[..., None], spread, 40)
    colour = rgb * a[..., None] + spread * (1 - a[..., None])
    top = Image.fromarray(np.clip(colour, 0, 255).round().astype(np.uint8), 'RGB').resize(size, Image.LANCZOS)
    mask = Image.fromarray((a * 255).round().astype(np.uint8), 'L').resize(size, Image.LANCZOS)
    sheet = Image.new('RGB', (size[0], size[1] * 2))
    sheet.paste(top, (0, 0))
    sheet.paste(Image.merge('RGB', [mask] * 3), (0, size[1]))
    return sheet.tobytes()


def write(name, frames, size):
    out = OUT / f'{name}.mp4'
    fps = FPS
    ffmpeg = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{size[0]}x{size[1] * 2}', '-r', str(fps), '-i', '-',
        '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', str(CRF), '-profile:v', 'high',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-movflags', '+faststart', '-an', str(out)], stdin=subprocess.PIPE)
    for f in frames:
        ffmpeg.stdin.write(stacked(f, size))
    ffmpeg.stdin.close()
    if ffmpeg.wait():
        raise SystemExit(f'ffmpeg could not write {out}')
    print(f'{out.relative_to(ROOT)}: {len(frames)} frames at {fps} fps, {size[0]}x{size[1]}, {out.stat().st_size / 1024:.0f} KB')
    return round(len(frames) * 1000 / fps)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    game = Path(sys.argv[1]) / 'Game'
    OUT.mkdir(parents=True, exist_ok=True)
    films = {}

    for name, (cue, ref) in FIGURES.items():
        frames = frames_of(game / f'{cue}.webp')
        h, w = frames[0].shape[:2]
        x0, y0, x1, y1 = box(frames[0] if ref == 'first' else frames[-1])
        ground = max(box(f)[3] for f in frames)
        stand = ground - y0 + 1
        films[name] = {
            'w': w, 'h': h, 'ms': write(name, frames, (w, h)),
            # the film's box, in heights of the standing figure; how far the box runs below his
            # feet; and how far he stands from the box's middle (both as shares of the box)
            'k': round(h / stand, 4),
            'drop': round((h - 1 - ground) / h, 4),
            'dx': round(((x0 + x1) / 2 - w / 2) / w, 4),
        }

    for name, cue in FACES.items():
        frames = frames_of(game / f'{cue}.webp')
        boxes = np.array([box(f) for f in frames])
        x0, y0 = max(int(boxes[:, 0].min()) - 4, 0), max(int(boxes[:, 1].min()) - 4, 0)
        x1 = min(int(boxes[:, 2].max()) + 5, frames[0].shape[1])
        y1 = min(int(boxes[:, 3].max()) + 5, frames[0].shape[0])
        h = round(FACE_W * (y1 - y0) / (x1 - x0) / 2) * 2
        films[name] = {'w': FACE_W, 'h': h, 'ms': write(name, [f[y0:y1, x0:x1] for f in frames], (FACE_W, h))}

    MANIFEST.write_text('// Written by scripts/build-host-films.py. Kelly\'s reaction clips, as stacked films.\n'
                        f'export const FILMS = {json.dumps(films, indent=2)};\n')
    total = sum((OUT / f'{n}.mp4').stat().st_size for n in films)
    print(f'{len(films)} films, {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()

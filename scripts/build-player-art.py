"""Make web copies of the 13 player characters from the art kit.

  python3 scripts/build-player-art.py <kit>/public/assets/players

The kit's poses are 960x1440 transparent PNGs (about 1 MB each). The game ships
640x960 WebP copies with alpha (same art, same foot baseline, scaled 2/3) plus the
kit's portraits as they are, and rewrites manifest.json to point at them.
"""
import json, shutil, sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / 'public' / 'assets' / 'players'
out.mkdir(parents=True, exist_ok=True)
manifest = json.loads((src / 'manifest.json').read_text())
scale = 2 / 3
for c in manifest['characters']:
    d = out / c['id']
    d.mkdir(exist_ok=True)
    shutil.copy(src / c['portrait'], d / 'portrait.webp')
    for pose, rel in list(c['poses'].items()):
        im = Image.open(src / rel).convert('RGBA')
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        im.save(d / f'{pose}.webp', 'WEBP', quality=84, method=6)
        c['poses'][pose] = f"{c['id']}/{pose}.webp"
    c['portrait'] = f"{c['id']}/portrait.webp"
cv = manifest['canvas']
manifest['canvas'] = {
    'width': round(cv['width'] * scale), 'height': round(cv['height'] * scale),
    'format': 'Transparent WebP', 'baseline': round(cv['baseline'] * scale),
}
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(len(manifest['characters']), 'characters ->', out)

#!/usr/bin/env python3
"""The app icon and the link-preview card.

  python3 scripts/build-app-icons.py [title-screenshot.png]

Writes public/icon-512.png, public/icon-192.png, public/apple-touch-icon.png (180) and
public/favicon.png (64): Napoleon's smirk from the expression sheet, cut off its cream ground
and set on the game's honey. With a 1200x630 picture of the title screen as its argument it
also writes public/share-card.jpg, the picture a phone shows when the link is sent.

Needs numpy and Pillow, plus scipy or opencv (the same as build-host-poses.py).
"""
import importlib.util
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("poses", ROOT / "scripts" / "build-host-poses.py")
poses = importlib.util.module_from_spec(spec)
spec.loader.exec_module(poses)

HONEY = (237, 189, 90)
MOOD = "smirk"


def bust():
    sheet = Image.open(poses.SHEETS / "napoleon-expressions.webp")
    cell = dict(zip(poses.EXPRESSIONS, poses.cells_of(sheet, 4, 3)))[MOOD]
    cell = poses.strip_label(cell)
    diff = poses.diff_from_ground(cell)
    # the ground is the flat cream that reaches the top or the sides; he runs off the bottom
    labels, _ = poses.label(diff <= 14)
    edge = np.unique(np.concatenate([labels[0], labels[:, 0], labels[:, -1]]))
    ground = np.isin(labels, edge[edge > 0])
    ground = poses.grow(ground, diff <= 44, 4 * poses.S)
    alpha = Image.fromarray((~ground * 255).astype("uint8"))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
    out = Image.fromarray(cell).convert("RGBA")
    out.putalpha(alpha)
    return out


def icon(fig, size):
    """His bust on honey: the hat nearly as wide as the tile, cut off at the chest by its foot."""
    box = fig.getbbox()
    fig = fig.crop((box[0], box[1], box[2], fig.height))
    scale = size * 0.94 / fig.width
    fig = fig.resize((round(fig.width * scale), round(fig.height * scale)), Image.LANCZOS)
    tile = Image.new("RGBA", (size, size), HONEY + (255,))
    tile.alpha_composite(fig, ((size - fig.width) // 2, round(size * 0.1)))
    return tile.convert("RGB")


def main():
    fig = bust()
    pub = ROOT / "public"
    for name, size in (("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180), ("favicon.png", 64)):
        icon(fig, size).save(pub / name, optimize=True)
        print(name)
    if len(sys.argv) > 1:
        card = Image.open(sys.argv[1]).convert("RGB").resize((1200, 630), Image.LANCZOS)
        card.save(pub / "share-card.jpg", quality=86, optimize=True, progressive=True)
        print("share-card.jpg")


if __name__ == "__main__":
    main()

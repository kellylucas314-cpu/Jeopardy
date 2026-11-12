#!/usr/bin/env python3
"""Cut Napoleon's poses and expressions out of the character sheets.

  python3 scripts/build-host-poses.py

Reads art-src/character-sheets/2x/*.webp (not deployed) and writes
public/assets/host/<pose>.webp (transparent full figures),
public/assets/host/face-<mood>.webp (square busts on the sheet's cream) and
src/host-poses.js (each pose's size, and its height next to the standing figure).

The 2x sheets are the original sheets enlarged once with OpenCV's EDSR x2
super-resolution model, so a pose stays crisp when it stands half a screen tall.

The sheets are grids of labelled cells on a flat cream ground. Each figure is
matted in two passes: a strict flood from the cell's edge (so cream breeches
never leak into the background), then a few pixels of growth into the soft
fringe so no pale halo is left around the figure.

Needs numpy and Pillow, plus scipy or opencv for connected regions.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / "art-src" / "character-sheets" / "2x"
OUT = ROOT / "public" / "assets" / "host"
MANIFEST = ROOT / "src" / "host-poses.js"
S = 2  # the sheets are twice their drawn size; pixel distances below scale with it

HOST_POSES = ["neutral", "welcome", "choose", "thinking",
              "victory", "suspicious", "shocked", "defeated"]
# "bow" is skipped: its hand is drawn apart from the arm and cuts out as a floating piece.
BODY_MOTIONS = ["walking", "marching", "pivot", "leaning", "crouching",
                "stepping-back", "hands-on-hips", "arms-crossed", "bow", "shrug"]
SKIP = {"bow"}
# The body-motion sheet draws him a little smaller than the host-pose sheet.
BODY_SCALE = 1.11
EXPRESSIONS = ["neutral", "smirk", "victorious", "puzzled",
               "suspicious", "surprised", "annoyed", "frustrated",
               "worried", "thinking", "delighted", "defeated"]


def label(mask):
    """Number the 4-connected regions of a mask: (labels, count), 0 is outside."""
    try:
        from scipy import ndimage
        return ndimage.label(mask)
    except ImportError:
        import cv2
        n, labels = cv2.connectedComponents(mask.astype("uint8"), connectivity=4)
        return labels, n - 1


def grow(ground, passable, steps):
    for _ in range(steps):
        ring = np.zeros_like(ground)
        ring[1:, :] |= ground[:-1, :]
        ring[:-1, :] |= ground[1:, :]
        ring[:, 1:] |= ground[:, :-1]
        ring[:, :-1] |= ground[:, 1:]
        ground |= ring & passable
    return ground


def diff_from_ground(arr):
    ground = np.median(arr[2:12, 2:12].reshape(-1, 3), axis=0)
    return np.abs(arr.astype(int) - ground).sum(axis=2)


def grid_lines(diff, axis, cells):
    """Positions of the sheet's ruled lines along one axis, as cell bounds."""
    busy = (diff > 30).mean(axis=axis)
    size = len(busy)
    lines = [i for i in range(size) if busy[i] > 0.45]
    groups = []
    for i in lines:
        if groups and i - groups[-1][-1] <= 3 * S:
            groups[-1].append(i)
        else:
            groups.append([i])
    centers = [int(np.mean(g)) for g in groups]
    bounds = []
    step = size / cells
    for k in range(cells + 1):
        ideal = k * step
        near = [c for c in centers if abs(c - ideal) < step * 0.2]
        bounds.append(min(near, key=lambda c: abs(c - ideal)) if near else int(round(ideal)))
    return bounds


def cells_of(sheet, cols, rows):
    arr = np.asarray(sheet.convert("RGB"))
    diff = diff_from_ground(arr)
    xs = grid_lines(diff, 0, cols)
    ys = grid_lines(diff, 1, rows)
    pad = 6 * S
    for r in range(rows):
        for c in range(cols):
            yield arr[ys[r] + pad:ys[r + 1] - pad, xs[c] + pad:xs[c + 1] - pad]


def strip_label(cell):
    """Drop the caption under the figure: text rows, then the gap above them."""
    diff = diff_from_ground(cell)
    rows = (diff > 45).sum(axis=1)
    y = len(rows) - 1
    while y > 0 and rows[y] == 0:
        y -= 1
    while y > 0 and rows[y] > 0:
        y -= 1
    gap_end = y
    while y > 0 and rows[y] == 0:
        y -= 1
    return cell[: (y + gap_end) // 2 + 1]


def matte(cell, strict=12, soft=44):
    diff = diff_from_ground(cell)
    h, w = diff.shape
    # the ground is whatever flat cream reaches the edge of the cell
    labels, _ = label(diff <= strict)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    ground = np.isin(labels, edge[edge > 0])
    # eat the pale fringe, a pixel at a time, never deeper
    ground = grow(ground, diff <= soft, 4 * S)
    # ground showing through the figure (between the legs, inside a bent arm)
    labels, n = label((diff <= 9) & ~ground)
    sizes = np.bincount(labels.ravel(), minlength=n + 1)
    holes = np.flatnonzero(sizes > 260 * S * S)
    ground |= np.isin(labels, holes[holes > 0])
    # the soft floor shadow under the boots: pale, and only at the very bottom
    floor = np.zeros((h, w), bool)
    floor[int(h * 0.86):] = True
    ground |= floor & (cell.min(axis=2) > 180)
    ground = grow(ground, diff <= soft, 2 * S)
    # keep the figure, drop stray specks
    labels, n = label(~ground)
    sizes = np.bincount(labels.ravel(), minlength=n + 1)
    sizes[0] = 0
    # (he is drawn in one piece, so anything much smaller than him is a speck or a stray letter)
    keep = np.isin(labels, np.flatnonzero(sizes >= sizes.max() * 0.03))
    keep &= labels > 0
    alpha = Image.fromarray((keep * 255).astype("uint8"))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    out = Image.fromarray(cell).convert("RGBA")
    out.putalpha(alpha)
    return out.crop(out.getbbox())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [("napoleon-host-poses.webp", 4, 2, HOST_POSES, 1.0),
            ("napoleon-body-motions.webp", 5, 2, BODY_MOTIONS, BODY_SCALE)]
    sizes = {}
    for name, cols, rows, poses, scale in jobs:
        sheet = Image.open(SHEETS / name)
        for pose, cell in zip(poses, cells_of(sheet, cols, rows)):
            if pose in SKIP:
                continue
            figure = matte(strip_label(cell))
            figure.save(OUT / f"{pose}.webp", quality=86, method=6)
            sizes[pose] = (*figure.size, scale)
            print(f"{pose:14s} {figure.size}")

    stand = sizes["neutral"][1]
    table = {p: [w, h, round(h * k / stand, 3)] for p, (w, h, k) in sizes.items()}
    MANIFEST.write_text(
        "// Written by scripts/build-host-poses.py. [width, height, height next to the standing figure]\n"
        "export const POSES = {\n"
        + ",\n".join(f"  {json.dumps(p)}: {json.dumps(v)}" for p, v in sorted(table.items()))
        + "\n};\n")

    sheet = Image.open(SHEETS / "napoleon-expressions.webp")
    for mood, cell in zip(EXPRESSIONS, cells_of(sheet, 4, 3)):
        bust = Image.fromarray(strip_label(cell))
        w, h = bust.size
        side = int(min(w, h) * 0.8)
        left = (w - side) // 2
        face = bust.crop((left, 0, left + side, side)).resize((240, 240), Image.LANCZOS)
        face.save(OUT / f"face-{mood}.webp", quality=88, method=6)
    print(f"{len(EXPRESSIONS)} faces")


if __name__ == "__main__":
    main()

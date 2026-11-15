"""Split the design sheets (flattened scans in PDFs) into one transparent file per design.

Each sheet is a single black-on-white image. Ink is found by thresholding, nearby ink is grouped
into components, and the components listed in SHEETS are cut out with white turned transparent.

Writes apps/web/public/designs/<id>.png per design (black + alpha mask; the web app tints it with
CSS) and packages/shared/designs.json (id, name, width, height, price), which the web app and the
API both read.

The sheet PDFs are not in the repo: put them at the repo root first (they are git-ignored).
Run from the repo root:
  python3 -m venv .venv && .venv/bin/pip install pymupdf pillow numpy scipy
  .venv/bin/python tools/split_designs.py            # write the files
  .venv/bin/python tools/split_designs.py --debug    # write numbered overlays to tools/debug/

To add a sheet: add it to SHEETS with an empty list, run --debug, read the component numbers off
the overlay, then list each design as (id, [component numbers], rotate_upright, price).
"""

import io
import json
import sys
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

RADIUS = 14  # px; ink closer than about twice this is grouped into one component
INK = 200  # pixels darker than this count as ink when grouping
MIN_INK = 400  # components with fewer ink pixels are scan specks
NOISE = 12  # alpha below this (near-white JPEG noise) becomes fully transparent

# (id, component numbers at RADIUS, rotate, price): rotate=True turns text that runs down the sheet
# upright; price is what one print of the design costs, in VND.
SHEETS = {
    'V1_final.pdf': [
        ('v1-star', [0], False, 10000),
        ('v1-dog-wide', [1], False, 40000),
        ('v1-dog-ears', [6], False, 40000),
        ('v1-dot', [9], False, 10000),
        ('v1-iu', [3, 5], False, 10000),
        ('v1-trom-viaaaaaa', [4, 7], True, 20000),
        ('v1-people-unpleaser', [2, 8], True, 20000),
        ('v1-aa-notbattery', [10], False, 10000),
        ('v1-aa-notbattery-wavy', [11], False, 20000),
        ('v1-heart', [14], False, 40000),
        ('v1-spiral', [15], False, 40000),
        ('v1-yeu', [13], False, 10000),
        ('v1-ai', [16], False, 20000),
        ('v1-human-rejection', [12], True, 10000),
        ('v1-may-you-find-liberation', [17, 18], False, 10000),
        ('v1-from-the-river-to-the-sea', [19, 22, 23, 24, 20, 21], False, 20000),
    ],
    'V2_-_final.pdf': [
        ('v2-dog-long', [0], False, 40000),
        ('v2-dog-upside-down', [1], False, 40000),
        ('v2-love', [3, 5], True, 20000),
        ('v2-not-tiny-compact', [2, 4, 6], True, 10000),
        ('v2-statue', [9], False, 40000),
        ('v2-running-out-of-time', [7, 14, 18, 10, 15, 17, 8, 11, 16], True, 20000),
        ('v2-thuong', [13], True, 20000),
        ('v2-flower', [12], False, 20000),
        ('v2-star', [19], False, 10000),
        ('v2-horse-on-star', [20], False, 40000),
        ('v2-clover', [21], False, 10000),
        ('v2-horse-skeleton', [23], False, 20000),
        ('v2-three-stars', [22], False, 10000),
    ],
}


def components(pdf: Path):
    doc = pymupdf.open(pdf)
    xref = doc[0].get_images(full=True)[0][0]
    gray = np.asarray(Image.open(io.BytesIO(doc.extract_image(xref)['image'])).convert('L'))
    ink = gray < INK
    yy, xx = np.ogrid[-RADIUS : RADIUS + 1, -RADIUS : RADIUS + 1]
    labels, _ = ndi.label(ndi.binary_dilation(ink, structure=xx * xx + yy * yy <= RADIUS * RADIUS))
    kept = [
        i
        for i, sl in enumerate(ndi.find_objects(labels), 1)
        if ((labels[sl] == i) & ink[sl]).sum() >= MIN_INK
    ]
    return gray, labels, kept


def cut(gray, labels, kept, numbers, rotate):
    region = np.isin(labels, [kept[n] for n in numbers])
    ys, xs = np.nonzero(region & (gray < INK))
    box = np.s_[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    alpha = np.where(region[box], 255 - gray[box], 0).astype(np.uint8)
    alpha[alpha < NOISE] = 0
    img = Image.merge('LA', [Image.new('L', alpha.shape[::-1], 0), Image.fromarray(alpha)])
    return img.rotate(90, expand=True) if rotate else img


def debug(root: Path):
    out = root / 'tools' / 'debug'
    out.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default(size=48)
    for name in SHEETS:
        gray, labels, kept = components(root / name)
        im = Image.fromarray(gray).convert('RGB')
        draw = ImageDraw.Draw(im)
        for n, sl in enumerate(ndi.find_objects(labels)[i - 1] for i in kept):
            y, x = sl
            draw.rectangle([x.start, y.start, x.stop, y.stop], outline=(255, 0, 0), width=4)
            draw.text((x.start + 6, y.start), str(n), fill=(0, 90, 255), font=font)
        im.save(out / f'{Path(name).stem}.png')
        print('wrote', out / f'{Path(name).stem}.png')


def main():
    root = Path(__file__).resolve().parent.parent
    if '--debug' in sys.argv:
        return debug(root)
    png_dir = root / 'apps/web/public/designs'
    png_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, designs in SHEETS.items():
        gray, labels, kept = components(root / name)
        used = [n for _, numbers, _, _ in designs for n in numbers]
        assert sorted(used) == list(range(len(kept))), f'{name}: components unused or repeated'
        for design_id, numbers, rotate, price in designs:
            img = cut(gray, labels, kept, numbers, rotate)
            img.save(png_dir / f'{design_id}.png', optimize=True)
            manifest.append(
                {
                    'id': design_id,
                    'name': design_id.split('-', 1)[1].replace('-', ' '),
                    'width': img.width,
                    'height': img.height,
                    'price': price,
                }
            )
    (root / 'packages/shared/designs.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'wrote {len(manifest)} designs')


if __name__ == '__main__':
    main()

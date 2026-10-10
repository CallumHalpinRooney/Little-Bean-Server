#!/usr/bin/env python3
"""Colour notes: pairs of real cut patches (photo above, paint below) / painting (whole), plus a
full-bleed 1:1 detail of the brushwork.

Top chip = a real patch of the photo; bottom chip = the patch of the painting whose colour is
closest to it. Nothing is drawn or generated: every pixel is Janet's photo or Janet's paint.
"""
import os, sys, numpy as np, cv2
from PIL import Image, ImageCms

U = '/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b/'
OUT = '/home/user/Little-Bean-Server/reel/colour_notes'
os.makedirs(OUT, exist_ok=True)
BG = (0xF5, 0xF3, 0xEF)
W, H, M, GAP = 1080, 1350, 24, 16
CHIP_GAP = 12
CHIP_W, CHIP_H = 249, 230          # set per slide in render(); defaults for 4 columns

# Only pairings with several genuine chip matches (see score.py): the others were left out.
PAIRS = [   # (notes slide, detail slide, photo id, photo trim, painting id, painting trim)
    ('01_notes_ferns',   '02_detail_green_landscape', '8dbfd0ac', 33, '9daff783', 54),
    ('03_notes_thistle', '04_detail_pink_blue',       '414c7a6a', 33, 'e017653b', 54),
]
MAX_DE = 12          # a chip pair is only shown if the colours genuinely match (Lab distance)


def load(fid, trim):
    im = Image.open(f'{U}{fid}-image.jpg').convert('RGB')
    return im.crop((trim, trim, im.width - trim, im.height - trim)) if trim else im


def lab(a): return cv2.cvtColor(a, cv2.COLOR_RGB2LAB).astype(np.float32)


def patch_field(img, pw, ph, scale):
    """Mean Lab and texture spread of every pw x ph window (computed at reduced scale)."""
    a = np.asarray(img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS))
    L = lab(a); k = (max(3, int(pw * scale)), max(3, int(ph * scale)))
    mean = cv2.blur(L, k); sq = cv2.blur(L * L, k)
    std = np.sqrt(np.maximum(sq - mean * mean, 0)).mean(-1)
    hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
    bad = ((hsv[..., 1] < 20) & (hsv[..., 2] > 225)).astype(np.float32)    # white borders / collage gutters
    bad = cv2.blur(bad, k) > 0.02
    my, mx = k[1] // 2 + 2, k[0] // 2 + 2
    bad[:my] = bad[-my:] = True; bad[:, :mx] = bad[:, -mx:] = True
    return mean, std, bad


def crop_at(img, cx, cy, pw, ph):
    x0 = int(np.clip(cx - pw / 2, 0, img.width - pw)); y0 = int(np.clip(cy - ph / 2, 0, img.height - ph))
    return img.crop((x0, y0, x0 + pw, y0 + ph)).resize((CHIP_W, CHIP_H), Image.LANCZOS)


def chips(photo, paint):
    # chip windows in source pixels (aspect = chip aspect); painting chips show brushwork up close
    pw_ph = max(int(photo.width * 0.13), int(CHIP_W / 1.6)); ph_ph = int(pw_ph * CHIP_H / CHIP_W)   # never enlarge >1.6x
    pw_pa = max(int(paint.width * 0.11), int(CHIP_W / 1.3)); ph_pa = int(pw_pa * CHIP_H / CHIP_W)
    s1, s2 = 240 / photo.width, 240 / paint.width
    m1, sd1, bad1 = patch_field(photo, pw_ph, ph_ph, s1)
    m2, sd2, bad2 = patch_field(paint, pw_pa, ph_pa, s2)
    # candidate photo colours: k-means on the photo
    px = m1[~bad1][::7]
    _, lb, cen = cv2.kmeans(px, 10, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .5), 4,
                            cv2.KMEANS_PP_CENTERS)
    flat2 = m2.reshape(-1, 3); ok2 = ~bad2.ravel()
    cands = []
    for c in cen:
        d1 = np.linalg.norm(m1 - c, axis=2) + 0.6 * sd1; d1[bad1] = 1e9
        y1, x1 = np.unravel_index(d1.argmin(), d1.shape); real = m1[y1, x1]
        d2 = np.linalg.norm(flat2 - real, axis=1) + 0.4 * sd2.ravel(); d2[~ok2] = 1e9
        j = d2.argmin(); y2, x2 = np.unravel_index(j, m2.shape[:2])
        cands.append((float(np.linalg.norm(flat2[j] - real)), real, (x1 / s1, y1 / s1), (x2 / s2, y2 / s2)))
    cands.sort(key=lambda c: c[0])
    pick = []
    for c in cands:                                   # genuine matches only, visibly different colours
        if c[0] > MAX_DE: continue
        if all(np.linalg.norm(c[1] - p[1]) > 18 for p in pick): pick.append(c)
        if len(pick) == 5: break
    pick.sort(key=lambda c: c[1][0])                  # dark to light
    out = [(crop_at(photo, *p[2], pw_ph, ph_ph), crop_at(paint, *p[3], pw_pa, ph_pa), p[0]) for p in pick]
    return out


def fit(img, box):
    s = min(box[0] / img.width, box[1] / img.height)
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()


def detail(paint):
    """Full-bleed 1:1 crop of the busiest brushwork (colour + texture variation)."""
    sc = 0.25; a = np.asarray(paint.resize((int(paint.width * sc), int(paint.height * sc))))
    L = lab(a); k = (int(W * sc), int(H * sc))
    var = (cv2.blur(L * L, k) - cv2.blur(L, k) ** 2).sum(-1)
    hx, hy = k[0] // 2, k[1] // 2
    var[:hy] = var[-hy:] = -1; var[:, :hx] = var[:, -hx:] = -1
    y, x = np.unravel_index(var.argmax(), var.shape)
    x0 = int(np.clip(x / sc - W / 2, 0, paint.width - W)); y0 = int(np.clip(y / sc - H / 2, 0, paint.height - H))
    return paint.crop((x0, y0, x0 + W, y0 + H))


for name, dname, pid, ptrim, aid, atrim in PAIRS:
    photo, paint = load(pid, ptrim), load(aid, atrim)
    page = Image.new('RGB', (W, H), BG)
    q = paint.resize((W - 2 * M, round(paint.height * (W - 2 * M) / paint.width)), Image.LANCZOS)
    chip_block = H - 2 * M - GAP - q.height
    CHIP_H = chip_block // 2; n = 4
    for _ in range(3):                                # chip count can depend on chip shape: settle it
        CHIP_W = (W - 2 * M - (n - 1) * CHIP_GAP) // n
        cs = chips(photo, paint)
        if len(cs) == n: break
        n = len(cs)
    n = len(cs)
    need = (W - 2 * M - (n - 1) * CHIP_GAP) // n
    if need != CHIP_W:                                # final safety: fit exactly n columns
        CHIP_W = need
        cs = [(a_.resize((CHIP_W, CHIP_H), Image.LANCZOS), b_.resize((CHIP_W, CHIP_H), Image.LANCZOS), d)
              for a_, b_, d in cs]
    x0 = (W - (n * CHIP_W + (n - 1) * CHIP_GAP)) // 2
    for i, (a_, b_, d) in enumerate(cs):
        x = x0 + i * (CHIP_W + CHIP_GAP)
        page.paste(a_, (x, M)); page.paste(b_, (x, M + CHIP_H))
    page.paste(q, (M, M + chip_block + GAP))
    page.save(f'{OUT}/{name}.jpg', quality=95, subsampling=0, icc_profile=srgb)
    detail(paint).save(f'{OUT}/{dname}.jpg', quality=95, subsampling=0, icc_profile=srgb)
    print(name, 'chips', n, f'{CHIP_W}x{CHIP_H}', 'match distances (Lab):', [round(c[2], 1) for c in cs])

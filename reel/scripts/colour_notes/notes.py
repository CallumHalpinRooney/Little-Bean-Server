#!/usr/bin/env python3
"""Colour notes: nature photo (whole) / five pairs of real cut patches / painting (whole).

Top chip = a real patch of the photo; bottom chip = the patch of the painting whose colour is
closest to it. Nothing is drawn or generated: every pixel is Janet's photo or Janet's paint.
"""
import os, sys, numpy as np, cv2
from PIL import Image, ImageCms

U = '/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b/'
OUT = '/home/user/Little-Bean-Server/reel/colour_notes'
os.makedirs(OUT, exist_ok=True)
BG = (0xF5, 0xF3, 0xEF)
W, H, M, GAP = 1080, 1350, 40, 30
PHOTO_BOX = (1000, 430)
CHIP_W, CHIP_H, CHIP_GAP = 160, 130, 50
PAINT_BOX = (1000, H - 2 * M - PHOTO_BOX[1] - 2 * CHIP_H - 2 * GAP)      # 1000 x 520

# Only pairings with several genuine chip matches (see score.py): the others were left out.
PAIRS = [   # (painting slide, notes slide, photo id, photo trim, painting id, painting trim)
    ('01_painting_green_landscape', '02_notes_ferns', '8dbfd0ac', 33, '9daff783', 54),
    ('03_painting_pink_blue',       '04_notes_thistle', '414c7a6a', 33, 'e017653b', 54),
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
    pw_ph = int(photo.width * 0.13); ph_ph = int(pw_ph * CHIP_H / CHIP_W)
    pw_pa = int(paint.width * 0.11); ph_pa = int(pw_pa * CHIP_H / CHIP_W)
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
        if all(np.linalg.norm(c[1] - p[1]) > 14 for p in pick): pick.append(c)
        if len(pick) == 5: break
    pick.sort(key=lambda c: c[1][0])                  # dark to light
    out = [(crop_at(photo, *p[2], pw_ph, ph_ph), crop_at(paint, *p[3], pw_pa, ph_pa), p[0]) for p in pick]
    return out


def fit(img, box):
    s = min(box[0] / img.width, box[1] / img.height)
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
for pname, name, pid, ptrim, aid, atrim in PAIRS:
    photo, paint = load(pid, ptrim), load(aid, atrim)
    full = Image.new('RGB', (W, H), BG)               # the painting on its own, as on a gallery wall
    q = fit(paint, (W - 2 * M - 40, H - 2 * M - 120)); full.paste(q, ((W - q.width) // 2, (H - q.height) // 2))
    full.save(f'{OUT}/{pname}.jpg', quality=95, subsampling=0, icc_profile=srgb)
    page = Image.new('RGB', (W, H), BG)
    p = fit(photo, PHOTO_BOX); page.paste(p, ((W - p.width) // 2, M + (PHOTO_BOX[1] - p.height) // 2))
    y = M + PHOTO_BOX[1] + GAP
    cs = chips(photo, paint)
    x0 = (W - (len(cs) * CHIP_W + (len(cs) - 1) * CHIP_GAP)) // 2
    for i, (a, b, d) in enumerate(cs):
        x = x0 + i * (CHIP_W + CHIP_GAP)
        page.paste(a, (x, y)); page.paste(b, (x, y + CHIP_H))
    y += 2 * CHIP_H + GAP
    q = fit(paint, PAINT_BOX); page.paste(q, ((W - q.width) // 2, y + (PAINT_BOX[1] - q.height) // 2))
    page.save(f'{OUT}/{name}.jpg', quality=95, subsampling=0, icc_profile=srgb)
    print(name, 'match distances (Lab):', [round(c[2], 1) for c in cs])

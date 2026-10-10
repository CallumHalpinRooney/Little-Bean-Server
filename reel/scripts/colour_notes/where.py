#!/usr/bin/env python3
"""'Where it comes from' carousel: Janet in the heather, then colour notes (real photo patches
over matching real paint patches) for each honest photo->painting pairing, then a detail."""
import sys; sys.argv = ['x']
src = open('/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad/notes/notes.py').read()
exec(src.split('srgb = ImageCms')[0])
srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
_d = src[src.index('def detail('):]; exec(_d[:_d.index('\n\n\n')])          # reuse detail() from notes.py
I = '/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/images/'
OUT = '/home/user/Little-Bean-Server/reel/where_it_comes_from'
os.makedirs(OUT, exist_ok=True)
def L(f): return Image.open(I + f).convert('RGB')
def save(im, name): im.save(f'{OUT}/{name}.jpg', quality=95, subsampling=0, icc_profile=srgb)

def chips(photo, paint, max_de=9.0):
    """Like notes.chips, but photo patches must be in focus and paint patches single-coloured."""
    pw_ph = max(int(photo.width * 0.16), int(CHIP_W / 1.3)); ph_ph = int(pw_ph * CHIP_H / CHIP_W)
    pw_pa = max(int(paint.width * 0.11), int(CHIP_W / 1.3)); ph_pa = int(pw_pa * CHIP_H / CHIP_W)
    s1, s2 = 240 / photo.width, 240 / paint.width
    m1, sd1, bad1 = patch_field(photo, pw_ph, ph_ph, s1)
    m2, sd2, bad2 = patch_field(paint, pw_pa, ph_pa, s2)
    g = cv2.cvtColor(np.asarray(photo.resize((int(photo.width * s1), int(photo.height * s1)))), cv2.COLOR_RGB2GRAY)
    sharp = cv2.blur(np.abs(cv2.Laplacian(g.astype(np.float32), cv2.CV_32F)), (max(3, int(pw_ph * s1)), max(3, int(ph_ph * s1))))
    sharp = sharp / (np.percentile(sharp[~bad1], 90) + 1e-6)
    bad1 = bad1 | (sharp < 0.55)                          # in-focus parts only
    bad2 = bad2 | (sd2 > np.percentile(sd2[~bad2], 60))   # paint patch must be one colour, not a mix
    px = m1[~bad1][::5]
    _, lb, cen = cv2.kmeans(px, 10, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .5), 4, cv2.KMEANS_PP_CENTERS)
    flat2 = m2.reshape(-1, 3); ok2 = ~bad2.ravel(); cands = []
    for c in cen:
        d1 = np.linalg.norm(m1 - c, axis=2) - 6 * np.minimum(sharp, 1.5); d1[bad1] = 1e9
        y1, x1 = np.unravel_index(d1.argmin(), d1.shape); real = m1[y1, x1]
        d2 = np.linalg.norm(flat2 - real, axis=1); d2[~ok2] = 1e9
        j = d2.argmin(); y2, x2 = np.unravel_index(j, m2.shape[:2])
        cands.append((float(d2[j]), real, (x1 / s1, y1 / s1), (x2 / s2, y2 / s2)))
    cands.sort(key=lambda c: c[0]); pick = []
    for c in cands:
        if c[0] > max_de: continue
        if all(np.linalg.norm(c[1] - p[1]) > 16 for p in pick): pick.append(c)
        if len(pick) == 4: break
    pick.sort(key=lambda c: c[1][0])
    return [(crop_at(photo, *p[2], pw_ph, ph_ph), crop_at(paint, *p[3], pw_pa, ph_pa), p[0]) for p in pick]

# 1. Janet in the heather: 4:5 crop keeping her, the heather and the hill (only sky trimmed)
p = L('5.jpg'); h = round(p.width * 5 / 4)
save(p.crop((0, p.height - h, p.width, p.height)).resize((W, H), Image.LANCZOS), '01_janet_heather')

def notes_slide(photo, paint, name):
    global CHIP_W, CHIP_H
    q = paint.resize((W - 2 * M, round(paint.height * (W - 2 * M) / paint.width)), Image.LANCZOS)
    CHIP_H = (H - 2 * M - GAP - q.height) // 2; n = 3
    for _ in range(3):
        CHIP_W = (W - 2 * M - (n - 1) * CHIP_GAP) // n
        cs = chips(photo, paint)
        if len(cs) == n: break
        n = len(cs)
    n = len(cs); need = (W - 2 * M - (n - 1) * CHIP_GAP) // n
    if need != CHIP_W:
        CHIP_W = need
        cs = [(a.resize((CHIP_W, CHIP_H), Image.LANCZOS), b.resize((CHIP_W, CHIP_H), Image.LANCZOS), d) for a, b, d in cs]
    page = Image.new('RGB', (W, H), BG)
    x0 = (W - (n * CHIP_W + (n - 1) * CHIP_GAP)) // 2
    for i, (a, b, d) in enumerate(cs):
        x = x0 + i * (CHIP_W + CHIP_GAP); page.paste(a, (x, M)); page.paste(b, (x, M + CHIP_H))
    page.paste(q, (M, H - M - q.height))
    save(page, name); print(name, n, 'chips', f'{CHIP_W}x{CHIP_H}', [round(c[2], 1) for c in cs])

# The heather -> pink-garden pairing was tested and dropped: no patch pair passes the match threshold.
notes_slide(L('4.jpg'), L('2.jpg'), '02_notes_fern')
pa = L('2.jpg'); s_ = H / pa.height                                    # 1125px scan: 1.2x so a 4:5 crop fills
save(detail(pa.resize((round(pa.width * s_), H), Image.LANCZOS)), '03_detail_fern_painting')

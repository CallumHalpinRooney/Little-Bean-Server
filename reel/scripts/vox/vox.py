#!/usr/bin/env python3
"""Vox-style explainer: "How a painting gets a second life" (1080x1920, 30fps).

Paper texture, cut-out cards with shadows, serif headlines with a highlighter sweep,
hand-drawn circles/arrows, colour swatches that travel, video inside cards, before/now wipe.
Usage: vox.py [preview_time ...]   (no args = full render)
"""
import json, math, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = '/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad'
A = f'{S}/vox/assets'
OUT = '/home/user/Little-Bean-Server/reel/janet_vox_explainer.mp4'
W, H, FPS = 1080, 1920, 30
TR = 0.45                                   # push transition length

PAPER = (241, 236, 226); INK = (28, 26, 24); RED = (206, 62, 42); HL = (255, 212, 0)
F = f'{S}/fonts'
SERIF = f'{F}/serif/DMSerifDisplay-Regular.ttf'; SERIF_I = f'{F}/serif/DMSerifDisplay-Italic.ttf'
SANS_B = f'{F}/extras/ttf/Inter-ExtraBold.ttf'; SANS_S = f'{F}/extras/ttf/Inter-SemiBold.ttf'
SANS_M = f'{F}/extras/ttf/Inter-Medium.ttf'
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]

INFO = json.load(open(f'{A}/info.json'))
IMG = {k: Image.open(f'{A}/{k}.png').convert('RGB') for k in
       ('floor', 'fern', 'canopy', 'heather', 'paint6', 'before', 'lavender', 'now', 'palette')}
CLIP = {k: np.load(f'{A}/{k}.npy') for k in ('clipA', 'clipB')}

# ---------------------------------------------------------------- easing
def clamp(x): return max(0.0, min(1.0, x))
def prog(t, a, d): return clamp((t - a) / d) if d > 0 else float(t >= a)
def e_out(p): return 1 - (1 - p) ** 3
def e_io(p): return 4 * p ** 3 if p < .5 else 1 - (-2 * p + 2) ** 3 / 2
def e_back(p, s=1.6): p -= 1; return 1 + (s + 1) * p ** 3 + s * p ** 2

# ---------------------------------------------------------------- paper + grain
rng = np.random.default_rng(3)
def _paper():
    base = np.ones((H, W, 3), np.float32) * np.array(PAPER, np.float32)
    low = np.asarray(Image.fromarray((rng.random((H // 16, W // 16)) * 255).astype(np.uint8))
                     .resize((W, H), Image.BICUBIC)).astype(np.float32) / 255 - .5
    fib = np.asarray(Image.fromarray((rng.random((H, W)) * 255).astype(np.uint8))
                     .filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255 - .5
    base += (low * 10 + fib * 9)[..., None]
    yy, xx = np.mgrid[0:H, 0:W]; r = np.hypot((xx - W / 2) / W, (yy - H / 2) / H)
    base *= (1 - 0.10 * np.clip(r - 0.25, 0, 1) ** 1.5)[..., None]
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert('RGBA')
PAPER_IMG = _paper()
GRAIN = [rng.normal(0, 1.8, (H, W, 1)).astype(np.float32) for _ in range(4)]

# ---------------------------------------------------------------- cards
_cc = {}
def card(key, img, w, angle=0.0, border=14):
    """Cut-out photo: white border + soft shadow, rotated. Cached by key."""
    k = (key, w, angle)
    if k not in _cc: _cc[k] = make_card(img, w, angle, border)
    return _cc[k]

def make_card(img, w, angle=0.0, border=14):
    h = round(img.height * w / img.width)
    im = img.resize((w, h), Image.LANCZOS)
    c = Image.new('RGB', (w + 2 * border, h + 2 * border), (252, 251, 247)); c.paste(im, (border, border))
    m = 50
    sh = Image.new('L', (c.width + 2 * m, c.height + 2 * m), 0)
    sh.paste(255, (m + 8, m + 16, m + 8 + c.width, m + 16 + c.height))
    sh = sh.filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.38))
    out = Image.new('RGBA', sh.size, (0, 0, 0, 0)); out.putalpha(sh)
    out.alpha_composite(c.convert('RGBA'), (m, m))
    if angle: out = out.rotate(angle, resample=Image.BICUBIC, expand=True)
    return out, (w, h)

def place(canvas, key, img, w, cx, cy, t, start, angle=0.0, rise=260, dur=0.6, pop=True):
    """Drop a card in (rise + fade + small scale pop). Returns image-space mapper."""
    out, (iw, ih) = card(key, img, w, angle)
    p = prog(t, start, dur)
    if p <= 0: return None
    e = e_back(p) if pop else e_out(p)
    y = cy + (1 - e) * rise
    a = clamp(p * 2.2)
    o = out
    if a < 1:
        o = out.copy(); al = o.getchannel('A').point(lambda v: int(v * a)); o.putalpha(al)
    canvas.alpha_composite(o, (int(cx - o.width / 2), int(y - o.height / 2)))
    th = math.radians(-angle)
    def mapper(u, v):                         # normalised image coords -> canvas px
        dx, dy = (u - .5) * iw, (v - .5) * ih
        return (cx + dx * math.cos(th) - dy * math.sin(th), y + dx * math.sin(th) + dy * math.cos(th))
    return mapper

# ---------------------------------------------------------------- text
def layout(words, f, maxw):
    lines, cur = [], []
    for wd in words:
        trial = ' '.join(cur + [wd])
        if cur and f.getlength(trial) > maxw: lines.append(cur); cur = [wd]
        else: cur.append(wd)
    if cur: lines.append(cur)
    return lines

def headline(canvas, text, t, start=0.15, x=70, y=330, size=104, maxw=940, hl=(), fpath=SERIF,
             color=INK, stagger=0.07, center=False):
    f = font(fpath, size); words = text.split(); lines = layout(words, f, maxw)
    lh = int(size * 1.08); space = f.getlength(' ')
    pos, k = [], 0
    for li, ln in enumerate(lines):
        lw = f.getlength(' '.join(ln)); xx = (W - lw) / 2 if center else x
        for wd in ln:
            pos.append((wd, xx, y + li * lh, k)); xx += f.getlength(wd) + space; k += 1
    # highlighter behind the chosen words, sweeping after the words land
    hs = start + k * stagger + 0.15
    hp = e_io(prog(t, hs, 0.5))
    if hp > 0 and hl:
        d = ImageDraw.Draw(canvas)
        rows = {}
        for wd, xx, yy, _ in pos:
            if wd.strip('.,!?—').lower() in hl:
                a = rows.setdefault(yy, [xx, xx + f.getlength(wd)])
                a[0] = min(a[0], xx); a[1] = max(a[1], xx + f.getlength(wd))
        for yy, (x0, x1) in rows.items():
            xe = x0 - 10 + (x1 - x0 + 20) * hp
            top, bot = yy + size * 0.42, yy + size * 1.02
            d.polygon([(x0 - 10, top + 4), (xe, top), (xe, bot - 2), (x0 - 10, bot)], fill=HL + (235,))
    d = ImageDraw.Draw(canvas)
    for wd, xx, yy, kk in pos:
        p = e_out(prog(t, start + kk * stagger, 0.42))
        if p <= 0: continue
        d.text((xx, yy + (1 - p) * 34), wd, font=f, fill=color + (int(255 * p),))
    return y + len(lines) * lh

def kicker(canvas, text, t, y=268, x=72, start=0.0):
    p = e_out(prog(t, start, 0.4))
    if p <= 0: return
    d = ImageDraw.Draw(canvas); f = font(SANS_B, 28)
    d.rectangle([x, y + 12, x + 46 * p, y + 18], fill=RED + (255,))
    xx = x + 62
    for ch in text:                          # letter-spaced caps
        d.text((xx, y), ch, font=f, fill=RED + (int(255 * p),)); xx += f.getlength(ch) + 3.5

def caption(canvas, text, t, y, start, x=72, size=38, maxw=930, color=INK):
    f = font(SANS_M, size); p = e_out(prog(t, start, 0.45))
    if p <= 0: return
    d = ImageDraw.Draw(canvas)
    for i, ln in enumerate(layout(text.split(), f, maxw)):
        d.text((x, y + i * size * 1.3 + (1 - p) * 18), ' '.join(ln), font=f, fill=color + (int(235 * p),))

def tag(canvas, text, x, y, t, start, size=32, bg=(252, 251, 247), fg=INK, anchor_pt=None, lines_=None):
    """Label on a paper tag, with an optional leader line that draws to a point."""
    p = e_out(prog(t, start, 0.35))
    if p <= 0: return
    f = font(SANS_S, size); rows = lines_ or [text]
    tw = max(f.getlength(r) for r in rows); th = len(rows) * size * 1.25
    d = ImageDraw.Draw(canvas)
    if anchor_pt:
        lp = e_io(prog(t, start + 0.2, 0.45))
        ax, ay = anchor_pt; sx, sy = x + tw / 2, y + th + 18 if ay > y else y - 12
        ex, ey = sx + (ax - sx) * lp, sy + (ay - sy) * lp
        d.line([(sx, sy), (ex, ey)], fill=INK + (255,), width=4)
        if lp > 0.95: d.ellipse([ax - 9, ay - 9, ax + 9, ay + 9], fill=RED + (255,), outline=(255, 255, 255, 255), width=3)
    d.rounded_rectangle([x - 18, y - 12 + (1 - p) * 14, x + tw + 18, y + th + 8 + (1 - p) * 14], 8,
                        fill=bg + (int(250 * p),), outline=INK + (int(255 * p),), width=3)
    for i, r in enumerate(rows):
        d.text((x, y + i * size * 1.25 + (1 - p) * 14), r, font=f, fill=fg + (int(255 * p),))

# ---------------------------------------------------------------- strokes
def hand_circle(canvas, cx, cy, rx, ry, p, seed=1, width=8, color=RED):
    if p <= 0: return
    r = np.random.default_rng(seed); ph = r.uniform(0, 6.28); n = 90
    turns = 1.12; pts = []
    for i in range(int(n * p) + 1):
        a = ph + 2 * math.pi * turns * i / n
        k = 1 + 0.06 * math.sin(3 * a + seed) + 0.03 * math.sin(7 * a)
        drift = 1 + 0.07 * i / n
        pts.append((cx + rx * k * drift * math.cos(a), cy + ry * k * math.sin(a)))
    if len(pts) > 1: ImageDraw.Draw(canvas).line(pts, fill=color + (255,), width=width, joint='curve')

def arrow(canvas, p0, p1, p, bend=0.25, width=7, color=INK):
    if p <= 0: return
    (x0, y0), (x1, y1) = p0, p1
    mx, my = (x0 + x1) / 2 - (y1 - y0) * bend, (y0 + y1) / 2 + (x1 - x0) * bend
    pts = []
    for i in range(int(60 * p) + 1):
        s = i / 60
        pts.append(((1 - s) ** 2 * x0 + 2 * (1 - s) * s * mx + s * s * x1, (1 - s) ** 2 * y0 + 2 * (1 - s) * s * my + s * s * y1))
    d = ImageDraw.Draw(canvas); d.line(pts, fill=color + (255,), width=width, joint='curve')
    if p > 0.92 and len(pts) > 3:
        (ax, ay), (bx, by) = pts[-4], pts[-1]; ang = math.atan2(by - ay, bx - ax)
        for s_ in (-1, 1):
            d.line([(bx, by), (bx - 30 * math.cos(ang + s_ * 0.5), by - 30 * math.sin(ang + s_ * 0.5))],
                   fill=color + (255,), width=width)

def dot(canvas, x, y, rgb, r=26, a=1.0, ring=5):
    d = ImageDraw.Draw(canvas)
    d.ellipse([x - r - ring + 3, y - r - ring + 6, x + r + ring + 3, y + r + ring + 6], fill=(0, 0, 0, int(60 * a)))
    d.ellipse([x - r - ring, y - r - ring, x + r + ring, y + r + ring], fill=(255, 255, 255, int(255 * a)))
    d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(int(c) for c in rgb) + (int(255 * a),))

def stamp(canvas, text, cx, cy, t, start, angle=-11):
    p = prog(t, start, 0.35)
    if p <= 0: return
    f = font(SANS_B, 46); tw = f.getlength(text)
    im = Image.new('RGBA', (int(tw + 90), 132), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([6, 6, im.width - 6, im.height - 6], 10, outline=RED + (255,), width=7)
    d.text((im.width / 2, im.height / 2 - 4), text, font=f, fill=RED + (255,), anchor='mm')
    s = 1.6 - 0.6 * e_out(p)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.BICUBIC).rotate(angle, expand=True, resample=Image.BICUBIC)
    im.putalpha(im.getchannel('A').point(lambda v: int(v * clamp(p * 1.8) * 0.95)))
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

def video_card(canvas, frames, t, start, cx, cy, angle=-1.2, rise=220):
    """A card whose photo is a playing clip (holds the last frame when it runs out)."""
    p = prog(t, start - 0.35, 0.5)
    if p <= 0: return
    i = min(int(max(0, t - start) * FPS), len(frames) - 1)
    out, _ = make_card(Image.fromarray(frames[i]), frames.shape[2], angle)
    if p < 0.5: out.putalpha(out.getchannel('A').point(lambda v: int(v * clamp(p * 2.2))))
    e = e_back(p)
    canvas.alpha_composite(out, (int(cx - out.width / 2), int(cy + (1 - e) * rise - out.height / 2)))

# ---------------------------------------------------------------- scenes
def sc_title(c, t):
    kicker(c, 'STUDIO NOTES', t, start=-0.2)
    headline(c, 'How a painting gets a second life', t, start=-0.12, stagger=0.05, y=330, size=118,
             hl=('second', 'life'))
    caption(c, 'Janet Cruise Halpin reworks an early canvas', t, 640, 0.9, size=36, color=(90, 84, 76))
    place(c, 'b0', IMG['before'], 400, 300, 1150, t, 0.45, angle=6)
    place(c, 'n0', IMG['now'], 400, 780, 1190, t, 0.75, angle=-5)
    arrow(c, (330, 860), (700, 880), e_io(prog(t, 1.5, 0.6)), bend=-0.35, width=8, color=RED)

def sc_outside(c, t):
    kicker(c, 'PART ONE', t)
    headline(c, 'It starts outside', t, hl=('outside',))
    m = place(c, 'floor', IMG['floor'], 860, 540, 870, t, 0.45, angle=-2)
    place(c, 'fern', IMG['fern'], 470, 300, 1300, t, 0.95, angle=4)
    place(c, 'canopy', IMG['canopy'], 560, 770, 1330, t, 1.35, angle=-3)
    if m:
        fx, fy = m(*INFO['fungi'])
        tag(c, 'fungi & moss', 650, 610, t, 2.1, anchor_pt=(fx, fy))

def sc_colours(c, t):
    kicker(c, 'PART ONE', t)
    end = headline(c, 'The colours come indoors', t, hl=('colours',))
    mp = place(c, 'p6', IMG['paint6'], 760, 580, 1240, t, 0.35, angle=2)
    mh = place(c, 'ht', IMG['heather'], 400, 280, 830, t, 0.75, angle=-5)
    if mp and mh:
        k = 0
        for fam in INFO['travel']:
            for s_, d_ in zip(fam['srcs'], fam['dsts']):
                st = 1.7 + k * 0.13; p = prog(t, st, 1.1); k += 1
                if p <= 0: continue
                (x0, y0), (x1, y1) = mh(*s_), mp(*d_)
                e = e_io(p); lift = math.sin(math.pi * e) * 160
                x, y = x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - lift
                rgb = [a + (b - a) * e for a, b in zip(fam['rgb'], fam['rgb_dst'])]
                dot(c, x, y, rgb, r=int(22 + 6 * math.sin(math.pi * e)))
    caption(c, 'Heather pinks and leaf greens, deepened on the canvas', t, 1580, 3.4, size=34,
            color=(90, 84, 76))

def sc_another(c, t):
    kicker(c, 'PART TWO', t)
    headline(c, 'Sometimes a painting needs another go', t, hl=('another', 'go'))
    place(c, 'b1', IMG['before'], 600, 540, 1140, t, 0.6, angle=-2)
    stamp(c, 'EARLY WORK', 790, 820, t, 1.7)

def sc_step(c, t, n, title, hlw, clip=None, note=None):
    kicker(c, f'STEP {n}', t)
    end = headline(c, title, t, hl=hlw)
    if note: caption(c, note, t, end + 14, 0.9, size=36, color=(90, 84, 76))
    if clip is not None: video_card(c, CLIP[clip], t, 0.55, 540, 1080)

def sc_palette(c, t):
    kicker(c, 'STEP 2', t)
    headline(c, 'Mix new colour', t, hl=('new', 'colour'))
    m = place(c, 'pal', IMG['palette'], 560, 330, 1010, t, 0.4, angle=-2)
    if not m: return
    for k, sw in enumerate(INFO['palette'][:5]):
        p0 = prog(t, 1.2 + k * 0.14, 0.3); p1 = e_io(prog(t, 2.0 + k * 0.14, 0.7))
        if p0 <= 0: continue
        sx, sy = m(*sw['pos'][:2]); tx, ty = 760, 640 + k * 118
        x, y = sx + (tx - sx) * p1, sy + (ty - sy) * p1
        dot(c, x, y, sw['rgb'], r=int(26 * e_back(p0)) if p0 < 1 else 26)
        if p1 > 0.9:
            a = prog(t, 2.6 + k * 0.14, 0.3)
            ImageDraw.Draw(c).text((805, ty - 20), sw['name'], font=font(SANS_S, 34), fill=INK + (int(255 * a),))

def sc_peep(c, t):
    kicker(c, 'STEP 3', t)
    headline(c, 'Let the old peep through', t, hl=('peep', 'through'))
    m = place(c, 'lav', IMG['lavender'], 660, 560, 1090, t, 0.4, angle=1.5)
    if not m: return
    pts = []
    for i, b in enumerate(INFO['peep']):
        cx, cy = m(*b['c']); r = max(60, b['r'] * 660)
        hand_circle(c, cx, cy, r, r * 0.85, e_io(prog(t, 1.4 + i * 0.45, 0.6)), seed=i + 2)
        pts.append((cx, cy - r * 0.85))
    if pts:
        tag(c, '', 560, 600, t, 2.6, lines_=['the first painting,', 'still showing'], size=30)
        arrow(c, (600, 690), (pts[0][0] + 30, pts[0][1] - 6), e_io(prog(t, 2.9, 0.5)), bend=0.3, width=6)

def sc_compare(c, t):
    kicker(c, 'SO FAR', t)
    headline(c, 'Before and now', t, hl=('now',))
    w = 740; cx, cy = 540, 1050
    out_b, (iw, ih) = card('cmpb', IMG['before'], w, 0)
    out_n, _ = card('cmpn', IMG['now'], w, 0)
    p = prog(t, 0.35, 0.5)
    if p <= 0: return
    e = e_back(p); y = cy + (1 - e) * 220
    ox, oy = int(cx - out_b.width / 2), int(y - out_b.height / 2)
    c.alpha_composite(out_b, (ox, oy))
    # divider: sweeps right->left revealing 'now', then settles at the middle
    s1 = e_io(prog(t, 1.3, 1.4)); s2 = e_io(prog(t, 3.0, 0.8))
    frac = 1 - s1 + 0.5 * s2                    # 1 -> 0 -> 0.5
    bx = 50 + 14; by = 50 + 14
    xcut = int(bx + iw * frac)
    nw = out_n.crop((xcut, 0, out_n.width, out_n.height))
    c.alpha_composite(nw, (ox + xcut, oy))
    d = ImageDraw.Draw(c); lx = ox + xcut
    if 0.001 < frac < 0.999 or s2 > 0:
        d.line([(lx, oy + by), (lx, oy + by + ih)], fill=(255, 255, 255, 255), width=6)
        d.ellipse([lx - 28, y - 28, lx + 28, y + 28], fill=(255, 255, 255, 255), outline=INK + (255,), width=3)
        d.polygon([(lx - 16, y), (lx - 6, y - 9), (lx - 6, y + 9)], fill=INK + (255,))
        d.polygon([(lx + 16, y), (lx + 6, y - 9), (lx + 6, y + 9)], fill=INK + (255,))
    tag(c, 'BEFORE', ox + 80, oy + by + 40, t, 1.0, size=28)
    tag(c, 'NOW', ox + iw - 60, oy + by + 40, t, 2.7, size=28, bg=HL)

def sc_end(c, t):
    f = font(SERIF_I, 112)
    for i, (txt, st) in enumerate([('Now it dries.', 0.3), ('Next layer', 1.1), ('to come.', 1.35)]):
        p = e_out(prog(t, st, 0.6))
        if p <= 0: continue
        tw = f.getlength(txt)
        ImageDraw.Draw(c).text(((W - tw) / 2, 640 + i * 132 + (1 - p) * 30), txt, font=f, fill=INK + (int(255 * p),))
    p = e_out(prog(t, 2.2, 0.5))
    if p > 0:
        d = ImageDraw.Draw(c); f2 = font(SANS_B, 30); txt = 'JANET CRUISE HALPIN'
        tw = sum(f2.getlength(ch) + 4 for ch in txt); x = (W - tw) / 2
        d.rectangle([W / 2 - 40 * p, 1130, W / 2 + 40 * p, 1136], fill=RED + (255,))
        for ch in txt:
            d.text((x, 1170), ch, font=f2, fill=INK + (int(255 * p),)); x += f2.getlength(ch) + 4

SCENES = [
    (sc_title, 3.8), (sc_outside, 5.6), (sc_colours, 6.4), (sc_another, 4.6),
    (lambda c, t: sc_step(c, t, 1, 'Brush it back', ('back',), 'clipA', 'White spirit loosens the old surface'), 4.8),
    (sc_palette, 5.4), (sc_peep, 5.4),
    (lambda c, t: sc_step(c, t, 4, 'Make confident marks', ('confident',), 'clipB'), 5.2),
    (sc_compare, 5.8), (sc_end, 4.4),
]
STARTS = []; _t = 0.0
for i, (_, d) in enumerate(SCENES):
    STARTS.append(_t); _t += d - (TR if i < len(SCENES) - 1 else 0)
TOTAL = _t

def scene_img(i, t):
    c = PAPER_IMG.copy(); SCENES[i][0](c, t); return c

def frame(T):
    i = max(k for k in range(len(SCENES)) if STARTS[k] <= T)
    t = T - STARTS[i]
    cur = scene_img(i, t)
    if i > 0 and t < TR:                      # push: previous scene leaves left, this one enters right
        e = e_io(t / TR)
        prev = scene_img(i - 1, T - STARTS[i - 1])
        out = PAPER_IMG.copy()
        out.alpha_composite(prev, (int(-W * e), 0)); out.alpha_composite(cur, (int(W * (1 - e)), 0))
        cur = out
    return cur

def finish(img, n):
    a = np.asarray(img.convert('RGB')).astype(np.float32) + GRAIN[(n // 2) % len(GRAIN)]   # refresh every 2 frames
    return np.clip(a, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        for s_ in sys.argv[1:]:
            T = float(s_); Image.fromarray(finish(frame(T), 0)).save(f'{S}/vox/prev_{T:05.2f}.png')
        print('scenes', [round(s, 2) for s in STARTS], 'total', round(TOTAL, 2)); sys.exit()
    n = int(round(TOTAL * FPS))
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                            '-r', str(FPS), '-i', '-', '-f', 'lavfi', '-t', f'{n / FPS:.3f}', '-i',
                            'anullsrc=channel_layout=stereo:sample_rate=48000',
                            '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high',
                            '-level', '4.2', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '128k',
                            '-shortest', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    for k in range(n):
        enc.stdin.write(finish(frame(k / FPS), k).tobytes())
        if k % 150 == 0: print('frame', k, '/', n, flush=True)
    enc.stdin.close(); enc.wait(); print('wrote', OUT, round(n / FPS, 2), 's')

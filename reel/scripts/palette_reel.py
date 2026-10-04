#!/usr/bin/env python3
"""Colour Story reel: the locked process video with a live palette strip underneath.
Six tracked colour clusters (Lab k-means, warm-started frame to frame), widths = share of canvas."""
import subprocess, numpy as np, cv2

SRC = '/home/user/Little-Bean-Server/reel/janet_rework_process_locked.mp4'
OUT = '/home/user/Little-Bean-Server/reel/janet_colour_story_reel.mp4'
W, H, FPS = 1080, 1920, 30
BY, BH = 528, 864                         # picture band in the process video
SX, SY, SW, SH, GAP = 40, 1428, 1000, 84, 6   # swatch strip: just under the picture, above the bottom-20% UI zone
K = 6

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                     capture_output=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
n = len(frames)
small = np.stack([cv2.resize(f[BY:BY + BH], (135, 108), interpolation=cv2.INTER_AREA) for f in frames])

# remove the moving hand: short temporal median, then drop skin / white-glove pixels
med = np.empty_like(small)
for i in range(n):
    med[i] = np.median(small[max(0, i - 12):i + 13], axis=0)
hsv = np.stack([cv2.cvtColor(m, cv2.COLOR_RGB2HSV) for m in med]).astype(np.float32)
h, s, v = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
skin = (h < 28) & (s > 0.18) & (s < 0.55) & (v > 0.35)
glove = (s < 0.10) & (v > 0.82)
dark = v < 0.06                          # fade-out frames
lab = np.stack([cv2.cvtColor(m, cv2.COLOR_RGB2LAB) for m in med]).astype(np.float32)

cent = None
shares_s = cols_s = None
rng = np.random.default_rng(1)
sw_cols, sw_shares = [], []
for i in range(n):
    keep = ~(skin[i] | glove[i])
    px = lab[i][keep]
    if len(px) < 200:
        px = lab[i].reshape(-1, 3)
    if cent is None:
        _, _, cent = cv2.kmeans(px, K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 50, 0.5),
                                5, cv2.KMEANS_PP_CENTERS)
        cent = cent[np.argsort(cent[:, 0])]          # slots ordered dark -> light, then fixed
    for _ in range(3):                                # warm-started Lloyd steps keep slots coherent
        d = ((px[:, None, :] - cent[None]) ** 2).sum(-1); a = d.argmin(1)
        for k in range(K):
            sel = px[a == k]
            if len(sel) > 20:
                cent[k] = sel.mean(0)
            else:                                     # revive a dead slot at the worst-fit pixel
                cent[k] = px[d.min(1).argmax()]
    shares = np.bincount(a, minlength=K) / len(a)
    # swatch = the purest 30% of each cluster (real paint colour, not the averaged mud)
    rep = cent.copy()
    for k in range(K):
        sel = px[a == k]
        if len(sel) > 20:
            chroma = np.hypot(sel[:, 1] - 128, sel[:, 2] - 128)
            rep[k] = sel[chroma >= np.percentile(chroma, 70)].mean(0)
    rgb = cv2.cvtColor(rep.reshape(1, K, 3).astype(np.uint8), cv2.COLOR_LAB2RGB).reshape(K, 3).astype(np.float32)
    if dark[i].mean() > 0.5:                          # follow the fade to black
        rgb *= med[i].mean() / max(med[0].mean(), 1)
    if shares_s is None:
        shares_s, cols_s = shares.copy(), rgb.copy()
    a_ = 0.12
    shares_s = (1 - a_) * shares_s + a_ * shares
    cols_s = (1 - a_) * cols_s + a_ * rgb
    sw_cols.append(cols_s.copy()); sw_shares.append(shares_s.copy())

enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                        '-r', str(FPS), '-i', '-', '-i', SRC, '-map', '0:v', '-map', '1:a',
                        '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-crf', '18',
                        '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709',
                        '-colorspace', 'bt709', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', OUT],
                       stdin=subprocess.PIPE)
for i in range(n):
    f = frames[i].copy()
    sh = np.maximum(sw_shares[i], 0.03); sh = sh / sh.sum()
    avail = SW - GAP * (K - 1)
    x = float(SX)
    for k in range(K):
        w = sh[k] * avail
        x0, x1 = int(round(x)), int(round(x + w))
        f[SY:SY + SH, x0:x1] = np.clip(sw_cols[i][k], 0, 255).astype(np.uint8)
        x += w + GAP
    enc.stdin.write(f.tobytes())
enc.stdin.close(); enc.wait()
print('frames', n)

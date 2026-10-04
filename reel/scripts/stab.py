#!/usr/bin/env python3
"""Locked-off process cut: stabilise every clip and align all clips to one
canvas position, so only the paint changes.

Per frame:  frame --H_frame--> clip anchor (first frame) --H_clip--> reference (3657)
            --B--> output box (4:5 window around the canvas, 1080x1350).
Pixels a frame doesn't cover are filled from a static background plate.
"""
import cv2, glob, numpy as np, subprocess, sys
from multiprocessing import Pool

U = '/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b'
P = '/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad/proc'
LAND = ('3628', '3629', '3631', '3632')
OW, OH = 1080, 1350
# output box in reference coords: canvas is ~x 0..980, y 280..1540
BX, BY, BW, BH = -40, 245, 1060, 1325
B = np.array([[OW / BW, 0, -BX * OW / BW], [0, OH / BH, -BY * OH / BH], [0, 0, 1]])

Hclip = np.load(f'{P}/H_chain.npy', allow_pickle=True).item()


def src(c):
    return glob.glob(f'{U}/*IMG_{c}.MOV')[0]


def dims(c):
    return (1920, 1080) if c in LAND else (1080, 1920)


def read_frames(c):
    w, h = dims(c)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src(c), '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


sift = cv2.SIFT_create(3000)


def feats(im):
    g = cv2.cvtColor(cv2.resize(im, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    return sift.detectAndCompute(g, None)


def frame_H(fa, ka, da):
    kb, db = feats(fa)
    if db is None or len(kb) < 20:
        return None
    m = cv2.BFMatcher().knnMatch(db, da, k=2)
    good = [x for x, y in (p for p in m if len(p) == 2) if x.distance < 0.75 * y.distance]
    if len(good) < 25:
        return None
    pb = np.float32([kb[g.queryIdx].pt for g in good]) * 2
    pa = np.float32([ka[g.trainIdx].pt for g in good]) * 2
    H, inl = cv2.findHomography(pb, pa, cv2.RANSAC, 4.0)
    if H is None or inl.sum() < 20:
        return None
    return H


def smooth_Hs(Hs, w, h, sigma=1.5):
    """Smooth by tracking the 4 frame corners through each H (robust to noise)."""
    n = len(Hs)
    corners = np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2)
    C = np.full((n, 4, 2), np.nan)
    for i, H in enumerate(Hs):
        if H is not None:
            C[i] = cv2.perspectiveTransform(corners, H).reshape(4, 2)
    idx = np.arange(n)
    for j in range(4):
        for k in range(2):
            v = C[:, j, k]; ok = ~np.isnan(v)
            C[:, j, k] = np.interp(idx, idx[ok], v[ok])
    r = int(3 * sigma)
    kern = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); kern /= kern.sum()
    Cs = np.empty_like(C)
    for j in range(4):
        for k in range(2):
            Cs[:, j, k] = np.convolve(np.pad(C[:, j, k], r, mode='edge'), kern, mode='valid')
    return [cv2.getPerspectiveTransform(corners.reshape(4, 2), Cs[i].astype(np.float32)) for i in range(n)]


def plate():
    """Static background: anchor frames of all clips composited (portrait first)."""
    pl = np.zeros((OH, OW, 3), np.uint8); filled = np.zeros((OH, OW), bool)
    order = ['3657', '3658', '3660', '3661', '3659', '3650', '3655', '3654', '3644',
             '3640', '3641', '3632', '3631', '3629', '3628']
    for c in order:
        w, h = dims(c)
        f = read_frames(c)[0]
        M = B @ Hclip[c]
        wf = cv2.warpPerspective(f, M, (OW, OH), flags=cv2.INTER_CUBIC)
        msk = cv2.warpPerspective(np.full((h, w), 255, np.uint8), M, (OW, OH), flags=cv2.INTER_NEAREST) > 0
        new = msk & ~filled
        pl[new] = wf[new]; filled |= msk
    cv2.imwrite(f'{P}/plate.png', pl)
    print('plate unfilled px', int((~filled).sum()))


def process(c):
    pl = cv2.imread(f'{P}/plate.png')
    frames = read_frames(c)
    h, w = frames.shape[1:3]
    ka, da = feats(frames[0])
    Hs = [np.eye(3)] + [frame_H(f, ka, da) for f in frames[1:]]
    fails = sum(H is None for H in Hs)
    Hs = smooth_Hs(Hs, w, h)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
                            '-s', f'{OW}x{OH}', '-r', '30', '-i', '-',
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '8', '-pix_fmt', 'yuv420p',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
                            f'{P}/stab_{c}.mp4'], stdin=subprocess.PIPE)
    ones = np.full((h, w), 255, np.uint8)
    for f, H in zip(frames, Hs):
        M = B @ Hclip[c] @ H
        out = cv2.warpPerspective(f, M, (OW, OH), flags=cv2.INTER_CUBIC)
        msk = cv2.warpPerspective(ones, M, (OW, OH), flags=cv2.INTER_NEAREST)
        msk = cv2.erode(msk, np.ones((5, 5), np.uint8)) > 0
        out[~msk] = pl[~msk]
        pl[msk] = out[msk]          # keep plate current for this clip
        enc.stdin.write(out.tobytes())
    enc.stdin.close(); enc.wait()
    return c, len(frames), fails


if __name__ == '__main__':
    clips = sys.argv[1:] or ['3628', '3629', '3631', '3632', '3640', '3641', '3644', '3650',
                             '3654', '3655', '3657', '3658', '3659', '3660', '3661']
    plate()
    with Pool(3) as p:
        for c, n, fails in p.imap_unordered(process, clips):
            print(c, 'frames', n, 'estimation fails', fails, flush=True)

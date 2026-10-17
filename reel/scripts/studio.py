"""Studio pan: square letterbox (1080x1080 in 1080x1920), warm-cream natural-light grade, no audio."""
import subprocess, sys, numpy as np, cv2
SRC, OUT = sys.argv[1], sys.argv[2]
W, H, S = 1080, 1920, 1080
Y0 = (H - S) // 2
rng = np.random.default_rng(2)
def lum(a): return (a @ np.array([.2126, .7152, .0722], np.float32))[..., None]
def grade(f):
    a = f.astype(np.float32) / 255
    a *= np.array([0.985, 1.01, 0.98], np.float32)                 # pink walls -> warm cream
    a = np.interp(a, [0, .05, .25, .5, .75, .9, 1], [.022, .05, .23, .5, .76, .875, .94]).astype(np.float32)  # soft S, window roll-off
    L = lum(a); c = np.abs(a - L).max(-1, keepdims=True)
    a = L + (a - L) * (1 + .35 * (1 - np.clip(c * 2.5, 0, 1)))      # vibrance: paintings richer, walls untouched
    Lb = cv2.GaussianBlur(lum(a)[..., 0], (0, 0), 20)
    a = a + .25 * (lum(a)[..., 0] - Lb)[..., None]                  # light clarity
    L = lum(a); a = a + L * np.array([.007, .003, -.006], np.float32) + (1 - L) * np.array([-.004, 0, .008], np.float32)
    a = a + rng.normal(0, .007, a.shape[:2]).astype(np.float32)[..., None]
    return (np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', SRC, '-vf',
    f'crop=ih:ih:(iw-ih)/2:0,scale={S}:{S}:flags=lanczos:in_range=pc:out_range=pc,fps=30,format=rgb24',
    '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30',
    '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-color_range', 'tv', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
canvas = np.zeros((H, W, 3), np.uint8); n = 0
while True:
    b = dec.stdout.read(S * S * 3)
    if len(b) < S * S * 3: break
    canvas[Y0:Y0 + S] = grade(np.frombuffer(b, np.uint8).reshape(S, S, 3))
    enc.stdin.write(canvas.tobytes()); n += 1
enc.stdin.close(); enc.wait(); print('frames', n)

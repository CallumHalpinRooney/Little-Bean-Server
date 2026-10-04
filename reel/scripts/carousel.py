#!/usr/bin/env python3
"""Instagram carousel (1080x1350): before -> during -> now, gallery mat, plus a 4:5 video slide."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from build import grade
P = os.path.dirname(os.path.abspath(__file__))
R = '/home/user/Little-Bean-Server/reel'
OUT = f'{R}/carousel'
os.makedirs(OUT, exist_ok=True)
BG = '0xF5F3EF'
W, H, IW, IH = 1080, 1350, 1000, 1250
MX, MY = (W - IW) // 2, (H - IH) // 2
CX, CY, CW, CH = 100, 130, 916, 1145          # canvas crop in the aligned box (same as the triptych)
RGB = 'scale=in_color_matrix=bt709:in_range=tv,format=rgb24'


def run(*a):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)


def mat(src_filter, inputs, out):
    run(*inputs, '-filter_complex',
        f'color=c={BG}:s={W}x{H}[bg];{src_filter}[p];[bg][p]overlay={MX}:{MY},format=rgb24[v]',
        '-map', '[v]', '-frames:v', '1', out)


# 1 cover: the across triptych
run('-i', f'{R}/janet_rework_triptych_post_across.png', f'{OUT}/01_cover_triptych.png')
# 2 before, 3 lavender (aligned video frames)
for name, c, t, g in [('02_before', '3631', 3.4, 'A'), ('03_lavender', '3655', 2.9, 'B')]:
    mat(f'[0:v]trim=end_frame=1,crop={CW}:{CH}:{CX}:{CY},hflip,vflip,{grade(g)},'
        f'scale={IW}:{IH}:flags=lanczos,{RGB}', ['-ss', str(t), '-i', f'{P}/stab_{c}.mp4'], f'{OUT}/{name}.png')
# 4 now: Janet's own photo, aligned to the same framing at 2.5x resolution
K = 2.5
mat(f'[0:v]crop={int(CW*K)}:{int(CH*K)}:{int(CX*K)}:{int(CY*K)},hflip,vflip,scale={IW}:{IH}:flags=lanczos,format=rgb24',
    ['-i', f'{P}/photo_box_hi.png'], f'{OUT}/04_now.png')
# 5 detail: wet paint macro (blue orb + texture)
mat(f'[0:v]crop={IW}:{IH},format=rgb24', ['-i', f'{R}/janet_rework_reel_cover_4x5.png'], f'{OUT}/05_detail.png')
# 6 video: the blue going on, locked-off, real speed, on the mat
CLIPS = [('3657', 0.0, 2.5), ('3658', 0.0, 2.6), ('3661', 0.0, 4.85)]
XF, FADE = 0.25, 1.0
ins, g, durs = [], [], []
for k, (c, a, b) in enumerate(CLIPS):
    ins += ['-i', f'{P}/stab_{c}.mp4']
    g.append(f'[{k}:v]trim={a}:{b},setpts=PTS-STARTPTS,fps=30,crop={CW}:{CH}:{CX}:{CY},hflip,vflip,'
             f'{grade("B")},scale={IW}:{IH}:flags=lanczos,settb=1/30000[s{k}]')
    durs.append(b - a)
acc, t = 's0', durs[0]
for k in range(1, len(CLIPS)):
    g.append(f'[{acc}][s{k}]xfade=transition=fade:duration={XF}:offset={t - XF:.4f}[x{k}]')
    acc, t = f'x{k}', t + durs[k] - XF
g.append(f'color=c={BG}:s={W}x{H}:r=30:d={t:.3f}[bg]')
g.append(f'[{acc}]fade=t=out:st={t - FADE:.3f}:d={FADE}:color={BG}[pv]')
g.append(f'[bg][pv]overlay={MX}:{MY}:shortest=1,format=yuv420p[v]')
run(*ins, '-f', 'lavfi', '-t', f'{t:.3f}', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-filter_complex', ';'.join(g), '-map', '[v]', '-map', f'{len(CLIPS)}:a',
    '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', f'{OUT}/06_video_blue.mp4')
# JPEG copies for upload (sRGB, max quality)
for f in sorted(os.listdir(OUT)):
    if f.endswith('.png'):
        run('-i', f'{OUT}/{f}', '-q:v', '1', '-pix_fmt', 'yuvj444p', f'{OUT}/{f[:-4]}.jpg')
print('video slide', round(t, 2), 's')

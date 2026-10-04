#!/usr/bin/env python3
"""Living triptych: the full canvas in three horizontal bands, each playing the real-speed
process at a different moment (top = earliest, each band 7s further on), so three stages
of the painting are always visible on one canvas, all moving."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from build import grade
P = os.path.dirname(os.path.abspath(__file__))
OUT = '/home/user/Little-Bean-Server/reel/janet_living_triptych.mp4'
FPS, XF = 30, 0.25
CX, CY, CW, CH = 100, 130, 916, 1145            # full-canvas crop (same as the triptych posts)
IW, IH = 1040, 1300                             # canvas size on screen
GAP = 14
DELTA = 7.0                                     # seconds between bands
FADE = 1.0
CUT = [('3628', 0.00, 4.00, 'A'), ('3629', 0.00, 1.75, 'A'), ('3632', 0.00, 3.00, 'A'),
       ('3640', 0.00, 3.15, 'A'), ('3644', 0.00, 2.25, 'A'), ('3650', 3.50, 5.00, 'B'),
       ('3654', 0.00, 2.35, 'B'), ('3657', 0.00, 2.50, 'B'), ('3658', 0.00, 2.60, 'B'),
       ('3661', 0.00, 4.85, 'B')]

# 1) full-canvas process timeline (real speed, same cut as the process video)
cmd = ['ffmpeg', '-v', 'error', '-y']
g, durs = [], []
for k, (c, a, b, grp) in enumerate(CUT):
    cmd += ['-i', f'{P}/stab_{c}.mp4']
    g.append(f'[{k}:v]trim={a}:{b},setpts=PTS-STARTPTS,fps={FPS},crop={CW}:{CH}:{CX}:{CY},hflip,vflip,'
             f'{grade(grp)},scale={IW}:{IH}:flags=lanczos,settb=1/{FPS * 1000}[s{k}]')
    durs.append(b - a)
acc, t = 's0', durs[0]
for k in range(1, len(CUT)):
    g.append(f'[{acc}][s{k}]xfade=transition=fade:duration={XF}:offset={t - XF:.4f}[x{k}]')
    acc, t = f'x{k}', t + durs[k] - XF
g[-1] = g[-1].replace(f'[x{len(CUT) - 1}]', '[vout]')
subprocess.run(cmd + ['-filter_complex', ';'.join(g), '-map', '[vout]', '-c:v', 'libx264', '-preset', 'medium',
                      '-crf', '10', '-pix_fmt', 'yuv420p', f'{P}/process_full.mp4'], check=True)
TOTAL = t
DUR = TOTAL - 2 * DELTA

# 2) three bands, each a slice of the canvas at a different moment
BH = IH // 3
X0 = (1080 - IW) // 2
Y0 = (1920 - (3 * BH + 2 * GAP)) // 2
g = [f'color=c=black:s=1080x1920:r={FPS}:d={DUR:.3f}[bg]']
cmd = ['ffmpeg', '-v', 'error', '-y']
for i in range(3):
    cmd += ['-ss', f'{i * DELTA}', '-t', f'{DUR:.3f}', '-i', f'{P}/process_full.mp4']
    g.append(f'[{i}:v]setpts=PTS-STARTPTS,crop={IW}:{BH}:0:{i * BH}[b{i}]')
last = 'bg'
for i in range(3):
    g.append(f'[{last}][b{i}]overlay={X0}:{Y0 + i * (BH + GAP)}:shortest=1[o{i}]')
    last = f'o{i}'
g.append(f'[{last}]fade=t=out:st={DUR - FADE:.3f}:d={FADE},setsar=1,format=yuv420p[v]')
cmd += ['-f', 'lavfi', '-t', f'{DUR:.3f}', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-filter_complex', ';'.join(g), '-map', '[v]', '-map', '3:a',
        '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-crf', '18',
        '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', str(FPS * 2),
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
        '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
print('wrote', OUT, round(DUR, 2), 's  (source', round(TOTAL, 2), 's)')

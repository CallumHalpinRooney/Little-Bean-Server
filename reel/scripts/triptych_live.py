#!/usr/bin/env python3
"""Live triptych reel: three stages playing simultaneously, stacked, real speed."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from build import grade
P = os.path.dirname(os.path.abspath(__file__))
R = '/home/user/Little-Bean-Server/reel'
FPS, XF, DUR, FADE_OUT = 30, 0.25, 9.0, 1.0
# rows (each sums to DUR after the in-row dissolves): (clip, in, out, grade group)
ROWS = [
    [('3628', 0.00, 4.25, 'A'), ('3629', 0.00, 1.75, 'A'), ('3632', 0.00, 3.50, 'A')],               # green
    [('3644', 0.00, 2.25, 'A'), ('3650', 3.20, 5.30, 'B'), ('3654', 0.00, 2.35, 'B'), ('3655', 0.00, 3.05, 'B')],  # purple/lavender
    [('3657', 0.00, 2.50, 'B'), ('3658', 0.00, 2.60, 'B'), ('3661', 0.00, 4.40, 'B')],               # blue
]
# process-video framing (5:4 band, left trimmed, rotated 180)
TRIM_L, BAND_H, BAND_Y = 70, 864, 243
CW = 1080 - TRIM_L
CH = round(BAND_H * CW / 1080 / 2) * 2
CY = BAND_Y + (BAND_H - CH) // 2
PW, PH, GAP = 720, 576, 24
X = (1080 - PW) // 2
Y0 = (1920 - (3 * PH + 2 * GAP)) // 2

cmd = ['ffmpeg', '-v', 'error', '-y']
g, k = [f'color=c=black:s=1080x1920:r={FPS}:d={DUR}[bg]'], 0
for r, row in enumerate(ROWS):
    labels, durs = [], []
    for c, tin, tout, grp in row:
        cmd += ['-i', f'{P}/stab_{c}.mp4']
        d = tout - tin
        g.append(f'[{k}:v]trim={tin}:{tout},setpts=PTS-STARTPTS,fps={FPS},trim=duration={d:.4f},'
                 f'crop={CW}:{CH}:0:{CY},hflip,vflip,{grade(grp)},scale={PW}:{PH}:flags=lanczos,'
                 f'settb=1/{FPS * 1000}[s{k}]')
        labels.append(f's{k}'); durs.append(d); k += 1
    acc, t = labels[0], durs[0]
    for j in range(1, len(labels)):
        g.append(f'[{acc}][{labels[j]}]xfade=transition=fade:duration={XF}:offset={t - XF:.4f}[r{r}x{j}]')
        acc, t = f'r{r}x{j}', t + durs[j] - XF
    assert abs(t - DUR) < 0.02, (r, t)
    g.append(f'[{acc}]trim=duration={DUR},setpts=PTS-STARTPTS[row{r}]')
last = 'bg'
for r in range(3):
    g.append(f'[{last}][row{r}]overlay={X}:{Y0 + r * (PH + GAP)}:eof_action=endall[o{r}]')
    last = f'o{r}'
g.append(f'[{last}]fade=t=out:st={DUR - FADE_OUT}:d={FADE_OUT},setsar=1,format=yuv420p[v]')
cmd += ['-f', 'lavfi', '-t', str(DUR), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-filter_complex', ';'.join(g), '-map', '[v]', '-map', f'{k}:a',
        '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-crf', '18',
        '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', str(FPS * 2),
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
        '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
        f'{R}/janet_rework_triptych_reel.mp4']
subprocess.run(cmd, check=True)
print('done')

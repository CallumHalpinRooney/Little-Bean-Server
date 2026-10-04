#!/usr/bin/env python3
"""Locked-off process video from the stabilised clips (stab_*.mp4)."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from build import grade

P = os.path.dirname(os.path.abspath(__file__))
OUT = '/home/user/Little-Bean-Server/reel/janet_rework_process_locked.mp4'
FPS, XF = 30, 0.25
PY = (1920 - 1350) // 2

# (clip, in, out, speed, grade group) - chronological
CUT = [
    ('3628', 0.00, 5.00, 1.0, 'A'),   # orange rubbed into the old painting
    ('3629', 0.00, 1.75, 1.0, 'A'),   # white spirit pour
    ('3631', 0.00, 3.55, 1.0, 'A'),   # brushing it through
    ('3632', 0.00, 6.85, 1.0, 'A'),   # peach dabs
    ('3640', 0.00, 3.15, 1.0, 'A'),   # wash
    ('3641', 0.00, 3.55, 1.0, 'A'),
    ('3644', 0.00, 2.25, 1.0, 'A'),   # purple goes on
    ('3650', 0.00, 6.30, 1.0, 'B'),   # lavender over purple
    ('3654', 0.00, 2.35, 1.0, 'B'),   # texture dabbing
    ('3655', 0.00, 3.05, 1.0, 'B'),
    ('3657', 0.00, 7.30, 1.0, 'B'),   # blue
    ('3658', 0.00, 6.75, 1.0, 'B'),
    ('3659', 0.00, 3.70, 1.0, 'B'),
    ('3660', 0.00, 4.95, 1.0, 'B'),
    ('3661', 0.00, 4.85, 1.0, 'B'),   # last confident strokes
]

cmd = ['ffmpeg', '-v', 'error', '-y']
for c, *_ in CUT:
    cmd += ['-i', f'{P}/stab_{c}.mp4']
g, durs = [], []
for k, (c, tin, tout, sp, grp) in enumerate(CUT):
    d = (tout - tin) / sp
    durs.append(d)
    g.append(f'[{k}:v]trim={tin}:{tout},setpts=(PTS-STARTPTS)/{sp},fps={FPS},'
             f'trim=duration={d:.4f},{grade(grp)},settb=1/{FPS * 1000}[v{k}]')
acc, t = 'v0', durs[0]
for k in range(1, len(CUT)):
    off = t - XF
    g.append(f'[{acc}][v{k}]xfade=transition=fade:duration={XF}:offset={off:.4f}[x{k}]')
    acc, t = f'x{k}', t + durs[k] - XF
g.append(f'[{acc}]pad=1080:1920:0:{PY}:black,setsar=1[vout]')
cmd += ['-f', 'lavfi', '-t', f'{t:.3f}', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-filter_complex', ';'.join(g), '-map', '[vout]', '-map', f'{len(CUT)}:a',
        '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-crf', '18',
        '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', str(FPS * 2),
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
        '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
print('wrote', OUT, round(t, 2), 's')

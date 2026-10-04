#!/usr/bin/env python3
"""Locked-off process video from the stabilised clips (stab_*.mp4)."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from build import grade

P = os.path.dirname(os.path.abspath(__file__))
OUT = '/home/user/Little-Bean-Server/reel/janet_rework_process_locked.mp4'
FPS, XF = 30, 0.25
BAND_H, BAND_Y = 864, 243        # 5:4 landscape band, fixed (locked-off) framing
PY = (1920 - BAND_H) // 2
HOOK = ('3655', 1.00, 2.50, 1.0, 'B')   # glimpse of the lavender texture, hard cut to the start
FADE_OUT = 1.5

# (clip, in, out, speed, grade group) - chronological
CUT = [
    ('3628', 0.00, 4.00, 1.0, 'A'),   # orange swept into the old painting
    ('3629', 0.00, 1.75, 1.0, 'A'),   # white spirit pour
    ('3632', 0.00, 3.00, 1.0, 'A'),   # peach dabs
    ('3640', 0.00, 3.15, 1.0, 'A'),   # brushing it all back
    ('3644', 0.00, 2.25, 1.0, 'A'),   # purple goes on
    ('3650', 3.50, 5.00, 1.0, 'B'),   # lavender stroke
    ('3654', 0.00, 2.35, 1.0, 'B'),   # texture dabbing
    ('3657', 0.00, 2.50, 1.0, 'B'),   # first blue strokes
    ('3658', 0.00, 2.60, 1.0, 'B'),   # big blue sweep
    ('3661', 0.00, 4.85, 1.0, 'B'),   # last confident strokes
]
# Dropped: 3631/3641 (repeat the brushing), 3655 (repeats 3654), 3659/3660
# (hand leaving / arm blocking the canvas), rest of 3650 (no hand in shot).

cmd = ['ffmpeg', '-v', 'error', '-y']
for c, *_ in CUT + [HOOK]:
    cmd += ['-i', f'{P}/stab_{c}.mp4']
g, durs = [], []
for k, (c, tin, tout, sp, grp) in enumerate(CUT):
    d = (tout - tin) / sp
    durs.append(d)
    g.append(f'[{k}:v]trim={tin}:{tout},setpts=(PTS-STARTPTS)/{sp},fps={FPS},'
             f'trim=duration={d:.4f},crop=1080:{BAND_H}:0:{BAND_Y},{grade(grp)},settb=1/{FPS * 1000}[v{k}]')
acc, t = 'v0', durs[0]
for k in range(1, len(CUT)):
    off = t - XF
    g.append(f'[{acc}][v{k}]xfade=transition=fade:duration={XF}:offset={off:.4f}[x{k}]')
    acc, t = f'x{k}', t + durs[k] - XF
# hook first (hard cut), then the dissolve chain; ease out to black
c, tin, tout, sp, grp = HOOK
hd = (tout - tin) / sp
kh = len(CUT)
g.append(f'[{kh}:v]trim={tin}:{tout},setpts=PTS-STARTPTS,fps={FPS},trim=duration={hd:.4f},'
         f'crop=1080:{BAND_H}:0:{BAND_Y},{grade(grp)},settb=1/{FPS * 1000}[hook]')
g.append(f'[hook][{acc}]concat=n=2:v=1:a=0[full]')
t += hd
g.append(f"[full]fade=t=out:st={t - FADE_OUT:.4f}:d={FADE_OUT}:color=black,"
         f'pad=1080:1920:0:{PY}:black,setsar=1[vout]')
cmd += ['-f', 'lavfi', '-t', f'{t:.3f}', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-filter_complex', ';'.join(g), '-map', '[vout]', '-map', f'{len(CUT) + 1}:a',
        '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-crf', '18',
        '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', str(FPS * 2),
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
        '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
print('wrote', OUT, round(t, 2), 's')

#!/usr/bin/env python3
"""Instagram feed triptych (1080x1350, 4:5): one painting split into horizontal thirds (top to bottom),
each third at a different stage (old green / lavender / blue), aligned so they join."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from build import grade
P = os.path.dirname(os.path.abspath(__file__))
R = '/home/user/Little-Bean-Server/reel'
STAGES = [('3631', 3.4, 'A'), ('3655', 2.9, 'B'), ('3659', 3.6, 'B')]   # top, middle, bottom
CX, CY, CW, CH = 100, 130, 916, 1145         # tight canvas crop in the aligned box (4:5), clear of the brush
IW, IH = 1000, 1248                         # painting size in the post
GUT = 20                                    # gutter between bands
W, H = 1080, 1350
MX = (W - IW) // 2                          # 40: clear of the 3:4 profile-grid crop
MY = (H - IH - 2 * GUT) // 2
BG = '0xF5F3EF'                             # gallery off-white
PHT = IH // 3

ins, g = [], [f'color=c={BG}:s={W}x{H}[bg]']
for i, (c, t, grp) in enumerate(STAGES):
    ins += ['-ss', str(t), '-i', f'{P}/stab_{c}.mp4']
    g.append(f'[{i}:v]trim=end_frame=1,crop={CW}:{CH}:{CX}:{CY},hflip,vflip,{grade(grp)},'
             f'scale={IW}:{IH}:flags=lanczos,crop={IW}:{PHT}:0:{i * PHT}[p{i}]')
last = 'bg'
for i in range(3):
    g.append(f'[{last}][p{i}]overlay={MX}:{MY + i * (PHT + GUT)}[o{i}]')
    last = f'o{i}'
g.append(f'[{last}]scale=in_color_matrix=bt709:in_range=tv,format=rgb24[v]')
base = ['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(g), '-map', '[v]', '-frames:v', '1']
subprocess.run(base + [f'{R}/janet_rework_triptych_post_across.png'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{R}/janet_rework_triptych_post_across.png',
                '-q:v', '1', '-pix_fmt', 'yuvj444p', f'{R}/janet_rework_triptych_post_across.jpg'], check=True)
print('ok', W, H, 'margins', MX, MY)

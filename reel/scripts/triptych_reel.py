#!/usr/bin/env python3
"""Triptych as a 9:16 reel: three stages stacked, same framing as the process video."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from build import grade
P = os.path.dirname(os.path.abspath(__file__))
R = '/home/user/Little-Bean-Server/reel'
PANELS = [('3631', 3.4, 'A'), ('3655', 2.9, 'B'), ('3659', 3.6, 'B')]
# process-video framing: 5:4 band, left trimmed (pre-rotation right), rotated 180
TRIM_L, BAND_H, BAND_Y = 70, 864, 243
CW = 1080 - TRIM_L
CH = round(BAND_H * CW / 1080 / 2) * 2
CY = BAND_Y + (BAND_H - CH) // 2
PW, PH, GAP = 720, 576, 24                 # 5:4 panels
X = (1080 - PW) // 2
Y0 = (1920 - (3 * PH + 2 * GAP)) // 2
DUR, FADE, STAGGER = 9.0, 0.7, 0.8

for i, (c, t, g) in enumerate(PANELS, 1):
    vf = (f'crop={CW}:{CH}:0:{CY},hflip,vflip,{grade(g)},scale={PW}:{PH}:flags=lanczos')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', f'{P}/stab_{c}.mp4',
                    '-frames:v', '1', '-vf', vf, '-c:v', 'ffv1', f'{P}/trp_{i}.mkv'], check=True)

def graph(animated):
    g = [f'color=c=black:s=1080x1920:r=30:d={DUR}[bg]']
    last = 'bg'
    for i in range(3):
        fade = (f',format=yuva420p,fade=t=in:st={0.3 + i * STAGGER}:d={FADE}:alpha=1' if animated else '')
        g.append(f'[{i}:v]loop=loop=-1:size=1:start=0,setpts=N/30/TB,fps=30,trim=duration={DUR}{fade}[p{i}]')
        g.append(f'[{last}][p{i}]overlay={X}:{Y0 + i * (PH + GAP)}:shortest=1[o{i}]')
        last = f'o{i}'
    g.append(f'[{last}]setsar=1,format=yuv420p[v]')
    return ';'.join(g)

ins = sum((['-i', f'{P}/trp_{i}.mkv'] for i in (1, 2, 3)), [])
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-f', 'lavfi', '-t', str(DUR),
                '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
                '-filter_complex', graph(True), '-map', '[v]', '-map', '3:a',
                '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-crf', '18',
                '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60',
                '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
                '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
                f'{R}/janet_rework_triptych_reel.mp4'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', graph(False).replace('format=yuv420p[v]', 'scale=in_color_matrix=bt709:in_range=tv,format=rgb24[v]'),
                '-map', '[v]', '-frames:v', '1', f'{R}/janet_rework_triptych_reel.png'], check=True)
print('panels', PW, PH, 'top', Y0, 'bottom', Y0 + 3 * PH + 2 * GAP)

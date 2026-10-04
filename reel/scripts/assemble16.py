#!/usr/bin/env python3
"""Assemble graded segments into the final reels (clean + text) and the cover."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from build16 import EDL, XFADE_IN, seg_path, timeline, FW, FH, PW, PH, PY, FPS, S

OUT = '/home/user/Little-Bean-Server/reel'
os.makedirs(OUT, exist_ok=True)
FONT = f'{S}/fonts/extras/ttf/Inter-Medium.ttf'

tl, total = timeline()
start = {r[0]: r[2] for r in tl}
dur = {r[0]: r[3] for r in tl}
end = {i: start[i] + dur[i] for i in start}

TEXT = []  # no burned-in text
FS = 52                     # font size
TX = 80                     # left margin (well clear of the right-edge UI)
TY = 1410                   # glyph top; text bottom ~1470 < 1536 (bottom-20% line)
FADE = 0.2


def alpha(a, b):
    return (f"if(lt(t\\,{a:.3f})\\,0\\,if(lt(t\\,{a+FADE:.3f})\\,(t-{a:.3f})/{FADE}\\,"
            f"if(lt(t\\,{b-FADE:.3f})\\,1\\,if(lt(t\\,{b:.3f})\\,({b:.3f}-t)/{FADE}\\,0))))")


def drawtexts(color):
    parts = []
    for txt, a, b in TEXT:
        parts.append(f"drawtext=fontfile={FONT}:text='{txt}':fontsize={FS}:fontcolor={color}:"
                     f"x={TX}:y={TY}:alpha='{alpha(a, b)}'")
    return ','.join(parts)


def graph(with_text):
    ids = [e[0] for e in EDL]
    # split into runs at crossfade points
    runs, cur = [], []
    for i in ids:
        if i in XFADE_IN and cur:
            runs.append(cur); cur = []
        cur.append(i)
    runs.append(cur)
    g = []
    for k, i in enumerate(ids):
        g.append(f'[{k}:v]settb=1/{FPS*1000},setpts=PTS-STARTPTS,fps={FPS},format=yuv420p[s{i}]')
    run_labels, run_durs = [], []
    for r, run in enumerate(runs):
        ins = ''.join(f'[s{i}]' for i in run)
        g.append(f'{ins}concat=n={len(run)}:v=1:a=0[r{r}]')
        run_labels.append(f'r{r}')
        run_durs.append(sum(dur[i] for i in run))
    acc_label, acc_dur = run_labels[0], run_durs[0]
    for r in range(1, len(runs)):
        xf = XFADE_IN[runs[r][0]]
        off = acc_dur - xf
        g.append(f'[{acc_label}][{run_labels[r]}]xfade=transition=fade:duration={xf}:offset={off:.4f}[x{r}]')
        acc_label, acc_dur = f'x{r}', acc_dur + run_durs[r] - xf
    g.append(f'[{acc_label}]pad={FW}:{FH}:0:{PY}:black,setsar=1[lb]')
    if not with_text:
        g.append('[lb]null[vout]')
    else:
        # soft shadow: blurred dark text on a transparent layer, then crisp white text
        g.append(f'color=c=black@0.0:s={FW}x{FH}:r={FPS}:d={total:.3f},format=rgba,'
                 f'{drawtexts("black@0.75")},gblur=sigma=7[sh]')
        g.append('[lb][sh]overlay=format=auto[lbs]')
        g.append(f'[lbs]{drawtexts("white")}[vout]')
    return ';'.join(g), acc_dur


def render(name, with_text):
    fg, d = graph(with_text)
    cmd = ['ffmpeg', '-v', 'error', '-y']
    for e in EDL:
        cmd += ['-i', seg_path(e[0])]
    cmd += ['-f', 'lavfi', '-t', f'{d:.3f}', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
            '-filter_complex', fg, '-map', '[vout]', '-map', f'{len(EDL)}:a',
            '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2',
            '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', str(FPS * 2),
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
            '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
            f'{OUT}/{name}']
    subprocess.run(cmd, check=True)
    print('wrote', name, round(d, 2), 's')


if __name__ == '__main__':
    render('janet_rework_reel_clean.mp4', False)
    

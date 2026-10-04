#!/usr/bin/env python3
"""Janet Cruise Halpin rework reel: segment renderer + assembler.

Picture: 4:5 window (1080x1350) letterboxed in 1080x1920, 30fps.
"""
import glob, json, os, subprocess, sys

U = '/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b'
S = '/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad'
SEG = f'{S}/segs'
os.makedirs(SEG, exist_ok=True)
FPS = 30
PW, PH = 1080, 1350          # picture window
FW, FH = 1080, 1920          # full frame
PY = (FH - PH) // 2          # 285

def src(n):
    return glob.glob(f'{U}/*IMG_{n}.MOV')[0]

# White balance (measured on gloves / newsprint / plastic, ~80% correction
# so the paint isn't over-cooled).  A = earlier session, B = later, warmer.
WB = {
    'A': 'colorchannelmixer=rr=0.975:bb=1.035',
    'B': 'colorchannelmixer=rr=0.955:bb=1.045',
}
# Gentle S: lifted black point (no crush), highlight roll-off (window safety)
CURVE = "curves=all='0/0.015 0.25/0.238 0.5/0.505 0.75/0.765 0.92/0.925 1/0.972'"
SAT = 'eq=saturation=1.07'

def grade(group):
    return ','.join([
        'scale=in_color_matrix=bt709:in_range=tv,format=gbrp',
        WB[group], CURVE, SAT,
        'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    ])

# EDL. (id, beat, clip, in, out, speed, crop, group)
#   crop for portrait: ('p', y_top)   -> 1080x1350 window at y_top
#   crop for landscape: ('l', x0, x1) -> 864x1080 window panning x0->x1, upscaled 1.25x
#   'freeze' -> still from `in` with slow push-in for (out) seconds
EDL = [
    # 1 HOOK - strongest fresh-paint stroke
    ('01', 1, '3658', 0.00, 1.60, 1.0, ('p', 230), 'B'),
    # 2 OLD PAINTING - freeze + slow push (no pull-out footage)
    ('02', 2, '3628', 0.00, 1.40, 'freeze', ('l', 690, 690), 'A'),
    # 3 WHITE SPIRIT
    ('03', 3, '3629', 0.20, 1.75, 1.0, ('l', 230, 230), 'A'),
    ('04', 3, '3631', 0.00, 3.55, 2.0, ('l', 1000, 300), 'A'),
    ('05', 3, '3640', 0.00, 3.15, 2.0, ('p', 230), 'A'),
    ('06', 3, '3642', 0.70, 2.15, 1.0, ('p', 285), 'A'),   # calm drift, xfade in
    # 5 NEW COLOUR / OLD PEEPING THROUGH
    ('07', 5, '3644', 0.00, 2.00, 1.0, ('p', 270), 'A'),
    ('08', 5, '3648', 0.00, 1.75, 1.0, ('p', 285), 'A'),
    ('09', 5, '3650', 0.00, 6.30, 3.0, ('p', 250), 'B'),
    ('10', 5, '3652', 0.30, 2.30, 1.0, ('p', 285), 'B'),
    ('11', 5, '3654', 0.50, 2.00, 1.0, ('p', 250), 'B'),
    # 6 CLIMAX - confident blue, real speed
    ('12', 6, '3657', 0.00, 2.50, 1.0, ('p', 230), 'B'),
    ('13', 6, '3657', 2.75, 4.50, 1.0, ('p', 230), 'B'),
    ('14', 6, '3658', 4.50, 6.50, 1.0, ('p', 230), 'B'),
    ('15', 6, '3660', 2.00, 4.00, 1.0, ('p', 230), 'B'),
    ('16', 6, '3661', 0.00, 2.50, 1.0, ('p', 230), 'B'),
    ('17', 6, '3664', 0.25, 2.75, 1.0, ('p', 285), 'B'),
    ('18', 6, '3667', 0.00, 2.50, 1.0, ('p', 285), 'B'),
    # 7 HOLD
    ('19', 7, '3668', 0.50, 3.80, 1.0, ('p', 285), 'B'),
]
# segments that get a 0.3s crossfade *into* them (calm moments only)
XFADE_IN = {'06': 0.3, '19': 0.3}
XF = 0.3

ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '8', '-pix_fmt', 'yuv420p',
       '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
       '-color_range', 'tv', '-an']


def seg_path(i):
    return f'{SEG}/seg_{i}.mp4'


def render_seg(e):
    i, beat, clip, tin, tout, speed, crop, group = e
    out = seg_path(i)
    if crop[0] == 'p':
        geo = f'crop={PW}:{PH}:0:{crop[1]}'
    if speed == 'freeze':
        dur = tout
        x0 = crop[1]
        # crop 4:5 from landscape, upscale 4x for smooth sub-pixel push, zoompan down
        n = int(round(dur * FPS))
        vf = (f'crop=864:1080:{x0}:0,scale={PW*2}:{PH*2}:flags=lanczos,'
              f"zoompan=z='1+0.045*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={PW}x{PH}:fps={FPS},"
              + grade(group))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{tin}', '-i', src(clip),
                        '-frames:v', '1', '-c:v', 'ffv1', f'{SEG}/freeze_{i}.mkv'], check=True)
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', f'{SEG}/freeze_{i}.mkv', '-vf', vf,
               '-frames:v', str(n), '-r', str(FPS)] + ENC + [out]
        subprocess.run(cmd, check=True)
        return
    srcdur = tout - tin
    dur = srcdur / speed
    if crop[0] == 'l':
        x0, x1 = crop[1], crop[2]
        geo = (f"crop=864:1080:x='{x0}+({x1}-{x0})*min(t/{dur:.4f}\\,1)':y=0,"
               f'scale={PW}:{PH}:flags=lanczos,unsharp=5:5:0.35')
    vf = (f'trim={tin}:{tout},setpts=(PTS-STARTPTS)/{speed},fps={FPS},'
          f'{geo},{grade(group)}')
    # setpts after trim: crop t refers to output time
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src(clip), '-vf', vf,
           '-frames:v', str(int(round(dur * FPS)))] + ENC + [out]
    subprocess.run(cmd, check=True)


def probe_dur(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                 '-of', 'csv=p=0', p], capture_output=True, text=True).stdout)


def timeline():
    """Return list of (id, beat, start_time_in_reel, dur) accounting for xfades."""
    t = 0.0
    out = []
    for e in EDL:
        i = e[0]
        d = probe_dur(seg_path(i))
        if i in XFADE_IN:
            t -= XFADE_IN[i]
        out.append((i, e[1], t, d))
        t += d
    return out, t


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'segs'
    if what == 'segs':
        only = sys.argv[2:]
        for e in EDL:
            if only and e[0] not in only:
                continue
            render_seg(e)
            print('rendered', e[0], e[2])
    elif what == 'timeline':
        tl, total = timeline()
        for r in tl:
            print(f'{r[0]} beat{r[1]} start={r[2]:6.2f} dur={r[3]:.2f}')
        print('TOTAL', round(total, 2))
        json.dump({'tl': tl, 'total': total}, open(f'{S}/timeline.json', 'w'))

#!/usr/bin/env python3
"""Janet Cruise Halpin rework reel: segment renderer + assembler.

Picture: 16:9 band (1080x608) letterboxed in 1080x1920, 30fps.
Portrait clips track the brush vertically inside the band.
"""
import glob, json, os, subprocess, sys

U = '/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b'
S = '/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad'
SEG = f'{S}/segs16'
os.makedirs(SEG, exist_ok=True)
FPS = 30
PW, PH = 1080, 608           # picture band (16:9)
FW, FH = 1080, 1920          # full frame
PY = (FH - PH) // 2          # 656

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
#   crop for landscape: ('l',) -> full 16:9 frame scaled to the band
#   ('t',) -> portrait clip, band follows the tracked brush
#   'freeze' -> still from `in` with slow push-in for (out) seconds
EDL = [
    # 1 HOOK - strongest fresh-paint stroke
    ('01', 1, '3658', 0.00, 1.60, 1.0, ('t',), 'B'),
    # 3 WHITE SPIRIT (old painting visible throughout)
    ('03', 3, '3629', 0.20, 1.75, 1.0, ('l',), 'A'),
    ('04', 3, '3631', 0.00, 3.55, 2.0, ('l',), 'A'),
    ('05', 3, '3640', 0.00, 3.15, 2.0, ('t',), 'A'),
    ('06', 3, '3642', 0.70, 2.15, 1.0, ('p', 656), 'A'),   # calm drift, xfade in
    # 5 NEW COLOUR / OLD PEEPING THROUGH
    ('07', 5, '3644', 0.00, 2.00, 1.0, ('t',), 'A'),
    ('08', 5, '3648', 0.00, 1.75, 1.0, ('p', 560), 'A'),
    ('09', 5, '3650', 0.00, 6.30, 3.0, ('p', 560), 'B'),
    ('10', 5, '3652', 0.30, 2.30, 1.0, ('p', 600), 'B'),
    ('11', 5, '3654', 0.50, 2.00, 1.0, ('t',), 'B'),
    # 6 CLIMAX - confident blue, real speed
    ('12', 6, '3657', 0.00, 2.50, 1.0, ('t',), 'B'),
    ('13', 6, '3657', 2.75, 4.50, 1.0, ('t',), 'B'),
    ('14', 6, '3658', 4.50, 6.50, 1.0, ('t',), 'B'),
    ('15', 6, '3660', 2.00, 4.00, 1.0, ('t',), 'B'),
    ('16', 6, '3661', 0.00, 2.50, 1.0, ('t',), 'B'),
    ('17', 6, '3664', 0.25, 2.75, 1.0, ('p', 656), 'B'),
    ('18', 6, '3667', 0.00, 2.50, 1.0, ('p', 656), 'B'),
    # 7 HOLD
    ('19', 7, '3668', 0.50, 3.80, 1.0, ('lin', 1090, 640), 'B')   # counter the camera drift,
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
    elif crop[0] == 'lin':
        d = (tout - tin) / speed
        geo = f"crop={PW}:{PH}:0:y='{crop[1]}+({crop[2]}-{crop[1]})*min(t/{d:.3f}\\,1)'"
    elif crop[0] == 't':
        geo = f"crop={PW}:{PH}:0:y='{track_expr(clip, tin, tout, speed)}'"
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
        geo = f'scale={PW}:{PH}:flags=lanczos'
    vf = (f'trim={tin}:{tout},setpts=(PTS-STARTPTS)/{speed},fps={FPS},'
          f'{geo},{grade(group)}')
    # setpts after trim: crop t refers to output time
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src(clip), '-vf', vf,
           '-frames:v', str(int(round(dur * FPS)))] + ENC + [out]
    subprocess.run(cmd, check=True)


def track_expr(clip, tin, tout, speed):
    """Smoothed brush-height track -> piecewise-linear crop y(t) expression."""
    import numpy as np
    from track import track
    t, ys = track(clip, tin, tout)
    ok = ~np.isnan(ys)
    ys = np.interp(t, t[ok], ys[ok])
    k = 7  # median 0.7s
    pad = np.pad(ys, k // 2, mode='edge')
    ys = np.array([np.median(pad[i:i + k]) for i in range(len(ys))])
    k = 9  # moving average 0.9s
    pad = np.pad(ys, k // 2, mode='edge')
    ys = np.convolve(pad, np.ones(k) / k, mode='valid')
    y = np.clip(ys - PH * 0.6, 120, 1920 - PH - 120)   # brush ~60% down the band
    t = t / speed
    # velocity limit (px/s) for a calm, cinematic follow
    vmax = 350.0
    for i in range(1, len(y)):
        dt = t[i] - t[i - 1]
        y[i] = y[i - 1] + np.clip(y[i] - y[i - 1], -vmax * dt, vmax * dt)
    kt = np.arange(0, t[-1] + 1e-6, 0.2)
    ky = np.interp(kt, t, y)
    expr = f'{ky[-1]:.1f}'
    for i in range(len(kt) - 2, -1, -1):
        a, b, ta = ky[i], ky[i + 1], kt[i]
        expr = (f'if(lt(t\\,{kt[i+1]:.3f})\\,{a:.1f}+({b - a:.1f})*(t-{ta:.3f})/0.2\\,{expr})')
    return f'max(0\\,min({1920 - PH}\\,{expr}))'


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

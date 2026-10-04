"""Estimate brush-tip height over time in portrait clips via frame differencing.
Tip ~ lower extent of motion (arm enters from top, so motion bottom = brush)."""
import subprocess, glob, numpy as np, sys, json
U='/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b'
W,H,F=135,240,10
def track(clip,tin,tout):
    f=glob.glob(f'{U}/*IMG_{clip}.MOV')[0]
    raw=subprocess.run(['ffmpeg','-v','error','-ss',str(max(0,tin-0.2)),'-t',str(tout-tin+0.4),'-i',f,
        '-vf',f'fps={F},scale={W}:{H}','-f','rawvideo','-pix_fmt','gray','-'],capture_output=True).stdout
    a=np.frombuffer(raw,np.uint8).reshape(-1,H,W).astype(float)
    d=np.abs(np.diff(a,axis=0)); d=(d>18).astype(float)
    ys=[]
    for m in d:
        rows=m.sum(1)
        if rows.sum()<30: ys.append(np.nan); continue
        c=np.cumsum(rows)/rows.sum()
        ys.append(np.searchsorted(c,0.85)/H*1920)
    ys=np.array(ys); t=np.arange(len(ys))/F+max(0,tin-0.2)-tin+0.05
    return t,ys
if __name__=='__main__':
    for spec in sys.argv[1:]:
        c,a,b=spec.split(':'); t,ys=track(c,float(a),float(b))
        print(c,a,b,' '.join(f'{tt:.1f}:{"--" if np.isnan(y) else int(y)}' for tt,y in zip(t,ys)))

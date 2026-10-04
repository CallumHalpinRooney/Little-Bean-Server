import subprocess,glob,numpy as np,sys
U='/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b'
for f in sorted(glob.glob(U+'/*.MOV'),key=lambda x:x.split('IMG_')[1]):
    n=f.split('IMG_')[1][:4]
    w,h=270,480
    out=subprocess.run(['ffmpeg','-v','error','-i',f,'-vf',f'fps=2,scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    a=np.frombuffer(out,np.uint8).reshape(-1,h,w,3).astype(float)
    px=a.reshape(-1,3); px=px[px.sum(1)>0]
    r,g,b=px[:,0],px[:,1],px[:,2]; Y=0.2126*r+0.7152*g+0.0722*b
    m=(Y>150)&(np.abs(r-g)<35)&(np.abs(b-g)<35)
    nr=px[m].mean(0)
    clip=(px.max(1)>=250).mean()*100
    p1,p50,p99=np.percentile(Y,[1,50,99])
    print(f"{n} neutralRGB={nr.round(1)} R/G={nr[0]/nr[1]:.3f} B/G={nr[2]/nr[1]:.3f} n={m.sum():6d}  Y p1/50/99={p1:.0f}/{p50:.0f}/{p99:.0f} clip%={clip:.2f}")

"""Two grades. 'true' for paintings (neutral, accurate, lifted exposure).
'inspo' for nature photos (soft filmic: lifted blacks, gentle roll-off, warm highs / cool shadows, light grain)."""
import numpy as np
from PIL import Image, ImageCms
I='/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/images/'
U='/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b/'
O='/home/user/Little-Bean-Server/reel/graded/'
srgb=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
rng=np.random.default_rng(5)
def crop45(im):
    h=round(im.width*5/4); y=(im.height-h)//2
    return im.crop((0,y,im.width,y+h)).resize((1080,1350),Image.LANCZOS)
def lum(a): return (.2126*a[...,0]+.7152*a[...,1]+.0722*a[...,2])[...,None]
def sat(a,s): L=lum(a); return L+(a-L)*s
def curve(a,xs,ys): return np.interp(np.clip(a,0,1),xs,ys)
def true_grade(im, ref_box, wb_strength, out):
    a=np.asarray(im).astype(np.float32)/255
    x0,y0,x1,y1=[int(v) for v in (ref_box[0]*im.width,ref_box[1]*im.height,ref_box[2]*im.width,ref_box[3]*im.height)]
    r=a[y0:y1,x0:x1].reshape(-1,3).mean(0); g=r[1]
    gain=1+wb_strength*(g/r-1); a=a*gain                       # neutralise lamp cast
    p99=np.percentile(lum(a),99.5); a=a*min(0.93/p99,1.9)      # set exposure so whites land ~93%
    a=curve(a,[0,.04,.25,.5,.75,1],[.012,.045,.24,.51,.77,.975])  # gentle S, no crushed blacks
    a=sat(a,1.08)
    Image.fromarray((np.clip(a,0,1)*255+.5).astype(np.uint8)).save(O+out,quality=95,subsampling=0,icc_profile=srgb)
    print(out,'gain',gain.round(3),'exp',round(min(0.93/p99,1.9),2))
def inspo_grade(im,out):
    a=np.asarray(im).astype(np.float32)/255
    a=a*(0.93/max(np.percentile(lum(a),99.5),0.5))
    a=curve(a,[0,.2,.5,.8,1],[.06,.22,.50,.76,.93])              # lifted blacks, soft highlights
    a=sat(a,0.88)
    L=lum(a); a=a+(1-L)*np.array([-.012,.004,.022])+L*np.array([.022,.008,-.02])  # cool shadows, warm highs
    a=a+rng.normal(0,.012,a.shape[:2])[...,None]                 # fine grain
    Image.fromarray((np.clip(a,0,1)*255+.5).astype(np.uint8)).save(O+out,quality=95,subsampling=0,icc_profile=srgb)
    print(out)
true_grade(crop45(Image.open(I+'6.jpg').convert('RGB')),(.05,.05,.30,.25),0.5,'painting_easel.jpg')
true_grade(crop45(Image.open(I+'7.jpg').convert('RGB')),(.05,.03,.70,.22),0.45,'painting_stone_wall.jpg')
for n,f in enumerate(['dbccdfdc','bcc06a7f','c497bc31','c037c862','85fbdf5d','73561c85','2b3371bc','db202dda','c975f78a'],1):
    inspo_grade(crop45(Image.open(U+f+'-image.jpg').convert('RGB')),f'inspo_{n:02d}.jpg')

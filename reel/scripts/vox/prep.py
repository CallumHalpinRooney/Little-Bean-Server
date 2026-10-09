"""Assets + colour analysis for the Vox-style explainer."""
import json, subprocess, numpy as np, cv2
from PIL import Image
S='/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad'
U='/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b/'
R='/home/user/Little-Bean-Server/reel'
A=f'{S}/vox/assets'
def load(p): return Image.open(p).convert('RGB')
def trim(im,n): return im.crop((n,n,im.width-n,im.height-n))
assets={
 'floor': load(U+'a12a2516-image.jpg'),
 'fern': trim(load(U+'414c7a6a-image.jpg'),35),
 'canopy': load(U+'942a68f1-image.jpg'),
 'heather': load(U+'e953d828-image.jpg'),
 'paint6': trim(load(U+'e017653b-image.jpg'),56),
 'before': load(f'{R}/carousel/03_before.png').crop((40,50,1040,1300)),
 'lavender': load(f'{R}/carousel/04_lavender.png').crop((40,50,1040,1300)),
 'now': load(f'{R}/carousel/05_now.png').crop((40,50,1040,1300)),
 'palette': load(f'{R}/palette/janet_palette_post.jpg'),
}
for k,v in assets.items():
    v.thumbnail((1400,1400),Image.LANCZOS); v.save(f'{A}/{k}.png'); print(k,v.size)
info={}
def lab(im): return cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2LAB).astype(np.float32)
def locate(im,c):
    l=lab(im.resize((im.width//4,im.height//4))); l=cv2.GaussianBlur(l,(9,9),0)
    d=np.linalg.norm(l-c,axis=2)
    my,mx=int(d.shape[0]*0.1),int(d.shape[1]*0.1)          # stay off the edges
    d[:my]=d[-my:]=1e9; d[:,:mx]=d[:,-mx:]=1e9
    y,x=np.unravel_index(d.argmin(),d.shape)
    return [int(x*4)/im.width,int(y*4)/im.height,float(d.min())]
def locate_n(im,c,n=3,sep=0.18):
    l=lab(im.resize((im.width//4,im.height//4))); l=cv2.GaussianBlur(l,(9,9),0)
    d=np.linalg.norm(l-c,axis=2); H_,W_=d.shape
    my,mx=int(H_*0.1),int(W_*0.1); d[:my]=d[-my:]=1e9; d[:,:mx]=d[:,-mx:]=1e9
    out=[]
    for _ in range(n):
        y,x=np.unravel_index(d.argmin(),d.shape); out.append([x/W_,y/H_])
        yy,xx=np.ogrid[:H_,:W_]; d[((yy-y)/H_)**2+((xx-x)/W_)**2<sep**2]=1e9
    return out
# 1) colours that travel: sample the PHOTO, keep only colours the painting really contains
p6=assets['paint6']; ht=assets['heather']
def clusters(im,k):
    sm=np.asarray(im.resize((im.width//6,im.height//6)))
    L=lab(Image.fromarray(sm)).reshape(-1,3)
    _,lb,c=cv2.kmeans(L,k,None,(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,40,0.5),5,cv2.KMEANS_PP_CENTERS)
    out=[]
    for i in range(k):                                     # purest 30% of each cluster
        sel=L[lb.ravel()==i]; ch=np.hypot(sel[:,1]-128,sel[:,2]-128)
        out.append(sel[ch>=np.percentile(ch,70)].mean(0))
    return np.array(out)
FAM={'magenta':(290,350),'lime':(60,100),'green':(100,170)}
def by_family(im):
    c=clusters(im,16); ch=np.hypot(c[:,1]-128,c[:,2]-128)
    # LCh hue from Lab -> map to a perceptual hue angle in degrees (approx. matches HSV families via RGB)
    rgb=cv2.cvtColor(c.reshape(1,-1,3).astype(np.uint8),cv2.COLOR_LAB2RGB).reshape(-1,3)
    hsv=cv2.cvtColor(rgb.reshape(1,-1,3),cv2.COLOR_RGB2HSV).reshape(-1,3); hh=hsv[:,0].astype(float)*2
    out={}
    for f,(lo,hi) in FAM.items():
        idx=[i for i in range(len(c)) if lo<=hh[i]<hi and hsv[i,1]>40 and ch[i]>8]
        if idx: out[f]=c[max(idx,key=lambda i:ch[i])]
    return out
src_f=by_family(ht); dst_f=by_family(p6)
sw=[]
for f in FAM:
    if f in src_f and f in dst_f:
        to_rgb=lambda c: cv2.cvtColor(c.reshape(1,1,3).astype(np.uint8),cv2.COLOR_LAB2RGB).reshape(3).tolist()
        sw.append({'family':f,'rgb':to_rgb(src_f[f]),'rgb_dst':to_rgb(dst_f[f]),
                   'src':locate(ht,src_f[f]),'dst':locate(p6,dst_f[f]),
                   'srcs':locate_n(ht,src_f[f]),'dsts':locate_n(p6,dst_f[f])})
info['travel']=sw
# 2) palette mounds
pal=assets['palette']; pl=lab(pal.resize((pal.width//6,pal.height//6))).reshape(-1,3)
hsv=cv2.cvtColor(np.asarray(pal.resize((pal.width//6,pal.height//6))),cv2.COLOR_RGB2HSV).reshape(-1,3)
keep=~((hsv[:,1]<40)&(hsv[:,2]>170))           # drop the white palette surface
_,lb,pc=cv2.kmeans(pl[keep],9,None,(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,40,0.5),5,cv2.KMEANS_PP_CENTERS)
pk=pl[keep]; reps=[]
for i in range(len(pc)):
    sel=pk[lb.ravel()==i]; ch=np.hypot(sel[:,1]-128,sel[:,2]-128)
    reps.append(sel[ch>=np.percentile(ch,70)].mean(0))
mounds=[]
for c in reps:
    rgb=cv2.cvtColor(c.reshape(1,1,3).astype(np.uint8),cv2.COLOR_LAB2RGB).reshape(3)
    h,s,v=cv2.cvtColor(rgb.reshape(1,1,3),cv2.COLOR_RGB2HSV).reshape(3); h=int(h)*2
    if s<45: name='grey' if v>60 else 'dark green'
    elif v<70: name='dark green'
    elif h<20 or h>340: name='orange red' if v>150 else 'deep red'
    elif h<38: name='peach' if s<150 else 'orange'
    elif h<70: name='lemon'
    elif h<160: name='green'
    elif h<215: name='sky blue'
    elif h<250: name='deep blue'
    else: name='lilac'
    mounds.append({'rgb':rgb.tolist(),'name':name,'pos':locate(pal,c)})
seen=set(); info['palette']=[m for m in mounds if not (m['name'] in seen or seen.add(m['name']))][:6]
# 3) where the old green still shows in the lavender stage
lv=np.asarray(assets['lavender']); hv=cv2.cvtColor(lv,cv2.COLOR_RGB2HSV)
g=((hv[...,0]*2>=70)&(hv[...,0]*2<=190)&(hv[...,1]>60)&(hv[...,2]>60)).astype(np.uint8)
g=cv2.morphologyEx(g,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
n,labm,st,cen=cv2.connectedComponentsWithStats(g,8)
H_,W_=g.shape
inner=[i for i in range(1,n) if 0.1<cen[i][0]/W_<0.9 and 0.1<cen[i][1]/H_<0.9 and st[i,cv2.CC_STAT_AREA]>400]
blobs=sorted([(st[i,cv2.CC_STAT_AREA],i) for i in inner],reverse=True)[:3]
info['peep']=[{'c':[float(cen[i][0])/lv.shape[1],float(cen[i][1])/lv.shape[0]],
               'r':float(np.sqrt(st[i,cv2.CC_STAT_AREA]/np.pi))/lv.shape[1]*1.5} for a,i in blobs]
# 4) mushrooms on the forest floor (yellow caps)
fl=np.asarray(assets['floor']); hf=cv2.cvtColor(fl,cv2.COLOR_RGB2HSV)
y=((hf[...,0]*2>=35)&(hf[...,0]*2<=60)&(hf[...,1]>90)&(hf[...,2]>190)).astype(np.uint8)
n,labm,st,cen=cv2.connectedComponentsWithStats(cv2.morphologyEx(y,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8)),8)
i=max(range(1,n),key=lambda k:st[k,cv2.CC_STAT_AREA])
info['fungi']=[float(cen[i][0])/fl.shape[1],float(cen[i][1])/fl.shape[0]]
# 5) video clips from the approved process video (band y 528..1392)
def clip(spans,name):
    fr=[]
    for a,b in spans:
        raw=subprocess.run(['ffmpeg','-v','error','-ss',str(a),'-t',str(b-a),'-i',f'{R}/janet_rework_process_locked.mp4',
            '-vf','crop=1080:864:0:528,scale=880:704:flags=lanczos','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
        fr.append(np.frombuffer(raw,np.uint8).reshape(-1,704,880,3))
    v=np.concatenate(fr); np.save(f'{A}/{name}.npy',v); print(name,v.shape)
clip([(5.30,6.70),(9.60,12.30)],'clipA')     # white spirit pour, then brushing it back
clip([(17.80,22.30)],'clipB')                # the blue strokes
json.dump(info,open(f'{A}/info.json','w'),indent=1)
for k in ('travel','palette'):
    for m in info[k]: print(k, m.get('name',m.get('family','')), m['rgb'], m.get('rgb_dst',''), [round(v,2) for v in m.get('src',m.get('pos'))], [round(v,2) for v in m.get('dst',[])])
print('peep',info['peep']); print('fungi',info['fungi'])

import cv2, numpy as np, subprocess, glob
U='/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b'
P='/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad/proc'
CLIPS=['3628','3629','3631','3632','3640','3641','3644','3650','3654','3655','3657','3658','3659','3660','3661']
def frame(c,t):
    f=glob.glob(f'{U}/*IMG_{c}.MOV')[0]
    raw=subprocess.run(['ffmpeg','-v','error','-ss',str(t),'-i',f,'-frames:v','1','-f','rawvideo','-pix_fmt','bgr24','-'],capture_output=True).stdout
    w,h=(1920,1080) if c in ('3628','3629','3631','3632') else (1080,1920)
    return np.frombuffer(raw,np.uint8).reshape(h,w,3).copy()
sift=cv2.SIFT_create(4000)
def feats(im):
    g=cv2.cvtColor(cv2.resize(im,None,fx=0.5,fy=0.5),cv2.COLOR_BGR2GRAY)
    k,d=sift.detectAndCompute(g,None); return k,d
def match(a,b):
    ka,da=feats(a); kb,db=feats(b)
    m=cv2.BFMatcher().knnMatch(da,db,k=2)
    good=[x for x,y in m if x.distance<0.75*y.distance]
    pa=np.float32([ka[g.queryIdx].pt for g in good])*2; pb=np.float32([kb[g.trainIdx].pt for g in good])*2
    H,inl=cv2.findHomography(pa,pb,cv2.RANSAC,6.0)
    return H,int(inl.sum()),len(good)
ref=frame('3657',0.05)
prev=None; Hs={}
for c in CLIPS:
    im=frame(c,0.05)
    H,ni,ng=match(im,ref)
    print(c,'direct inliers',ni,'/',ng)
    Hs[c]=H
    w=cv2.warpPerspective(im,H,(1080,1920))
    blend=cv2.addWeighted(w,0.5,ref,0.5,0)
    cv2.imwrite(f'{P}/ov_{c}.jpg',cv2.resize(blend,(270,480)))
np.save(f'{P}/H_direct.npy',Hs,allow_pickle=True)

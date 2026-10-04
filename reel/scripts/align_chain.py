import cv2, numpy as np, sys
sys.argv=['x']; exec(open('align_probe.py').read().split('ref=frame')[0])
ref=frame('3657',0.05)
Hd=np.load('H_direct.npy',allow_pickle=True).item()
# landscape session -> 3632 (last frame) -> 3640 (first frame) -> ref
a3632_end=frame('3632',6.8); f3640=frame('3640',0.05)
H_32_40,ni,ng=match(a3632_end,f3640); print('3632end->3640',ni,ng)
H_40_ref=Hd['3640']
for c,t in [('3628',0.05),('3629',0.05),('3631',0.05),('3632',0.05)]:
    im=frame(c,t)
    if c=='3632': H_c_32=np.eye(3); 
    else:
        H_c_32,ni,ng=match(im,frame('3632',0.05)); print(c,'->3632',ni,ng)
    # 3632 start -> 3632 end
    H_s_e,ni2,_=match(frame('3632',0.05),a3632_end)
    H=H_40_ref@H_32_40@H_s_e@H_c_32
    Hd[c]=H
    w=cv2.warpPerspective(im,H,(1080,1920))
    cv2.imwrite(f'ov_{c}.jpg',cv2.resize(cv2.addWeighted(w,0.5,ref,0.5,0),(270,480)))
np.save('H_chain.npy',Hd,allow_pickle=True)
g=ref.copy()
for x in range(0,1080,100): cv2.line(g,(x,0),(x,1920),(0,255,255),1); cv2.putText(g,str(x),(x+2,30),0,0.8,(0,255,255),2)
for y in range(0,1920,100): cv2.line(g,(0,y),(1080,y),(0,255,255),1); cv2.putText(g,str(y),(2,y-4),0,0.8,(0,255,255),2)
cv2.imwrite('ref_grid.jpg',cv2.resize(g,(540,960)))

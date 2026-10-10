"""Which nature photo belongs with which painting? Compare colour distributions (Lab a/b + L)."""
import numpy as np, cv2
from PIL import Image
U='/root/.claude/uploads/d901dcad-3814-5d42-8c2c-d198042d327b/'
PHOTOS={'p3_forest_floor':'a12a2516','p7_bracken_dark':'f878595d','p8_canopy':'942a68f1',
        'p9_heather_collage':'e953d828','p10_fern_thistle':'414c7a6a','p11_ferns_scabious':'8dbfd0ac'}
PAINT={'A_speckled_green':'c84780bf','B_green_landscape':'9daff783','C_grey_green':'7bcd4f16','D_pink_blue':'e017653b'}
def lab(fid, trim=0):
    im=Image.open(f'{U}{fid}-image.jpg').convert('RGB')
    if trim: im=im.crop((trim,trim,im.width-trim,im.height-trim))
    im.thumbnail((300,300)); return cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2LAB).reshape(-1,3).astype(np.float32)
def hist(L):
    h,_=np.histogramdd(L,bins=(6,12,12),range=((0,256),(64,192),(64,192))); h=h.ravel()+1e-6; return h/h.sum()
ph={k:hist(lab(v)) for k,v in PHOTOS.items()}
pa={k:hist(lab(v,54)) for k,v in PAINT.items()}
def sim(a,b): return float(np.sum(np.sqrt(a*b)))          # Bhattacharyya coefficient
print('photo \\ painting', *pa)
M={}
for p in ph:
    row=[sim(ph[p],pa[q]) for q in pa]; M[p]=row
    print(f'{p:20s}', ' '.join(f'{v:.3f}' for v in row))

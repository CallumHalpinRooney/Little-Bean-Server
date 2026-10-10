"""Seen / Painted: photo on top, painting below, one small word on each. 1080x1350."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageCms
I='/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/images/'
O='/home/user/Little-Bean-Server/reel/seen_painted/'
FONT='/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad/fonts/serif/DMSerifDisplay-Italic.ttf'
W,H,GAP=1080,1350,8; HALF=(H-GAP)//2
srgb=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
def band(path, ycentre):
    im=Image.open(I+path).convert('RGB'); s=W/im.width
    h=round(HALF/s); y0=int(min(max(ycentre*im.height-h/2,0),im.height-h))
    return im.crop((0,y0,im.width,y0+h)).resize((W,HALF),Image.LANCZOS)
def label(page,text,y):
    f=ImageFont.truetype(FONT,54); x=44
    sh=Image.new('RGBA',page.size,(0,0,0,0)); d=ImageDraw.Draw(sh)
    d.text((x,y),text,font=f,fill=(0,0,0,150)); sh=sh.filter(ImageFilter.GaussianBlur(6))
    page.alpha_composite(sh); ImageDraw.Draw(page).text((x,y),text,font=f,fill=(255,255,255,240))
for name,(ph,py),(pa,pyc) in [('01_heather',('5.jpg',0.66),('1.jpg',0.40)),
                              ('02_fern_water',('4.jpg',0.50),('2.jpg',0.50))]:
    page=Image.new('RGBA',(W,H),(20,20,18,255))
    page.paste(band(ph,py),(0,0)); page.paste(band(pa,pyc),(0,HALF+GAP))
    label(page,'seen',HALF-92); label(page,'painted',H-92)
    page.convert('RGB').save(O+name+'.jpg',quality=95,subsampling=0,icc_profile=srgb); print(name)

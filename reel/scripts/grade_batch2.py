"""Grade new studio/painting photos with the same 'true' grade as painting_easel / stone_wall."""
import sys; sys.argv=['x']
src=open('/tmp/claude-0/-home-user-Little-Bean-Server/d901dcad-3814-5d42-8c2c-d198042d327b/scratchpad/grade_photos.py').read()
exec(src.split("true_grade(crop45(")[0])
# (file, out name, neutral wall box or None, wb strength)
JOBS=[('8.jpg','studio_easel_pink.jpg',(.40,.03,.95,.20),.5),
      ('9.jpg','detail_green_impasto.jpg',None,0),
      ('10.jpg','painting_pink_green.jpg',(.80,.20,.98,.32),.4),
      ('11.jpg','studio_two_paintings.jpg',(.05,.04,.40,.18),.5),
      ('12.jpg','studio_easel_wide.jpg',(.10,.04,.45,.18),.5)]
for f,out,box,s in JOBS:
    im=crop45(Image.open(I+f).convert('RGB'))
    true_grade(im, box or (0,0,1,1), s, out)

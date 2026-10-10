import sys; sys.argv=['x']
exec(open('notes.py').read().split('srgb = ImageCms')[0])
PH={'ferns_scabious':('8dbfd0ac',33),'fern_thistle':('414c7a6a',33),'canopy':('942a68f1',0),'heather':('e953d828',0),
    'forest_floor':('a12a2516',0),'bracken_dark':('f878595d',0)}
PA={'green_landscape':('9daff783',54),'pink_blue':('e017653b',54),'grey_green':('7bcd4f16',54),'speckled':('c84780bf',54)}
print('photo \\ painting', *PA)
for p,(pid,pt) in PH.items():
    ph=load(pid,pt); row=[]
    for a,(aid,at) in PA.items():
        d=sorted(c[2] for c in chips(ph,load(aid,at)))
        good=[x for x in d if x<=12]
        row.append(f'{len(good)}good/{np.mean(d[:4]):.1f}')
    print(f'{p:15s}',' '.join(f'{r:>14s}' for r in row), flush=True)

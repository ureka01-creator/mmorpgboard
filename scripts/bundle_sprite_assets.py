"""Import unmodified generated PNGs and describe their animation cells.
Only reads pixels for bounds/alignment; never repaints or resamples source art.
Usage: python scripts/bundle_sprite_assets.py --sources /tmp/sprite-sources.json
"""
import argparse,json,hashlib,shutil
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--sources',type=Path,required=True);p.add_argument('--guides',type=Path,default=Path('/tmp/elderfall-pose-guides'));args=p.parse_args()
sources=json.loads(args.sources.read_text());out=ROOT/'assets/sprites/warrior';out.mkdir(parents=True,exist_ok=True)
def bounds(a):
 y,x=np.nonzero(a>160)
 if not len(x):raise ValueError('Empty sprite cell')
 return np.array([int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)])
def figures(alpha):
 labels,count=label(alpha>64);slices=find_objects(labels);sizes=np.bincount(labels.ravel());h,w=alpha.shape;cw,ch=w//4,h//4
 main={};boxes={}
 for i,sl in enumerate(slices,1):
  if sl is None:continue
  y,x=sl;b=np.array([x.start,y.start,x.stop,y.stop]);boxes[i]=b
  cell=(min(3,(y.start+y.stop)//2//ch),min(3,(x.start+x.stop)//2//cw))
  if sizes[i]>300 and (cell not in main or sizes[i]>sizes[main[cell]]):main[cell]=i
 if len(main)!=16:raise ValueError('Expected sixteen distinct figures, found '+str(len(main)))
 result={cell:boxes[i].copy() for cell,i in main.items()}
 for i,b in boxes.items():
  if i in main.values():continue
  def distance(a):return max(a[0]-b[2],b[0]-a[2],0)**2+max(a[1]-b[3],b[1]-a[3],0)**2
  cell=min(main,key=lambda c:distance(boxes[main[c]]))
  if distance(boxes[main[cell]])<128**2:
   a=result[cell];result[cell]=np.array([min(a[0],b[0]),min(a[1],b[1]),max(a[2],b[2]),max(a[3],b[3])])
 return result
entries={};reference=[]
for name,path in sources.items():
 src=Path(path);image=Image.open(src)
 if image.mode!='RGBA':raise ValueError('Sprite must have real alpha: '+name)
 rgba=np.array(image);h,w=rgba.shape[:2]
 if w%4 or h%4:raise ValueError('Atlas needs an exact 4x4 grid: '+name)
 guide=np.array(Image.open(args.guides/(name+'.png')));cw,ch=w//4,h//4;gw,gh=guide.shape[1]//4,guide.shape[0]//4
 cells=[];ratios=[];actual=figures(rgba[:,:,3]);guides=figures(guide[:,:,3])
 for row in range(4):
  for col in range(4):
   alpha=rgba[row*ch:(row+1)*ch,col*cw:(col+1)*cw,3];b=actual[row,col];g=guides[row,col]
   if np.mean(alpha<8)<.25:raise ValueError('Opaque background in '+name)
   if b[0]<1 or b[1]<1 or b[2]>w-1 or b[3]>h-1:raise ValueError('Clipped art at canvas edge: '+name+' '+str((row,col)))
   ratio=(b[3]-b[1])/(g[3]-g[1]);ratios.append(ratio)
   cells.append((b,g))
   if name.startswith('idle'):reference.append(int(g[3]-g[1]))
 target=out/(name+'.png');shutil.copyfile(src,target)
 entries[name]={'image':rgba,'cells':cells,'scale':float(np.median(ratios)),'width':w,'height':h,'cw':cw,'ch':ch,'sha':hashlib.sha256(src.read_bytes()).hexdigest(),'guideSha':hashlib.sha256((args.guides/(name+'.png')).read_bytes()).hexdigest(),'source':src.name}
scale=2.05/float(np.median(reference));pack={'schema':1,'directions':['S','SE','E','NE','N','NW','W','SW'],'atlases':{},'frames':{k:[[] for _ in range(8)] for k in ['idle','run','attack','roll']}}
for name,e in entries.items():
 zoom=3.0/2.1 if name.startswith(('attack','dodge')) else 1
 worldHeight=e['ch']*scale*zoom/e['scale']
 pack['atlases'][name]={'file':'assets/sprites/warrior/'+name+'.png','width':e['width'],'height':e['height'],'worldHeight':round(worldHeight,6),'sha256':e['sha'],'guideSha256':e['guideSha'],'generatedSource':e['source']}
 clip='roll' if name.startswith('dodge') else name.split('-')[0];start=4 if '-back' in name else 0
 for row in range(4):
  for col in range(4):
   b,g=e['cells'][row*4+col];s=(b[3]-b[1])/(g[3]-g[1]);center=(b[0]+b[2])/2;guideCenter=(g[0]+g[2])/2
   left=max(0,int(b[0])-6);top=max(0,int(b[1])-6);right=min(e['width'],int(b[2])+6);bottom=min(e['height'],int(b[3])+6);fw=right-left;fh=bottom-top
   root=col*e['cw']+e['cw']/2*s+center-col*e['cw']-(guideCenter-col*e['cw'])*s
   pivotX=np.clip((root-left)/fw,.08,.92)
   frame={'atlas':name,'rect':[left,top,fw,fh],'bbox':(b-np.array([left,top,left,top])).tolist(),'pivot':[round(float(pivotX),6),round(float((b[3]-top)/fh),6)],'worldHeight':round(float(fh*scale*zoom/s),6)}
   index=row+(4 if name.endswith('-b') else 0)
   target=pack['frames'][clip][start+col]
   while len(target)<=index:target.append(None)
   target[index]=frame
for k,n in {'idle':4,'run':8,'attack':4,'roll':4}.items():
 if any(len(row)!=n or any(f is None for f in row) for row in pack['frames'][k]):raise ValueError('Incomplete '+k+' animation')
# Blade tips and raised feet change silhouette height without changing body size.
# Keep one pixel-to-world scale per direction through each gait/sword sequence.
# Retain the old guide fit so calibration is auditable and repeatable.
pack['calibration']={'method':'shared-run-attack-pixel-scale-per-direction','clips':['run','attack']}
for direction in range(8):
 row=pack['frames']['run'][direction]
 pixelScale=float(np.median([f['worldHeight']/f['rect'][3] for f in row]))
 for clip in pack['calibration']['clips']:
  for f in pack['frames'][clip][direction]:
   f['guideWorldHeight']=f['worldHeight'];f['worldHeight']=round(pixelScale*f['rect'][3],6)
(ROOT/'assets/sprites/warrior.json').write_text(json.dumps(pack,indent=2)+'\n')
(ROOT/'assets/sprites/LICENSE.txt').write_text('Original artwork generated for Elderfall using OpenAI image generation. No Nox game artwork is included. Pose guides were rendered from the project\'s CC0-derived Luana Coppio character skin and Quaternius animation library; their original attribution remains in assets/characters/LICENSE.txt and assets/animations/LICENSE.txt. Raw generated artwork is imported without repainting.\n')
print('Imported',len(entries),'RGBA atlases,',sum(len(row) for bank in pack['frames'].values() for row in bank),'directional animation frames')

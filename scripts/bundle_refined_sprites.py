"""Import unmodified character atlases and align landmarks to a fixed 3D camera.
22-figure layout: top 3 rows of 5 (idle, 12 gait, two spare guards), bottom 7 sword states.
Only reads pixels for analysis and copies originals; never repaints generated artwork.
"""
import argparse,hashlib,json,shutil,re
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects
from sprite_landmarks import HeadTracker
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--sources',type=Path,required=True);p.add_argument('--guides',type=Path,required=True);p.add_argument('--prototype',action='store_true');a=p.parse_args();sources=json.loads(a.sources.read_text())
if not a.prototype and set(sources)!=set(map(str,range(8))):raise ValueError('All eight directions required')
old=json.loads((ROOT/'assets/sprites/warrior.json').read_text());pack={'schema':2,'refined':True,'directions':old['directions'],'atlases':{},'frames':{k:[[]for _ in range(8)]for k in ['idle','run','attack','roll']}}
for name,atlas in old['atlases'].items():
 if name.startswith('dodge'):pack['atlases'][name]=atlas
pack['frames']['roll']=old['frames']['roll']
def figures(alpha):
 labels,n=label(alpha>32);sizes=np.bincount(labels.ravel());boxes={};main={};h,w=alpha.shape;cols=[5,5,5,7]
 for i,sl in enumerate(find_objects(labels),1):
  if sl is None:continue
  y,x=sl;box=np.array([x.start,y.start,x.stop,y.stop]);boxes[i]=box;yy,xx=np.nonzero(labels[sl]==i);cy=yy.mean()+y.start;cx=xx.mean()+x.start;row=min(3,int(cy*4/h));cell=(row,min(cols[row]-1,int(cx*cols[row]/w)))
  if sizes[i]>300 and (cell not in main or sizes[i]>sizes[main[cell]]):main[cell]=i
 if len(main)!=22:raise ValueError('Expected 22 figures; found '+str(len(main)))
 result={c:boxes[i].copy()for c,i in main.items()};members={c:[i]for c,i in main.items()}
 for i,b in boxes.items():
  if i in main.values():continue
  def distance(c):
   v=boxes[main[c]];return max(v[0]-b[2],b[0]-v[2],0)**2+max(v[1]-b[3],b[1]-v[3],0)**2
  c=min(main,key=distance)
  if 4<=sizes[i]<300 and distance(c)<8**2:
   members[c].append(i);v=result[c];result[c]=np.array([min(v[0],b[0]),min(v[1],b[1]),max(v[2],b[2]),max(v[3],b[3])])
 return result,labels,members
out=ROOT/'assets/sprites/refined';out.mkdir(exist_ok=True)
anchors=json.loads((a.guides/'anchors.json').read_text())
for direction,path in sources.items():
 d=int(direction);src=Path(path);src=src if src.is_absolute()else ROOT/src;image=Image.open(src)
 if image.mode!='RGBA':raise ValueError('Real alpha required')
 rgba=np.array(image);h,w=rgba.shape[:2];bounds,labels,members=figures(rgba[:,:,3]);atlas='direction-'+direction;markers=anchors[atlas]
 # Put all guide head/root coordinates in the upper-row 307px camera frame.
 for m in markers[13:]:
  for name in ['head','root','sole']:m[name][0]+=(307-219)/2
 def feet(b):
  x0,y0,x1,y1=b;im=rgba[y0:y1,x0:x1,:];r,g,blue=[im[:,:,i].astype(float)for i in range(3)];mask=(im[:,:,3]>128)&(r>g*1.23)&(r<g*1.85)&(g>blue*1.18)&(blue<95)&(r>25);mask[:int((y1-y0)*.57)]=False;yy,xx=np.nonzero(mask)
  if not len(yy):raise ValueError('Cannot locate boots '+str((d,b.tolist())))
  return int(yy.max()+y0+1)
 canonical=bounds[0,0];tracker=HeadTracker(rgba,canonical,feet(canonical),markers);matches=[]
 for i in range(20):
  row,col=divmod(i,5)if i<13 else(3,i-13);cols=5 if row<3 else 7;head,scale,confidence=tracker.locate(i,[round(col*w/cols),row*h/4],bounds[row,col],feet(bounds[row,col]));matches.append((head,scale,confidence,row,col))
 referenceSpan=feet(canonical)-tracker.initial[1];guideSpan=markers[0]['sole'][1]-markers[0]['head'][1]
 def body_scale(i):
  head,_,_,row,col=matches[i];return (feet(bounds[row,col])-head[1])/referenceSpan/((markers[i]['sole'][1]-markers[i]['head'][1])/guideSpan)
 scales={'idle':1.0,'run':float(np.median([body_scale(i)for i in range(1,13)])),'attack':float(np.median([body_scale(i)for i in range(14,19)]))}
 target=out/(atlas+'.png')
 if src.resolve()!=target.resolve():shutil.copyfile(src,target)
 pack['atlases'][atlas]={'file':str(target.relative_to(ROOT)),'width':w,'height':h,'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'guideSha256':hashlib.sha256((a.guides/f'direction-{d}.png').read_bytes()).hexdigest(),'generatedSource':old['atlases'].get(atlas,{}).get('generatedSource',src.name)}
 for i,(head,headScale,confidence,row,col)in enumerate(matches):
  b=bounds[row,col];key='idle'if i==0 else'run'if i<=12 else'attack';bankScale=scales[key];origin=head+(np.array(markers[i]['root'])-markers[i]['head'])*tracker.scale*bankScale;rootX,rootY=origin;rootY=feet(b)+(markers[i]['root'][1]-markers[i]['sole'][1])*tracker.scale*bankScale;pixelScale=tracker.pixelScale/bankScale
  x0=max(0,int(b[0])-3);y0=max(0,int(b[1])-3);x1=min(w,int(b[2])+3);y1=min(h,int(b[3])+3)
  if b[0]<1 or b[1]<1 or b[2]>=w or b[3]>=h:raise ValueError('Figure clipped by canvas')
  contour=[]
  for yy in range(y0,y1):
   # Rendering geometry exposes this pose only, even when a neighbouring blade
   # enters its rectangular UV crop. Source RGBA pixels are never rewritten.
   strip=labels[max(y0,yy-1):min(y1,yy+2),x0:x1];_,xx=np.nonzero(np.isin(strip,members[row,col]))
   contour.append([max(0,int(xx.min())-2),min(x1-x0,int(xx.max())+3)]if len(xx)else[0,0])
  frame={'contour':contour,'atlas':atlas,'rect':[x0,y0,x1-x0,y1-y0],'bbox':(b-np.array([x0,y0,x0,y0])).tolist(),'pivot':[round(float((rootX-x0)/(x1-x0)),6),round(float((rootY-y0)/(y1-y0)),6)],'worldHeight':round(pixelScale*(y1-y0),6),'head':(head-np.array([x0,y0])).tolist(),'bootY':feet(b)-y0,'headPixels':int(confidence),'headMethod':'brown-hair-component','headScale':round(headScale,6),'bankScale':round(bankScale,6)};pack['frames'][key][d].append(frame)
 pack['frames']['attack'][d][0]=pack['frames']['idle'][d][0];pack['frames']['attack'][d][6]=pack['frames']['idle'][d][0]
 print('Direction',d,'hair pixels min',min(v[2]for v in matches),'bank scales',scales)
pack['calibration']={'method':'head-landmark-aligned-3d-root','clips':['idle','run','attack'],'guideMarkersSha256':hashlib.sha256((a.guides/'anchors.json').read_bytes()).hexdigest()}
encoded=json.dumps(pack,indent=2)
encoded=re.sub(r'("contour": )\[(?:\s*\[\s*\d+,\s*\d+\s*\],?\s*)*\]',lambda m:m[1]+json.dumps(json.loads(m[0][len(m[1]):]),separators=(',',':')),encoded)
(ROOT/('assets/sprites/refined.json'if a.prototype else'assets/sprites/warrior.json')).write_text(encoded+'\n');print('Imported',len(sources),'directions')

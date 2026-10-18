"""Read original pixels to measure correspondence; never rewrite approved artwork.
Dependency for this optional offline analysis: opencv-python-headless==4.12.0.88.
Only numerical displacements and a source-hash manifest are produced.
"""
import gzip,hashlib,json
from pathlib import Path
import cv2
import numpy as np
from scipy.ndimage import distance_transform_edt
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];pack=json.loads((ROOT/'assets/sprites/warrior.json').read_text())
OUT=ROOT/'assets/sprites/motion';OUT.mkdir(exist_ok=True)
W,H=168,276;GW,GH=56,92;MIN=[-1.4,-1.4];SIZE=[2.8,4.6]
cos=np.hypot(4.8,8.7)/np.hypot(np.hypot(4.8,8.7),14.7)
images={k:np.array(Image.open(ROOT/v['file']).convert('RGBA')) for k,v in pack['atlases'].items()}
x=(np.arange(W)+.5)/W*SIZE[0]+MIN[0];y=(1-(np.arange(H)+.5)/H)*SIZE[1]+MIN[1];xx,yy=np.meshgrid(x,y)
frames=[];lookup={};canvases=[];bladeCanvases=[]
for d in range(8):
 for clip in ['idle','run','attack']:
  for i,f in enumerate(pack['frames'][clip][d]):
   key=f'{d}:{clip}:{i}';lookup[key]=len(frames)
   h=f['worldHeight'];w=h*f['rect'][2]/f['rect'][3]*cos;px,py=f['pivot'];rx,ry,rw,rh=f['rect']
   # Sampling for analysis only; the game continues to use original RGBA atlases.
   u=((xx/w+px)*rw-.5).astype(np.float32);v=((py-(yy-.025)/h)*rh-.5).astype(np.float32)
   source=images[f['atlas']][ry:ry+rh,rx:rx+rw].copy()
   for row,(lo,hi) in enumerate(f['contour']):source[row,:lo]=0;source[row,hi:]=0
   rgba=cv2.remap(source,u,v,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
   # Matte is included in flow input so edges and cape silhouette have a signal.
   rgb=rgba[:,:,:3].astype(np.float32)*rgba[:,:,3:4]/255
   gray=(cv2.cvtColor(rgb.astype(np.uint8),cv2.COLOR_RGB2GRAY)*.7+rgba[:,:,3]*.3).astype(np.uint8)
   canvases.append(gray)
   sword=None;bladeRows=None;bladeMask=None;bodyFillRows=None
   if clip=='attack':
    rgb=source[:,:,:3].astype(float)
    steel=((source[:,:,3]>220)&(rgb.min(2)>55)&((rgb.max(2)-rgb.min(2))<rgb.max(2)*.35)).astype('uint8')*255
    lines=cv2.HoughLinesP(steel,1,np.pi/360,12,minLineLength=23,maxLineGap=6)
    if lines is None:raise ValueError('Missing blade '+key)
    def blade_score(candidate):
     endpoints=candidate.astype(float).reshape(2,2);axis=endpoints[1]-endpoints[0];length=np.linalg.norm(axis);axis/=length;normal=np.array([-axis[1],axis[0]])
     points=endpoints[0]+np.linspace(.05,.95,20)[:,None]*(endpoints[1]-endpoints[0])
     # Sword sides expose background; a bright shoulder or shield rim has
     # opaque character pixels on one or both sides of the supposed shaft.
     def alpha_at(points):
      px=np.rint(points[:,0]).astype(int);py=np.rint(points[:,1]).astype(int);valid=(px>=0)&(px<rw)&(py>=0)&(py<rh);out=np.zeros(len(px));out[valid]=source[py[valid],px[valid],3];return out
     slender=max(np.mean((alpha_at(points+normal*r)<64)&(alpha_at(points-normal*r)<64))for r in [12,18,24])
     return length*(.12+.88*slender)
    line=max(lines[:,0,:],key=blade_score).astype(float).reshape(2,2)
    waist=np.array(f['head'])+np.array([0,(f['bootY']-f['head'][1])*.42])
    if np.linalg.norm(line[0]-waist)>np.linalg.norm(line[1]-waist):line=line[::-1]
    axis=(line[1]-line[0]);axis/=np.linalg.norm(axis);normal=np.array([-axis[1],axis[0]])
    ys,xs=np.nonzero(steel);points=np.stack([xs,ys],axis=1);proj=(points-line[0])@axis;side=(points-line[0])@normal
    keep=(proj>=-2)&(proj<=np.linalg.norm(line[1]-line[0])+3)&(abs(side)<9)
    offset=np.median(side[keep]);line+=normal*offset
    # Follow the actual silver shaft beyond the Hough highlight. A fixed tip
    # extension left an orphaned lower blade in short/foreshortened guards.
    probe=((source[:,:,3]>128)&(rgb.min(2)>55)&((rgb.max(2)-rgb.min(2))<rgb.max(2)*.35))
    sy,sx=np.nonzero(probe);sp=np.stack([sx,sy],axis=1)-line[0]
    longitudinal=sp@axis;lateral=sp@normal
    bins=np.unique(np.floor(longitudinal[(abs(lateral)<10)&(longitudinal>=0)]).astype(int))
    groups=np.split(bins,np.flatnonzero(np.diff(bins)>8)+1)
    midpoint=np.linalg.norm(line[1]-line[0])/2
    shaft=min((g for g in groups if len(g)),key=lambda g:np.min(abs(g-midpoint)))
    line[1]=line[0]+axis*(max(np.linalg.norm(line[1]-line[0]),float(shaft[-1]))+3)
    # Some approved poses show the grip/shaft behind the measured hand. Only
    # trace its thin exposed steel, so armor along the same line is not included.
    candidate=sp[(longitudinal<0)&(abs(lateral)<10)]
    back=0.
    if len(candidate):
     points=candidate+line[0];normalProbe=normal*18
     def transparent(points):
      px=np.rint(points[:,0]).astype(int);py=np.rint(points[:,1]).astype(int);valid=(px>=0)&(px<rw)&(py>=0)&(py<rh);out=np.ones(len(px),dtype=bool);out[valid]=source[py[valid],px[valid],3]<64;return out
     exposed=transparent(points+normalProbe)&transparent(points-normalProbe)
     if exposed.any():
      bins=np.unique(np.floor(-candidate[exposed]@axis).astype(int));groups=np.split(bins,np.flatnonzero(np.diff(bins)>8)+1)
      connected=groups[0]
      if connected[0]<=64:back=min(float(connected[-1])+3,.8*rh/h)
    line[0]-=axis*3;back=max(0,back-3)
    bladeWorld=np.stack([(line[:,0]/rw-px)*w,.025+(py-line[:,1]/rh)*h],axis=1)
    sword={'back':float(back/max(np.linalg.norm(line[1]-line[0]),1)), 'points':bladeWorld.ravel().tolist(),'width':float(max(5,np.percentile(abs(side[keep]-offset),95)+2)*h/rh)}
    by,bx=np.indices((rh,rw));perp=(bx-line[0,0])*normal[0]+(by-line[0,1])*normal[1];along=(bx-line[0,0])*axis[0]+(by-line[0,1])*axis[1]
    silver=(rgb.min(2)>55)&((rgb.max(2)-rgb.min(2))<rgb.max(2)*.35)&(source[:,:,3]>128)
    # Behind the grip, split only exposed steel. Armor crossing the axis must
    # remain with the body even when the hidden shaft passes behind it.
    def outside_at(dx,dy):
     return cv2.remap(source[:,:,3],(bx+dx).astype(np.float32),(by+dy).astype(np.float32),cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT)<64
    exposedBack=outside_at(normal[0]*18,normal[1]*18)&outside_at(-normal[0]*18,-normal[1]*18)
    seed=(silver&(abs(perp)<10)&(along>=-back)&(along<=np.linalg.norm(line[1]-line[0])+2)&((along>=0)|exposedBack)).astype('uint8')
    # Include the dark antialiased outline, not just the silver highlight.
    def padded_mask(size):return cv2.dilate(seed,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(size,size)))&(source[:,:,3]>32)
    bladeMask=padded_mask(7);narrow=padded_mask(5)
    def separated_body(mask):
     body=(source[:,:,3]>32)&~mask.astype(bool)
     restored=body.astype('uint8')
     _,_,stats,_=cv2.connectedComponentsWithStats(restored,8)
     areas=sorted(stats[1:,cv2.CC_STAT_AREA],reverse=True);return sum(areas[1:])
    # A wider outline must not cut through an ankle in a crossing guard.
    if separated_body(bladeMask)>separated_body(narrow)+24:bladeMask=narrow
    bladeRows=[]
    for pixels in bladeMask:
     occupied=np.flatnonzero(pixels);bladeRows.append([int(occupied[0]),int(occupied[-1]+1)]if len(occupied)else[0,0])
    if bladeMask.any():sword['width']=float((np.max(abs(perp[bladeMask.astype(bool)]))+1)*h/rh)
    body=(source[:,:,3]>32)&~bladeMask.astype(bool)
    clean=cv2.morphologyEx(body.astype('uint8'),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(17,17)))
    bridge=clean.astype(bool)&bladeMask.astype(bool)
    _,nearest=distance_transform_edt(~body,return_indices=True)
    bodyFillRows=[]
    for row,pixels in enumerate(bridge):
     occupied=np.flatnonzero(pixels)
     if len(occupied):
      at=int(occupied[len(occupied)//2]);ny,nx=nearest[:,row,at];bodyFillRows.append([int(occupied[0]),int(occupied[-1]+1),int(nx),int(ny)])
     else:bodyFillRows.append([0,0,0,0])


   headWorld=[(f['head'][0]/rw-px)*w,.025+(py-f['head'][1]/rh)*h]
   bladeCanvases.append(cv2.remap(bladeMask,u,v,cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT)if bladeMask is not None else None)
   frames.append({'bodyFillRows':bodyFillRows,'bladeRows':bladeRows,'headWorld':headWorld,'sword':sword,'key':key,'atlas':f['atlas'],'rect':f['rect'],'contour':f['contour'],'transform':[SIZE[0]/w,SIZE[1]/h,MIN[0]/w+px,(MIN[1]-.025)/h+1-py]})
pairs=[];fields=[]
flow=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM);flow.setUseSpatialPropagation(True)
for d in range(8):
 edges=[(f'{d}:run:{i}',f'{d}:run:{(i+1)%12}') for i in range(12)]
 edges += [(f'{d}:attack:{i}',f'{d}:attack:{i+1}')for i in range(6)]
 # Stop/start use corresponding art without changing the character design.
 edges += [(f'{d}:idle:0',f'{d}:run:0')]
 for ka,kb in edges:
  a,b=lookup[ka],lookup[kb];f=flow.calc(canvases[a],canvases[b],None);g=flow.calc(canvases[b],canvases[a],None)
  # The separately rendered weapon must not determine the body's correspondence.
  # Interpolate numerical body displacement from around each occluding blade.
  for field,sourceIndex in [(f,a),(g,b)]:
   if bladeCanvases[sourceIndex] is not None:
    hole=cv2.dilate(bladeCanvases[sourceIndex],cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11))).astype(bool)
    for iteration in range(64):
     neighbors=cv2.blur(field,(3,3));field[hole]=neighbors[hole]
  if frames[a]['sword'] and frames[b]['sword']:
   def constrain(field,source,target):
    start=np.array(source['sword']['points'][:2]);end=np.array(target['sword']['points'][:2]);
    start=(start-np.array(MIN))/np.array(SIZE)*[W,H];end=(end-np.array(MIN))/np.array(SIZE)*[W,H]
    start[1]=H-start[1];end[1]=H-end[1]
    iy,ix=np.indices((H,W));distance=np.hypot(ix-start[0],iy-start[1]);weight=np.clip((12-distance)/6,0,1);weight=weight*weight*(3-2*weight)
    field[:]=field*(1-weight[:,:,None])+(end-start)[None,None,:]*weight[:,:,None]
   constrain(f,frames[a],frames[b]);constrain(g,frames[b],frames[a])
  # Keep the approved face rigid while hands/cape follow their own motion.
  def pin_head(field,source,target):
   start=(np.array(source['headWorld'])-MIN)/SIZE*[W,H];end=(np.array(target['headWorld'])-MIN)/SIZE*[W,H]
   start[1]=H-start[1];end[1]=H-end[1];radius=18.
   if source['sword']:
    hand=(np.array(source['sword']['points'][:2])-MIN)/SIZE*[W,H];hand[1]=H-hand[1];radius=min(radius,np.linalg.norm(hand-start)*.8)
   iy,ix=np.indices((H,W));distance=np.hypot(ix-start[0],iy-start[1]);weight=np.clip((radius-distance)/max(radius*.4,1),0,1);weight=weight*weight*(3-2*weight)
   field[:]=field*(1-weight[:,:,None])+(end-start)[None,None,:]*weight[:,:,None]
  pin_head(f,frames[a],frames[b]);pin_head(g,frames[b],frames[a])
  field=np.concatenate([cv2.resize(f,(GW,GH)),cv2.resize(g,(GW,GH))],axis=2)
  field[:,:,[0,2]]/=W;field[:,:,[1,3]]/=-H
  # Enforce both anchors on the actual exported grid, after downsampling.
  # Otherwise a narrow head/hand region can miss its constraint by several pixels.
  def anchor_grid(source,target,component):
   anchors=[(source['headWorld'],target['headWorld'],4.)]
   if source['sword'] and target['sword']:anchors.append((source['sword']['points'][:2],target['sword']['points'][:2],2.2))
   iy,ix=np.indices((GH,GW));points=[];weights=[];targets=[]
   def sample(array,point):
    x,y=point;x=np.clip(x,0,GW-1);y=np.clip(y,0,GH-1);lx=int(x);ly=int(y);fx=x-lx;fy=y-ly
    return (array[ly,lx]*(1-fx)+array[ly,min(lx+1,GW-1)]*fx)*(1-fy)+(array[min(ly+1,GH-1),lx]*(1-fx)+array[min(ly+1,GH-1),min(lx+1,GW-1)]*fx)*fy
   for start,end,radius in anchors:
    uv=(np.array(start)-MIN)/SIZE;point=[uv[0]*GW-.5,(1-uv[1])*GH-.5];points.append(point)
    weights.append(np.exp(-((ix-point[0])**2+(iy-point[1])**2)/radius**2));targets.append((np.array(end)-start)/SIZE-sample(field[:,:,component:component+2],point))
   matrix=np.array([[sample(weight,point)for weight in weights]for point in points]);coeff=np.linalg.solve(matrix,np.array(targets))
   for weight,c in zip(weights,coeff):field[:,:,component:component+2]+=weight[:,:,None]*c
  anchor_grid(frames[a],frames[b],0);anchor_grid(frames[b],frames[a],2)
  fields.append(np.round(np.clip(field,-.999,.999)*32767).astype('<i2'))
  pairs.append({'a':a,'b':b})
 print('measured original-art direction',d,flush=True)
data=np.stack(fields).tobytes();compressed=gzip.compress(data,mtime=0);(OUT/'flow.bin.gz').write_bytes(compressed)
manifest={'schema':1,'generator':'OpenCV DIS medium, original artwork unchanged','grid':[GW,GH],'min':MIN,'size':SIZE,'pairs':pairs,'frames':frames,'flowSha256':hashlib.sha256(compressed).hexdigest(),'sources':{a['file']:a['sha256']for a in pack['atlases'].values()}}
(OUT/'flow.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n');print(len(pairs),'pairs',len(compressed),'bytes',flush=True)

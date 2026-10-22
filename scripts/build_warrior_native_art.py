"""Copy unmodified generated atlases and derive numerical motion fields, not painted pixels."""
import argparse,gzip,hashlib,json,shutil
from pathlib import Path
import cv2,numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/sprites/native-motion';OUT.mkdir(parents=True,exist_ok=True)
p=argparse.ArgumentParser();p.add_argument('--walk',type=Path,required=True);p.add_argument('--attack',type=Path,required=True);args=p.parse_args()
guides=json.loads((ROOT/'docs/warrior-native-motion/guides.json').read_text());clips={};fields=[];grid=128
for index,(key,source,clipname) in enumerate([('walk',args.walk,'Walk_Loop'),('attack',args.attack,'Sword_Attack')]):
 target=OUT/(key+'.png');shutil.copyfile(source,target);im=np.asarray(Image.open(target).convert('RGBA'));h,w=im.shape[:2]
 assert (w,h)==(1536,1024),(w,h)
 assert np.mean(im[:,:,3]==0)>.35,'Generated atlas lacks transparent background'
 cells=[im[y*256:(y+1)*256,x*256:(x+1)*256]for y in range(4)for x in range(6)]
 analysis=[];contours=[]
 for cell in cells:
  assert np.count_nonzero(cell[:,:,3]>128)>2000,'Missing character in cell'
  # A neighboring sword tip can cross an atlas cell boundary. Keep the main
  # connected silhouette in numerical render masks; never repaint the PNG.
  n,labels,stats,_=cv2.connectedComponentsWithStats((cell[:,:,3]>16).astype('uint8'),8)
  main=1+int(np.argmax(stats[1:,cv2.CC_STAT_AREA]));keep=labels==main;limits=[]
  for row in keep:
   xs=np.flatnonzero(row);limits.append([max(0,int(xs[0])-1),min(256,int(xs[-1])+2)]if len(xs)else[0,0])
  contours.append(limits)
  gray=cv2.cvtColor(cell[:,:,:3],cv2.COLOR_RGB2GRAY).astype(float);a=cell[:,:,3]/255*keep
  gray=(gray*.7+65)*a;analysis.append(cv2.resize(gray.astype('uint8'),(grid,grid)))
 dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM);dis.setUseSpatialPropagation(True)
 maxima=[]
 for i in range(24):
  a,b=analysis[i],analysis[(i+1)%24];f=dis.calc(a,b,None)/grid;r=dis.calc(b,a,None)/grid
  field=np.concatenate([f,r],axis=2);maxima.append(float(np.max(np.abs(field))));fields.append((np.clip(field,-.5,.5)*65534).round().astype('<i2'))
 native=next(c for c in guides['clips']if c['clip']==clipname)
 clips[key]={'file':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceClip':clipname,'duration':native['duration'],'frames':24,'columns':6,'rows':4,'cell':[256,256],'flowOffset':index*24,'displayScale':.55,'generatedSource':source.name,'maxPairDisplacements':maxima,'transparentFraction':float(np.mean(im[:,:,3]==0)),'contours':contours}
flowpath=OUT/'flow.bin.gz'
with gzip.GzipFile(filename=str(flowpath),mode='wb',mtime=0)as f:f.write(np.stack(fields).tobytes())
manifest={'schema':1,'method':'New illustrated frames based on native poses. Numerical bidirectional optical flow between adjacent authored frames. Not a 3D skin or exact skeletal binding.','appearanceReference':'assets/sprites/refined/direction-0.png','appearanceSha256':hashlib.sha256((ROOT/'assets/sprites/refined/direction-0.png').read_bytes()).hexdigest(),'guideFile':'docs/warrior-native-motion/guides.json','guideSha256':hashlib.sha256((ROOT/'docs/warrior-native-motion/guides.json').read_bytes()).hexdigest(),'clips':clips,'flow':{'file':flowpath.name,'sha256':hashlib.sha256(flowpath.read_bytes()).hexdigest(),'grid':[grid,grid],'columns':6,'rows':8,'pairs':48,'format':'little-endian int16, normalized image displacement times 65534, forward xy + backward xy'}}
manifest['revision']=2
manifest['rendering']={'walk':'continuous native-joint-driven illustrated leg segments; upper body from fixed approved preview frame','attack':'illustrated body with independently rendered persistent left-forearm shield','equipment':'parts.json'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'LICENSE.txt').write_text('Original illustrated motion artwork generated for Elderfall using OpenAI image generation, based on the existing approved warrior appearance. The source PNG atlases are copied without repainting. Pose references use Quaternius Universal Animation Library, CC0; original license at assets/animation-resources/quaternius/LICENSE. No Nox artwork is included. Numerical motion fields measure correspondences in these new illustrations. These are 2D concept frames, not a replacement rigged 3D character.\n')
print('Built original illustrated atlases + 48 numerical motion fields:',flowpath.stat().st_size,'bytes')

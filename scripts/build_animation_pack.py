"""Retarget selected CC0 Quaternius clips to Elderfall's original rigid armour rig.
Usage: python scripts/build_animation_pack.py --source /path/to/downloaded/glTF
Requires numpy/scipy only for this offline conversion; the game needs neither.
"""
import argparse,hashlib,json,shutil
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R,Slerp
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);args=parser.parse_args()
src=args.source
expected={
 'AnimationLibrary_Godot_Standard.gltf':'0ff075c7ad6855c5c2c37a171592ee8f0d6ab2f58259e2be77a9b63dd8027765',
 'AnimationLibrary_Godot_Standard.bin':'6e65377d81558333c4093dbb144a48fd19019343d82b1a3a7992a98ec0e0543c',
 'LICENSE':'a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499'}
for name,sha in expected.items():
 if hashlib.sha256((src/name).read_bytes()).hexdigest()!=sha:raise SystemExit('Pinned animation source checksum mismatch: '+name)
j=json.loads((src/'AnimationLibrary_Godot_Standard.gltf').read_text());binary=(src/'AnimationLibrary_Godot_Standard.bin').read_bytes()
nodes=j['nodes'];parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])};names={n.get('name'):i for i,n in enumerate(nodes)}
def access(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
 assert a['componentType']==5126 and not v.get('byteStride')
 return np.frombuffer(binary,dtype='<f4',count=a['count']*size,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,size).astype(float)
animations={a['name']:a for a in j['animations']}
def channels(name):
 a=animations[name];out=[]
 for c in a['channels']:
  sampler=a['samplers'][c['sampler']];assert sampler.get('interpolation','LINEAR') in ('LINEAR','STEP')
  times=access(sampler['input'])[:,0];values=access(sampler['output']);path=c['target']['path']
  out.append((c['target']['node'],path,times,values,Slerp(times,R.from_quat(values)) if path=='rotation' else None,sampler.get('interpolation','LINEAR')))
 return out
cached={n:channels(n) for n in animations}
def pose(name,t):
 pos=[np.array(n.get('translation',[0,0,0.]),float) for n in nodes];rot=[R.from_quat(n.get('rotation',[0,0,0,1])) for n in nodes]
 for i,path,times,values,slerp,interp in cached[name]:
  t0=np.clip(t,times[0],times[-1])
  if interp=='STEP':
   v=values[max(0,np.searchsorted(times,t0,side='right')-1)]
   if path=='rotation':rot[i]=R.from_quat(v)
   elif path=='translation':pos[i]=v.copy()
  elif path=='rotation':rot[i]=slerp(t0)
  elif path=='translation':pos[i]=np.array([np.interp(t0,times,values[:,k]) for k in range(3)])
 worlds={}
 def world(i):
  if i in worlds:return worlds[i]
  p,q=pos[i],rot[i]
  if i in parents:pp,pq=world(parents[i]);p,q=pp+pq.apply(p),pq*q
  worlds[i]=(p,q);return p,q
 for i in range(len(nodes)):world(i)
 return worlds
# Source right is -X. Reflect X so the existing weapon at +X retains its hand.
mirror=np.diag([-1,1,1])
def reflected(q):return R.from_matrix(mirror@q.as_matrix()@mirror)
# name, source, parent, target T-pose world rotation.
I=R.identity();left=R.from_euler('z',-np.pi/2);right=R.from_euler('z',np.pi/2)
rig=[('pelvis','DEF-hips',None,I),('chest','DEF-spine.003','pelvis',I),('head','DEF-head','chest',I)]
for side,suffix,tpose in [('left','L',left),('right','R',right)]:
 rig += [(side+'Shoulder','DEF-upper_arm.'+suffix,'chest',tpose),(side+'Elbow','DEF-forearm.'+suffix,side+'Shoulder',tpose),(side+'Hand','DEF-hand.'+suffix,side+'Elbow',tpose),(side+'Hip','DEF-thigh.'+suffix,'pelvis',I),(side+'Knee','DEF-shin.'+suffix,side+'Hip',I),(side+'Ankle','DEF-foot.'+suffix,side+'Knee',I)]
reference=pose('A_TPose',0);refhip=reference[names['DEF-hips']][0]
selected={'idle':('Sword_Idle',0,None),'run':('Jog_Fwd_Loop',0,None),'walk':('Walk_Loop',0,None),'attack':('Sword_Attack',0,None),'roll':('Roll',0,None),'hurt':('Hit_Chest',0,None),'dead':('Death01',0,None)}
pack={'schema':1,'sampleRate':60,'joints':[x[0] for x in rig],'clips':{}}
for dest,(name,start,end) in selected.items():
 duration=max(c[2][-1] for c in cached[name]);end=duration if end is None else end
 times=np.linspace(start,end,round((end-start)*60)+1);frames=[]
 for time in times:
  world=pose(name,time);desired={}
  for key,source,parent,tpose in rig:
   desired[key]=reflected(world[names[source]][1])*reflected(reference[names[source]][1]).inv()*tpose
  quats=[]
  for key,source,parent,tpose in rig:
   q=((desired[parent].inv()*desired[key]) if parent else desired[key]).as_quat()
   quats.extend(np.round(q,6).tolist())
  hip=world[names['DEF-hips']][0];root=world[names['root']][0]
  # Physics owns horizontal root motion. Retain authored pelvic sway and vertical motion.
  position=[-(hip[0]-root[0]-refhip[0]),.96+(hip[1]-refhip[1]),hip[2]-root[2]-refhip[2]]
  frames.append([*np.round(position,6).tolist(),*quats])
 pack['clips'][dest]={'source':name,'duration':round(float(end-start),6),'frames':frames}
 print(dest,name,round(float(end-start),3),len(frames),flush=True)
out=ROOT/'assets/animations';out.mkdir(exist_ok=True,parents=True)
(out/'knight-motion.json').write_text(json.dumps(pack,separators=(',',':'))+'\n')
shutil.copyfile(src/'LICENSE',out/'LICENSE.txt')
manifest={'author':'Quaternius','license':'CC0-1.0','original':'https://quaternius.itch.io/universal-animation-library','mirror':'https://github.com/J-Ponzo/gltf-universal-animation-library','commit':'e24c23cf2a1323488a3faa226ea7ea21f644b73e','sourceSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'AnimationLibrary_Godot_Standard.gltf',src/'AnimationLibrary_Godot_Standard.bin',src/'LICENSE']},'generatedSha256':hashlib.sha256((out/'knight-motion.json').read_bytes()).hexdigest(),'conversion':'scripts/build_animation_pack.py; mirrored X, T-pose world-space retarget to original armour joints, 60Hz sampling; horizontal root travel excluded'}
(out/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')

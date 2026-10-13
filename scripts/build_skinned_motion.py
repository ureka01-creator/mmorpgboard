"""Retarget selected CC0 Quaternius clips to Elderfall's complete skinned rig.
Usage: python scripts/build_skinned_motion.py --source /path/to/downloaded/glTF
Requires numpy/scipy only for this offline conversion; the game needs neither.
"""
import argparse,hashlib,json,shutil
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R,Slerp
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);parser.add_argument('--model',type=Path,default=ROOT/'assets/characters/sentinel.glb');args=parser.parse_args()
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

# Bind to the complete 53-bone skin, keeping every source joint and the target rest axes.
import struct
raw=args.model.read_bytes();length=struct.unpack_from('<I',raw,12)[0];target=json.loads(raw[20:20+length]);tn=target['nodes'];tp={c:i for i,n in enumerate(tn) for c in n.get('children',[])}
def target_world(i):
 n=tn[i];p=np.array(n.get('translation',[0,0,0.]),float);q=R.from_quat(n.get('rotation',[0,0,0,1]))
 if i in tp:pp,pq=target_world(tp[i]);return pp+pq.apply(p),pq*q
 return p,q
joint_indices=target['skins'][0]['joints'];keys=[tn[i]['name'] for i in joint_indices];key_index={n:i for i,n in enumerate(keys)}
ref=pose('A_TPose',0);rest={tn[i]['name']:target_world(i) for i in joint_indices};refhip=ref[names['DEF-hips']][0];hiprest=rest['DEF-hips'][0];heightScale=hiprest[1]/refhip[1]
parentnames={tn[i]['name']:tn[tp[i]]['name'] if i in tp and tn[tp[i]].get('name') in key_index else None for i in joint_indices}
selected={'idle':'Idle_Loop','carry':'Sword_Idle','walk':'Walk_Loop','run':'Jog_Fwd_Loop','attack':'Sword_Attack','roll':'Roll','hurt':'Hit_Chest','dead':'Death01'}
pack={'schema':2,'sampleRate':60,'joints':keys,'root':'root','hips':'DEF-hips','clips':{}}
for key,name in selected.items():
 duration=max(c[2][-1] for c in cached[name]);times=np.linspace(0,duration,round(duration*60)+1);frames=[];footpos=[]
 for t in times:
  world=pose(name,t);desired={n:world[names[n]][1]*ref[names[n]][1].inv()*rest[n][1] for n in keys};quats=[]
  for n in keys:
   p=parentnames[n];q=(desired[p].inv()*desired[n] if p else desired[n]).as_quat();quats.extend(np.round(q,6).tolist())
  hip=world[names['DEF-hips']][0];rootpos=world[names['root']][0]
  desiredHip=hiprest+np.array([hip[0]-rootpos[0]-refhip[0],(hip[1]-refhip[1])*heightScale,hip[2]-rootpos[2]-refhip[2]])
  # Root and hips are an exact transform pair: set local hips after removing root rotation.
  position=desired['root'].inv().apply(desiredHip)
  frames.append([*np.round(position,6).tolist(),*quats]);footpos.append(world[names['DEF-foot.R']][0])
 footpos=np.array(footpos);phase=float(np.argmin(footpos[:,1])/(len(footpos)-1))
 pack['clips'][key]={'source':name,'duration':round(float(duration),6),'contactPhase':round(phase,6),'frames':frames}
 print(key,name,'frames',len(frames),'contact',round(phase,3),flush=True)
out=ROOT/'assets/animations';(out/'fullplate-motion.json').write_text(json.dumps(pack,separators=(',',':'))+'\n')
manifest={'author':'Quaternius','license':'CC0-1.0','original':'https://quaternius.itch.io/universal-animation-library','mirror':'https://github.com/J-Ponzo/gltf-universal-animation-library','commit':'e24c23cf2a1323488a3faa226ea7ea21f644b73e','sourceSha256':expected,'modelSha256':hashlib.sha256(raw).hexdigest(),'generatedSha256':hashlib.sha256((out/'fullplate-motion.json').read_bytes()).hexdigest(),'conversion':'scripts/build_skinned_motion.py; full 53-bone world-space T-pose retarget to matched skin bind; authored vertical hips, no horizontal root travel; shared right-foot phase markers'}
(out/'skinned-sources.json').write_text(json.dumps(manifest,indent=2)+'\n')

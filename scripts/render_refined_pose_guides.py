"""Render CC0 skinned pose guides; output is not final sprite artwork."""
import sys,base64,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from verify_arena_browser import ARGS,load
from playwright.sync_api import sync_playwright
out=ROOT/'docs/pose-guides-v2.8';out.mkdir(exist_ok=True,parents=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);p=b.new_page();load(p);p.click('#pause')
 data=p.evaluate('''async()=>{
 const THREE=await import('three'),{loadMotionPack}=await import('./arena-clips.mjs?v=2.5'),{createActor,animateActor,footPoint}=await import('./arena-actors.mjs?v=2.5'),{sampleClip}=await import('./arena-clips.mjs?v=2.5');
 const assets=await loadMotionPack(),s=new THREE.Scene(),a=createActor(s,true,assets);a.group.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshStandardMaterial({color:0xd3d5d6,roughness:.9,metalness:0});});
 s.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,5,4);s.add(light);
 const neutralLower=[...a.lower].map(n=>[a.bones[n],a.bones[n].quaternion.clone()]),neutralHip=a.pelvis.quaternion.clone();const r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(307,256);r.setClearColor(0x152029,1);
 const c=new THREE.OrthographicCamera(-2.16,2.16,1.8,-1.8,.1,40);c.position.set(0,12,8.4);c.lookAt(0,1.4,0);c.updateMatrixWorld();
 const result={},markers={},canvases={},contexts={};for(let d=0;d<8;d++){const key='direction-'+d,canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;canvases[key]=canvas;contexts[key]=canvas.getContext('2d');}
 let neutralPose,neutralPosition,neutralGround,neutralFeet,neutralFloor;
 function armPose(arm,goal,pole){const h=arm.shoulder.getWorldPosition(new THREE.Vector3()),k=arm.elbow.getWorldPosition(new THREE.Vector3()),f=arm.hand.getWorldPosition(new THREE.Vector3()),l1=h.distanceTo(k),l2=k.distanceTo(f),v=goal.clone().sub(h),d=Math.min(l1+l2-.001,v.length());v.normalize();const bend=pole.clone().addScaledVector(v,-pole.dot(v)).normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),rise=Math.sqrt(Math.max(0,l1*l1-along*along)),mid=h.clone().addScaledVector(v,along).addScaledVector(bend,rise),q=new THREE.Quaternion().setFromUnitVectors(k.clone().sub(h).normalize(),mid.clone().sub(h).normalize()).multiply(arm.shoulder.getWorldQuaternion(new THREE.Quaternion()));arm.shoulder.quaternion.copy(arm.shoulder.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));arm.shoulder.updateWorldMatrix(false,true);const ek=arm.elbow.getWorldPosition(new THREE.Vector3()),ef=arm.hand.getWorldPosition(new THREE.Vector3());q.setFromUnitVectors(ef.sub(ek).normalize(),goal.clone().sub(ek).normalize()).multiply(arm.elbow.getWorldQuaternion(new THREE.Quaternion()));arm.elbow.quaternion.copy(arm.elbow.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));arm.elbow.updateWorldMatrix(false,true);}
 function aimBlade(dir,v){const hand=a.arms[1].hand,current=new THREE.Vector3(0,0,1).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())),desired=new THREE.Vector3(...v).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),dir*Math.PI/4),q=new THREE.Quaternion().setFromUnitVectors(current,desired).multiply(hand.getWorldQuaternion(new THREE.Quaternion()));hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));}
 function shot(key,dir,row){
  const tileW=row<13?307:219;r.setSize(tileW,256);c.left=-2.1*tileW/256;c.right=2.1*tileW/256;c.top=2.1;c.bottom=-2.1;c.updateProjectionMatrix();
  a.group.position.x=a.group.position.z=0;
  if(row===0){for(const[bone,q]of neutralLower)bone.quaternion.copy(q);a.pelvis.quaternion.copy(neutralHip);}
  if(row>=13){a.clipRig.joints.forEach((j,i)=>j.quaternion.copy(neutralPose[i]));a.pelvis.position.copy(neutralPosition);a.group.position.y=neutralGround;}
  a.group.updateMatrixWorld(true);
  const axis=new THREE.Vector3(0,1,0),angle=dir*Math.PI/4;
  if(row<=12||row>=13){
   if(row>=13){const stage=row-13,sink=[0,.01,.025,.055,.075,.04,0][stage];a.pelvis.position.y-=sink;a.group.updateMatrixWorld(true);for(let n=0;n<2;n++){const leg=a.legs[n],f=neutralFeet[n],forward=[0,.03,.10,.20,.30,.18,0][stage]*(n===1?1:-.8),goal=f.p.clone().add(new THREE.Vector3(0,0,forward).applyAxisAngle(axis,angle));armPose({shoulder:leg.hip,elbow:leg.knee,hand:leg.ankle},goal,new THREE.Vector3(0,0,1).applyAxisAngle(axis,angle));leg.ankle.quaternion.copy(leg.ankle.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(f.q));leg.ankle.updateWorldMatrix(false,true);}const twist=[0,-.07,-.14,-.07,0,.14,0][row-13],spine=a.bones['DEF-spine.001'],q=new THREE.Quaternion().setFromAxisAngle(axis,twist).multiply(spine.getWorldQuaternion(new THREE.Quaternion()));spine.quaternion.copy(spine.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));spine.updateWorldMatrix(false,true);}
   for(let n=0;n<2;n++){
    const arm=a.arms[n],side=n===0?1:-1,h=arm.shoulder.getWorldPosition(new THREE.Vector3());let point=[side*.36,n===0?-.33:-.42,.23];
    if(n===1&&row>=13)point=[[-.36,-.42,.23],[-.46,-.08,.03],[-.42,.03,-.08],[-.32,-.06,.16],[-.08,-.26,.52],[.25,-.40,.38],[-.36,-.42,.23]][row-13];
    const goal=new THREE.Vector3(point[0],0,point[2]).applyAxisAngle(axis,angle);goal.y=h.y+point[1];armPose(arm,goal,new THREE.Vector3(side,0,-.2).applyAxisAngle(axis,angle));
   }
   const blade=row>=13?[[0,-.12,1],[-.70,.40,-.25],[-.65,.40,-.25],[-.40,.22,.75],[-.35,-.25,.95],[.8,-.30,.55],[0,-.12,1]][row-13]:[0,-.12,1];aimBlade(dir,blade);
  }
  a.group.updateMatrixWorld(true);for(const skin of a.skins)skin.skeleton.update();
  if(row===0){neutralPose=a.clipRig.joints.map(j=>j.quaternion.clone());neutralPosition=a.pelvis.position.clone();neutralFloor=Math.min(footPoint(a,0).y,footPoint(a,1).y);neutralGround=a.group.position.y;neutralFeet=a.legs.map(l=>({p:l.ankle.getWorldPosition(new THREE.Vector3()),q:l.ankle.getWorldQuaternion(new THREE.Quaternion())}));}
  function projected(v){const p=v.clone().project(c);return[(p.x*.5+.5)*tileW,(-p.y*.5+.5)*256];}
  const head=a.head.localToWorld(new THREE.Vector3(0,.12,0)),root=new THREE.Vector3(0,row===0||row>=13?neutralFloor:.02,0);let sole=null;
  for(const vertices of a.footVertices)for(const[skin,i]of vertices){const v=new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i);skin.applyBoneTransform(i,v);skin.localToWorld(v);const p=projected(v);if(!sole||p[1]>sole[1])sole=p;}
  (markers[key]??=[])[row]={head:projected(head),root:projected(root),sole};
  a.trail.visible=false;r.render(s,c);const col=row<13?row%5:row-13,cols=row<13?5:7,y=row<13?Math.floor(row/5)*256:768;contexts[key].drawImage(r.domElement,Math.round(col*1536/cols),y);
  if(row===0)for(const copy of [3,4])contexts[key].drawImage(r.domElement,Math.round(copy*1536/5),512);
 }
 for(let dir=0;dir<8;dir++){
  const yaw=dir*Math.PI/4,key='direction-'+dir,body={x:0,z:0,yaw,mode:'idle',elapsed:0,travel:0};let time=0;animateActor(a,body,0);shot(key,dir,0);
  const saved=new Set();for(let i=1;i<=1600&&saved.size<12;i++){time+=1/240;body.mode='walk';body.x+=Math.sin(yaw)*3.3/240;body.z+=Math.cos(yaw)*3.3/240;body.travel+=3.3/240;body.elapsed+=1/240;animateActor(a,body,time);if(i<360)continue;const phase=(a.motion.phase%1+1)%1;for(let n=0;n<12;n++){const error=Math.min(Math.abs(phase-n/12),1-Math.abs(phase-n/12));if(error<.004&&!saved.has(n)){shot(key,dir,n+1);saved.add(n);}}}
  if(saved.size!==12)throw Error('Missing run phase '+dir);
  const pose={x:0,z:0,yaw,mode:'idle',elapsed:0,travel:0};animateActor(a,pose,0);pose.mode='attack';let t=0;
  for(const [n,sample]of [0,.09,.18,.23,.26,.34,.65].entries()){while(t<sample-.001){t+=1/240;pose.elapsed=t;animateActor(a,pose,t);}shot(key,dir,n+13);}
 }
 for(const [key,canvas] of Object.entries(canvases))result[key]=canvas.toDataURL('image/png');result.__markers=markers;r.dispose();return result;
}''')
 for name,png in data.items():
  if name=='__markers':(out/'anchors.json').write_text(json.dumps(png,indent=2)+'\n')
  else:(out/(name+'.png')).write_bytes(base64.b64decode(png.split(',',1)[1]))
 b.close();print('Saved eight pose sheets and landmark metadata to',out,flush=True)

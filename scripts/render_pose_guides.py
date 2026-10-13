"""Render CC0 skinned pose guides; output is not final sprite artwork."""
import sys,base64,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from verify_arena_browser import ARGS,load
from playwright.sync_api import sync_playwright
out=ROOT/'docs/pose-guides';out.mkdir(exist_ok=True,parents=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);p=b.new_page();load(p);p.click('#pause')
 data=p.evaluate('''async()=>{
 const THREE=await import('three'),{loadMotionPack}=await import('./arena-clips.mjs?v=2.5'),{createActor,animateActor}=await import('./arena-actors.mjs?v=2.5'),{sampleClip}=await import('./arena-clips.mjs?v=2.5');
 const assets=await loadMotionPack(),s=new THREE.Scene(),a=createActor(s,true,assets);a.group.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshStandardMaterial({color:0xd3d5d6,roughness:.9,metalness:0});});
 s.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,5,4);s.add(light);
 const r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(384,256);r.setClearColor(0,0);
 const c=new THREE.OrthographicCamera(-1.575,1.575,1.05,-1.05,.1,40);c.position.set(0,12,8.4);c.lookAt(0,.85,0);c.updateMatrixWorld();
 const result={},canvases={},contexts={};for(const key of ['idle-front','idle-back','run-front-a','run-front-b','run-back-a','run-back-b','attack-front','attack-back','dodge-front','dodge-back']){const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;canvases[key]=canvas;contexts[key]=canvas.getContext('2d');}
 function armPose(arm,goal,pole){const h=arm.shoulder.getWorldPosition(new THREE.Vector3()),k=arm.elbow.getWorldPosition(new THREE.Vector3()),f=arm.hand.getWorldPosition(new THREE.Vector3()),l1=h.distanceTo(k),l2=k.distanceTo(f),v=goal.clone().sub(h),d=Math.min(l1+l2-.001,v.length());v.normalize();const bend=pole.clone().addScaledVector(v,-pole.dot(v)).normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),rise=Math.sqrt(Math.max(0,l1*l1-along*along)),mid=h.clone().addScaledVector(v,along).addScaledVector(bend,rise),q=new THREE.Quaternion().setFromUnitVectors(k.clone().sub(h).normalize(),mid.clone().sub(h).normalize()).multiply(arm.shoulder.getWorldQuaternion(new THREE.Quaternion()));arm.shoulder.quaternion.copy(arm.shoulder.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));arm.shoulder.updateWorldMatrix(false,true);const ek=arm.elbow.getWorldPosition(new THREE.Vector3()),ef=arm.hand.getWorldPosition(new THREE.Vector3());q.setFromUnitVectors(ef.sub(ek).normalize(),goal.clone().sub(ek).normalize()).multiply(arm.elbow.getWorldQuaternion(new THREE.Quaternion()));arm.elbow.quaternion.copy(arm.elbow.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));arm.elbow.updateWorldMatrix(false,true);}
 function shot(key,dir,row){a.group.position.x=a.group.position.z=0;a.group.updateMatrixWorld(true);if(key.startsWith('run')||key.startsWith('idle')){const axis=new THREE.Vector3(0,1,0),angle=dir*Math.PI/4;for(let n=0;n<2;n++){const arm=a.arms[n],side=n===0?1:-1,h=arm.shoulder.getWorldPosition(new THREE.Vector3()),goal=new THREE.Vector3(side*.36,0,.23).applyAxisAngle(axis,angle);goal.y=h.y-(n===0?.33:.42);armPose(arm,goal,new THREE.Vector3(side,0,-.2).applyAxisAngle(axis,angle));}const hand=a.arms[1].hand,current=new THREE.Vector3(0,0,1).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())),desired=new THREE.Vector3(0,-.12,1).normalize().applyAxisAngle(axis,angle),q=new THREE.Quaternion().setFromUnitVectors(current,desired).multiply(hand.getWorldQuaternion(new THREE.Quaternion()));hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));a.group.updateMatrixWorld(true);for(const skin of a.skins)skin.skeleton.update();}a.trail.visible=false;r.render(s,c);contexts[key].drawImage(r.domElement,(dir%4)*384,row*256);}
 for(let dir=0;dir<8;dir++){
  const yaw=dir*Math.PI/4,body={x:0,z:0,yaw,mode:'idle',elapsed:0,travel:0},side=dir<4?'front':'back';let time=0;animateActor(a,body,0);
  for(let i=1;i<=200;i++){time=i/120;body.elapsed=time;animateActor(a,body,time);if([1,50,100,150].includes(i))shot('idle-'+side,dir,[1,50,100,150].indexOf(i));}
  const saved=new Set();for(let i=1;i<=500&&saved.size<8;i++){time+=1/120;body.mode='walk';body.x+=Math.sin(yaw)*3.3/120;body.z+=Math.cos(yaw)*3.3/120;body.travel+=3.3/120;body.elapsed+=1/120;animateActor(a,body,time);if(i<180)continue;const phase=(a.motion.phase%1+1)%1;for(let n=0;n<8;n++){const error=Math.min(Math.abs(phase-n/8),1-Math.abs(phase-n/8));if(error<.007&&!saved.has(n)){shot('run-'+side+(n<4?'-a':'-b'),dir,n%4);saved.add(n);}}}
  if(saved.size!==8)throw Error('Missing run phase '+dir);
  for(const mode of ['attack','dodge']){
   const pose={x:0,z:0,yaw,mode,elapsed:0,travel:0};animateActor(a,pose,0);let t=0;const samples=mode==='attack'?[0,.17,.26,.47]:[0,.10,.21,.33];
   const zoom=3.0;c.left=-zoom*1.5/2;c.right=zoom*1.5/2;c.top=zoom/2;c.bottom=-zoom/2;c.updateProjectionMatrix();
   for(let n=0;n<samples.length;n++){while(t<samples[n]-.001){t+=1/120;pose.elapsed=t;animateActor(a,pose,t);}shot(mode+'-'+side,dir,n);}
   c.left=-1.575;c.right=1.575;c.top=1.05;c.bottom=-1.05;c.updateProjectionMatrix();
  }
 }
 for(const [key,canvas] of Object.entries(canvases))result[key]=canvas.toDataURL('image/png');r.dispose();return result;
}''')
 for name,png in data.items():(out/(name+'.png')).write_bytes(base64.b64decode(png.split(',',1)[1]))
 b.close();print('Saved',len(data),'pose sheets to',out,flush=True)

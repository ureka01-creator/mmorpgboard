"""Render 24 unmodified native poses per clip for illustrated motion authoring."""
import base64, hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/warrior-native-motion';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 p=b.new_page(viewport={'width':1024,'height':768})
 p.goto(os.environ.get('ARENA_BASE','http://127.0.0.1:8044/')+'motion-resources.html',wait_until='networkidle')
 p.wait_for_function('window.motionResources?.cards.length===4',timeout=60000)
 data=p.evaluate('''async()=>{
 const T=await import('three');requestAnimationFrame=()=>0;motionResources.setTime(0);
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(256,256);renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
 const result=[];
 for(const index of [0,2]){
  const c=motionResources.cards[index],scene=new T.Scene();scene.add(c.model.parent);scene.add(new T.HemisphereLight(0xffffff,0x888888,2));const l=new T.DirectionalLight(0xffffff,3);l.position.set(-3,6,4);scene.add(l);
  const camera=new T.OrthographicCamera(-1.7,1.7,1.7,-1.7,.01,40);camera.position.set(0,12,8.4);camera.lookAt(0,.9,0);camera.updateMatrixWorld();
  const sheet=document.createElement('canvas');sheet.width=1536;sheet.height=1024;const ctx=sheet.getContext('2d');ctx.fillStyle='#293238';ctx.fillRect(0,0,1536,1024);const samples=[];
  for(let i=0;i<24;i++){
   const t=c.duration*i/24;c.action.reset().setLoop(T.LoopRepeat,Infinity).play();c.mixer.setTime(t);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,i%6*256,Math.floor(i/6)*256);
   const pose=[];c.model.traverse(o=>{if(o.isBone)pose.push({name:o.name,p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray()})});samples.push({time:t,pose});
  }
  result.push({clip:c.name,duration:c.duration,samples,image:sheet.toDataURL()});
 }
 renderer.dispose();return result;
 }''')
 for entry in data:
  (OUT/(entry['clip']+'-guide.png')).write_bytes(base64.b64decode(entry.pop('image').split(',')[1]))
  for sample in entry['samples']:sample['poseSha256']=hashlib.sha256(json.dumps(sample.pop('pose'),sort_keys=True).encode()).hexdigest()
 (OUT/'guides.json').write_text(json.dumps({'method':'Unmodified Quaternius GLTF animation keys. 24 uniform samples, same overhead camera. No IK or bone pose overrides.','clips':data},indent=2)+'\n')
 b.close()
print('Rendered 48 native walking/sword poses.')

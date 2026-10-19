"""Capture native source playback and native 8-direction guides; no IK or pose overrides."""
import base64,hashlib,json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('ARENA_BASE','http://127.0.0.1:8020/');OUT=ROOT/'docs/animation-resources';OUT.mkdir(exist_ok=True)
FRAMES=Path('/tmp/elderfall-native-resource-video');FRAMES.mkdir(exist_ok=True)
with sync_playwright()as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);p=b.new_page(viewport={'width':1000,'height':850});errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE+'motion-resources.html',wait_until='networkidle');p.wait_for_function('window.motionResources?.cards.length===4',timeout=60000);p.evaluate('window.requestAnimationFrame=()=>0;motionResources.setTime(0)');p.screenshot(path=str(OUT/'native-preview.png'))
 video=p.evaluate('''()=>{const out=[];for(let i=0;i<120;i++){motionResources.setTime(i/30);out.push(motionResources.renderer.domElement.toDataURL('image/jpeg',.9));}return out;}''')
 for i,frame in enumerate(video):(FRAMES/f'{i:04d}.jpg').write_bytes(base64.b64decode(frame.split(',')[1]))
 guides=p.evaluate('''async()=>{
 const T=await import('three'),r=motionResources.renderer,result=[];r.setPixelRatio(1);r.setSize(256,256,false);r.setViewport(0,0,256,256);r.setScissor(0,0,256,256);
 for(const index of [0,2]){
  const c=motionResources.cards[index],bones=[];c.model.traverse(o=>{if(o.isBone)bones.push(o)});c.camera.left=-1.5;c.camera.right=1.5;c.camera.updateProjectionMatrix();
  for(let direction=0;direction<8;direction++){
   const sheet=document.createElement('canvas');sheet.width=1024;sheet.height=768;const ctx=sheet.getContext('2d'),samples=[];c.model.parent.rotation.y=direction*Math.PI/4;
   for(let i=0;i<12;i++){
    const t=c.duration*i/(index===0?12:11),sampleTime=Math.min(t,c.duration-1e-7);c.action.reset().setLoop(T.LoopOnce,1).play();c.action.clampWhenFinished=true;c.mixer.setTime(sampleTime);r.render(c.scene,c.camera);ctx.drawImage(r.domElement,(i%4)*256,Math.floor(i/4)*256);ctx.fillStyle='#dce5ea';ctx.font='11px sans-serif';ctx.fillText(c.name+' '+sampleTime.toFixed(3)+'s',(i%4)*256+6,Math.floor(i/4)*256+14);
    samples.push({time:sampleTime,pose:bones.flatMap(o=>[...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].map(n=>Number(n.toFixed(6))))});
   }
   result.push({clip:c.name,direction,samples,image:sheet.toDataURL()});
  }
 }
 return result;
 }''')
 for g in guides:
  (OUT/f'{g["clip"]}-direction-{g["direction"]}.png').write_bytes(base64.b64decode(g.pop('image').split(',')[1]))
  for sample in g['samples']:sample['localBonePoseSha256']=hashlib.sha256(json.dumps(sample.pop('pose'),separators=(',',':')).encode()).hexdigest()
 for clip in ['Walk_Loop','Sword_Attack']:
  rows=[g for g in guides if g['clip']==clip]
  assert len(rows)==8
  for i in range(12):assert len({r['samples'][i]['localBonePoseSha256']for r in rows})==1,('Source pose changed across directions',clip,i)
 (OUT/'native-guide-samples.json').write_text(json.dumps({'method':'Original GLTFLoader and AnimationMixer; only outer display yaw/scale and camera; no IK/retarget/hand poses','guides':guides},indent=2)+'\n');assert not errors,errors;b.close()
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';labels=[('Quaternius Walk_Loop','10','10'),('KayKit Walking_A','w/2+10','10'),('Quaternius Sword_Attack','10','h/2+10'),('KayKit 1H diagonal slash','w/2+10','h/2+10')]
filt=','.join(f'drawtext=fontfile={font}:text={text}:fontcolor=white:fontsize=15:x={x}:y={y}'for text,x,y in labels)
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','30','-i',str(FRAMES/'%04d.jpg'),'-vf',filt,'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'native-motion-preview.mp4')],check=True)
print('PASS native source playback, 192 source-pose captures and identical local bone poses at every viewing direction',flush=True)

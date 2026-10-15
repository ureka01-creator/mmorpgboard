"""Render a continuous 60fps motion example from the real training room and actor.
Outputs original WebGL frames to /tmp, an MP4, and an HTML-rendered contact sheet.
This is a deterministic motion render, not a device performance recording.
"""
import base64,os,sys,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from verify_arena_browser import ARGS
SHEET_ONLY='--sheet-only'in sys.argv
BASE=os.environ.get('STUDY_BASE','http://127.0.0.1:8035/study.html');OUT=ROOT/'docs/study-review-v2.9';OUT.mkdir(parents=True,exist_ok=True)
FRAMES=Path('/tmp/elderfall-study-frames');FRAMES.mkdir(exist_ok=True)
with sync_playwright()as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);p=b.new_page(viewport={'width':1024,'height':768});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(BASE,wait_until='networkidle');p.wait_for_function('window.arena?.renderer',timeout=60000);p.click('#enter');p.wait_for_function('document.getElementById("loading").hidden');p.click('#pause')
 images=p.evaluate('''async(fast)=>{
 const T=await import('three'),A=await import('./arena-study-actors.mjs?v=2.9'),a=arena.hero,s=a.group.parent,r=arena.renderer,c=new T.OrthographicCamera(-1.55,1.55,1.55,-1.55,.1,70),offset=new T.Vector3(4.8,11.8,8.7),yaw=Math.atan2(4.8,8.7)+Math.PI/2;
 s.traverse(o=>{if(o.isDirectionalLight&&o.castShadow){o.shadow.mapSize.set(768,768);o.shadow.map?.dispose();o.shadow.map=null;}});
 arena.enemy.group.visible=false;arena.enemy.trail.visible=false;const body={x:-3,z:0,yaw,mode:'idle',elapsed:0,travel:0,max:40},out=[];r.setPixelRatio(1);r.setSize(512,512,false);
 for(let i=0;i<232;i++){
  const t=i/60;if(t<.35){body.mode='idle';body.elapsed=0;}else if(t<1.55){body.mode='walk';body.x+=Math.sin(yaw)*3.3/60;body.z+=Math.cos(yaw)*3.3/60;body.travel+=3.3/60;}else if(t>=1.85&&t<2.51){body.mode='attack';body.elapsed=t-1.85;}else if(t>=2.85&&t<3.51){body.mode='attack';body.elapsed=t-2.85;}else{body.mode='idle';body.elapsed=0;}
  A.animateActor(a,body,t);if(fast&&![0,24,30,36,42,48,54,60,111,116,120,127,132,140,150].includes(i)){out.push(null);continue;}c.position.set(body.x,1.03,body.z).add(offset);c.lookAt(body.x,1.03,body.z);c.updateMatrixWorld();r.render(s,c);out.push(r.domElement.toDataURL());
 }
 return out;
}''',SHEET_ONLY)
 for i,data in enumerate(images):
  if data and not SHEET_ONLY:(FRAMES/f'frame-{i:04}.png').write_bytes(base64.b64decode(data.split(',',1)[1]))
 selected=[(0,'guard'),(24,'gait 0'),(30,'gait 1'),(36,'gait 2'),(42,'gait 3'),(48,'gait 4'),(54,'gait 5'),(60,'gait 6'),(111,'ready'),(116,'raise'),(120,'backswing'),(127,'contact'),(132,'follow-through'),(140,'recover'),(150,'guard')]
 p.evaluate('''frames=>{const layer=document.createElement('div');layer.id='motion-sheet';layer.style.cssText='position:absolute;inset:0 auto auto 0;z-index:99999;width:1024px;background:#151d1f;color:#d9ccb0;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,256px)';for(const f of frames){const cell=document.createElement('div');cell.innerHTML='<div style="height:25px;padding:5px 10px">'+f.label+'</div><img width="256" height="256" src="'+f.image+'">';layer.appendChild(cell);}document.body.appendChild(layer);}''',[{'label':label,'image':images[i]}for i,label in selected]);p.locator('#motion-sheet').screenshot(path=str(OUT/'motion-contact.png'));assert not errors,errors;b.close()
if SHEET_ONLY:print('PASS motion contact sheet',flush=True);sys.exit(0)
video=ROOT/'assets/study/motion-preview.mp4';video.parent.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','60','-i',str(FRAMES/'frame-%04d.png'),'-frames:v','232','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],check=True)
print('PASS rendered 232 real WebGL frames, contact sheet, and continuous 60fps MP4',video.stat().st_size,'bytes',flush=True)

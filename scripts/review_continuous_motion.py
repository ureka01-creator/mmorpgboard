"""Actual WebGL sequences driven by the combat simulation, saved without repainting art."""
import base64,json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review
OUT=Path(os.environ.get('ARENA_REVIEW_OUT','/tmp/elderfall-continuous'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page(viewport={'width':1120,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text)if m.type=='error'else None);load_review(page)
 version=page.locator('meta[name="application-version"]').get_attribute('content');results=[]
 for d in range(8):
  record=d in [0,2]
  result=page.evaluate('''async({d,record,version})=>{
   const T=await import('three'),R=await import('./arena-engine.mjs'),A=await import('./arena-sprites.mjs?v='+version),assets=await A.loadSpriteAssets();
   const scene=new T.Scene(),a=A.createActor(scene,true,assets),r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(320,300);r.setClearColor(0x686a64,1);
   const c=new T.OrthographicCamera(-1.7,1.7,1.6,-1.6,.01,40),offset=new T.Vector3(4.8,14.7,8.7);
   const state=R.create(),yaw=Math.atan2(4.8,8.7)+d*Math.PI/4,dx=Math.sin(yaw),dz=Math.cos(yaw);Object.assign(state.hero,{x:-3*dx,z:-3*dz,yaw});state.enemy.hp=0;
   const frames=[],samples=[],changes={},shots=[],pixels=new Uint8Array(320*300*4);let previous;
   A.animateActor(a,state.hero,0);
   for(let frame=0;frame<180;frame++){
    const t=frame/60,walk=t>=.2&&t<.65||t>=.9&&t<1.15||t>=1.85&&t<2.6;
    R.step(state,{x:walk?dx:0,z:walk?dz:0,attack:frame===69,dodge:frame===123},1/60);A.animateActor(a,state.hero,state.time);
    const inspect=record||[38,39,40,41,42,53,54,68,69,70,71,72,73,74,75,110,111,112,122,123,124,143,144,145,155,156,157,160,170,179].includes(frame);
    if(!inspect)continue;
    c.position.copy(a.group.position).add(offset);c.lookAt(a.group.position.clone().add(new T.Vector3(0,1.1,0)));r.render(scene,c);
    if(record)frames.push(r.domElement.toDataURL());
    r.getContext().readPixels(0,0,320,300,r.getContext().RGBA,r.getContext().UNSIGNED_BYTE,pixels);
    if(previous)changes[frame]=pixels.reduce((s,v,i)=>s+Math.abs(v-previous[i]),0);previous=pixels.slice();
    samples.push({frame,time:state.time,mode:state.hero.mode,phase:a.motion.phase,renderPhase:a.motion.renderPhase??a.motion.phase,weight:a.motion.locomotion?.weight??null,entry:a.motion.attackEntry?.duration??null});
    if([38,39,40,41,42,53,54,68,69,70,71,72,73,74,75,110,111,112,122,123,124,143,144,145,155,156,157,160,170,179].includes(frame))shots.push({label:`${d} t=${t.toFixed(3)} ${state.hero.mode}`,image:r.domElement.toDataURL()});
   }
   r.dispose();return {direction:d,frames,samples,changes,shots};
  }''',{'d':d,'record':record,'version':version})
  if record:
   folder=OUT/f'direction-{d}';folder.mkdir(exist_ok=True)
   for i,data in enumerate(result.pop('frames')):(folder/f'{i:04}.png').write_bytes(base64.b64decode(data.split(',')[1]))
   subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','60','-i',str(folder/'%04d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(OUT/f'direction-{d}.mp4')],check=True)
  else:result.pop('frames')
  shots=result.pop('shots');page.evaluate('''shots=>{document.getElementById('sequence')?.remove();const grid=document.createElement('div');grid.id='sequence';grid.style.cssText='position:absolute;inset:0 auto auto 0;width:1280px;z-index:99999;background:#18202a;color:white;font:12px sans-serif;display:grid;grid-template-columns:repeat(4,320px)';grid.innerHTML=shots.map(s=>`<div>${s.label}<img style="display:block" src="${s.image}"></div>`).join('');document.body.appendChild(grid);}''',shots)
  page.locator('#sequence').screenshot(path=str(OUT/f'direction-{d}.png'));results.append(result);print('reviewed sequence',version,d,flush=True)
 assert not errors,errors
 (OUT/'metrics.json').write_text(json.dumps({'version':version,'directions':results},indent=2));browser.close()

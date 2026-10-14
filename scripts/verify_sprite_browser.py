"""Check real loaded sprite textures, runtime selection, alignment, freeze/reset and failure UI."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,BASE,load
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 context=browser.new_context(viewport={'width':1024,'height':768});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));load(page);page.click('#pause')
 result=page.evaluate('''async()=>{
 const {animateActor}=await import('./arena-sprites.mjs?v=2.8'),a=arena.hero,b=arena.enemy,view=Math.atan2(4.8,8.7),THREE=await import('three');
 if(a.renderType!=='directional-sprite'||!a.sprite.material.depthTest||a.sprite.material.depthWrite)throw Error('Invalid sprite rendering');
 let time=1,frames=0;const seen=new Set();
 const c=document.createElement('canvas');c.width=1536;c.height=1024;const ctx=c.getContext('2d');
 for(const [name,map]of Object.entries(a.maps)){
  if(map===b.maps[name]||map.image.width!==1536)throw Error('Shared texture transforms');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(map.image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let empty=0,solid=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]<8)empty++;if(pixels[i]>200)solid++;}if(empty<200000||solid<10000)throw Error('Missing transparency/art '+name);
 }
 for(let d=0;d<8;d++){
  const body={x:0,z:0,yaw:view+d*Math.PI/4,mode:'walk',elapsed:0,travel:0,max:40};animateActor(a,body,++time);
  for(let f=0;f<12;f++){
   body.travel=f*2.24/12+.002;animateActor(a,body,time+=.01);if(a.motion.direction!==d||a.motion.frame!==f)throw Error('Wrong direction/run frame '+d+' '+f);
   const box=a.pack.frames.run[d][f],atlas=a.pack.atlases[box.atlas];if(Math.abs(a.maps[box.atlas].repeat.x-box.rect[2]/atlas.width)>1e-6)throw Error('Incorrect UV crop');
   if(a.sprite.geometry.attributes.position.count<100)throw Error('Contour crop missing');
   const bottom=a.sprite.position.y+a.sprite.scale.y/2-box.pivot[1]*a.sprite.scale.y;if(Math.abs(bottom-.025)>1e-5)throw Error('Foot anchor drift');
   seen.add(d+':'+f);frames++;
  }
  const before=JSON.stringify(a.motion);animateActor(a,body,time);if(JSON.stringify(a.motion)!==before)throw Error('Pause changed pose');
  for(const [t,f]of [[0,0],[.09,1],[.18,2],[.23,3],[.26,4],[.40,5],[.56,6],[.62,0]]){body.mode='attack';body.elapsed=t;animateActor(a,body,time+=.01);if(a.motion.clip!==(t>=.62?'idle':'attack')||a.motion.frame!==f)throw Error('Attack frame/contact');}
  for(let f=0;f<4;f++){body.mode='dodge';body.elapsed=f*.085+.001;animateActor(a,body,time+=.01);if(a.motion.clip!=='roll'||a.motion.frame!==f)throw Error('Dodge frame');}
 }
 // The guardian retains the pose already established during windup.
 for(let d=0;d<8;d++){
  const body={x:0,z:0,yaw:view+d*Math.PI/4,mode:'windup',elapsed:.70,travel:0,max:50};animateActor(b,body,++time);const prepared=b.motion.frame;
  body.mode='attack';body.elapsed=0;animateActor(b,body,time+=.01);if(b.motion.frame!==prepared)throw Error('Enemy returned to ready before hit');
  body.elapsed=.18;animateActor(b,body,time+=.18);if(b.motion.frame!==4)throw Error('Enemy blade is not striking at hit');
 }
 // A lethal hit must still show the cut and finish before idling.
 {
  const R=await import('./arena-engine.mjs'),state=R.create();Object.assign(state.hero,{x:0,z:0});Object.assign(state.enemy,{x:0,z:1,hp:10});animateActor(a,state.hero,0);
  for(let i=0;i<30&&state.status==='playing';i++){R.step(state,{attack:i===0},1/60);animateActor(a,state.hero,state.time);}
  if(state.status!=='won'||state.hero.mode!=='idle'||a.motion.clip!=='attack'||a.motion.frame!==4)throw Error('Victory erased lethal cut');
  animateActor(a,state.hero,state.time+.41);if(a.motion.clip!=='idle')throw Error('Lethal cut never finishes');
 }
 // Travelling the same distance while swinging must not double gait phase.
 {
 const body={x:0,z:0,yaw:view,mode:'walk',elapsed:0,travel:0,max:40};animateActor(a,body,++time);body.travel=.28;animateActor(a,body,time+=.1);const phase=a.motion.phase,steps=a.motion.footsteps;
  body.mode='attack';body.travel+=.28;animateActor(a,body,time+=.1);if(Math.abs(a.motion.phase-phase-.125)>1e-8||a.motion.footsteps!==steps)throw Error('Attack accelerated gait or played phantom footsteps');
  body.mode='walk';body.travel+=.28;animateActor(a,body,time+=.1);if(Math.abs(a.motion.phase-.375)>1e-8)throw Error('Walking resumed at wrong phase');
 }
 // Physical damage and the visible cut coincide on the first resolved hit.
 {
  const R=await import('./arena-engine.mjs'),state=R.create();Object.assign(state.hero,{x:0,z:0});Object.assign(state.enemy,{x:0,z:1});animateActor(a,state.hero,0);
  for(let i=0;i<30&&!state.hero.hits;i++){R.step(state,{attack:i===0},1/60);animateActor(a,state.hero,state.time);}
  if(state.hero.hits!==1||a.motion.clip!=='attack'||a.motion.frame!==4)throw Error('Visible cut and damage are out of sync');
 }
 const body={x:0,z:0,yaw:view,mode:'idle',elapsed:0,travel:0};animateActor(a,body,0);if(a.motion.phase!==0||a.motion.frame!==0)throw Error('Reset did not restart');
 const before=b.sprite.material.map.offset.clone();body.mode='walk';body.travel=.7;animateActor(a,body,.1);if(!b.sprite.material.map.offset.equals(before))throw Error('Hero changed enemy UV');
 // Ground must retain the complete projected silhouette; raised props still occlude it.
 const scene=new THREE.Scene();scene.add(a.group);a.shadow.visible=false;
 const camera=new THREE.OrthographicCamera(-1.5,1.5,1.5,-1.5,.1,80);camera.position.set(4.8,15.8,8.7);camera.lookAt(0,1.1,0);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshBasicMaterial({color:0x010101}));floor.rotation.x=-Math.PI/2;scene.add(floor);
 const target=new THREE.WebGLRenderTarget(256,256),renderer=arena.renderer;
 function count(){renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,pixels);return pixels.reduce((n,v,i)=>n+(i%4===0&&Math.max(v,pixels[i+1],pixels[i+2])>45?1:0),0);}
 let groundChecks=0;
 for(let d=0;d<8;d++)for(const elapsed of [0,.18,.26,.40]){
  const pose={x:0,z:0,yaw:view+d*Math.PI/4,mode:'attack',elapsed,travel:0,max:40};animateActor(a,pose,++time);floor.visible=false;const bare=count();floor.visible=true;const grounded=count();if(bare<300||grounded<bare*.98)throw Error('Ground clips blade/boots '+d+' '+elapsed+' '+bare+' '+grounded);groundChecks++;
 }
 const blocker=new THREE.Mesh(new THREE.BoxGeometry(3,4,1.2),new THREE.MeshBasicMaterial({color:0x010101}));blocker.position.set(.7,2,1.3);scene.add(blocker);const hidden=count();blocker.visible=false;const visible=count();if(hidden>visible*.4)throw Error('Column no longer hides sprite '+hidden+' '+visible);
 renderer.setRenderTarget(null);target.dispose();
 return {directions:8,runFrames:seen.size,atlases:Object.keys(a.maps).length,groundChecks};
}''')
 assert result=={'directions':8,'runFrames':96,'atlases':10,'groundChecks':32};assert not errors,errors;print('PASS sprite GPU output, 32 floor-depth poses, column occlusion, alpha, 96 run poses, 56 attack/32 dodge poses, foot anchors, independent UV, uniform travel phase, enemy windup continuity, damage-aligned cut, lethal follow-through, pause and reset',flush=True)
 context.close()
 c=browser.new_context();c.route('**/assets/sprites/warrior.json*',lambda route:route.fulfill(status=503,body='unavailable'));p=c.new_page();p.goto(BASE);p.wait_for_function('document.getElementById("enter").textContent==="다시 불러오기"',timeout=60000);assert p.locator('#enter').is_visible();assert p.locator('#load-copy').inner_text().startswith('3D 성역을 불러오지 못했습니다.');print('PASS missing sprite pack shows retry UI',flush=True);browser.close()

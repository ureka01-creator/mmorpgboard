"""Check real loaded sprite textures, runtime selection, alignment, freeze/reset and failure UI."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,BASE,load
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 context=browser.new_context(viewport={'width':1024,'height':768});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));load(page);page.click('#pause')
 result=page.evaluate('''async()=>{
 const {animateActor}=await import('./arena-sprites.mjs?v=2.6'),a=arena.hero,b=arena.enemy,view=Math.atan2(4.8,8.7),THREE=await import('three');
 if(a.renderType!=='directional-sprite'||!a.sprite.material.depthTest||a.sprite.material.depthWrite)throw Error('Invalid sprite rendering');
 let time=1,frames=0;const seen=new Set();
 const c=document.createElement('canvas');c.width=1536;c.height=1024;const ctx=c.getContext('2d');
 for(const [name,map]of Object.entries(a.maps)){
  if(map===b.maps[name]||map.image.width!==1536)throw Error('Shared texture transforms');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(map.image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let empty=0,solid=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]<8)empty++;if(pixels[i]>200)solid++;}if(empty<200000||solid<10000)throw Error('Missing transparency/art '+name);
 }
 for(let d=0;d<8;d++){
  const body={x:0,z:0,yaw:view+d*Math.PI/4,mode:'walk',elapsed:0,travel:0,max:40};animateActor(a,body,++time);
  for(let f=0;f<8;f++){
   body.travel=f*2.24/8+.002;animateActor(a,body,time+=.01);if(a.motion.direction!==d||a.motion.frame!==f)throw Error('Wrong direction/run frame '+d+' '+f);
   const box=a.pack.frames.run[d][f],atlas=a.pack.atlases[box.atlas];if(Math.abs(a.maps[box.atlas].repeat.x-box.rect[2]/atlas.width)>1e-6)throw Error('Incorrect UV crop');
   const bottom=a.sprite.position.y+a.sprite.scale.y/2-box.pivot[1]*a.sprite.scale.y;if(Math.abs(bottom-.025)>1e-5)throw Error('Foot anchor drift');
   seen.add(d+':'+f);frames++;
  }
  const before=JSON.stringify(a.motion);animateActor(a,body,time);if(JSON.stringify(a.motion)!==before)throw Error('Pause changed pose');
  for(const [t,f]of [[0,0],[.17,1],[.26,2],[.47,3]]){body.mode='attack';body.elapsed=t;animateActor(a,body,time+=.01);if(a.motion.clip!=='attack'||a.motion.frame!==f)throw Error('Attack frame/contact');}
  for(let f=0;f<4;f++){body.mode='dodge';body.elapsed=f*.085+.001;animateActor(a,body,time+=.01);if(a.motion.clip!=='roll'||a.motion.frame!==f)throw Error('Dodge frame');}
 }
 const body={x:0,z:0,yaw:view,mode:'idle',elapsed:0,travel:0};animateActor(a,body,0);if(a.motion.phase!==0||a.motion.frame!==0)throw Error('Reset did not restart');
 const before=b.sprite.material.map.offset.clone();body.mode='walk';body.travel=.7;animateActor(a,body,.1);if(!b.sprite.material.map.offset.equals(before))throw Error('Hero changed enemy UV');
 const scene=new THREE.Scene();scene.add(a.group);const camera=new THREE.PerspectiveCamera(39,1,.1,80);camera.position.set(4.8,14.7,8.7);camera.lookAt(0,0,0);const target=new THREE.WebGLRenderTarget(256,256);const renderer=arena.renderer;renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,pixels);renderer.setRenderTarget(null);target.dispose();if(!pixels.some((v,i)=>i%4!==3&&v>20))throw Error('Sprite missing from GPU output');
 return {directions:8,runFrames:seen.size,atlases:Object.keys(a.maps).length};
}''')
 assert result=={'directions':8,'runFrames':64,'atlases':10};assert not errors,errors;print('PASS sprite GPU output, alpha, 64 run poses, 32 attack/32 dodge poses, foot anchors, independent UV, pause and reset',flush=True)
 context.close()
 c=browser.new_context();c.route('**/assets/sprites/warrior.json*',lambda route:route.fulfill(status=503,body='unavailable'));p=c.new_page();p.goto(BASE);p.wait_for_function('document.getElementById("enter").textContent==="다시 불러오기"',timeout=60000);assert p.locator('#enter').is_visible();assert p.locator('#load-copy').inner_text().startswith('3D 성역을 불러오지 못했습니다.');print('PASS missing sprite pack shows retry UI',flush=True);browser.close()

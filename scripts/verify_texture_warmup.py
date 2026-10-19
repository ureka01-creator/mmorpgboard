"""A first turn, strike and roll must reuse the approved atlas GPU uploads."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page();load_review(page)
 result=page.evaluate('''async()=>{
 const T=await import('three'),A=await import('./arena-sprites.mjs?v=2.14'),scene=arena.hero.group.parent,a=arena.hero,renderer=arena.renderer,gl=renderer.getContext();
 const programsBefore=renderer.info.programs.length;let uploads=0;const methods={};for(const name of ['texImage2D','texSubImage2D']){methods[name]=gl[name];gl[name]=function(...args){if(args.some(x=>x instanceof HTMLImageElement&&x.naturalWidth===1536))uploads++;return methods[name].apply(this,args);};}
 const camera=arena.camera;let time=0;renderer.setRenderTarget(null);renderer.setSize(64,64,false);
 for(let d=0;d<8;d++)for(const mode of ['idle','walk','attack','dodge']){
 const body={x:0,z:0,yaw:Math.atan2(4.8,8.7)+d*Math.PI/4,mode,max:40,elapsed:.2,travel:0};A.animateActor(a,body,time+=1);renderer.render(scene,camera);
 }
 for(const name of Object.keys(methods))gl[name]=methods[name];renderer.setRenderTarget(null);const programs=renderer.info.programs.length-programsBefore;if(uploads||programs)throw Error('Late atlas/shader preparation '+JSON.stringify({uploads,programs}));return {directions:8,poses:32,lateAtlasUploads:uploads,latePrograms:programs};
 }''');print('PASS all direction/attack/dodge textures prepared before play',result,flush=True);browser.close()

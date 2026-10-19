"""Static architecture shadow caching must save draws without changing any rendered pixel."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page();load_review(page)
 result=page.evaluate('''async()=>{
 const T=await import('three'),renderer=arena.renderer;
 const scene=arena.hero.group.parent,camera=arena.camera,light=scene.children.find(o=>o.isDirectionalLight&&o.castShadow),target=new T.WebGLRenderTarget(256,192);
 if(!light||light.shadow.autoUpdate!==false)throw Error('Stationary shadow not cached');
 for(const a of [arena.hero,arena.enemy])a.group.traverse(o=>{if(o.castShadow)throw Error('Moving actor entered stationary shadow cache');});
 const previous=renderer.info.autoReset;renderer.info.autoReset=false;renderer.setRenderTarget(target);
 function shot(){renderer.info.reset();renderer.render(scene,camera);const pixels=new Uint8Array(256*192*4);renderer.readRenderTargetPixels(target,0,0,256,192,pixels);return {pixels,calls:renderer.info.render.calls};}
 light.shadow.autoUpdate=true;const live=shot();light.shadow.autoUpdate=false;light.shadow.needsUpdate=false;const cached=shot();
 const error=live.pixels.reduce((sum,v,i)=>sum+Math.abs(v-cached.pixels[i]),0);
 renderer.info.autoReset=previous;renderer.setRenderTarget(null);target.dispose();if(error!==0||cached.calls>=live.calls)throw Error('Shadow cache changes image or saves no draws '+JSON.stringify({error,live:live.calls,cached:cached.calls}));
 return {pixelError:error,liveCalls:live.calls,cachedCalls:cached.calls};
 }''');print('PASS stationary shadows preserve exact GPU pixels',result,flush=True);browser.close()

"""An actual WebGL loss must pause play and rebuild the cached architecture shadows."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));load_review(page)
 page.locator('#enter').dispatch_event('click')
 page.evaluate("window.__loss=arena.renderer.getContext().getExtension('WEBGL_lose_context');if(!window.__loss)throw Error('Context-loss extension unavailable');window.__loss.loseContext();")
 page.wait_for_function('arena.paused&&arena.renderer.getContext().isContextLost()',polling=100)
 page.evaluate('window.__loss.restoreContext()');page.wait_for_function('!arena.renderer.getContext().isContextLost()',polling=100,timeout=30000)
 result=page.evaluate('''async()=>{
 const T=await import('three'),renderer=arena.renderer,scene=arena.hero.group.parent,light=scene.children.find(o=>o.isDirectionalLight&&o.castShadow);
 if(!arena.paused||!light.shadow.needsUpdate)throw Error('Recovery did not pause/rebuild shadow cache');
 renderer.render(scene,arena.camera);
 const p=new Uint8Array(light.shadow.map.width*light.shadow.map.height*4);renderer.readRenderTargetPixels(light.shadow.map,0,0,light.shadow.map.width,light.shadow.map.height,p);
 const written=p.reduce((n,v,i)=>n+(i%4===0&&v<250?1:0),0);if(light.shadow.needsUpdate||written<500)throw Error('Restored shadow map is empty '+written);
 return {paused:arena.paused,shadowPixels:written,cacheRebuilt:!light.shadow.needsUpdate};
 }''')
 assert not errors,errors;print('PASS real WebGL loss/recovery and shadow cache regeneration',result,flush=True);browser.close()

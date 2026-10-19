"""Drive the real application's display clock at 120 Hz with native keyboard input."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,BASE
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('''window.__displayNow=1000;Object.defineProperty(performance,'now',{value:()=>window.__displayNow});window.requestAnimationFrame=callback=>{window.__displayFrame=callback;return 1;};''')
 page.goto(BASE,wait_until='networkidle');page.wait_for_function('window.arena?.renderer',polling=100,timeout=60000);page.locator('#enter').dispatch_event('click');page.keyboard.down('d')
 result=page.evaluate('''()=>{
 const renderer=arena.renderer,render=renderer.render.bind(renderer);let last;renderer.render=(...args)=>{last=args;};
 let rawDuplicates=0,displayDuplicates=0,phaseDuplicates=0,raw,display,phase;
 for(let i=0;i<120;i++){
  window.__displayNow+=1000/120;window.__displayFrame();
  const x=arena.state.hero.x,p=arena.hero.group.position.x,gait=arena.hero.motion.phase;
  if(i>4){rawDuplicates+=Math.abs(x-raw)<1e-8;displayDuplicates+=Math.abs(p-display)<1e-8;phaseDuplicates+=Math.abs(gait-phase)<1e-8;}
  raw=x;display=p;phase=gait;
 }
 document.getElementById('pause').click();const before=JSON.stringify({position:arena.hero.group.position,phase:arena.hero.motion.phase,blend:arena.hero.motion.locomotion});
 for(let i=0;i<12;i++){window.__displayNow+=1000/120;window.__displayFrame();}
 const frozen=before===JSON.stringify({position:arena.hero.group.position,phase:arena.hero.motion.phase,blend:arena.hero.motion.locomotion});
 renderer.render=render;render(...last);return {rawDuplicates,displayDuplicates,phaseDuplicates,frozen};
 }''')
 assert result['rawDuplicates']>=50 and result['displayDuplicates']==0 and result['phaseDuplicates']==0 and result['frozen'],result
 assert not errors,errors
 print('PASS real 120 Hz application: fixed-state vs displayed movement and gait',result,flush=True);browser.close()

"""Real collision/dodge simulation must retain the approved warrior and distance-driven steps."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page();load_review(page)
 result=page.evaluate('''async()=>{
 const T=await import('three'),R=await import('./arena-engine.mjs'),{Presentation}=await import('./arena-presentation.mjs?v=2.13'),A=await import('./arena-sprites.mjs?v=2.13'),assets=await A.loadSpriteAssets(),scene=new T.Scene(),a=A.createActor(scene,true,assets);let checks=0,resumptions=0,blocked=0;
 for(let d=0;d<9;d++){
  const state=R.create(),yaw=Math.atan2(4.8,8.7)+d*Math.PI/4,dx=d===8?0:Math.sin(yaw),dz=d===8?1:Math.cos(yaw);Object.assign(state.hero,d===8?{x:-4,z:2.8,yaw:0}:{x:0,z:0,yaw});state.enemy.hp=0;
  const view=new Presentation(state);A.animateActor(a,view.sample(1).hero,0);let wasDodge=false;
  for(let i=0;i<72;i++){
   R.step(state,{x:dx,z:dz,dodge:i===12},1/60);view.capture(state);
   for(const alpha of [0,.5]){
    const body=view.sample(alpha).hero,time=Math.max(0,state.time-1/60+alpha/60);A.animateActor(a,body,time);
    if(Math.abs(a.motion.renderPhase*2.24-body.travel)>1e-5)throw Error('Feet slipped against travel '+JSON.stringify({d,i,alpha,phase:a.motion.renderPhase,travel:body.travel}));
    if(body.mode==='dodge'){
     if(a.motion.clip!=='run'||!a.flow.active||!a.motion.atlas.startsWith('direction-'))throw Error('Dodge changed warrior art');
     wasDodge=true;checks++;
    }else if(wasDodge&&body.mode==='walk'){
     if(a.motion.clip!=='run'||a.flow.u.motionLocomotion.value!==0)throw Error('Dodge resumed through an idle snap');if(d<8)resumptions++;wasDodge=false;
    }
   }
  }
  if(d===8){if(state.hero.travel>=1||a.motion.renderPhase>=.5)throw Error('Blocked dodge kept cycling feet');blocked++;}
 }
 return {directions:8,dashDisplaySamples:checks,resumptions,blocked};
 }''');assert result['resumptions']==8 and result['blocked']==1,result
 print('PASS same-art evasion, phase through movement/evade/resume and blocked travel',result,flush=True);browser.close()

"""Seeded engine + actual actor stress across display rates; GPU audits of live outcomes."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text)if m.type=='error'else None);load_review(page)
 result=page.evaluate('''async()=>{
 const T=await import('three'),R=await import('./arena-engine.mjs'),{Presentation}=await import('./arena-presentation.mjs?v=2.13'),A=await import('./arena-sprites.mjs?v=2.13'),assets=await A.loadSpriteAssets();
 const scene=new T.Scene(),hero=A.createActor(scene,true,assets),enemy=A.createActor(scene,false,assets),renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(192,192);renderer.setClearColor(0,0);hero.shadow.visible=enemy.shadow.visible=false;
 const camera=new T.OrthographicCamera(-1.7,1.7,1.7,-1.7,.1,80),offset=new T.Vector3(4.8,14.7,8.7),directions=new Set(),modes=new Set();let ticks=0,resets=0,won=0,lost=0,pauses=0,worstFragments=0;
 function fragments(p){const seen=new Uint8Array(192*192),sizes=[];for(let i=0;i<seen.length;i++)if(!seen[i]&&p[i*4+3]>100){const stack=[i];seen[i]=1;let count=0;while(stack.length){const at=stack.pop();count++;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=at%192+dx,y=Math.floor(at/192)+dy,n=y*192+x;if(x>=0&&x<192&&y>=0&&y<192&&!seen[n]&&p[n*4+3]>100){seen[n]=1;stack.push(n);}}}sizes.push(count);}sizes.sort((a,b)=>b-a);return {main:sizes[0]||0,extra:sizes.slice(1).reduce((a,b)=>a+b,0)};}
 for(let seed=1;seed<=128;seed++){
  let rng=seed;const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296;};let state,view,accumulator,time,terminalFor=0,input={};
  const reset=()=>{state=R.create();view=new Presentation(state);accumulator=time=terminalFor=0;const b=view.sample(1);A.animateActor(hero,b.hero,0);A.animateActor(enemy,b.enemy,0);resets++;};reset();
  for(let frame=0;frame<2000;frame++){
   if(frame%15===0){const yaw=random()*Math.PI*2,speed=random()<.2?0:1;input=seed%8===0?{x:0,z:0,attack:false,dodge:false}:{x:Math.sin(yaw)*speed,z:Math.cos(yaw)*speed,attack:random()<.6,dodge:random()<.06};}
   const dt=1/[30,60,90,120,144][Math.floor(random()*5)];if(state.status!=='playing'){terminalFor+=dt;if(terminalFor>=.85){if(state.status==='won')won++;else lost++;reset();}}accumulator+=dt;
   while(accumulator>=1/60){R.step(state,input,1/60);view.capture(state);time+=1/60;accumulator-=1/60;ticks++;input.dodge=false;}
   const bodies=view.sample(accumulator*60),renderTime=Math.max(0,time-1/60+accumulator);A.animateActor(hero,bodies.hero,renderTime);A.animateActor(enemy,bodies.enemy,renderTime);
   for(const a of [hero,enemy]){
    modes.add(a.pose);directions.add(a.motion.direction);const b=a.motion;
    if(![a.group.position.x,a.group.position.z,b.phase,a.sprite.material.opacity,a.flow.u.motionMix.value,a.flow.u.motionWalkWeight.value,...a.flow.u.motionPair.value].every(Number.isFinite))throw Error('Nonfinite pose '+JSON.stringify({seed,frame,mode:a.pose}));
    if(b.locomotion&&(b.locomotion.weight<0||b.locomotion.weight>1))throw Error('Unbounded rest transition');
   }
   if(frame%240===0){const before=JSON.stringify([hero.motion.phase,hero.motion.locomotion,hero.flow.u.motionMix.value]);A.animateActor(hero,bodies.hero,renderTime);if(before!==JSON.stringify([hero.motion.phase,hero.motion.locomotion,hero.flow.u.motionMix.value]))throw Error('Pause advanced pose');pauses++;}
  }
  if(state.hero.hp>0){enemy.group.visible=false;camera.position.copy(hero.group.position).add(offset);camera.lookAt(hero.group.position.clone().add(new T.Vector3(0,1.1,0)));renderer.render(scene,camera);const gl=renderer.getContext(),p=new Uint8Array(192*192*4);gl.readPixels(0,0,192,192,gl.RGBA,gl.UNSIGNED_BYTE,p);enemy.group.visible=true;const parts=fragments(p);worstFragments=Math.max(worstFragments,parts.extra);if(parts.main<200||parts.extra>64)throw Error('GPU silhouette '+JSON.stringify({seed,mode:hero.pose,phase:hero.motion.phase,blend:hero.motion.locomotion,parts}));}
 }
 renderer.dispose();return {seeds:128,displayFrames:128*2000,simulationTicks:ticks,simulationHours:ticks/60/3600,resets,won,lost,pauses,directions:[...directions].sort(),modes:[...modes].sort(),worstFragments};
 }''')
 assert len(result['directions'])==8 and result['simulationHours']>1 and result['won']>0 and result['lost']>0,result
 assert not errors,errors;print('PASS seeded motion stress + actual GPU silhouette audits',result,flush=True);browser.close()

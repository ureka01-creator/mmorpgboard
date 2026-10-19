"""Measure actual GPU continuity, key-pose fidelity and damage-aligned interpolation."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review as load
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page(viewport={'width':1024,'height':768});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text)if m.type=='error'else None)
 load(page)
 result=page.evaluate('''async()=>{
 const T=await import('three'),{createActor,animateActor,loadSpriteAssets}=await import('./arena-sprites.mjs?v=2.14'),assets=await loadSpriteAssets();
 const scene=new T.Scene(),actor=createActor(scene,true,assets),legacy=createActor(scene,true,{...assets,flow:null});actor.shadow.visible=legacy.shadow.visible=false;
 if(actor.flow.assets.flow.image.width>2048||actor.flow.assets.flow.image.height>2048)throw Error('Motion data exceeds 2K texture support');
 const renderer=arena.renderer,target=new T.WebGLRenderTarget(128,128),camera=new T.OrthographicCamera(-1.7,1.7,1.7,-1.7,.1,80);camera.position.set(4.8,15.8,8.7);camera.lookAt(0,1,0);
 let time=10;const pixels=()=>{renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.render(scene,camera);const p=new Uint8Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,p);return p;};
 const diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0),ratios=[],keyErrors=[];
 for(let d=0;d<8;d++){
  const body={x:0,z:0,yaw:Math.atan2(4.8,8.7)+d*Math.PI/4,mode:'walk',elapsed:0,travel:0,max:40};
  const frame=p=>{body.travel=p*2.24/12;actor.motion=undefined;animateActor(actor,body,time+=.01);actor.motion.phase=p/12;animateActor(actor,body,time+=.01);actor.group.visible=true;legacy.group.visible=false;return pixels();};
  for(let i=0;i<12;i++){
   const a=frame(i),b=frame(i+1),before=frame(i+.499),after=frame(i+.501);ratios.push(diff(before,after)/Math.max(1,diff(a,b)));
   actor.group.visible=false;legacy.group.visible=true;legacy.motion=undefined;animateActor(legacy,body,time+=.01);legacy.motion.phase=i/12;animateActor(legacy,body,time+=.01);const old=pixels();keyErrors.push(diff(a,old)/Math.max(1,a.reduce((x,y)=>x+y,0)));
  }
  // Static-key fidelity is separate from the intentional run-to-attack lead-in.
  actor.motion=legacy.motion=undefined;
  for(const [elapsed,originalFrame] of [[0,0],[.105,1],[.19,2],[.26,4],[.56,6]]){
   if((d===2||d===4)&&originalFrame===1)continue;
   body.mode='attack';body.elapsed=elapsed;actor.group.visible=true;legacy.group.visible=false;animateActor(actor,body,time+=.01);const current=pixels();
   actor.group.visible=false;legacy.group.visible=true;animateActor(legacy,{...body,elapsed:[0,.08,.14,.22,.26,.36,.60][originalFrame]},time+=.01);const approved=pixels();keyErrors.push(diff(current,approved)/Math.max(1,approved.reduce((x,y)=>x+y,0)));
  }
  for(const [max,contact]of [[40,.26],[50,.18]]){
   body.mode='attack';body.max=max;body.elapsed=contact;actor.group.visible=true;legacy.group.visible=false;animateActor(actor,body,time+=.1);
   if(actor.flow.u.motionMix.value!==0||!actor.flow.assets.frames.get(`${d}:attack:4`)||actor.flow.u.motionFrames.value.x!==actor.flow.assets.frames.get(`${d}:attack:4`).index)throw Error('Damage is not the original contact pose');
  }
 }
 ratios.sort((a,b)=>a-b);const median=ratios[Math.floor(ratios.length/2)],worstKey=Math.max(...keyErrors);
 if(median>=.8)throw Error('Interpolation did not reduce pose-switch discontinuity '+median);
 if(worstKey>.06)throw Error('Approved key pose changed '+worstKey);
 // A removed blade must not split the rear boot away from the leg.
 const footBody={x:0,z:0,yaw:Math.atan2(4.8,8.7)+7*Math.PI/4,mode:'attack',elapsed:.36,travel:0,max:40};
 actor.group.visible=true;legacy.group.visible=false;animateActor(actor,footBody,time+=1);actor.flow.blade.visible=false;
 const cut=pixels();actor.flow.u.motionSwords.value=0;actor.flow.head.visible=false;const uncut=pixels();
 function fragments(image){
  const seen=new Uint8Array(128*128),sizes=[];
  for(let i=0;i<seen.length;i++)if(!seen[i]&&image[i*4+3]>100){
   const stack=[i];seen[i]=1;let size=0;while(stack.length){const at=stack.pop();size++;
    // Diagonal raster pixels belong to one visible silhouette (8-connectivity).
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const x=at%128+dx,y=Math.floor(at/128)+dy,n=y*128+x;
     if(x>=0&&x<128&&y>=0&&y<128&&!seen[n]&&image[n*4+3]>100){seen[n]=1;stack.push(n);}
    }
   }sizes.push(size);
  }sizes.sort((a,b)=>b-a);return sizes.slice(1).reduce((a,b)=>a+b,0);
 }
 const excessFragments=fragments(cut)-fragments(uncut);
 if(excessFragments>5)throw Error('Blade removal detached body fragments '+excessFragments);
 // Pausing and reduced temporal advancement must leave all render uniforms unchanged.
 const before=actor.flow.u.motionMix.value;animateActor(actor,actor.motion.body,actor.motion.time);if(actor.flow.u.motionMix.value!==before)throw Error('Frozen interpolation changed');
 // Returning from a translucent hurt pose must not leave sword/head one frame dim.
 const hurt={...footBody,mode:'hurt',elapsed:.03};animateActor(actor,hurt,time+=1);
 const attack={...footBody,mode:'attack',elapsed:.05};animateActor(actor,attack,time+=.01);
 if(actor.flow.blade.material.opacity!==actor.sprite.material.opacity||actor.flow.head.material.opacity!==actor.sprite.material.opacity)throw Error('Stale layered opacity after hurt');
 renderer.setRenderTarget(null);target.dispose();return {directions:8,walkPairs:ratios.length,medianSwitchRatio:median,worstKeyPixelError:worstKey,excessBodyFragmentPixels:excessFragments};
 }''')
 assert not errors,errors;print('PASS GPU interpolation / key-pose fidelity / contact / freeze',result,flush=True);browser.close()

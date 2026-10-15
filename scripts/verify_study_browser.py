"""Measure continuous gait, planted feet, rigid weapons, contact timing and shared light."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS
BASE=os.environ.get('STUDY_BASE','http://127.0.0.1:8035/study.html')
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page(viewport={'width':1024,'height':768});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle');page.wait_for_function('window.arena?.renderer',timeout=60000);assert page.locator('meta[name="application-version"]').get_attribute('content')=='2.9';page.click('#enter');page.wait_for_function('document.getElementById("loading").hidden');page.click('#pause')
 result=page.evaluate('''async()=>{
 const T=await import('three'),A=await import('./arena-study-actors.mjs?v=2.9'),R=await import('./arena-engine.mjs'),assets=await A.loadStudyAssets(),scene=new T.Scene(),a=A.createActor(scene,true,assets);
 const fresh=()=>({x:0,z:0,yaw:0,mode:'idle',elapsed:0,travel:0,max:40,hits:0});
 const results=[];let time=0;
 for(const [speed,mode] of [[3.3,'walk'],[1.1,'walk'],[-1.1,'attack']]){
  const body=fresh();A.animateActor(a,body,time=0);let min=Infinity,lift=0,jump=0,jumpBone=null,jumpTime=0,error=0,planted=0,slip=0,intervals=0,last=[null,null];
  for(let i=1;i<=360;i++){
   const before=a.clipRig.joints.map(j=>j.quaternion.clone());body.mode=mode;body.elapsed=mode==='attack'?(i/120)%.66:0;body.z+=speed/120;body.travel+=Math.abs(speed)/120;A.animateActor(a,body,time=i/120);
   for(let j=0;j<before.length;j++){const delta=before[j].angleTo(a.clipRig.joints[j].quaternion);if(delta>jump){jump=delta;jumpBone=a.clipRig.pack.joints[j];jumpTime=body.elapsed;}}
   for(let j=0;j<2;j++){
    const foot=A.footPoint(a,j),f=a.motion.feet[j],ankle=a.legs[j].ankle.getWorldPosition(new T.Vector3());min=Math.min(min,foot.y);lift=Math.max(lift,foot.y);
    if(i>90&&f.planted){error=Math.max(error,Math.hypot(ankle.x-f.anchor.x,ankle.z-f.anchor.z));planted++;if(last[j]?.planted){slip+=Math.hypot(ankle.x-last[j].point.x,ankle.z-last[j].point.z);intervals++;}}
    last[j]={planted:f.planted,point:ankle};
   }
   if(!a.clipRig.joints.every(j=>j.quaternion.toArray().every(Number.isFinite)))throw Error('Nonfinite gait');
  }
  results.push({speed,mode,min,lift,jump,jumpBone,jumpTime,anchorError:error,plantSamples:planted,slip:slip/Math.max(1,intervals),phase:a.motion.phase});
 }
 // The same source geometry must retain a rigid blade through the entire cut.
 const b=fresh();A.animateActor(a,b,time=0);let bladeMin=Infinity,bladeMax=0,maxTipStep=0,previous,plant=[],cut;
 for(let i=0;i<=160;i++){
  b.mode='attack';b.elapsed=i/240;A.animateActor(a,b,time=(i+1)/240);const h=a.weapon.localToWorld(new T.Vector3(0,.12,0)),tip=a.weapon.localToWorld(new T.Vector3(0,1.02,0)),length=h.distanceTo(tip);bladeMin=Math.min(bladeMin,length);bladeMax=Math.max(bladeMax,length);if(previous)maxTipStep=Math.max(maxTipStep,tip.distanceTo(previous));previous=tip;
  if(i===63)cut=tip.clone();if(b.elapsed>=.24&&b.elapsed<=.39)plant.push(a.legs[1].ankle.getWorldPosition(new T.Vector3()));
 }
 const plantSpan=Math.max(...plant.map(p=>Math.hypot(p.x-plant[0].x,p.z-plant[0].z)));
 let maxTurn=0;const body=fresh();A.animateActor(a,body,0);for(let i=1;i<=120;i++){body.yaw=2.9;const old=a.group.rotation.y;A.animateActor(a,body,i/120);maxTurn=Math.max(maxTurn,Math.abs(old-a.group.rotation.y));}
 const frozen=JSON.stringify(a.clipRig.joints.map(j=>j.quaternion.toArray()));A.animateActor(a,body,1);if(frozen!==JSON.stringify(a.clipRig.joints.map(j=>j.quaternion.toArray())))throw Error('Pose changes while paused');
 for(const lethal of [false,true]){
  const state=R.create();Object.assign(state.hero,{x:0,z:0});Object.assign(state.enemy,{x:0,z:1,hp:lethal?10:50});A.animateActor(a,state.hero,0);
  for(let i=0;i<30&&!state.hero.hits;i++){R.step(state,{attack:i===0},1/60);A.animateActor(a,state.hero,state.time);}
  if(state.hero.hits!==1||a.motion.clip!=='attack'||Math.abs(a.motion.attackTime-.26)>.02)throw Error('Damage is out of sync with cut');
  if(lethal){A.animateActor(a,state.hero,state.time+.41);if(a.motion.clip!=='idle')throw Error('Lethal cut never recovers');}
 }
 const enemy=A.createActor(scene,false,assets),e={...fresh(),max:50,mode:'windup',elapsed:.72};A.animateActor(enemy,e,0);const prep=enemy.clipRig.joints.map(j=>j.quaternion.clone());e.mode='attack';e.elapsed=0;A.animateActor(enemy,e,.001);const prepJump=Math.max(...prep.map((q,i)=>q.angleTo(enemy.clipRig.joints[i].quaternion)));
 for(const mode of ['dodge','hurt','dead']){const b={...fresh(),mode};A.animateActor(a,b,0);for(let i=1;i<=60;i++){b.elapsed=i/120;A.animateActor(a,b,i/120);if(!a.clipRig.joints.every(j=>j.quaternion.toArray().every(Number.isFinite)))throw Error('Nonfinite '+mode);}}
 // A real lit skin must respond to the same light as physical dungeon surfaces.
 const lighting=new T.Scene(),actor=A.createActor(lighting,true,assets);A.animateActor(actor,fresh(),0);const key=new T.DirectionalLight(0xffe4be,4);key.position.set(-3,5,4);lighting.add(key);
 const camera=new T.PerspectiveCamera(32,1,.1,30);camera.position.set(2.7,2.2,4.3);camera.lookAt(0,1.02,0);const target=new T.WebGLRenderTarget(128,128),renderer=arena.renderer;
 function brightness(){renderer.setRenderTarget(target);renderer.render(lighting,camera);const data=new Uint8Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,data);return data.reduce((sum,v,i)=>sum+(i%4===3?0:v),0);}
 const lit=brightness();key.intensity=0;const unlit=brightness();renderer.setRenderTarget(null);target.dispose();
 A.animateActor(a,fresh(),0);if(a.motion.phase!==0||a.motion.blend!==0||a.samples.length)throw Error('Reset did not clear pose');
 return {gaits:results,bladeMin,bladeMax,maxTipStep,cut:cut.toArray(),plantSpan,maxTurn,prepJump,lit,unlit};
}''')
 print(json.dumps(result,indent=2),flush=True)
 for g in result['gaits']:
  assert g['min']>.015 and g['lift']<.23 and g['jump']<.6,g
  assert g['plantSamples']>40 and g['anchorError']<.006 and g['slip']<.001,g
 assert result['gaits'][2]['phase']<0
 assert result['bladeMax']-result['bladeMin']<.00001 and result['maxTipStep']<.20 and result['cut'][2]>1.1,result
 assert result['plantSpan']<.003 and result['maxTurn']<=12/120+.00001 and result['prepJump']<.01,result
 assert result['lit']>10000 and result['unlit']<result['lit']*.1,result
 assert not errors,errors
 failed=browser.new_page();failed.route('**/assets/characters/warden.glb*',lambda route:route.fulfill(status=503,body='unavailable'));failed.goto(BASE);failed.wait_for_function('document.getElementById("enter").textContent==="다시 불러오기"',timeout=60000);assert failed.locator('#enter').is_visible();browser.close()
print('PASS continuous fast/slow/backward gait, floor contact and planted feet, rigid blade, planted strike, bounded turns, pause/reset, damage and lethal follow-through, enemy preparation, shared light and missing-model retry',flush=True)

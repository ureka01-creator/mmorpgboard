"""Actual vertex deformation, planted feet and mode transitions on the full skin."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load,BASE
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page(viewport={'width':1024,'height':768});load(page);assert page.evaluate('Math.abs(arena.hero.motion.time-arena.state.time)<.0001&&arena.hero.skins[0].isSkinnedMesh')
 page.click('#pause')
 result=page.evaluate('''async()=>{
 const {createActor,animateActor,footPoint}=await import('./arena-actors.mjs?v=2.5'),{loadMotionPack}=await import('./arena-clips.mjs?v=2.5'),THREE=await import('three');
 const assets=await loadMotionPack(),scene=new THREE.Scene(),a=createActor(scene,true,assets),other=createActor(scene,false,assets);
 const body=()=>({x:0,z:0,yaw:0,mode:'idle',elapsed:0,travel:0,swings:1});let b=body(),time=0;
 const snapshot=a=>JSON.stringify([...a.clipRig.joints.map(j=>[...j.position.toArray(),...j.quaternion.toArray()]),a.group.position.toArray(),a.samples.map(s=>s.map(p=>p.toArray()))]);
 animateActor(a,b,0);animateActor(other,body(),0);const otherBefore=snapshot(other);
 const s=a.skins[0],p=s.geometry.attributes.position,bind=[];for(let i=0;i<p.count;i+=17)bind.push(s.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(p,i)).toArray());
 let minFoot=Infinity,maxLift=0,maxJump=0,plantError=0,plantN=0,last=[null,null],groundMin=Infinity,groundMax=-Infinity;
 for(let i=0;i<360;i++){
  const old=a.clipRig.joints.map(j=>j.quaternion.clone());time+=1/120;b.mode='walk';b.z+=3.3/120;b.travel+=3.3/120;animateActor(a,b,time);
  old.forEach((q,n)=>maxJump=Math.max(maxJump,q.angleTo(a.clipRig.joints[n].quaternion)));
  for(let n=0;n<2;n++){const foot=footPoint(a,n);minFoot=Math.min(minFoot,foot.y);maxLift=Math.max(maxLift,foot.y);const f=a.motion.feet[n],ankle=a.legs[n].ankle.getWorldPosition(new THREE.Vector3());if(i>60&&f.planted&&f.weight>.9&&last[n]?.planted){plantError+=ankle.distanceTo(new THREE.Vector3().fromArray(last[n].p));plantN++;}last[n]={planted:f.planted&&f.weight>.9,p:ankle.toArray()};}
  groundMin=Math.min(groundMin,a.motion.ground);groundMax=Math.max(groundMax,a.motion.ground);
 }
 const runActive=a.motion.clip==='run',phase=a.motion.phase;
 let deformation=0,k=0;for(let i=0;i<p.count;i+=17){const v=s.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(p,i));deformation=Math.max(deformation,v.distanceTo(new THREE.Vector3().fromArray(bind[k++])));}
 const independent=snapshot(other)===otherBefore;
 b.mode='attack';for(let i=0;i<25;i++){time+=1/120;b.elapsed=i/120;b.z+=1.1/120;b.travel+=1.1/120;animateActor(a,b,time);}
 const layered=a.motion.clip==='attack'&&a.motion.phase>phase;const before=snapshot(a);animateActor(a,b,time);const frozen=before===snapshot(a);
 b.mode='idle';for(let i=0;i<120;i++){time+=1/120;animateActor(a,b,time);}const settled=a.motion.blend<.001&&a.motion.clip==='idle';
 b.yaw=Math.PI;let maxTurn=0;for(let i=0;i<60;i++){const old=a.group.rotation.y;time+=1/120;animateActor(a,b,time);maxTurn=Math.max(maxTurn,Math.abs(a.group.rotation.y-old));}
 for(const mode of ['dodge','hurt','dead']){b.mode=mode;b.elapsed=0;for(let i=0;i<90;i++){time+=1/120;b.elapsed+=1/120;animateActor(a,b,time);if(!a.clipRig.joints.every(j=>j.quaternion.toArray().every(Number.isFinite)))throw Error('Nonfinite pose '+mode);}}
 const back=createActor(scene,true,assets),retreat=body();retreat.mode='attack';animateActor(back,retreat,0);for(let i=1;i<=120;i++){retreat.z=-1.1*i/120;retreat.travel=1.1*i/120;retreat.elapsed=(i/120)%.66;animateActor(back,retreat,i/120);}const backwards=back.motion.phase<-.5&&back.clipRig.joints.every(j=>j.quaternion.toArray().every(Number.isFinite));
 const reset=body();reset.yaw=-1;animateActor(a,reset,0);const resetGood=a.motion.phase===0&&a.motion.clip==='idle'&&a.group.rotation.y===-1&&a.samples.length===0;
 return {backwards,skinCount:a.skins.length,boneCount:a.skins[0].skeleton.bones.length,deformation,independent,minFoot,maxLift,maxJump,plantAverage:plantError/plantN,plantN,groundMin,groundMax,runActive,layered,frozen,settled,maxTurn,resetGood};
}''');print(result,flush=True)
 assert result['skinCount']>0 and result['boneCount']==53 and result['deformation']>.2 and result['independent'],result
 assert result['backwards'],result
 assert result['runActive'] and result['layered'] and result['frozen'] and result['settled'] and result['resetGood'],result
 assert result['minFoot']>.015 and result['maxJump']<.5 and result['plantN']>10 and result['plantAverage']<.008 and result['maxLift']<.30,result
 assert result['groundMax']-result['groundMin']<.12,result
 assert result['maxTurn']<=16/120+.000001,result
 failed=browser.new_page();failed.route('**/assets/animations/fullplate-motion.json*',lambda route:route.fulfill(status=503,body='unavailable'))
 failed.goto(BASE,wait_until='networkidle');failed.wait_for_function('document.getElementById("enter").textContent==="다시 불러오기"');assert failed.evaluate('!window.arena?.renderer')
 browser.close()
print('PASS full skinned character: real vertex deformation, independent clones, sole/planting metrics, gait/attack, pause/reset and action transitions')

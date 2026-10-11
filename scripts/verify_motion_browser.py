"""Check authored clips on the real armour rig, including transitions and layering."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load,BASE
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 page=browser.new_page(viewport={'width':1024,'height':768});load(page);page.click('#pause')
 result=page.evaluate('''async()=>{
 const {createActor,animateActor}=await import('./arena-actors.mjs?v=2.2'),THREE=await import('three'),{actionTime}=await import('./arena-clips.mjs?v=2.2');
 const pack=arena.hero.clipRig.pack,scene=new THREE.Scene(),a=createActor(scene,true,pack);
 const body=()=>({x:0,z:0,yaw:0,mode:'idle',elapsed:0,travel:0,swings:1});
 const snapshot=a=>JSON.stringify([...a.clipRig.joints.map(j=>[...j.position.toArray(),...j.quaternion.toArray()]),a.cape.rotation.toArray(),a.samples.map(s=>s.map(p=>p.toArray()))]);
 let b=body(),time=0,minFoot=Infinity,maxLift=0,maxJump=0;
 animateActor(a,b,0);
 for(let i=0;i<240;i++){
  const old=a.clipRig.joints.map(j=>j.quaternion.clone());time+=1/120;b.mode='walk';b.z+=3.3/120;b.travel+=3.3/120;animateActor(a,b,time);
  old.forEach((q,n)=>maxJump=Math.max(maxJump,q.angleTo(a.clipRig.joints[n].quaternion)));
  a.legs.forEach(l=>{const p=l.ankle.getWorldPosition(new THREE.Vector3());minFoot=Math.min(minFoot,p.y-.136);maxLift=Math.max(maxLift,p.y-.136);});
 }
 const runActive=a.motion.clip==='run',phase=a.motion.phase;
 // Attack while moving retains authored locomotion on the legs.
 b.mode='attack';for(let i=0;i<20;i++){time+=1/120;b.elapsed=i/120;b.z+=3.3/120;b.travel+=3.3/120;animateActor(a,b,time);}
 const layered=a.motion.clip==='attack'&&a.motion.blend>.999&&a.motion.phase>phase;
 const before=snapshot(a);animateActor(a,b,time);const frozen=before===snapshot(a);
 b.mode='idle';for(let i=0;i<120;i++){time+=1/120;animateActor(a,b,time);}
 const settled=a.motion.blend<.001&&a.motion.clip==='idle';
 let maxTurn=0;b.yaw=Math.PI;for(let i=0;i<60;i++){const old=a.group.rotation.y;time+=1/120;animateActor(a,b,time);maxTurn=Math.max(maxTurn,Math.abs(a.group.rotation.y-old));}
 for(const mode of ['dodge','hurt','dead']){b.mode=mode;b.elapsed=0;for(let i=0;i<90;i++){time+=1/120;b.elapsed+=1/120;animateActor(a,b,time);if(!a.clipRig.joints.every(j=>j.quaternion.toArray().every(Number.isFinite)))throw Error('Nonfinite pose '+mode);}}
 const deathCapeHeight=a.cape.getWorldPosition(new THREE.Vector3()).y;
 const reset=body();reset.yaw=-1;animateActor(a,reset,0);const resetGood=a.motion.phase===0&&a.motion.clip==='idle'&&a.group.rotation.y===-1&&a.samples.length===0;
 const compare=[];for(const hz of [30,120]){const x=createActor(scene,true,pack),p=body();animateActor(x,p,0);for(let i=1;i<=hz*2;i++){p.mode='walk';p.z=3.3*i/hz;p.travel=p.z;animateActor(x,p,i/hz);}compare.push(x);}
 const fpsError=Math.max(...compare[0].clipRig.joints.map((j,i)=>j.quaternion.angleTo(compare[1].clipRig.joints[i].quaternion)));
 const timing={hero:actionTime('attack',.26,true,pack.clips),enemy:actionTime('attack',.18,false,pack.clips),windup:actionTime('windup',.72,false,pack.clips),attackStart:actionTime('attack',0,false,pack.clips)};
 return {deathCapeHeight,minFoot,maxLift,maxJump,runActive,layered,frozen,settled,maxTurn,resetGood,fpsError,timing,sources:Object.fromEntries(Object.entries(pack.clips).map(([k,v])=>[k,v.source]))};
}''')
 print(result,flush=True)
 assert result['deathCapeHeight']<.65,result
 assert result['runActive'] and result['layered'] and result['frozen'] and result['settled'] and result['resetGood'],result
 assert result['minFoot']>-.00001 and result['maxLift']>.06 and result['maxJump']<.8,result
 assert result['maxTurn']<=12/120+.000001 and result['fpsError']<.3,result
 assert abs(result['timing']['hero']-.45)<1e-9 and abs(result['timing']['enemy']-.45)<1e-9,result
 assert result['timing']['windup']==result['timing']['attackStart'],result
 # A missing clip pack must surface a retryable load error instead of starting a broken game.
 failed=browser.new_page();failed.route('**/assets/animations/knight-motion.json*',lambda route:route.fulfill(status=503,body='unavailable'))
 failed.goto(BASE,wait_until='networkidle');failed.wait_for_function('document.getElementById("enter").textContent==="다시 불러오기"')
 assert failed.locator('#load-copy').is_visible();assert failed.evaluate('!window.arena?.renderer')
 browser.close()
print('PASS actual authored rig: run/attack layering, floor clearance, transitions, pause/reset, 30/120Hz poses, strike timing, load error recovery')

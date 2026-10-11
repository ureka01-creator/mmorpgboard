"""Exercise the actual articulated actor across movement, turns, attacks and reset."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 page=browser.new_page(viewport={'width':1024,'height':768});load(page);page.click('#pause')
 result=page.evaluate('''async()=>{
 const {animateActor}=await import('./arena-actors.mjs?v=2.1'),THREE=await import('three');
 const a=arena.hero,b={...arena.state.hero,mode:'walk',x:0,z:0,yaw:0,travel:0,elapsed:0};
 let time=0,minFoot=Infinity,maxLift=0,plantError=0,plantN=0,last=[null,null],maxTurn=0;
 animateActor(a,b,time);
 for(let i=0;i<240;i++){
  time+=1/120;b.z+=3.3/120;b.travel+=3.3/120;animateActor(a,b,time);
  a.legs.forEach((leg,n)=>{
   const f=a.motion.feet[n],p=leg.ankle.getWorldPosition(new THREE.Vector3());
   minFoot=Math.min(minFoot,p.y-.136);maxLift=Math.max(maxLift,p.y-.136);
   if(i>40&&f.stance&&last[n]?.stance&&a.motion.phase%1>.12&&a.motion.phase%1<.4){plantError+=Math.hypot(p.x-last[n].x,p.z-last[n].z);plantN++;}
   last[n]={x:p.x,z:p.z,stance:f.stance};
  });
 }
 const walkPhase=a.motion.phase;b.mode='idle';
 for(let i=0;i<100;i++){time+=1/120;animateActor(a,b,time);}
 const stoppedBlend=a.motion.blend,stopFoot=a.legs.map(l=>l.ankle.getWorldPosition(new THREE.Vector3()).y-.136);
 b.yaw=Math.PI;
 for(let i=0;i<60;i++){const old=a.group.rotation.y;time+=1/120;animateActor(a,b,time);maxTurn=Math.max(maxTurn,Math.abs(a.group.rotation.y-old));}
 const snapshot=JSON.stringify(a.model.toJSON());animateActor(a,b,time);const pausedStable=JSON.stringify(a.model.toJSON())===snapshot;
 const cuts=[];for(const swings of [1,2]){b.mode='attack';b.swings=swings;for(let i=0;i<40;i++){time+=1/120;b.elapsed=i/120;animateActor(a,b,time);}cuts.push(a.chest.rotation.y);}
 const reset={...b,x:0,z:0,yaw:-1,travel:0,mode:'idle',elapsed:0};animateActor(a,reset,0);
 return {minFoot,maxLift,plantAverage:plantError/plantN,plantN,walkPhase,stoppedBlend,stopFoot,maxTurn,pausedStable,cuts,resetPhase:a.motion.phase,resetYaw:a.group.rotation.y};
}''')
 print(result,flush=True)
 assert result['minFoot']>-.04 and result['maxLift']>.06,result
 assert result['plantN']>10 and result['plantAverage']<.008,result
 assert result['stoppedBlend']<.001 and max(abs(x) for x in result['stopFoot'])<.02,result
 assert result['maxTurn']<=12/120+.000001 and result['pausedStable'],result
 assert result['cuts'][0]*result['cuts'][1]<0,result
 assert result['resetPhase']==0 and result['resetYaw']==-1,result
 browser.close()
print('PASS actual rig: foot floor clearance/planting, settle, bounded turns, frozen pause, alternate cuts and reset')

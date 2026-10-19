"""Measure rendered gait acceleration at key boundaries; this is not a naturalness score."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review as load
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=b.new_page();load(page)
 result=page.evaluate('''async()=>{
 const T=await import('three'),{createActor,animateActor,loadSpriteAssets}=await import('./arena-sprites.mjs?v=2.13'),assets=await loadSpriteAssets();
 const scene=new T.Scene(),a=createActor(scene,true,assets);a.shadow.visible=false;const r=arena.renderer,target=new T.WebGLRenderTarget(192,192),c=new T.OrthographicCamera(-1.7,1.7,1.7,-1.7,.1,80);c.position.set(4.8,15.8,8.7);c.lookAt(0,1,0);let time=10;
 const pix=()=>{r.setRenderTarget(target);r.setClearColor(0,0);r.render(scene,c);const p=new Uint8Array(192*192*4);r.readRenderTargetPixels(target,0,0,192,192,p);return p;};
 const results=[];
 const body={x:0,z:0,yaw:0,mode:'walk',elapsed:0,travel:0,max:40};
 function frame(d,phase,curve){body.yaw=Math.atan2(4.8,8.7)+d*Math.PI/4;a.motion=undefined;animateActor(a,body,time+=1);a.motion.phase=phase/12;animateActor(a,body,time+=.001);a.flow.u.motionGait.value=curve;return pix();}
 const acceleration=(x,y,z)=>y.reduce((sum,v,i)=>sum+Math.abs(z[i]-2*v+x[i]),0);
 for(let d=0;d<8;d++)for(let k of [0,3,6,9]){
 const linear=acceleration(frame(d,k-.04,0),frame(d,k,0),frame(d,k+.04,0));
 const curved=acceleration(frame(d,k-.04,1),frame(d,k,1),frame(d,k+.04,1));
 results.push({d,k,ratio:curved/linear,linear,curved});}
 r.setRenderTarget(null);target.dispose();return results;
 }''');mean=sum(x['ratio']for x in result)/len(result)
 assert len(result)==32 and max(x['ratio']for x in result)<1 and mean<.8,result
 print('PASS 32 GPU gait boundaries: curved/linear second-difference ratio',{'mean':mean,'max':max(x['ratio']for x in result)},flush=True);b.close()

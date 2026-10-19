"""Sweep the attack rather than just key poses for floating reconstruction patches.
At 192x192, allow at most 25 extra disconnected alpha pixels (edge remnants);
this catches the original 66-pixel boot copied into an unrelated sword area.
The earlier SW boot regression in verify_sprite_flow_browser retains its tighter limit.
"""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load_review as load
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=b.new_page();load(page)
 result=page.evaluate('''async()=>{
 const T=await import('three'),{createActor,animateActor,loadSpriteAssets}=await import('./arena-sprites.mjs?v=2.14'),assets=await loadSpriteAssets();
 const scene=new T.Scene(),a=createActor(scene,true,assets);a.shadow.visible=false;const r=arena.renderer,target=new T.WebGLRenderTarget(192,192),c=new T.OrthographicCamera(-1.7,1.7,1.7,-1.7,.1,80);c.position.set(4.8,15.8,8.7);c.lookAt(0,1,0);let time=10;
 const pix=()=>{r.setRenderTarget(target);r.setClearColor(0,0);r.render(scene,c);const p=new Uint8Array(192*192*4);r.readRenderTargetPixels(target,0,0,192,192,p);return p;};
 function fragments(image){const seen=new Uint8Array(192*192),sizes=[];for(let i=0;i<seen.length;i++)if(!seen[i]&&image[i*4+3]>100){const q=[i];seen[i]=1;let size=0;while(q.length){const at=q.pop();size++;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=at%192+dx,y=Math.floor(at/192)+dy,n=y*192+x;if(x>=0&&x<192&&y>=0&&y<192&&!seen[n]&&image[n*4+3]>100){seen[n]=1;q.push(n);}}}sizes.push(size);}sizes.sort((a,b)=>b-a);return sizes.slice(1).reduce((a,b)=>a+b,0);}
 const results=[];
 for(let d=0;d<8;d++)for(let i=1;i<32;i++){
 const body={x:0,z:0,yaw:Math.atan2(4.8,8.7)+d*Math.PI/4,mode:'attack',elapsed:i*.02,travel:0,max:40};animateActor(a,body,time+=1);a.flow.blade.visible=false;const cut=fragments(pix());a.flow.u.motionSwords.value=0;a.flow.head.visible=false;const uncut=fragments(pix());results.push({d,t:body.elapsed,excess:cut-uncut,cut,uncut});
 }r.setRenderTarget(null);target.dispose();return results.sort((a,b)=>b.excess-a.excess);
 }''');assert len(result)==248 and result[0]['excess']<=25,result[:10];print('PASS 248 GPU attack poses / no large detached body patch',{'worstExcessPixels':result[0]['excess'],'worstPose':result[0]},flush=True);b.close()

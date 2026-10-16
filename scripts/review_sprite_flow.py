"""Save actual WebGL poses with the approved source art; no atlas images are edited."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'docs/motion-review-v2.11';out.mkdir(exist_ok=True)
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page(viewport={'width':1120,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text)if m.type=='error'else None);load(page);page.click('#pause')
 for d in range(8):
  data=page.evaluate('''async(d)=>{
   const T=await import('three'),{createActor,animateActor,loadSpriteAssets}=await import('./arena-sprites.mjs?v=2.11'),assets=await loadSpriteAssets();
   const s=new T.Scene(),a=createActor(s,true,assets),r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(280,260);r.setClearColor(0x686a64,1);
   const c=new T.OrthographicCamera(-1.7,1.7,1.45,-1.45,.01,40);c.position.set(4.8,15.8,8.7);c.lookAt(0,1.1,0);const frames=[],body={x:0,z:0,yaw:Math.atan2(4.8,8.7)+d*Math.PI/4,mode:'walk',elapsed:0,travel:0,max:40};let time=0;
   function shot(label){animateActor(a,body,time+=.01);r.render(s,c);frames.push({label,image:r.domElement.toDataURL()});}
   for(let i of [.5,2.5,4.5,6.5,8.5,10.5]){body.travel=i*2.24/12+.00001;shot('walk '+i);}
   for(let t of [0,.05,.105,.15,.22,.25,.26,.36,.50,.56]){body.mode='attack';body.elapsed=t;shot('attack '+t);}
   r.dispose();return frames;
  }''',d)
  page.evaluate('''frames=>{const d=document.createElement('div');d.id='sheet';d.style.cssText='position:absolute;left:0;top:0;width:1120px;background:#18202a;color:white;font:14px sans-serif;z-index:99999;display:grid;grid-template-columns:repeat(4,280px)';d.innerHTML=frames.map(f=>'<div>'+f.label+'<img style="display:block" src="'+f.image+'"></div>').join('');document.getElementById('sheet')?.remove();document.body.appendChild(d);}''',data)
  page.locator('#sheet').screenshot(path=str(out/f'direction-{d}.png'));print('rendered',d,flush=True)
 assert not errors,errors;browser.close()

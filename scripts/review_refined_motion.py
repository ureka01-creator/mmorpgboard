import sys,base64
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
out=ROOT/'docs/motion-review-v2.8';out.mkdir(exist_ok=True)
from verify_arena_browser import ARGS,load
from playwright.sync_api import sync_playwright
with sync_playwright()as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);p=b.new_page(viewport={'width':1120,'height':1140});load(p);p.click('#pause');errors=[];p.on('console',lambda m:errors.append(m.text)if m.type=='error'else None)
 for d in range(8):
  data=p.evaluate('''async(d)=>{
 const T=await import('three'),{createActor,animateActor,loadSpriteAssets}=await import('./arena-sprites.mjs?v=2.8');const {pack,textures}=await loadSpriteAssets();
 const s=new T.Scene(),a=createActor(s,true,{pack,textures}),r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(280,260);r.setClearColor(0x686a64,1);const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshBasicMaterial({color:0x686a64}));floor.rotation.x=-Math.PI/2;s.add(floor);const c=new T.OrthographicCamera(-1.5,1.5,1.4,-1.4,.01,40);c.position.set(4.8,15.8,8.7);c.lookAt(0,1.1,0);const frames=[],body={x:0,z:0,yaw:Math.atan2(4.8,8.7)+d*Math.PI/4,mode:'idle',elapsed:0,travel:0,max:40};
 function shot(t,label){animateActor(a,body,t);r.render(s,c);frames.push({label:label+' '+a.motion.clip+'/'+a.motion.frame,image:r.domElement.toDataURL()});}
 shot(0,'idle');for(let i=0;i<12;i++){body.mode='walk';body.travel=i*2.24/12+.001;shot(.10+i/12,'gait');}for(const t of [0,.09,.18,.23,.26,.40,.56]){body.mode='attack';body.elapsed=t;shot(2+t,'strike '+t);}r.dispose();return frames;
}''',d);p.evaluate("""frames=>{const d=document.createElement('div');d.id='refined-sheet';d.style.cssText='position:absolute;left:0;top:0;width:1120px;background:#18202a;color:white;font:14px sans-serif;z-index:99999;display:grid;grid-template-columns:repeat(4,280px)';d.innerHTML=frames.map(f=>'<div>'+f.label+'<img style="display:block" src="'+f.image+'"></div>').join('');document.getElementById('refined-sheet')?.remove();document.body.appendChild(d);} """,data);p.locator('#refined-sheet').screenshot(path=str(out/f'direction-{d}.png'))
 assert not errors,errors;b.close()

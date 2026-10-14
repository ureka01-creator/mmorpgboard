"""Render enlarged diagnostic poses using the production actor, not a target mockup.
ARENA_BASE=http://127.0.0.1:8034/ python scripts/review_sprite_motion.py --out /tmp/motion-review
"""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,load
parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,default=Path('/tmp/elderfall-motion-review'));args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 page=browser.new_page(viewport={'width':1120,'height':1140});load(page);page.click('#pause')
 data=page.evaluate('''async()=>{
 const T=await import('three'),{createActor,animateActor,loadSpriteAssets}=await import('./arena-sprites.mjs?v=2.7'),scene=new T.Scene(),a=createActor(scene,true,await loadSpriteAssets()),r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(280,260);r.setClearColor(0x18202a,1);
 const c=new T.OrthographicCamera(-1.5,1.5,1.4,-1.4,.01,40),yaw=Math.atan2(4.8,8.7);c.position.set(4.8,15.8,8.7);c.lookAt(0,1.1,0);
 const rows=[];
 for(let d=0;d<8;d++){
  const frames=[],body={x:0,z:0,yaw:yaw+d*Math.PI/4,mode:'idle',elapsed:0,travel:0,max:40};
  function shot(time,label){animateActor(a,body,time);r.render(scene,c);frames.push({label:label+' · '+a.motion.clip+'/'+a.motion.frame,image:r.domElement.toDataURL()});}
  shot(0,'idle');
  for(let i=0;i<8;i++){body.mode='walk';body.travel=i*2.24/8+.001;shot(.1+i/8,'run '+i);}
  for(const t of [0,.13,.22,.26,.47,.56]){body.mode='attack';body.elapsed=t;shot(1.1+t,'attack '+t.toFixed(2)+'s');}
  body.mode='idle';shot(0,'returned idle');rows.push(frames);
 }
 r.dispose();return rows;
}''')
 for d,frames in enumerate(data):
  page.set_content('<html><body style="margin:0;background:#18202a;color:white;font:14px sans-serif"><p style="margin:0;height:24px">Production sprite diagnostic · facing '+str(d)+' · enlarged orthographic camera</p><main style="display:grid;grid-template-columns:repeat(4,280px)">'+''.join('<div style="height:279px">'+f['label']+'<img style="display:block" src="'+f['image']+'"></div>' for f in frames)+'</main></body></html>')
  page.screenshot(path=str(args.out/f'facing-{d}.png'),full_page=True)
 browser.close();print('Rendered all eight directional gait / strike / return pose sheets:',args.out)

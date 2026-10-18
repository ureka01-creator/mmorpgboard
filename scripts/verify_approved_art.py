"""Prevent the approved 2.8 art from being replaced at either published entry."""
import hashlib,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('ARENA_ORIGIN','http://127.0.0.1:8036/')
files=['assets/sprites/warrior.json',*[str(p.relative_to(ROOT)) for p in sorted((ROOT/'assets/sprites/refined').glob('*.png'))],'assets/sprites/warrior/dodge-front.png','assets/sprites/warrior/dodge-back.png']
for name in files:
 approved=subprocess.check_output(['git','show','4f9244c:'+name],cwd=ROOT)
 assert hashlib.sha256((ROOT/name).read_bytes()).digest()==hashlib.sha256(approved).digest(),name
assert (ROOT/'index.html').read_bytes()==(ROOT/'study.html').read_bytes()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 for entry in ['','study.html']:
  page=browser.new_page(viewport={'width':1024,'height':768});requests=[];errors=[]
  page.on('request',lambda req:requests.append(req.url));page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+entry,wait_until='networkidle');page.wait_for_function('window.arena?.hero',timeout=60000)
  assert page.evaluate('arena.hero.renderType==="directional-sprite"&&arena.enemy.renderType==="directional-sprite"&&arena.hero.pack.refined===true')
  assert not any('.glb' in url or 'arena-study-actors' in url for url in requests),requests
  # Same original idle image at both positions; only a bounded tint changes.
  result=page.evaluate('''async()=>{
   const {animateActor}=await import('./arena-sprites.mjs?v=2.12'),a=arena.hero;
   const b={x:0,z:0,yaw:0,mode:'idle',elapsed:0,travel:0};animateActor(a,b,0);
   const center=a.sprite.material.color.clone(),frame=a.motion.frame,atlas=a.motion.atlas;
   b.x=-4;b.z=-2;animateActor(a,b,1);const near=a.sprite.material.color.clone();
   if(frame!==a.motion.frame||atlas!==a.motion.atlas)throw Error('Lighting changed art');
   if(near.r<=center.r||near.b>=center.b)throw Error('No warm light pool');
   if([...near,...center].some(n=>n<.9||n>1))throw Error('Excessive recoloring');
   return {center:center.toArray(),near:near.toArray()};
  }''')
  assert not errors,errors
  print('PASS approved illustrated art, no model requests, bounded light tint',entry or 'index.html',result,flush=True)
  page.close()
 browser.close()
print('PASS all 10 PNG originals and pose metadata byte-identical to approved release 2.8',flush=True)

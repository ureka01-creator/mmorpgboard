"""Compare real HTTPS publication bytes and play the same verified 3D scene in Chromium."""
import hashlib,mimetypes,time,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,fight
ROOT=Path(__file__).resolve().parents[1];BASE='https://ureka01-creator.github.io/mmorpgboard/'
FILES=['index.html','arena.css','arena.js','arena-engine.mjs','arena-art.mjs','arena-sprites.mjs','arena-sprite-motion.mjs','assets/sprites/warrior.json','assets/sprites/LICENSE.txt',*[str(p.relative_to(ROOT)) for p in sorted((ROOT/'assets/sprites/warrior').glob('*.png'))],'assets/3d/crest.svg',*[str(p.relative_to(ROOT)) for p in sorted((ROOT/'vendor/three').rglob('*')) if p.is_file()]]
verified={};content_types={}
for name in FILES:
 url=BASE+('' if name=='index.html' else name)+'?release=2.7'
 for attempt in range(4):
  try:
   with urllib.request.urlopen(url,timeout=40) as response:
    body=response.read();content_types[name]=response.headers.get('Content-Type','application/octet-stream')
   break
  except urllib.error.HTTPError as error:
   if error.code not in (502,503,504) or attempt==3:raise
   time.sleep(3)
 assert hashlib.sha256(body).digest()==hashlib.sha256((ROOT/name).read_bytes()).digest(),f'Deployed bytes differ: {name}'
 if name.endswith(('.js','.mjs')):assert 'javascript' in content_types[name],f'Invalid ES module MIME type: {name}: {content_types[name]}'
 if name.endswith('.css'):assert content_types[name].startswith('text/css')
 verified[name]=body;print('PASS deployed SHA256',name,flush=True)
# Python verifies TLS with system trust; Chromium consumes exactly those verified response bytes.
# No TLS verification is disabled to work around the cloud browser's proxy certificate store.
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True)
 def route(req):
  name=unquote(urlparse(req.request.url).path).removeprefix('/mmorpgboard/') or 'index.html'
  if name in verified:req.fulfill(status=200,content_type=content_types[name],body=verified[name])
  else:req.fulfill(status=404,body='')
 context.route('https://ureka01-creator.github.io/**',route);page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(BASE+'?release=2.7',wait_until='networkidle');page.wait_for_function('window.arena?.renderer&&document.getElementById("enter").offsetWidth>0',timeout=60000)
 assert page.locator('meta[name="application-version"]').get_attribute('content')=='2.7'
 page.click('#enter');page.wait_for_function('document.getElementById("loading").hidden')
 assert page.evaluate('arena.hero.headDiameter/arena.hero.height<.17&&arena.hero.renderType==="directional-sprite"&&arena.hero.pack.frames.run.length===8&&arena.hero.sprite.material.map.image.width===1536')
 travel=page.evaluate('arena.state.hero.travel');page.keyboard.down('d');page.wait_for_function('(v)=>arena.state.hero.travel>v+.3&&arena.hero.motion.clip==="run"',arg=travel,timeout=30000);page.keyboard.up('d')
 page.click('#dodge');page.wait_for_function('arena.state.hero.dodgeCooldown>0',timeout=30000)
 page.click('#reset');page.click('#reset-confirm');fight(page)
 assert not errors,errors
 page.screenshot(path='/tmp/elderfall-nox-public.png');browser.close()
print(f'PASS public release 2.7: {len(FILES)} exact publication files, real 3D, direct movement, dodge, real-time sword combat and victory',flush=True)

"""Compare real HTTPS publication bytes and play the same verified 3D scene in Chromium."""
import hashlib,mimetypes,time,urllib.request,urllib.error,sys
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,fight
ROOT=Path(__file__).resolve().parents[1];BASE='https://ureka01-creator.github.io/mmorpgboard/'
from publication_files import publication_files
FILES=publication_files(ROOT)
verified={};content_types={}
for name in FILES:
 url=BASE+('' if name=='index.html' else name)+'?release=2.14'
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
def route(req):
 name=unquote(urlparse(req.request.url).path).removeprefix('/mmorpgboard/')or'index.html'
 if name in verified:req.fulfill(status=200,content_type=content_types[name],body=verified[name])
 else:req.fulfill(status=404,body='')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
 for entry,version,render_type in ([] if '--motion-only' in sys.argv else [('', '2.14','directional-sprite'),('study.html','2.14','directional-sprite')]):
  context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True)
  context.route('https://ureka01-creator.github.io/**',route);page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(BASE+entry+'?release='+version,wait_until='networkidle');page.wait_for_function('window.arena?.renderer&&document.getElementById("enter").offsetWidth>0',timeout=60000)
  assert page.locator('meta[name="application-version"]').get_attribute('content')==version
  page.click('#enter');page.wait_for_function('document.getElementById("loading").hidden')
  assert page.evaluate('(kind)=>arena.hero.renderType===kind&&arena.hero.headDiameter/arena.hero.height<.17',render_type)
  if render_type=='directional-sprite':assert page.evaluate('arena.hero.pack.schema===2&&arena.hero.pack.frames.run.every(row=>row.length===12)&&arena.hero.pack.frames.attack.every(row=>row.length===7)')
  assert page.evaluate('!!arena.hero.flow&&!!arena.enemy.flow'), 'Continuous motion was not loaded'
  travel=page.evaluate('arena.state.hero.travel');page.keyboard.down('d');page.wait_for_function('(v)=>arena.state.hero.travel>v+.3',arg=travel,timeout=30000);page.keyboard.up('d')
  page.click('#dodge');page.wait_for_function('arena.state.hero.dodgeCooldown>0',timeout=30000)
  page.click('#reset');page.click('#reset-confirm');fight(page)
  assert not errors,errors
  page.screenshot(path='/tmp/elderfall-public-'+('study-' if entry else '')+version+'.png');context.close();print('PASS public play',version,'movement, dodge, five hits, victory and result',flush=True)
 context=browser.new_context(viewport={'width':1024,'height':768})
 context.route('https://ureka01-creator.github.io/**',route);page=context.new_page();resource_errors=[];page.on('pageerror',lambda e:resource_errors.append(str(e)))
 page.goto(BASE+'motion-resources.html?release=1',wait_until='networkidle');page.wait_for_function('window.motionResources?.cards.length===4',timeout=60000)
 result=page.evaluate('''()=>{
 const r=motionResources;r.setTime(.05);const first=r.cards.map(c=>{const q=[];c.model.traverse(o=>{if(o.isBone)q.push(o.quaternion.clone())});return q});r.setTime(.45);
 const result=r.cards.map((c,i)=>{let changed=0,n=0;c.model.traverse(o=>{if(o.isBone&&o.quaternion.angleTo(first[i][n++])>.02)changed++});if(changed<5)throw Error('Native animation is static '+c.name);return {clip:c.name,changedBones:changed};});
 r.setClip(3,'Melee_1H_Attack_Slice_Horizontal');r.setTime(.4);r.setClip(3,'Melee_1H_Attack_Chop');r.setTime(.4);return result;
 }''')
 assert not resource_errors,resource_errors;page.screenshot(path='/tmp/elderfall-public-motion-resources.png');context.close();print('PASS public native walk/sword resource playback and clip selection',result,flush=True)
 context=browser.new_context(viewport={'width':1024,'height':768})
 context.route('https://ureka01-creator.github.io/**',route);page=context.new_page();art_errors=[];page.on('pageerror',lambda e:art_errors.append(str(e)))
 page.goto(BASE+'warrior-motion.html?release=2',wait_until='networkidle');page.wait_for_function('window.warriorMotion',timeout=60000)
 page.click('#walk');page.evaluate('warriorMotion.setTime(.2)');assert page.evaluate('warriorMotion.equipment.audit.feet.L.length===2')
 page.click('#attack');page.evaluate('warriorMotion.setTime(.5)');assert page.evaluate('warriorMotion.clip==="attack"&&warriorMotion.manifest.clips.attack.frames===24')
 regression=page.evaluate('''()=>{const r=warriorMotion;r.setClip('walk');r.setTime(0);const a=r.equipment.audit.feet.L[1]-r.equipment.audit.feet.R[1];r.setTime(r.manifest.clips.walk.duration/2);const b=r.equipment.audit.feet.L[1]-r.equipment.audit.feet.R[1];if(!(a>35&&b<-35))throw Error('Leading foot does not alternate');r.setClip('attack');const id=r.equipment.shield.uuid;for(let i=0;i<48;i++){r.setTime(r.manifest.clips.attack.duration*i/48);if(!r.equipment.shield.visible||r.equipment.shield.material.opacity!==1||r.equipment.shield.uuid!==id)throw Error('Shield disappeared');}return {leadingFeet:[a,b],shieldSamples:48};}''')
 assert not art_errors,art_errors;page.screenshot(path='/tmp/elderfall-public-warrior-motion.png');context.close();print('PASS public illustrated/native comparison, walk/attack selection and rendered poses',flush=True)
 browser.close()
print(f'PASS {len(FILES)} exact HTTPS publication files, '+('illustrated gait alternation and persistent shield' if '--motion-only' in sys.argv else 'approved illustrated character at both 2.14 entries'),flush=True)

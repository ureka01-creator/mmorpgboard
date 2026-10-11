"""Verify public HTTPS bytes, then play those exact bytes in Chromium with system-trust fetches."""
import hashlib,mimetypes,time,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
from verify_rpg_browser import interact,fight,ready,snapshot
ROOT=Path(__file__).resolve().parents[1]
BASE='https://ureka01-creator.github.io/mmorpgboard/'
FILES=['index.html','styles.css','rpg-engine.js','app.js','assets/rpg-world.png','assets/rpg-characters.png','assets/heroes.png']
verified={}
for name in FILES:
 url=BASE+('' if name=='index.html' else name)+'?release=1.0'
 for attempt in range(4):
  try:
   with urllib.request.urlopen(url,timeout=30) as response:body=response.read()
   break
  except urllib.error.HTTPError as error:
   if error.code not in (502,503,504) or attempt==3:raise
   time.sleep(3)
 assert hashlib.sha256(body).digest()==hashlib.sha256((ROOT/name).read_bytes()).digest(),f'Deployed bytes differ: {name}'
 verified[name]=body
 print('PASS deployed SHA256',name,flush=True)
# Python HTTPS uses system trust. The browser consumes those TLS-verified deployed bytes.
# This preserves TLS verification when the cloud Chromium proxy CA is not installed.
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True)
 context.add_init_script('let qaSeed=7;Math.random=()=>{qaSeed=(qaSeed*1664525+1013904223)>>>0;return qaSeed/4294967296;}')
 def route(req):
  path=unquote(urlparse(req.request.url).path).removeprefix('/mmorpgboard/');name=path or 'index.html'
  if name in verified:req.fulfill(status=200,content_type=mimetypes.guess_type(name)[0] or 'application/octet-stream',body=verified[name])
  else:req.fulfill(status=404,body='')
 context.route('https://ureka01-creator.github.io/**',route)
 page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(BASE+'?release=1.0',wait_until='networkidle');assert page.locator('meta[name="application-version"]').get_attribute('content')=='1.0'
 page.click('#start');assert page.evaluate('E.validate(state)')
 interact(page,'elder');page.click('[data-choice="help"]');page.click('[data-choice="leave"]')
 for name in ['mage','priest']:interact(page,name);page.click('[data-choice="recruit"]')
 interact(page,'gate');assert page.evaluate('state.combat')
 before=snapshot(page);page.reload(wait_until='networkidle');page.click('#continue');assert snapshot(page)==before
 fight(page);ready(page);assert page.evaluate('!state.combat&&!state.outcome')
 interact(page,'relic');interact(page,'gate');interact(page,'elder');page.click('[data-choice="report"]')
 assert page.evaluate('state.outcome==="victory"&&state.gold===17&&E.validate(state)')
 assert page.locator('#ending').is_visible();assert not errors,errors
 page.screenshot(path='/tmp/elderfall-rpg-public.png');browser.close()
print('PASS public release 1.0: exact deployed bytes, touch adventure, recruitment, tactical battle, save/resume, relic and ending',flush=True)

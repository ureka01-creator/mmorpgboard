import hashlib,mimetypes,time,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE='https://ureka01-creator.github.io/mmorpgboard/'
FILES=['index.html','styles.css','game-engine.js','app.js','assets/world-map.png','assets/realm-map.png','assets/cards.png','assets/gear.png','assets/heroes.png','assets/enemies.png']
verified={}
for name in FILES:
 url=BASE+('' if name=='index.html' else name)+'?release=0.8'
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
# Python HTTPS uses system trust. Browser tests use these exact TLS-verified deployed bytes;
# the cloud browser's independent CA store cannot trust its network proxy certificate.
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True)
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 def route(req):
  path=unquote(urlparse(req.request.url).path).removeprefix('/mmorpgboard/');name=path or 'index.html'
  if name in verified:req.fulfill(status=200,content_type=mimetypes.guess_type(name)[0] or 'application/octet-stream',body=verified[name])
  else:req.fulfill(status=404,body='')
 page.route('https://ureka01-creator.github.io/**',route)
 page.goto(BASE+'?release=0.8',wait_until='networkidle')
 assert page.locator('meta[name="application-version"]').get_attribute('content')=='0.8'
 page.click('#demo');page.click('#roll');page.wait_for_function('!busy')
 assert page.evaluate('state.battle.dice.map(d=>d.value).join()')=='5,2,4,4'
 page.click('[data-skill="strike"]');page.click('[data-die="0"]');page.click('[data-skill="protect"]');page.click('[data-die="1"]')
 assert page.evaluate('state.battle.assignments.length')==2
 predicted=page.evaluate('E.tacticalPreview(state).after[0]')
 page.click('#resolve');page.wait_for_function('!busy')
 assert page.evaluate('E.hero(state).hp')==predicted
 assert page.evaluate('state.battle.round')==2
 assert page.evaluate('localStorage.getItem(SAVE)') is None
 page.click('#demo-exit');page.click('#start')
 assert page.locator('#world-scene').is_visible()
 assert page.locator('.region-node').count()==16
 assert page.evaluate('!worldMenuOpen&&document.querySelector("#board").getBoundingClientRect().width===innerWidth&&document.querySelector("#board").getBoundingClientRect().height===innerHeight')
 page.click('#board [data-region="C4"]');page.click('#explore')
 assert page.evaluate('!worldMenuOpen&&E.hero(state).pos==="C4"')
 page.click('#menu-toggle');page.click('#explore')
 page.click('#board [data-region="C5"]');page.click('#explore')
 assert page.evaluate('!worldMenuOpen&&E.hero(state).quests[0].ready')
 page.click('#menu-toggle');page.click('header [data-sheet="quests"]');page.click('[data-claim="herbs"]');page.click('[data-reward="1"]');page.click('#loot-confirm')
 assert page.evaluate('E.hero(state).bag.includes(1)&&E.hero(state).xp===2')
 assert not errors,errors
 page.screenshot(path='/tmp/elderfall-v08-public.png')
 browser.close()
print('PASS public release 0.8: deployment bytes, rehearsal allocation/execution, fullscreen map, sliding menu, travel and reward',flush=True)

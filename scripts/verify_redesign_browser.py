"""Playable redesign QA: allocations, reward choices, rehearsal isolation, animation and touch layout."""
import os
from playwright.sync_api import sync_playwright
URL=os.environ.get('ELDERFALL_TEST_URL','http://127.0.0.1:8002/')
checks=0
def check(ok,name):
 global checks
 assert ok,name
 checks+=1
 print('PASS',name)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='networkidle')
 def read(js):return page.evaluate(js)
 def click(s):
  page.locator(s).click();page.wait_for_function('!busy')
 def fixture(js="state=E.create([0]);E.hero(state).pos='E3';"):
  read("demoMode=false;chosenSkill=null;rerollMode=false;battleHero=0;skillTarget=0;"+js+"render();")
 def inside(s):
  r=page.locator(s).bounding_box();v=page.viewport_size
  return r and r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=v['width']+1 and r['y']+r['height']<=v['height']+1
 # Real tutorial roll exposes both successes and failed eyes.
 click('#demo');check(read('demoMode&&state.battle.enemy==="wolf"'),'Home starts isolated knight rehearsal')
 click('#roll');check(read('state.battle.dice.map(d=>d.value).join()')=='5,2,4,4','First rehearsal roll demonstrates attack, low eye and block')
 check(page.locator('.cube-face').count()==24,'Four tangible dice each have six pip faces')
 check(read('Array.from(document.querySelectorAll(".cube-face i")).every(el=>!!el.style.gridArea)'),'Pip positions are rendered on a three-by-three face grid')
 click('[data-skill="strike"]');check(page.locator('.die.eligible').count()==2,'Attack technique highlights only valid dice')
 click('[data-die="0"]');check(read('state.battle.assignments[0].id')=='strike','Touch commits die to technique')
 check(read('E.hero(state).energy')==4,'Allocation does not spend energy prematurely')
 check(page.locator('.skill-card.committed .slot-die').count()==1,'Committed die is visible in card socket')
 click('[data-skill="protect"]');click('[data-die="1"]');check(read('state.battle.assignments.length')==2,'Low eye can be used for protection alongside attack')
 check('피해 6' in page.locator('#combat-summary').inner_text(),'Expected attack includes consumed base die correctly')
 click('[data-skill="protect"]');check(read('state.battle.assignments.length')==1,'Touching committed card cancels its allocation')
 click('#demo-exit');check(page.locator('#setup').is_visible(),'Ending rehearsal returns to original home')
 check(read('localStorage.getItem(SAVE)') is None,'Rehearsal never writes a campaign save')
 # Archive is preserved, migration can resume existing rolled dice.
 read("let old=E.create([0]);old.heroes[0].pos='E3';E.apply(old,'engage');E.apply(old,'roll',{},()=>0);delete old.battle.assignments;delete old.battle.cooldowns;localStorage.setItem('elderfall-campaign-v2',JSON.stringify(old));")
 archived=read("localStorage.getItem('elderfall-campaign-v2')")
 page.reload(wait_until='networkidle');check(read('state.battle.phase')=='rolled','Old rolled campaign resumes without new costs')
 check(read('state.battle.dice.every(d=>d.value===1)'),'Old rolled eyes survive migration unchanged')
 check(read("localStorage.getItem('elderfall-campaign-v2')")==archived,'Original v2 save remains byte-for-byte unchanged')
 check(read('!!localStorage.getItem(SAVE)'),'Migrated campaign uses independent v3 key')
 before=read('JSON.stringify(state)');stored=read('localStorage.getItem(SAVE)');click('#try-battle');click('#roll');click('[data-skill="strike"]');click('[data-die="0"]');click('#resolve');click('#demo-exit')
 check(read('JSON.stringify(state)')==before,'Rehearsal restores original campaign including mid-battle dice')
 check(read('localStorage.getItem(SAVE)')==stored,'Rehearsal leaves the actual saved campaign intact')
 # Real campaign allocations persist, preview matches retaliation and cooldown.
 fixture();click('#engage');read('Math.random=()=>0;');click('#roll');click('[data-skill="protect"]');click('[data-die="0"]');hp=read('E.tacticalPreview(state).after[0]')
 page.reload(wait_until='networkidle');check(read('state.battle.assignments.length')==1,'Allocation survives reload in campaign')
 check(page.locator('.skill-card.committed').count()==1,'Reload reconstructs committed skill card')
 click('#resolve');check(read('E.hero(state).hp')==hp,'Displayed prediction agrees with actual HP after execution')
 click('#roll');check(page.locator('[data-skill="protect"]').is_disabled(),'Used utility cannot be reused during next-round cooldown')
 click('#resolve')
 if page.locator('#loot').is_visible():click('#loot-close')
 # Multiple clicks during animation must not apply a second attack.
 fixture();click('#engage');read('Math.random=()=>0;');click('#roll')
 read("document.querySelector('#resolve').click();document.querySelector('#resolve').click();")
 check(read('busy'),'Resolution enters interaction lock during staged effects')
 page.wait_for_function('!busy');check(read('state.battle.round')==2,'Two rapid execution clicks advance exactly one round')
 # Reloading while effects play resumes the already-saved single result.
 click('#roll');read("document.querySelector('#resolve').click();")
 page.reload(wait_until='networkidle');check(read('state.battle.round')==3,'Reload during effects resumes committed round without duplicate damage')
 # Re-roll mode is distinct from placement, costs only owner energy.
 fixture();click('#engage');read('Math.random=()=>0;');click('#roll');click('#reroll-mode');click('[data-die="0"]')
 check(read('E.hero(state).energy')==3,'Explicit reroll mode consumes one energy')
 check(page.locator('[data-die="0"]').is_disabled(),'Same die cannot be rerolled twice')
 # Cooperative target choice uses actual UI.
 fixture("state=E.create([0,1]);state.heroes.forEach(h=>h.pos='E3');")
 click('#engage');read('Math.random=()=>0;');click('#roll');click('[data-skill="protect"]');page.select_option('#skill-target','1');click('[data-die="0"]')
 check(read('state.battle.assignments[0].target')==1,'Protection can target a co-located companion')
 check('마법사 HP 7' in page.locator('#combat-summary').inner_text(),'Cooperative prediction includes protected companion')
 # Illustrated reward selection spends the action exactly once.
 fixture("state=E.create([0]);state.heroes[0].quests[0].ready=true;")
 click('header [data-sheet="quests"]');click('[data-claim="herbs"]')
 check(page.locator('#loot').is_visible(),'Quest report opens dedicated illustrated reward view')
 check(page.locator('[data-reward]').count()==4,'Every legal reward is shown as a choice card')
 check(page.locator('#loot-confirm').is_disabled(),'Reward confirmation requires a selected item')
 click('[data-reward="2"]');click('#loot-confirm')
 check(read('E.hero(state).bag.includes(2)&&E.hero(state).completed.includes("herbs")'),'Selected illustrated reward is added and quest completed')
 check(read('state.actions')==3,'Reward confirmation costs one world action')
 # Cancel a reward without selecting; a later victory must still have an enabled continue action.
 fixture("state=E.create([0]);state.heroes[0].quests[0].ready=true;")
 click('header [data-sheet="quests"]');click('[data-claim="herbs"]');click('#loot-close')
 # Finishing a normal fight shows its result; close advances to exploration.
 fixture("state=E.create([0]);E.hero(state).pos='A2';state.enemies[0].hp=1;state.enemies[0].scaled=true;")
 click('#engage');read('Math.random=()=>.999999;');click('#roll');click('#resolve')
 check(page.locator('#loot').is_visible() and '승리' in page.locator('#loot-title').inner_text(),'Fight victory receives a distinct presentation')
 check(page.locator('#loot-confirm').is_enabled(),'Cancelled reward cannot disable a later victory continue button')
 page.screenshot(path='/tmp/elderfall-v07-victory.png');click('#loot-confirm');check(page.locator('#world-scene').is_visible(),'Victory continues to exploration')
 # Viewport QA checks interaction bounds, visible pip faces, map alignment and card/footer separation.
 for w,h in [(320,800),(390,844),(768,1024),(1024,768),(1024,1366),(1366,1024)]:
  page.set_viewport_size({'width':w,'height':h});fixture('state=E.create([0,1,2,3]);')
  check(read('document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth'),f'{w}x{h}: exploration has no page scroll')
  check(read('document.querySelector(".map-routes").getAttribute("preserveAspectRatio")==="none"'),f'{w}x{h}: roads share rectangular board coordinates')
  read("state.heroes.forEach(h=>h.pos='E3');E.apply(state,'engage');render();")
  click('#roll')
  check(inside('#combat-scene') and inside('#action-dock'),f'{w}x{h}: encounter and execution controls fit')
  check(read('document.querySelector("#skill-panel").getBoundingClientRect().bottom<=document.querySelector("#action-dock").getBoundingClientRect().top'),f'{w}x{h}: cards never overlap footer')
  check(read('Array.from(document.querySelectorAll(".skill-choice")).every(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.bottom<=innerHeight;})'),f'{w}x{h}: technique touch targets are usable')
  check(read('Array.from(document.querySelectorAll("#tactics button,#reroll-mode")).every(el=>el.getBoundingClientRect().height>=44)'),f'{w}x{h}: preparation and reroll touch height at least 44px')
  check(read('document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth'),f'{w}x{h}: encounter has no page scroll')
  if w==1024 and h==768:page.screenshot(path='/tmp/elderfall-v07-coop.png')
 page.set_viewport_size({'width':1024,'height':768});fixture();click('#engage');read('Math.random=()=>.5;');click('#roll');page.screenshot(path='/tmp/elderfall-v07-battle.png')
 fixture('state=E.create([0]);');page.screenshot(path='/tmp/elderfall-v07-world.png');click('header [data-sheet="quests"]');read('E.hero(state).quests[0].ready=true;renderFolio();');click('[data-claim="herbs"]');click('[data-reward="0"]');page.screenshot(path='/tmp/elderfall-v07-rewards.png');click('#loot-close')
 ctx.close()
 # Reduced motion is a real alternate rendering path, not a skipped animation test.
 reduced=browser.new_context(viewport={'width':1024,'height':768},reduced_motion='reduce');rp=reduced.new_page();rp.goto(URL,wait_until='networkidle');rp.click('#demo');rp.click('#roll');rp.wait_for_function('!busy');check(rp.evaluate('getComputedStyle(document.querySelector(".cube")).animationName')=='none','Reduced-motion setting disables spinning effects')
 reduced.close();check(not errors,'No page JavaScript errors: '+str(errors));browser.close()
print(f'PASS: {checks} redesign browser checks')

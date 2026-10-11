import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('ARENA_BASE','http://127.0.0.1:8004/')
SHOTS=ROOT/'docs/screenshots';SHOTS.mkdir(exist_ok=True,parents=True)
ARGS=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']
def load(page):
 page.goto(BASE,wait_until='networkidle');page.wait_for_function('arena.phase!=="loading"',timeout=60000)
 assert page.evaluate('arena.phase')=='ready'
 page.click('#enter');page.wait_for_function('document.getElementById("loading").hidden',timeout=15000)
def ready(page):page.wait_for_function('arena.phase==="ready"&&!arena.activeAction',timeout=60000)
def bone_pose(page):return page.evaluate('()=>{const p=[];arena.hero.model.traverse(n=>{if(n.isBone&&/leg|foot/i.test(n.name))p.push(...n.quaternion.toArray())});return p;}')
def move(page,cell):
 point=page.evaluate('(p)=>arena.projectCell(p)',cell);assert point['visible'];page.touchscreen.tap(point['x'],point['y']);ready(page)
if __name__=='__main__':
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
  context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True)
  page=context.new_page();errors=[];responses=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:responses.append((r.url,r.status)))
  load(page);assert page.locator('meta[name="application-version"]').get_attribute('content')=='1.1'
  assert page.evaluate('arena.hero.model.getObjectByProperty("isSkinnedMesh",true)!==undefined&&arena.enemy.model.getObjectByProperty("isSkinnedMesh",true)!==undefined')
  assert page.evaluate('arena.hero.actions.has("Walking_A")&&arena.hero.actions.has("1H_Melee_Attack_Slice_Diagonal")&&arena.enemy.actions.has("Hit_A")&&arena.enemy.actions.has("Death_A")')
  page.screenshot(path=str(SHOTS/'3d-actual-initial.png'))
  initial_pose=bone_pose(page)
  point=page.evaluate('arena.projectCell({x:3,z:7})');page.touchscreen.tap(point['x'],point['y']);page.wait_for_function('arena.phase==="moving"')
  page.wait_for_timeout(220);moving_pose=bone_pose(page);assert initial_pose!=moving_pose,'legs must animate, not just translate a still image'
  page.screenshot(path=str(SHOTS/'3d-actual-walking.png'));ready(page)
  assert page.evaluate('arena.state.hero.x===3&&arena.state.hero.z===7')
  # The barrier projects above a blocked cell and rejects movement.
  before=page.evaluate('JSON.stringify(arena.state)');point=page.evaluate('arena.projectCell({x:4,z:3})');page.touchscreen.tap(point['x'],point['y']);page.wait_for_timeout(150);assert page.evaluate('JSON.stringify(arena.state)')==before
  # Camera changes perspective without changing game state.
  camera_before=page.evaluate('arena.camera.position.toArray()');page.click('#camera-left');assert page.evaluate('arena.camera.position.toArray()')!=camera_before;assert page.evaluate('JSON.stringify(arena.state)')==before;page.click('#camera-right')
  # Real enemy mesh picking queues navigation and melee; extra inputs while busy do nothing.
  point=page.evaluate('arena.projectEnemy()');page.touchscreen.tap(point['x'],point['y']);page.wait_for_function('arena.activeAction==="attack"')
  assert page.evaluate('arena.state.enemy.hp===24&&arena.state.attacks===0'),'damage must wait for the hit frame'
  page.evaluate('document.getElementById("attack").click();document.getElementById("attack").click()')
  page.wait_for_function('arena.phase==="attacking"',timeout=60000);page.screenshot(path=str(SHOTS/'3d-actual-attack.png'));ready(page)
  assert page.evaluate('arena.state.attacks===1&&arena.state.enemy.hp===18&&arena.state.hero.hp===26')
  assert page.evaluate('Math.hypot(arena.state.hero.x-arena.state.enemy.x,arena.state.hero.z-arena.state.enemy.z)<=1.5')
  for attack in range(3):
   page.click('#attack')
   if attack<2:ready(page)
  page.wait_for_function('arena.phase==="won"&&!arena.activeAction',timeout=60000)
  assert page.evaluate('arena.state.enemy.hp===0&&arena.state.hero.hp===18&&arena.state.attacks===4&&arena.enemy.clip==="Death_A"')
  assert page.locator('#attack').is_disabled();page.screenshot(path=str(SHOTS/'3d-actual-victory.png'))
  page.click('#reset');page.click('#reset-cancel');assert page.evaluate('arena.state.enemy.hp===0');page.click('#reset');page.click('#reset-confirm');assert page.evaluate('arena.state.enemy.hp===24&&arena.state.hero.hp===30&&arena.state.attacks===0&&arena.hero.clip==="Idle"')
  page.click('#sound');assert page.locator('#sound').get_attribute('aria-pressed')=='true'
  assert not errors,errors
  assert all(status<400 for _,status in responses),[(url,status) for url,status in responses if status>=400]
  print('PASS real WebGL/skinning, animated legs, touch move, blocked cell, camera, enemy picking, approach, timed hit, no duplicate attacks, counter, death, reset',flush=True)
  context.close()
  for width,height in [(768,1024),(390,844)]:
   c=browser.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=True);p=c.new_page();load(p)
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight')
   hud=p.locator('#hud').bounding_box();assert hud['y']+hud['height']<=height and hud['x']>=0 and hud['x']+hud['width']<=width
   assert p.locator('#attack').bounding_box()['height']>=44
   p.screenshot(path=str(SHOTS/f'3d-actual-{width}x{height}.png'))
   p.click('#attack');ready(p);assert p.evaluate('arena.state.enemy.hp===18&&arena.state.attacks===1')
   print('PASS touch 3D viewport/movement/attack',width,height,flush=True);c.close()
  browser.close()

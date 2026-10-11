import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('ARENA_BASE','http://127.0.0.1:8020/')
SHOTS=ROOT/'docs/screenshots';SHOTS.mkdir(exist_ok=True,parents=True)
ARGS=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']
def load(page):
 page.goto(BASE,wait_until='networkidle');page.wait_for_function('window.arena?.renderer&&document.getElementById("enter").offsetWidth>0',timeout=60000)
 assert page.locator('meta[name="application-version"]').get_attribute('content')=='2.1'
 page.click('#enter');page.wait_for_function('document.getElementById("loading").hidden')
def tap_move(page,point):
 p=page.evaluate('(p)=>arena.projectFloor(p)',point);assert p['visible'];page.touchscreen.tap(p['x'],p['y'])
def fight(page):
 b=page.locator('#attack').bounding_box();page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2);page.mouse.down()
 page.wait_for_function('arena.state.status!=="playing"',timeout=90000);page.mouse.up()
 assert page.evaluate('arena.state.status==="won"&&arena.state.hero.hits===5&&arena.state.enemy.hp===0&&arena.state.hero.hp>0'),page.evaluate('arena.state')
if __name__=='__main__':
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS)
  context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True)
  page=context.new_page();errors=[];bad=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('response',lambda r:bad.append((r.url,r.status)) if r.status>=400 else None)
  load(page);assert page.evaluate('arena.renderer.getContext()!==null&&arena.hero.headDiameter/arena.hero.height<.17')
  assert page.locator('#hero-portrait').evaluate('(img)=>img.complete&&img.naturalWidth===144')
  page.screenshot(path=str(SHOTS/'nox-actual-initial.png'))
  # Pause freezes simulation, not merely the overlay.
  page.click('#pause');before=page.evaluate('JSON.stringify(arena.state)');page.wait_for_timeout(700);assert page.evaluate('JSON.stringify(arena.state)')==before
  assert page.locator('#paused').is_visible();page.click('#resume');page.wait_for_function('!arena.paused')
  # Real keyboard movement is continuous and animates articulated legs.
  travel=page.evaluate('arena.state.hero.travel');pose=page.evaluate('arena.hero.legs[0].hip.rotation.x');page.keyboard.down('a')
  page.wait_for_function('(v)=>arena.state.hero.travel>v+.5',arg=travel,timeout=30000)
  assert page.evaluate('arena.hero.pose==="walk"');assert page.evaluate('arena.hero.legs[0].hip.rotation.x')!=pose
  page.screenshot(path=str(SHOTS/'nox-actual-walking.png'));page.keyboard.up('a')
  # Reachable terrain taps queue a legal route; a column rejects a destination.
  tap_move(page,{'x':-3,'z':2});page.wait_for_function('arena.destination===null',timeout=60000)
  before=page.evaluate('arena.destination');tap_move(page,{'x':-4,'z':4});assert page.evaluate('arena.destination')==before
  # Reset cancel preserves state while the modal suspends time.
  page.click('#reset');before=page.evaluate('JSON.stringify(arena.state)');page.wait_for_timeout(300);assert page.evaluate('JSON.stringify(arena.state)')==before;page.click('#reset-cancel')
  page.click('#reset');page.click('#reset-confirm');assert page.evaluate('arena.state.hero.hp===40&&arena.state.enemy.hp===50&&arena.state.hero.hits===0')
  # Simultaneous real touch: joystick and sword button must both work, then release cleanly.
  cdp=context.new_cdp_session(page);stick=page.locator('#joystick').bounding_box();attack=page.locator('#attack').bounding_box();points=[{'id':1,'x':stick['x']+stick['width']*.84,'y':stick['y']+stick['height']/2},{'id':2,'x':attack['x']+attack['width']/2,'y':attack['y']+attack['height']/2}]
  travel=page.evaluate('arena.state.hero.travel');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points});page.wait_for_function('(v)=>arena.state.hero.travel>v+.2&&arena.state.hero.swings>0',arg=travel,timeout=30000)
  assert page.evaluate('arena.input.attackHeld&&arena.input.joystick.id!==null')
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_function('!arena.input.attackHeld&&arena.input.joystick.id===null')
  # Dodge is a genuine displacement with an active cooldown, not an ornamental icon.
  travel=page.evaluate('arena.state.hero.travel');page.click('#dodge');page.wait_for_function('(v)=>arena.state.hero.travel>v+.3&&arena.state.hero.dodgeCooldown>0',arg=travel,timeout=30000);page.screenshot(path=str(SHOTS/'nox-actual-dodge.png'))
  page.click('#reset');page.click('#reset-confirm');fight(page)
  assert page.locator('#result').is_visible();assert page.locator('#attack').is_disabled();page.screenshot(path=str(SHOTS/'nox-actual-victory.png'))
  page.click('#again');assert page.evaluate('arena.state.status==="playing"&&arena.state.hero.hp===40&&arena.state.enemy.hp===50')
  # Backgrounding pauses and releases held input.
  page.evaluate('window.dispatchEvent(new Event("blur"))');assert page.evaluate('arena.paused&&!arena.input.attackHeld&&arena.input.joystick.id===null');page.click('#resume')
  assert not errors,errors;assert not bad,bad
  print('PASS real 3D adult-proportion actors, portrait, articulated walk, continuous keyboard, terrain navigation, collision, pause/reset, simultaneous touch, dodge, real-time pursuit/attack/death, blur release',flush=True)
  context.close()
  for width,height in [(768,1024),(390,844)]:
   c=browser.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=True);p=c.new_page();load(p)
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight')
   for name in ['joystick','attack','dodge','pause']:
    box=p.locator('#'+name).bounding_box();assert box['width']>=44 and box['height']>=44;assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=height
   p.screenshot(path=str(SHOTS/f'nox-actual-{width}x{height}.png'))
   session=c.new_cdp_session(p);box=p.locator('#joystick').bounding_box();travel=p.evaluate('arena.state.hero.travel');session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':box['x']+box['width']*.83,'y':box['y']+box['height']/2}]});p.wait_for_function('(v)=>arena.state.hero.travel>v+.3',arg=travel,timeout=30000);session.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});p.wait_for_function('arena.input.joystick.id===null');p.click('#dodge');p.wait_for_function('arena.state.hero.dodgeCooldown>0',timeout=30000)
   print('PASS real touch movement/release/dodge and scroll-free layout',width,height,flush=True);c.close()
  browser.close()

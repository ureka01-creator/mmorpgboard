"""Fullscreen-map drawer checks using actual touch controls and keyboard behavior."""
import os
from playwright.sync_api import sync_playwright
URL=os.environ.get('ELDERFALL_TEST_URL','http://127.0.0.1:8003/')
checks=0
def check(ok,name):
 global checks
 assert ok,name
 checks+=1
 print('PASS',name)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 q=b.new_page(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True);errors=[]
 q.on('pageerror',lambda e:errors.append(str(e)));q.goto(URL,wait_until='networkidle')
 def read(js):return q.evaluate(js)
 def opened():q.wait_for_function('document.querySelector("#drawer-body").getBoundingClientRect().bottom<=innerHeight+1')
 def open_menu():
  if not read('worldMenuOpen'):q.click('#menu-toggle')
  opened()
 def inside(selector):
  return read(f'''Array.from(document.querySelectorAll('{selector}')).every(el=>{{const r=el.getBoundingClientRect();return r.top>=-1&&r.left>=-1&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;}})''')
 q.click('#start');before=read('JSON.stringify(state)');save=read('localStorage.getItem(SAVE)')
 check(read('!worldMenuOpen&&document.querySelector("#drawer-body").inert'),'Start hides controls from pointer and keyboard input')
 for _ in range(20):
  q.keyboard.press('Tab');assert not read('document.querySelector("#drawer-body").contains(document.activeElement)')
 check(True,'Tab navigation cannot enter folded controls')
 open_menu();q.keyboard.press('Escape');check(read('!worldMenuOpen&&document.activeElement.id==="menu-toggle"'),'Escape folds menu and restores handle focus')
 check(read('JSON.stringify(state)')==before and read('localStorage.getItem(SAVE)')==save,'Opening and closing controls never spends or saves game resources')
 # Touching a connected region reveals costs; successful travel returns to the clear map.
 q.click('#board [data-region="C4"]');opened()
 check(read('worldMenuOpen&&E.hero(state).pos==="C5"'),'Region selection opens controls without moving hero')
 check('이동 확정' in q.locator('#explore').inner_text(),'Selected region offers a clear travel confirmation')
 q.click('#explore');check(read('!worldMenuOpen&&E.hero(state).pos==="C4"&&state.actions===3'),'Confirmed travel spends one action and folds controls')
 open_menu();q.click('#explore');check(read('!worldMenuOpen&&E.hero(state).quests[0].ready'),'Gather action folds menu after completing objective')
 open_menu();q.click('header [data-sheet="quests"]');check(q.locator('#sheet').is_visible(),'Quest journal remains accessible from drawer');q.click('#close-sheet')
 q.reload(wait_until='networkidle');check(read('!worldMenuOpen&&E.hero(state).pos==="C4"&&E.hero(state).quests[0].ready'),'Reload restores campaign and starts with clear map')
 open_menu();q.click('#end-turn');check(read('!worldMenuOpen&&state.round===2'),'Ending a turn updates round and returns to map')
 # Invalid commands preserve the selected context for correction.
 q.click('#board [data-region="C3"]');opened();check(q.locator('#explore').is_disabled() and read('worldMenuOpen'),'Blocked mountain remains explained in open menu')
 q.click('#board',position={'x':400,'y':80});check(not read('worldMenuOpen'),'Touching empty map folds an open menu')
 # Existing battle controls restore their original fixed encounter layout.
 open_menu();q.click('#try-battle');check(read('!document.body.classList.contains("in-world")&&document.querySelector("header").parentElement===document.body'),'Entering rehearsal restores encounter header and layout')
 q.click('#roll');q.wait_for_function('!busy');q.click('#demo-exit');check(read('document.body.classList.contains("in-world")&&!worldMenuOpen'),'Returning from battle restores folded exploration controls')
 # Geometry must remain identical with the drawer open, on portrait and landscape devices.
 for w,h in [(320,800),(390,844),(768,1024),(1024,768),(1024,1366),(1366,1024)]:
  q.set_viewport_size({'width':w,'height':h});read('state=E.create([0,1,2,3]);setWorldMenu(false);render();')
  rect=read('document.querySelector("#board").getBoundingClientRect().toJSON()')
  check(rect['x']==0 and rect['y']==0 and rect['width']==w and rect['height']==h,f'{w}x{h}: map fills entire viewport')
  open_menu();check(read('document.querySelector("#board").getBoundingClientRect().toJSON()')==rect,f'{w}x{h}: opening controls never resizes map')
  check(inside('#world-actions button,#party button,header nav button,#menu-toggle'),f'{w}x{h}: actions, party and navigation fit in open drawer')
  check(read('document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight'),f'{w}x{h}: drawer causes no page scroll')
  q.click('#menu-toggle');q.wait_for_function('document.querySelector("#menu-toggle").getBoundingClientRect().bottom>=innerHeight-24')
  check(inside('#menu-toggle,#world-hud'),f'{w}x{h}: folded handle and hero HUD stay accessible')
 q.set_viewport_size({'width':1024,'height':768});read("state=E.create([0]);setWorldMenu(false);render();message('');")
 q.screenshot(path='/tmp/elderfall-v08-map.png');open_menu();q.screenshot(path='/tmp/elderfall-v08-menu.png')
 check(not errors,'No JavaScript errors during reparenting or transitions: '+str(errors));b.close()
print(f'PASS: {checks} fullscreen map checks')

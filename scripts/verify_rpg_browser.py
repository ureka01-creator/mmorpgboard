import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('RPG_BASE','http://127.0.0.1:8004/')
SHOT=ROOT/'docs/screenshots';SHOT.mkdir(parents=True,exist_ok=True)
def ready(page):page.wait_for_function('!busy')
def interact(page,name):
 ready(page);page.click('[data-object="'+name+'"]');page.click('#context-action')
 if not page.evaluate('!!state.dialog || state.combat || state.outcome') and page.locator('#context-action').is_visible():page.click('#context-action')
 ready(page)
def snapshot(page):return page.evaluate('JSON.stringify(state)')
def fight(page):
 for rnd in range(45):
  if not page.evaluate('state.combat'):return
  ids=page.evaluate('state.party.filter(h=>h.hp>0).map(h=>h.id)')
  for hero in ids:
   if not page.evaluate('state.combat'):return
   if not page.evaluate('(id)=>state.party.some(h=>h.id===id&&h.hp>0)',hero):continue
   ready(page);page.click('[data-action="move"]');page.click('[data-hero="'+hero+'"]')
   for step in range(5):
    ready(page)
    proposal=page.evaluate('''()=>{
     if(!state.combat)return null;const h=E.selected(state),r=E.roles[h.id];if(h.ap<1)return null;
     if(h.id==='priest'&&h.ap>=2&&h.focus){const ally=state.party.filter(u=>u.hp>0&&E.roles[u.id].hp-u.hp>=5&&!E.targetReason(state,h,u,4)).sort((a,b)=>a.hp-b.hp)[0];if(ally)return {type:'skill',id:ally.id,ally:true};}
     const targets=state.enemies.filter(e=>e.hp>0&&!E.targetReason(state,h,e,r.range)).sort((a,b)=>a.hp-b.hp);
     if(h.ap>=2&&targets.length)return {type:h.focus&&h.id!=='priest'?'skill':'attack',id:targets[0].id};
     const cells=E.reachable(state).map(p=>({...p,nearest:Math.min(...state.enemies.filter(e=>e.hp>0).map(e=>E.dist(p,e)))})).sort((a,b)=>a.nearest-b.nearest||a.cost-b.cost);
     const current=Math.min(...state.enemies.filter(e=>e.hp>0).map(e=>E.dist(h,e)));
     if(cells[0]&&cells[0].nearest<current)return {type:'move',x:cells[0].x,y:cells[0].y};
     if(!h.guard)return {type:'guard'};return null;
    }''')
    if not proposal:break
    kind=proposal['type'];page.click('[data-action="'+kind+'"]')
    if kind=='move':page.click('[data-cell="'+str(proposal['x'])+','+str(proposal['y'])+'"]')
    elif kind in ('skill','attack') and (kind=='attack' or hero!='knight'):page.click('[data-unit="'+proposal['id']+'"]')
    if kind=='guard':break
  if page.evaluate('state.combat'):ready(page);page.click('[data-action="end"]')
 raise AssertionError('combat did not finish')
if __name__=='__main__':
    with sync_playwright() as pw:
     browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
     context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True)
     context.add_init_script('let qaSeed=7;Math.random=()=>{qaSeed=(qaSeed*1664525+1013904223)>>>0;return qaSeed/4294967296;}')
     page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.goto(BASE,wait_until='networkidle');assert page.locator('meta[name="application-version"]').get_attribute('content')=='1.0'
     page.screenshot(path=str(SHOT/'rpg-welcome.png'));page.click('#start');assert page.evaluate('E.validate(state)')
     page.screenshot(path=str(SHOT/'rpg-village.png'))
     interact(page,'elder');page.screenshot(path=str(SHOT/'rpg-dialogue.png'));page.click('[data-choice="persuade"]');assert page.locator('#dice-result').is_visible();assert page.evaluate('state.quest==="accepted"');page.click('[data-choice="leave"]')
     for name in ['mage','priest']:interact(page,name);page.click('[data-choice="recruit"]')
     assert page.locator('.hero-card').count()==3
     interact(page,'gate');assert page.evaluate('state.combat&&state.scene==="ruins"');page.screenshot(path=str(SHOT/'rpg-combat.png'))
     # Mid-combat save includes every roll and resource. Reload cannot reroll or reset AP.
     page.click('[data-hero="mage"]');page.click('[data-action="skill"]');page.click('[data-unit="wolf1"]');ready(page)
     before=snapshot(page);page.reload(wait_until='networkidle');assert page.locator('#continue').is_visible();page.click('#continue');assert snapshot(page)==before
     assert page.evaluate('state.party.find(h=>h.id==="mage").focus===2&&state.enemies[0].rooted')
     fight(page);ready(page);assert page.evaluate('!state.combat&&!state.outcome'),snapshot(page)
     interact(page,'relic');assert page.evaluate('state.quest==="recovered"')
     interact(page,'gate');assert page.evaluate('state.scene==="village"&&E.validate(state)')
     interact(page,'elder');page.click('[data-choice="report"]');assert page.locator('#ending').is_visible();assert page.evaluate('state.outcome==="victory"&&state.quest==="complete"');page.screenshot(path=str(SHOT/'rpg-ending.png'))
     ending=snapshot(page);page.reload(wait_until='networkidle');page.click('#continue');assert snapshot(page)==ending;assert page.locator('#ending').is_visible()
     assert not errors,errors
     print('PASS touch UI: dialogue/persuasion, recruitment, skill/AP save reload, full legal combat, relic return/report, completed save reload',flush=True)
     context.close()
     for width,height in [(1024,768),(768,1024),(390,844),(320,568),(1180,820)]:
      c=browser.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=True);p=c.new_page();p.goto(BASE);p.click('#start')
      assert p.evaluate('document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth'),str((width,height))
      for name in ['elder','mage','priest']:
       interact(p,name)
       if name=='elder':
        assert p.locator('[data-choice="help"]').is_visible();p.click('[data-choice="help"]');p.click('[data-choice="leave"]')
       else:p.click('[data-choice="recruit"]')
      interact(p,'gate');assert p.evaluate('E.validate(state)')
      # All combat actions and party cards stay inside the viewport and have touch-sized action targets.
      for loc in [p.locator('.dock'),p.locator('#actions')]:
       box=loc.bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,str((width,height,box))
      assert p.evaluate('[...document.querySelectorAll("#actions button")].every(b=>b.getBoundingClientRect().height>=44)')
      p.screenshot(path=str(SHOT/f'rpg-{width}x{height}.png'))
      print('PASS viewport/touch layout',width,height,flush=True);c.close()
     # Bad saves are not executed or overwritten until the player deliberately starts a new game.
     c=browser.new_context();p=c.new_page();p.goto(BASE);p.evaluate('localStorage.setItem("elderfall-rpg-v1","broken");localStorage.setItem("elderfall-campaign-v3","old-board-save")');p.reload();assert p.locator('#save-notice').inner_text();assert p.evaluate('localStorage.getItem("elderfall-rpg-v1")')=='broken';p.click('#start');assert p.evaluate('E.validate(state)');assert p.evaluate('localStorage.getItem("elderfall-campaign-v3")')=='old-board-save';print('PASS corrupt save recovery and legacy save preservation',flush=True);c.close()
     # Storage rejection still allows play and gives an explicit persistent-session warning.
     c=browser.new_context();c.add_init_script('Storage.prototype.setItem=function(){throw new DOMException("storage blocked","SecurityError")};');p=c.new_page();p.goto(BASE);p.click('#start');assert p.evaluate('E.validate(state)');assert '자동 저장' in p.locator('#toast').inner_text();print('PASS blocked storage: playable with warning',flush=True);c.close()
     browser.close()

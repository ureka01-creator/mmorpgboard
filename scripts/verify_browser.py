"""Touch Chromium QA of campaign UI and fixed tabletop bounds.
Run a server first. ELDERFALL_TEST_URL can select a deployed source.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
URL = os.environ.get('ELDERFALL_TEST_URL','http://127.0.0.1:8000/')
checks=0

def check(condition, name):
    global checks
    assert condition, name
    checks += 1
    print('PASS',name)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True,device_scale_factor=1)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.add_init_script('Math.random=()=>0.999999;')
    page.goto(URL,wait_until='networkidle')
    page.screenshot(path='/tmp/elderfall-campaign-home.png')
    def read(js): return page.evaluate(js)
    def click(selector): page.locator(selector).click()
    def sheet(kind): page.locator(f'header [data-sheet="{kind}"]').click()
    def close(): click('#close-sheet')
    def next_if_needed(cost=1):
        if read('state.actions')<cost: click('#end-turn')
    def walk(pos):
        while read('E.hero(state).pos')!=pos:
            current=read('E.hero(state).pos')
            if current[0]!=pos[0]: next_pos=chr(ord(current[0])+(1 if current[0]<pos[0] else -1))+current[1]
            else: next_pos=current[0]+str(int(current[1])+(1 if current[1]<pos[1] else -1))
            next_if_needed(2 if next_pos=='C3' else 1)
            click(f'#board button[aria-label^="{next_pos} "]')
    def claim(q,g):
        next_if_needed();sheet('quests');page.locator(f'#reward-{q}').select_option(str(g));click(f'[data-claim="{q}"]');close()
    def equip(g):
        sheet('hero');click(f'[data-action="equip"][data-arg=\'{{"id":{g}}}\']');close()
    def talent(i):
        sheet('hero');click('[data-tab="talents"]');click(f'[data-action="talent"][data-arg=\'{{"index":{i}}}\']');close()
    def accept(q):
        sheet('quests');click('[data-tab="available"]');click(f'[data-action="accept"][data-arg=\'{{"id":"{q}"}}\']');close()
    def fight():
        next_if_needed();click('#engage');check(page.locator('#combat-scene').is_visible(),'Encounter switches to separate battle table')
        while read('!!state.battle'):
            click('#roll');click('#resolve')
            if read('state.outcome'): break
    def bounds(selector):
        b=page.locator(selector).bounding_box()
        v=page.viewport_size
        return b and b['x']>=-1 and b['y']>=-1 and b['x']+b['width']<=v['width']+1 and b['y']+b['height']<=v['height']+1
    def no_scroll():
        return read('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight && document.body.scrollWidth<=innerWidth && document.body.scrollHeight<=innerHeight')
    # Public-facing rules are available before starting.
    sheet('rules');check('2005' in page.locator('#sheet-content').inner_text(),'Rules explain 2005 inspiration and original cooperative campaign');close()
    click('#start');check(read('state.version')==2,'New campaign starts')
    check(read('E.hero(state).quests[0].id')=='herbs','First quest is explained and accepted')
    check(no_scroll(),'Initial iPad table has no page scrolling')
    walk('C4');click('#explore');check(read('E.hero(state).quests[0].ready'),'Gather quest reaches report stage')
    walk('C5');claim('herbs',0);check(read('E.hero(state).xp')==2,'Quest gives personal XP and level')
    equip(0);talent(0);check(read('E.stats(E.hero(state)).red')==4,'Equipment and chosen talent affect dice pool')
    sheet('hero');click('[data-tab="talents"]');check(page.locator('[data-action="talent"][data-arg=\'{"index":1}\']').is_disabled(),'Alternative talent at same tier is locked');close()
    accept('caravan');accept('wolves');check(read('E.hero(state).quests.length')==2,'Different quest types can be selected')
    sheet('quests');click('[data-pin="wolves"]');check(not page.locator('#sheet').is_visible(),'Pinning quest returns to world')
    check(page.locator('#board button[aria-label^="A2 "] .quest-marker').is_visible(),'Pinned quest has map marker')
    walk('A4');claim('caravan',4);equip(4);check(read('E.hero(state).completed.includes("caravan")'),'Escort completes through travel and town report')
    walk('A2');fight();check(read('state.seals')==1,'Hunt victory yields shared seal')
    check(page.locator('#world-scene').is_visible(),'Victory returns to world table')
    walk('A4');claim('wolves',2);equip(2);talent(2);check(read('E.level(E.hero(state))')==3,'Quest chain unlocks level 3')
    accept('mine');walk('E5');next_if_needed();
    if page.locator('#rest').is_enabled(): click('#rest')
    walk('E3');fight();check(read('state.seals')==2,'Second enemy unlocks raid route')
    walk('E5');claim('mine',6);equip(6);talent(4);next_if_needed();
    if page.locator('#rest').is_enabled(): click('#rest')
    walk('D1');fight()
    check(read('state.outcome')=='win','Complete UI campaign ends in boss victory')
    check(page.locator('#result').is_visible(),'Campaign result opens')
    click('#result-close');page.reload(wait_until='networkidle');check(read('state.outcome')=='win','Saved victory resumes after reload');click('#result-close')
    # Separate fixture exercises dice choices, energy accounting, reload mid-roll, retreat.
    read("state=E.create([0]);E.hero(state).pos='E3';E.hero(state).bag=[4];E.apply(state,'equip',{id:4});render();")
    click('#engage');page.evaluate('Math.random=()=>0');click('#roll');check(page.locator('.die').count()==4,'Actual colored dice appear')
    page.evaluate('Math.random=()=>.999999');click('.die >> nth=0');check(read('E.hero(state).energy')==3,'Touching die spends correct owner energy')
    check(read('state.battle.dice[0].rerolled'),'Die is marked rerolled');check(page.locator('.die').nth(0).is_disabled(),'Same die cannot reroll twice')
    page.reload(wait_until='networkidle');check(read('state.battle.phase')=='rolled','Mid-roll battle resumes without another energy charge')
    check(page.locator('#retreat').is_disabled(),'Cannot escape unresolved dice')
    click('#resolve');check(read('state.battle.round')==2,'Round resolution advances intent')
    click('#retreat');check(read('E.hero(state).pos')=='C5','Retreat returns to village');check(read('state.actions')==0,'Retreat forfeits remaining actions')
    check(page.locator('#feedback').inner_text()!='','Combat result feedback exists')
    # Four-player controls and cooperation.
    read("state=E.create([0,1,2,3]);render();")
    click('#end-turn');check(read('state.active')==1,'Hotseat switches active hero')
    click('#end-turn');click('#end-turn');click('#end-turn');check(read('state.round')==2 and read('state.active')==1,'Round rotates starting hero')
    click('[data-inspect="3"]');check('사제' in page.locator('#sheet-content').inner_text(),'Any party card can be inspected')
    check(page.locator('[data-action="potion"]').is_disabled(),'Inactive hero management cannot use active resources');close()
    read("state=E.create([0,1]);state.heroes.forEach(h=>h.pos='A2');render();")
    click('#engage');check(page.locator('[data-stance]').count()==2,'Co-located heroes choose separate stances')
    page.locator('[data-stance="1"]').select_option('focus');click('#roll');check(read('state.heroes[1].energy')==3 and read('state.heroes[0].energy')==4,'Focus energy belongs to selected hero')
    click('#resolve');check(read('state.heroes[1].xp')==1,'Cooperative participants each gain battle XP')
    # Town economy and equipment sharing use the actual folio buttons.
    read("state=E.create([0,1]);render();")
    sheet('shop');click('[data-action="buy"][data-arg=\'{"id":0}\']');check(read('E.hero(state).gold')==0 and read('state.actions')==2,'Shop spends gold and world action');close()
    sheet('hero');click('[data-action="equip"][data-arg=\'{"id":0}\']');click('[data-action="trade"]');check(read('state.heroes[1].bag.includes(0)') and read('state.heroes[0].equipment.weapon') is None,'Giving equipment transfers it and clears giver slot');close()
    read("state=E.create([0]);E.hero(state).hp=1;E.hero(state).energy=0;render();")
    click('#rest');check(read('E.hero(state).hp')==7 and read('E.hero(state).energy')==2,'Town rest restores health and energy')
    sheet('hero');click('[data-action="potion"]');check(read('E.hero(state).hp')==12 and read('E.hero(state).potions')==0,'Potion heals up to cap and is consumed');close()
    # Independent state preservation and damaged/corrupt saves.
    read("localStorage.setItem('elderfall-game-v1','legacy-record');persist();")
    page.reload(wait_until='networkidle');check(read("localStorage.getItem('elderfall-game-v1')")=='legacy-record','Old v0.4 record remains intact')
    read("localStorage.setItem(SAVE,'{broken');")
    page.reload(wait_until='networkidle');check(page.locator('#setup').is_visible(),'Corrupt save gives safe new-campaign screen')
    # Core controls always fit in supported world/battle viewports, including four heroes.
    for w,h in [(320,800),(390,844),(768,1024),(1024,768),(1024,1366),(1366,1024)]:
        page.set_viewport_size({'width':w,'height':h})
        read('state=E.create([0,1,2,3]);render();')
        check(no_scroll(),f'{w}x{h} world has no page scrolling')
        check(bounds('#board'),f'{w}x{h} complete map fits')
        check(bounds('#action-dock'),f'{w}x{h} world controls fit')
        check(bounds('#party'),f'{w}x{h} party cards fit')
        if w>650 and page.locator('#event-card').is_visible():
            check(read('document.querySelector("#event-card").getBoundingClientRect().bottom<=document.querySelector("#world-scene").getBoundingClientRect().bottom+1'),f'{w}x{h} world event does not overlap party')
        read("state.heroes.forEach(h=>h.pos='E3');E.apply(state,'engage');render();")
        check(no_scroll(),f'{w}x{h} battle has no page scrolling')
        check(bounds('#combat-scene'),f'{w}x{h} battle table fits')
        check(bounds('#action-dock'),f'{w}x{h} battle controls fit')
        check(bounds('#retreat'),f'{w}x{h} retreat button fits')
        click('#roll');check(bounds('#dice-tray'),f'{w}x{h} dice fit')
        if (w,h)==(1024,768): page.screenshot(path='/tmp/elderfall-campaign-battle.png')
    page.set_viewport_size({'width':1024,'height':768})
    read("state=E.create([0]);E.hero(state).xp=6;E.hero(state).points=2;render();")
    page.screenshot(path='/tmp/elderfall-campaign-world.png')
    sheet('hero');click('[data-tab="talents"]');page.screenshot(path='/tmp/elderfall-campaign-talents.png');close()
    check(not errors,'No JavaScript page errors: '+str(errors))
    check(read('document.querySelectorAll(".portrait").length')>0,'Illustrated portrait cards are present')
    context.close();browser.close()
print(f'PASS: {checks} touch browser checks')

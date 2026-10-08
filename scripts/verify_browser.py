"""Start the HTTP server, then run this script; requires Playwright and Chromium."""
import os,shutil
from playwright.sync_api import sync_playwright

checks=[]
def check(name,condition):
    if not condition:raise AssertionError(name)
    checks.append(name)

with sync_playwright() as p:
    chromium=shutil.which('chromium')
    browser=p.chromium.launch(headless=True,**({'executable_path':chromium} if chromium else {}))
    context=browser.new_context(viewport={'width':1024,'height':1366},has_touch=True,is_mobile=True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('Math.random = () => 0.999999;')
    page.goto(os.environ.get('ELDERFALL_TEST_URL','http://127.0.0.1:8000/'))
    check('Initial party selection',page.locator('#setup').is_visible())
    page.locator('#class-picker input[value="0"]').uncheck()
    page.locator('#start').tap()
    check('Empty party rejected',bool(page.locator('#setup-error').inner_text()))
    page.locator('#class-picker input[value="0"]').check();page.locator('#start').tap()
    check('Solo campaign starts',page.locator('#game').is_visible() and '남은 행동 4' in page.locator('#game-status').inner_text())
    check('25 touch tiles',page.locator('#board .tile').count()==25)
    check('Nonadjacent tile disabled',page.get_by_role('button',name='A1 황야',exact=True).is_disabled())
    check('Smart UI disables out-of-range attack',page.locator('#attack').is_disabled() and '남은 행동 4' in page.locator('#game-status').inner_text())
    check('Smart UI suggests next objective','남은 지역 3곳' in page.locator('#next-goal').inner_text())
    def next_turn():
        if '남은 행동 0' in page.locator('#game-status').inner_text():page.locator('#end-turn').tap()
    def move(pos):
        next_turn()
        page.locator('#board button').filter(has=page.locator('.coord',has_text=pos)).tap()
        check('Move '+pos,pos in page.locator('#active-info').inner_text())
    def fight(pos):
        while page.locator('#enemy-target option[value="'+pos+'"]').count():
            next_turn();page.select_option('#enemy-target',pos);page.locator('#attack').tap()
            while page.locator('#reward').is_visible():page.locator('#reward').get_by_role('button',name='기사에게').tap()
    for pos in ['B5','A5','A4','A3','A2']:move(pos)
    fight('A2')
    check('First seal, XP and loot', '봉인 1/3' in page.locator('#game-status').inner_text() and '레벨 2' in page.locator('#party').inner_text() and page.locator('#inventory .item-row').count()==2)
    page.reload()
    check('Automatic save resumes',page.locator('#game').is_visible() and '봉인 1/3' in page.locator('#game-status').inner_text() and 'A2' in page.locator('#active-info').inner_text())
    for pos in ['B2','B1']:move(pos)
    fight('B1')
    for pos in ['C1','D1','E1','E2','E3']:move(pos)
    fight('E3')
    check('Three seals and level 3', '봉인 3/3' in page.locator('#game-status').inner_text() and '레벨 3' in page.locator('#party').inner_text())
    for pos in ['D3','D2','D1']:move(pos)
    next_turn();check('Dragon summon enabled',page.locator('#summon').is_enabled());page.locator('#summon').tap()
    fight('D1')
    check('Whole campaign wins through touch UI','승리!' in page.locator('#outcome').inner_text())
    check('Finished game disables actions',page.locator('#attack').is_disabled() and page.locator('#end-turn').is_disabled())
    page.reload();check('Victory persists after reload','승리!' in page.locator('#outcome').inner_text())
    page.once('dialog',lambda d:d.dismiss());page.locator('#new-game').tap();check('Cancelled restart preserves game',page.locator('#game').is_visible())
    page.once('dialog',lambda d:d.accept());page.locator('#new-game').tap();check('Confirmed restart returns to selection',page.locator('#setup').is_visible())
    for i in range(4):page.locator(f'#class-picker input[value="{i}"]').check()
    page.locator('#start').tap()
    check('Four-player party starts',page.locator('#party .hero-panel').count()==4 and '남은 행동 3' in page.locator('#game-status').inner_text())
    page.locator('#end-turn').tap();check('Turn passes to mage','마법사' in page.locator('#turn-title').inner_text())
    page.locator('#end-turn').tap();page.locator('#end-turn').tap();page.locator('#end-turn').tap()
    check('Enemy phase and rotating leader','라운드 2/10' in page.locator('#game-status').inner_text() and '마법사' in page.locator('#turn-title').inner_text())
    for width,height in [(320,800),(390,844),(768,1024),(1024,768),(1024,1366),(1366,1024)]:
        page.set_viewport_size({'width':width,'height':height})
        check(f'No horizontal overflow {width}x{height}',page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    page.set_viewport_size({'width':1024,'height':768});page.screenshot(path='/tmp/elderfall-ipad.png',full_page=True)
    check('No JavaScript runtime errors',not errors)
    browser.close()
print(f'PASS: {len(checks)} browser checks')
for name in checks:print(' PASS:',name)

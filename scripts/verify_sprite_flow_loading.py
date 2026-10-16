"""A corrupt numerical motion file must show retry instead of a half-loaded game."""
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS,BASE
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page()
 page.route('**/assets/sprites/motion/flow.bin.gz*',lambda route:route.fulfill(status=200,body=b'corrupt-motion-field'))
 page.goto(BASE);page.wait_for_function('document.getElementById("enter").textContent==="다시 불러오기"',timeout=60000)
 assert page.locator('#enter').is_visible();assert page.locator('#load-copy').inner_text().startswith('3D 성역을 불러오지 못했습니다.')
 assert page.evaluate('!window.arena?.renderer&&!window.arena?.hero');browser.close()
 print('PASS corrupt motion data rejected before game creation with visible retry UI',flush=True)

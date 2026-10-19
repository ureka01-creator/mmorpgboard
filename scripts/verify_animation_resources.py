"""Verify native, licensed source clips and render their actual full-body motion."""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('ARENA_BASE','http://127.0.0.1:8020/')
catalog=json.loads((ROOT/'assets/animation-resources/catalog.json').read_text())
for name,sha in catalog['sha256'].items():assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha,name
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);page=browser.new_page(viewport={'width':1200,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'motion-resources.html',wait_until='networkidle');page.wait_for_function('window.motionResources?.cards.length===4',timeout=60000)
 result=page.evaluate('''()=>{
 const r=motionResources;r.setTime(0);const results=[];
 for(const c of r.cards)for(const name of c.clips.keys()){
  if(!c.select.querySelector(`option[value="${name}"]`))continue;
  r.setClip(c.index,name);const bones=[];c.model.traverse(o=>{if(o.isBone)bones.push(o)});const poses=[];
  for(let i=0;i<9;i++){r.setTime(c.duration*i/9);poses.push(bones.map(b=>b.quaternion.clone()));}
  const changed=bones.filter((b,n)=>poses.some(p=>p[n].angleTo(poses[0][n])>.02)).map(b=>b.name);
  if(changed.length<5)throw Error('No full-body motion '+name+' '+changed.length);
  if(c.kind==='attack'&&!changed.some(n=>/spine|chest/i.test(n)))throw Error('No authored torso action '+name);
  if(c.kind==='walk'&&!changed.some(n=>/thigh|leg/i.test(n)))throw Error('No leg gait '+name);
  results.push({name,duration:c.duration,joints:bones.length,changed:changed.length,changedBones:changed});
 }
 r.cards.forEach(c=>r.setClip(c.index,c.select.options[0].value));r.setTime(.4);return results;
 }''')
 assert len(result)==12,len(result)
 page.screenshot(path='/tmp/elderfall-native-resource-check.png');page.locator('#play').click();before=page.evaluate('motionResources.time');page.wait_for_timeout(250);assert page.evaluate('motionResources.time')>before;page.locator('#play').click();before=page.evaluate('motionResources.time');page.wait_for_timeout(150);assert page.evaluate('motionResources.time')==before
 page.select_option('#speed','0.5');assert page.locator('#speed').input_value()=='0.5'
 for w,h in [(1024,768),(768,1024),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('motionResources.setTime(.25)');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight')
 assert not errors,errors;page.close()
 retina=browser.new_context(viewport={'width':1024,'height':768},device_scale_factor=2,has_touch=True);rp=retina.new_page();rp.goto(BASE+'motion-resources.html',wait_until='networkidle');rp.wait_for_function('window.motionResources?.cards.length===4',timeout=60000)
 rp.evaluate('motionResources.setTime(.2);window.extraResizes=0;window.resizeCalls=[];const r=motionResources.renderer,original=r.setSize.bind(r);r.setSize=(...args)=>{extraResizes++;resizeCalls.push(args);return original(...args)};true');rp.wait_for_timeout(200);assert rp.evaluate('extraResizes')==0,rp.evaluate('({calls:resizeCalls,rect:document.getElementById("view").getBoundingClientRect().toJSON(),buffer:[motionResources.renderer.domElement.width,motionResources.renderer.domElement.height]})');retina.close();browser.close()
OUT=ROOT/'docs/animation-resources';OUT.mkdir(exist_ok=True);(OUT/'verification.json').write_text(json.dumps({'sourceFilesVerified':len(catalog['sha256']),'nativeClipsPlayed':result,'gameCharacterChanged':False},indent=2)+'\n')
print('PASS unchanged source hashes, 12 native clips, articulated torso/legs, play/pause, speed control and three viewport layouts',[(r['name'],r['changed'])for r in result],flush=True)

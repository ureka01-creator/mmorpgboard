"""Exercise illustrated/native comparison and capture real rendered playback."""
import base64,hashlib,json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_arena_browser import ARGS
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('ARENA_BASE','http://127.0.0.1:8044/');OUT=ROOT/'docs/warrior-native-motion';OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((ROOT/'assets/sprites/native-motion/manifest.json').read_text())
parts=json.loads((ROOT/'assets/sprites/native-motion/parts.json').read_text());assert hashlib.sha256((ROOT/'assets/sprites/native-motion'/parts['image']).read_bytes()).hexdigest()==parts['sha256']
for clip in manifest['clips'].values():assert hashlib.sha256((ROOT/'assets/sprites/native-motion'/clip['file']).read_bytes()).hexdigest()==clip['sha256']
assert hashlib.sha256((ROOT/manifest['appearanceReference']).read_bytes()).hexdigest()==manifest['appearanceSha256']
report={'scope':'2D illustrated preview based on native poses, not a rigged 3D skin','clips':{},'layouts':[]};frames=Path('/tmp/elderfall-warrior-native-video');frames.mkdir(exist_ok=True)
with sync_playwright()as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=ARGS);p=b.new_page(viewport={'width':1024,'height':768});errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE+'warrior-motion.html',wait_until='networkidle');p.wait_for_function('window.warriorMotion',timeout=60000)
 for key in ['walk','attack']:
  p.click('#'+key);assert p.locator('#'+key).get_attribute('aria-pressed')=='true'
  samples=p.evaluate('''key=>{const r=warriorMotion,d=r.manifest.clips[key].duration,out=[];for(let i=0;i<24;i++){r.setTime(d*i/24);const bones=[];r.model.traverse(o=>{if(o.isBone)bones.push({name:o.name,q:o.quaternion.toArray(),p:o.position.toArray()})});out.push({time:r.time,frame:r.frame,bones});}return out;}''',key)
  assert len({json.dumps(s['bones'])for s in samples})>12
  if key=='attack':assert len({str(s['frame']['a' if s['frame']['mix']<.5 else 'b'])for s in samples})==24
  report['clips'][key]={'duration':manifest['clips'][key]['duration'],'nativePoseSamples':24,'display':'continuous joint-driven legs' if key=='walk' else '24 illustrated poses plus persistent shield'}
  p.evaluate('warriorMotion.setTime(.4)');p.screenshot(path=str(OUT/(key+'-preview.png')))
 content=p.evaluate("""()=>{
 const r=warriorMotion;r.setClip('walk');const duration=r.manifest.clips.walk.duration,feet=[];
 for(let i=0;i<24;i++){r.setTime(duration*i/24);feet.push(structuredClone(r.equipment.audit.feet));}
 const differences=feet.map(f=>f.L[1]-f.R[1]);if(!(differences[0]>35&&differences[12]<-35))throw Error('Leading foot does not alternate');
 let maxSwitchJump=0;for(let i=0;i<24;i++){const t=duration*(i+.5)/24;r.setTime(t-1e-5);const a=structuredClone(r.equipment.audit.feet);r.setTime(t+1e-5);for(const side of ['L','R'])maxSwitchJump=Math.max(maxSwitchJump,Math.hypot(...a[side].map((v,k)=>v-r.equipment.audit.feet[side][k])));}
 if(maxSwitchJump>.05)throw Error('Gait pops at an atlas boundary');
 r.setClip('attack');const id=r.equipment.shield.uuid,canvas=document.createElement('canvas');canvas.width=r.renderer.domElement.width;canvas.height=r.renderer.domElement.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});let minContribution=Infinity;
 for(let i=0;i<48;i++){
  r.setTime(r.manifest.clips.attack.duration*i/48);const q=r.equipment.audit.shield;if(!q.visible||q.opacity!==1||r.equipment.shield.uuid!==id)throw Error('Shield was dropped or recreated');
  const v=r.equipment.shield.position.clone().project(r.artCamera),cw=canvas.width/2,x=Math.round(cw+(v.x*.5+.5)*cw),y=Math.round((.5-v.y*.5)*canvas.height);ctx.drawImage(r.renderer.domElement,0,0);const a=ctx.getImageData(x,y,1,1).data;
  r.equipment.shield.material.opacity=0;r.renderer.render(r.artScene,r.artCamera);ctx.drawImage(r.renderer.domElement,0,0);const b=ctx.getImageData(x,y,1,1).data;const difference=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);minContribution=Math.min(minContribution,difference);if(difference<10)throw Error('Shield contributes no visible pixels at '+i);
 }
 r.setTime(.75);return {leadingFootYDifferences:differences,maxMidframeFootJump:maxSwitchJump,shieldVisibleRenderSamples:48,minimumShieldPixelContribution:minContribution};
 }""")
 report['contentRegression']=content
 p.click('#play');p.wait_for_function('warriorMotion.playing&&warriorMotion.time>.6',timeout=10000);p.click('#play');before=p.evaluate('warriorMotion.time');p.wait_for_timeout(100);assert p.evaluate('warriorMotion.time')==before
 p.select_option('#speed','0.5');p.locator('#time').evaluate('(el)=>{el.value=500;el.dispatchEvent(new Event("input",{bubbles:true}))}');assert abs(p.evaluate('warriorMotion.time')-manifest['clips']['attack']['duration']*.5)<1e-8
 # Compare the native source at the same time with the independent original viewer.
 actual=p.evaluate('''()=>{const out={};warriorMotion.model.traverse(o=>{if(o.isBone)out[o.name]=[...o.position.toArray(),...o.quaternion.toArray()]});return out;}''')
 native=b.new_page(viewport={'width':800,'height':700});native.goto(BASE+'motion-resources.html',wait_until='networkidle');native.wait_for_function('window.motionResources?.cards.length===4',timeout=60000)
 expected=native.evaluate('''()=>{motionResources.setTime(.75);const out={};motionResources.cards[2].model.traverse(o=>{if(o.isBone)out[o.name]=[...o.position.toArray(),...o.quaternion.toArray()]});return out;}''');native.close()
 assert actual.keys()==expected.keys();error=max(abs(x-y)for name,row in actual.items()for x,y in zip(row,expected[name]));assert error<1e-6,error;report['nativeBoneMaxErrorVsOriginalViewer']=error
 for width,height in [(1024,768),(768,1024),(390,844),(605,800)]:
  p.set_viewport_size({'width':width,'height':height});p.evaluate('warriorMotion.setTime(.4)');assert p.evaluate('document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth');report['layouts'].append([width,height])
 p.set_viewport_size({'width':1024,'height':768});p.evaluate('requestAnimationFrame=()=>0;warriorMotion.setTime(0)');video=p.evaluate('''()=>{const out=[];for(const key of ['walk','attack']){warriorMotion.setClip(key);const d=warriorMotion.manifest.clips[key].duration;for(let i=0;i<Math.round(d*2*24);i++){warriorMotion.setTime(i/24);out.push(warriorMotion.renderer.domElement.toDataURL('image/jpeg',.9));}}return out;}''')
 for i,frame in enumerate(video):(frames/f'{i:04d}.jpg').write_bytes(base64.b64decode(frame.split(',')[1]))
 assert not errors,errors;report['browserErrors']=errors;report['videoFrames']=len(video);b.close()
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i',str(frames/'%04d.jpg'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-crf','18','-pix_fmt','yuv420p', '-movflags','+faststart',str(OUT/'paired-preview.mp4')],check=True)
(OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS alternating continuous gait, 48 visible shield samples, native pose match, controls, four layouts and rendered playback.')

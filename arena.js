import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as R from './arena-engine.mjs';
const $=id=>document.getElementById(id),motion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer,scene,camera,controls,hero,enemy,state=R.create(),phase='loading',started=false,clock=new THREE.Clock(),noticeTimer,activeAction=null,muted=false,audioContext;
const tweens=[],effects=[],sparks=[],torches=[],raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),up=new THREE.Vector3(0,1,0),groundPlane=new THREE.Plane(up,0),clickStart={x:0,y:0,time:0},pickables=[];
let lastInput=null;
let ground,hoverRing,enemyRing,pathLine,shadowLight,lastFootstep=0;
const palette={stone:0x687270,dark:0x37454a,moss:0x465a45};
function notify(text){clearTimeout(noticeTimer);$('notice').textContent=text;$('notice').hidden=false;noticeTimer=setTimeout(()=>$('notice').hidden=true,3500);}
function stone(color=palette.stone){
 const material=new THREE.MeshStandardMaterial({color,roughness:.93,metalness:.04});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 stoneWorld;');
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>\nvec4 stoneP=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nstoneP=instanceMatrix*stoneP;\n#endif\nstoneWorld=(modelMatrix*stoneP).xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 stoneWorld;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat stoneGrain=fract(sin(dot(floor(stoneWorld*85.),vec3(12.9898,78.233,37.719)))*43758.5453);\nfloat stonePatch=.5+.5*sin(stoneWorld.x*1.1+sin(stoneWorld.z*.72)*2.)*sin(stoneWorld.y*1.5+stoneWorld.z*.5);\ndiffuseColor.rgb *= .72+.35*stonePatch+.17*stoneGrain;`);
 };return material;
}
function roundedBox(w,h,d,bevel=.07){const shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1});g.translate(0,0,-d/2);return g;}
function mesh(geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function buildWorld(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x172b35);scene.fog=new THREE.FogExp2(0x172b35,.029);
 scene.add(new THREE.HemisphereLight(0x9bb8c9,0x232c24,1.25));
 shadowLight=new THREE.DirectionalLight(0xadc8db,3);shadowLight.position.set(-6,14,-7);shadowLight.castShadow=true;shadowLight.shadow.mapSize.set(2048,2048);Object.assign(shadowLight.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:1,far:45});shadowLight.shadow.bias=-.00015;shadowLight.shadow.normalBias=.025;scene.add(shadowLight);
 const warm=new THREE.DirectionalLight(0xffbb78,1.1);warm.position.set(8,6,5);scene.add(warm);
 const base=stone(0x35434a),floorMat=stone(0x707a74),wallMat=stone(0x65716f),trim=stone(0x839087),dark=stone(0x3b4848);
 ground=mesh(new THREE.PlaneGeometry(80,80),stone(0x2c3a34),0,-.15,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
 // Physical paving blocks, shared geometry/material and one instanced draw call.
 const tileGeo=roundedBox(.91,.12,.68,.035),tiles=new THREE.InstancedMesh(tileGeo,floorMat,18*20),dummy=new THREE.Object3D();
 let i=0;for(let z=0;z<20;z++)for(let x=0;x<18;x++){dummy.position.set((x-8.5)*.96+(z%2)*.2,-.10,(z-9.5)*.72);dummy.rotation.set(0,Math.sin(x*5+z*3)*.007,0);dummy.scale.set(1,.95+Math.sin(x+z*2)*.08,1);dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);tiles.setColorAt(i,new THREE.Color().setScalar(.89+((x*13+z*7)%11)*.017));i++;}tiles.receiveShadow=true;scene.add(tiles);dummy.scale.set(1,1,1);
 // Outer broken walls sit outside playable cells. Their height leaves the foreground readable.
 const brickGeo=roundedBox(1.25,.48,.68,.055),bricks=[];
 for(let layer=0;layer<4;layer++)for(let j=-7;j<=7;j++){if(Math.abs(j)<2)continue;if(layer===3&&j%3===0)continue;bricks.push([j*1.27+(layer%2)*.3,layer*.55+.25,-7.5]);}
 for(const side of [-1,1])for(let layer=0;layer<3;layer++)for(let j=-5;j<=2;j++){if(layer===2&&j%3===0)continue;bricks.push([side*8.65,layer*.55+.25,j*1.35]);}
 const wall=new THREE.InstancedMesh(brickGeo,wallMat,bricks.length);bricks.forEach((p,index)=>{dummy.position.set(...p);dummy.rotation.set(0,Math.abs(p[0])>8?Math.PI/2:0,0);dummy.updateMatrix();wall.setMatrixAt(index,dummy.matrix);});wall.castShadow=true;wall.receiveShadow=true;scene.add(wall);
 // Four columns correspond exactly to the navigation obstacles.
 for(const [x,z] of R.obstacles){const p=R.world({x,z}),group=new THREE.Group();group.position.set(p.x,0,p.z);scene.add(group);const parts=[new THREE.Mesh(roundedBox(1.16,.2,1.16),dark),new THREE.Mesh(new THREE.CylinderGeometry(.35,.43,1.85,14),wallMat),new THREE.Mesh(roundedBox(.95,.2,.95),trim)];parts[0].position.y=.1;parts[1].position.y=1.07;parts[2].position.y=2.08;parts.forEach(part=>{part.castShadow=true;part.receiveShadow=true;group.add(part);part.userData.blocker=true;pickables.push(part);});}
 // Ruined arched gateway and layered stone detail.
 for(const x of [-1.65,1.65]){mesh(new THREE.CylinderGeometry(.24,.36,2.8,14),wallMat,x,1.4,-7.55);mesh(roundedBox(.8,.24,.8),trim,x,.15,-7.55);mesh(roundedBox(.85,.25,.8),trim,x,2.78,-7.55);}
 const arch=mesh(new THREE.TorusGeometry(1.65,.29,10,30,Math.PI),trim,0,2.85,-7.55);arch.rotation.z=0;
 const doorLight=new THREE.PointLight(0x66bccb,10,13,2);doorLight.position.set(0,2.6,-8.2);scene.add(doorLight);
 for(const x of [-6.9,6.9])makeTorch(x,-5.6);
 // Weathered fragments outside the traversable floor; no decorative collider surprises.
 const rubbleGeo=new THREE.IcosahedronGeometry(.45,1),rubble=new THREE.InstancedMesh(rubbleGeo,dark,60);
 for(let n=0;n<60;n++){const side=n%2===0?-1:1,x=side*(8.5+(n%5)*.25),z=-7.5+(n*.69)%12.5;dummy.position.set(x,.05,z);dummy.rotation.set(n*.71,n*.31,n*.43);dummy.scale.set(.8+(n%4)*.2,.4+(n%3)*.12,.9);dummy.updateMatrix();rubble.setMatrixAt(n,dummy.matrix);}rubble.castShadow=true;rubble.receiveShadow=true;scene.add(rubble);dummy.scale.set(1,1,1);
 const grassMat=new THREE.MeshStandardMaterial({color:0x3c5047,roughness:1,side:THREE.DoubleSide});const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.11,.6,3),grassMat,140);
 for(let n=0;n<140;n++){const edge=n%2===0?-1:1;dummy.position.set(edge*(8.15+(n%7)*.14),.18,-7+(n*.44)%14);dummy.rotation.set(.1,n*.6,edge*.3);dummy.scale.set(1,.45+(n%4)*.18,1);dummy.updateMatrix();grass.setMatrixAt(n,dummy.matrix);}scene.add(grass);
 hoverRing=ring(0xe1c480,.36);hoverRing.visible=false;enemyRing=ring(0xb86753,.65);enemyRing.visible=false;
}
function ring(color,radius){const m=new THREE.Mesh(new THREE.RingGeometry(radius-.025,radius,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=.045;scene.add(m);return m;}
function glowTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,230,165,1)');g.addColorStop(.2,'rgba(255,155,60,.7)');g.addColorStop(1,'rgba(255,110,10,0)');c.fillStyle=g;c.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);}
function makeTorch(x,z){const pole=mesh(new THREE.CylinderGeometry(.055,.09,1.6,8),new THREE.MeshStandardMaterial({color:0x302d25,metalness:.7,roughness:.6}),x,.8,z);mesh(new THREE.ConeGeometry(.18,.27,8),stone(0x292c28),x,1.62,z);const flame=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:0xffa74b}));flame.position.set(x,1.9,z);flame.scale.set(.8,1.05,1);scene.add(flame);const light=new THREE.PointLight(0xffad60,13,12,2);light.position.set(x,2,z);scene.add(light);torches.push({flame,light,base:13,seed:x});}
async function loadActor(url,isHero,progress){const gltf=await new GLTFLoader().loadAsync(url,progress);const model=gltf.scene,group=new THREE.Group();group.add(model);scene.add(group);
 model.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;if(m.material){m.material=m.material.clone();m.material.roughness=Math.max(.55,m.material.roughness??.8);}}
  if(isHero&&['1H_Sword_Offhand','Badge_Shield','Rectangle_Shield','Spike_Shield','2H_Sword'].includes(m.name))m.visible=false;
 });
 model.updateMatrixWorld(true);const b=new THREE.Box3();model.traverse(m=>{if(m.isMesh&&m.name.startsWith(isHero?'Knight_':'Skeleton_Warrior_'))b.expandByObject(m);});const size=b.getSize(new THREE.Vector3()),scale=2.2/size.y;model.scale.setScalar(scale);model.position.y=-b.min.y*scale;
 const mixer=new THREE.AnimationMixer(model),actions=new Map(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
 for(const name of ['Idle','Walking_A','1H_Melee_Attack_Slice_Diagonal','Hit_A','Death_A'])if(!actions.has(name))throw Error('필요한 동작이 빠진 캐릭터 모델입니다.');
 const actor={group,model,mixer,actions,action:null,clip:null,isHero,ring:isHero?ring(0xb9cebc,.58):enemyRing};
 actor.ring.visible=true;play(actor,'Idle');return actor;
}
function play(actor,name,once=false){const action=actor.actions.get(name);if(!action)throw Error('동작을 찾지 못했습니다: '+name);if(actor.action===action&&!once)return action.getClip().duration;const old=actor.action;action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);action.clampWhenFinished=once;action.fadeIn(.12).play();if(old&&old!==action)old.fadeOut(.12);actor.action=action;actor.clip=name;return action.getClip().duration;}
function setPosition(actor,p){const w=R.world(p);actor.group.position.set(w.x,0,w.z);actor.ring.position.set(w.x,.04,w.z);}
function tween(duration,update){return new Promise(resolve=>tweens.push({elapsed:0,duration,update,resolve}));}
function face(actor,target){actor.group.rotation.y=Math.atan2(target.x-actor.group.position.x,target.z-actor.group.position.z);}
function setPhase(next,hint){phase=next;$('phase').textContent={ready:'당신의 차례',moving:'이동 중',attacking:'검격',enemy:'수호병의 반격',won:'결투 승리',loading:'불러오는 중'}[next]||next;if(hint)$('hint').textContent=hint;$('attack').disabled=!started||next!=='ready'||state.enemy.hp<=0;$('reset').disabled=!started||!['ready','won'].includes(next);}
function updateHUD(){$('hero-health').style.width=state.hero.hp/state.hero.max*100+'%';$('enemy-health').style.width=state.enemy.hp/state.enemy.max*100+'%';$('hero-hp').textContent=`체력 ${state.hero.hp} / ${state.hero.max}`;$('enemy-hp').textContent=state.enemy.hp+' / '+state.enemy.max;}
function pathPreview(route){if(pathLine){scene.remove(pathLine);pathLine.geometry.dispose();pathLine.material.dispose();pathLine=null;}if(!route?.length)return;const positions=[hero.group.position.clone().setY(.08),...route.map(p=>{const w=R.world(p);return new THREE.Vector3(w.x,.08,w.z);})];pathLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(positions),new THREE.LineDashedMaterial({color:0xd4bd8a,dashSize:.17,gapSize:.13,transparent:true,opacity:.75}));pathLine.computeLineDistances();scene.add(pathLine);}
async function walk(route){if(!route?.length)return;setPhase('moving','장애물을 돌아 목적지로 이동합니다.');hoverRing.visible=false;pathPreview(route);play(hero,'Walking_A');
 for(const step of route){const start=hero.group.position.clone(),w=R.world(step),end=new THREE.Vector3(w.x,0,w.z),duration=start.distanceTo(end)/2.35;face(hero,end);await tween(duration,t=>{hero.group.position.lerpVectors(start,end,t);hero.ring.position.set(hero.group.position.x,.04,hero.group.position.z);});state.hero.x=step.x;state.hero.z=step.z;}
 play(hero,'Idle');pathPreview(null);
}
async function moveTo(to){if(phase!=='ready'||activeAction||!started)return;const route=R.path(state,to);if(!route?.length){notify('기둥과 벽을 피해 갈 수 있는 바닥을 누르세요.');return;}activeAction='move';try{await walk(route);setPhase('ready','수호병을 누르면 접근해 공격합니다.');}finally{activeAction=null;}}
function floating(actor,amount,enemyDamage=false){const el=document.createElement('div');el.className='damage-floater'+(enemyDamage?' enemy-damage':'');el.textContent='−'+amount;$('floaters').append(el);effects.push({el,actor,time:0});}
function impact(actor,heroHit=false){const pos=actor.group.position.clone().add(new THREE.Vector3(0,1,0));const material=new THREE.MeshBasicMaterial({color:heroHit?0xf49c71:0xffd6a0,transparent:true});for(let n=0;n<9;n++){const m=new THREE.Mesh(new THREE.SphereGeometry(.023,4,3),material.clone());m.position.copy(pos);scene.add(m);sparks.push({mesh:m,v:new THREE.Vector3(Math.sin(n*2.4)*2,.4+(n%4)*.5,Math.cos(n*2.4)*2),time:0});}sound('impact');if(heroHit&&!motion){$('impact-flash').classList.add('hit');setTimeout(()=>$('impact-flash').classList.remove('hit'),220);}}
async function attackEnemy(){if(phase!=='ready'||activeAction||!started||state.enemy.hp<=0)return;activeAction='attack';try{
 const route=R.approach(state);if(route===null){notify('적에게 접근할 경로가 없습니다.');return;}setPhase(route.length?'moving':'attacking');await walk(route);setPhase('attacking','검이 닿는 순간, 수호병이 반응합니다.');face(hero,enemy.group.position);face(enemy,hero.group.position);sound('swing');const duration=play(hero,'1H_Melee_Attack_Slice_Diagonal',true),hitTime=duration*.46;
 await tween(hitTime,()=>{});const amount=R.attack(state);updateHUD();floating(enemy,amount);impact(enemy);
 const dead=state.enemy.hp===0;play(enemy,dead?'Death_A':'Hit_A',true);await tween(duration-hitTime+.18,()=>{});play(hero,'Idle');
 if(dead){await tween(.55,()=>{});enemyRing.visible=false;setPhase('won','수호병이 쓰러졌습니다. 다시 시작해 다른 경로로 접근해보세요.');return;}
 setPhase('enemy','수호병이 검을 들어 반격합니다.');const enemyDuration=play(enemy,'1H_Melee_Attack_Slice_Diagonal',true);sound('swing');await tween(enemyDuration*.48,()=>{});const damage=R.counter(state);updateHUD();floating(hero,damage,true);impact(hero,true);play(hero,'Hit_A',true);await tween(enemyDuration*.52+.3,()=>{});play(enemy,'Idle');play(hero,'Idle');setPhase('ready','빈 바닥을 눌러 위치를 바꾸거나 수호병을 다시 공격하세요.');
 }catch(error){notify(error.message);setPhase('ready');}finally{activeAction=null;}}
function initSound(){try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});}catch{}}
function sound(type){if(muted||!audioContext||audioContext.state!=='running')return;const time=audioContext.currentTime,gain=audioContext.createGain();gain.connect(audioContext.destination);const oscillator=audioContext.createOscillator();oscillator.connect(gain);oscillator.type=type==='impact'?'triangle':'sine';oscillator.frequency.setValueAtTime(type==='impact'?550:type==='step'?85:230,time);oscillator.frequency.exponentialRampToValueAtTime(type==='impact'?130:45,time+.13);gain.gain.setValueAtTime(type==='step'?.022:.06,time);gain.gain.exponentialRampToValueAtTime(.001,time+.18);oscillator.start(time);oscillator.stop(time+.2);}
function project(position){camera.updateMatrixWorld();const p=position.clone().project(camera);return {x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight,visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2};}
function rotateCamera(angle){const offset=camera.position.clone().sub(controls.target).applyAxisAngle(up,angle);camera.position.copy(controls.target).add(offset);controls.update();camera.updateMatrixWorld();}
function focusHero(){if(!hero)return;const goal=hero.group.position.clone(),delta=goal.clone().sub(controls.target),initial=camera.position.clone(),targetStart=controls.target.clone();tween(.45,t=>{const smooth=t*t*(3-2*t);controls.target.lerpVectors(targetStart,goal,smooth);camera.position.copy(initial).addScaledVector(delta,smooth);controls.update();});}
function resize(){renderer?.setSize(innerWidth,innerHeight,false);if(camera){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}}
function pick(event){camera.updateMatrixWorld();pointer.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);const objects=[...pickables.filter(p=>!p.userData.enemy||state.enemy.hp>0),...(state.enemy.hp>0?[enemy.model]:[])],hits=raycaster.intersectObjects(objects,true);if(hits[0]){const hit=hits[0].object;if(hit.userData.blocker)return {blocked:true};if(hit.userData.enemy||enemy.model.getObjectById(hit.id))return {enemy:true};}const p=raycaster.ray.intersectPlane(groundPlane,new THREE.Vector3());return p?{cell:R.cell(p)}:null;}
function input(){const canvas=$('scene');let moved=false,pointers=0;
 canvas.addEventListener('pointerdown',event=>{pointers++;moved=pointers>1;clickStart.x=event.clientX;clickStart.y=event.clientY;clickStart.time=performance.now();});
 canvas.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-clickStart.x,event.clientY-clickStart.y)>8&&event.buttons)moved=true;if(phase!=='ready'||!started||event.buttons||event.pointerType==='touch')return;const target=pick(event);if(target?.enemy){enemyRing.material.opacity=1;hoverRing.visible=false;pathPreview(R.approach(state));canvas.style.cursor='crosshair';}else if(target?.cell&&!R.blocked(state,target.cell.x,target.cell.z)){const w=R.world(target.cell);hoverRing.position.set(w.x,.045,w.z);hoverRing.visible=true;pathPreview(R.path(state,target.cell));canvas.style.cursor='pointer';}else{hoverRing.visible=false;pathPreview(null);canvas.style.cursor='default';}});
 canvas.addEventListener('pointerup',event=>{lastInput={x:event.clientX,y:event.clientY,phase,moved,age:performance.now()-clickStart.time,button:event.button,pointers};pointers=Math.max(0,pointers-1);if(!started||phase!=='ready'||moved||performance.now()-clickStart.time>650||event.button>0)return;initSound();const target=pick(event);lastInput.target=target;if(target?.enemy)attackEnemy();else if(target?.blocked)notify('기둥 안으로는 이동할 수 없습니다.');else if(target?.cell)moveTo(target.cell);});
 canvas.addEventListener('pointercancel',()=>{pointers=0;moved=true;});canvas.addEventListener('pointerleave',()=>{hoverRing.visible=false;if(phase==='ready')pathPreview(null);});
}
function reset(){state=R.create();setPosition(hero,state.hero);setPosition(enemy,state.enemy);hero.group.rotation.y=Math.PI/4;enemy.group.rotation.y=-Math.PI/2;hero.mixer.stopAllAction();enemy.mixer.stopAllAction();hero.action=enemy.action=null;play(hero,'Idle');play(enemy,'Idle');hero.ring.visible=enemyRing.visible=true;const center=camera.aspect<1.05?hero.group.position:new THREE.Vector3();controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(11,12,14));controls.update();camera.updateMatrixWorld();updateHUD();setPhase('ready','바닥을 눌러 이동하고, 수호병을 눌러 공격하세요.');}
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;controls.update();camera.updateMatrixWorld();
 for(const actor of [hero,enemy])actor?.mixer.update(dt);
 for(let i=tweens.length-1;i>=0;i--){const tween=tweens[i];tween.elapsed+=dt;const t=Math.min(1,tween.elapsed/tween.duration);tween.update(t);if(t===1){tweens.splice(i,1);tween.resolve();}}
 if(hero&&enemy&&phase==='moving'){const goal=camera.aspect<1.05?hero.group.position:hero.group.position.clone().add(enemy.group.position).multiplyScalar(.5);const shift=goal.clone().sub(controls.target).multiplyScalar(1-Math.exp(-dt*4));controls.target.add(shift);camera.position.add(shift);camera.updateMatrixWorld();}
 if(hero&&phase==='moving'&&time-lastFootstep>.38){sound('step');lastFootstep=time;}
 for(const torch of torches){const flicker=1+Math.sin(time*6+torch.seed)*.055+Math.sin(time*13)*.025;torch.light.intensity=torch.base*flicker;torch.flame.scale.set(.78*flicker,1.05*flicker,1);}
 if(enemy&&started){const p=project(enemy.group.position.clone().add(new THREE.Vector3(0,2.5,0)));$('enemy-label').hidden=!p.visible||state.enemy.hp<=0;$('enemy-label').style.left=p.x+'px';$('enemy-label').style.top=p.y+'px';}
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.time+=dt;const p=project(e.actor.group.position.clone().add(new THREE.Vector3(0,2.25,0)));e.el.style.left=p.x+'px';e.el.style.top=p.y+'px';if(e.time>1){e.el.remove();effects.splice(i,1);}}
 for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.time+=dt;s.v.y-=6*dt;s.mesh.position.addScaledVector(s.v,dt);s.mesh.material.opacity=Math.max(0,1-s.time/.5);if(s.time>.5){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();sparks.splice(i,1);}}
 renderer.render(scene,camera);
}
async function setup(){try{
 renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 buildWorld();camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);camera.position.set(11,12,14);controls=new OrbitControls(camera,$('scene'));controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=7;controls.maxDistance=29;controls.maxPolarAngle=Math.PI*.43;controls.minPolarAngle=Math.PI*.14;controls.target.set(0,0,0);controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE;resize();frame();
 const fractions=[0,0],progress=index=>event=>{fractions[index]=event.lengthComputable?event.loaded/event.total:.4;$('load-progress').style.width=(fractions[0]+fractions[1])*45+'%';};
 [hero,enemy]=await Promise.all([loadActor('assets/3d/adventurers/Characters/gltf/Knight.glb',true,progress(0)),loadActor('assets/3d/skeletons/Characters/gltf/Skeleton_Warrior.glb',false,progress(1))]);
 const blade=await new GLTFLoader().loadAsync('assets/3d/skeletons/Assets/gltf/Skeleton_Blade.gltf');const hand=enemy.model.getObjectByName('handslotr')||enemy.model.getObjectByName('handslot.r');if(!hand)throw Error('수호병의 무기 뼈대를 찾지 못했습니다.');hand.add(blade.scene);blade.scene.traverse(m=>{if(m.isMesh)m.castShadow=true;});
 const targetCollider=new THREE.Mesh(new THREE.CapsuleGeometry(.48,1.3,4,8),new THREE.MeshBasicMaterial({visible:false}));targetCollider.position.y=1.1;targetCollider.userData.enemy=true;enemy.group.add(targetCollider);pickables.push(targetCollider);
 reset();input();$('load-progress').style.width='100%';$('load-copy').textContent='차가운 돌길 끝에 수호병이 기다립니다.';$('enter').hidden=false;
 $('enter').onclick=()=>{initSound();started=true;$('loading').classList.add('exiting');setTimeout(()=>$('loading').hidden=true,700);$('hud').hidden=false;$('controls-note').hidden=false;setPhase('ready','바닥을 눌러 이동하고, 수호병을 눌러 공격하세요.');};
 }catch(error){console.error(error);$('load-copy').textContent='3D 장면을 불러오지 못했습니다. WebGL을 지원하는 최신 브라우저에서 다시 시도하세요.';$('enter').textContent='다시 불러오기';$('enter').hidden=false;$('enter').onclick=()=>location.reload();phase='error';}}
$('attack').onclick=()=>{initSound();attackEnemy();};$('camera-left').onclick=()=>rotateCamera(-Math.PI/6);$('camera-right').onclick=()=>rotateCamera(Math.PI/6);$('camera-home').onclick=focusHero;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'♩':'♪';$('sound').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');$('sound').setAttribute('aria-pressed',String(muted));if(!muted)initSound();};
$('reset').onclick=()=>$('reset-dialog').showModal();$('reset-cancel').onclick=()=>$('reset-dialog').close();$('reset-confirm').onclick=()=>{$('reset-dialog').close();reset();};window.addEventListener('resize',resize);
// Read-only scene diagnostics also support camera-relative UI verification.
window.arena={get state(){return state;},get phase(){return phase;},get hero(){return hero;},get enemy(){return enemy;},get renderer(){return renderer;},get camera(){return camera;},get started(){return started;},projectCell(cell){const w=R.world(cell);return project(new THREE.Vector3(w.x,.05,w.z));},projectEnemy(){return project(enemy.group.position.clone().add(new THREE.Vector3(0,1,0)));},get activeAction(){return activeAction;},get lastInput(){return lastInput;},pickAt(x,y){return pick({clientX:x,clientY:y});}};
setup();

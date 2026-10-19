import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
const root='./assets/animation-resources/',status=document.getElementById('status'),play=document.getElementById('play');
try{
 const loader=new GLTFLoader(),catalog=await fetch(root+'catalog.json').then(r=>{if(!r.ok)throw Error('Catalog HTTP '+r.status);return r.json();});
 const packs=new Map(await Promise.all(catalog.packs.map(async p=>[p.id,await loader.loadAsync('./'+p.file)])));
 const definitions=[
  {pack:'quaternius',title:'Quaternius · 걷기',clips:['Walk_Loop','Walk_Formal_Loop','Jog_Fwd_Loop'],kind:'walk'},
  {pack:'kaykit-movement',title:'KayKit · 걷기',clips:['Walking_A','Walking_B','Walking_C','Running_A'],kind:'walk'},
  {pack:'quaternius',title:'Quaternius · 검 공격',clips:['Sword_Attack','Sword_Attack_RM'],kind:'attack'},
  {pack:'kaykit-melee',title:'KayKit · 한손검 공격',clips:['Melee_1H_Attack_Slice_Diagonal','Melee_1H_Attack_Slice_Horizontal','Melee_1H_Attack_Chop'],kind:'attack'}
 ];
 const canvas=document.getElementById('view'),renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setScissorTest(true);renderer.setClearColor(0x182329);renderer.outputColorSpace=T.SRGBColorSpace;
 const renderSize=new T.Vector2(),cards=[];let paused=false,time=0,last=performance.now(),speed=1,needsRender=true;
 definitions.forEach((def,index)=>{
  const asset=packs.get(def.pack),model=clone(asset.scene),scene=new T.Scene(),wrapper=new T.Group();wrapper.add(model);scene.add(wrapper);
  // Scale the entire display object; source skeletons, skin weights and keys stay native.
  model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());if(size.y<=0)throw Error('Empty rig '+def.pack);
  wrapper.scale.setScalar(1.85/size.y);wrapper.position.y=-bounds.min.y*wrapper.scale.y;wrapper.rotation.y=0;
  scene.add(new T.HemisphereLight(0xc9e1ee,0x647061,2.4));const light=new T.DirectionalLight(0xffe3bf,3);light.position.set(-3,6,4);scene.add(light);
  const floor=new T.Mesh(new T.PlaneGeometry(8,8),new T.MeshStandardMaterial({color:0x26343a,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;scene.add(floor);const grid=new T.GridHelper(5,10,0x49616d,0x30454e);scene.add(grid);
  const camera=new T.OrthographicCamera(-1.6,1.6,1.5,-1.5,.01,30);camera.position.set(3.5,4.3,6.5);camera.lookAt(0,.95,0);
  if(def.kind==='attack'){
   const hand=model.getObjectByName(def.pack==='quaternius'?'DEF-handR':'handslotr')||model.getObjectByName(def.pack==='quaternius'?'DEF-hand.R':'handslot.r');
   if(!hand)throw Error('Missing original weapon hand '+def.pack);
   const prop=new T.Group(),steel=new T.MeshStandardMaterial({color:0xc6d1d9,metalness:.7,roughness:.35}),grip=new T.Mesh(new T.BoxGeometry(.055,.16,.055),new T.MeshStandardMaterial({color:0x694831}));prop.add(grip);
   const blade=new T.Mesh(new T.BoxGeometry(.065,.72,.022),steel);blade.position.y=.47;prop.add(blade);const guard=new T.Mesh(new T.BoxGeometry(.23,.035,.06),steel);guard.position.y=.09;prop.add(guard);
   if(def.pack==='quaternius'){prop.rotation.x=Math.PI/2;prop.position.y=.07;}hand.add(prop);
  }
  const mixer=new T.AnimationMixer(model),entry={...def,index,scene,camera,mixer,model,clips:new Map(asset.animations.map(c=>[c.name,c])),action:null,nativeTime:0};cards.push(entry);
  const card=document.createElement('section');card.className='card';const bar=document.createElement('div');bar.className='bar';const title=document.createElement('strong');title.textContent=def.title;const select=document.createElement('select');select.setAttribute('aria-label',def.title+' 클립');def.clips.forEach(name=>{if(!entry.clips.has(name))throw Error('Missing source clip '+name);const option=document.createElement('option');option.value=option.textContent=name;select.append(option);});bar.append(title,select);const info=document.createElement('small');card.append(bar,info);document.getElementById('labels').append(card);entry.select=select;entry.info=info;
  select.addEventListener('change',()=>setClip(index,select.value));setClip(index,def.clips[0]);
 });
 function setClip(index,name){const c=cards[index],clip=c.clips.get(name);if(!clip)throw Error('Unknown clip '+name);c.mixer.stopAllAction();c.action=c.mixer.clipAction(clip);c.action.reset().setLoop(T.LoopRepeat,Infinity).play();c.name=name;c.duration=clip.duration;c.select.value=name;c.info.textContent=`CC0 · 원본 ${clip.duration.toFixed(3)}초 · ${clip.tracks.length}개 트랙`;c.mixer.setTime(0);needsRender=true;}
 function render(at){
  const w=Math.round(canvas.clientWidth),h=Math.round(canvas.clientHeight);if(!w||!h)return;renderer.getSize(renderSize);if(renderSize.x!==w||renderSize.y!==h)renderer.setSize(w,h,false);
  cards.forEach(c=>{
   const x=Math.round(c.index%2*w/2),y=Math.round((1-Math.floor(c.index/2))*h/2),cw=Math.round(w/2),ch=Math.round(h/2);
   // Keep root-motion clips visible by repeating their original complete cycles.
   c.nativeTime=((at%c.duration)+c.duration)%c.duration;c.action.reset().setLoop(T.LoopRepeat,Infinity).play();c.mixer.setTime(c.nativeTime);
   c.camera.left=-1.55*cw/ch;c.camera.right=1.55*cw/ch;c.camera.updateProjectionMatrix();renderer.setViewport(x,y,cw,ch);renderer.setScissor(x,y,cw,ch);renderer.render(c.scene,c.camera);
  });needsRender=false;
 }
 function frame(now){requestAnimationFrame(frame);const dt=Math.max(0,(now-last)/1000);last=now;renderer.getSize(renderSize);const resized=renderSize.x!==Math.round(canvas.clientWidth)||renderSize.y!==Math.round(canvas.clientHeight);if(!paused){time+=dt*speed;render(time);}else if(needsRender||resized)render(time);}
 play.disabled=false;play.addEventListener('click',()=>{paused=!paused;play.textContent=paused?'재생':'일시 정지';});document.getElementById('speed').addEventListener('change',e=>{speed=Number(e.target.value);});
 window.motionResources={cards,catalog,renderer,setClip,setTime(value){paused=true;time=value;play.textContent='재생';render(time);},get time(){return time;},get paused(){return paused;}};
 render(0);status.textContent='원본 리소스 준비 완료';requestAnimationFrame(frame);
}catch(error){status.textContent='리소스 로딩 실패: '+error.message;status.classList.add('error');console.error(error);}

import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {bindMotion,sampleClip,actionTime} from './arena-clips.mjs?v=2.5';
import {damp,turn} from './arena-motion.mjs?v=2.5';
import {footPoint} from './arena-actors.mjs?v=2.5';
export {footPoint};
const UP=new T.Vector3(0,1,0),GROUND=.02;
let pending;
export function loadStudyAssets(){return pending??=Promise.all([
 new GLTFLoader().loadAsync('./assets/characters/warden.glb?v=2.9'),
 fetch('./assets/animations/fullplate-motion.json?v=2.5').then(r=>{if(!r.ok)throw Error('Motion HTTP '+r.status);return r.json();})
]).then(([model,pack])=>{if(pack.schema!==2||pack.joints.length!==53)throw Error('Invalid study skeleton');return {model,pack};});}
const material=(color,metalness=0,roughness=.7)=>new T.MeshStandardMaterial({color,metalness,roughness});
function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function sword(actor){
 const steel=material(0xb1b9b5,.55,.40),edge=material(0xd2d4c9,.75,.30),leather=material(0x302018),brass=material(0x897244,.65,.5),w=new T.Group();actor.arms[1].hand.add(w);w.rotation.x=Math.PI/2;
 mesh(w,new T.CylinderGeometry(.019,.021,.17,12),leather,0,.015,0);
 for(let j=0;j<7;j++)mesh(w,new T.TorusGeometry(.020,.0025,4,12),brass,0,-.06+j*.021,0).rotation.x=Math.PI/2;
 mesh(w,new T.SphereGeometry(.029,16,10),brass,0,-.092,0);
 const guard=mesh(w,new T.BoxGeometry(.25,.026,.035),brass,0,.115,0);guard.rotation.z=-.035;
 const points=[[-.035,.14,0],[.035,.14,0],[-.026,.85,0],[.026,.85,0],[0,1.02,0],[0,.14,.015],[0,.85,.012]];
 const faces=[0,5,2,5,6,2,5,1,6,1,3,6,2,6,4,6,3,4],positions=[];
 for(const i of faces)positions.push(...points[i]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();const blade=mesh(w,g,steel);blade.material.side=T.DoubleSide;
 mesh(w,new T.BoxGeometry(.005,.64,.007),edge,0,.47,.012);return w;
}
function shield(actor,isHero){
 const s=new T.Group();actor.arms[0].hand.add(s);const wood=material(isHero?0x493222:0x323b38,0,.92),steel=material(0x6f7a7b,.70,.48),brass=material(0x8b7041,.6,.5);
 mesh(s,new T.CylinderGeometry(.28,.28,.038,48),wood).rotation.x=Math.PI/2;
 mesh(s,new T.TorusGeometry(.27,.022,8,48),steel,0,0,.026);
 for(const x of [-.13,0,.13]){const h=Math.sqrt(.245**2-x*x)*2;mesh(s,new T.BoxGeometry(.008,h,.006),steel,x,0,.026);}
 const boss=mesh(s,new T.SphereGeometry(.067,24,12),steel,0,0,.045);boss.scale.z=.5;
 for(let i=0;i<10;i++){const a=i*Math.PI/5;mesh(s,new T.SphereGeometry(.007,8,6),brass,Math.cos(a)*.241,Math.sin(a)*.241,.044);}return s;
}
export function createActor(scene,isHero,assets){
 const group=new T.Group(),model=clone(assets.model.scene);model.scale.setScalar(1.1);group.add(model);scene.add(group);
 const a={group,model,isHero,height:2.05,headDiameter:.24,renderType:'continuous-skin',skins:[],footVertices:[[],[]],samples:[]};
 model.traverse(o=>{if(o.isSkinnedMesh){const adjust=m=>{const c=m.clone();if(!isHero&&/red cloth/i.test(c.name))c.color.set(0x273a3d);return c;};o.material=Array.isArray(o.material)?o.material.map(adjust):adjust(o.material);o.castShadow=o.receiveShadow=true;o.frustumCulled=false;a.skins.push(o);}});
 bindMotion(a,assets.pack);group.updateMatrixWorld(true);
 for(const skin of a.skins)for(let i=0;i<skin.geometry.attributes.position.count;i++){const v=new T.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i).applyMatrix4(skin.matrixWorld);if(v.y<.29)a.footVertices[v.x>0?0:1].push([skin,i]);}
 a.rest=a.clipRig.joints.map(j=>j.quaternion.clone());a.restPelvis=a.pelvis.position.clone();a.restFeet=a.legs.map((l,i)=>({position:group.worldToLocal(l.ankle.getWorldPosition(new T.Vector3())),quaternion:l.ankle.getWorldQuaternion(new T.Quaternion()),soleOffset:footPoint(a,i).y-l.ankle.getWorldPosition(new T.Vector3()).y}));
 a.weapon=sword(a);a.shield=shield(a,isHero);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(8*18),3));a.trail=mesh(scene,geo,new T.MeshBasicMaterial({color:isHero?0xe2c798:0x9bbabd,transparent:true,opacity:.13,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false}));a.trail.frustumCulled=false;a.trail.visible=false;
 return a;
}
function update(a){a.group.updateMatrixWorld(true);for(const s of a.skins)s.skeleton.update();}
// Analytic two-bone IK. Targets are world positions, with an explicit bend pole.
function solve(shoulder,elbow,hand,goal,pole){
 const h=shoulder.getWorldPosition(new T.Vector3()),k=elbow.getWorldPosition(new T.Vector3()),f=hand.getWorldPosition(new T.Vector3()),l1=h.distanceTo(k),l2=k.distanceTo(f),v=goal.clone().sub(h),d=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.0001,v.length()));v.normalize();
 const bend=pole.clone().addScaledVector(v,-pole.dot(v)).normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),rise=Math.sqrt(Math.max(0,l1*l1-along*along)),mid=h.clone().addScaledVector(v,along).addScaledVector(bend,rise);
 let q=new T.Quaternion().setFromUnitVectors(k.clone().sub(h).normalize(),mid.clone().sub(h).normalize()).multiply(shoulder.getWorldQuaternion(new T.Quaternion()));shoulder.quaternion.copy(shoulder.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));shoulder.updateWorldMatrix(false,true);
 const ek=elbow.getWorldPosition(new T.Vector3()),ef=hand.getWorldPosition(new T.Vector3());q.setFromUnitVectors(ef.sub(ek).normalize(),goal.clone().sub(ek).normalize()).multiply(elbow.getWorldQuaternion(new T.Quaternion()));elbow.quaternion.copy(elbow.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));elbow.updateWorldMatrix(false,true);
}
function worldQ(bone,q){bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateWorldMatrix(false,true);}
function rotateWorld(bone,axis,angle){worldQ(bone,new T.Quaternion().setFromAxisAngle(axis,angle).multiply(bone.getWorldQuaternion(new T.Quaternion())));}
const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const keys=[
 [0,[-.42,-.36,.25],[0,-.15,1],0],
 [.08,[-.43,-.10,.08],[-.8,.35,-.30],-.10],
 [.15,[-.39,.06,-.06],[-.6,.65,-.30],-.22],
 [.26,[-.13,-.27,.43],[.03,-.14,1],.08],
 [.34,[.18,-.37,.31],[.85,-.26,.45],.28],
 [.48,[.06,-.40,.24],[.6,-.24,.7],.16],
 [.66,[-.42,-.36,.25],[0,-.15,1],0]
];
export function attackPose(t){
 t=T.MathUtils.clamp(t,0,.66);let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;
 const a=keys[Math.max(0,i-1)],b=keys[i],c=keys[i+1],d=keys[Math.min(keys.length-1,i+2)],span=c[0]-b[0],u=(t-b[0])/span,u2=u*u,u3=u2*u;
 function hermite(bv,cv,av,dv){const m0=i===0?0:(cv-av)/(c[0]-a[0])*span,m1=i===keys.length-2?0:(dv-bv)/(d[0]-b[0])*span;return (2*u3-3*u2+1)*bv+(u3-2*u2+u)*m0+(-2*u3+3*u2)*cv+(u3-u2)*m1;}
 const angles=v=>[Math.atan2(v[0],v[2]),Math.atan2(v[1],Math.hypot(v[0],v[2]))],aa=angles(a[2]),bb=angles(b[2]),cc=angles(c[2]),dd=angles(d[2]),yaw=hermite(bb[0],cc[0],aa[0],dd[0]),pitch=hermite(bb[1],cc[1],aa[1],dd[1]);
 return {hand:b[1].map((v,n)=>hermite(v,c[1][n],a[1][n],d[1][n])),blade:new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),twist:hermite(b[3],c[3],a[3],d[3])};
}
export function animateActor(a,body,time,reduced=false){
 const fresh=a.motion?.body!==body||time<a.motion.time;
 if(fresh)a.motion={body,time,travel:body.travel||0,x:body.x,z:body.z,phase:0,yaw:body.yaw,blend:0,footsteps:0,feet:[{},{}],oldMode:body.mode,hits:body.hits||0};
 const m=a.motion,dt=Math.max(0,Math.min(.1,time-m.time));if(!fresh&&dt===0)return;
 if(!fresh&&a.isHero&&m.oldMode==='attack'&&body.mode==='idle'&&body.hit&&(body.hits||0)>m.hits)m.finishUntil=time+.40;
 if(body.mode!=='idle'||time>=m.finishUntil)m.finishUntil=undefined;
 const mode=m.finishUntil?'attack':body.mode,elapsed=m.finishUntil?.26+time-(m.finishUntil-.40):(body.elapsed||0);
 const travel=Math.max(0,(body.travel||0)-m.travel),speed=dt?travel/dt:0;
 const moving=!['dodge','dead'].includes(mode)&&speed>.02;m.speed=damp(m.speed||0,speed,16,dt);const runWeight=smooth((m.speed-1.1)/2.2),stride=1.1+.9*runWeight,amplitude=stride/4;
 if(moving){const direction=['attack','windup'].includes(mode)&&((body.x-m.x)*Math.sin(m.yaw)+(body.z-m.z)*Math.cos(m.yaw)<-.00001)?-1:1;m.phase+=direction*travel/stride;}
 m.blend=damp(m.blend,moving?1:0,16,dt);
 const beforeYaw=m.yaw;m.yaw=fresh?body.yaw:turn(m.yaw,body.yaw,dt,20,12);const turnRate=dt?Math.abs(m.yaw-beforeYaw)/dt:0;
 a.group.position.set(body.x,0,body.z);a.group.rotation.y=m.yaw;a.pose=body.mode;
 a.clipRig.joints.forEach((j,i)=>j.quaternion.copy(a.rest[i]));a.pelvis.position.copy(a.restPelvis);
 // Preserve the actual curled finger grip from the licensed carry clip.
 sampleClip(a.clipRig.pack.clips.carry,0,a.clipRig.base,a.clipRig.position);
 a.clipRig.joints.forEach((j,i)=>{if(/^DEF-(f_|thumb)/.test(a.clipRig.pack.joints[i]))j.quaternion.copy(a.clipRig.base[i]);});
 let attackTime=0;
 if(mode==='windup')attackTime=.15*smooth(elapsed/.72);
 else if(mode==='attack')attackTime=a.isHero?elapsed:elapsed<=.18?.15+elapsed/.18*.11:.26+(elapsed-.18)/.42*.40;
 const pose=attackPose(attackTime),attacking=mode==='attack'||mode==='windup',bob=-Math.cos(m.phase*Math.PI*4)*(.008+.006*runWeight)*m.blend;
 update(a);const hipWorld=a.pelvis.getWorldPosition(new T.Vector3());hipWorld.y-=.035+(.04+.10*runWeight)*m.blend+(attacking?.025*Math.sin(Math.PI*attackTime/.66):0)-bob;a.pelvis.position.copy(a.pelvis.parent.worldToLocal(hipWorld));update(a);
 if(['dodge','hurt','dead'].includes(mode)){
  if(mode==='dead')m.deadStarted??=time;
  const clip=mode==='dodge'?'roll':mode,t=mode==='dead'?Math.min(a.clipRig.pack.clips.dead.duration,(time-m.deadStarted)*2):actionTime(mode,elapsed,a.isHero,a.clipRig.pack.clips);
  sampleClip(a.clipRig.pack.clips[clip],t,a.clipRig.base,a.clipRig.position);a.clipRig.joints.forEach((j,i)=>j.quaternion.copy(a.clipRig.base[i]));a.pelvis.position.copy(a.clipRig.position);update(a);for(const f of m.feet)f.planted=false;m.clip=clip;
 }else{
  const twist=attacking?pose.twist:Math.sin(m.phase*Math.PI*2)*.035*m.blend;rotateWorld(a.bones['DEF-spine.001'],UP,twist);
  rotateWorld(a.bones['DEF-spine.002'],new T.Vector3(1,0,0).applyAxisAngle(UP,m.yaw),.045*m.blend+(attacking?.025:0));
  rotateWorld(a.head,UP,-twist*.25);
  for(let i=0;i<2;i++){
   const l=a.legs[i],rest=a.restFeet[i],f=m.feet[i],phase=((m.phase+i*.5)%1+1)%1,stance=phase<.5,s=(phase-.5)*2;
   const z=stance?amplitude-stride*phase:amplitude*(-1+12*s*s-8*s*s*s-2*s),lift=stance?0:(.07+.07*runWeight)*Math.pow(Math.sin(Math.PI*s),1.2),local=rest.position.clone();
   local.z=T.MathUtils.lerp(i===0?-.055:.075,z,m.blend);local.y=GROUND-rest.soleOffset+lift*m.blend;
   if(attacking&&m.blend<.3&&i===1){const advancing=attackTime<.23,returning=attackTime>.40,step=advancing?smooth(attackTime/.23):returning?1-smooth((attackTime-.40)/.26):1;local.z+=.20*step;local.y+=(advancing?.045*Math.sin(Math.PI*attackTime/.23):returning?.035*Math.sin(Math.PI*(attackTime-.40)/.26):0);}
   const target=a.group.localToWorld(local),pitch=(stance?(phase<.10?-.12*(1-smooth(phase/.10)):phase>.4?.12*smooth((phase-.4)/.1):0):.12*Math.cos(Math.PI*s))*m.blend,q=new T.Quaternion().setFromAxisAngle(UP,m.yaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),pitch)).multiply(rest.quaternion);
   if(stance&&m.blend>.95&&turnRate<1.5){if(!f.planted){f.anchor=target.clone();f.quaternion=q.clone();m.footsteps++;}f.planted=true;target.copy(f.anchor);}else f.planted=false;
   solve(l.hip,l.knee,l.ankle,target,new T.Vector3(0,0,1).applyAxisAngle(UP,m.yaw));worldQ(l.ankle,q);f.targetQ=q.clone();
  }
  update(a);
  // The sole, rather than the ankle centre, is the floor contact.
  for(let i=0;i<2;i++){const sole=footPoint(a,i),l=a.legs[i];if(sole.y<GROUND-.002){const target=l.ankle.getWorldPosition(new T.Vector3());target.y+=GROUND-sole.y;solve(l.hip,l.knee,l.ankle,target,new T.Vector3(0,0,1).applyAxisAngle(UP,m.yaw));worldQ(l.ankle,m.feet[i].targetQ);}}
  update(a);
  for(let i=0;i<2;i++){
   const arm=a.arms[i],h=a.group.worldToLocal(arm.shoulder.getWorldPosition(new T.Vector3())),point=i===0?[.40,-.35,.24]:pose.hand;
   const goal=new T.Vector3(point[0],h.y+point[1],point[2]);if(!attacking)goal.z+=Math.sin(m.phase*Math.PI*2+(i?Math.PI:0))*.018*m.blend;
   solve(arm.shoulder,arm.elbow,arm.hand,a.group.localToWorld(goal),new T.Vector3(i===0?.6:-.6,-.8,-.2).applyAxisAngle(UP,m.yaw));
  }
  const hand=a.arms[1].hand,desired=(attacking?pose.blade:new T.Vector3(0,-.15,1).normalize()).clone().applyAxisAngle(UP,m.yaw),right=new T.Vector3().crossVectors(UP,desired).normalize(),gripUp=new T.Vector3().crossVectors(desired,right).normalize();
  // A complete grip frame avoids the shortest-arc wrist flip near antiparallel axes.
  worldQ(hand,new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,gripUp,desired)));
  a.shield.quaternion.copy(a.arms[0].hand.getWorldQuaternion(new T.Quaternion()).invert().multiply(new T.Quaternion().setFromAxisAngle(UP,m.yaw+.18)));a.shield.position.copy(new T.Vector3(0,0,.105).applyAxisAngle(UP,m.yaw+.18).applyQuaternion(a.arms[0].hand.getWorldQuaternion(new T.Quaternion()).invert()));
  update(a);m.clip=attacking?'attack':m.blend>.08?'run':'idle';
 }
 if(mode==='attack'&&attackTime>.19&&attackTime<.37&&!reduced){
  a.samples.push([a.weapon.localToWorld(new T.Vector3(0,.35,0)),a.weapon.localToWorld(new T.Vector3(0,1.02,0))]);if(a.samples.length>9)a.samples.shift();const array=a.trail.geometry.attributes.position.array;array.fill(0);let k=0;for(let i=1;i<a.samples.length;i++){const [p,q]=a.samples[i-1],[r,s]=a.samples[i];for(const v of [p,q,r,q,s,r]){v.toArray(array,k);k+=3;}}a.trail.geometry.attributes.position.needsUpdate=true;a.trail.geometry.setDrawRange(0,k/3);a.trail.visible=k>0;
 }else{a.samples.length=0;a.trail.visible=false;}
 Object.assign(m,{time,travel:body.travel||0,x:body.x,z:body.z,oldMode:body.mode,hits:body.hits||0,attackTime});
}

import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {damp,turn} from './arena-motion.mjs?v=2.5';
import {bindMotion,sampleClip,actionTime} from './arena-clips.mjs?v=2.5';
const PI=Math.PI,GROUND=.02;
const material=(color,metalness=0,roughness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
function mesh(parent,g,m,x=0,y=0,z=0,scale){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);if(scale)o.scale.set(...scale);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
export function createActor(scene,isHero=true,assets){
 const group=new THREE.Group(),model=clone(assets.model.scene);model.scale.setScalar(1.1);group.add(model);scene.add(group);
 const actor={group,model,isHero,pose:'idle',height:2.05,headDiameter:.27,skins:[],footVertices:[[],[]],samples:[]};
 model.traverse(o=>{if(o.isSkinnedMesh){o.material=o.material.clone();o.material.color.set(0xffffff);o.material.metalness=.18;o.material.roughness=.72;o.material.side=THREE.DoubleSide;if(!isHero){o.geometry=o.geometry.clone();const color=o.geometry.attributes.color;for(let i=0;i<color.count;i++){const r=color.getX(i),g=color.getY(i),b=color.getZ(i);if(b>r*1.3&&b>g*1.1)color.setXYZ(i,b*.68,r*.75,g*.60);}color.needsUpdate=true;}o.castShadow=o.receiveShadow=true;o.frustumCulled=false;actor.skins.push(o);}});
 bindMotion(actor,assets.pack);group.updateMatrixWorld(true);actor.restFeet=actor.legs.map(l=>({q:l.ankle.getWorldQuaternion(new THREE.Quaternion()),offset:0}));
 for(const skin of actor.skins){const p=skin.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(skin.matrixWorld);if(v.y<.26)actor.footVertices[v.x>0?0:1].push([skin,i]);}}
 actor.legs.forEach((l,i)=>actor.restFeet[i].offset=footPoint(actor,i).y-l.ankle.getWorldPosition(new THREE.Vector3()).y);
 const steel=material(0x91a1a6,.72,.36),trim=material(0x9a7948,.65,.51),leather=material(0x342b24,0,.95);
 // Right-hand longsword: tapered steel blade, central ridge, brass guard and leather grip.
 const weapon=new THREE.Group();actor.arms[1].hand.add(weapon);weapon.rotation.x=PI/2;weapon.position.set(0,.07,0);
 mesh(weapon,new THREE.CylinderGeometry(.017,.017,.19,8),leather,0,.025,0);mesh(weapon,new THREE.SphereGeometry(.029,10,8),trim,0,-.10,0);
 mesh(weapon,new THREE.BoxGeometry(.27,.032,.035),trim,0,.13,0);
 const shape=new THREE.Shape();shape.moveTo(-.047,.16);shape.lineTo(.047,.16);shape.lineTo(.030,.91);shape.lineTo(0,1.09);shape.lineTo(-.030,.91);shape.closePath();const blade=mesh(weapon,new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.008,bevelThickness:.004,bevelSegments:1,steps:1}),steel);mesh(weapon,new THREE.BoxGeometry(.01,.76,.025),trim,0,.54,.011);
 const shield=new THREE.Group();actor.arms[0].elbow.add(shield);shield.position.set(.025,.17,.10);shield.rotation.y=-.22;
 const shieldShape=new THREE.Shape();shieldShape.moveTo(-.19,.19);shieldShape.lineTo(.19,.19);shieldShape.lineTo(.18,-.05);shieldShape.lineTo(0,-.30);shieldShape.lineTo(-.18,-.05);shieldShape.closePath();mesh(shield,new THREE.ExtrudeGeometry(shieldShape,{depth:.026,bevelEnabled:true,bevelSize:.018,bevelThickness:.016,bevelSegments:2,steps:1}),material(0x65432d,0,.92));
 const rim=shieldShape.clone(),hole=new THREE.Path();hole.moveTo(-.16,.16);hole.lineTo(-.15,-.04);hole.lineTo(0,-.26);hole.lineTo(.15,-.04);hole.lineTo(.16,.16);hole.closePath();rim.holes.push(hole);mesh(shield,new THREE.ExtrudeGeometry(rim,{depth:.009,bevelEnabled:false}),steel,0,0,.047);
 for(const x of [-.10,0,.10])mesh(shield,new THREE.BoxGeometry(.006,x===0?.41:.30,.006),leather,x,x===0?-.045:.005,.055);
 for(const [x,y] of [[-.15,.14],[.15,.14],[0,-.24]])mesh(shield,new THREE.SphereGeometry(.015,8,5),trim,x,y,.064);
 mesh(shield,new THREE.CylinderGeometry(.055,.055,.026,12),trim,0,-.015,.060).rotation.x=PI/2;

 if(!isHero){const crown=new THREE.Group();actor.head.add(crown);crown.position.set(0,.25,0);for(let i=0;i<7;i++){const a=i*PI*2/7;mesh(crown,new THREE.ConeGeometry(.022,.11,5),trim,Math.sin(a)*.11,.03,Math.cos(a)*.11);}}
 const g=new THREE.BufferGeometry(),positions=new Float32Array(7*18);g.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const trail=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:isHero?0xe8c8a0:0x9aa8b1,transparent:true,opacity:.19,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));trail.frustumCulled=false;trail.visible=false;scene.add(trail);
 Object.assign(actor,{weapon,blade,trail,trailPositions:positions});return actor;
}
export function footPoint(actor,side){
 const p=new THREE.Vector3();let lowest=null;
 for(const [skin,i] of actor.footVertices[side]){p.fromBufferAttribute(skin.geometry.attributes.position,i);skin.applyBoneTransform(i,p);skin.localToWorld(p);if(!lowest||p.y<lowest.y)lowest=p.clone();}
 return lowest;
}
function updateSkin(actor){actor.group.updateMatrixWorld(true);for(const skin of actor.skins)skin.skeleton.update();}
function solveLeg(leg,target,weight,plantedQ,forward){
 const q=new THREE.Quaternion();
 const h=leg.hip.getWorldPosition(new THREE.Vector3()),k=leg.knee.getWorldPosition(new THREE.Vector3()),f=leg.ankle.getWorldPosition(new THREE.Vector3()),footQ=leg.ankle.getWorldQuaternion(new THREE.Quaternion());if(plantedQ)footQ.slerp(plantedQ,weight);
 const goal=target.clone(),l1=h.distanceTo(k),l2=k.distanceTo(f),dir=goal.clone().sub(h),d=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,dir.length()));dir.normalize();
 const bend=forward.clone().addScaledVector(dir,-forward.dot(dir));if(bend.lengthSq()<1e-6)bend.set(1,0,0).addScaledVector(dir,-dir.x);bend.normalize();
 const along=(l1*l1-l2*l2+d*d)/(2*d),rise=Math.sqrt(Math.max(0,l1*l1-along*along)),nextK=h.clone().addScaledVector(dir,along).addScaledVector(bend,rise);
 const hipWorld=leg.hip.getWorldQuaternion(new THREE.Quaternion());q.setFromUnitVectors(k.clone().sub(h).normalize(),nextK.clone().sub(h).normalize()).multiply(hipWorld);
 leg.hip.quaternion.slerp(leg.hip.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q),weight);leg.hip.updateWorldMatrix(false,true);
 const knee=leg.knee.getWorldPosition(new THREE.Vector3()),ankle=leg.ankle.getWorldPosition(new THREE.Vector3()),kneeWorld=leg.knee.getWorldQuaternion(new THREE.Quaternion());
 q.setFromUnitVectors(ankle.sub(knee).normalize(),goal.clone().sub(knee).normalize()).multiply(kneeWorld);
 leg.knee.quaternion.slerp(leg.knee.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q),weight);leg.knee.updateWorldMatrix(false,true);
 leg.ankle.quaternion.copy(leg.ankle.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(footQ));leg.ankle.updateWorldMatrix(false,true);
}
export function animateActor(actor,body,time,reduced=false){
 const {group,model,pelvis}=actor,{pack,joints,base,action,position,actionPosition}=actor.clipRig,clips=pack.clips;
 const fresh=actor.motion?.body!==body||time<actor.motion.time;
 if(fresh)actor.motion={body,time,x:body.x,z:body.z,travel:body.travel,yaw:body.yaw,speed:0,phase:0,blend:0,clip:'idle',ground:0,footsteps:0,feet:[{weight:0},{weight:0}],authored:joints.map(j=>j.quaternion.clone())};
 const m=actor.motion,dt=Math.max(0,Math.min(.25,time-m.time)),travel=Math.max(0,body.travel-m.travel);
 if(!fresh&&dt===0)return;
 const locomotion=!['dodge','dead'].includes(body.mode)||(body.mode==='dodge'&&body.elapsed>.24);m.speed=damp(m.speed,dt?Math.hypot(body.x-m.x,body.z-m.z)/dt:0,16,dt);
 m.blend=damp(m.blend,locomotion?Math.min(1,m.speed/1.3):0,20,dt);
 const runWeight=Math.max(0,Math.min(1,(m.speed-1.2)/1.9));if(locomotion){const backwards=['attack','windup'].includes(body.mode)&&(body.x-m.x)*Math.sin(m.yaw)+(body.z-m.z)*Math.cos(m.yaw)<-.00001;m.phase+=(backwards?-1:1)*travel/(1.12+(2.24-1.12)*runWeight);}
 const oldYaw=m.yaw;m.yaw=turn(m.yaw,body.yaw,dt,24,16);const turning=dt?Math.abs(m.yaw-oldYaw)/dt:0;
 group.position.set(body.x,m.ground,body.z);group.rotation.y=m.yaw;actor.pose=body.mode;
 sampleClip(clips.walk,(((m.phase+clips.walk.contactPhase)%1+1)%1)*clips.walk.duration,base,position);
 sampleClip(clips.run,(((m.phase+clips.run.contactPhase)%1+1)%1)*clips.run.duration,action,actionPosition);
 base.forEach((q,i)=>q.slerp(action[i],runWeight));position.lerp(actionPosition,runWeight);
 sampleClip(clips.idle,time%clips.idle.duration,action,actionPosition);base.forEach((q,i)=>q.slerp(action[i],1-m.blend));position.lerp(actionPosition,1-m.blend);
 sampleClip(clips.carry,time%clips.carry.duration,action,actionPosition);
 // Keep the wrist's weapon grip while allowing the shoulder to follow the gait.
 base.forEach((q,i)=>{const n=pack.joints[i];if(/^DEF-(shoulder|upper_arm|forearm|hand|f_|thumb)/.test(n)){const grip=/^DEF-(hand|f_|thumb)/.test(n),elbow=n.startsWith('DEF-forearm'),right=n.endsWith('.R');q.slerp(action[i],grip?.96:elbow?(right?.84:.78):(right?.78:.64));}});
 m.clip=m.blend>.1?(runWeight>.5?'run':'walk'):'idle';
 if(['attack','windup','dodge','hurt','dead'].includes(body.mode)){
  const key=body.mode==='windup'?'attack':body.mode==='dodge'?'roll':body.mode;
  let t=actionTime(body.mode,body.elapsed,actor.isHero,clips);if(body.mode==='dead'){m.deathStarted??=time;t=Math.min(clips.dead.duration,(time-m.deathStarted)*2.0);}
  sampleClip(clips[key],t,action,actionPosition);
  const layered=body.mode==='attack'||body.mode==='windup',recovery=body.mode==='attack'?Math.max(0,Math.min(1,(body.elapsed-(actor.isHero?.42:.36))/.24)):body.mode==='dodge'?Math.max(0,Math.min(.8,(body.elapsed-.24)/.10*.8)):0;
  base.forEach((q,i)=>{const n=pack.joints[i],lower=actor.lower.has(n)||n==='root'||n==='DEF-hips';q.slerp(action[i],(layered&&lower?1-m.blend:1)*(1-recovery));});
  if(layered&&m.blend>.01){
   const root=pack.joints.indexOf('root'),hip=pack.joints.indexOf('DEF-hips'),spine=pack.joints.indexOf('DEF-spine.001');
   const aimed=action[root].clone().multiply(action[hip]).multiply(action[spine]);
   const parent=base[root].clone().multiply(base[hip]);
   base[spine].slerp(parent.invert().multiply(aimed),1-recovery);
  }
  position.lerp(actionPosition,(layered?1-m.blend:1)*(1-recovery));m.clip=key;
 }else m.deathStarted=null;
 const weight=fresh?1:1-Math.exp(-dt*(body.mode==='attack'?42:30));joints.forEach((j,i)=>{m.authored[i].slerp(base[i],weight);j.quaternion.copy(m.authored[i]);});pelvis.position.lerp(position,fresh?1:1-Math.exp(-dt*30));updateSkin(actor);
 let feet=[footPoint(actor,0),footPoint(actor,1)];
 if(!['dodge','dead'].includes(body.mode)){
  const below=Math.min(feet[0].y,feet[1].y),phase=((m.phase%1)+1)%1,stance=m.blend<.2||phase<.14||phase>.9||phase>.4&&phase<.64,goal=stance?Math.max(m.blend<.25?-.28:-.08,Math.min(.18,m.ground-below+GROUND)):m.ground;
  // Let the body settle gradually; contact corrections belong to the legs.
  m.ground=fresh?goal:damp(m.ground,goal,12,dt);group.position.y=m.ground;updateSkin(actor);feet=[footPoint(actor,0),footPoint(actor,1)];
  actor.legs.forEach((leg,i)=>{
   const f=m.feet[i],ankle=leg.ankle.getWorldPosition(new THREE.Vector3());
   const local=group.worldToLocal(ankle.clone()),forwardSpeed=f.authoredZ!==undefined&&dt?(local.z-f.authoredZ)/dt:0;
   f.authoredZ=local.z;
   // A low foot is not necessarily in stance: release it as soon as the
   // authored cycle starts swinging forward, before height clears the floor.
   const backwards=(body.x-m.x)*Math.sin(m.yaw)+(body.z-m.z)*Math.cos(m.yaw)<-.00001;
   const swinging=forwardSpeed*(backwards?-1:1)>.15;
   const contact=m.blend>.75&&turning<3&&!swinging&&feet[i].y<GROUND+.045;
   // Shorten stride and travelled cycle distance by 20%, lower swing
   // clearance by 40%, and preserve the authored knee bend.
   if(m.blend>.01){
    const hip=leg.hip.getWorldPosition(new THREE.Vector3()),forward=new THREE.Vector3(Math.sin(m.yaw),0,Math.cos(m.yaw)),goal=ankle.clone();
    goal.addScaledVector(forward,-ankle.clone().sub(hip).dot(forward)*.2);goal.y-=Math.max(0,feet[i].y-GROUND)*.4;
    solveLeg(leg,goal,m.blend,null,leg.knee.getWorldPosition(new THREE.Vector3()).sub(hip));
   }
   if(contact&&!f.planted){f.anchor=leg.ankle.getWorldPosition(new THREE.Vector3());f.anchor.y=GROUND-actor.restFeet[i].offset;f.q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),m.yaw).multiply(actor.restFeet[i].q);f.planted=true;m.footsteps++;f.weight=1-Math.exp(-dt*60);}
   if(swinging||feet[i].y>GROUND+.09||m.blend<.5||turning>5)f.planted=false;
   f.weight=damp(f.weight,f.planted?1:0,f.planted?45:30,dt);
   if(f.anchor&&f.weight>.01)solveLeg(leg,f.anchor,f.weight,f.q,new THREE.Vector3(Math.sin(m.yaw),0,Math.cos(m.yaw)));
  });updateSkin(actor);
  // Slower body settling must not leave a shoe below the floor. Raise the
  // ankle locally, preserving its authored bend and foot orientation.
  actor.legs.forEach((leg,i)=>{const sole=footPoint(actor,i);if(sole.y<GROUND-.002){const ankle=leg.ankle.getWorldPosition(new THREE.Vector3()),hip=leg.hip.getWorldPosition(new THREE.Vector3());ankle.y+=GROUND-sole.y;solveLeg(leg,ankle,1,null,leg.knee.getWorldPosition(new THREE.Vector3()).sub(hip));}});updateSkin(actor);
 }else{m.ground=damp(m.ground,0,22,dt);group.position.y=m.ground;for(const f of m.feet){f.planted=false;f.weight=0;}updateSkin(actor);}
 Object.assign(m,{time,x:body.x,z:body.z,travel:body.travel});
 if(body.mode==='attack'&&body.elapsed>.13&&body.elapsed<.46&&!reduced){actor.samples.push([actor.weapon.localToWorld(new THREE.Vector3(0,.56,0)),actor.weapon.localToWorld(new THREE.Vector3(0,1.08,0))]);if(actor.samples.length>8)actor.samples.shift();actor.trailPositions.fill(0);for(let n=1;n<actor.samples.length;n++){const [a,b]=actor.samples[n-1],[c,d]=actor.samples[n];let offset=(n-1)*18;for(const p of [a,b,c,b,d,c]){p.toArray(actor.trailPositions,offset);offset+=3;}}actor.trail.geometry.attributes.position.needsUpdate=true;actor.trail.geometry.setDrawRange(0,(actor.samples.length-1)*6);actor.trail.visible=actor.samples.length>1;
 }else{actor.samples.length=0;actor.trail.visible=false;}
}

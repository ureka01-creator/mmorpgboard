import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
let pending;
export function loadMotionPack(){
 return pending??=Promise.all([new GLTFLoader().loadAsync('./assets/characters/sentinel.glb?v=2.5'),fetch('./assets/animations/fullplate-motion.json?v=2.5').then(r=>{if(!r.ok)throw Error('Motion HTTP '+r.status);return r.json();})]).then(([model,pack])=>{
  if(pack.schema!==2||pack.joints?.length!==53||!['idle','carry','run','walk','attack','roll','hurt','dead'].every(k=>{const c=pack.clips?.[k];return c?.duration>0&&c.frames?.length>1&&c.frames.every(f=>f.length===215&&f.every(Number.isFinite));}))throw Error('Invalid skinned motion pack');
  return {model,pack};
 });
}
export function bindMotion(actor,pack){
 const joints=pack.joints.map(n=>actor.model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)));
 if(joints.some(j=>!j?.isBone))throw Error('Character skeleton does not match animation');
 actor.clipRig={pack,joints,base:joints.map(()=>new THREE.Quaternion()),action:joints.map(()=>new THREE.Quaternion()),position:new THREE.Vector3(),actionPosition:new THREE.Vector3()};
 actor.bones=Object.fromEntries(pack.joints.map((n,i)=>[n,joints[i]]));
 actor.pelvis=actor.bones['DEF-hips'];actor.chest=actor.bones['DEF-spine.003'];actor.head=actor.bones['DEF-head'];
 actor.arms=['L','R'].map((s,i)=>({shoulder:actor.bones['DEF-upper_arm.'+s],elbow:actor.bones['DEF-forearm.'+s],hand:actor.bones['DEF-hand.'+s],side:i===0?1:-1}));
 actor.legs=['L','R'].map((s,i)=>({hip:actor.bones['DEF-thigh.'+s],knee:actor.bones['DEF-shin.'+s],ankle:actor.bones['DEF-foot.'+s],side:i===0?1:-1}));
 actor.lower=new Set(pack.joints.filter(n=>/^DEF-(thigh|shin|foot|toe)/.test(n)));
}
export function sampleClip(clip,time,quaternions,position){
 const phase=Math.max(0,Math.min(1,time/clip.duration))*(clip.frames.length-1),index=Math.min(clip.frames.length-2,Math.floor(phase)),blend=phase-index,a=clip.frames[index],b=clip.frames[index+1];
 position.fromArray(a).lerp(new THREE.Vector3().fromArray(b),blend);
 const q=new THREE.Quaternion();quaternions.forEach((target,n)=>target.fromArray(a,3+n*4).slerp(q.fromArray(b,3+n*4),blend).normalize());
}
export function actionTime(mode,elapsed,isHero,clips){
 if(mode==='attack'){
  const hit=isHero?.26:.18,end=isHero?.66:.60,start=isHero?0:.33,contact=.45;
  return elapsed<=hit?start+(contact-start)*elapsed/hit:contact+(.75-contact)*Math.min(1,(elapsed-hit)/(end-hit));
 }
 if(mode==='windup')return .33*Math.min(1,elapsed/.72);
 if(mode==='dodge')return .28+(.98-.28)*Math.min(1,elapsed/.34);
 if(mode==='hurt')return Math.min(clips.hurt.duration,elapsed/.30*clips.hurt.duration);
 return 0;
}

import * as THREE from 'three';
let pending;
export function loadMotionPack(){return pending??=fetch('./assets/animations/knight-motion.json?v=2.2').then(r=>{if(!r.ok)throw new Error('Animation pack HTTP '+r.status);return r.json();}).then(pack=>{if(pack.schema!==1||pack.joints?.length!==15||!['idle','run','walk','attack','roll','hurt','dead'].every(k=>{const c=pack.clips?.[k];return c&&c.duration>0&&c.frames?.length>1&&c.frames.every(f=>f.length===63&&f.every(Number.isFinite));}))throw new Error('Invalid animation pack');return pack;});}
export function bindMotion(actor,pack){
 const {pelvis,chest,head,arms,legs}=actor;
 const joints=[pelvis,chest,head];for(let i=0;i<2;i++)joints.push(arms[i].shoulder,arms[i].elbow,arms[i].hand,legs[i].hip,legs[i].knee,legs[i].ankle);
 joints.forEach((j,i)=>j.name=pack.joints[i]);
 actor.clipRig={pack,joints,base:joints.map(()=>new THREE.Quaternion()),action:joints.map(()=>new THREE.Quaternion()),position:new THREE.Vector3(),actionPosition:new THREE.Vector3()};
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

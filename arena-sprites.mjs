import * as THREE from 'three';
import {facing,spritePose} from './arena-sprite-motion.mjs?v=2.7';
const VIEW_YAW=Math.atan2(4.8,8.7),VIEW_COS=Math.hypot(4.8,8.7)/Math.hypot(4.8,14.7,8.7),FLOOR=.025;
let pending;
export function loadSpriteAssets(){
 return pending??=(async()=>{
  const response=await fetch('./assets/sprites/warrior.json?v=2.7');if(!response.ok)throw Error('Sprite pack HTTP '+response.status);const pack=await response.json();
  if(pack.schema!==1||pack.directions?.length!==8)throw Error('Invalid directional sprite pack');
  for(const [clip,count] of Object.entries({idle:4,run:8,attack:4,roll:4}))if(pack.frames[clip]?.length!==8||!pack.frames[clip].every(row=>row.length===count&&row.every(f=>pack.atlases[f.atlas]&&f.rect?.length===4&&f.pivot?.length===2&&f.pivot.every(Number.isFinite)&&Number.isFinite(f.worldHeight)&&f.worldHeight>0)))throw Error('Missing animation directions: '+clip);
  const loader=new THREE.TextureLoader(),textures={};await Promise.all(Object.entries(pack.atlases).map(async([id,a])=>{const tex=await loader.loadAsync('./'+a.file+'?v=2.7');if(tex.image.width!==a.width||tex.image.height!==a.height)throw Error('Sprite dimensions mismatch: '+id);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.anisotropy=4;textures[id]=tex;}));return {pack,textures};
 })();
}
export function createActor(scene,isHero,assets){
 const group=new THREE.Group();group.rotation.y=VIEW_YAW;scene.add(group);
 const material=new THREE.MeshBasicMaterial({color:isHero?0xffffff:0x9eafbd,transparent:true,alphaTest:.035,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const sprite=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);sprite.frustumCulled=false;group.add(sprite);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.37,24),new THREE.MeshBasicMaterial({color:0x070707,transparent:true,opacity:.26,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.019;shadow.scale.y=.72;group.add(shadow);
 const maps=Object.fromEntries(Object.entries(assets.textures).map(([id,tex])=>[id,tex.clone()]));
 return {group,sprite,shadow,maps,pack:assets.pack,isHero,height:2.05,headDiameter:.27,renderType:'directional-sprite',pose:'idle'};
}
export function animateActor(actor,body,time,reduced=false){
 const fresh=actor.motion?.body!==body||time<actor.motion.time;
 if(fresh)actor.motion={body,time,phase:0,travel:body.travel||0,yaw:body.yaw,footsteps:0};
 const m=actor.motion;if(!fresh&&time===m.time)return;
 const travel=Math.max(0,(body.travel||0)-m.travel),moving=body.mode==='walk'||body.mode==='attack';
 if(moving){const old=Math.floor(m.phase*2);m.phase+=travel/2.24;if(body.mode==='walk')m.footsteps+=Math.max(0,Math.floor(m.phase*2)-old);}
 m.direction=facing(body.yaw,VIEW_YAW,fresh?undefined:m.direction);
 // The simulation enters victory on the lethal hit and resets elapsed to zero.
 // Finish that committed cut visually without changing damage or accepting input.
 if(!fresh&&actor.isHero&&m.bodyMode==='attack'&&body.mode==='idle'&&body.hit&&(body.hits||0)>(m.hits||0))m.finishUntil=time+.40;
 if(body.mode!=='idle'||time>=m.finishUntil)m.finishUntil=undefined;
 const visualBody=m.finishUntil?{...body,mode:'attack',elapsed:Math.max(.26,.66-(m.finishUntil-time))}:body;
 const pose=spritePose(visualBody,m.phase,time,m.direction),frame=actor.pack.frames[pose.clip][m.direction][pose.frame],atlas=actor.pack.atlases[frame.atlas],map=actor.maps[frame.atlas];
 map.repeat.set(frame.rect[2]/atlas.width,frame.rect[3]/atlas.height);map.offset.set(frame.rect[0]/atlas.width,1-(frame.rect[1]+frame.rect[3])/atlas.height);
 if(actor.sprite.material.map!==map){actor.sprite.material.map=map;actor.sprite.material.needsUpdate=true;}
 const height=frame.worldHeight,width=height*frame.rect[2]/frame.rect[3]*VIEW_COS;actor.sprite.scale.set(width,height,1);
 actor.sprite.position.set((.5-frame.pivot[0])*width,FLOOR+(frame.pivot[1]-.5)*height,0);
 actor.group.position.set(body.x,0,body.z);actor.pose=body.mode;actor.sprite.material.opacity=body.mode==='hurt'?.65+.35*Math.min(1,(body.elapsed||0)/.30):1;
 if(body.mode==='dead'){m.deadAt??=time;actor.sprite.material.opacity=Math.max(0,1-(time-m.deadAt)/.8);actor.shadow.material.opacity=.26*actor.sprite.material.opacity;}else{m.deadAt=null;actor.shadow.material.opacity=body.mode==='dodge'?.16:.26;}
 Object.assign(m,{time,travel:body.travel||0,yaw:body.yaw,bodyMode:body.mode,hits:body.hits||0,clip:pose.clip,frame:pose.frame,atlas:frame.atlas});
}
export function spritePortrait(actor){
 const f=actor.pack.frames.idle[0][0],image=actor.maps[f.atlas].image,b=f.bbox;
 const canvas=document.createElement('canvas');canvas.width=144;canvas.height=180;const c=canvas.getContext('2d');c.fillStyle='#1b232b';c.fillRect(0,0,144,180);
 const h=(b[3]-b[1])*.58,w=h*.8,x=(b[0]+b[2])/2-w/2,y=b[1];c.drawImage(image,f.rect[0]+x,f.rect[1]+y,w,h,0,0,144,180);return canvas.toDataURL();
}

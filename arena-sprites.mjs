import {enableFlow,applyFlow} from './arena-sprite-flow.mjs?v=2.12';
import * as THREE from 'three';
import {facing,spritePose} from './arena-sprite-motion.mjs?v=2.12';
const VIEW_YAW=Math.atan2(4.8,8.7),VIEW_COS=Math.hypot(4.8,8.7)/Math.hypot(4.8,14.7,8.7),FLOOR=.025;
let pending,shadowTexture;
const poseGeometry=new WeakMap();
function geometryFor(frame){
 if(!frame.contour)return null;
 if(poseGeometry.has(frame))return poseGeometry.get(frame);
 const w=frame.rect[2],h=frame.rect[3],vertices=[],uv=[];
 for(let y=0;y<h;y++){
  const [lo,hi]=frame.contour[y];if(hi<=lo)continue;
  for(const [x,row] of [[lo,y],[lo,y+1],[hi,y],[hi,y],[lo,y+1],[hi,y+1]]){
   vertices.push(x/w-.5,.5-row/h,0);uv.push(x/w,1-row/h);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));poseGeometry.set(frame,geometry);return geometry;
}
function softShadow(){
 if(shadowTexture)return shadowTexture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,2,32,32,32);
 g.addColorStop(0,'rgba(0,0,0,.85)');g.addColorStop(.45,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,64,64);return shadowTexture=new THREE.CanvasTexture(canvas);
}
export function loadSpriteAssets(){
 return pending??=(async()=>{
  const response=await fetch('./assets/sprites/warrior.json?v=2.8');if(!response.ok)throw Error('Sprite pack HTTP '+response.status);const pack=await response.json();
  if(pack.schema!==2||pack.refined!==true||pack.directions?.length!==8)throw Error('Invalid directional sprite pack');
  for(const [clip,count] of Object.entries({idle:1,run:12,attack:7,roll:4}))if(pack.frames[clip]?.length!==8||!pack.frames[clip].every(row=>row.length===count&&row.every(f=>pack.atlases[f.atlas]&&f.rect?.length===4&&f.pivot?.length===2&&f.pivot.every(Number.isFinite)&&Number.isFinite(f.worldHeight)&&f.worldHeight>0)))throw Error('Missing animation directions: '+clip);
  const loader=new THREE.TextureLoader(),textures={};await Promise.all(Object.entries(pack.atlases).map(async([id,a])=>{const tex=await loader.loadAsync('./'+a.file+'?v=2.8');if(tex.image.width!==a.width||tex.image.height!==a.height)throw Error('Sprite dimensions mismatch: '+id);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.anisotropy=4;textures[id]=tex;}));return {pack,textures};
 })();
}
export function createActor(scene,isHero,assets){
 const group=new THREE.Group();group.rotation.y=VIEW_YAW;scene.add(group);
 const material=new THREE.MeshBasicMaterial({color:isHero?0xffffff:0x9eafbd,transparent:true,alphaTest:.035,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const depth={spriteEye:{value:new THREE.Vector3()},spriteVP:{value:new THREE.Matrix4()},spriteRay:{value:new THREE.Vector3()},spriteOrtho:{value:0}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,depth);
  shader.vertexShader='varying vec3 vSpriteWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvSpriteWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='varying vec3 vSpriteWorld;\nuniform vec3 spriteEye;\nuniform mat4 spriteVP;\nuniform vec3 spriteRay;\nuniform float spriteOrtho;\n'+shader.fragmentShader;
  // A projected sword can extend below the boots in screen space. Clamp only
  // its depth to the floor at that pixel; walls/props still occlude normally.
  shader.fragmentShader=shader.fragmentShader.replace('#include <logdepthbuf_fragment>',`#include <logdepthbuf_fragment>
   gl_FragDepth=gl_FragCoord.z;
   if(vSpriteWorld.y<0.025){
    vec3 ray=spriteOrtho>0.5?spriteRay:vSpriteWorld-spriteEye;
    vec3 ground=vSpriteWorld+ray*((0.025-vSpriteWorld.y)/ray.y);
    vec4 p=spriteVP*vec4(ground,1.0);
    gl_FragDepth=min(gl_FragCoord.z,p.z/p.w*0.5+0.5-0.000001);
   }`);
 };
 material.customProgramCacheKey=()=> 'sprite-floor-depth-2';
 const sprite=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);sprite.frustumCulled=false;group.add(sprite);
 sprite.onBeforeRender=(_r,_s,camera)=>{depth.spriteEye.value.setFromMatrixPosition(camera.matrixWorld);depth.spriteVP.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);camera.getWorldDirection(depth.spriteRay.value);depth.spriteOrtho.value=camera.isOrthographicCamera?1:0;};
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.90,.70),new THREE.MeshBasicMaterial({map:softShadow(),color:0x070707,transparent:true,opacity:.26,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.019;shadow.scale.y=.72;group.add(shadow);
 const maps=Object.fromEntries(Object.entries(assets.textures).map(([id,tex])=>[id,tex.clone()]));
 const actor={group,sprite,planeGeometry:sprite.geometry,shadow,maps,pack:assets.pack,isHero,height:2.05,headDiameter:.27,renderType:'directional-sprite',pose:'idle',baseTint:material.color.clone(),environmentTint:new THREE.Color(),warmLights:scene.children.filter(o=>o.isPointLight)};
 if(assets.flow)enableFlow(actor,assets.flow);return actor;
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
 const pose=spritePose(visualBody,m.phase,time,m.direction,actor.pack.refined),frame=actor.pack.frames[pose.clip][m.direction][pose.frame],atlas=actor.pack.atlases[frame.atlas],map=actor.maps[frame.atlas];
 map.repeat.set(frame.rect[2]/atlas.width,frame.rect[3]/atlas.height);map.offset.set(frame.rect[0]/atlas.width,1-(frame.rect[1]+frame.rect[3])/atlas.height);
 actor.sprite.geometry=geometryFor(frame)||actor.planeGeometry;
 if(actor.sprite.material.map!==map){actor.sprite.material.map=map;actor.sprite.material.needsUpdate=true;}
 const height=frame.worldHeight,width=height*frame.rect[2]/frame.rect[3]*VIEW_COS;actor.sprite.scale.set(width,height,1);
 actor.sprite.position.set((.5-frame.pivot[0])*width,FLOOR+(frame.pivot[1]-.5)*height,0);
 // Apply numerical motion to the approved pixels, then a restrained
 // environment tint that preserves the painted highlights.
 applyFlow(actor,visualBody,m.phase,m.direction);
 const tint=actor.environmentTint.setRGB(.94,.96,1);
 let warmth=0;
 for(const light of actor.warmLights)if(light.visible){
  const d=Math.hypot(body.x-light.position.x,body.z-light.position.z);
  warmth+=Math.max(0,1-d/Math.max(1,(light.distance||12)*.65))**2*Math.min(1,light.intensity/14);
 }
 const pool=Math.min(1,warmth);tint.r+=.06*pool;tint.g+=.015*pool;tint.b-=.07*pool;
 actor.sprite.material.color.copy(tint).multiply(actor.baseTint);
 if(actor.flow)actor.group.renderOrder=100+body.x*Math.sin(VIEW_YAW)+body.z*Math.cos(VIEW_YAW);
 actor.group.position.set(body.x,0,body.z);actor.pose=body.mode;actor.sprite.material.opacity=body.mode==='hurt'?.65+.35*Math.min(1,(body.elapsed||0)/.30):1;
 if(body.mode==='dead'){m.deadAt??=time;actor.sprite.material.opacity=Math.max(0,1-(time-m.deadAt)/.8);actor.shadow.material.opacity=.26*actor.sprite.material.opacity;}else{m.deadAt=null;actor.shadow.material.opacity=body.mode==='dodge'?.16:.26;}
 if(actor.flow){actor.flow.blade.material.opacity=actor.flow.head.material.opacity=actor.sprite.material.opacity;}
 Object.assign(m,{time,travel:body.travel||0,yaw:body.yaw,bodyMode:body.mode,hits:body.hits||0,clip:pose.clip,frame:pose.frame,atlas:frame.atlas});
}
export function spritePortrait(actor){
 const f=actor.pack.frames.idle[0][0],image=actor.maps[f.atlas].image,b=f.bbox;
 const canvas=document.createElement('canvas');canvas.width=144;canvas.height=180;const c=canvas.getContext('2d');c.fillStyle='#1b232b';c.fillRect(0,0,144,180);
 const h=(b[3]-b[1])*.58,w=h*.8,x=(b[0]+b[2])/2-w/2,y=b[1];c.drawImage(image,f.rect[0]+x,f.rect[1]+y,w,h,0,0,144,180);return canvas.toDataURL();
}

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {world,obstacles} from './arena-engine.mjs';
// Reproducible, locally generated surface maps; no network textures or baked scene images.
const TAU=Math.PI*2;
let seed=731;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function surfaceMaps(earth=false){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const cloud=Math.sin(x*.022+Math.sin(y*.013)*3)*Math.sin(y*.019+x*.007),grain=random()*12;
  const value=(earth?78:162)+cloud*10+grain,index=(y*512+x)*4;
  pixels.data[index]=value;pixels.data[index+1]=value-(earth?4:6);pixels.data[index+2]=value-(earth?16:15);pixels.data[index+3]=255;
 }ctx.putImageData(pixels,0,0);
 // Layer mineral veins, pitting and old fractures on the physical stones.
 for(let n=0;n<1700;n++){const x=random()*512,y=random()*512;ctx.fillStyle=n%3?'rgba(40,36,27,.08)':'rgba(230,222,193,.14)';ctx.fillRect(x,y,1+random()*3,1+random()*2);}
 for(let n=0;n<12;n++){let x=random()*512,y=random()*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<8;j++){x+=random()*34-12;y+=random()*23-4;ctx.lineTo(x,y);}ctx.strokeStyle='rgba(39,35,26,.23)';ctx.lineWidth=.5+random();ctx.stroke();}
 for(let n=0;n<30;n++){const x=random()*512,y=random()*512,r=8+random()*38,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(55,68,30,.16)');g.addColorStop(1,'rgba(55,68,30,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(earth?6:.8,earth?6:.8);map.anisotropy=4;
 const bump=new THREE.CanvasTexture(canvas);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.copy(map.repeat);
 return {map,bump};
}
export function roundedBox(w,h,d,bevel=.05){const s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1});g.translate(0,0,-d/2);return g;}
export function createRing(scene,color,radius){const m=new THREE.Mesh(new THREE.RingGeometry(radius-.022,radius,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=.045;scene.add(m);return m;}
function radialTexture(flame=false){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,flame?'rgba(255,240,188,1)':'rgba(0,0,0,.6)');g.addColorStop(.25,flame?'rgba(255,164,55,.65)':'rgba(0,0,0,.35)');g.addColorStop(1,flame?'rgba(255,110,10,0)':'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
function environment(renderer){
 const studio=new THREE.Scene();studio.background=new THREE.Color(0x444d55);
 for(const [color,x,y,z,w,h] of [[0xffdeb3,-4,7,-4,7,5],[0x8899ad,5,4,4,5,5],[0xffefce,0,8,0,4,3]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color}));panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);}
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(studio,.08);generator.dispose();studio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});return target.texture;
}
export function createArtWorld(renderer,pickables){
 seed=731;
 const scene=new THREE.Scene(),torches=[];scene.background=new THREE.Color(0x222d32);scene.fog=new THREE.FogExp2(0x222d32,.025);scene.environment=environment(renderer);scene.environmentIntensity=.85;
 scene.add(new THREE.HemisphereLight(0xb2c3ce,0x282a22,.8));
 const sun=new THREE.DirectionalLight(0xffd6a2,3.2);sun.position.set(-8,15,-9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:50});sun.shadow.bias=-.00012;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);
 const rim=new THREE.DirectionalLight(0x87a7cc,1.15);rim.position.set(8,7,6);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xe6dfcd,1.35);fill.position.set(6,9,14);scene.add(fill);
 const maps=surfaceMaps(),soilMaps=surfaceMaps(true),stone=(color=0xa7a79b)=>new THREE.MeshStandardMaterial({color,map:maps.map,bumpMap:maps.bump,bumpScale:.055,roughness:.92,metalness:.015}),wallMat=stone(0xa5a190),floorMat=stone(0xc3beb0),trim=stone(0xc4bca3),dark=stone(0x777769),iron=new THREE.MeshStandardMaterial({color:0x3c3932,metalness:.85,roughness:.39}),gold=new THREE.MeshStandardMaterial({color:0x9e8252,metalness:.7,roughness:.48});
 const add=(g,m,x=0,y=0,z=0,parent=scene)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const ground=add(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x585b42,map:soilMaps.map,bumpMap:soilMaps.bump,bumpScale:.11,roughness:1}),0,-.21,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
 const dummy=new THREE.Object3D(),tiles=new THREE.InstancedMesh(roundedBox(.91,.12,.68,.025),floorMat,360);
 for(let z=0,n=0;z<20;z++)for(let x=0;x<18;x++,n++){dummy.position.set((x-8.5)*.96+(z%2)*.2,-.10,(z-9.5)*.72);dummy.rotation.set(0,(random()-.5)*.02,0);dummy.scale.set(1,.9+random()*.15,1);dummy.updateMatrix();tiles.setMatrixAt(n,dummy.matrix);tiles.setColorAt(n,new THREE.Color().setScalar(.82+random()*.18));}tiles.receiveShadow=true;scene.add(tiles);dummy.scale.set(1,1,1);
 // Inlaid border, not a movement grid. The centre relief lies flush to the stone floor.
 for(const x of [-8.35,8.35])add(roundedBox(.13,.03,14.3,.008),trim,x,-.02,0);
 for(const z of [-7.12,7.12])add(roundedBox(16.7,.03,.13,.008),trim,0,-.02,z);
 const seal=new THREE.Group();seal.position.y=.008;scene.add(seal);
 for(const r of [1.28,1.43,1.65]){const ring=new THREE.Mesh(new THREE.RingGeometry(r-.018,r,96),gold);ring.rotation.x=-Math.PI/2;seal.add(ring);}
 for(let n=0;n<12;n++){const a=n*TAU/12,mark=new THREE.Mesh(new THREE.PlaneGeometry(.05,.16),gold);mark.rotation.x=-Math.PI/2;mark.rotation.z=-a;mark.position.set(Math.sin(a)*1.54,.002,Math.cos(a)*1.54);seal.add(mark);}
 for(let n=0;n<8;n++){const a=n*TAU/8,shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(-.10,.35);shape.lineTo(0,1.1);shape.lineTo(.10,.35);shape.closePath();const ray=new THREE.Mesh(new THREE.ShapeGeometry(shape),gold);ray.rotation.set(-Math.PI/2,0,a);ray.position.y=.003;seal.add(ray);}
 // Broken masonry, with chipped coping and vertical architectural ribs.
 const brickGeo=roundedBox(1.25,.48,.68,.045),positions=[];
 for(let layer=0;layer<5;layer++)for(let j=-7;j<=7;j++){if(Math.abs(j)<2||layer===4&&j%3===0)continue;positions.push([j*1.27+(layer%2)*.3,layer*.55+.25,-7.5,0]);}
 for(const side of [-1,1])for(let layer=0;layer<3;layer++)for(let j=-5;j<=2;j++){if(layer===2&&j%3===0)continue;positions.push([side*8.65,layer*.55+.25,j*1.35,Math.PI/2]);}
 const walls=new THREE.InstancedMesh(brickGeo,wallMat,positions.length);positions.forEach(([x,y,z,a],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,a,0);dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);walls.setColorAt(i,new THREE.Color().setScalar(.8+random()*.2));});walls.castShadow=walls.receiveShadow=true;scene.add(walls);
 for(const x of [-7.5,-4.2,4.2,7.5]){add(roundedBox(.64,2.9,1.1),dark,x,1.3,-7.58);add(roundedBox(.95,.18,1.2),trim,x,2.83,-7.58);add(roundedBox(.84,.15,1.2),trim,x,.15,-7.58);}
 const contactMap=radialTexture();
 const shadow=(x,z,r)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(r,r),new THREE.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false,opacity:.55}));o.rotation.x=-Math.PI/2;o.position.set(x,.011,z);scene.add(o);return o;};
 for(const [x,z] of obstacles){const w=world({x,z}),group=new THREE.Group();group.position.set(w.x,0,w.z);scene.add(group);shadow(w.x,w.z,2.0);
  for(const [g,m,y] of [[roundedBox(1.08,.18,1.08),dark,.07],[roundedBox(.86,.15,.86),trim,.25],[new THREE.CylinderGeometry(.34,.43,1.6,24),wallMat,1.13],[new THREE.CylinderGeometry(.43,.43,.12,24),trim,.40],[new THREE.CylinderGeometry(.40,.40,.13,24),trim,1.83],[roundedBox(.89,.14,.89),trim,1.97],[roundedBox(1.0,.15,1.0),dark,2.11]]){const o=add(g,m,0,y,0,group);o.userData.blocker=true;pickables.push(o);}
  for(let n=0;n<8;n++){const a=n*TAU/8;add(new THREE.CylinderGeometry(.017,.017,1.25,5),dark,Math.sin(a)*.37,1.14,Math.cos(a)*.37,group);}
 }
 // The arch is made of wedge-like individual stones rather than a smooth torus.
 for(const x of [-1.65,1.65]){add(roundedBox(.55,2.65,.9),wallMat,x,1.32,-7.6);for(const y of [.15,2.65])add(roundedBox(.85,.2,1.05),trim,x,y,-7.6);for(const y of [.65,1.35,2.05])add(roundedBox(.60,.06,.96,.015),dark,x,y,-7.6);}
 for(let n=0;n<=14;n++){const a=n*Math.PI/14,block=add(roundedBox(.35,.48,.95,.04),n===7?trim:wallMat,Math.cos(a)*1.65,2.68+Math.sin(a)*1.65,-7.6);block.rotation.z=a-Math.PI/2;}
 add(roundedBox(.44,.63,1.10),trim,0,4.32,-7.6);
 for(let n=0;n<5;n++)add(roundedBox(3.3,.2,1.3),dark,0,-.12+n*.12,-8.1-n*.9);
 const beyond=new THREE.PointLight(0x87afb1,12,14,2);beyond.position.set(0,2,-10);scene.add(beyond);
 // Heraldic cloth adds a readable silhouette and colour to the ruined gateway.
 const cloth=new THREE.MeshStandardMaterial({color:0x60342b,roughness:1,side:THREE.DoubleSide});
 for(const x of [-4.2,4.2]){add(new THREE.CylinderGeometry(.025,.025,1.1,8),iron,x,2.45,-6.94).rotation.z=Math.PI/2;
  const shape=new THREE.Shape();shape.moveTo(-.43,0);shape.lineTo(.43,0);shape.lineTo(.43,-1.23);shape.lineTo(.12,-1.05);shape.lineTo(0,-1.4);shape.lineTo(-.17,-1.1);shape.lineTo(-.43,-1.25);shape.closePath();add(new THREE.ShapeGeometry(shape),cloth,x,2.4,-6.88);
  add(roundedBox(.045,.52,.018,.003),gold,x,1.85,-6.85);add(roundedBox(.33,.045,.018,.003),gold,x,1.92,-6.85);
 }
 const glowMap=radialTexture(true);
 for(const x of [-6.9,6.9]){const z=-5.6;add(new THREE.CylinderGeometry(.045,.08,1.65,10),iron,x,.82,z);add(new THREE.CylinderGeometry(.19,.09,.24,10,1,true),iron,x,1.71,z);for(let n=0;n<5;n++){const a=n*TAU/5;add(new THREE.CylinderGeometry(.015,.015,.4,5),iron,x+Math.sin(a)*.14,1.85,z+Math.cos(a)*.14);}
  const flame=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,blending:THREE.AdditiveBlending,depthWrite:false,color:0xffc375}));flame.position.set(x,1.96,z);flame.scale.set(.78,1.05,1);scene.add(flame);const light=new THREE.PointLight(0xffac56,18,11,2);light.position.set(x,2.05,z);scene.add(light);torches.push({flame,light,base:18,seed:x});
 }
 // All foliage and fallen masonry stay outside the navigable boundary.
 const rubble=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.42,1),dark,100);
 for(let n=0;n<100;n++){const side=n%2?-1:1;dummy.position.set(side*(8.6+random()*3),-.02,-8+random()*16);dummy.rotation.set(random()*3,random()*3,random()*3);dummy.scale.set(.4+random()*1.3,.25+random()*.5,.5+random());dummy.updateMatrix();rubble.setMatrixAt(n,dummy.matrix);}rubble.castShadow=rubble.receiveShadow=true;scene.add(rubble);
 const grassMat=new THREE.MeshStandardMaterial({color:0x64734a,roughness:1,side:THREE.DoubleSide}),grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.11,.62,3),grassMat,450);
 for(let n=0;n<450;n++){const side=n%2?-1:1;dummy.position.set(side*(8.25+random()*3.8),.04,-8+random()*18);dummy.rotation.set((random()-.5)*.4,random()*TAU,side*.25);dummy.scale.set(.6+random(),.35+random()*.9,1);dummy.updateMatrix();grass.setMatrixAt(n,dummy.matrix);}scene.add(grass);
 // Distant ruin fragments silhouette the mist beyond the gate.
 for(const [x,z,h] of [[-11,-10,3.5],[-13,-7,2.4],[10,-12,4],[13,-9,2.7]]){add(roundedBox(1.1,h,1.1),dark,x,h/2-.2,z);add(roundedBox(1.45,.18,1.45),trim,x,h-.12,z);}
 // Small drifting motes, capped to a single draw call.
 const dustGeometry=new THREE.BufferGeometry(),dustPositions=new Float32Array(90*3);for(let n=0;n<90;n++){dustPositions[n*3]=(random()-.5)*24;dustPositions[n*3+1]=random()*6;dustPositions[n*3+2]=(random()-.5)*20;}dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xe6cf9e,size:.027,transparent:true,opacity:.35,depthWrite:false}));scene.add(dust);
 batchArchitecture(scene);
 const hoverRing=createRing(scene,0xe1c480,.36),enemyRing=createRing(scene,0xb86753,.65);hoverRing.visible=enemyRing.visible=false;
 return {scene,ground,hoverRing,enemyRing,torches,shadowLight:sun,dust,shadow};
}
export function polishActor(model,isHero){
 model.traverse(o=>{if(!o.isMesh||!o.material)return;const m=o.material;
  if(/Helmet|Arm|Body|Leg|Sword|Shield|Blade/.test(o.name)){m.metalness=.48;m.roughness=.38;m.envMapIntensity=1.45;m.color.set(isHero?0xd3d6d5:0xabb4b4);}
  if(/Cape|Cloak/.test(o.name)){m.metalness=0;m.roughness=.95;m.color.set(isHero?0x985648:0x4c666a);}
  if(/Head|Jaw/.test(o.name)){m.metalness=0;m.roughness=.88;}
  if(/Eyes/.test(o.name)){m.emissive?.set(0xb95e23);m.emissiveIntensity=1.7;}
 });
}
export function portrait(renderer,scene,actor){
 // Reuse the live renderer and its compiled programs instead of creating a second WebGL context.
 const w=144,h=180,target=new THREE.WebGLRenderTarget(w,h,{colorSpace:THREE.SRGBColorSpace}),previous=renderer.getRenderTarget();
 const camera=new THREE.PerspectiveCamera(28,w/h,.1,30),p=actor.group.position;camera.position.copy(p).add(new THREE.Vector3(1.45,1.85,2.8));camera.lookAt(p.x,p.y+1.62,p.z);
 renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);renderer.setRenderTarget(previous);target.dispose();
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d'),image=context.createImageData(w,h);
 for(let y=0;y<h;y++)image.data.set(pixels.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);context.putImageData(image,0,0);return canvas.toDataURL();
}

function batchArchitecture(scene){
 // One draw call per opaque material for stationary decoration; keep selectable columns intact.
 scene.updateMatrixWorld(true);const batches=new Map();
 scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.blocker||Array.isArray(o.material)||o.material.transparent)return;const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);});
 for(const [material,objects] of batches){if(objects.length<2)continue;const geometries=objects.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld)),geometry=mergeGeometries(geometries,false);if(geometry){const m=new THREE.Mesh(geometry,material);m.castShadow=objects.some(o=>o.castShadow);m.receiveShadow=objects.some(o=>o.receiveShadow);scene.add(m);objects.forEach(o=>o.removeFromParent());}geometries.forEach(g=>g.dispose());}
}
export function bladeTrail(scene,actor){
 const blade=actor.model.getObjectByName(actor.isHero?'1H_Sword':'Skeleton_Blade');if(!blade?.geometry)return null;
 blade.geometry.computeBoundingBox();const end=blade.geometry.boundingBox.max.y,start=blade.geometry.boundingBox.min.y;
 const geometry=new THREE.BufferGeometry(),vertices=new Float32Array(8*6*3);geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));
 const material=new THREE.MeshBasicMaterial({color:actor.isHero?0xffd8a3:0xc4dee1,transparent:true,opacity:.22,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}),mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
 return {blade,mesh,vertices,samples:[],tip:new THREE.Vector3(0,end,0),base:new THREE.Vector3(0,start+(end-start)*.66,0)};
}
export function updateBladeTrail(trail,actor,reducedMotion){
 if(!trail)return;const attack=actor.clip==='1H_Melee_Attack_Slice_Diagonal',t=actor.action.time/actor.action.getClip().duration;
 if(!attack||reducedMotion||t<.18||t>.72){trail.samples.length=0;trail.mesh.visible=false;return;}
 actor.group.updateMatrixWorld(true);const pair=[trail.blade.localToWorld(trail.base.clone()),trail.blade.localToWorld(trail.tip.clone())];trail.samples.push(pair);if(trail.samples.length>9)trail.samples.shift();trail.vertices.fill(0);
 for(let n=1;n<trail.samples.length;n++){const [a,b]=trail.samples[n-1],[c,d]=trail.samples[n];let offset=(n-1)*18;for(const p of [a,b,c,b,d,c]){p.toArray(trail.vertices,offset);offset+=3;}}
 trail.mesh.geometry.setDrawRange(0,Math.max(0,trail.samples.length-1)*6);trail.mesh.geometry.attributes.position.needsUpdate=true;trail.mesh.visible=trail.samples.length>1;
}

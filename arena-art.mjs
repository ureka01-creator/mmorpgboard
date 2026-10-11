import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rooms,columns,obstacles} from './arena-engine.mjs';
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
export function createArtWorld(renderer){
 seed=812;const scene=new THREE.Scene(),torches=[];scene.background=new THREE.Color(0x070d12);scene.fog=new THREE.FogExp2(0x111922,.027);scene.environment=environment(renderer);scene.environmentIntensity=.72;
 scene.add(new THREE.HemisphereLight(0xa7bacb,0x27211b,.9));
 const sun=new THREE.DirectionalLight(0xb9cbd5,2);sun.position.set(-4,12,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:40});sun.shadow.bias=-.00015;sun.shadow.normalBias=.035;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xe2cda9,1.0);fill.position.set(4,8,10);scene.add(fill);
 const maps=surfaceMaps(),stone=(color)=>new THREE.MeshStandardMaterial({color,map:maps.map,bumpMap:maps.bump,bumpScale:.045,metalness:.02,roughness:.9}),floorMat=stone(0x92958e),wallMat=stone(0x807e72),trim=stone(0xaaa394),dark=stone(0x595b56),iron=new THREE.MeshStandardMaterial({color:0x4b4841,metalness:.7,roughness:.45}),brass=new THREE.MeshStandardMaterial({color:0xa98a53,metalness:.68,roughness:.44}),wood=new THREE.MeshStandardMaterial({color:0x634c35,roughness:.93});
 const add=(g,m,x=0,y=0,z=0,parent=scene)=>{let scale=null;if(Array.isArray(parent)){scale=parent;parent=scene;}const o=new THREE.Mesh(g,m);o.position.set(x,y,z);if(scale)o.scale.set(...scale);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const tiles=[];for(const room of rooms)for(let z=Math.ceil(room.z0);z<room.z1;z++)for(let x=Math.ceil(room.x0);x<room.x1;x++){if(tiles.some(t=>t[0]===x&&t[1]===z))continue;tiles.push([x,z]);}
 const dummy=new THREE.Object3D(),floor=new THREE.InstancedMesh(roundedBox(.96,.14,.96,.023),floorMat,tiles.length);
 tiles.forEach(([x,z],i)=>{dummy.position.set(x,-.09,z);dummy.rotation.y=(random()-.5)*.017;dummy.updateMatrix();floor.setMatrixAt(i,dummy.matrix);floor.setColorAt(i,new THREE.Color().setScalar(.8+random()*.18));});floor.receiveShadow=true;scene.add(floor);
 // Dark continuous substrate fills tile joints and corridor thresholds.
 for(const r of rooms){const plane=add(new THREE.PlaneGeometry(r.x1-r.x0,r.z1-r.z0),dark,(r.x0+r.x1)/2,-.12,(r.z0+r.z1)/2);plane.rotation.x=-Math.PI/2;plane.castShadow=false;}
 const wallRuns=[[-6.65,-5.9,-6.65,1.3,2.4],[-6.65,3.7,-6.65,5.9,.8],[6.65,-5.9,6.65,-3.8,2.4],[6.65,-1.4,6.65,5.9,.7],[-6.65,-5.9,-1.6,-5.9,2.8],[1.6,-5.9,6.65,-5.9,2.8],[-6.65,5.9,6.65,5.9,.65],[-10.9,.88,-6.65,.88,1.9],[-10.9,4.12,-6.65,4.12,.6],[-10.9,.88,-10.9,4.12,2.4],[-2.02,-7.8,-2.02,-5.9,2.3],[2.02,-7.8,2.02,-5.9,2.3],[-2.02,-7.8,2.02,-7.8,2.2],[6.65,-4.2,9.4,-4.2,2.2],[6.65,-.98,9.4,-.98,.6],[9.4,-4.2,9.4,-.98,2.2]];
 const bricks=[];for(const [x0,z0,x1,z1,height] of wallRuns){const d=Math.hypot(x1-x0,z1-z0),n=Math.ceil(d/1.1),angle=Math.atan2(x1-x0,z1-z0);for(let layer=0;layer<Math.floor(height/.44);layer++)for(let j=0;j<n;j++){const t=(j+.5)/n;bricks.push({x:x0+(x1-x0)*t,y:.22+layer*.44,z:z0+(z1-z0)*t,a:angle,d:d/n-.025});}}
 const walls=new THREE.InstancedMesh(roundedBox(.65,.39,1,.032),wallMat,bricks.length);bricks.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.rotation.y=b.a;dummy.scale.set(1,1,b.d);dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);walls.setColorAt(i,new THREE.Color().setScalar(.8+random()*.2));});walls.castShadow=walls.receiveShadow=true;scene.add(walls);dummy.scale.set(1,1,1);
 // Cutaway foreground masonry stays low while north walls retain their full carved silhouette.
 for(const [x,z] of columns){add(roundedBox(.97,.18,.97),dark,x,.08,z);add(roundedBox(.75,.12,.75),trim,x,.22,z);add(new THREE.CylinderGeometry(.28,.35,1.65,20),wallMat,x,1.09,z);for(const y of [.32,1.86])add(new THREE.CylinderGeometry(.37,.37,.1,20),trim,x,y,z);add(roundedBox(.82,.18,.82),trim,x,2.0,z);for(let n=0;n<8;n++){const a=n*TAU/8;add(new THREE.CylinderGeometry(.014,.014,1.35,5),dark,x+Math.sin(a)*.3,1.08,z+Math.cos(a)*.3);}}
 const gate=(x,z,rotation=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;scene.add(g);for(const side of [-1,1]){add(roundedBox(.45,2.25,.75),wallMat,side*1.38,1.12,0,g);for(const y of [.15,2.20])add(roundedBox(.64,.16,.89),trim,side*1.38,y,0,g);}for(let n=0;n<=12;n++){const a=n*Math.PI/12,o=add(roundedBox(.31,.4,.76,.03),trim,Math.cos(a)*1.38,2.3+Math.sin(a)*1.38,0,g);o.rotation.z=a-Math.PI/2;}return g;};
 gate(0,-5.9);gate(-6.65,2.5,Math.PI/2);gate(6.65,-2.6,Math.PI/2);
 // Ajar wooden door at the entry, outside the usable opening.
 const door=new THREE.Group();door.position.set(-6.45,0,4.05);door.rotation.y=.38;scene.add(door);for(let n=0;n<5;n++)add(roundedBox(.17,1.9,.09,.012),wood,n*.175-.35,1.03,0,door);for(const y of [.4,1.6])add(roundedBox(.89,.052,.035,.009),iron,0,y,.069,door);add(new THREE.TorusGeometry(.045,.009,5,12),brass,-.28,1.0,.085,door);
 for(let n=0;n<5;n++)add(roundedBox(2.75,.19,.4,.02),dark,0,.08+n*.16,-7.80-n*.35);
 // Floor compass: thin brass inlay, not a grid or raised obstacle.
 for(const r of [1.75,1.84,2.1]){const ring=new THREE.Mesh(new THREE.RingGeometry(r-.018,r,96),brass);ring.rotation.x=-Math.PI/2;ring.position.y=.012;scene.add(ring);}
 for(let n=0;n<8;n++){const a=n*TAU/8,s=new THREE.Shape();s.moveTo(0,0);s.lineTo(-.13,.5);s.lineTo(0,1.6);s.lineTo(.13,.5);s.closePath();const ray=new THREE.Mesh(new THREE.ShapeGeometry(s),brass);ray.rotation.set(-Math.PI/2,0,a);ray.position.y=.014;scene.add(ray);}
 const bannerMat=new THREE.MeshStandardMaterial({color:0x632e2b,roughness:.98,side:THREE.DoubleSide});for(const x of [-3.2,3.2]){add(new THREE.CylinderGeometry(.025,.025,.95,8),iron,x,2.3,-5.52).rotation.z=Math.PI/2;const shape=new THREE.Shape();shape.moveTo(-.39,0);shape.lineTo(.39,0);shape.lineTo(.39,-1.16);shape.lineTo(0,-1.42);shape.lineTo(-.39,-1.16);shape.closePath();add(new THREE.ShapeGeometry(shape),bannerMat,x,2.25,-5.50);add(roundedBox(.025,.47,.015,.002),brass,x,1.60,-5.47);add(roundedBox(.29,.025,.015,.002),brass,x,1.70,-5.47);}
 const barrel=(x,z)=>{add(new THREE.CylinderGeometry(.31,.29,.8,14),wood,x,.41,z);for(const y of [.15,.68])add(new THREE.TorusGeometry(.31,.023,6,20),iron,x,y,z).rotation.x=Math.PI/2;for(let n=0;n<12;n++){const a=n*TAU/12;add(new THREE.CylinderGeometry(.007,.007,.69,4),dark,x+Math.sin(a)*.307,.41,z+Math.cos(a)*.307);}};
 barrel(5.1,-4.5);barrel(-5,-4.5);barrel(-9.7,3.15);
 add(roundedBox(.69,.68,.69,.035),wood,5.15,.34,4.65);for(const y of [.08,.59])add(roundedBox(.75,.055,.75,.015),iron,5.15,y,4.65);
 // Tattered corridor runner and carved wall reliefs carry the sanctuary's identity.
 const rug=new THREE.Mesh(new THREE.PlaneGeometry(3.3,1.2),new THREE.MeshStandardMaterial({color:0x592d2b,roughness:1,side:THREE.DoubleSide}));rug.rotation.x=-Math.PI/2;rug.position.set(-8.15,.012,2.5);scene.add(rug);
 for(const z of [1.96,3.04])add(roundedBox(3.15,.007,.017,.001),brass,-8.15,.016,z);
 for(const x of [-9.65,-6.65])add(roundedBox(.015,.007,1.07,.001),brass,x,.016,2.5);
 for(const x of [-5.1,5.1]){add(roundedBox(.60,2.45,.50),dark,x,1.19,-5.70);for(const y of [.15,2.38])add(roundedBox(.78,.16,.66),trim,x,y,-5.69);const relief=add(new THREE.TorusGeometry(.23,.034,8,32),trim,x,1.63,-5.40);for(let n=0;n<8;n++){const a=n*TAU/8;const petal=add(new THREE.SphereGeometry(.075,8,6),trim,x+Math.sin(a)*.17,1.63+Math.cos(a)*.17,-5.39,[.45,1,.3]);petal.rotation.z=-a;}add(new THREE.SphereGeometry(.072,10,8),brass,x,1.63,-5.34,[1,1,.35]);}
 const vineMat=new THREE.MeshStandardMaterial({color:0x3d4932,roughness:1});for(const x of [-5.8,5.8])for(let n=0;n<12;n++){const leaf=add(new THREE.SphereGeometry(.07,7,5),vineMat,x+Math.sin(n*.9)*.11,.2+n*.17,-5.38,[.5,1,.3]);leaf.rotation.z=n*.8;}
 const glow=radialTexture(true);for(const [x,z] of [[-5.9,-2.0],[5.9,.8],[-2.5,-5.4],[2.5,-5.4],[-9.7,1.7]]){add(new THREE.CylinderGeometry(.04,.055,.65,8),iron,x,1.23,z);add(new THREE.CylinderGeometry(.12,.065,.15,8),iron,x,1.56,z);const flame=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffc188,blending:THREE.AdditiveBlending,depthWrite:false}));flame.position.set(x,1.78,z);flame.scale.set(.56,.8,1);scene.add(flame);torches.push({flame,seed:x+z});}
 // Two broad light pools illuminate the actual combat floor without many per-pixel lights.
 for(const [x,z] of [[-4,-2],[4,-2]]){const light=new THREE.PointLight(0xffaa59,14,12,2);light.position.set(x,2.6,z);scene.add(light);}
 const rubble=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.16,1),dark,45);for(let n=0;n<45;n++){const side=n%2?1:-1;dummy.position.set(side*(5.75+random()*.25),.06,-5+random()*10);dummy.rotation.set(random()*2,random()*2,random()*2);dummy.scale.set(.5+random(),.3+random()*.35,.6+random());dummy.updateMatrix();rubble.setMatrixAt(n,dummy.matrix);}rubble.receiveShadow=true;scene.add(rubble);
 batchArchitecture(scene);const target=createRing(scene,0xd5bb88,.25);target.visible=false;
 const warningGeometry=new THREE.CircleGeometry(1.8,48,0,Math.PI*.67),warning=new THREE.Mesh(warningGeometry,new THREE.MeshBasicMaterial({color:0xb75531,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));warning.rotation.x=-Math.PI/2;warning.visible=false;scene.add(warning);
 return {scene,torches,target,warning,sun};
}
export function portrait(renderer,scene,actor){
 // Reuse the live renderer and its compiled programs instead of creating a second WebGL context.
 const w=144,h=180,target=new THREE.WebGLRenderTarget(w,h,{colorSpace:THREE.SRGBColorSpace}),previous=renderer.getRenderTarget();
 const camera=new THREE.PerspectiveCamera(28,w/h,.1,30),p=actor.group.position;camera.position.copy(p).add(new THREE.Vector3(1.45,1.85,2.8).applyAxisAngle(new THREE.Vector3(0,1,0),actor.group.rotation.y));camera.lookAt(p.x,p.y+1.62,p.z);
 renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);renderer.setRenderTarget(previous);target.dispose();
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d'),image=context.createImageData(w,h);
 for(let y=0;y<h;y++)image.data.set(pixels.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);context.putImageData(image,0,0);return canvas.toDataURL();
}

function batchArchitecture(scene){
 // One draw call per opaque material for stationary decoration; keep selectable columns intact.
 scene.updateMatrixWorld(true);const batches=new Map();
 scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.blocker||Array.isArray(o.material)||o.material.transparent)return;const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);});
 for(const [material,objects] of batches){if(objects.length<2)continue;const geometries=objects.map(o=>(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld)),geometry=mergeGeometries(geometries,false);if(geometry){const m=new THREE.Mesh(geometry,material);m.castShadow=objects.some(o=>o.castShadow);m.receiveShadow=objects.some(o=>o.receiveShadow);scene.add(m);objects.forEach(o=>o.removeFromParent());}geometries.forEach(g=>g.dispose());}
}

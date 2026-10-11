import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const PI=Math.PI;
const material=(color,metalness=0,roughness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
function mesh(parent,g,m,x=0,y=0,z=0,scale){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);if(scale)o.scale.set(...scale);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function joint(parent,x,y,z){const b=new THREE.Bone();b.position.set(x,y,z);parent.add(b);return b;}
function limb(parent,length,radius,m){const points=[[radius*.5,0],[radius*.82,.025],[radius,length*.25],[radius*.75,length*.73],[radius*.52,length]].map(([x,y])=>new THREE.Vector2(x,y));const o=mesh(parent,new THREE.LatheGeometry(points,12),m,0,-length,0);return o;}
function ribbon(parent,cloth){const shape=new THREE.Shape();shape.moveTo(-.22,0);shape.lineTo(.22,0);shape.lineTo(.33,-1.13);shape.lineTo(.16,-1.05);shape.lineTo(0,-1.20);shape.lineTo(-.32,-1.12);shape.closePath();const g=new THREE.ShapeGeometry(shape,10);const p=g.attributes.position;for(let i=0;i<p.count;i++){p.setZ(i,Math.sin(p.getX(i)*28)*.026-Math.abs(p.getY(i))*.12);}g.computeVertexNormals();const cape=mesh(parent,g,cloth,0,1.68,-.24);cape.material.side=THREE.DoubleSide;return cape;}
export function createActor(scene,isHero=true){
 const group=new THREE.Group(),model=new THREE.Group();group.add(model);scene.add(group);
 const steel=material(isHero?0x8999a5:0x5a646a,.72,.32),trim=material(0xa18a58,.72,.37),dark=material(0x151c20,.3,.75),leather=material(0x322d2a,0,.95),bone=material(0xb3ac8d,.04,.85),cloth=material(isHero?0x692c2e:0x303b3d,0,.96);
 const pelvis=joint(model,0,.96,0),chest=joint(pelvis,0,.40,0),head=joint(chest,0,.58,0),arms=[],legs=[];
 mesh(pelvis,new THREE.CapsuleGeometry(.20,.13,4,12),isHero?leather:dark,0,.025,0,[1,.65,.75]);mesh(pelvis,new THREE.TorusGeometry(.218,.023,6,24),trim,0,.05,0,[1,1,.75]).rotation.x=PI/2;
 if(isHero){mesh(chest,new THREE.SphereGeometry(.29,20,14),steel,0,-.015,0,[.9,1.24,.64]);mesh(chest,new THREE.SphereGeometry(.25,16,10),dark,0,-.18,-.025,[.88,.8,.60]);for(let n=0;n<3;n++)mesh(pelvis,new THREE.CylinderGeometry(.235-n*.008,.25-n*.008,.09,16,1,true),steel,0,.14+n*.07,0,[1,1,.72]);
  // Raised breastplate crest and engraved brass rib at the sternum.
  mesh(chest,new THREE.BoxGeometry(.034,.32,.014),trim,0,.01,.184);mesh(chest,new THREE.BoxGeometry(.15,.022,.014),trim,0,.09,.182);
  mesh(head,new THREE.SphereGeometry(.16,20,14),steel,0,0,0,[.88,1.06,.96]);mesh(head,new THREE.SphereGeometry(.144,18,12),dark,0,-.015,.013,[.95,.65,1.02]);
  const visor=mesh(head,new THREE.SphereGeometry(.153,18,12,0,PI,PI*.37,PI*.48),steel,0,-.002,.015);visor.rotation.y=0;
  mesh(head,new THREE.BoxGeometry(.246,.015,.032),dark,0,.019,.142);mesh(head,new THREE.BoxGeometry(.022,.195,.038),steel,0,-.006,.155);
  for(let n=-3;n<=3;n++)mesh(head,new THREE.BoxGeometry(.006,.042,.012),dark,n*.025,-.077,.141-Math.abs(n)*.002);
  mesh(head,new THREE.TorusGeometry(.15,.009,5,24),trim,0,-.117,0,[.95,1,.95]).rotation.x=PI/2;
 }else{
  mesh(chest,new THREE.CylinderGeometry(.037,.032,.51,8),bone,0,-.055,0);for(let n=0;n<6;n++){const rib=mesh(chest,new THREE.TorusGeometry(.18+n*.008,.015,5,22),bone,0,.16-n*.068,.006,[1,.68,1]);rib.rotation.x=PI/2;}
  for(const side of [-1,1])mesh(chest,new THREE.SphereGeometry(.15,12,8),steel,side*.14,.18,-.06,[.9,.65,.5]);
  mesh(head,new THREE.SphereGeometry(.145,18,12),bone,0,0,0,[.86,1.06,.9]);for(const side of [-1,1]){mesh(head,new THREE.SphereGeometry(.045,12,8),dark,side*.059,.008,.112,[1,.75,.6]);const eye=mesh(head,new THREE.SphereGeometry(.014,8,6),material(0xd08b49),side*.059,.008,.143);eye.material.emissive.set(0xb85d1a);eye.material.emissiveIntensity=1.8;}
  mesh(head,new THREE.BoxGeometry(.095,.037,.05),bone,0,-.107,.074);for(let n=-3;n<=3;n++)mesh(head,new THREE.BoxGeometry(.012,.024,.019),bone,n*.016,-.076,.125);
  mesh(head,new THREE.CylinderGeometry(.15,.155,.085,14,1,true),steel,0,.075,0);for(let n=0;n<7;n++){const a=n*PI*2/7;mesh(head,new THREE.ConeGeometry(.03,.17,5),trim,Math.sin(a)*.143,.185,Math.cos(a)*.143);}
 }
 for(const side of [-1,1]){
  const shoulder=joint(chest,side*.34,.17,0),elbow=joint(shoulder,0,-.35,0),hand=joint(elbow,0,-.33,0);arms.push({shoulder,elbow,hand,side});
  mesh(shoulder,new THREE.SphereGeometry(.145,16,10),steel,side*.024,-.005,0,[1.12,.8,1]);mesh(shoulder,new THREE.TorusGeometry(.126,.012,6,16),trim,side*.025,-.038,0).rotation.x=PI/2;
  limb(shoulder,.34,isHero?.092:.035,isHero?steel:bone);mesh(elbow,new THREE.SphereGeometry(.073,12,8),steel);limb(elbow,.32,isHero?.077:.031,isHero?steel:bone);mesh(hand,new THREE.SphereGeometry(.059,10,8),isHero?leather:bone,0,-.035,0,[.8,1.2,.9]);
  const hip=joint(pelvis,side*.137,-.01,0),knee=joint(hip,0,-.43,0),ankle=joint(knee,0,-.40,0);legs.push({hip,knee,ankle,side});
  limb(hip,.43,isHero?.107:.040,isHero?steel:bone);mesh(knee,new THREE.SphereGeometry(.079,12,8),steel,0,0,.019,[1,1,.8]);limb(knee,.4,isHero?.084:.037,isHero?steel:bone);mesh(ankle,new THREE.SphereGeometry(.10,14,10),steel,0,-.07,.065,[.78,.66,1.58]);
 }
 // Right-hand longsword: tapered steel blade, central ridge, brass guard and leather grip.
 const weapon=new THREE.Group();arms[1].hand.add(weapon);weapon.rotation.x=PI/2;weapon.position.set(0,-.04,0);
 mesh(weapon,new THREE.CylinderGeometry(.017,.017,.19,8),leather,0,.025,0);mesh(weapon,new THREE.SphereGeometry(.029,10,8),trim,0,-.10,0);
 mesh(weapon,new THREE.BoxGeometry(.27,.032,.035),trim,0,.13,0);
 const shape=new THREE.Shape();shape.moveTo(-.047,.16);shape.lineTo(.047,.16);shape.lineTo(.030,.91);shape.lineTo(0,1.09);shape.lineTo(-.030,.91);shape.closePath();const blade=mesh(weapon,new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.008,bevelThickness:.004,bevelSegments:1,steps:1}),steel);mesh(weapon,new THREE.BoxGeometry(.01,.76,.025),trim,0,.54,.011);
 const shield=new THREE.Group();arms[0].elbow.add(shield);shield.position.set(-.035,-.21,.11);shield.rotation.y=-.22;
 const shieldShape=new THREE.Shape();shieldShape.moveTo(-.19,.19);shieldShape.lineTo(.19,.19);shieldShape.lineTo(.18,-.05);shieldShape.lineTo(0,-.30);shieldShape.lineTo(-.18,-.05);shieldShape.closePath();mesh(shield,new THREE.ExtrudeGeometry(shieldShape,{depth:.026,bevelEnabled:true,bevelSize:.018,bevelThickness:.016,bevelSegments:2,steps:1}),steel);mesh(shield,new THREE.BoxGeometry(.017,.39,.015),trim,0,-.015,.055);mesh(shield,new THREE.BoxGeometry(.29,.017,.015),trim,0,.045,.055);
 const cape=ribbon(model,cloth);
 const trailG=new THREE.BufferGeometry(),trailPositions=new Float32Array(7*18);trailG.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));const trail=new THREE.Mesh(trailG,new THREE.MeshBasicMaterial({color:isHero?0xffd6a4:0xc59d81,transparent:true,opacity:.25,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));trail.frustumCulled=false;trail.visible=false;scene.add(trail);
 batchJoints(model);
 return {group,model,pelvis,chest,head,arms,legs,cape,weapon,blade,trail,trailPositions,samples:[],isHero,height:2.13,headDiameter:.32,pose:'idle'};
}
export function animateActor(actor,body,time,reduced=false){
 const {group,model,pelvis,chest,head,arms,legs,cape}=actor;group.position.set(body.x,0,body.z);group.rotation.y=body.yaw;actor.pose=body.mode;
 model.rotation.set(0,0,0);model.position.set(0,0,0);pelvis.rotation.set(0,0,0);pelvis.position.y=.96;chest.rotation.set(0,0,0);head.rotation.set(0,0,0);
 const walking=body.mode==='walk'||body.mode==='attack'&&body.travel-(actor.lastTravel??body.travel)>.001;actor.lastTravel=body.travel;const stride=walking?Math.sin(body.travel*5.2):0;
 for(const arm of arms){arm.shoulder.rotation.set(stride*.36*arm.side,0,arm.side*.10);arm.elbow.rotation.set(-.22,0,0);}
 for(const leg of legs){leg.hip.rotation.set(stride*.53*leg.side,0,0);leg.knee.rotation.set(Math.max(0,-stride*leg.side)*.48,0,0);}pelvis.position.y+=walking?Math.abs(stride)*.018:Math.sin(time*2)*.008;
 cape.rotation.x=walking?.12+Math.sin(body.travel*5)*.045:.015+Math.sin(time*1.4)*.018;
 if(body.mode==='attack'){const t=Math.min(1,body.elapsed/.66),swing=Math.sin(Math.max(0,Math.min(1,(t-.1)/.72))*PI);chest.rotation.y=-.48+swing*.95;arms[1].shoulder.rotation.set(-1.2+swing*.42,-.35+swing*1.75,-.55+swing*.4);arms[1].elbow.rotation.x=-.8+swing*.6;arms[0].shoulder.rotation.x=-.55;}
 if(body.mode==='windup'){arms[1].shoulder.rotation.set(-1.8,-.5,-.2);arms[1].elbow.rotation.x=-1.1;chest.rotation.y=-.33;}
 if(body.mode==='dodge'){const t=Math.min(1,body.elapsed/.34);model.rotation.x=-t*PI*2;model.position.y=.96*(1-Math.cos(t*PI*2))+Math.sin(t*PI)*.12;model.position.z=.96*Math.sin(t*PI*2);pelvis.rotation.x=-.55;for(const leg of legs){leg.hip.rotation.x=-.7;leg.knee.rotation.x=.9;}}else model.position.y=0;
 if(body.mode==='hurt')chest.rotation.x=-Math.sin(Math.min(1,body.elapsed/.30)*PI)*.27;
 if(body.mode==='dead'){actor.deathStarted??=time;const t=Math.min(1,(time-actor.deathStarted)/.48),fall=t*t*(3-2*t);model.rotation.x=-PI/2*fall;model.position.y=.18*fall;arms[1].shoulder.rotation.z=-.7*fall;}else actor.deathStarted=null;
 group.updateMatrixWorld(true);
 if(body.mode==='attack'&&body.elapsed>.11&&body.elapsed<.50&&!reduced){actor.samples.push([actor.weapon.localToWorld(new THREE.Vector3(0,.56,0)),actor.weapon.localToWorld(new THREE.Vector3(0,1.08,0))]);if(actor.samples.length>8)actor.samples.shift();actor.trailPositions.fill(0);for(let n=1;n<actor.samples.length;n++){const [a,b]=actor.samples[n-1],[c,d]=actor.samples[n];let offset=(n-1)*18;for(const p of [a,b,c,b,d,c]){p.toArray(actor.trailPositions,offset);offset+=3;}}actor.trail.geometry.attributes.position.needsUpdate=true;actor.trail.geometry.setDrawRange(0,(actor.samples.length-1)*6);actor.trail.visible=actor.samples.length>1;
 }else{actor.samples.length=0;actor.trail.visible=false;}
}

function batchJoints(model){
 const parents=[];model.traverse(o=>{if(o.isBone||o.isGroup)parents.push(o);});
 for(const parent of parents){const batches=new Map();for(const child of [...parent.children]){if(!child.isMesh||child.material.transparent)continue;const list=batches.get(child.material)||[];list.push(child);batches.set(child.material,list);}for(const [material,objects] of batches){if(objects.length<2)continue;const clones=objects.map(o=>{o.updateMatrix();return (o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix);}),g=mergeGeometries(clones,false);if(g){const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;parent.add(m);objects.forEach(o=>o.removeFromParent());}clones.forEach(g=>g.dispose());}}
}

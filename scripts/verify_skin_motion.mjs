import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {turn,damp} from '../arena-motion.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=d=>createHash('sha256').update(d).digest('hex');
const data=read('assets/animations/fullplate-motion.json'),pack=JSON.parse(data),source=JSON.parse(read('assets/animations/skinned-sources.json'));
const model=read('assets/characters/sentinel.glb'),modelSource=JSON.parse(read('assets/characters/sentinel-sources.json'));
assert.equal(sha(data),source.generatedSha256);assert.equal(sha(model),source.modelSha256);assert.equal(sha(model),modelSource.generatedSha256);assert.equal(source.license,'CC0-1.0');assert.equal(modelSource.license,'CC0-1.0');
assert.equal(source.commit,'e24c23cf2a1323488a3faa226ea7ea21f644b73e');assert.equal(pack.schema,2);assert.equal(pack.joints.length,53);assert.equal(new Set(pack.joints).size,53);
for(const name of ['idle','carry','walk','run','attack','roll','hurt','dead']){
 const c=pack.clips[name];assert(c.duration>0&&c.frames.length>15&&c.contactPhase>=0&&c.contactPhase<=1);assert(c.source);
 for(const f of c.frames){assert.equal(f.length,215);assert(f.every(Number.isFinite));for(let i=3;i<f.length;i+=4)assert(Math.abs(Math.hypot(...f.slice(i,i+4))-1)<.000003);}
 if(['idle','carry','run','walk'].includes(name)){const a=c.frames[0],b=c.frames.at(-1);for(let i=3;i<a.length;i+=4){const dot=a.slice(i,i+4).reduce((s,v,k)=>s+v*b[i+k],0);assert(Math.abs(dot)>.97,`${name}: discontinuous joint loop`);}}
}
assert.equal(model.readUInt32LE(0),0x46546c67);assert.equal(model.readUInt32LE(4),2);assert.equal(model.readUInt32LE(8),model.length);
const jsonLength=model.readUInt32LE(12),g=JSON.parse(model.subarray(20,20+jsonLength).toString()),bin=model.subarray(28+jsonLength);
assert.equal(g.skins.length,1);assert.equal(g.skins[0].joints.length,53);assert(!g.extensionsUsed?.includes('KHR_draco_mesh_compression'));
assert.deepEqual(g.skins[0].joints.map(i=>g.nodes[i].name),pack.joints);
const prim=g.meshes[0].primitives[0],pos=g.accessors[prim.attributes.POSITION],weights=g.accessors[prim.attributes.WEIGHTS_0],joints=g.accessors[prim.attributes.JOINTS_0];
assert(prim.attributes.COLOR_0!==undefined,'Painted character must have actual vertex colours');assert.equal(g.images.length,1);assert.equal(g.images[0].name,'Sentinel original painted atlas');assert(pos.count>1500,'Armour detail and skinned mantle geometry missing');
assert(pos.min[0]<-.6&&pos.max[0]>.6&&pos.max[1]>1.8);assert.equal(weights.componentType,5126);
const view=g.bufferViews[weights.bufferView],start=(view.byteOffset||0)+(weights.byteOffset||0),stride=view.byteStride||16;
for(let n=0;n<weights.count;n++){let sum=0;for(let k=0;k<4;k++){const w=bin.readFloatLE(start+n*stride+k*4);assert(w>=0&&w<=1.000001);sum+=w;}assert(Math.abs(sum-1)<.00001);}
for(const name of ['DEF-spine.001','DEF-spine.002','DEF-spine.003','DEF-neck','DEF-shoulder.L','DEF-shoulder.R'])assert(pack.joints.includes(name));
const vendor=JSON.parse(read('assets/3d/sources.json')).three;for(const name of vendor.files)assert.equal(sha(read('vendor/three/'+name)),vendor.sha256[name]);
console.log('PASS pinned character/motion/vendor hashes, full mirrored skin, 53 matching joints, normalized weights and 8 continuous authored clips');
for(const dt of [1/120,1/60,1/30,.25]){const a=turn(Math.PI-.03,-Math.PI+.03,dt);assert(a>Math.PI-.03&&a<=Math.PI+.03);assert(Math.abs(turn(0,Math.PI,dt))<=12*dt+1e-12);}
let a=0,b=0;for(let i=0;i<120;i++)a=turn(a,1.4,1/120);for(let i=0;i<30;i++)b=turn(b,1.4,1/30);assert(Math.abs(a-b)<.003);assert.equal(turn(1,2,0),1);
let x=0,y=0;for(let i=0;i<120;i++)x=damp(x,1,14,1/120);for(let i=0;i<30;i++)y=damp(y,1,14,1/30);assert(Math.abs(x-y)<1e-12);
console.log('PASS bounded shortest-arc turns, frozen pause and frame-rate independent blends');

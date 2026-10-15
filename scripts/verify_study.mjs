import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),source=JSON.parse(read('assets/characters/warden-sources.json')),file=read('assets/characters/warden.glb'),pack=JSON.parse(read('assets/animations/fullplate-motion.json'));
assert.equal(source.license,'CC0-1.0');assert.equal(sha(file),source.generatedSha256);assert.equal(sha(read(source.base)),source.baseSha256);
assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);
const len=file.readUInt32LE(12),g=JSON.parse(file.subarray(20,20+len).toString()),bin=file.subarray(28+len);
assert.equal(g.skins.length,1);assert.equal(g.skins[0].joints.length,53);assert.deepEqual(new Set(g.skins[0].joints.map(i=>g.nodes[i].name)),new Set(pack.joints));
assert(g.nodes.some(n=>n.mesh===0&&n.skin===0),'Mesh must actually reference its skin');
assert.equal(g.materials.length,10);assert(g.materials.every(m=>m.pbrMetallicRoughness&&!m.extensions?.KHR_materials_unlit));
assert(!g.images?.length,'No old illustration or baked studio lighting in the trial skin');
let vertices=0;
for(const p of g.meshes[0].primitives){
 assert(p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined);const a=g.accessors[p.attributes.WEIGHTS_0],j=g.accessors[p.attributes.JOINTS_0];assert.equal(a.componentType,5126);assert([5121,5123].includes(j.componentType));
 const view=g.bufferViews[a.bufferView],start=(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||16;
 const jv=g.bufferViews[j.bufferView],js=(jv.byteOffset||0)+(j.byteOffset||0),component=j.componentType===5121?1:2,jstride=jv.byteStride||component*4;
 for(let i=0;i<a.count;i++){let sum=0;for(let k=0;k<4;k++){const w=bin.readFloatLE(start+i*stride+k*4),idx=component===1?bin.readUInt8(js+i*jstride+k):bin.readUInt16LE(js+i*jstride+k*2);assert(w>=0&&w<=1.00001);assert(idx<53);sum+=w;}assert(Math.abs(sum-1)<.00001);}
 vertices+=a.count;
}
assert(vertices>10000&&vertices<50000);
console.log('PASS original Warden geometry, immutable source, complete referenced 53-bone skin, normalized weights, 10 physical materials and no baked character light');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {turn,damp} from '../arena-motion.mjs';
const data=readFileSync(new URL('../assets/animations/knight-motion.json',import.meta.url)),pack=JSON.parse(data),source=JSON.parse(readFileSync(new URL('../assets/animations/sources.json',import.meta.url)));
assert.equal(createHash('sha256').update(data).digest('hex'),source.generatedSha256);assert.equal(source.license,'CC0-1.0');assert.equal(source.author,'Quaternius');
assert.equal(pack.schema,1);assert.equal(pack.joints.length,15);assert.equal(new Set(pack.joints).size,15);
for(const name of ['idle','walk','run','attack','roll','hurt','dead']){
 const c=pack.clips[name];assert(c.duration>0&&c.frames.length>15);assert(c.source);
 for(const f of c.frames){assert.equal(f.length,63);assert(f.every(Number.isFinite));for(let i=3;i<f.length;i+=4)assert(Math.abs(Math.hypot(...f.slice(i,i+4))-1)<.000003);}
 if(['idle','run','walk'].includes(name)){
  const a=c.frames[0],b=c.frames.at(-1);for(let i=3;i<a.length;i+=4){const dot=a.slice(i,i+4).reduce((s,v,k)=>s+v*b[i+k],0);assert(Math.abs(dot)>.97,`${name}: discontinuous joint loop`);}
 }
}
console.log('PASS pinned CC0 motion provenance, runtime SHA256, finite unit quaternions and looping poses');
for(const dt of [1/120,1/60,1/30,.25]){const a=turn(Math.PI-.03,-Math.PI+.03,dt);assert(a>Math.PI-.03&&a<=Math.PI+.03);assert(Math.abs(turn(0,Math.PI,dt))<=12*dt+1e-12);}
let a=0,b=0;for(let i=0;i<120;i++)a=turn(a,1.4,1/120);for(let i=0;i<30;i++)b=turn(b,1.4,1/30);assert(Math.abs(a-b)<.003);assert.equal(turn(1,2,0),1);
let x=0,y=0;for(let i=0;i<120;i++)x=damp(x,1,14,1/120);for(let i=0;i<30;i++)y=damp(y,1,14,1/30);assert(Math.abs(x-y)<1e-12);
console.log('PASS bounded shortest-arc turns, frozen pause and frame-rate independent blends');

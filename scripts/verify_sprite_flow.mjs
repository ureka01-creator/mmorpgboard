import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {motionSegment} from '../arena-sprite-motion.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const m=JSON.parse(read('assets/sprites/motion/flow.json')),compressed=read('assets/sprites/motion/flow.bin.gz'),raw=gunzipSync(compressed),[w,h]=m.grid;
assert.equal(m.schema,2);assert.equal(hash(compressed),m.flowSha256);assert.equal(raw.length,m.pairs.length*w*h*8);
for(const [file,sha]of Object.entries(m.sources))assert.equal(hash(read(file)),sha);
const keys=new Set(m.frames.map(f=>f.key)),pairs=new Set(m.pairs.map(p=>m.frames[p.a].key+'>'+m.frames[p.b].key));
for(const f of m.frames){assert(f.transform.length===4&&f.transform.every(Number.isFinite));assert.equal(f.contour.length,f.rect[3]);if(f.sword){assert(Number.isFinite(f.sword.back)&&f.sword.back>=0&&f.sword.back<=1,'Unbounded weapon backing '+f.key);assert.equal(f.bodyFillRows?.length,f.rect[3]);assert(f.bodyFillRows.every(([lo,hi,x,y])=>lo>=0&&hi>=lo&&hi<=f.rect[2]&&x>=0&&x<f.rect[2]&&y>=0&&y<f.rect[3]));assert.equal(f.bladeRows?.length,f.rect[3]);assert(f.bladeRows.every(([lo,hi])=>lo>=0&&hi>=lo&&hi<=f.rect[2]));assert(f.sword.points.every(Number.isFinite));assert(f.sword.width>.015&&f.sword.width<.3);}}
const front=m.frames.find(f=>f.key==='0:attack:0').sword.points,rear=m.frames.find(f=>f.key==='4:attack:0').sword.points;
assert(front[1]>front[3],'Front guard blade must point down from the hilt');assert(rear[1]<rear[3],'Rear guard blade must point up from the hilt');
// This foreshortened blade is darker than the pauldron above it. Its hilt
// belongs at the waist and its tip points down-left, never into the shoulder.
const eastGuard=m.frames.find(f=>f.key==='2:attack:1').sword.points;
assert(eastGuard[1]<.9&&eastGuard[3]<eastGuard[1]&&eastGuard[2]<eastGuard[0],'East preparation tracked armor instead of the blade');
assert(m.frames.find(f=>f.key==='2:attack:2').sword.back>.2,'Exposed shaft left behind the hand');
const rearContact=m.frames.find(f=>f.key==='4:attack:4').sword.points;
assert(rearContact[0]>.2&&rearContact[1]>1.2&&rearContact[3]>rearContact[1],'Rear contact tracked the shield instead of the blade');
let worstHand=0,worstHead=0;
function flowAt(pair,point,component){
 const uv=point.map((x,i)=>(x-m.min[i])/m.size[i]),x=Math.max(0,Math.min(w-1,uv[0]*w-.5)),y=Math.max(0,Math.min(h-1,(1-uv[1])*h-.5)),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const get=(dx,dy,c)=>raw.readInt16LE((((pair*h+Math.min(h-1,iy+dy))*w+Math.min(w-1,ix+dx))*4+c)*2)/32767;
 return [0,1].map(c=>((get(0,0,c+component)*(1-fx)+get(1,0,c+component)*fx)*(1-fy)+(get(0,1,c+component)*(1-fx)+get(1,1,c+component)*fx)*fy)*m.size[c]);
}
for(let i=0;i<m.pairs.length;i++){
 const p=m.pairs[i],a=m.frames[p.a],b=m.frames[p.b];
 for(const [source,target,c]of [[a,b,0],[b,a,2]]){const delta=flowAt(i,source.headWorld,c),error=Math.hypot(...delta.map((v,j)=>source.headWorld[j]+v-target.headWorld[j]));worstHead=Math.max(worstHead,error);assert(error<.04,'Head drift '+source.key+' '+error);}
 if(a.sword&&b.sword)for(const [source,target,c]of [[a,b,0],[b,a,2]]){
  const point=source.sword.points.slice(0,2),delta=flowAt(i,point,c),error=Math.hypot(...delta.map((v,j)=>point[j]+v-target.sword.points[j]));worstHand=Math.max(worstHand,error);
  assert(error<.045,'Weapon and hand separate: '+source.key+'>'+target.key+' '+error);
 }
}
for(let d=0;d<8;d++){
 for(const mode of ['walk','attack','windup'])for(const max of [40,50])for(let i=0;i<181;i++){
  const s=motionSegment({mode,max,elapsed:i/180*.72},i/180,d);assert(s.t>=0&&s.t<=1);assert(keys.has(s.a)&&keys.has(s.b));if(s.a!==s.b)assert(pairs.has(s.a+'>'+s.b));
 }
 for(const [max,contact]of [[40,.26],[50,.18]]){
  const strike=motionSegment({mode:'attack',max,elapsed:contact},0,d);assert.equal(strike.a,`${d}:attack:4`);assert.equal(strike.t,0);
 }
 assert.equal(motionSegment({mode:'windup',elapsed:.72,max:50},0,d).a,motionSegment({mode:'attack',elapsed:0,max:50},0,d).a);
 const end=motionSegment({mode:'attack',elapsed:.66,max:40},0,d);assert.equal(end.a,`${d}:attack:6`);
}
console.log('PASS source hashes, compressed field checksum/length, all 8-direction timelines, real damage contacts, enemy continuity and measured hand attachment', {pairs:m.pairs.length,worstHandError:worstHand,worstHeadError:worstHead});

// Rest starts without a velocity kick; recovery reaches guard without a hard stop.
for(const [max,mode,end]of [[40,'attack',.62],[50,'attack',.58],[50,'windup',.72]]){
 const epsilon=1e-5;
 if(mode==='windup'||max===40)assert(motionSegment({mode,max,elapsed:epsilon},0,0).t<1e-6);
 if(mode==='attack')assert(1-motionSegment({mode,max,elapsed:end-epsilon},0,0).t<1e-6);
 for(let i=0;i<1000;i++){const s=motionSegment({mode,max,elapsed:end*i/1000},0,0);assert(s.t>=0&&s.t<=1);}
}
console.log('PASS eased guard start/recovery, unchanged exact contact and bounded interpolation');

for(let d=0;d<8;d++){
 for(let i=0;i<12;i++)assert(pairs.has(`${d}:idle:0>${d}:run:${i}`),'Missing rest transition');
 for(const [mode,max,delay]of [['attack',40,.045],['windup',50,.06]]){
  const guard=motionSegment({mode,max,elapsed:delay,entryDelay:delay},0,d);assert.equal(guard.a,`${d}:attack:0`);assert.equal(guard.t,0);
  for(let i=0;i<181;i++){const p=motionSegment({mode,max,elapsed:i/180*.72,entryDelay:delay},0,d);assert(keys.has(p.a)&&keys.has(p.b)&&p.t>=0&&p.t<=1);}
 }
 assert.equal(motionSegment({mode:'attack',max:40,elapsed:.26,entryDelay:.045},0,d).a,`${d}:attack:4`);
}
console.log('PASS all 96 rest/gait bridges and movement-to-attack contact timing');

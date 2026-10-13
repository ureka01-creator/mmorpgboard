import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {facing,spritePose,DIRECTIONS} from '../arena-sprite-motion.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),pack=JSON.parse(read('assets/sprites/warrior.json'));
assert.deepEqual(pack.directions,DIRECTIONS);assert.equal(pack.schema,1);assert.equal(Object.keys(pack.atlases).length,10);
for(const [name,a] of Object.entries(pack.atlases)){
 assert.equal(createHash('sha256').update(read('docs/pose-guides/'+name+'.png')).digest('hex'),a.guideSha256);
 const png=read(a.file);assert.equal(createHash('sha256').update(png).digest('hex'),a.sha256);assert.equal(png.readUInt32BE(16),a.width);assert.equal(png.readUInt32BE(20),a.height);assert.equal(png[25],6,'RGBA PNG required');
}
for(const [clip,count] of Object.entries({idle:4,run:8,attack:4,roll:4})){
 assert.equal(pack.frames[clip].length,8);
 for(const row of pack.frames[clip]){
  assert.equal(row.length,count);assert.equal(new Set(row.map(f=>f.atlas+f.rect.join(','))).size,count);
  for(const f of row){const a=pack.atlases[f.atlas],[x,y,w,h]=f.rect;assert(w>20&&h>20&&x>=0&&y>=0&&x+w<=a.width&&y+h<=a.height);assert(f.pivot.every(v=>v>=0&&v<=1));assert(f.worldHeight>1&&f.worldHeight<4);}
 }
}
for(let d=0;d<8;d++){assert.equal(facing(d*Math.PI/4,.0),d);assert.equal(facing(d*Math.PI/4+4*Math.PI,0),d);assert.equal(facing(d*Math.PI/4+Math.PI/8+.02,0,d),d);}
assert.equal(facing(Math.PI/8+.10,0,0),1);
for(let frame=0;frame<8;frame++)assert.deepEqual(spritePose({mode:'walk'},frame/8,0),{clip:'run',frame});
assert.equal(spritePose({mode:'walk'},1,0).frame,0);
for(const [t,f] of [[0,0],[.17,1],[.26,2],[.47,3]])assert.deepEqual(spritePose({mode:'attack',elapsed:t,max:40},0,0),{clip:'attack',frame:f});
assert.equal(spritePose({mode:'attack',elapsed:.18,max:50},0,0).frame,2);
for(let f=0;f<4;f++)assert.deepEqual(spritePose({mode:'dodge',elapsed:f*.085+.001},0,0),{clip:'roll',frame:f});
assert.equal(spritePose({mode:'dead'},0,0).clip,'roll');
console.log('PASS ten immutable RGBA atlases, 160 frames, eight facings and hysteresis, distance phases, attack contact and dodge timing');

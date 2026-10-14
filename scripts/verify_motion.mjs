import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {facing,spritePose,DIRECTIONS} from '../arena-sprite-motion.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=p=>createHash('sha256').update(read(p)).digest('hex'),pack=JSON.parse(read('assets/sprites/warrior.json'));
assert.deepEqual(pack.directions,DIRECTIONS);assert.equal(pack.schema,2);assert.equal(pack.refined,true);assert.equal(Object.keys(pack.atlases).length,10);
assert.equal(hash('docs/pose-guides-v2.8/anchors.json'),pack.calibration.guideMarkersSha256);
for(const [name,a] of Object.entries(pack.atlases)){
 assert.equal(hash((name.startsWith('direction-')?'docs/pose-guides-v2.8/':'docs/pose-guides/')+name+'.png'),a.guideSha256);
 const png=read(a.file);assert.equal(hash(a.file),a.sha256);assert.equal(png.readUInt32BE(16),a.width);assert.equal(png.readUInt32BE(20),a.height);assert.equal(png[25],6,'RGBA PNG required');
}
for(const [clip,count] of Object.entries({idle:1,run:12,attack:7,roll:4})){
 assert.equal(pack.frames[clip].length,8);
 for(const row of pack.frames[clip]){
  assert.equal(row.length,count);assert.equal(new Set(row.map(f=>f.atlas+f.rect.join(','))).size,clip==='attack'?6:count);
  for(const f of row){const a=pack.atlases[f.atlas],[x,y,w,h]=f.rect;assert(w>20&&h>20&&x>=0&&y>=0&&x+w<=a.width&&y+h<=a.height);assert(f.pivot.every(Number.isFinite));assert(f.worldHeight>1&&f.worldHeight<5);
   if(clip!=='roll'){assert.equal(f.headMethod,'brown-hair-component');assert(f.headPixels>=120);assert.equal(f.contour.length,h);assert(f.contour.every(([lo,hi])=>lo>=0&&hi>=lo&&hi<=w));}
  }
 }
}
for(let d=0;d<8;d++){
 assert.deepEqual(pack.frames.attack[d][0],pack.frames.idle[d][0]);assert.deepEqual(pack.frames.attack[d][6],pack.frames.idle[d][0]);
 for(const row of [pack.frames.run[d],pack.frames.attack[d].slice(1,6)]){const scales=row.map(f=>f.worldHeight/f.rect[3]);assert(Math.max(...scales)/Math.min(...scales)<1.00001,'Body resizes within animation');}
 assert.equal(facing(d*Math.PI/4,0),d);assert.equal(facing(d*Math.PI/4+4*Math.PI,0),d);assert.equal(facing(d*Math.PI/4+Math.PI/8+.02,0,d),d);
 for(let f=0;f<12;f++)assert.deepEqual(spritePose({mode:'walk'},f/12,0,d,true),{clip:'run',frame:f});
 for(const [t,f] of [[0,0],[.09,1],[.18,2],[.23,3],[.26,4],[.40,5],[.56,6]])assert.deepEqual(spritePose({mode:'attack',elapsed:t,max:40},0,0,d,true),{clip:'attack',frame:f});
 assert.deepEqual(spritePose({mode:'attack',elapsed:.62,max:40},0,0,d,true),{clip:'idle',frame:0});
 assert.equal(spritePose({mode:'windup',elapsed:.70,max:50},0,0,d,true).frame,2);
 assert.equal(spritePose({mode:'attack',elapsed:0,max:50},0,0,d,true).frame,2);
 assert.equal(spritePose({mode:'attack',elapsed:.08,max:50},0,0,d,true).frame,3);
 assert.equal(spritePose({mode:'attack',elapsed:.18,max:50},0,0,d,true).frame,4);
}
assert.equal(facing(Math.PI/8+.10,0,0),1);
for(let f=0;f<4;f++)assert.deepEqual(spritePose({mode:'dodge',elapsed:f*.085+.001},0,0,0,true),{clip:'roll',frame:f});
console.log('PASS 10 immutable atlases, 8 directions, 96 gait poses, 56 attack states, 32 dodge poses, contour crops, hair landmarks, stable per-bank scales, guard continuity and damage-aligned timing');

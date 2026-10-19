import assert from 'node:assert/strict';
import * as R from '../arena-engine.mjs';
import {Presentation} from '../arena-presentation.mjs';
import {settleLocomotion} from '../arena-sprite-motion.mjs';
for(const fps of [30,60,90,120,144,240]){
 const state=R.create();state.enemy.hp=0;const view=new Presentation(state),identity=view.sample(1).hero;
 let accumulator=0,previousX,duplicates=0,samples=0;
 for(let frame=0;frame<fps;frame++){
  accumulator+=1/fps;
  while(accumulator>=1/60-1e-10){R.step(state,{x:1},1/60);view.capture(state);accumulator=Math.max(0,accumulator-1/60);}
  const body=view.sample(accumulator*60).hero;assert.equal(body,identity);
  assert(body.x>=view.previous.hero.x-1e-10&&body.x<=state.hero.x+1e-10);
  assert(body.gaitTravel<=state.hero.travel+1e-10);
  if(frame>4){if(Math.abs(body.x-previousX)<1e-9)duplicates++;samples++;}previousX=body.x;
 }
 assert.equal(duplicates,0,'Repeated moving display samples at '+fps+' Hz');assert(Math.abs(state.hero.travel-3.3)<1e-8);
 console.log('PASS bounded continuous movement',fps+' Hz',samples+' moving samples');
}
{
 const state=R.create();Object.assign(state.hero,{x:0,z:0});Object.assign(state.enemy,{x:0,z:1});const view=new Presentation(state);
 while(!state.hero.hits){R.step(state,{attack:state.hero.swings===0},1/60);view.capture(state);}
 assert.equal(view.sample(0).hero.elapsed,.26,'Hit must show contact even before interpolated tick');
 assert.equal(state.hero.hits,1);assert.equal(state.enemy.hp,40);
 const start=view.current.hero.gaitTravel;R.step(state,{dodge:true,x:1},1/60);view.capture(state);
 while(state.hero.mode==='dodge'){R.step(state,{x:1},1/60);view.capture(state);}
 assert.equal(view.current.hero.gaitTravel,start,'Evasion must not contaminate normal walk distance');
 const frozen=JSON.stringify(view.sample(.5));assert.equal(JSON.stringify(view.sample(.5)),frozen);
 const reset=new Presentation(R.create());assert.equal(reset.sample(1).hero.gaitTravel,0);
 console.log('PASS contact, fixed damage, dodge travel, pause and fresh presentation');
}
for(const fps of [30,60,120,240]){
 const blend={weight:0,velocity:0};for(let i=0;i<fps;i++){
  const target=i/fps<.25||i/fps>=.5&&i/fps<.75?1:0;
  settleLocomotion(blend,target,1/fps);assert(blend.weight>=0&&blend.weight<=1&&Number.isFinite(blend.velocity));
 }
 assert.equal(blend.weight,0);const before={...blend};settleLocomotion(blend,1,0);assert.deepEqual(blend,before);
}
console.log('PASS bounded, reversible locomotion settling at all display rates');

import assert from 'node:assert/strict';
import * as R from '../arena-engine.mjs';
let count=0;function test(name,fn){fn();console.log('PASS',name);count++;}
test('path stays in bounds and never enters obstacles or enemy cell',()=>{const s=R.create(),p=R.path(s,{x:9,z:3});assert(p?.length);let last=s.hero;for(const c of p){assert(!R.blocked(s,c.x,c.z));assert(R.distance(last,c)<=Math.SQRT2+.001);last=c;}});
test('diagonal routes cannot cut across column corners',()=>{const s=R.create();s.hero={...s.hero,x:3,z:3};const p=R.path(s,{x:5,z:4});assert(p);let last=s.hero;for(const next of p){if(last.x!==next.x&&last.z!==next.z){assert(!R.blocked(s,last.x,next.z));assert(!R.blocked(s,next.x,last.z));}last=next;}});
test('blocked and outside moves leave state untouched',()=>{const s=R.create(),before=structuredClone(s);for(const target of [{x:4,z:3},{x:-1,z:3},{x:9,z:2},{x:3.5,z:3}]){assert.throws(()=>R.move(s,target));assert.deepEqual(s,before);}});
test('cannot damage enemy outside melee range',()=>{const s=R.create(),before=structuredClone(s);assert.throws(()=>R.attack(s));assert.deepEqual(s,before);assert.throws(()=>R.counter(s));assert.deepEqual(s,before);});
test('approach produces a legal adjacent endpoint without occupying the enemy',()=>{const s=R.create(),p=R.approach(s);assert(p?.length);R.move(s,p.at(-1));assert(R.distance(s.hero,s.enemy)<=1.5);assert.notDeepEqual({x:s.hero.x,z:s.hero.z},{x:s.enemy.x,z:s.enemy.z});assert.deepEqual(R.approach(s),[]);});
test('four attacks defeat guardian; only living guardian can counter',()=>{const s=R.create();R.move(s,R.approach(s).at(-1));for(let i=0;i<4;i++){assert.equal(R.attack(s),6);if(s.enemy.hp>0)assert.equal(R.counter(s),4);}assert.equal(s.enemy.hp,0);assert.equal(s.hero.hp,18);assert.equal(s.attacks,4);assert.throws(()=>R.attack(s));assert.throws(()=>R.counter(s));});
test('navigation cells and 3D floor coordinates round-trip exactly',()=>{for(let x=0;x<R.WIDTH;x++)for(let z=0;z<R.HEIGHT;z++)assert.deepEqual(R.cell(R.world({x,z})),{x,z});});
console.log(`${count} 3D movement/combat rule tests passed`);

import assert from 'node:assert/strict';
import {turn,footCycle,legIK,TAU} from '../arena-motion.mjs';
for(let p=0;p<1;p+=.001){const f=footCycle(p);assert(f.lift>=0&&f.lift<=.141);if(f.stance)assert.equal(f.lift,0);}
for(const seam of [0,.5,1]){const a=footCycle(seam-1e-6),b=footCycle(seam+1e-6);assert(Math.abs(a.z-b.z)<.00001&&Math.abs(a.lift-b.lift)<.00001);}
console.log('PASS foot planting, raised swing and continuous contact boundaries');
for(const hz of [-.4,-.2,0,.2,.4])for(const y of [-.70,-.65,-.55]){
 const q=legIK(y,hz);const actualY=-.43*Math.cos(q.hip)-.40*Math.cos(q.hip+q.knee),actualZ=-.43*Math.sin(q.hip)-.40*Math.sin(q.hip+q.knee);
 assert(Math.hypot(actualY-y,actualZ-hz)<1e-9);assert(q.knee>=0);assert(Math.abs(q.hip+q.knee+q.ankle)<1e-12);
}
console.log('PASS two-bone knee flexion reaches foot targets and keeps soles level');
for(const dt of [1/120,1/60,1/30,.25]){const a=turn(Math.PI-.03,-Math.PI+.03,dt);assert(a>Math.PI-.03&&a<=Math.PI+.03);assert(Math.abs(turn(0,Math.PI,dt))<=12*dt+1e-12);}
let a=0,b=0;for(let i=0;i<120;i++)a=turn(a,1.4,1/120);for(let i=0;i<30;i++)b=turn(b,1.4,1/30);assert(Math.abs(a-b)<.003);
assert.equal(turn(1,2,0),1);assert(Math.abs(footCycle(.2).z-footCycle(1.2).z)<1e-12);
console.log('PASS shortest facing arc, bounded turns, pause and frame-rate stability');

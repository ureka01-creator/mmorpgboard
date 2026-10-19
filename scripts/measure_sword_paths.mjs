/** Actual source blade angles along old/new display paths; this is not a Nox score. */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {motionSegment as current} from '../arena-sprite-motion.mjs';
const revision='4128535',source=execFileSync('git',['show',revision+':arena-sprite-motion.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
const {motionSegment:previous}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const manifest=JSON.parse(readFileSync(new URL('../assets/sprites/motion/flow.json',import.meta.url)));
const angles=new Map(manifest.frames.filter(f=>f.sword).map(f=>[f.key,Math.atan2(f.sword.points[3]-f.sword.points[1],f.sword.points[2]-f.sword.points[0])]));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function travel(segment,d,start,end){
 let old,total=0;
 for(let tick=Math.round(start*1000);tick<=Math.round(end*1000);tick++){
  const p=segment({mode:'attack',max:40,elapsed:tick/1000},0,d),a=angles.get(p.a),angle=a+wrap(angles.get(p.b)-a)*p.t;
  if(old!==undefined)total+=Math.abs(wrap(angle-old));old=angle;
 }
 return Math.round(total*180/Math.PI*100)/100;
}
const directions=Array.from({length:8},(_,direction)=>({direction,preparation:{before:travel(previous,direction,0,.19),after:travel(current,direction,0,.19)},recovery:{before:travel(previous,direction,.285,.66),after:travel(current,direction,.285,.66)}}));
console.log(JSON.stringify({baseline:revision,unit:'degrees of total projected blade direction travel',isNoxSimilarityScore:false,directions},null,2));

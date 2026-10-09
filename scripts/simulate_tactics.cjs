/* Deterministic starter-combat comparison. Policies are heuristics, not human players. */
const E=require('../game-engine.js');
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function score(s,policy){const p=E.tacticalPreview(s),h=s.heroes[0];return p.damage*3+(policy==='survival'?p.after[0]*2:0)-(p.costs[0]||0)*.8+(p.restores[0]||0)*.8;}
function allocate(s,policy){
 if(policy==='basic')return;
 for(let step=0;step<4;step++){
  const before=score(s,policy),original=s.battle.assignments.map(a=>({...a}));let best=null,value=before;
  for(const t of E.techniques[s.heroes[0].classId])for(let i=0;i<s.battle.dice.length;i++){
   if(original.some(a=>a.id===t.id)||E.skillReason(s,0,t.id,i,0))continue;
   E.apply(s,'assign',{owner:0,id:t.id,index:i,target:0});const next=score(s,policy);
   if(next>value+.01){value=next;best={owner:0,id:t.id,index:i,target:0};}s.battle.assignments=original.map(a=>({...a}));
  }
  if(!best)break;E.apply(s,'assign',best);
 }
}
for(let ci=0;ci<4;ci++)for(const policy of ['basic','damage','survival']){
 let wins=0,turns=0,hp=0,uses=0;const total=200;
 for(let n=1;n<=total;n++){
  const random=rng(n*7919+ci),s=E.create([ci],random),h=s.heroes[0];h.pos='A2';E.apply(s,'engage');let rounds=0;
  while(s.battle){E.apply(s,'roll',{},random);allocate(s,policy);uses+=s.battle.assignments.length;E.apply(s,'resolve');rounds++;}
  if(s.enemies[0].hp===0){wins++;turns+=rounds;hp+=h.hp;}
 }
 console.log(JSON.stringify({class:E.classes[ci].name,policy,encounter:'Lv.1 / no gear / wolf HP8 / assault / no rerolls',trials:total,wins,winRate:Math.round(wins/total*100),winningRounds:+(turns/Math.max(1,wins)).toFixed(2),winningHP:+(hp/Math.max(1,wins)).toFixed(2),techniques:uses}));
}

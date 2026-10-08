/* Seeded combat diagnostics, not a substitute for human playtesting. */
const E=require('../game-engine.js');
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
for(let id=0;id<4;id++){
 let wins=0,rounds=0;const total=300;
 for(let n=1;n<=total;n++){
  const rng=seeded(n*7919+id),s=E.create([id],rng),h=E.hero(s);h.xp=12;h.points=3;h.hp=E.stats(h).hp;h.bag=[id===0||id===2?10:11,8,9];for(const g of h.bag)E.apply(s,'equip',{id:g});for(const t of [0,2,4])E.apply(s,'talent',{index:t});s.seals=2;h.pos='D1';E.apply(s,'engage');
  let resolved=0;
  while(s.battle){const intent=E.intent(s),st=E.stats(h);let stance=h.energy&&st.blue>st.red?'focus':'assault';if(h.energy&&h.hp<st.hp*.4)stance='recover';E.apply(s,'stance',{hero:0,stance});E.apply(s,'roll',{},rng);const failed=s.battle.dice.findIndex(d=>d.value<(d.color===1?3:4));if(failed>=0&&h.energy>0)E.apply(s,'reroll',{index:failed},rng);E.apply(s,'resolve');resolved++;}
  if(s.outcome==='win'){wins++;rounds+=resolved;}
 }
 console.log(`${E.classes[id].name}: Lv.4 공격 특성 + 영웅 무기 / ${total}회 용 전투 / 승리 ${wins} (${Math.round(wins/total*100)}%) / 승리 시 평균 교전 ${(rounds/Math.max(1,wins)).toFixed(1)}`);
}

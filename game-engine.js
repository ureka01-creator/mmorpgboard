/* Shared rules engine: browser and Node verification use the same implementation. */
(function(root){
'use strict';
const classes=[
{name:'기사',hp:10,atk:2,dmg:2,skill:'방어 태세',desc:'다음 적 공격 1회 무효화'},
{name:'마법사',hp:7,atk:3,dmg:2,skill:'비전 화살',desc:'같은 칸 적에게 확정 피해 2'},
{name:'궁수',hp:8,atk:2,dmg:2,skill:'조준 사격',desc:'인접 칸까지 일반 공격'},
{name:'사제',hp:9,atk:1,dmg:1,skill:'치유',desc:'인접 영웅 체력 +3'}];
const items=[
{name:'붉은 물약',desc:'자신 체력 +4'},
{name:'번개 두루마리',desc:'같은 칸 적에게 확정 피해 3'},
{name:'바람 장화',desc:'선택 칸으로 최대 2칸 이동'},
{name:'수호 방패',desc:'적 단계에 자동 사용: 공격 1회 방어'},
{name:'연마석',desc:'같은 칸 적 공격, 명중 시 피해 +2'},
{name:'귀환석',desc:'마을로 귀환'}];
const dist=(a,b)=>Math.abs(a.charCodeAt(0)-b.charCodeAt(0))+Math.abs(Number(a[1])-Number(b[1]));
const valid=pos=>/^[A-E][1-5]$/.test(pos);
function log(s,text){s.log.unshift(text);s.log=s.log.slice(0,40);}
function create(ids,random=Math.random){
 if(!Array.isArray(ids)||ids.length<1||ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>!Number.isInteger(id)||!classes[id]))throw Error('서로 다른 직업 1~4개를 선택하세요.');
 const deck=[0,1,2,3,4,5];for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 const s={version:1,heroes:ids.map(id=>({classId:id,hp:classes[id].hp,pos:'C5',xp:0,items:[],guard:false,used:false})),enemies:[['가시늑대','A2'],['광산 트롤','E3'],['망령 기사','B1']].map(([name,pos])=>({name,pos,hp:3+ids.length,max:3+ids.length,def:3,boss:false})),deck,pending:[],round:1,seals:0,turn:0,order:ids.map((_,i)=>i),active:0,actions:ids.length===1?4:3,outcome:null,log:[]};log(s,'모험 시작! C5 마을에서 세 봉인을 찾아 출발하세요.');return s;
}
function hero(s){return s.heroes[s.active];}
function ensure(s){if(s.outcome)throw Error('게임이 끝났습니다. 새 모험을 시작하세요.');if(s.pending.length)throw Error('먼저 전리품을 배분하세요.');if(s.actions<=0||hero(s).hp<=0)throw Error('차례를 마쳐 다음 영웅에게 넘기세요.');}
function target(s,pos,range=0){const e=s.enemies.find(e=>e.pos===pos&&e.hp>0);if(!e||dist(hero(s).pos,pos)>range)throw Error('공격 가능한 적을 선택하세요.');return e;}
function damage(s,e,amount){e.hp=Math.max(0,e.hp-amount);log(s,`${e.name}에게 피해 ${amount} · 남은 체력 ${e.hp}`);if(e.hp)return;if(e.boss){s.outcome='win';log(s,'승리! 잿빛 용을 처치하고 엘더폴을 구했습니다.');}else{s.seals++;s.heroes.forEach(h=>h.xp++);s.pending=s.deck.splice(0,2);log(s,`봉인 ${s.seals}/3 · 전원 경험치 +1 · 전리품 2장을 배분하세요.`);}}
function attack(s,pos,random,bonus=0,range=0){const e=target(s,pos,range),h=hero(s),c=classes[h.classId],roll=1+Math.floor(random()*6);log(s,`${c.name} 주사위 ${roll} + 공격 ${c.atk+(h.xp>=1?1:0)}`);if(roll===6||roll+c.atk+(h.xp>=1?1:0)>=e.def)damage(s,e,c.dmg+(h.xp>=3?1:0)+(roll===6?1:0)+bonus);else log(s,'공격이 빗나갔습니다.');}
function apply(s,type,arg={},random=Math.random){
 if(type==='award'){if(s.outcome||!s.pending.length||!Number.isInteger(arg.hero)||!s.heroes[arg.hero])throw Error('배분할 전리품 또는 영웅이 없습니다.');const item=s.pending.shift();s.heroes[arg.hero].items.push(item);log(s,`${classes[s.heroes[arg.hero].classId].name}: ${items[item].name} 획득`);return;}
 if(type==='end'){end(s);return;}
 ensure(s);const h=hero(s),c=classes[h.classId];
 if(type==='move'){if(!valid(arg.pos)||dist(h.pos,arg.pos)!==1)throw Error('상하좌우 인접 칸을 터치하세요.');h.pos=arg.pos;log(s,`${c.name} → ${arg.pos}`);}
 else if(type==='attack'){attack(s,arg.pos,random);}
 else if(type==='rest'){if(s.enemies.some(e=>e.pos===h.pos&&e.hp>0))throw Error('적이 있는 칸에서는 쉴 수 없습니다.');const amount=h.pos==='C5'?3:1;h.hp=Math.min(c.hp,h.hp+amount);log(s,`${c.name} 휴식 · 체력 ${h.hp}`);}
 else if(type==='skill'){
  if(h.used)throw Error('이번 차례의 능력을 이미 사용했습니다.');
  if(h.classId===0){h.guard=true;log(s,'기사 방어 태세');}
  if(h.classId===1){const e=target(s,arg.pos);damage(s,e,2);}
  if(h.classId===2){attack(s,arg.pos,random,0,1);}
  if(h.classId===3){const t=s.heroes[arg.hero];if(!t||t.hp<=0||dist(h.pos,t.pos)>1)throw Error('현재 또는 인접 칸의 살아 있는 영웅을 선택하세요.');t.hp=Math.min(classes[t.classId].hp,t.hp+3);log(s,`${classes[t.classId].name} 치유 · 체력 ${t.hp}`);}
  h.used=true;
 }
 else if(type==='summon'){if(s.seals!==3||h.pos!=='D1'||s.enemies.some(e=>e.boss))throw Error('봉인 3개를 모아 D1에서 용을 소환하세요.');const hp=6+4*s.heroes.length;s.enemies.push({name:'잿빛 용',pos:'D1',hp,max:hp,def:4,boss:true});log(s,`잿빛 용 소환 · 체력 ${hp}`);}
 else if(type==='item'){
  const idx=arg.index;if(!Number.isInteger(idx)||idx<0||idx>=h.items.length)throw Error('전리품을 선택하세요.');const item=h.items[idx];
  if(item===3)throw Error('방패는 적 공격 때 자동으로 사용됩니다.');
  if(item===0)h.hp=Math.min(c.hp,h.hp+4);
  if(item===1){const e=target(s,arg.pos);damage(s,e,3);}
  if(item===2){if(!valid(arg.pos)||dist(h.pos,arg.pos)<1||dist(h.pos,arg.pos)>2)throw Error('1~2칸 거리의 목적지를 선택하세요.');h.pos=arg.pos;}
  if(item===4)attack(s,arg.pos,random,2);
  if(item===5)h.pos='C5';
  h.items.splice(idx,1);log(s,`${items[item].name} 사용`);
 }
 else if(type==='trade'){const t=s.heroes[arg.hero];if(!t||t===h||t.hp<=0||t.pos!==h.pos||!Number.isInteger(arg.index)||arg.index<0||arg.index>=h.items.length)throw Error('같은 칸의 다른 영웅과 전달할 전리품을 선택하세요.');t.items.push(h.items.splice(arg.index,1)[0]);log(s,`${classes[t.classId].name}에게 전리품 전달`);}
 else throw Error('알 수 없는 행동');
 s.actions--;
}
function hit(s,h){if(h.guard){h.guard=false;log(s,'방어 태세로 공격 무효화');return 0;}const shield=h.items.indexOf(3);if(shield!==-1){h.items.splice(shield,1);log(s,`${classes[h.classId].name}: 수호 방패 자동 사용`);return 0;}const lost=Math.min(h.hp,2);h.hp=Math.max(0,h.hp-2);log(s,`${classes[h.classId].name} 피해 ${lost} · 체력 ${h.hp}`);return lost;}
function end(s){
 if(s.outcome)throw Error('게임이 끝났습니다.');if(s.pending.length)throw Error('먼저 전리품을 배분하세요.');
 s.lastEnemyDamage=0;
 s.turn++;
 if(s.turn===s.heroes.length){
  log(s,`라운드 ${s.round} 적 단계`);
  for(const e of s.enemies.filter(e=>e.hp>0)){
   const targets=s.heroes.filter(h=>h.hp>0&&h.pos===e.pos);
   if(e.boss)targets.forEach(h=>{s.lastEnemyDamage+=hit(s,h);});else if(targets.length)s.lastEnemyDamage+=hit(s,targets.reduce((a,b)=>a.hp>=b.hp?a:b));
  }
  if(s.heroes.every(h=>h.hp===0)){s.outcome='lose';log(s,'전원이 쓰러졌습니다. 패배.');return;}
  if(s.round===10){s.outcome='lose';log(s,'10라운드 종료. 용을 처치하지 못했습니다.');return;}
  s.round++;s.turn=0;s.order=s.heroes.map((_,i)=>(i+s.round-1)%s.heroes.length);
 }
 s.active=s.order[s.turn];const h=hero(s);h.guard=false;h.used=false;s.actions=s.heroes.length===1?4:3;
 if(h.hp===0){h.pos='C5';h.hp=4;s.actions=0;log(s,`${classes[h.classId].name} 부활 · 이번 차례는 회복에 사용합니다.`);}
 log(s,`${classes[h.classId].name}의 차례 · 행동 ${s.actions}개`);
}
const api={classes,items,dist,create,apply,hero};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Elderfall=api;
})(typeof globalThis!=='undefined'?globalThis:this);

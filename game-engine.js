/* Original cooperative campaign rules. Shared by browser and Node QA. */
(function(root){
'use strict';
const classes=[
 {name:'기사',hp:12,pool:[2,0,1],role:'전열 · 물리 공격과 방어',paths:['검투사','수호자']},
 {name:'마법사',hp:9,pool:[0,3,0],role:'후열 · 갑옷을 관통하는 마법',paths:['화염술사','비전학자']},
 {name:'궁수',hp:10,pool:[2,1,0],role:'정찰 · 치명타와 재굴림',paths:['명사수','길잡이']},
 {name:'사제',hp:10,pool:[0,2,1],role:'지원 · 파티 치유와 보호',paths:['심판자','치유사']}
];
const gear=[
 {name:'강철 장검',slot:'weapon',tier:1,cost:4,red:1,desc:'공격 주사위 +1'},
 {name:'비전 지팡이',slot:'weapon',tier:1,cost:4,blue:1,desc:'마법 주사위 +1'},
 {name:'사슬 갑옷',slot:'armor',tier:1,cost:4,armor:1,desc:'받는 피해 −1'},
 {name:'정찰 망토',slot:'armor',tier:1,cost:4,green:1,desc:'방어 주사위 +1'},
 {name:'집중의 반지',slot:'trinket',tier:1,cost:3,rerolls:1,desc:'전투 라운드 재굴림 한도 +1'},
 {name:'치유의 성물',slot:'trinket',tier:1,cost:3,heal:1,desc:'회복 태세의 파티 치유 +1'},
 {name:'왕실 대검',slot:'weapon',tier:2,cost:7,red:2,desc:'공격 주사위 +2'},
 {name:'별빛 지팡이',slot:'weapon',tier:2,cost:7,blue:2,desc:'마법 주사위 +2'},
 {name:'수호자의 판금',slot:'armor',tier:2,cost:7,armor:1,green:1,desc:'피해 −1 · 방어 주사위 +1'},
 {name:'불꽃 부적',slot:'trinket',tier:2,cost:6,crit:1,desc:'공격·마법 주사위 6마다 피해 +1'},
 {name:'용사냥꾼의 검',slot:'weapon',tier:3,cost:10,red:3,desc:'공격 주사위 +3'},
 {name:'폭풍의 지팡이',slot:'weapon',tier:3,cost:10,blue:3,desc:'마법 주사위 +3'}
];
const talentEffects=[
 [['red',1],['green',1],['crit',1],['armor',1],['red',2],['green',2]],
 [['blue',1],['rerolls',1],['crit',1],['green',1],['blue',2],['armor',1]],
 [['crit',1],['green',1],['red',1],['rerolls',1],['red',2],['armor',1]],
 [['blue',1],['heal',2],['crit',1],['green',1],['blue',2],['heal',2]]
];
const talentNames=[['무기 숙련','방패 숙련','피의 칼날','불굴','검의 폭풍','철벽'],['불씨','비전 집중','작열','마나 방벽','지옥불','차원 보호'],['급소 조준','야생의 보호','연속 사격','바람의 눈','일제 사격','생존 본능'],['성스러운 분노','치유의 손길','심판','보호의 기도','빛의 창','구원의 빛']];
const effectLabels={red:'공격 주사위',blue:'마법 주사위',green:'방어 주사위',crit:'6의 추가 피해',armor:'받는 피해 감소',rerolls:'재굴림 한도',heal:'회복 태세 치유'};
const talents=classes.map((c,ci)=>talentNames[ci].map((name,i)=>({name,tier:Math.floor(i/2)+2,path:c.paths[i%2],[talentEffects[ci][i][0]]:talentEffects[ci][i][1],desc:effectLabels[talentEffects[ci][i][0]]+' +'+talentEffects[ci][i][1]})));
const locations={
 C5:{name:'황금들 마을',kind:'town',desc:'여관 · 퀘스트 보고 · 상점'},A4:{name:'숲의 야영지',kind:'town',desc:'북쪽 모험의 보급 거점'},E5:{name:'항구 도시',kind:'town',desc:'동쪽 광산으로 향하는 교역소'},
 C4:{name:'햇살 초원',kind:'gather',desc:'약초 수집 · 입문 퀘스트'},A2:{name:'가시숲',kind:'enemy',desc:'Lv.1 · 늑대는 방어를 무너뜨립니다'},E3:{name:'철광산',kind:'enemy',desc:'Lv.2 · 트롤의 갑옷과 재생'},B1:{name:'망령 성채',kind:'enemy',desc:'Lv.3 · 마법을 막는 망령 기사'},
 C2:{name:'잊힌 제단',kind:'gather',desc:'유물 조사 · 에너지 소모'},E2:{name:'별빛 유적',kind:'gather',desc:'보급을 소비하는 탐사'},D1:{name:'잿빛 용의 둥지',kind:'boss',desc:'봉인 2개 · 레벨 3부터 레이드'},C3:{name:'바위 고개',kind:'mountain',desc:'험한 길 · 이동에 행동 2개'}
};
const quests=[
 {id:'herbs',name:'마을의 약초사',type:'gather',pos:'C4',level:1,xp:2,gold:3,choices:[0,1,2,3],desc:'햇살 초원에서 약초를 채집한 뒤 거점에 보고하세요.'},
 {id:'caravan',name:'북쪽으로 가는 상단',type:'escort',pos:'A4',level:1,xp:2,gold:4,choices:[4,5],desc:'보급 1개를 챙겨 숲의 야영지까지 상단을 호위하세요. 출발은 황금들 마을에서만 가능합니다.'},
 {id:'wolves',name:'가시숲의 포식자',type:'hunt',pos:'A2',level:1,xp:3,gold:4,choices:[0,1,2,3],desc:'가시늑대 전투에 참여하고 승리한 뒤 거점에 보고하세요.'},
 {id:'relic',name:'제단의 속삭임',type:'gather',pos:'C2',level:2,xp:3,gold:4,choices:[6,7,8,9],desc:'잊힌 제단에서 에너지 2를 사용해 유물을 조사하세요.'},
 {id:'mine',name:'철광산 탈환',type:'hunt',pos:'E3',level:2,xp:4,gold:5,choices:[6,7,8,9],desc:'광산 트롤의 재생을 돌파하세요. 마법은 갑옷을 관통합니다.'},
 {id:'stars',name:'별빛의 잔해',type:'gather',pos:'E2',level:2,xp:3,gold:4,choices:[6,7,8,9],desc:'별빛 유적에서 보급 1개를 소비해 탐사하세요.'},
 {id:'keep',name:'망령의 마지막 맹세',type:'hunt',pos:'B1',level:3,xp:5,gold:6,choices:[8,9,10,11],desc:'망령 기사를 처치하세요. 마법 장벽에는 물리 공격이 유리합니다.'}
];
const enemyDefs=[
 {id:'wolf',name:'가시늑대',pos:'A2',tier:1,hp:8,armor:0,ward:0,art:'wolf',desc:'매 2번째 라운드: 방어 주사위를 무시하는 출혈'},
 {id:'troll',name:'광산 트롤',pos:'E3',tier:2,hp:15,armor:2,ward:0,art:'troll',desc:'갑옷 2 · 매 2번째 라운드에 체력 2 재생'},
 {id:'knight',name:'망령 기사',pos:'B1',tier:3,hp:20,armor:0,ward:3,art:'knight',desc:'마법 저항 3 · 저주 공격은 에너지 1도 제거'},
 {id:'dragon',name:'잿빛 용',pos:'D1',tier:4,hp:30,armor:2,ward:1,art:'dragon',desc:'화염 숨결은 전원 공격 · 체력 절반부터 격노'}
];
const events=[
 {name:'떠돌이 상인',desc:'모든 영웅 골드 +1',kind:'gold'},
 {name:'치유의 샘',desc:'모든 영웅 에너지 +1',kind:'energy'},
 {name:'검은 안개',desc:'거점 밖의 영웅은 체력 −1',kind:'mist'},
 {name:'봄비',desc:'모든 영웅 보급 +1',kind:'supply'},
 {name:'용의 포효',desc:'다음 3라운드의 전투에서 적 공격 +1',kind:'rage'},
 {name:'길 위의 순례자',desc:'모든 영웅 체력 +2',kind:'heal'}
];
const dist=(a,b)=>Math.abs(a.charCodeAt(0)-b.charCodeAt(0))+Math.abs(Number(a[1])-Number(b[1]));
const valid=pos=>typeof pos==='string'&&/^[A-E][1-5]$/.test(pos);
const town=pos=>locations[pos]?.kind==='town';
const hero=s=>s.heroes[s.active];
const level=h=>h.xp>=12?4:h.xp>=6?3:h.xp>=2?2:1;
function stats(h){const c=classes[h.classId];const result={hp:c.hp+(level(h)-1)*2,red:c.pool[0],blue:c.pool[1],green:c.pool[2],armor:0,crit:0,heal:h.classId===3?2:0,rerolls:1};for(const item of [...Object.values(h.equipment).map(id=>gear[id]),...h.talents.map(id=>talents[h.classId][id])])if(item)for(const key of ['red','blue','green','armor','crit','heal','rerolls'])result[key]+=item[key]||0;return result;}
function log(s,text){s.log.unshift(text);s.log=s.log.slice(0,60);}
function gainXP(s,h,n){const old=level(h);h.xp+=n;const diff=level(h)-old;if(diff){h.points+=diff;if(h.hp>0)h.hp+=diff*2;log(s,`${classes[h.classId].name} 레벨 ${level(h)}! 특성 ${diff}개를 선택하세요.`);}}
function create(ids,random=Math.random){
 if(!Array.isArray(ids)||ids.length<1||ids.length>4||new Set(ids).size!==ids.length||ids.some(i=>!Number.isInteger(i)||!classes[i]))throw Error('서로 다른 직업 1~4개를 선택하세요.');
 const s={version:2,heroes:ids.map(classId=>({classId,pos:'C5',hp:classes[classId].hp,energy:4,gold:4,supply:2,potions:1,xp:0,points:0,talents:[],equipment:{weapon:null,armor:null,trinket:null},bag:[],quests:[{id:'herbs',ready:false}],completed:[],kills:[]})),enemies:enemyDefs.map(e=>({...e,hp:e.hp,max:e.hp})),round:1,turn:0,active:0,order:ids.map((_,i)=>i),actions:ids.length===1?4:3,seals:0,battle:null,outcome:null,log:[],event:null,eventDeck:[0,1,2,3,4,5],rageUntil:0,lastResult:null};
 for(let i=s.eventDeck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[s.eventDeck[i],s.eventDeck[j]]=[s.eventDeck[j],s.eventDeck[i]];}
 log(s,'캠페인 시작 · 약초 퀘스트 수락 · 20라운드 안에 잿빛 용을 처치하세요.');return s;
}
function world(s,cost=1){if(s.outcome)throw Error('캠페인이 끝났습니다.');if(s.battle)throw Error('전투를 해결하거나 후퇴하세요.');if(hero(s).hp<=0||s.actions<cost)throw Error('남은 행동이 부족합니다. 차례를 마치세요.');}
function questOf(h,id){return h.quests.find(q=>q.id===id);}
function ready(s,h,q){if(!q.ready){q.ready=true;log(s,`${classes[h.classId].name}: ${quests.find(x=>x.id===q.id).name} 목표 달성 · 거점에서 보고하세요.`);}}
function canEngage(s){const h=hero(s),e=s.enemies.find(e=>e.pos===h.pos&&e.hp>0);return !!e&&(e.id!=='dragon'||s.seals>=2&&level(h)>=3);}
function engage(s){world(s);const h=hero(s),e=s.enemies.find(e=>e.pos===h.pos&&e.hp>0);if(!e)throw Error('이 지역에는 살아 있는 적이 없습니다.');if(!canEngage(s))throw Error('용의 봉인 2개와 현재 영웅 레벨 3이 필요합니다.');
 const participants=s.heroes.map((x,i)=>x.pos===h.pos&&x.hp>0?i:-1).filter(i=>i>=0);
 if(!e.scaled){e.max=e.hp=Math.max(1,e.max+(participants.length-1)*(e.id==='dragon'?14:5)-(e.id==='dragon'&&s.seals===3?6:0));e.scaled=true;}
 s.actions--;s.battle={enemy:e.id,participants,round:1,phase:'plan',dice:[],stances:Object.fromEntries(participants.map(i=>[i,'assault'])),rerolls:0};s.lastResult=null;log(s,`${e.name} 전투 시작 · 참여 ${participants.map(i=>classes[s.heroes[i].classId].name).join(', ')}`);
}
function intent(s){const b=s.battle;if(!b)return null;const e=s.enemies.find(e=>e.id===b.enemy),r=b.round,angry=e.id==='dragon'&&e.hp<=e.max/2,bonus=(s.rageUntil>=s.round?1:0)+(angry?2:0);
 if(e.id==='wolf')return r%2===0?{name:'출혈의 송곳니',damage:3+bonus,pierce:true,all:false,desc:'방어 주사위 무시'}:{name:'사냥의 도약',damage:3+bonus,all:false,desc:'전열 영웅 공격'};
 if(e.id==='troll')return r%2===0?{name:'재생과 강타',damage:4+bonus,regen:2,all:false,desc:'피해 후 적 체력 +2'}:{name:'바위 주먹',damage:5+bonus,all:false,desc:'전열 영웅 공격'};
 if(e.id==='knight')return {name:r%2?'저주의 검':'망령의 절단',damage:(r%2?4:6)+bonus,drain:r%2?1:0,all:false,desc:r%2?'전열 에너지 −1':'강한 물리 공격'};
 return r%3===0?{name:'용의 화염 숨결',damage:5+bonus,all:true,desc:'참여한 모든 영웅 공격'}:{name:angry?'격노의 발톱':'거대한 발톱',damage:6+bonus,all:false,desc:angry?'격노 · 피해 +2':'전열 영웅 공격'};
}
function pool(s,index,stance){const st=stats(s.heroes[index]);return [st.red+(stance==='assault'?1:0),st.blue+(stance==='focus'?2:0),st.green+(stance==='guard'?2:stance==='recover'?1:0)];}
function preview(s){if(!s.battle)return null;const b=s.battle,e=s.enemies.find(e=>e.id===b.enemy);let physical=0,magic=0,blocks={};for(const d of b.dice){const st=stats(s.heroes[d.hero]);if(d.color===0&&d.value>=4)physical+=2+(d.value===6?st.crit:0);if(d.color===1&&d.value>=3)magic+=1+(d.value===6?1+st.crit:0);if(d.color===2&&d.value>=4)blocks[d.hero]=(blocks[d.hero]||0)+2;}return {physical,magic,damage:Math.max(0,physical-e.armor)+Math.max(0,magic-e.ward),blocks};}
function battleAction(s,type,arg,random){const b=s.battle;if(!b||s.outcome)throw Error('진행 중인 전투가 없습니다.');const e=s.enemies.find(x=>x.id===b.enemy);
 if(type==='stance'){
  if(b.phase!=='plan'||!b.participants.includes(arg.hero)||!['assault','focus','guard','recover'].includes(arg.stance)||s.heroes[arg.hero].hp<=0)throw Error('전투 준비 중인 영웅과 태세를 선택하세요.');
  if(['focus','recover'].includes(arg.stance)&&s.heroes[arg.hero].energy<1)throw Error('이 태세에는 에너지 1이 필요합니다.');b.stances[arg.hero]=arg.stance;return;
 }
 if(type==='roll'){
  if(b.phase!=='plan')throw Error('이미 주사위를 굴렸습니다.');
  for(const i of b.participants.filter(i=>s.heroes[i].hp>0)){const h=s.heroes[i],stance=b.stances[i];if(['focus','recover'].includes(stance)&&h.energy<1)throw Error('태세를 변경하세요. 에너지가 부족합니다.');}
  b.dice=[];b.rerolls=0;
  for(const i of b.participants.filter(i=>s.heroes[i].hp>0)){const h=s.heroes[i],stance=b.stances[i];if(['focus','recover'].includes(stance))h.energy--;pool(s,i,stance).forEach((n,color)=>{for(let j=0;j<n;j++)b.dice.push({hero:i,color,value:1+Math.floor(random()*6),rerolled:false});});}
  b.phase='rolled';log(s,`전투 ${b.round}: 주사위 ${b.dice.length}개 · 실패한 주사위를 선택해 재굴림할 수 있습니다.`);return;
 }
 if(type==='reroll'){
  const d=b.dice[arg.index];if(b.phase!=='rolled'||!d||d.rerolled)throw Error('아직 재굴림하지 않은 주사위를 선택하세요.');const h=s.heroes[d.hero];const used=b.dice.filter(x=>x.hero===d.hero&&x.rerolled).length;if(h.energy<1||used>=stats(h).rerolls)throw Error('에너지 또는 해당 영웅의 재굴림 한도가 부족합니다.');h.energy--;d.value=1+Math.floor(random()*6);d.rerolled=true;b.rerolls++;return;
 }
 if(type==='retreat'){
  if(b.phase!=='plan')throw Error('주사위를 굴린 후에는 전투 라운드를 먼저 해결하세요.');
  // A retreat ends the engagement, keeping both sides' damage. No free map escape.
  for(const i of b.participants){const h=s.heroes[i];if(h.hp>0){h.hp=Math.max(1,h.hp-2);h.pos='C5';}}
  s.battle=null;s.actions=0;s.lastResult={title:'후퇴',text:'참여 영웅이 체력 2를 잃고 마을로 귀환했습니다. 남은 행동을 포기합니다.'};log(s,s.lastResult.text);return;
 }
 if(type!=='resolve'||b.phase!=='rolled')throw Error('주사위를 굴린 뒤 결과를 해결하세요.');
 const p=preview(s),attack=intent(s);e.hp=Math.max(0,e.hp-p.damage);let healing=0,received=0;
 for(const i of b.participants.filter(i=>s.heroes[i].hp>0))if(b.stances[i]==='recover'){
  const amount=2+stats(s.heroes[i]).heal;
  for(const j of b.participants.filter(j=>s.heroes[j].hp>0)){const h=s.heroes[j],before=h.hp;h.hp=Math.min(stats(h).hp,h.hp+amount);healing+=h.hp-before;}
 }
 log(s,`${e.name}에게 피해 ${p.damage} (물리 ${p.physical} / 마법 ${p.magic})`);
 if(e.hp===0){
  for(const i of b.participants){const h=s.heroes[i];gainXP(s,h,e.tier);h.gold+=e.tier;h.kills.push(e.id);h.quests.filter(q=>quests.find(x=>x.id===q.id)?.pos===e.pos).forEach(q=>ready(s,h,q));}
  if(e.id==='dragon'){s.outcome='win';log(s,'승리! 잿빛 용을 처치했습니다.');}else{s.seals++;log(s,`봉인 ${s.seals}/3 획득 · 전투 참여 영웅 경험치 +${e.tier}, 골드 +${e.tier}`);}
  s.battle=null;s.lastResult={title:e.id==='dragon'?'캠페인 승리':'전투 승리',text:`${e.name} 처치 · 참여 영웅 경험치 +${e.tier} · 거점에서 퀘스트를 보고하세요.`,damage:p.damage};return;
 }
 const living=b.participants.filter(i=>s.heroes[i].hp>0);
 const front=living.reduce((a,i)=>a===null||stats(s.heroes[i]).armor+(p.blocks[i]||0)>stats(s.heroes[a]).armor+(p.blocks[a]||0)?i:a,null);
 for(const i of attack.all?living:[front])if(i!==null){const h=s.heroes[i],amount=Math.max(0,attack.damage-stats(h).armor-(attack.pierce?0:p.blocks[i]||0));const lost=Math.min(h.hp,amount);h.hp-=lost;h.energy=Math.max(0,h.energy-(attack.drain||0));received+=lost;}
 if(attack.regen)e.hp=Math.min(e.max,e.hp+attack.regen);
 s.lastResult={title:`공격 ${p.damage} · 받은 피해 ${received}`,text:`${attack.name}${healing?' · 파티 치유 '+healing:''}`,damage:p.damage,received};log(s,s.lastResult.title+' · '+s.lastResult.text);
 if(b.participants.every(i=>s.heroes[i].hp===0)){
  if(s.heroes.every(h=>h.hp===0)){s.outcome='lose';log(s,'모든 영웅이 쓰러졌습니다.');}
  else{for(const i of b.participants){s.heroes[i].pos='C5';s.heroes[i].hp=4;}s.actions=0;log(s,'전투 파티 패배 · 마을에서 회복하세요.');}s.battle=null;return;
 }
 b.round++;b.phase='plan';b.dice=[];
 if(b.round>8){s.battle=null;s.actions=0;for(const i of b.participants)if(s.heroes[i].hp>0)s.heroes[i].pos='C5';log(s,'8회 교전으로 적의 지원군 도착 · 마을로 철수');s.lastResult={title:'지원군 도착',text:'8회 안에 적을 처치하지 못해 마을로 철수했습니다. 장비와 특성을 보강하세요.'};}
}
function end(s){if(s.outcome)throw Error('캠페인이 끝났습니다.');if(s.battle)throw Error('전투를 먼저 해결하세요.');s.turn++;s.lastResult=null;
 if(s.turn===s.heroes.length){if(s.round>=20){s.turn=0;s.outcome='lose';log(s,'20라운드 종료 · 용의 군대가 세계를 점령했습니다.');return;}s.round++;s.turn=0;s.order=s.heroes.map((_,i)=>(i+s.round-1)%s.heroes.length);
 if(s.round%3===0){const id=s.eventDeck.shift();s.eventDeck.push(id);s.event=id;const ev=events[id];for(const h of s.heroes)if(h.hp>0){if(ev.kind==='gold')h.gold++;if(ev.kind==='energy')h.energy=Math.min(4,h.energy+1);if(ev.kind==='supply')h.supply++;if(ev.kind==='heal')h.hp=Math.min(stats(h).hp,h.hp+2);if(ev.kind==='mist'&&!town(h.pos))h.hp=Math.max(1,h.hp-1);}if(ev.kind==='rage')s.rageUntil=s.round+2;log(s,`세계 사건: ${ev.name} · ${ev.desc}`);}
 }
 s.active=s.order[s.turn];const h=hero(s);s.actions=s.heroes.length===1?4:3;h.energy=Math.min(4,h.energy+1);if(h.hp===0){h.pos='C5';h.hp=4;s.actions=0;log(s,'마을에서 부활 · 이번 차례는 회복');}log(s,`${classes[h.classId].name}의 차례 · 라운드 ${s.round}`);
}
function apply(s,type,arg={},random=Math.random){
 if(['stance','roll','reroll','resolve','retreat'].includes(type))return battleAction(s,type,arg,random);
 if(type==='engage')return engage(s);if(type==='end')return end(s);
 const free=['accept','abandon','equip','talent'].includes(type);world(s,free?0:1);const h=hero(s);
 if(type==='move'){
  const cost=locations[arg.pos]?.kind==='mountain'?2:1;if(!valid(arg.pos)||dist(h.pos,arg.pos)!==1)throw Error('상하좌우 인접 지역을 선택하세요.');world(s,cost);h.pos=arg.pos;s.actions-=cost;log(s,`${classes[h.classId].name} → ${locations[h.pos]?.name||h.pos} · 행동 ${cost}`);
  const escort=questOf(h,'caravan');if(escort&&!escort.ready&&h.pos==='A4')ready(s,h,escort);return;
 }
 if(type==='accept'){
  const q=quests.find(q=>q.id===arg.id);if(!q||level(h)<q.level||h.quests.length>=3||questOf(h,q.id)||h.completed.includes(q.id)||!town(h.pos))throw Error('거점에서 레벨에 맞는 퀘스트를 최대 3개까지 수락하세요.');
  if(q.type==='hunt'){const enemy=s.enemies.find(e=>e.pos===q.pos);if(enemy.hp===0&&!h.kills.includes(enemy.id))throw Error('이 지역은 이미 다른 영웅이 해결했습니다. 다른 퀘스트를 선택하세요.');}
  if(q.type==='escort'&&(h.pos!=='C5'||h.supply<1))throw Error('황금들 마을에서 보급 1개가 필요합니다.');if(q.type==='escort')h.supply--;
  h.quests.push({id:q.id,ready:q.type==='hunt'&&h.kills.includes(enemyDefs.find(e=>e.pos===q.pos)?.id)});log(s,`${q.name} 수락`);return;
 }
 if(type==='abandon'){const idx=h.quests.findIndex(q=>q.id===arg.id);if(idx<0)throw Error('수락한 퀘스트가 없습니다.');h.quests.splice(idx,1);log(s,'퀘스트 포기 · 이미 사용한 보급은 돌아오지 않습니다.');return;}
 if(type==='explore'){
  const q=h.quests.find(x=>!x.ready&&quests.find(y=>y.id===x.id)?.pos===h.pos&&quests.find(y=>y.id===x.id)?.type==='gather');if(!q)throw Error('이곳에서 진행할 수집·탐사 퀘스트가 없습니다.');if(q.id==='relic'&&h.energy<2)throw Error('제단 조사에는 에너지 2가 필요합니다.');if(q.id==='stars'&&h.supply<1)throw Error('유적 탐사에는 보급 1개가 필요합니다.');if(q.id==='relic')h.energy-=2;if(q.id==='stars')h.supply--;ready(s,h,q);
 }
 else if(type==='claim'){
  const q=questOf(h,arg.id),def=quests.find(x=>x.id===arg.id);if(!q?.ready||!def||!town(h.pos)||!def.choices.includes(arg.gear))throw Error('거점에서 완료한 퀘스트의 장비 보상을 선택하세요.');
  h.quests.splice(h.quests.indexOf(q),1);h.completed.push(q.id);h.gold+=def.gold;h.bag.push(arg.gear);gainXP(s,h,def.xp);log(s,`${def.name} 보고 · 골드 +${def.gold} · ${gear[arg.gear].name} 획득`);
 }
 else if(type==='talent'){
  const t=talents[h.classId][arg.index];if(!t||h.points<1||level(h)<t.tier||h.talents.some(i=>talents[h.classId][i].tier===t.tier))throw Error('해당 레벨의 특성 두 가지 중 하나를 선택하세요.');h.points--;h.talents.push(arg.index);log(s,`${classes[h.classId].name}: ${t.name} 특성 선택`);return;
 }
 else if(type==='equip'){
  if(!Number.isInteger(arg.id)||!h.bag.includes(arg.id)||!gear[arg.id])throw Error('가방에 있는 장비를 선택하세요.');const item=gear[arg.id];h.equipment[item.slot]=arg.id;log(s,`${item.name} 장착 · ${item.desc}`);return;
 }
 else if(type==='buy'){
  if(!town(h.pos))throw Error('거점의 상점에서 구매하세요.');if(arg.id==='supply'||arg.id==='potion'){const cost=arg.id==='supply'?1:2;if(h.gold<cost)throw Error('골드가 부족합니다.');h.gold-=cost;if(arg.id==='supply')h.supply+=2;else h.potions++;}
  else{const item=gear[arg.id];if(!Number.isInteger(arg.id)||!item||item.tier>level(h)||h.gold<item.cost)throw Error('레벨 또는 골드가 부족합니다.');h.gold-=item.cost;h.bag.push(arg.id);}
  log(s,'상점 구매 완료');
 }
 else if(type==='trade'){const t=s.heroes[arg.hero],idx=h.bag.indexOf(arg.id);if(!Number.isInteger(arg.hero)||!t||t===h||t.hp<=0||t.pos!==h.pos||idx<0)throw Error('같은 지역의 살아 있는 동료와 보유 장비를 선택하세요.');h.bag.splice(idx,1);t.bag.push(arg.id);if(!h.bag.includes(arg.id)&&h.equipment[gear[arg.id].slot]===arg.id)h.equipment[gear[arg.id].slot]=null;log(s,`${classes[t.classId].name}에게 ${gear[arg.id].name} 전달`);}
 else if(type==='potion'){if(h.potions<1||h.hp===stats(h).hp)throw Error('물약이 없거나 체력이 가득 찼습니다.');h.potions--;h.hp=Math.min(stats(h).hp,h.hp+6);log(s,'치유 물약 · 체력 +6');}
 else if(type==='rest'){
  if(!town(h.pos)&&h.supply<1)throw Error('야영에는 보급 1개가 필요합니다.');if(!town(h.pos))h.supply--;h.hp=Math.min(stats(h).hp,h.hp+(town(h.pos)?6:3));h.energy=Math.min(4,h.energy+2);log(s,`${town(h.pos)?'여관':'야영'} · 체력 회복 · 에너지 +2`);
 }
 else throw Error('알 수 없는 행동');s.actions--;
}
function validate(s){
 try{
  const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isInteger(v)&&v>=min&&v<=max;
  if(!s||s.version!==2||!Array.isArray(s.heroes)||s.heroes.length<1||s.heroes.length>4||new Set(s.heroes.map(h=>h.classId)).size!==s.heroes.length)return false;
  for(const h of s.heroes){
   if(!integer(h.classId,0,3)||!valid(h.pos)||!integer(h.hp)||!integer(h.xp)||!integer(h.energy,0,4)||!integer(h.gold)||!integer(h.supply)||!integer(h.potions)||!integer(h.points,0,3))return false;
   if(!Array.isArray(h.quests)||h.quests.length>3||h.quests.some(q=>!quests.some(x=>x.id===q.id)||typeof q.ready!=='boolean')||new Set(h.quests.map(q=>q.id)).size!==h.quests.length)return false;
   if(!Array.isArray(h.completed)||h.completed.some(id=>!quests.some(q=>q.id===id))||!Array.isArray(h.kills)||h.kills.some(id=>!enemyDefs.some(e=>e.id===id)))return false;
   if(!Array.isArray(h.talents)||h.talents.some(id=>!integer(id,0,5)||talents[h.classId][id].tier>level(h))||new Set(h.talents.map(id=>talents[h.classId][id].tier)).size!==h.talents.length)return false;
   if(!Array.isArray(h.bag)||h.bag.some(id=>!integer(id,0,gear.length-1))||!h.equipment||['weapon','armor','trinket'].some(slot=>h.equipment[slot]!==null&&(!h.bag.includes(h.equipment[slot])||gear[h.equipment[slot]]?.slot!==slot))||h.hp>stats(h).hp)return false;
  }
  if(!integer(s.active,0,s.heroes.length-1)||!integer(s.turn,0,s.heroes.length-1)||!integer(s.round,1,20)||!integer(s.actions,0,4)||!integer(s.seals,0,3)||!['win','lose',null].includes(s.outcome))return false;
  if(!Array.isArray(s.order)||s.order.length!==s.heroes.length||new Set(s.order).size!==s.order.length||s.order.some(i=>!integer(i,0,s.heroes.length-1)))return false;
  if(!Array.isArray(s.enemies)||s.enemies.length!==4||new Set(s.enemies.map(e=>e.id)).size!==4||s.enemies.some(e=>!enemyDefs.some(d=>d.id===e.id&&d.pos===e.pos)||!integer(e.hp)||!integer(e.max,1)||e.hp>e.max||!integer(e.armor)||!integer(e.ward)))return false;
  if(!Array.isArray(s.log)||s.log.some(t=>typeof t!=='string')||!Array.isArray(s.eventDeck)||s.eventDeck.length!==6||new Set(s.eventDeck).size!==6||s.eventDeck.some(id=>!integer(id,0,5))||s.event!==null&&!integer(s.event,0,5)||!integer(s.rageUntil))return false;
  if(s.battle){const b=s.battle;if(!['plan','rolled'].includes(b.phase)||!integer(b.round,1,8)||!Array.isArray(b.participants)||!b.participants.length||new Set(b.participants).size!==b.participants.length||b.participants.some(i=>!integer(i,0,s.heroes.length-1))||!s.enemies.some(e=>e.id===b.enemy&&e.hp>0)||!b.stances||b.participants.some(i=>!['assault','focus','guard','recover'].includes(b.stances[i]))||!Array.isArray(b.dice)||b.dice.some(d=>!b.participants.includes(d.hero)||!integer(d.color,0,2)||!integer(d.value,1,6)||typeof d.rerolled!=='boolean'))return false;}
  return true;
 }catch{return false;}
}
const api={classes,gear,talents,locations,quests,enemyDefs,events,dist,valid,town,hero,level,stats,create,apply,intent,pool,preview,canEngage,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Elderfall=api;
})(typeof globalThis!=='undefined'?globalThis:this);

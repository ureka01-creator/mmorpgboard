/* Original small party RPG. Exploration, dialogue and tactical combat share this engine. */
(function(root){
'use strict';
const W=12,H=8;
const roles={
 knight:{name:'아렌',title:'검사',art:'knight',hp:24,armor:2,range:1,damage:3,skill:'회전 베기',description:'인접한 적 모두에게 피해 7 · AP 2 / 집중 1'},
 mage:{name:'리엔',title:'마법사',art:'mage',hp:16,armor:0,range:5,damage:2,skill:'서리 속박',description:'거리 5의 적에게 피해 6 · 이동 봉쇄 1회 · AP 2 / 집중 1'},
 priest:{name:'세라',title:'치유사',art:'priest',hp:18,armor:1,range:4,damage:2,skill:'치유의 빛',description:'거리 4의 동료 HP +8 · AP 2 / 집중 1'}
};
const maps={
 village:{name:'버들강 마을',subtitle:'먼저 사람들의 이야기를 들어보세요',walls:[[0,0],[1,0],[2,0],[0,1],[1,1],[7,0],[8,0],[9,0],[10,0],[11,0],[10,1],[11,1],[0,3],[0,4],[6,5],[6,6],[11,6],[11,7]]},
 ruins:{name:'잊힌 맹세의 유적',subtitle:'돌길을 따라 수호석을 찾아가세요',walls:[[0,0],[1,0],[2,0],[3,0],[11,0],[11,1],[4,2],[4,3],[7,3],[7,4],[3,6],[4,6],[6,7],[7,7],[11,6],[11,7]]}
};
const objects={
 village:[{id:'elder',name:'촌장 오스윈',kind:'talk',x:5,y:3,art:'knight'},{id:'mage',name:'리엔 · 마법사',kind:'talk',x:3,y:2,art:'mage'},{id:'priest',name:'세라 · 치유사',kind:'talk',x:8,y:2,art:'priest'},{id:'camp',name:'야영지',kind:'rest',x:1,y:6},{id:'gate',name:'유적으로 가는 길',kind:'travel',x:10,y:4}],
 ruins:[{id:'relic',name:'잃어버린 수호석',kind:'collect',x:9,y:1},{id:'gate',name:'마을로 돌아가기',kind:'travel',x:0,y:6}]
};
const key=(x,y)=>x+','+y,dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function unit(id,x,y){const r=roles[id];return {id,name:r.name,x,y,hp:r.hp,focus:3,ap:4,guard:false};}
function enemies(){return [{id:'wolf1',name:'가시늑대',x:5,y:4,hp:16,max:16},{id:'wolf2',name:'굶주린 늑대',x:8,y:5,hp:14,max:14},{id:'wolf3',name:'무리 우두머리',x:9,y:2,hp:20,max:20}];}
function create(){return {version:1,scene:'village',party:[unit('knight',2,5)],selected:'knight',gold:5,supplies:2,reputation:0,quest:'none',combat:false,round:0,enemies:[],dialog:null,roll:null,outcome:null,log:['버들강 마을 도착 · 촌장과 이야기하고 동료를 모으세요.'],lastEffects:[]};}
function log(s,text){s.log.unshift(text);s.log=s.log.slice(0,50);}
function selected(s){return s.party.find(h=>h.id===s.selected);}
function living(s){return s.party.filter(h=>h.hp>0);}
function object(s,id){return objects[s.scene].find(o=>o.id===id);}
function occupied(s,x,y,ignore){return [...s.party,...s.enemies.filter(e=>e.hp>0)].some(u=>u!==ignore&&u.hp>0&&u.x===x&&u.y===y)||objects[s.scene].some(o=>!(o.kind==='talk'&&s.party.some(h=>h.id===o.id))&&o.x===x&&o.y===y);}
function validCell(s,x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<W&&y<H&&!maps[s.scene].walls.some(p=>p[0]===x&&p[1]===y);}
function path(s,from,to){
 if(!validCell(s,to.x,to.y)||occupied(s,to.x,to.y,from))return null;
 const queue=[[{x:from.x,y:from.y}]],visited=new Set([key(from.x,from.y)]);
 while(queue.length){const route=queue.shift(),p=route[route.length-1];if(p.x===to.x&&p.y===to.y)return route.slice(1);
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(visited.has(k)||!validCell(s,x,y)||occupied(s,x,y,from))continue;visited.add(k);queue.push([...route,{x,y}]);}
 }return null;
}
function sight(s,a,b){
 let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,err=dx-dy;
 while(x!==b.x||y!==b.y){const n=2*err;if(n>-dy){err-=dy;x+=sx;}if(n<dx){err+=dx;y+=sy;}if((x!==b.x||y!==b.y)&&!validCell(s,x,y))return false;}return true;
}
function reachable(s){const h=selected(s);if(!h||h.hp<=0)return [];const cells=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=path(s,h,{x,y});if(p&&p.length&&(!s.combat||p.length<=h.ap))cells.push({x,y,cost:p.length});}return cells;}
function nearObject(s,o){return living(s).some(h=>dist(h,o)<=1);}
function checkActive(s){if(s.outcome)throw Error('이 모험은 끝났습니다.');if(s.dialog)throw Error('대화를 마치세요.');}
function follow(s){const leader=s.party[0];for(const h of s.party.slice(1)){const candidates=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(validCell(s,x,y)&&!occupied(s,x,y,h))candidates.push({x,y});candidates.sort((a,b)=>dist(a,leader)-dist(b,leader));if(candidates.length){h.x=candidates[0].x;h.y=candidates[0].y;}}}
function targetReason(s,h,t,range){if(!t||t.hp<=0)return '살아 있는 대상을 선택하세요.';if(dist(h,t)>range)return '대상이 사거리 밖에 있습니다.';if(!sight(s,h,t))return '벽이 시야를 가립니다. 위치를 바꿔보세요.';return '';}
function dice(random,sides=20){return 1+Math.floor(random()*sides);}
function regroup(s){for(const h of s.party.filter(u=>u.hp===0)){const cells=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(validCell(s,x,y)&&!occupied(s,x,y,h))cells.push({x,y});cells.sort((a,b)=>dist(a,h)-dist(b,h));if(!cells.length)throw Error('동료가 회복할 공간이 없습니다.');h.x=cells[0].x;h.y=cells[0].y;h.hp=4;}}
function endCombat(s){if(s.enemies.every(e=>e.hp===0)){s.combat=false;regroup(s);s.party.forEach(h=>{h.ap=4;});s.selected='knight';log(s,'전투 승리 · 유적 북동쪽 수호석을 회수하세요.');}else if(living(s).length===0){s.combat=false;s.outcome='defeat';log(s,'일행이 모두 쓰러졌습니다. 다른 위치와 기술 조합으로 다시 도전하세요.');}}
function damage(s,u,amount){const lost=Math.min(u.hp,Math.max(0,amount));u.hp-=lost;s.lastEffects.push({id:u.id,text:'−'+lost,kind:'damage'});return lost;}
function strike(s,h,t,random,enemy=false){
 const die=dice(random),bonus=enemy?3:4,defense=enemy?10+roles[t.id].armor:11,hit=die!==1&&(die===20||die+bonus>=defense),amount=enemy?6+(die===20?3:0):dice(random,6)+roles[h.id].damage+(die===20?3:0);
 s.roll={value:die,bonus,dc:defense,success:hit,kind:'attack',actor:h.name};
 let lost=0;if(hit)lost=damage(s,t,Math.max(0,amount-(enemy?roles[t.id].armor+(t.guard?3:0):0)));
 log(s,`${h.name} → ${t.name} · d20 ${die}+${bonus} / 목표 ${defense} · ${hit?'피해 '+lost:'빗나감'}`);
}
function enemyTurn(s,random){
 s.lastEffects=[];
 for(const e of s.enemies.filter(e=>e.hp>0)){
  if(!living(s).length)break;
  let candidates=living(s).map(h=>({h,paths:[]}));
  for(const c of candidates)for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const p=path(s,e,{x:c.h.x+dx,y:c.h.y+dy});if(p)c.paths.push(p);}
  candidates.sort((a,b)=>Math.min(...a.paths.map(p=>p.length),dist(e,a.h)===1?0:999)-Math.min(...b.paths.map(p=>p.length),dist(e,b.h)===1?0:999));
  const target=candidates[0]?.h;if(!target)continue;
  if(dist(e,target)>1&&!e.rooted){const routes=candidates[0].paths.sort((a,b)=>a.length-b.length);if(routes[0]?.length){const p=routes[0][Math.min(2,routes[0].length)-1];e.x=p.x;e.y=p.y;log(s,e.name+'가 접근합니다.');}}
  e.rooted=false;if(dist(e,target)===1)strike(s,e,target,random,true);
 }
 endCombat(s);if(s.combat){s.round++;s.party.forEach(h=>{h.ap=h.hp>0?4:0;h.guard=false;});s.selected=living(s)[0].id;log(s,`교전 ${s.round} · 각 영웅 AP 4 회복`);}
}
function recruit(s,id){if(s.party.some(h=>h.id===id))throw Error('이미 동료입니다.');const h=unit(id,selected(s).x,selected(s).y);s.party.push(h);follow(s);log(s,roles[id].name+' 합류 · 파티 카드로 영웅을 선택할 수 있습니다.');}
function choose(s,id,random){
 const d=s.dialog;if(!d)throw Error('진행 중인 대화가 없습니다.');
 const npc=d.id;
 if(id==='leave'){s.dialog=null;return;}
 if(npc==='mage'&&id==='recruit'||npc==='priest'&&id==='recruit'){recruit(s,npc);s.dialog=null;return;}
 if(npc==='elder'&&s.quest==='none'&&['help','persuade','threaten'].includes(id)){
  s.quest='accepted';
  if(id==='help'){s.reputation++;log(s,'조건 없이 돕기로 했습니다. 마을의 신뢰 +1.');}
  if(id==='threaten'){s.gold+=2;s.reputation--;log(s,'위협으로 선금 2를 받았습니다. 마을의 신뢰 −1.');}
  if(id==='persuade'){const value=dice(random),success=value+2>=12;s.roll={value,bonus:2,dc:12,success,kind:'dialog',actor:'설득'};if(success){s.gold+=3;s.reputation++;}log(s,`설득 판정 ${value}+2 / DC 12 · ${success?'성공: 선금 3, 신뢰 +1':'실패: 선금 없이 임무 수락'}`);}
  s.dialog={id:'elder',node:'accepted'};return;
 }
 if(npc==='elder'&&s.quest==='recovered'&&id==='report'){const reward=10+s.reputation*2;s.gold+=reward;s.quest='complete';s.outcome='victory';s.dialog=null;log(s,`수호석 귀환 · 보상 ${reward}골드 · 잊힌 맹세를 지켰습니다.`);return;}
 throw Error('이 대화에서 선택할 수 없는 응답입니다.');
}
function interact(s,id){
 checkActive(s);if(s.combat)throw Error('전투를 먼저 마치세요.');const o=object(s,id);if(!o||!nearObject(s,o))throw Error('대상 옆 칸까지 이동하세요.');
 if(o.kind==='talk'){s.dialog={id,node:'intro'};s.roll=null;return;}
 if(o.kind==='rest'){if(s.supplies<1)throw Error('야영 보급이 부족합니다.');s.supplies--;regroup(s);s.party.forEach(h=>{h.hp=Math.min(roles[h.id].hp,Math.max(h.hp,4)+10);h.focus=3;});log(s,'야영 · 파티 체력 +10 / 쓰러진 동료 회복 · 집중 3');return;}
 if(o.kind==='collect'){if(s.quest==='recovered')throw Error('이미 수호석을 회수했습니다.');if(s.quest!=='accepted'||s.enemies.some(e=>e.hp>0))throw Error('수호석을 지키는 적부터 처치하세요.');s.quest='recovered';log(s,'수호석 회수 · 마을로 돌아가 촌장에게 보고하세요.');return;}
 if(o.kind==='travel'){
  if(s.scene==='village'){if(s.quest==='none')throw Error('먼저 촌장의 임무를 수락하세요.');s.scene='ruins';s.party.forEach((h,i)=>{h.x=1+i;h.y=5;h.ap=4;h.guard=false;});s.enemies=s.quest==='recovered'?[]:enemies();s.combat=s.quest!=='recovered';s.round=1;s.selected='knight';s.dialog=null;log(s,'유적의 매복 · 이동 1칸 = AP 1 / 공격·기술 = AP 2');}
  else{s.scene='village';s.enemies=[];s.selected='knight';s.party[0].x=9;s.party[0].y=4;follow(s);log(s,'버들강 마을 귀환');}return;
 }
}
function mutate(s,type,arg={},random=Math.random){
 if(type==='choose')return choose(s,arg.id,random);
 checkActive(s);s.lastEffects=[];
 if(type==='select'){const h=s.party.find(h=>h.id===arg.id);if(!h||h.hp<=0)throw Error('살아 있는 영웅을 선택하세요.');s.selected=h.id;return;}
 const h=selected(s);if(!h||h.hp<=0)throw Error('살아 있는 영웅을 선택하세요.');
 if(type==='interact')return interact(s,arg.id);
 if(type==='move'){
  const p=path(s,h,arg);if(!p||!p.length)throw Error('이 칸으로 이동할 수 없습니다.');if(s.combat&&p.length>h.ap)throw Error('이동에 필요한 AP가 부족합니다.');if(!s.combat&&h.id!=='knight')throw Error('탐험은 아렌을 선택해 진행하세요.');
  const end=p[p.length-1];h.x=end.x;h.y=end.y;if(s.combat)h.ap-=p.length;else follow(s);log(s,`${h.name} 이동${s.combat?' · AP −'+p.length:''}`);return;
 }
 if(type==='flee'){if(!s.combat)throw Error('진행 중인 전투가 없습니다.');s.scene='village';s.combat=false;s.gold=Math.max(0,s.gold-2);s.party.forEach((u,i)=>{u.hp=Math.max(4,u.hp);u.x=8;u.y=4;u.ap=4;u.guard=false;});s.enemies=[];s.selected='knight';follow(s);log(s,'후퇴 · 마을로 귀환 · 골드 −2 · 적은 다음 방문에 회복');return;}
 if(!s.combat)throw Error('전투 중에만 사용할 수 있습니다.');
 if(type==='end'){enemyTurn(s,random);return;}
 if(type==='guard'){if(h.ap<1)throw Error('AP 1이 필요합니다.');if(h.guard)throw Error('이미 방어 중입니다.');h.ap--;h.guard=true;log(s,h.name+' 방어 · 이번 적 공격 피해 −3');return;}
 const target=s.enemies.find(e=>e.id===arg.id);
 if(type==='attack'){const reason=targetReason(s,h,target,roles[h.id].range);if(reason)throw Error(reason);if(h.ap<2)throw Error('공격에는 AP 2가 필요합니다.');h.ap-=2;strike(s,h,target,random);endCombat(s);return;}
 if(type==='skill'){
  if(h.ap<2||h.focus<1)throw Error('기술에는 AP 2와 집중 1이 필요합니다.');
  if(h.id==='knight'){
   const targets=s.enemies.filter(e=>e.hp>0&&dist(h,e)<=1);if(!targets.length)throw Error('인접한 적이 필요합니다.');h.ap-=2;h.focus--;targets.forEach(e=>damage(s,e,7));log(s,'회전 베기 · 인접한 적 '+targets.length+'명에게 피해 7');
  }else if(h.id==='mage'){const reason=targetReason(s,h,target,5);if(reason)throw Error(reason);h.ap-=2;h.focus--;damage(s,target,6);target.rooted=true;log(s,'서리 속박 · 피해 6 / 다음 적 이동 봉쇄');}
  else{const ally=s.party.find(u=>u.id===arg.id),reason=targetReason(s,h,ally,4);if(reason)throw Error(reason);if(ally.hp===roles[ally.id].hp)throw Error('이미 체력이 가득 찼습니다.');h.ap-=2;h.focus--;const amount=Math.min(8,roles[ally.id].hp-ally.hp);ally.hp+=amount;s.lastEffects.push({id:ally.id,text:'+'+amount,kind:'heal'});log(s,'치유의 빛 · '+ally.name+' HP +'+amount);}
  endCombat(s);return;
 }
 throw Error('알 수 없는 행동입니다.');
}
function apply(s,type,arg={},random=Math.random){
 const draft=JSON.parse(JSON.stringify(s));mutate(draft,type,arg,random);if(!validate(draft))throw Error('게임 상태를 갱신할 수 없습니다.');Object.assign(s,draft);
}
function dialogue(s){
 const d=s.dialog;if(!d)return null;
 if(d.id==='mage')return {name:'리엔',art:'mage',line:s.party.some(h=>h.id==='mage')?'함께 가겠다고 했잖아요. 앞길은 당신이 정하세요.':'유적의 마력이 이상해요. 제가 함께 가면 서리 주문으로 놈들의 접근을 막을 수 있어요.',choices:s.party.some(h=>h.id==='mage')?[['leave','대화를 마친다']]:[['recruit','함께 가자 · 마법사 합류'],['leave','지금은 혼자 살펴보겠다']]};
 if(d.id==='priest')return {name:'세라',art:'priest',line:s.party.some(h=>h.id==='priest')?'빛은 아직 우리 곁에 있어요. 무리하지 말고 서로를 지켜요.':'촌장의 부탁을 들었나요? 위험한 길이라면 저도 동행하겠어요. 다친 동료를 치유할 수 있어요.',choices:s.party.some(h=>h.id==='priest')?[['leave','대화를 마친다']]:[['recruit','동행을 부탁한다 · 치유사 합류'],['leave','조금 더 생각해보겠다']]};
 if(s.quest==='recovered')return {name:'오스윈',art:'elder',line:'그 빛… 수호석을 되찾았군요! 이제 이 마을은 다시 밤을 견딜 수 있겠어요.',choices:[['report','수호석을 건넨다 · 임무 완료'],['leave','잠시 다른 일을 살펴본다']]};
 if(s.quest!=='none')return {name:'오스윈',art:'elder',line:d.node==='accepted'?'고맙소. 마을 동쪽 길로 유적에 들어갈 수 있소. 리엔과 세라에게도 동행을 부탁해보시오.':'유적의 북동쪽 제단에 수호석이 있소. 무사히 돌아오길 바라겠소.',choices:[['leave','대화를 마친다']]};
 return {name:'오스윈',art:'elder',line:'숲의 유적에서 수호석이 사라진 뒤 늑대들이 몰려들고 있소. 마을을 위해 그 돌을 되찾아 주겠소?',choices:[['help','마을을 돕겠다 · 신뢰 +1'],['persuade','선금을 부탁한다 · 설득 d20+2 / DC 12'],['threaten','대가를 먼저 내놓으시오 · 선금 2 / 신뢰 −1'],['leave','아직 준비가 안 됐다']]};
}
function goal(s){return s.quest==='none'?'촌장 오스윈에게 말을 걸어 임무를 받으세요.':s.quest==='accepted'?s.combat?'일행의 위치와 AP를 관리해 늑대 무리를 처치하세요.':s.scene==='ruins'?'북동쪽 제단 옆으로 이동해 수호석을 회수하세요.':'리엔·세라를 동료로 모으고 마을 동쪽 길로 향하세요.':s.quest==='recovered'?'마을로 돌아가 촌장에게 수호석을 건네세요.':'잊힌 맹세를 지켰습니다.';}
function validate(s){try{
 if(!s||s.version!==1||!maps[s.scene]||!Array.isArray(s.party)||s.party.length<1||s.party.length>3||s.party[0].id!=='knight'||new Set(s.party.map(h=>h.id)).size!==s.party.length||!s.party.some(h=>h.id===s.selected))return false;
 const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
 for(const h of s.party)if(!roles[h.id]||!validCell(s,h.x,h.y)||!int(h.hp,0,roles[h.id].hp)||!int(h.focus,0,3)||!int(h.ap,0,4)||typeof h.guard!=='boolean')return false;
 if(!int(s.gold,0,999)||!int(s.supplies,0,2)||!int(s.reputation,-1,1)||!['none','accepted','recovered','complete'].includes(s.quest)||typeof s.combat!=='boolean'||!int(s.round,0,9999)||!['victory','defeat',null].includes(s.outcome)||!Array.isArray(s.enemies)||s.enemies.length>3)return false;
 if(s.enemies.some(e=>!['wolf1','wolf2','wolf3'].includes(e.id)||!validCell(s,e.x,e.y)||!int(e.hp,0,20)||!int(e.max,1,20)||e.hp>e.max)||new Set(s.enemies.map(e=>e.id)).size!==s.enemies.length)return false;
 if(s.combat&&(s.scene!=='ruins'||!s.enemies.some(e=>e.hp>0)||!living(s).length||s.outcome||s.dialog))return false;
 if(s.dialog&&(!objects.village.some(o=>o.kind==='talk'&&o.id===s.dialog.id)||!['intro','accepted'].includes(s.dialog.node)||s.scene!=='village'))return false;
 const positions=[...s.party,...s.enemies].filter(u=>u.hp>0).map(u=>key(u.x,u.y));if(new Set(positions).size!==positions.length)return false;
 if(!Array.isArray(s.log)||s.log.length>50||s.log.some(t=>typeof t!=='string')||!Array.isArray(s.lastEffects)||s.lastEffects.some(e=>!e||!['knight','mage','priest','wolf1','wolf2','wolf3'].includes(e.id)||typeof e.text!=='string'||!['damage','heal'].includes(e.kind)))return false;
 if(s.roll&&(!int(s.roll.value,1,20)||!int(s.roll.bonus,2,4)||!int(s.roll.dc,10,12)||typeof s.roll.success!=='boolean'||typeof s.roll.actor!=='string'||!['attack','dialog'].includes(s.roll.kind)))return false;
 if(s.scene==='village'&&s.enemies.length)return false;
 if(s.outcome==='victory'&&s.quest!=='complete'||s.outcome==='defeat'&&living(s).length)return false;return true;
 }catch{return false;}}
const api={W,H,roles,maps,objects,create,apply,selected,living,object,path,sight,dist,reachable,targetReason,dialogue,goal,validate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ElderRPG=api;
})(typeof globalThis!=='undefined'?globalThis:this);

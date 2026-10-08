'use strict';
const E=window.Elderfall;
const $=selector=>document.querySelector(selector);
const SAVE='elderfall-game-v1';
let state=null, storageAvailable=true,resultDismissed=false;
let scenePreference='auto';
let pinnedQuest='A2';
try{pinnedQuest=localStorage.getItem('elderfall-waypoint')||'A2';}catch{}
const quests=[{pos:'A2',title:'숲에 드리운 그림자',text:'가시늑대가 마을로 향하는 길을 막고 있습니다. 숲으로 가서 늑대를 처치하세요.',place:'숲',enemy:'가시늑대'},{pos:'E3',title:'멈춰 버린 광산',text:'광산 트롤에게 점령당한 폐광을 되찾고 봉인 조각을 회수하세요.',place:'폐광',enemy:'광산 트롤'},{pos:'B1',title:'망령의 마지막 맹세',text:'옛 성채를 지키는 망령 기사를 쓰러뜨리고 마지막 봉인을 찾으세요.',place:'성채',enemy:'망령 기사'}];
const portraits=['knight','mage','ranger','priest'];
const itemSymbols=['✚','ϟ','➶','◇','✦','⌂'];
const classPicker=$('#class-picker');
E.classes.forEach((c,i)=>{const label=document.createElement('label');label.className='class-choice';label.innerHTML=`<span class="portrait portrait-${portraits[i]}" aria-hidden="true"></span><input type="checkbox" value="${i}" ${i===0?'checked':''}><strong>${c.name}</strong><span>체력 ${c.hp} · ${c.skill}</span>`;classPicker.append(label);});
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(state));}catch{storageAvailable=false;}}
function message(text){$('#feedback').textContent=text;clearTimeout(message.timer);if(text)message.timer=setTimeout(()=>{$('#feedback').textContent='';},5000);}
function option(select,value,text){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}
function execute(type,arg={}){
 try{
  const actingClass=E.hero(state).classId;
  const beforeEnemy=state.enemies.find(e=>e.pos===arg.pos&&e.hp>0);const beforeHP=beforeEnemy?.hp;
  const itemId=type==='item'?E.hero(state).items[arg.index]:null;
  E.apply(state,type,arg);message('');clearTimeout(combatFeedback.timer);$('#battle-result').replaceChildren();if(type==='move'||type==='end'||type==='award')scenePreference='auto';else if(type==='attack'||type==='skill'&&(actingClass===1||actingClass===2))scenePreference='battle';persist();render();
  if(type==='item'||type==='trade')$('#bag-modal').close();
  const isAttack=type==='attack'||type==='skill'&&(actingClass===1||actingClass===2)||type==='item'&&[1,4].includes(itemId);
  if(isAttack&&beforeEnemy){
   const dealt=beforeHP-beforeEnemy.hp;
   const usesDie=type==='attack'||type==='skill'&&actingClass===2||type==='item'&&itemId===4;
   const roll=state.log.find(text=>text.includes('주사위 '))?.match(/주사위 (\d)/)?.[1];
   combatFeedback(dealt>0?`${beforeEnemy.name} −${dealt} HP`:'공격이 빗나갔습니다',`${usesDie?'주사위 '+roll+' · ':'확정 피해 · '}${beforeEnemy.hp===0?'적 처치!':dealt>0?'명중':'다음 공격을 준비하세요'}`,dealt>0,usesDie);
  }else if(type==='end'){
   const lost=state.lastEnemyDamage||0;
   if(lost>0)combatFeedback('적의 반격!',`파티가 받은 피해 ${lost}`,false,false,true);
  }
 }catch(error){message(error.message);}
}
function combatFeedback(title,subtitle,hit,rollDice=true,heroHit=false){
 const result=$('#battle-result');result.replaceChildren();const strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=title;span.textContent=subtitle;result.append(strong,span);
 result.style.animation='none';void result.offsetWidth;result.style.animation='';
 for(const [selector,animation] of [...(rollDice?[['#die-face','die-rolling']]:[]),['#board','battle-flash'],...(heroHit?[['.hero-card','enemy-hit']]:[]),...(hit?[['#enemy-portrait','enemy-hit']]:[])]){
  const el=$(selector);el.classList.remove(animation);void el.offsetWidth;el.classList.add(animation);
 }
 clearTimeout(combatFeedback.timer);combatFeedback.timer=setTimeout(()=>result.replaceChildren(),1300);
}
const names={A2:'숲',E3:'폐광',B1:'성채',D1:'둥지',C5:'마을'};
function render(){
 if(!state){$('#setup').hidden=false;$('#game').hidden=true;document.body.classList.remove('playing','combat-mode');returnSideBoard();document.querySelectorAll('.game-menu').forEach(b=>b.hidden=true);return;}
 $('#setup').hidden=true;$('#game').hidden=false;document.body.classList.add('playing');document.querySelectorAll('.game-menu').forEach(b=>b.hidden=false);
 const h=E.hero(state),c=E.classes[h.classId],can=state.actions>0&&!state.outcome&&!state.pending.length&&h.hp>0;
 $('#turn-title').textContent=`${c.name}의 차례`;
 $('#game-status').textContent=`라운드 ${state.round}/10 · 봉인 ${state.seals}/3 · 남은 행동 ${state.actions}`;
 $('#save-notice').textContent=storageAvailable?'✓ 저장됨':'저장 불가';$('#save-notice').title=storageAvailable?'이 브라우저에 진행을 저장합니다.':'페이지를 닫으면 진행이 사라집니다.';
 $('#round-track').innerHTML=Array.from({length:10},(_,i)=>`<span class="${i+1===state.round?'now':i+1<state.round?'past':''}">${i+1}</span>`).join('');
 $('#seal-track').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<state.seals?'collected':''}">◆</span>`).join('');
 $('#action-budget').innerHTML=`<span>행동</span>`+Array.from({length:state.heroes.length===1?4:3},(_,i)=>`<i class="${i<state.actions?'available':''}"></i>`).join('');
 $('#active-portrait').className=`portrait portrait-${portraits[h.classId]}`;$('#hero-name').textContent=c.name;
 $('#hero-stats').innerHTML=`<span>공격 <b>${c.atk+(h.xp>=1?1:0)}</b></span><span>피해 <b>${c.dmg+(h.xp>=3?1:0)}</b></span><span>레벨 <b>${h.xp>=3?3:h.xp>=1?2:1}</b></span>`;
 const diceMessage=state.log.find(text=>text.includes('주사위 '));const face=diceMessage?Number(diceMessage.match(/주사위 (\d)/)?.[1]||0):0;
 const pipPositions={0:[],1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
 $('#die-face').innerHTML=pipPositions[face].map(pos=>`<i style="grid-area:${Math.ceil(pos/3)}/${(pos-1)%3+1}"></i>`).join('');$('#die-face').setAttribute('aria-label',face?'주사위 '+face:'아직 주사위를 굴리지 않았습니다');
 $('#last-event').textContent=state.log[0]||'공격하면 주사위가 굴러갑니다.';
 $('#heal-label').hidden=h.classId!==3;$('#bag-count').textContent=h.items.length;
 $('#outcome').hidden=!state.outcome;$('#outcome').textContent=state.outcome==='win'?'승리! 잿빛 용을 처치했습니다.':state.outcome==='lose'?'모험 종료. 새 파티로 다시 도전해 보세요.':'';
 renderQuests();
 $('#board').replaceChildren();
 for(let row=1;row<=5;row++)for(const col of 'ABCDE'){
  const pos=col+row,enemy=state.enemies.find(e=>e.pos===pos&&e.hp>0),occupants=state.heroes.filter(hero=>hero.pos===pos);
  const tile=document.createElement('button');tile.className=`tile ${pos==='C5'?'village':pos==='D1'?'lair':pos==='A2'?'forest':pos==='E3'?'mine':pos==='B1'?'keep':''} ${pos===h.pos?'current':''} ${can&&E.dist(h.pos,pos)===1?'reachable':''}`;
  tile.disabled=!can||E.dist(h.pos,pos)!==1;
  tile.setAttribute('aria-label',`${pos} ${names[pos]||'황야'}${enemy?' '+enemy.name+' 체력 '+enemy.hp:''}${occupants.length?' '+occupants.map(x=>E.classes[x.classId].name).join(', '):''}`);
  const coord=document.createElement('span');coord.className='coord';coord.textContent=pos;
  const label=document.createElement('strong');label.className='tile-name';label.textContent=names[pos]||'';
  const info=document.createElement('span');info.className='enemy-hp';info.textContent=enemy?`${enemy.name} ${enemy.hp}/${enemy.max}`:'';
  const tokens=document.createElement('span');tokens.className='tokens';occupants.forEach(x=>{const token=document.createElement('span');token.className=`board-token portrait portrait-${portraits[x.classId]}${x.hp===0?' fallen':''}`;token.setAttribute('aria-label',E.classes[x.classId].name+(x.hp===0?' 쓰러짐':''));token.title=E.classes[x.classId].name;tokens.append(token);});
  if(pos===pinnedQuest&&!state.outcome)tile.classList.add('quest-destination');
  if(can&&pos===nextStep(h.pos,pinnedQuest))tile.classList.add('suggested');
  if(occupants.length)tile.classList.add('occupied');
  tile.append(coord,label,info,tokens);tile.addEventListener('click',()=>execute('move',{pos}));$('#board').append(tile);
 }
 $('#party').replaceChildren();state.heroes.forEach((hero,i)=>{const cl=E.classes[hero.classId],card=document.createElement('article');card.setAttribute('role','button');card.tabIndex=0;card.setAttribute('aria-label',cl.name+' 영웅 카드 보기');card.addEventListener('click',()=>showHero(i));card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showHero(i);}});card.className='hero-panel'+(i===state.active?' active':'');card.innerHTML=`<div class="hero-identity"><span class="portrait portrait-${portraits[hero.classId]}" aria-hidden="true"></span><div><h3>${cl.name}${i===state.active?' · 현재':''}</h3><p>${hero.pos} · 레벨 ${hero.xp>=3?3:hero.xp>=1?2:1}</p></div></div><div class="health-line"><span>체력 ${hero.hp}/${cl.hp}</span><meter min="0" max="${cl.hp}" value="${hero.hp}" aria-label="${cl.name} 체력"></meter></div>`;$('#party').append(card);});
 $('#active-info').textContent=`${h.pos} · 체력 ${h.hp}/${c.hp} · 행동 ${state.actions}개`;
 const oldEnemy=$('#enemy-target').value,oldHero=$('#hero-target').value,oldBoot=$('#boot-target').value;
 $('#enemy-target').replaceChildren();state.enemies.filter(e=>e.hp>0).forEach(e=>option($('#enemy-target'),e.pos,`${e.name} · ${e.pos} · 체력 ${e.hp}`));
 const nearby=state.enemies.find(e=>e.hp>0&&E.dist(h.pos,e.pos)===0)||state.enemies.find(e=>e.hp>0&&h.classId===2&&E.dist(h.pos,e.pos)===1);
 if(nearby)$('#enemy-target').value=nearby.pos;
 else if([...$('#enemy-target').options].some(o=>o.value===oldEnemy))$('#enemy-target').value=oldEnemy;
 $('#hero-target').replaceChildren();state.heroes.forEach((hero,i)=>option($('#hero-target'),i,`${E.classes[hero.classId].name} · ${hero.pos} · 체력 ${hero.hp}`));$('#hero-target').value=[...$('#hero-target').options].some(o=>o.value===oldHero)?oldHero:state.active;
 const oldTrade=$('#trade-target').value;$('#trade-target').replaceChildren();state.heroes.forEach((hero,i)=>option($('#trade-target'),i,`${E.classes[hero.classId].name} · ${hero.pos} · 체력 ${hero.hp}`));if([...$('#trade-target').options].some(o=>o.value===oldTrade))$('#trade-target').value=oldTrade;
 $('#boot-target').replaceChildren();for(let row=1;row<=5;row++)for(const col of 'ABCDE'){const pos=col+row;if(E.dist(h.pos,pos)>0&&E.dist(h.pos,pos)<=2)option($('#boot-target'),pos,`${pos} ${names[pos]||'황야'}`);}if([...$('#boot-target').options].some(o=>o.value===oldBoot))$('#boot-target').value=oldBoot;
 $('#skill-label').textContent=c.skill;$('#skill-info').textContent=`${c.desc} · 행동 1개 · 차례당 1회`;
 for(const id of ['attack','rest','skill','summon'])$('#'+id).disabled=!can;
 $('#skill').disabled=!can||h.used;
 $('#summon').disabled=!can||state.seals!==3||h.pos!=='D1'||state.enemies.some(e=>e.boss);
 $('#end-turn').disabled=!!state.outcome||state.pending.length>0;
 $('#inventory').replaceChildren();if(!h.items.length){const p=document.createElement('p');p.className='muted';p.textContent='아직 전리품이 없습니다.';$('#inventory').append(p);}
 h.items.forEach((id,index)=>{const item=E.items[id],div=document.createElement('div');div.className='item-row';const title=document.createElement('p');title.textContent=`${item.name} · ${item.desc}`;const use=document.createElement('button');use.textContent=id===3?'자동 방어':'사용';use.disabled=!can||id===3;use.addEventListener('click',()=>execute('item',{index,pos:id===2?$('#boot-target').value:$('#enemy-target').value}));const trade=document.createElement('button');trade.textContent='전달';trade.disabled=!can;trade.addEventListener('click',()=>execute('trade',{index,hero:Number($('#trade-target').value)}));const medallion=document.createElement('span');medallion.className='loot-medallion';medallion.textContent=itemSymbols[id];div.append(medallion,title,use,trade);$('#inventory').append(div);});
 $('#reward').hidden=!state.pending.length;$('#reward').replaceChildren();if(state.pending.length){const title=document.createElement('h3');title.textContent='퀘스트 완료 · 전리품 획득';const desc=document.createElement('p');desc.textContent=E.items[state.pending[0]].desc;const reveal=document.createElement('div');reveal.className='loot-reveal';const symbol=document.createElement('span');symbol.className='loot-medallion';symbol.textContent=itemSymbols[state.pending[0]];const name=document.createElement('strong');name.textContent=E.items[state.pending[0]].name;reveal.append(symbol,name,desc);$('#reward').append(title,reveal);state.heroes.forEach((hero,i)=>{const b=document.createElement('button');b.textContent=`${E.classes[hero.classId].name}에게`;b.addEventListener('click',()=>execute('award',{hero:i}));$('#reward').append(b);});}
 if(state.pending.length&&!$('#reward').open){closePanels();$('#reward').showModal();}else if(!state.pending.length&&$('#reward').open)$('#reward').close();
 if(state.outcome&&!$('#result-modal').open&&!resultDismissed){closePanels();$('#result-modal').showModal();}
 updateControls();
 $('#next-goal').textContent=nextHint();
 $('#game-log').replaceChildren();state.log.slice(0,12).forEach(text=>{const li=document.createElement('li');li.textContent=text;$('#game-log').append(li);});
}
function renderQuests(){
 $('#quests').replaceChildren();
 const remaining=quests.filter(q=>state.enemies.some(e=>e.pos===q.pos&&e.hp>0));
 if(state.seals===3)pinnedQuest='D1';
 else if(!remaining.some(q=>q.pos===pinnedQuest))pinnedQuest=remaining[0]?.pos||'A2';
 for(const q of quests){
  const complete=!state.enemies.some(e=>e.pos===q.pos&&e.hp>0);
  const button=document.createElement('button');button.className='quest-card'+(complete?' completed':'')+(pinnedQuest===q.pos?' pinned':'');button.disabled=complete||!!state.outcome;
  const title=document.createElement('strong');title.textContent=(complete?'✓ ':'')+q.title;
  const place=document.createElement('span');place.textContent=complete?'완료 · 봉인 회수':`${q.place} ${q.pos} · ${q.enemy} 처치`;
  const description=document.createElement('small');description.textContent=q.text;
  const reward=document.createElement('small');reward.className='quest-reward';reward.textContent='보상: 봉인 1개 · 전원 경험치 1 · 전리품 2장';
  button.append(title,place,description,reward);button.addEventListener('click',()=>{$('#quest-modal').close();pinnedQuest=q.pos;try{localStorage.setItem('elderfall-waypoint',pinnedQuest);}catch{}render();});$('#quests').append(button);
 }
}
function nextStep(pos,goal){
 if(pos[0]!==goal[0])return String.fromCharCode(pos.charCodeAt(0)+(goal.charCodeAt(0)>pos.charCodeAt(0)?1:-1))+pos[1];
 if(pos[1]!==goal[1])return pos[0]+(Number(pos[1])+(Number(goal[1])>Number(pos[1])?1:-1));
 return pos;
}
function nextHint(){
 const h=E.hero(state);
 if(state.outcome)return '모험이 끝났습니다. 새 모험으로 다시 시작할 수 있습니다.';
 if(state.pending.length)return '퀘스트 완료! 획득한 전리품을 받을 영웅을 선택하세요.';
 if(state.actions===0)return '행동을 모두 사용했습니다. 오른쪽의 「차례 마치기」를 눌러주세요.';
 const enemy=state.enemies.find(e=>e.pos===h.pos&&e.hp>0);
 if(enemy)return `${enemy.name}와 마주쳤습니다! 「공격」을 누르면 주사위를 굴려 싸웁니다. 체력이 낮다면 적이 없는 칸으로 물러나 회복하세요.`;
 if(state.seals===3&&h.pos==='D1'&&!state.enemies.some(e=>e.boss))return '세 봉인을 모았습니다. 「용 소환」을 눌러 마지막 레이드를 시작하세요.';
 const q=quests.find(q=>q.pos===pinnedQuest),goal=state.seals===3?'D1':pinnedQuest;
 const step=nextStep(h.pos,goal);
 return `다음 목표: ${state.seals===3?'드래곤의 둥지':q?.title||'지역 퀘스트'} · ${goal}. 지도에서 ${step} 칸을 터치해 이동해 보세요.${state.seals<3?' 남은 지역 '+(3-state.seals)+'곳.':''}`;
}
function updateControls(){
 if(!state)return;
 const h=E.hero(state),can=state.actions>0&&!state.outcome&&!state.pending.length&&h.hp>0;
 const enemy=state.enemies.find(e=>e.hp>0&&e.pos===$('#enemy-target').value);
 const range=enemy?E.dist(h.pos,enemy.pos):Infinity;
 document.body.classList.toggle('in-battle',!!enemy&&range===0);
 const showBattle=!!enemy&&!state.outcome&&scenePreference!=='board'&&(range===0||h.classId===2&&range===1&&scenePreference==='battle');
 $('#combat-scene').hidden=!showBattle;document.body.classList.toggle('combat-mode',showBattle);
 const side=document.querySelector('.side-board');if(showBattle){$('#combat-stage').append(side);$('#combat-title').textContent=enemy.name+'와의 전투';}else returnSideBoard();
 $('#enter-battle').hidden=!(enemy&&range===0&&!showBattle&&!state.outcome);
 $('#enemy-portrait').hidden=!enemy;$('#enemy-portrait').className='enemy-portrait '+({A2:'enemy-wolf',E3:'enemy-troll',B1:'enemy-knight',D1:'enemy-dragon'}[enemy?.pos]||'enemy-wolf');
 $('#enemy-detail').innerHTML=enemy?`<strong>${enemy.name}</strong><span>체력 ${enemy.hp}/${enemy.max} · 방어 ${enemy.def}</span><div class="enemy-health"><i style="width:${100*enemy.hp/enemy.max}%"></i></div><span class="enemy-range">${range===0?'⚔ 전투 중':range+'칸 거리'}</span>`:'지역을 모두 공략했습니다.';
 $('#attack').disabled=!can||range>0;
 $('#rest').disabled=!can||state.enemies.some(e=>e.hp>0&&e.pos===h.pos);
 const ally=state.heroes[Number($('#hero-target').value)];
 const skillValid=h.classId===0||h.classId===1&&range===0||h.classId===2&&range<=1||h.classId===3&&ally&&ally.hp>0&&E.dist(h.pos,ally.pos)<=1;
 $('#skill').disabled=!can||h.used||!skillValid;
}
$('#enemy-target').addEventListener('change',updateControls);
$('#hero-target').addEventListener('change',updateControls);
$('#start').addEventListener('click',()=>{try{resultDismissed=false;pinnedQuest='A2';state=E.create([...classPicker.querySelectorAll('input:checked')].map(x=>Number(x.value)));persist();render();}catch(error){$('#setup-error').textContent=error.message;}});
function restart(){if(confirm('현재 모험을 지우고 새로운 파티를 만들까요?')){closePanels();$('#result-modal').close();resultDismissed=false;state=null;try{localStorage.removeItem(SAVE);}catch{}message('');render();}}
$('#new-game').addEventListener('click',restart);$('#result-new').addEventListener('click',restart);
$('#attack').addEventListener('click',()=>execute('attack',{pos:$('#enemy-target').value}));
$('#skill').addEventListener('click',()=>execute('skill',{pos:$('#enemy-target').value,hero:Number($('#hero-target').value)}));
$('#rest').addEventListener('click',()=>execute('rest'));
$('#summon').addEventListener('click',()=>execute('summon'));
$('#end-turn').addEventListener('click',()=>execute('end'));
function returnSideBoard(){const side=document.querySelector('.side-board');if(side&&side.parentElement!==document.querySelector('.arena'))document.querySelector('.arena').append(side);}
$('#back-board').addEventListener('click',()=>{scenePreference='board';updateControls();});
$('#enter-battle').addEventListener('click',()=>{scenePreference='battle';updateControls();});
function showHero(index){const h=state.heroes[index],c=E.classes[h.classId];$('#detail-hero-name').textContent=c.name;$('#hero-detail').innerHTML=`<div class="detail-portrait portrait portrait-${portraits[h.classId]}"></div><div class="detail-statline"><span>체력 <b>${h.hp}/${c.hp}</b></span><span>공격 <b>${c.atk+(h.xp>=1?1:0)}</b></span><span>피해 <b>${c.dmg+(h.xp>=3?1:0)}</b></span></div><h3>${c.skill}</h3><p>${c.desc}. 행동 1개 · 차례당 1회.</p><p>위치 ${h.pos} · 경험치 ${h.xp} · 레벨 ${h.xp>=3?3:h.xp>=1?2:1}</p><p>보유 전리품: ${h.items.map(id=>E.items[id].name).join(', ')||'없음'}</p>`;closePanels();$('#hero-modal').showModal();}
function closePanels(){for(const id of ['quest-modal','bag-modal','log-modal','rules-modal','hero-modal'])if($('#'+id).open)$('#'+id).close();}
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{closePanels();$('#'+button.dataset.open).showModal();}));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.close==='result-modal')resultDismissed=true;$('#'+button.dataset.close).close();}));
$('#result-modal').addEventListener('cancel',()=>{resultDismissed=true;});
$('#reward').addEventListener('cancel',event=>event.preventDefault());
try{const saved=JSON.parse(localStorage.getItem(SAVE));if(saved){if(saved.version!==1||!Array.isArray(saved.heroes)||saved.heroes.length<1||saved.heroes.length>4||saved.heroes.some(h=>!E.classes[h.classId])||!saved.heroes[saved.active]||!Array.isArray(saved.enemies)||!Array.isArray(saved.pending)||!Array.isArray(saved.log))throw Error('invalid save');state=saved;render();}}catch{state=null;$('#setup-error').textContent='저장 기록을 읽을 수 없어 새 모험을 준비했습니다.';}
render();

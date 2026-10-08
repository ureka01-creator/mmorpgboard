'use strict';
const E=window.Elderfall;
const $=selector=>document.querySelector(selector);
const SAVE='elderfall-game-v1';
let state=null, storageAvailable=true;
const classPicker=$('#class-picker');
E.classes.forEach((c,i)=>{const label=document.createElement('label');label.className='class-choice';label.innerHTML=`<input type="checkbox" value="${i}" ${i===0?'checked':''}><strong>${c.name}</strong><span>체력 ${c.hp} · ${c.skill}</span>`;classPicker.append(label);});
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(state));}catch{storageAvailable=false;}}
function message(text){$('#feedback').textContent=text;}
function option(select,value,text){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}
function execute(type,arg={}){try{E.apply(state,type,arg);message('');persist();render();}catch(error){message(error.message);}}
const names={A2:'숲',E3:'폐광',B1:'성채',D1:'둥지',C5:'마을'};
function render(){
 if(!state){$('#setup').hidden=false;$('#game').hidden=true;return;}
 $('#setup').hidden=true;$('#game').hidden=false;
 const h=E.hero(state),c=E.classes[h.classId],can=state.actions>0&&!state.outcome&&!state.pending.length&&h.hp>0;
 $('#turn-title').textContent=`${c.name}의 차례`;
 $('#game-status').textContent=`라운드 ${state.round}/10 · 봉인 ${state.seals}/3 · 남은 행동 ${state.actions}`;
 $('#save-notice').textContent=storageAvailable?'이 브라우저에 자동 저장 중':'브라우저 저장을 사용할 수 없습니다. 페이지를 닫으면 진행이 사라집니다.';
 $('#outcome').hidden=!state.outcome;$('#outcome').textContent=state.outcome==='win'?'승리! 잿빛 용을 처치했습니다.':state.outcome==='lose'?'모험 종료. 새 파티로 다시 도전해 보세요.':'';
 $('#board').replaceChildren();
 for(let row=1;row<=5;row++)for(const col of 'ABCDE'){
  const pos=col+row,enemy=state.enemies.find(e=>e.pos===pos&&e.hp>0),occupants=state.heroes.filter(hero=>hero.pos===pos);
  const tile=document.createElement('button');tile.className=`tile ${pos==='C5'?'village':pos==='D1'?'lair':pos==='A2'?'forest':pos==='E3'?'mine':pos==='B1'?'keep':''} ${pos===h.pos?'current':''} ${can&&E.dist(h.pos,pos)===1?'reachable':''}`;
  tile.disabled=!can||E.dist(h.pos,pos)!==1;
  tile.setAttribute('aria-label',`${pos} ${names[pos]||'황야'}${enemy?' '+enemy.name+' 체력 '+enemy.hp:''}${occupants.length?' '+occupants.map(x=>E.classes[x.classId].name).join(', '):''}`);
  const coord=document.createElement('span');coord.className='coord';coord.textContent=pos;
  const label=document.createElement('strong');label.className='tile-name';label.textContent=names[pos]||'·';
  const info=document.createElement('span');info.className='enemy-hp';info.textContent=enemy?`${enemy.name} ${enemy.hp}/${enemy.max}`:'';
  const tokens=document.createElement('span');tokens.className='tokens';tokens.textContent=occupants.map(x=>E.classes[x.classId].name+(x.hp===0?'†':'')).join(' · ');
  tile.append(coord,label,info,tokens);tile.addEventListener('click',()=>execute('move',{pos}));$('#board').append(tile);
 }
 $('#party').replaceChildren();state.heroes.forEach((hero,i)=>{const cl=E.classes[hero.classId],card=document.createElement('article');card.className='hero-panel'+(i===state.active?' active':'');card.innerHTML=`<h3>${cl.name}${i===state.active?' · 현재':''}</h3><p>체력 ${hero.hp}/${cl.hp} · ${hero.pos}</p><meter min="0" max="${cl.hp}" value="${hero.hp}" aria-label="${cl.name} 체력"></meter><p>레벨 ${hero.xp>=3?3:hero.xp>=1?2:1} · 공격 ${cl.atk+(hero.xp>=1?1:0)} · 피해 ${cl.dmg+(hero.xp>=3?1:0)}</p><p class="muted">${hero.items.map(id=>E.items[id].name).join(' · ')||'전리품 없음'}${hero.guard?' · 방어 태세':''}</p>`;$('#party').append(card);});
 $('#active-info').textContent=`${h.pos} · 체력 ${h.hp}/${c.hp} · 행동 ${state.actions}개`;
 const oldEnemy=$('#enemy-target').value,oldHero=$('#hero-target').value,oldBoot=$('#boot-target').value;
 $('#enemy-target').replaceChildren();state.enemies.filter(e=>e.hp>0).forEach(e=>option($('#enemy-target'),e.pos,`${e.name} · ${e.pos} · 체력 ${e.hp}`));
 if([...$('#enemy-target').options].some(o=>o.value===oldEnemy))$('#enemy-target').value=oldEnemy;
 else {const nearby=state.enemies.find(e=>e.hp>0&&E.dist(h.pos,e.pos)===(h.classId===2?Math.min(1,E.dist(h.pos,e.pos)):0));if(nearby)$('#enemy-target').value=nearby.pos;}
 $('#hero-target').replaceChildren();state.heroes.forEach((hero,i)=>option($('#hero-target'),i,`${E.classes[hero.classId].name} · ${hero.pos} · 체력 ${hero.hp}`));$('#hero-target').value=[...$('#hero-target').options].some(o=>o.value===oldHero)?oldHero:state.active;
 $('#boot-target').replaceChildren();for(let row=1;row<=5;row++)for(const col of 'ABCDE'){const pos=col+row;if(E.dist(h.pos,pos)>0&&E.dist(h.pos,pos)<=2)option($('#boot-target'),pos,`${pos} ${names[pos]||'황야'}`);}if([...$('#boot-target').options].some(o=>o.value===oldBoot))$('#boot-target').value=oldBoot;
 $('#skill').textContent=c.skill;$('#skill-info').textContent=`${c.desc} · 행동 1개 · 차례당 1회`;
 for(const id of ['attack','rest','skill','summon'])$('#'+id).disabled=!can;
 $('#skill').disabled=!can||h.used;
 $('#summon').disabled=!can||state.seals!==3||h.pos!=='D1'||state.enemies.some(e=>e.boss);
 $('#end-turn').disabled=!!state.outcome||state.pending.length>0;
 $('#inventory').replaceChildren();if(!h.items.length){const p=document.createElement('p');p.className='muted';p.textContent='아직 전리품이 없습니다.';$('#inventory').append(p);}
 h.items.forEach((id,index)=>{const item=E.items[id],div=document.createElement('div');div.className='item-row';const title=document.createElement('p');title.textContent=`${item.name} · ${item.desc}`;const use=document.createElement('button');use.textContent=id===3?'자동 방어':'사용';use.disabled=!can||id===3;use.addEventListener('click',()=>execute('item',{index,pos:id===2?$('#boot-target').value:$('#enemy-target').value}));const trade=document.createElement('button');trade.textContent='전달';trade.disabled=!can;trade.addEventListener('click',()=>execute('trade',{index,hero:Number($('#hero-target').value)}));div.append(title,use,trade);$('#inventory').append(div);});
 $('#reward').hidden=!state.pending.length;$('#reward').replaceChildren();if(state.pending.length){const title=document.createElement('h3');title.textContent=`전리품 배분 · ${E.items[state.pending[0]].name}`;const desc=document.createElement('p');desc.textContent=E.items[state.pending[0]].desc;$('#reward').append(title,desc);state.heroes.forEach((hero,i)=>{const b=document.createElement('button');b.textContent=`${E.classes[hero.classId].name}에게`;b.addEventListener('click',()=>execute('award',{hero:i}));$('#reward').append(b);});}
 updateControls();
 $('#next-goal').textContent=state.outcome?'모험이 끝났습니다. 새 모험으로 다시 시작할 수 있습니다.':state.pending.length?'획득한 전리품을 먼저 배분하세요.':state.actions===0?'행동을 모두 사용했습니다. 차례 마치기를 눌러주세요.':state.seals<3?`다음 목표: 남은 지역 ${3-state.seals}곳에서 봉인을 모으세요.`:!state.enemies.some(e=>e.boss)?'다음 목표: D1 둥지로 이동해 용을 소환하세요.':'다음 목표: 둥지의 용을 공략하세요. 체력이 낮으면 회복 후 합류하세요.';
 $('#game-log').replaceChildren();state.log.slice(0,12).forEach(text=>{const li=document.createElement('li');li.textContent=text;$('#game-log').append(li);});
}
function updateControls(){
 if(!state)return;
 const h=E.hero(state),can=state.actions>0&&!state.outcome&&!state.pending.length&&h.hp>0;
 const enemy=state.enemies.find(e=>e.hp>0&&e.pos===$('#enemy-target').value);
 const range=enemy?E.dist(h.pos,enemy.pos):Infinity;
 $('#attack').disabled=!can||range>0;
 $('#rest').disabled=!can||state.enemies.some(e=>e.hp>0&&e.pos===h.pos);
 const ally=state.heroes[Number($('#hero-target').value)];
 const skillValid=h.classId===0||h.classId===1&&range===0||h.classId===2&&range<=1||h.classId===3&&ally&&ally.hp>0&&E.dist(h.pos,ally.pos)<=1;
 $('#skill').disabled=!can||h.used||!skillValid;
}
$('#enemy-target').addEventListener('change',updateControls);
$('#hero-target').addEventListener('change',updateControls);
$('#start').addEventListener('click',()=>{try{state=E.create([...classPicker.querySelectorAll('input:checked')].map(x=>Number(x.value)));persist();render();$('#game').scrollIntoView({behavior:'smooth'});}catch(error){$('#setup-error').textContent=error.message;}});
$('#new-game').addEventListener('click',()=>{if(confirm('현재 모험을 지우고 새로운 파티를 만들까요?')){state=null;try{localStorage.removeItem(SAVE);}catch{}message('');render();}});
$('#attack').addEventListener('click',()=>execute('attack',{pos:$('#enemy-target').value}));
$('#skill').addEventListener('click',()=>execute('skill',{pos:$('#enemy-target').value,hero:Number($('#hero-target').value)}));
$('#rest').addEventListener('click',()=>execute('rest'));
$('#summon').addEventListener('click',()=>execute('summon'));
$('#end-turn').addEventListener('click',()=>execute('end'));
try{const saved=JSON.parse(localStorage.getItem(SAVE));if(saved){if(saved.version!==1||!Array.isArray(saved.heroes)||saved.heroes.length<1||saved.heroes.length>4||saved.heroes.some(h=>!E.classes[h.classId])||!saved.heroes[saved.active]||!Array.isArray(saved.enemies)||!Array.isArray(saved.pending)||!Array.isArray(saved.log))throw Error('invalid save');state=saved;render();}}catch{state=null;$('#setup-error').textContent='저장 기록을 읽을 수 없어 새 모험을 준비했습니다.';}
render();

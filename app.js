'use strict';
const E=window.ElderRPG,SAVE='elderfall-rpg-v1';
let state=null,mode='move',busy=false,contextId=null,toastTimer,rollTimer,saveProblem=false;
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3800);}
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(state));saveProblem=false;}catch{saveProblem=true;toast('자동 저장을 사용할 수 없습니다. 이 창을 닫으면 진행이 사라질 수 있습니다.');}}
function load(){try{const raw=localStorage.getItem(SAVE);if(!raw)return;const saved=JSON.parse(raw);if(!E.validate(saved))throw Error();state=saved;$('continue').hidden=false;}catch{$('save-notice').textContent='저장된 모험을 읽지 못했습니다. 원본 저장은 그대로 두었습니다. 새 모험으로 다시 시작할 수 있습니다.';}}
function startNew(){busy=false;$('dice-result').hidden=true;clearTimeout(rollTimer);state=E.create();mode='move';contextId=null;persist();showGame();}
function showGame(){$('welcome').hidden=true;$('game').hidden=false;render();}
function act(type,arg={}){
 if(busy)return false;
 const oldRoll=JSON.stringify(state.roll);
 try{E.apply(state,type,arg);persist();if(type!=='select')contextId=null;if(!state.combat)mode='move';render();
  if(JSON.stringify(state.roll)!==oldRoll&&state.roll){showRoll(state.roll);}
  if(type==='attack'||type==='skill'||type==='end'){busy=true;renderActions();setTimeout(()=>{busy=false;renderActions();},550);}
  return true;
 }catch(error){toast(error.message);return false;}
}
function showRoll(roll){clearTimeout(rollTimer);const box=$('dice-result');box.innerHTML=`<small>${esc(roll.actor)} · ${roll.kind==='dialog'?'설득 판정':'명중 판정'}</small><div class="die">${roll.value}</div><p>${roll.value} + ${roll.bonus} ≥ ${roll.dc}<br><b>${roll.success?'성공':'실패'}</b></p>`;box.hidden=false;box.classList.remove('rolling');void box.offsetWidth;box.classList.add('rolling');rollTimer=setTimeout(()=>box.hidden=true,4200);}
function render(){
 const m=E.maps[state.scene];$('location').textContent=m.name;$('scene-type').textContent=state.combat?'TACTICAL ENCOUNTER · CHAPTER I':'ELDERFALL · CHAPTER I';$('goal').textContent=E.goal(state);$('backdrop').classList.toggle('ruins',state.scene==='ruins');$('game').classList.toggle('combat',state.combat);
 $('phase').textContent=state.combat?`교전 ${state.round} · 일행의 차례`:'탐험 · 시간의 흐름은 당신의 선택에';$('resources').textContent=`골드 ${state.gold} · 보급 ${state.supplies}/2`;$('last-log').textContent=state.log[0]||'';
 renderMap();renderParty();renderActions();renderContext();renderDialogue();
 if(state.outcome&&!$('ending').open){$('ending-title').textContent=state.outcome==='victory'?'맹세는 다시 빛난다':'숲에 남겨진 발자국';$('ending-copy').textContent=state.outcome==='victory'?`수호석이 마을로 돌아왔습니다. 일행 ${state.party.length}명 · 신뢰 ${state.reputation>0?'+':''}${state.reputation} · 골드 ${state.gold}. 첫 번째 모험을 완료했습니다. 다른 대화와 전투 선택으로 다시 도전할 수 있습니다.`:'일행이 모두 쓰러졌습니다. 세 명을 모두 모으고, 검사는 앞에서 방어하며 마법사와 치유사를 뒤에 배치해보세요.';$('ending').showModal();}
}
function renderMap(){
 const map=$('map'),h=E.selected(state),reachable=new Map((!state.dialog&&!state.outcome?E.reachable(state):[]).map(p=>[p.x+','+p.y,p.cost]));
 map.innerHTML='';
 for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){
  const blocked=E.maps[state.scene].walls.some(p=>p[0]===x&&p[1]===y),tile=document.createElement('button');tile.className='tile'+(blocked?' blocked':'')+(state.combat&&mode==='move'&&reachable.has(x+','+y)?' reachable':'');tile.dataset.cell=`${x},${y}`;tile.setAttribute('aria-label',`${x+1}열 ${y+1}행${blocked?' 장애물':reachable.has(x+','+y)?' 이동 가능 '+reachable.get(x+','+y)+'칸':''}`);tile.tabIndex=-1;tile.disabled=blocked||!!state.dialog||!!state.outcome;
  tile.addEventListener('click',()=>{if(mode!=='move'){mode='move';renderActions();}if(!state.combat&&state.selected!=='knight')act('select',{id:'knight'});act('move',{x,y});});
  tile.addEventListener('pointerenter',()=>{if(state.combat&&mode==='move'){const p=E.path(state,h,{x,y});if(p&&p.length<=h.ap)for(const c of p)map.querySelector(`[data-cell="${c.x},${c.y}"]`)?.classList.add('path-preview');}});
  tile.addEventListener('pointerleave',()=>map.querySelectorAll('.path-preview').forEach(e=>e.classList.remove('path-preview')));map.append(tile);
 }
 for(const o of E.objects[state.scene]){
  if(o.id==='relic'&&state.quest==='recovered')continue;
  if(o.kind==='talk'&&state.party.some(h=>h.id===o.id))continue;
  const el=entity(o,'npc',o.id==='elder'?'elder':o.id==='relic'?'relic':o.art||null);el.dataset.object=o.id;el.setAttribute('aria-label',o.name+' · '+({talk:'대화',rest:'야영',travel:'이동',collect:'회수'}[o.kind]));
  if(!o.art&&o.id!=='relic')el.querySelector('.visual').innerHTML=`<span class="object-token">${o.kind==='travel'?'➜':o.kind==='rest'?'♧':'◇'}</span>`;
  else el.insertAdjacentHTML('beforeend','<span class="marker">!</span>');el.addEventListener('click',()=>{if(busy)return;if(state.combat){toast('적을 처치한 뒤 살펴볼 수 있습니다.');return;}contextId=o.id;renderContext();});map.append(el);
 }
 for(const u of [...state.enemies,...state.party]){
  const enemy=u.id.startsWith('wolf'),role=E.roles[u.id],el=entity(u,(enemy?'enemy':'ally')+(state.selected===u.id?' selected':'')+(u.hp===0?' dead':''),enemy?'wolf':role.art);el.dataset.unit=u.id;el.setAttribute('aria-label',`${u.name} · HP ${u.hp}/${enemy?u.max:role.hp}`);el.insertAdjacentHTML('beforeend',`<span class="hp-track"><span class="hp-fill" style="width:${u.hp/(enemy?u.max:role.hp)*100}%"></span></span>`);
  el.addEventListener('click',()=>{if(busy)return;if(enemy){if(!state.combat){toast('이 적은 이미 쓰러졌습니다.');return;}act(mode==='skill'?'skill':'attack',{id:u.id});}else if(state.combat&&mode==='skill'&&state.selected==='priest')act('skill',{id:u.id});else act('select',{id:u.id});});
  for(const effect of state.lastEffects.filter(e=>e.id===u.id))el.insertAdjacentHTML('beforeend',`<span class="floating ${effect.kind==='heal'?'heal':''}">${esc(effect.text)}</span>`);map.append(el);
 }
}
function entity(u,kind,art){const el=document.createElement('button');el.className='entity '+kind;el.style.left=(u.x+.5)/E.W*100+'%';el.style.top=(u.y+.5)/E.H*100+'%';el.innerHTML=`<span class="visual">${art?`<span class="map-figure figure-${art}"></span>`:''}</span><span class="name">${esc(u.name)}</span>`;return el;}
function renderParty(){
 $('party').innerHTML=state.party.map(h=>{const r=E.roles[h.id];return `<button class="hero-card ${state.selected===h.id?'active':''}" data-hero="${h.id}" ${h.hp===0?'disabled':''} aria-pressed="${state.selected===h.id}"><span class="portrait art-${r.art}"></span><span><b>${r.name} <small style="display:inline">${r.title}</small></b><small>HP ${h.hp}/${r.hp}</small><small class="ap">${state.combat?'AP '+h.ap+'/4 · ':''}집중 ${h.focus}/3</small></span></button>`;}).join('');
 $('party').querySelectorAll('[data-hero]').forEach(el=>el.addEventListener('click',()=>{if(state.combat&&mode==='skill'&&state.selected==='priest')act('skill',{id:el.dataset.hero});else{mode='move';act('select',{id:el.dataset.hero});}}));
}
function renderActions(){
 const h=E.selected(state),r=E.roles[h.id];
 if(state.dialog){$('action-hint').textContent='대화 진행 중';$('actions').innerHTML='';return;}
 if(!state.combat){$('action-hint').textContent='빈 칸을 눌러 일행 이동 · 인물을 눌러 대화 · ! 표시는 상호작용';$('actions').innerHTML='<button id="focus-party">일행 위치 찾기</button><button id="help-button">조작 안내</button>';$('focus-party').onclick=()=>{const el=$('map').querySelector('[data-unit="knight"]');el?.animate([{filter:'brightness(2)'},{filter:'brightness(1)'}],{duration:700,iterations:2});};$('help-button').onclick=openJournal;return;}
 $('action-hint').textContent=mode==='skill'?`${r.skill} · ${r.description}${h.id==='priest'?' · 파티 카드 또는 지도에서 동료 선택':''}`:mode==='attack'?`기본 공격 · AP 2 · 사거리 ${r.range} · d20+4 ≥ 11 · 적을 누르세요`:`${h.name} · 밝은 칸까지 이동 가능 · 한 칸 AP 1 · 모든 영웅 행동 후 적 차례`;
 const buttons=[['move','이동',false],['attack','공격 · 2',h.ap<2],['skill',r.skill+' · 2',h.ap<2||h.focus<1],['guard',h.guard?'방어 중':'방어 · 1',h.ap<1||h.guard],['end','적 차례 →',false],['flee','후퇴',false]];
 $('actions').innerHTML=buttons.map(([id,label,disabled])=>`<button data-action="${id}" ${disabled||busy?'disabled':''} class="${mode===id?'active':''}" aria-pressed="${mode===id}">${label}</button>`).join('');
 $('actions').querySelectorAll('button').forEach(el=>el.onclick=()=>{const id=el.dataset.action;if(['end','guard','flee'].includes(id)){act(id);return;}if(id==='skill'&&h.id==='knight'){act('skill');return;}mode=id;contextId=null;renderMap();renderActions();renderContext();});
}
function renderContext(){
 const box=$('context'),o=contextId&&E.object(state,contextId);if(!o||state.dialog||state.combat){box.hidden=true;return;}
 const near=E.living(state).some(h=>E.dist(h,o)<=1),action={talk:'대화하기',rest:'야영 · 보급 1 사용',travel:state.scene==='village'?'유적으로 들어가기':'마을로 돌아가기',collect:'수호석 회수'}[o.kind],description={talk:'대화 속 선택이 동료와 마을의 신뢰를 바꿉니다.',rest:'체력 +10 · 집중 3 회복. 보급은 두 번 쓸 수 있습니다.',travel:state.scene==='village'?'유적에는 적이 기다립니다. 동료를 모두 모으고 들어가는 편이 좋습니다.':'수호석을 찾았다면 촌장에게 돌아가세요.',collect:'밤을 지키던 빛. 촌장에게 돌려주어야 합니다.'}[o.kind];
 box.innerHTML=`<button class="close" aria-label="상호작용 닫기">×</button><h3>${esc(o.name)}</h3><p>${description}</p><button id="context-action">${near?action:'가까이 이동'}</button>`;box.hidden=false;box.querySelector('.close').onclick=()=>{contextId=null;box.hidden=true;};$('context-action').onclick=()=>{
  if(near){act('interact',{id:o.id});return;}
  if(state.selected!=='knight'&&!act('select',{id:'knight'}))return;
  const h=E.selected(state),paths=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>E.path(state,h,{x:o.x+dx,y:o.y+dy})).filter(p=>p&&p.length).sort((a,b)=>a.length-b.length);
  if(!paths.length){toast('대상에게 접근할 수 있는 경로가 없습니다.');return;}
  if(act('move',paths[0].at(-1))){contextId=o.id;renderContext();}
 };
}
function renderDialogue(){const box=$('dialogue'),d=E.dialogue(state);box.hidden=!d;if(!d)return;box.innerHTML=`<div class="portrait art-${d.art}"></div><div style="flex:1"><span class="eyebrow">CONVERSATION</span><h2>${esc(d.name)}</h2><p>${esc(d.line)}</p><div class="choices">${d.choices.map(([id,label],i)=>`<button data-choice="${id}"><span>${i+1}.</span>${esc(label)}</button>`).join('')}</div></div>`;box.querySelectorAll('button').forEach(el=>el.onclick=()=>act('choose',{id:el.dataset.choice}));}
function openJournal(){if(!state)return;$('journal-content').innerHTML=`<h3>현재 목표</h3><p>${esc(E.goal(state))}</p><p>일행 ${state.party.length}명 · 골드 ${state.gold} · 보급 ${state.supplies}/2 · 신뢰 ${state.reputation>0?'+':''}${state.reputation}</p><h3>탐험과 전투</h3><ul><li>빈 칸을 눌러 일행을 이동합니다. 인물이나 출구를 누른 뒤 가까이 이동하고 상호작용하세요. 벽과 인물은 통과할 수 없습니다.</li><li>촌장에게 임무를 받고 리엔과 세라를 동료로 모으세요. 대화의 설득 판정은 d20 +2, 목표 12입니다. 실패해도 모험은 계속됩니다.</li><li>전투에서는 파티 카드로 영웅을 선택합니다. 각자 AP 4: 한 칸 이동 1, 공격과 기술 2, 방어 1. 적 차례를 누르면 적이 이동·공격한 뒤 AP가 회복됩니다.</li><li>기본 공격은 d20 +4 ≥ 11이면 명중합니다. 1은 실패, 20은 치명타. 벽 너머는 공격할 수 없습니다. 검사는 인접, 마법사 사거리 5, 치유사 4입니다.</li><li>검사의 회전 베기는 인접한 적 모두에게 7 피해. 마법사의 서리는 피해 6과 적 이동 봉쇄. 치유사는 살아 있는 동료 체력 +8. 기술마다 집중 1, 영웅당 3회. 야영으로 회복하세요.</li><li>방어는 다음 적 공격 피해를 3 줄입니다. 전투 승리 후 쓰러진 동료는 HP 4로 일어납니다. 후퇴하면 골드 2를 잃고 마을로 돌아갑니다. 다시 방문하면 적이 회복됩니다.</li><li>유적 북동쪽 수호석을 회수하고 마을로 돌아가 촌장에게 보고하면 모험이 끝납니다. 결정마다 자동 저장됩니다.</li></ul><h3>모험 기록</h3><ol>${state.log.map(t=>`<li>${esc(t)}</li>`).join('')}</ol><p><small>${saveProblem?'이 브라우저는 자동 저장을 허용하지 않습니다.':'이 기기의 브라우저에 자동 저장됩니다. 기기 간 저장 공유는 지원하지 않습니다.'} 첫 모험은 두 장소와 한 임무로 구성된 개발 중인 시제품입니다.</small></p>`;$('journal').showModal();}
$('start').onclick=()=>{if(state){$('restart-confirm').showModal();}else startNew();};$('continue').onclick=showGame;$('journal-button').onclick=openJournal;$('journal-close').onclick=()=>$('journal').close();$('restart').onclick=()=>$('restart-confirm').showModal();$('restart-cancel').onclick=()=>$('restart-confirm').close();$('restart-confirm-button').onclick=()=>{for(const id of ['restart-confirm','journal','ending'])if($(id).open)$(id).close();startNew();};$('ending-journal').onclick=()=>{$('ending').close();openJournal();};$('ending-restart').onclick=()=>$('restart-confirm').showModal();
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&state){contextId=null;if(state.dialog)act('choose',{id:'leave'});else{mode='move';renderActions();renderContext();}}});
load();

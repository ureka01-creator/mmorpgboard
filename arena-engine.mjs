/** Continuous, renderer-independent dungeon simulation. All damage is resolved here. */
export const VERSION='2.0';
export const rooms=[{x0:-6.2,x1:6.2,z0:-5.5,z1:5.5},{x0:-10.5,x1:-6,z0:1.3,z1:3.7},{x0:-1.6,x1:1.6,z0:-7.5,z1:-5.3},{x0:6,x1:9,z0:-3.8,z1:-1.4}];
export const columns=[[-4,-3],[4,-3],[-4,4],[4,4]];
export const obstacles=[...columns.map(([x,z])=>({x,z,r:.57})),{x:5.1,z:-4.5,r:.55},{x:-5,z:-4.5,r:.5},{x:-9.7,z:3.15,r:.4},{x:5.15,z:4.65,r:.5}];
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angle=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const contains=(x,z)=>rooms.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1);
export function walkable(x,z,r=.29){if(!Number.isFinite(x+z))return false;for(let n=0;n<8;n++){const a=n*Math.PI/4;if(!contains(x+Math.cos(a)*r,z+Math.sin(a)*r))return false;}return !obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<r+o.r);}
export function create(){return {time:0,status:'playing',hero:{x:-2.4,z:2.7,yaw:2.3,hp:40,max:40,r:.29,mode:'idle',elapsed:0,cooldown:0,dodgeCooldown:0,hit:false,swings:0,hits:0,travel:0},enemy:{x:2.4,z:-1.4,yaw:-.8,hp:50,max:50,r:.30,mode:'idle',elapsed:0,cooldown:0,hit:false,travel:0,repath:0,route:[]},events:[],serial:0};}
function emit(s,type,data={}){s.events.push({id:++s.serial,type,time:s.time,...data});if(s.events.length>40)s.events.shift();}
function moveBody(body,dx,dz,other){const length=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(length/.08));let moved=0;
 for(let n=0;n<steps;n++){const oldX=body.x,oldZ=body.z,can=(x,z)=>walkable(x,z,body.r)&&(!other||other.hp<=0||Math.hypot(x-other.x,z-other.z)>=body.r+other.r);
  if(can(body.x+dx/steps,body.z))body.x+=dx/steps;if(can(body.x,body.z+dz/steps))body.z+=dz/steps;moved+=Math.hypot(body.x-oldX,body.z-oldZ);}
 body.travel+=moved;return moved;
}
export function clearLine(a,b,r=.3){const d=distance(a,b),n=Math.ceil(d/.15);for(let i=0;i<=n;i++){const t=n?i/n:0;if(!walkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,r))return false;}return true;}
export function route(from,to){
 if(!walkable(to.x,to.z))return null;if(clearLine(from,to))return [{x:to.x,z:to.z}];
 const grid=.5,key=(x,z)=>x+','+z,start={x:Math.round(from.x/grid),z:Math.round(from.z/grid)},goal={x:Math.round(to.x/grid),z:Math.round(to.z/grid)},queue=[{...start,cost:0,rank:0}],costs=new Map([[key(start.x,start.z),0]]),prev=new Map();let found=null;
 for(let tries=0;queue.length&&tries<1600;tries++){queue.sort((a,b)=>a.rank-b.rank);const p=queue.shift();if(p.x===goal.x&&p.z===goal.z){found=p;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=p.x+dx,z=p.z+dz;if(!walkable(x*grid,z*grid)||dx&&dz&&(!walkable((p.x+dx)*grid,p.z*grid)||!walkable(p.x*grid,(p.z+dz)*grid)))continue;const cost=p.cost+Math.hypot(dx,dz),k=key(x,z);if(cost>=(costs.get(k)??Infinity))continue;costs.set(k,cost);prev.set(k,p);queue.push({x,z,cost,rank:cost+Math.hypot(x-goal.x,z-goal.z)});}
 }
 if(!found)return null;const result=[];let p=found;while(p.x!==start.x||p.z!==start.z){result.push({x:p.x*grid,z:p.z*grid});p=prev.get(key(p.x,p.z));if(!p)return null;}result.reverse();result.push({x:to.x,z:to.z});return result;
}
export function invulnerable(hero){return hero.mode==='dodge'&&hero.elapsed<.29;}
export function step(s,input={},dt=1/60){
 if(!Number.isFinite(dt)||dt<=0||dt>.251)throw Error('Invalid simulation interval');if(s.status!=='playing')return s;
 s.time+=dt;const h=s.hero,e=s.enemy;for(const a of [h,e]){a.elapsed+=dt;a.cooldown=Math.max(0,a.cooldown-dt);}h.dodgeCooldown=Math.max(0,h.dodgeCooldown-dt);
 let x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0;const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
 if(input.dodge&&h.dodgeCooldown===0&&h.mode!=='dodge'){h.mode='dodge';h.elapsed=0;h.hit=true;h.dodgeCooldown=1.45;if(Math.hypot(x,z)>.1)h.yaw=Math.atan2(x,z);emit(s,'dodge');}
 else if(input.attack&&h.cooldown===0&&h.mode!=='dodge'){h.mode='attack';h.elapsed=0;h.hit=false;h.cooldown=.72;h.swings++;if(distance(h,e)<3.2&&e.hp>0)h.yaw=angle(h,e);emit(s,'swing',{who:'hero'});}
 if(h.mode==='dodge'){moveBody(h,Math.sin(h.yaw)*7.0*dt,Math.cos(h.yaw)*7.0*dt,e);if(h.elapsed>=.34){h.mode='idle';h.elapsed=0;}}
 else {const speed=h.mode==='attack'?1.1:3.3,moving=moveBody(h,x*speed*dt,z*speed*dt,e)>.0001;if(h.mode!=='attack'){h.mode=moving?'walk':'idle';if(moving)h.yaw=Math.atan2(x,z);}}
 if(h.mode==='attack'){
  if(h.elapsed>=.26&&!h.hit){h.hit=true;if(e.hp>0&&distance(h,e)<=1.85&&Math.abs(wrap(angle(h,e)-h.yaw))<=1.02&&clearLine(h,e,.08)){e.hp=Math.max(0,e.hp-10);h.hits++;if(e.hp===0){e.mode='dead';e.elapsed=0;}else if(!['windup','attack'].includes(e.mode)){e.mode='hurt';e.elapsed=0;e.cooldown=.65;}emit(s,'hit',{who:'enemy',amount:10});if(e.hp===0){s.status='won';h.mode='idle';h.elapsed=0;emit(s,'won');}}else emit(s,'miss');}
  if(h.elapsed>=.66){h.mode='idle';h.elapsed=0;}
 }
 if(e.hp<=0)return s;
 if(e.mode==='hurt'){if(e.elapsed>=.30){e.mode='idle';e.elapsed=0;}return s;}
 const range=distance(h,e);
 if(e.mode==='windup'){
  if(e.elapsed>=.72){e.mode='attack';e.elapsed=0;e.hit=false;emit(s,'swing',{who:'enemy'});}
 }else if(e.mode==='attack'){
  if(e.elapsed>=.18&&!e.hit){e.hit=true;if(distance(h,e)<1.7&&Math.abs(wrap(angle(e,h)-e.yaw))<1.08&&clearLine(e,h,.08)&&!invulnerable(h)){h.hp=Math.max(0,h.hp-8);emit(s,'hit',{who:'hero',amount:8});if(h.hp===0){h.mode='dead';h.elapsed=0;s.status='lost';emit(s,'lost');}}else emit(s,'evade');}
  if(e.elapsed>=.6){e.mode='idle';e.elapsed=0;e.cooldown=.75;}
 }else if(range<1.5&&e.cooldown===0){e.mode='windup';e.elapsed=0;e.yaw=angle(e,h);emit(s,'warning');}
 else if(range<8){let target=h;e.repath-=dt;if(!clearLine(e,h,e.r)){if(e.repath<=0){e.route=route(e,h)||[];e.repath=.65;}while(e.route.length&&distance(e,e.route[0])<.25)e.route.shift();target=e.route[0]||e;}else e.route=[];
  const d=distance(e,target);if(d>.8||target!==h&&d>.1){const moved=moveBody(e,(target.x-e.x)/Math.max(d,.001)*1.65*dt,(target.z-e.z)/Math.max(d,.001)*1.65*dt,h);e.mode=moved>.0001?'walk':'idle';if(moved)e.yaw=angle(e,target);}else e.mode='idle';
 }else e.mode='idle';return s;
}

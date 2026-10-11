/** Minimal movement/attack rules; rendering and animation never decide damage. */
export const WIDTH=12,HEIGHT=10,TILE=1.4;
export const obstacles=[[4,3],[4,4],[7,5],[7,6]];
export const create=()=>({hero:{x:2,z:7,hp:30,max:30},enemy:{x:9,z:2,hp:24,max:24},attacks:0});
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const inside=(x,z)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<WIDTH&&z<HEIGHT;
export function blocked(s,x,z){return !inside(x,z)||obstacles.some(p=>p[0]===x&&p[1]===z)||(s.enemy.hp>0&&s.enemy.x===x&&s.enemy.z===z);}
export function path(s,to){
 if(!to||blocked(s,to.x,to.z))return null;
 const start=s.hero,queue=[{x:start.x,z:start.z,cost:0,steps:[]}],costs=new Map([[start.x+','+start.z,0]]);
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const p=queue.shift();if(p.x===to.x&&p.z===to.z)return p.steps;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=p.x+dx,z=p.z+dz;if(blocked(s,x,z)||dx&&dz&&(blocked(s,p.x+dx,p.z)||blocked(s,p.x,p.z+dz)))continue;
   const c=p.cost+Math.hypot(dx,dz),key=x+','+z;if(c>=(costs.get(key)??Infinity))continue;
   costs.set(key,c);queue.push({x,z,cost:c,steps:[...p.steps,{x,z}]});
  }
 }return null;
}
export function approach(s){if(distance(s.hero,s.enemy)<=1.5)return [];const routes=[];
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const p=path(s,{x:s.enemy.x+dx,z:s.enemy.z+dz});if(p)routes.push(p);}
 routes.sort((a,b)=>routeCost(s.hero,a)-routeCost(s.hero,b));return routes[0]??null;
}
export function routeCost(start,route){let last=start,total=0;for(const p of route){total+=distance(last,p);last=p;}return total;}
export function move(s,to){const p=path(s,to);if(!p||!p.length)throw Error('그곳으로 갈 수 없습니다.');s.hero.x=to.x;s.hero.z=to.z;return p;}
export function attack(s){if(s.hero.hp<=0||s.enemy.hp<=0)throw Error('이미 교전이 끝났습니다.');if(distance(s.hero,s.enemy)>1.5)throw Error('적에게 더 가까이 이동하세요.');s.enemy.hp=Math.max(0,s.enemy.hp-6);s.attacks++;return 6;}
export function counter(s){if(s.hero.hp<=0||s.enemy.hp<=0||distance(s.hero,s.enemy)>1.5)throw Error('반격할 수 없습니다.');s.hero.hp=Math.max(0,s.hero.hp-4);return 4;}
export const world=(cell)=>({x:(cell.x-(WIDTH-1)/2)*TILE,z:(cell.z-(HEIGHT-1)/2)*TILE});
export const cell=(p)=>({x:Math.round(p.x/TILE+(WIDTH-1)/2),z:Math.round(p.z/TILE+(HEIGHT-1)/2)});

export const DIRECTIONS=['S','SE','E','NE','N','NW','W','SW'];
const wrap=n=>Math.atan2(Math.sin(n),Math.cos(n));
export function facing(yaw,viewYaw,previous){
 const angle=wrap(yaw-viewYaw);
 if(previous!==undefined&&Math.abs(wrap(angle-previous*Math.PI/4))<Math.PI/8+.06)return previous;
 return (Math.round(angle/(Math.PI/4))+8)%8;
}
export function spritePose(body,phase,time,direction=0,refined=false){
 const mode=body.mode,t=Math.max(0,body.elapsed||0);
 if(refined){
  if(mode==='walk'||mode==='dodge'&&Number.isFinite(body.dashPhase))return {clip:'run',frame:((Math.floor((body.dashPhase??phase)*12)%12)+12)%12};
  if(mode==='attack'){
   const enemy=body.max===50,hit=enemy?.18:.26;
   if(t>=.62)return {clip:'idle',frame:0};
   const frame=t<hit?(enemy?(t<.07?2:3):t<.08?0:t<.14?1:t<.22?2:3):t<hit+.10?4:t<hit+.24?5:6;
   return {clip:'attack',frame};
  }
  if(mode==='windup')return {clip:'attack',frame:t<.18?0:t<.36?1:2};
  if(mode==='dodge'||mode==='dead')return {clip:'roll',frame:mode==='dead'?2:Math.min(3,Math.floor(t/.34*4))};
  return {clip:'idle',frame:0};
 }
 const rear=direction>=4&&direction<=6,prepared=rear?2:1;
 if(mode==='attack'){
  const enemy=body.max===50,hit=enemy?.18:.26;
  // N/NW/W artwork raises the blade in cell 2 and cuts in cell 3.
  // SW returns to a front view and cuts in cell 2, like S/SE/E/NE.
  // An enemy already raised its sword during windup: never restart at ready.
  // Return to the actual lowered guard, rather than raising the sword again
  // by replaying the attack's first (anticipation) drawing.
  if(t>=hit+(rear?.20:.28))return {clip:'idle',frame:0};
  let frame;
  if(t<hit)frame=enemy?prepared:rear?(t<.10?0:t<.18?1:2):(t<.10?0:1);
  else if(t<hit+.12)frame=rear?3:2;
  else frame=3;
  return {clip:'attack',frame};
 }
 if(mode==='windup')return {clip:'attack',frame:t<.30?0:prepared};
 if(mode==='dodge')return {clip:'roll',frame:Math.min(3,Math.floor(t/.34*4))};
 if(mode==='dead')return {clip:'roll',frame:2};
 if(mode==='hurt')return {clip:'idle',frame:1};
 if(mode==='walk')return {clip:'run',frame:((Math.floor(phase*8)%8)+8)%8};
 return {clip:'idle',frame:Math.floor(time/1.2)%4};
}

// One committed cut: draw back, raise, cut, recover. The old thrust (3) and
// second raised-blade pose (5) are excluded. Damage remains on the engine clock.
export function motionSegment(body,phase,direction){
 const key=(clip,i)=>`${direction}:${clip}:${i}`;
 if(body.mode==='walk'||body.mode==='dodge'&&Number.isFinite(body.dashPhase)){
  const p=((((body.dashPhase??phase)%1)+1)%1)*12,i=Math.floor(p);
  return {a:key('run',i),b:key('run',(i+1)%12),t:p-i};
 }
 if(body.mode!=='attack'&&body.mode!=='windup')return null;
 const enemy=body.max===50,t=Math.max(0,body.elapsed||0);
 let keys;
 const directRaise=direction===2||direction===4;
 // These two projected preparation drawings reverse the blade before raising it.
 if(body.mode==='windup')keys=directRaise?[[0,0],[.72,2]]:[[0,0],[.28,1],[.72,2]];
 else if(enemy)keys=[[0,2],[.18,4],[.205,4],[.52,6]];
 else keys=directRaise?[[0,0],[.19,2],[.26,4],[.285,4],[.56,6]]:[[0,0],[.105,1],[.19,2],[.26,4],[.285,4],[.56,6]];
 if(body.entryDelay>0&&keys[0][1]===0)keys.splice(1,0,[Math.min(body.entryDelay,.08),0]);
 let j=1;while(j<keys.length&&t>=keys[j][0])j++;
 if(j>=keys.length)return {a:key('attack',keys.at(-1)[1]),b:key('attack',keys.at(-1)[1]),t:0};
 const [start,a]=keys[j-1],[end,b]=keys[j];let mix=(t-start)/(end-start);
 // Leave the resting guard at zero speed and settle into it without a hard
 // stop. Interior strike segments and the engine's exact contact stay intact.
 if(a===0&&(b===1||b===2)&&(body.mode==='windup'||!enemy))mix=mix*mix*(2-mix);
 if(j===keys.length-1&&body.mode==='attack')mix=mix+mix*mix-mix*mix*mix;
 return {a:key('attack',a),b:key('attack',b),t:mix};
}

// Exact critically damped response; stable for variable display rates and pauses.
export function settleLocomotion(blend,target,dt){
 if(dt<=0)return;
 const omega=60,error=blend.weight-target,c=blend.velocity+omega*error,decay=Math.exp(-omega*dt);
 blend.weight=target+(error+c*dt)*decay;blend.velocity=(blend.velocity-omega*c*dt)*decay;
 if(blend.weight<0||blend.weight>1){blend.weight=Math.max(0,Math.min(1,blend.weight));blend.velocity=0;}
 if(Math.abs(blend.weight-target)<.0005&&Math.abs(blend.velocity)<.025){blend.weight=target;blend.velocity=0;}
}

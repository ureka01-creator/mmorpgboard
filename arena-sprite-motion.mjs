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
  if(mode==='walk')return {clip:'run',frame:((Math.floor(phase*12)%12)+12)%12};
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

export const DIRECTIONS=['S','SE','E','NE','N','NW','W','SW'];
const wrap=n=>Math.atan2(Math.sin(n),Math.cos(n));
export function facing(yaw,viewYaw,previous){
 const angle=wrap(yaw-viewYaw);
 if(previous!==undefined&&Math.abs(wrap(angle-previous*Math.PI/4))<Math.PI/8+.06)return previous;
 return (Math.round(angle/(Math.PI/4))+8)%8;
}
export function spritePose(body,phase,time){
 const mode=body.mode,t=Math.max(0,body.elapsed||0);
 if(mode==='attack'){
  const hit=body.max===50?.18:.26;
  return {clip:'attack',frame:t<hit*.55?0:t<hit?1:t<hit+.12?2:3};
 }
 if(mode==='windup')return {clip:'attack',frame:t<.48?0:1};
 if(mode==='dodge')return {clip:'roll',frame:Math.min(3,Math.floor(t/.34*4))};
 if(mode==='dead')return {clip:'roll',frame:2};
 if(mode==='hurt')return {clip:'idle',frame:1};
 if(mode==='walk')return {clip:'run',frame:((Math.floor(phase*8)%8)+8)%8};
 return {clip:'idle',frame:Math.floor(time/1.2)%4};
}

/** Presentation snapshots only. Combat and collision remain on the fixed clock. */
export class Presentation {
 constructor(state){
  this.previous={};this.current={};this.bodies={hero:{},enemy:{}};
  for(const key of ['hero','enemy'])this.previous[key]=this.current[key]={...state[key],gaitTravel:0};
 }
 capture(state){
  for(const key of ['hero','enemy']){
   const before=this.current[key],body=state[key];this.previous[key]=before;
   // Fast evasion uses a separate visual stride from normal walking.
   const travel=before.mode==='dodge'||body.mode==='dodge'?0:Math.max(0,body.travel-before.travel);
   this.current[key]={...body,gaitTravel:before.gaitTravel+travel};
  }
 }
 sample(alpha){
  alpha=Math.max(0,Math.min(1,alpha));
  for(const key of ['hero','enemy']){
   const before=this.previous[key],now=this.current[key],out=this.bodies[key];Object.assign(out,now);
   for(const field of ['x','z','travel','gaitTravel'])out[field]=before[field]+(now[field]-before[field])*alpha;
   if(before.mode===now.mode&&now.elapsed>=before.elapsed)out.elapsed=before.elapsed+(now.elapsed-before.elapsed)*alpha;
   // A resolved hit must show contact immediately, even at a sub-tick render.
   if(now.mode==='attack'&&now.hit&&!before.hit)out.elapsed=Math.max(out.elapsed,now.max===50?.18:.26);
  }
  return this.bodies;
 }
}

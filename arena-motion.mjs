// Frame-rate independent blending and shortest-arc facing.
export const damp=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
export function turn(a,b,dt,rate=18,maxSpeed=12){const delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+Math.max(-maxSpeed*dt,Math.min(maxSpeed*dt,delta*(1-Math.exp(-rate*dt))));}

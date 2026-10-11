// Locomotion geometry independent of the renderer; metres and radians.
export const TAU=Math.PI*2;
export const damp=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
export function turn(a,b,dt,rate=18,maxSpeed=12){const delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+Math.max(-maxSpeed*dt,Math.min(maxSpeed*dt,delta*(1-Math.exp(-rate*dt))));}
export function footCycle(phase){const p=((phase%1)+1)%1;if(p<.5)return {stance:true,z:.35-.70*p/.5,lift:0};const t=(p-.5)/.5,s=t*t*(3-2*t);return {stance:false,z:-.35+.70*s,lift:.14*Math.sin(Math.PI*t)};}
export function legIK(y,z){const a=.43,b=.40,d=Math.max(.12,Math.min(a+b-.001,Math.hypot(y,z)));const knee=Math.PI-Math.acos(Math.max(-1,Math.min(1,(a*a+b*b-d*d)/(2*a*b))));const hip=Math.atan2(-z,-y)-Math.acos(Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d))));return {hip,knee,ankle:-hip-knee};}

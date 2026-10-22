import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createEquipment} from './warrior-equipment.mjs?v=2.1';
const status=document.getElementById('status'),play=document.getElementById('play'),slider=document.getElementById('time'),clock=document.getElementById('clock');
try{
 const base='./assets/sprites/native-motion/',manifest=await fetch(base+'manifest.json?v=2').then(r=>{if(!r.ok)throw Error('Manifest HTTP '+r.status);return r.json();});
 const asset=await new GLTFLoader().loadAsync('./assets/animation-resources/quaternius/AnimationLibrary_Godot_Standard.gltf'),textures={};
 await Promise.all(Object.entries(manifest.clips).map(async([key,c])=>{const t=await new T.TextureLoader().loadAsync(base+c.file+'?v=2');t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=false;textures[key]=t;}));
 const response=await fetch(base+manifest.flow.file+'?v=2');if(!response.ok)throw Error('Flow HTTP '+response.status);const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),raw=new Int16Array(bytes),[fw,fh]=manifest.flow.grid,cols=manifest.flow.columns,rows=manifest.flow.rows;
 if(raw.length!==48*fw*fh*4)throw Error('Invalid flow field length');
 const pixels=new Uint16Array(cols*fw*rows*fh*4);for(let p=0;p<48;p++)for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)for(let k=0;k<4;k++)pixels[(((Math.floor(p/cols)*fh+y)*cols*fw+(p%cols)*fw+x)*4+k)]=T.DataUtils.toHalfFloat(raw[((p*fh+y)*fw+x)*4+k]/32767*.5);
 const flow=new T.DataTexture(pixels,cols*fw,rows*fh,T.RGBAFormat,T.HalfFloatType);flow.minFilter=flow.magFilter=T.LinearFilter;flow.needsUpdate=true;
 const canvas=document.getElementById('view'),renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setScissorTest(true);renderer.outputColorSpace=T.SRGBColorSpace;
 const model=asset.scene,wrapper=new T.Group();wrapper.add(model);model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model);wrapper.scale.setScalar(1.85/bounds.getSize(new T.Vector3()).y);wrapper.position.y=-bounds.min.y*wrapper.scale.y;
 const nativeScene=new T.Scene();nativeScene.add(wrapper,new T.HemisphereLight(0xcddbcc,0x57614b,2.5));const light=new T.DirectionalLight(0xffebce,3);light.position.set(-3,6,4);nativeScene.add(light);
 const hand=model.getObjectByName('DEF-handR')||model.getObjectByName('DEF-hand.R'),prop=new T.Group(),steel=new T.MeshStandardMaterial({color:0xc6d1d9,metalness:.7,roughness:.35}),blade=new T.Mesh(new T.BoxGeometry(.065,.72,.022),steel);blade.position.y=.47;prop.add(blade);const guard=new T.Mesh(new T.BoxGeometry(.23,.035,.06),steel);guard.position.y=.09;prop.add(guard);prop.add(new T.Mesh(new T.BoxGeometry(.055,.16,.055),new T.MeshStandardMaterial({color:0x694831})));prop.rotation.x=Math.PI/2;prop.position.y=.07;hand.add(prop);
 const nativeCamera=new T.OrthographicCamera(-1.2,1.2,1.2,-1.2,.01,40);nativeCamera.position.set(0,12,8.4);nativeCamera.lookAt(0,.9,0);
 const artScene=new T.Scene(),artCamera=new T.OrthographicCamera(-1.2,1.2,1.2,-1.2,.01,20);artCamera.position.z=5;
 const masks=new Uint16Array(256*48*4);Object.values(manifest.clips).forEach(c=>c.contours.forEach((frame,i)=>frame.forEach(([lo,hi],row)=>{const at=((c.flowOffset+i)*256+row)*4;masks[at]=T.DataUtils.toHalfFloat(lo/256);masks[at+1]=T.DataUtils.toHalfFloat(hi/256);})));const mask=new T.DataTexture(masks,256,48,T.RGBAFormat,T.HalfFloatType);mask.needsUpdate=true;
 const u={atlas:{value:textures.walk},field:{value:flow},mask:{value:mask},indices:{value:new T.Vector2()},frameA:{value:new T.Vector2()},frameB:{value:new T.Vector2()},pair:{value:new T.Vector2()},amount:{value:0}};
 const material=new T.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
 varying vec2 v;uniform sampler2D atlas,field,mask;uniform vec2 frameA,frameB,pair,indices;uniform float amount;
 vec4 art(vec2 uv,vec2 cell,float index){if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return vec4(0.0);vec2 limits=texture2D(mask,vec2((floor((1.0-uv.y)*256.0)+.5)/256.0,(index+.5)/48.0)).rg;if(uv.x<limits.x||uv.x>limits.y)return vec4(0.0);uv=clamp(uv,vec2(.002),vec2(.998));return texture2D(atlas,(cell+uv)/vec2(6.0,4.0));}
 void main(){vec4 f=texture2D(field,(pair+clamp(vec2(v.x,1.0-v.y),vec2(${.5/fw}),vec2(${1-.5/fw})))/vec2(${cols}.0,${rows}.0));
 vec4 a=art(v-vec2(f.x,-f.y)*amount,frameA,indices.x),b=art(v-vec2(f.z,-f.w)*(1.0-amount),frameB,indices.y);vec4 body=amount<.5?a:b;if(body.a<.025)discard;
 gl_FragColor=body;
 #include <colorspace_fragment>
 }`});
 const equipment=await createEquipment(artScene,model,textures.walk);
 const art=new T.Mesh(new T.PlaneGeometry(3.4,3.4),material);artScene.add(art);
 const mixer=new T.AnimationMixer(model),clips=new Map(asset.animations.map(c=>[c.name,c]));let active='walk',action,elapsed=0,playing=true,speed=1,last=performance.now(),dirty=true;
 const renderSize=new T.Vector2();
 function setClip(name){if(!manifest.clips[name])throw Error('Unknown clip '+name);active=name;elapsed=0;mixer.stopAllAction();action=mixer.clipAction(clips.get(manifest.clips[name].sourceClip));action.reset().setLoop(T.LoopRepeat,Infinity).play();u.atlas.value=textures[name];art.scale.setScalar(manifest.clips[name].displayScale);prop.visible=name==='attack';art.visible=name==='attack';document.getElementById('walk').setAttribute('aria-pressed',String(name==='walk'));document.getElementById('attack').setAttribute('aria-pressed',String(name==='attack'));document.getElementById('native-info').textContent=manifest.clips[name].sourceClip+' · '+manifest.clips[name].duration.toFixed(3)+'초';dirty=true;}
 function render(){const w=Math.round(canvas.clientWidth),h=Math.round(canvas.clientHeight);if(!w||!h)return;renderer.getSize(renderSize);if(renderSize.x!==w||renderSize.y!==h)renderer.setSize(w,h,false);const stacked=matchMedia('(max-width:600px), (max-width:900px) and (orientation:portrait)').matches,cw=stacked?w:w/2,ch=stacked?h/2:h,clip=manifest.clips[active],t=((elapsed%clip.duration)+clip.duration)%clip.duration,phase=t/clip.duration,step=phase*24,a=Math.floor(step),b=(a+1)%24;
  action.reset().setLoop(T.LoopRepeat,Infinity).play();mixer.setTime(t);equipment.update(active,phase);u.frameA.value.set(a%6,3-Math.floor(a/6));u.frameB.value.set(b%6,3-Math.floor(b/6));u.indices.value.set(clip.flowOffset+a,clip.flowOffset+b);const pairIndex=clip.flowOffset+a;u.pair.value.set(pairIndex%cols,Math.floor(pairIndex/cols));u.amount.value=step-a;
  const extent=Math.max(1.65,1.6/(cw/ch));[nativeCamera,artCamera].forEach(c=>{c.left=-extent*cw/ch;c.right=extent*cw/ch;c.top=extent;c.bottom=-extent;c.updateProjectionMatrix();});
  renderer.setViewport(0,stacked?ch:0,cw,ch);renderer.setScissor(0,stacked?ch:0,cw,ch);renderer.setClearColor(0x1d2820);renderer.render(nativeScene,nativeCamera);
  renderer.setViewport(stacked?0:cw,0,cw,ch);renderer.setScissor(stacked?0:cw,0,cw,ch);renderer.setClearColor(0x1d2820);renderer.render(artScene,artCamera);slider.value=Math.round(phase*1000);clock.value=t.toFixed(2)+' / '+clip.duration.toFixed(2)+'초';dirty=false;
 }
 function setPlaying(value){playing=value;play.textContent=playing?'일시 정지':'재생';last=performance.now();}
 function frame(now){requestAnimationFrame(frame);const dt=Math.max(0,(now-last)/1000);last=now;renderer.getSize(renderSize);if(playing){elapsed+=dt*speed;render();}else if(dirty||renderSize.x!==Math.round(canvas.clientWidth)||renderSize.y!==Math.round(canvas.clientHeight))render();}
 document.getElementById('walk').onclick=()=>setClip('walk');document.getElementById('attack').onclick=()=>setClip('attack');play.onclick=()=>setPlaying(!playing);document.getElementById('speed').onchange=e=>speed=Number(e.target.value);slider.oninput=()=>{setPlaying(false);elapsed=Number(slider.value)/1000*manifest.clips[active].duration;render();};
 window.warriorMotion={renderer,model,mixer,manifest,equipment,artCamera,artScene,uniforms:u,setClip,setPlaying,setTime(value){setPlaying(false);elapsed=value;render();},get clip(){return active;},get time(){return elapsed;},get playing(){return playing;},get frame(){return {a:u.frameA.value.toArray(),b:u.frameB.value.toArray(),mix:u.amount.value};}};
 setClip('walk');render();play.disabled=false;status.textContent='시안 준비 완료';requestAnimationFrame(frame);
}catch(error){status.textContent='불러오기 실패: '+error.message;status.classList.add('error');console.error(error);}

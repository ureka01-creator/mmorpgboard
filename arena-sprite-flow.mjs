import * as THREE from 'three';
import {motionSegment} from './arena-sprite-motion.mjs?v=2.11';
export {motionSegment};
export async function loadFlowAssets(){
 const response=await fetch('./assets/sprites/motion/flow.json?v=2.11');if(!response.ok)throw Error('Motion manifest '+response.status);
 const manifest=await response.json();if(manifest.schema!==1||manifest.grid?.[0]!==56||manifest.grid?.[1]!==92||manifest.frames?.length!==160||manifest.pairs?.length!==152)throw Error('Invalid motion manifest');
 const data=await fetch('./assets/sprites/motion/flow.bin.gz?v=2.11');if(!data.ok)throw Error('Motion data '+data.status);
 const compressed=await data.arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',compressed)),b=>b.toString(16).padStart(2,'0')).join('');if(digest!==manifest.flowSha256)throw Error('Motion checksum mismatch');
 const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
 const raw=new Int16Array(await new Response(stream).arrayBuffer()),[w,h]=manifest.grid,columns=8,rows=Math.ceil(manifest.pairs.length/columns),pixels=new Uint16Array(w*h*columns*rows*4);
 if(raw.length!==manifest.pairs.length*w*h*4)throw Error('Invalid motion field length');
 for(let p=0;p<manifest.pairs.length;p++)for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++)pixels[(((Math.floor(p/columns)*h+y)*w*columns+(p%columns)*w+x)*4+c)]=THREE.DataUtils.toHalfFloat(raw[((p*h+y)*w+x)*4+c]/32767);
 const flow=new THREE.DataTexture(pixels,w*columns,h*rows,THREE.RGBAFormat,THREE.HalfFloatType);flow.minFilter=flow.magFilter=THREE.LinearFilter;flow.needsUpdate=true;
 const contours=new Uint16Array(256*manifest.frames.length*4);
 manifest.frames.forEach((f,i)=>f.contour.forEach(([lo,hi],y)=>{const o=(i*256+y)*4;contours[o]=THREE.DataUtils.toHalfFloat(lo/f.rect[2]);contours[o+1]=THREE.DataUtils.toHalfFloat(hi/f.rect[2]);if(f.bladeRows){contours[o+2]=THREE.DataUtils.toHalfFloat(f.bladeRows[y][0]/f.rect[2]);contours[o+3]=THREE.DataUtils.toHalfFloat(f.bladeRows[y][1]/f.rect[2]);}}));
 const mask=new THREE.DataTexture(contours,256,manifest.frames.length,THREE.RGBAFormat,THREE.HalfFloatType);mask.needsUpdate=true;
 const fillPixels=new Uint16Array(contours.length);
 manifest.frames.forEach((f,i)=>f.bodyFillRows?.forEach(([lo,hi,x,y],row)=>{
  const o=(i*256+row)*4;fillPixels[o]=THREE.DataUtils.toHalfFloat(lo/f.rect[2]);fillPixels[o+1]=THREE.DataUtils.toHalfFloat(hi/f.rect[2]);fillPixels[o+2]=THREE.DataUtils.toHalfFloat((x+.5)/f.rect[2]);fillPixels[o+3]=THREE.DataUtils.toHalfFloat(1-(y+.5)/f.rect[3]);
 }));
 const fill=new THREE.DataTexture(fillPixels,256,manifest.frames.length,THREE.RGBAFormat,THREE.HalfFloatType);fill.needsUpdate=true;
 return {manifest,flow,mask,fill,columns,rows,frames:new Map(manifest.frames.map((f,i)=>[f.key,{...f,index:i}])),pairs:new Map(manifest.pairs.map((p,i)=>[manifest.frames[p.a].key+'>'+manifest.frames[p.b].key,i]))};
}
export function enableFlow(actor,assets){
 for(const atlas of Object.values(actor.pack.atlases))if(assets.manifest.sources[atlas.file]!==atlas.sha256)throw Error('Motion/source artwork mismatch');
 const u={motionHeadTransform:{value:new THREE.Vector4()},motionHeadRect:{value:new THREE.Vector4()},motionHeadPoints:{value:new THREE.Vector4()},motionHeadFrame:{value:new THREE.Vector2()},motionEnabled:{value:0},motionSwords:{value:0},motionSwordA:{value:new THREE.Vector4()},motionSwordB:{value:new THREE.Vector4()},motionSwordWidths:{value:new THREE.Vector2()},motionFill:{value:assets.fill},motionFlow:{value:assets.flow},motionMask:{value:assets.mask},motionMapA:{value:null},motionMapB:{value:null},motionTransformA:{value:new THREE.Vector4()},motionTransformB:{value:new THREE.Vector4()},motionRectA:{value:new THREE.Vector4()},motionRectB:{value:new THREE.Vector4()},motionFrames:{value:new THREE.Vector2()},motionHeights:{value:new THREE.Vector2()},motionPair:{value:new THREE.Vector2()},motionMix:{value:0}};
 const common=`
 uniform sampler2D motionFlow,motionMask,motionFill,motionMapA,motionMapB;
 uniform vec4 motionTransformA,motionTransformB,motionRectA,motionRectB;
 uniform vec2 motionFrames,motionPair,motionHeights,motionSwordWidths;
 uniform float motionMix,motionEnabled,motionSwords,motionBladePass;
 uniform vec4 motionSwordA,motionSwordB,motionHeadTransform,motionHeadRect,motionHeadPoints;uniform vec2 motionHeadFrame;
 vec4 flowAt(vec2 p){
  vec2 q=clamp(vec2(p.x,1.0-p.y),vec2(${.5/assets.manifest.grid[0]},${.5/assets.manifest.grid[1]}),vec2(${1-.5/assets.manifest.grid[0]},${1-.5/assets.manifest.grid[1]}));
  return texture2D(motionFlow,(motionPair+q)/vec2(${assets.columns}.0,${assets.rows}.0));
 }
 vec2 toWorld(vec2 p){return p*vec2(2.8,4.6)+vec2(-1.4,-1.4);}
 vec2 toUv(vec2 p){return (p-vec2(-1.4,-1.4))/vec2(2.8,4.6);}
 `;
 const previous=actor.sprite.material.onBeforeCompile;
 function configure(material,bladePass){
  material.onBeforeCompile=shader=>{
   previous(shader);Object.assign(shader.uniforms,u,{motionBladePass:{value:bladePass}});
   shader.vertexShader='varying vec2 vMotionUv;\n'+common+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vMotionUv=(uv*vec2(4.0,5.0)+vec2(-2.0,-1.4)-vec2(-1.4,-1.4))/vec2(2.8,4.6);
    if(motionEnabled>.5&&motionBladePass<.5){
     vec4 f=flowAt(vMotionUv);vec2 shift=motionMix<.5?motionMix*f.xy:(1.0-motionMix)*f.zw;
     transformed.xy+=shift*vec2(2.8,4.6);
    }
   `);
   shader.fragmentShader='varying vec2 vMotionUv;\n'+common+`
 float bladeCoverage(vec2 p,vec4 transform,float index,float height){
  vec2 q=p*transform.xy+transform.zw;
  if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0)return 0.0;
  float row=floor((1.0-q.y)*height);
  vec2 limits=texture2D(motionMask,vec2((row+.5)/256.0,(index+.5)/${assets.manifest.frames.length}.0)).ba;
  return limits.y>limits.x?step(limits.x,q.x)*step(q.x,limits.y):0.0;
 }
 vec4 artAt(sampler2D tex,vec2 p,vec4 transform,vec4 rect,float index,float height){
  vec2 q=p*transform.xy+transform.zw;
  if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0)return vec4(0.0);
  float row=floor((1.0-q.y)*height);
  vec2 limits=texture2D(motionMask,vec2((row+.5)/256.0,(index+.5)/${assets.manifest.frames.length}.0)).rg;
  if(q.x<limits.x||q.x>limits.y)return vec4(0.0);
  return texture2D(tex,rect.xy+q*rect.zw);
 }
 `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
    if(motionEnabled<.5){
     #include <map_fragment>
    }else{
     bool useA=motionMix<.5;
     vec4 body=useA?artAt(motionMapA,vMotionUv,motionTransformA,motionRectA,motionFrames.x,motionHeights.x):artAt(motionMapB,vMotionUv,motionTransformB,motionRectB,motionFrames.y,motionHeights.y);
     if(motionBladePass>1.5){
      vec2 offset=toWorld(vMotionUv)-motionHeadPoints.zw;
      vec2 ellipse=(offset+vec2(0.0,.06))/vec2(.15,.25);
      body=artAt(motionMapA,toUv(offset+motionHeadPoints.xy),motionHeadTransform,motionHeadRect,motionHeadFrame.x,motionHeadFrame.y);
      body.a*=1.0-smoothstep(.85,1.0,length(ellipse));
     }else if(motionBladePass<.5){
      if(motionSwords>.5){
       float cut=useA?bladeCoverage(vMotionUv,motionTransformA,motionFrames.x,motionHeights.x):bladeCoverage(vMotionUv,motionTransformB,motionFrames.y,motionHeights.y);
       if(cut>.5){
        // Recover body pixels hidden by the original blade using the other pose.
        vec4 field=flowAt(vMotionUv);vec2 other=vMotionUv+(useA?field.xy:field.zw);
        vec4 fill=useA?artAt(motionMapB,other,motionTransformB,motionRectB,motionFrames.y,motionHeights.y):artAt(motionMapA,other,motionTransformA,motionRectA,motionFrames.x,motionHeights.x);
        float covered=useA?bladeCoverage(other,motionTransformB,motionFrames.y,motionHeights.y):bladeCoverage(other,motionTransformA,motionFrames.x,motionHeights.x);
        vec2 p=toWorld(vMotionUv);
        vec4 transform=useA?motionTransformA:motionTransformB;
        vec4 rect=useA?motionRectA:motionRectB;
        float index=useA?motionFrames.x:motionFrames.y,height=useA?motionHeights.x:motionHeights.y;
        vec2 local=vMotionUv*transform.xy+transform.zw;
        vec4 bridge=texture2D(motionFill,vec2((floor((1.0-local.y)*height)+.5)/256.0,(index+.5)/${assets.manifest.frames.length}.0));
        if(bridge.y>bridge.x&&local.x>=bridge.x&&local.x<=bridge.y){
         fill=useA?texture2D(motionMapA,rect.xy+bridge.zw*rect.zw):texture2D(motionMapB,rect.xy+bridge.zw*rect.zw);fill.a=1.0;
        }else if(covered>.5||fill.a<.95)fill=vec4(0.0);
        body=fill;
        if(abs(p.x)>.7||p.y>1.7||p.y<-.65)body.a=0.0;
       }
      }
     }else{
      body=vec4(0.0);
      vec2 da=motionSwordA.zw-motionSwordA.xy,db=motionSwordB.zw-motionSwordB.xy;
      float angleA=atan(da.y,da.x),delta=atan(sin(atan(db.y,db.x)-angleA),cos(atan(db.y,db.x)-angleA));
      float angle=angleA+delta*motionMix,len=mix(length(da),length(db),motionMix);
      vec2 axis=vec2(cos(angle),sin(angle)),side=vec2(-axis.y,axis.x),root=mix(motionSwordA.xy,motionSwordB.xy,motionMix);
      vec2 p=toWorld(vMotionUv)-root;float along=dot(p,axis)/max(len,.001),across=dot(p,side);
      float width=mix(motionSwordWidths.x,motionSwordWidths.y,motionMix);
      if(along>=-.02&&along<=1.02&&abs(across)<=width){
       vec2 axisA=normalize(da),axisB=normalize(db);
       vec2 qa=motionSwordA.xy+da*along+vec2(-axisA.y,axisA.x)*across*motionSwordWidths.x/max(width,.001);
       vec2 qb=motionSwordB.xy+db*along+vec2(-axisB.y,axisB.x)*across*motionSwordWidths.y/max(width,.001);
       body=useA?artAt(motionMapA,toUv(qa),motionTransformA,motionRectA,motionFrames.x,motionHeights.x):artAt(motionMapB,toUv(qb),motionTransformB,motionRectB,motionFrames.y,motionHeights.y);
       body.a*=useA?bladeCoverage(toUv(qa),motionTransformA,motionFrames.x,motionHeights.x):bladeCoverage(toUv(qb),motionTransformB,motionFrames.y,motionHeights.y);
      }
     }
     diffuseColor*=body;
    }
   `);
  };
  material.customProgramCacheKey=()=> 'sprite-flow-forward-depth-1-'+bladePass;material.needsUpdate=true;
 }
 const bladeMaterial=actor.sprite.material.clone();bladeMaterial.color=actor.sprite.material.color;const headMaterial=actor.sprite.material.clone();headMaterial.color=actor.sprite.material.color;
 configure(actor.sprite.material,0);configure(bladeMaterial,1);configure(headMaterial,2);
 const blade=new THREE.Mesh(new THREE.PlaneGeometry(4,5),bladeMaterial);blade.position.set(0,1.1,0);blade.renderOrder=.01;blade.frustumCulled=false;blade.visible=false;blade.onBeforeRender=actor.sprite.onBeforeRender;actor.group.add(blade);
 const head=new THREE.Mesh(new THREE.PlaneGeometry(4,5),headMaterial);head.position.set(0,1.1,0);head.renderOrder=-.01;head.frustumCulled=false;head.visible=false;head.onBeforeRender=actor.sprite.onBeforeRender;actor.group.add(head);
 actor.flow={assets,u,blade,head,geometry:new THREE.PlaneGeometry(4,5,80,100),active:false};
}
export function applyFlow(actor,body,phase,direction){
 const f=actor.flow;if(!f)return;
 const segment=motionSegment(body,phase,direction);f.active=!!segment;f.u.motionEnabled.value=segment?1:0;f.blade.visible=f.head.visible=false;if(!segment)return;
 const {assets,u}=f,a=assets.frames.get(segment.a),b=assets.frames.get(segment.b);
 let index=assets.pairs.get(segment.a+'>'+segment.b);if(a.index!==b.index&&index===undefined)throw Error('Missing flow pair '+segment.a+'>'+segment.b);
 u.motionSwords.value=a.sword&&b.sword&&segment.t>.001&&segment.t<.999?1:0;
 f.blade.visible=f.head.visible=!!u.motionSwords.value;f.blade.material.opacity=f.head.material.opacity=actor.sprite.material.opacity;
 const canonical=assets.frames.get(`${direction}:idle:0`),headAtlas=actor.pack.atlases[canonical.atlas],r=canonical.rect;
 u.motionHeadTransform.value.set(...canonical.transform);u.motionHeadRect.value.set(r[0]/headAtlas.width,1-(r[1]+r[3])/headAtlas.height,r[2]/headAtlas.width,r[3]/headAtlas.height);
 u.motionHeadFrame.value.set(canonical.index,r[3]);u.motionHeadPoints.value.set(...canonical.headWorld,a.headWorld[0]*(1-segment.t)+b.headWorld[0]*segment.t,a.headWorld[1]*(1-segment.t)+b.headWorld[1]*segment.t);
 if(a.sword&&b.sword){u.motionSwordA.value.set(...a.sword.points);u.motionSwordB.value.set(...b.sword.points);u.motionSwordWidths.value.set(a.sword.width,b.sword.width);}
 index??=0;u.motionPair.value.set(index%assets.columns,Math.floor(index/assets.columns));u.motionMix.value=a.index===b.index?0:segment.t;
 for(const [suffix,frame]of [['A',a],['B',b]]){
  const atlas=actor.pack.atlases[frame.atlas],r=frame.rect;
  u['motionMap'+suffix].value=actor.maps[frame.atlas];
  // Atlas clones carry the old crop transform, but texture2D uses the full image.
  u['motionTransform'+suffix].value.set(...frame.transform);u['motionRect'+suffix].value.set(r[0]/atlas.width,1-(r[1]+r[3])/atlas.height,r[2]/atlas.width,r[3]/atlas.height);
 }
 u.motionFrames.value.set(a.index,b.index);u.motionHeights.value.set(a.rect[3],b.rect[3]);
 actor.sprite.geometry=f.geometry;actor.sprite.scale.set(1,1,1);actor.sprite.position.set(0,1.1,0);
}

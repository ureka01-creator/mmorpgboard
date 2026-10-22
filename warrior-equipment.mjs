import * as T from 'three';

// Fixed illustrated surfaces, animated from the native skeleton instead of
// asking independent painted frames to invent the next foot or equipment.
export async function createEquipment(scene,model,walkTexture){
 const base='./assets/sprites/native-motion/',meta=await fetch(base+'parts.json?v=2').then(r=>r.json()),atlas=await new T.TextureLoader().loadAsync(base+meta.image+'?v=2');atlas.colorSpace=T.SRGBColorSpace;
 const root=new T.Group();scene.add(root);const unit=3.4*.55/256;
 function piece(i){const map=atlas.clone(),[x,y,w,h]=meta.rects[i];map.repeat.set(w/meta.width,h/meta.height);map.offset.set(x/meta.width,1-(y+h)/meta.height);map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=4;const mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,alphaTest:.04,toneMapped:false}));mesh.frustumCulled=false;root.add(mesh);return mesh;}
 const legs={L:[piece(4),piece(5),piece(6)],R:[piece(0),piece(1),piece(2)]},shield=piece(3);
 const bodyMat=new T.ShaderMaterial({uniforms:{map:{value:walkTexture}},transparent:true,depthWrite:false,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 v;uniform sampler2D map;void main(){vec2 p=vec2(v.x,1.0-v.y)*256.0;vec4 c=texture2D(map,vec2(v.x/6.0,(3.0+v.y)/4.0));bool red=c.r>c.g*1.9&&c.r>c.b*2.2&&p.y<180.0;if(p.y>151.0&&p.x>104.0&&p.x<177.0&&!red)discard;if(length((p-vec2(195.0,127.0))/vec2(35.0,55.0))<1.0)discard;if(c.a<.04)discard;gl_FragColor=c;
 #include <colorspace_fragment>
 }`});
 const body=new T.Mesh(new T.PlaneGeometry(3.4*.55,3.4*.55),bodyMat);body.renderOrder=10;root.add(body);
 const camera=new T.OrthographicCamera(-1.7,1.7,1.7,-1.7,.01,40);camera.position.set(0,12,8.4);camera.lookAt(0,.9,0);camera.updateMatrixWorld();
 const bone=name=>{const b=model.getObjectByName('DEF-'+name)||model.getObjectByName('DEF-'+name.replace(/([LR])$/,'.$1'));if(!b)throw Error('Missing equipment joint '+name);return b;};
 const joints=Object.fromEntries(['hips','thighL','shinL','footL','toeL','thighR','shinR','footR','toeR'].map(n=>[n,bone(n)]));
 const point=b=>{const v=b.getWorldPosition(new T.Vector3()).project(camera);return new T.Vector2((v.x*.5+.5)*256,(.5-v.y*.5)*256);};
 const referenceHip=new T.Vector2(126.58448573168198,125.86988760023299),anchor=new T.Vector2(137,150);
 function world(p){return new T.Vector2((p.x-128)*unit,(128-p.y)*unit);}
 function segment(mesh,start,end,width,overlap=4){const a=world(start),b=world(end),d=b.clone().sub(a);mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,0);mesh.rotation.z=Math.atan2(d.y,d.x)+Math.PI/2;mesh.scale.set(width*unit,Math.max(4,d.length()/unit+overlap*2)*unit,1);}
 // Forearm centers measured in the original attack illustrations. These
 // anchors stay on the LEFT arm even when it passes above/behind the head.
 const anchors=[[187,145,-.1],[187,145,-.1],[181,155,0],[177,168,.15],[171,181,.25],[174,185,.3],[193,130,-.7],[194,75,-.9],[122,69,.3],[112,61,.3],[104,62,.3],[102,62,.3],[107,63,.3],[105,67,.3],[157,69,-.6],[170,85,-.5],[171,120,-.35],[178,124,-.3],[183,174,0],[187,172,0],[187,145,-.1],[187,145,-.1],[187,145,-.1],[187,145,-.1]];
 const audit={feet:{},shield:{}};
 function update(active,phase){model.updateWorldMatrix(true,true);body.visible=active==='walk';for(const list of Object.values(legs))list.forEach(m=>m.visible=active==='walk');
  if(active==='walk'){
   const hip=point(joints.hips),delta=hip.clone().sub(referenceHip).multiplyScalar(1.5);body.position.set(delta.x*unit,-delta.y*unit,0);
   for(const side of ['L','R']){const positions=['thigh','shin','foot','toe'].map(n=>point(joints[n+side]).sub(referenceHip).multiplyScalar(1.5).add(anchor));
    segment(legs[side][0],positions[0],positions[1],34,7);segment(legs[side][1],positions[1],positions[2],23,6);segment(legs[side][2],positions[2],positions[3],26,4);
    const depth=positions[3].y;legs[side].forEach((m,i)=>m.renderOrder=1+depth/100+(2-i)*.01);audit.feet[side]=positions[3].toArray();
   }
   const p=world(new T.Vector2(195+delta.x,127+delta.y));shield.position.set(p.x,p.y,0);shield.scale.set(55*unit,80*unit,1);shield.rotation.z=-.1;
  }else{
   const step=phase*24,i=Math.floor(step)%24,t=step-i,a=anchors[i],b=anchors[(i+1)%24],p=world(new T.Vector2(T.MathUtils.lerp(a[0],b[0],t),T.MathUtils.lerp(a[1],b[1],t)));shield.position.set(p.x,p.y,0);shield.scale.set(51*unit,64*unit,1);shield.rotation.z=T.MathUtils.lerp(a[2],b[2],t);
  }
  shield.visible=true;shield.material.opacity=1;shield.renderOrder=20;audit.shield={visible:shield.visible,opacity:shield.material.opacity,position:shield.position.toArray(),scale:shield.scale.toArray(),arm:'left'};
 }
 return {update,root,shield,legs,body,audit,meta};
}

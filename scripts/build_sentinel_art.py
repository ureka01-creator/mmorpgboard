"""Author a sculpted head, painted armour, straps and a deforming mantle on the CC0 skin.
Blender 4.3: blender -b -t 2 --python scripts/build_sentinel_art.py
The original fullplate remains a pinned, unchanged authoring input.
"""
import bpy, bmesh, hashlib, json, math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'assets/characters/fullplate.glb'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='b4954d9bbbc8a9c826f8e50e167f3bab122d88327dd67ebb5b42f50a1ea122a0'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
base=next(o for o in bpy.data.objects if o.type=='MESH')
rig.animation_data_clear();base.name='Elderfall_Sentinel'
# Replace the source's featureless closed helmet rather than painting a face
# over it. Keep the torso/limb surface and all its original distributed skin.
bm=bmesh.new();bm.from_mesh(base.data)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if all(v.co.z>1.59 for v in f.verts)],context='FACES')
bm.to_mesh(base.data);bm.free();base.data.update()
palette={'steel':'8c9da4','edge':'c0c9c6','ink':'182126','cloth':'233f59','leather':'735035','boot':'392e28','brass':'b89b5c','mantle':'722f39','skin':'b49778','beard':'45372e'}
def linear(x):
 x=x/255;return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def color(name):return tuple(linear(int(palette[name][n:n+2],16)) for n in (0,2,4))
mat=bpy.data.materials.new('Original painted iron, indigo and leather');mat.use_nodes=True
nodes=mat.node_tree.nodes;bs=nodes.get('Principled BSDF');paint=nodes.new('ShaderNodeVertexColor');paint.layer_name='Paint'
mat.node_tree.links.new(paint.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Metallic'].default_value=.18;bs.inputs['Roughness'].default_value=.72
def paint_object(obj,choose):
 obj.data.materials.clear();obj.data.materials.append(mat)
 if obj.data.color_attributes.get('Paint'):obj.data.color_attributes.remove(obj.data.color_attributes['Paint'])
 attr=obj.data.color_attributes.new(name='Paint',type='FLOAT_COLOR',domain='CORNER')
 for p in obj.data.polygons:
  p.material_index=0
  for li in p.loop_indices:
   v=obj.data.vertices[obj.data.loops[li].vertex_index];rgb=color(choose(v))
   # Broad painted light/dark planes read at the overhead camera without a photo.
   shade=.87+.10*max(0,p.normal.z)+.05*math.sin(v.co.z*21+v.co.x*13)
   attr.data[li].color=(*[max(0,min(1,c*shade)) for c in rgb],1)
 obj.data.color_attributes.active_color=attr
def body_color(v):
 groups=[(base.vertex_groups[g.group].name,g.weight) for g in v.groups]
 name=max(groups,key=lambda g:g[1])[0] if groups else 'DEF-hips'
 if 'head' in name:return 'steel'
 if 'neck' in name:return 'cloth'
 if 'hand' in name or 'forearm' in name:return 'leather'
 if 'upper_arm' in name:return 'steel' if abs(v.co.x)<.33 else 'cloth'
 if 'shin' in name or 'foot' in name or 'toe' in name:return 'boot'
 if 'thigh' in name:return 'cloth'
 if 1.12<v.co.z<1.19:return 'leather'
 return 'cloth'
paint_object(base,body_color)
parts=[base]
def bind(obj,bone):
 obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))),1,'REPLACE')
 mod=obj.modifiers.new('Skin','ARMATURE');mod.object=rig;obj.parent=rig
 parts.append(obj)
def block(name,center,size,bone,paint_name,rotation=0,bevel=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center)
 o=bpy.context.object;o.name=name;o.dimensions=size;o.rotation_euler.y=rotation
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if bevel:
  mod=o.modifiers.new('Forged edges','BEVEL');mod.width=bevel;mod.segments=2
  bpy.ops.object.modifier_apply(modifier=mod.name)
 paint_object(o,lambda v:paint_name);bind(o,bone);return o
def rivet(center,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=.009,location=center)
 o=bpy.context.object;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 paint_object(o,lambda v:'brass');bind(o,bone)
# Closed sculpted head with facial planes, short hair and a leather circlet.
profile=[(1.590,.034,.035),(1.627,.044,.054),(1.664,.072,.068),(1.705,.092,.079),(1.748,.089,.077),(1.785,.082,.071),(1.826,.057,.052),(1.855,.006,.006)]
headverts=[];headfaces=[];segments=20
for z,rx,ry in profile:
 for i in range(segments):
  a=i/segments*math.tau;headverts.append((math.sin(a)*rx,.008-math.cos(a)*ry,z))
for j in range(len(profile)-1):
 for i in range(segments):
  a=j*segments+i;b=j*segments+(i+1)%segments;headfaces.append((a,b,b+segments,a+segments))
headfaces += [tuple(reversed(range(segments))),tuple(range((len(profile)-1)*segments,len(profile)*segments))]
data=bpy.data.meshes.new('Sculpted head');data.from_pydata(headverts,[],headfaces);data.update()
face=bpy.data.objects.new('Original ranger head',data);bpy.context.collection.objects.link(face)
def head_color(v):
 if v.co.z>1.781 or v.co.y>.014:return 'beard'
 if v.co.z<1.702 and v.co.y<-.032:return 'beard'
 return 'skin'
paint_object(face,head_color)
for p in face.data.polygons:p.use_smooth=True
bind(face,'DEF-head')
data=bpy.data.meshes.new('Nose');data.from_pydata([(-.010,-.066,1.744),(.010,-.066,1.744),(.013,-.071,1.709),(-.013,-.071,1.709),(0,-.100,1.716)],[],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)]);data.update()
nose=bpy.data.objects.new('Sculpted nose',data);bpy.context.collection.objects.link(nose);paint_object(nose,lambda v:'skin');bind(nose,'DEF-head')
for x in [-.026,.026]:
 block('Eye',(x,-.069,1.751),(.010,.004,.006),'DEF-head','ink',bevel=.001)
 block('Eyebrow',(x,-.068,1.761),(.023,.004,.005),'DEF-head','beard',bevel=.001)
bpy.ops.mesh.primitive_torus_add(major_radius=.083,minor_radius=.006,major_segments=24,minor_segments=6,location=(0,.008,1.786));circlet=bpy.context.object;circlet.scale.y=.88;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);paint_object(circlet,lambda v:'leather');bind(circlet,'DEF-head')
rivet((0,-.072,1.786),'DEF-head')
# Overlapping shoulder plates, cuffs, boots and an asymmetrical chest harness.
for side,sign in [('L',1),('R',-1)]:
 bone='DEF-upper_arm.'+side
 block('Shoulder plate '+side,(sign*.247,-.008,1.534),(.18,.20,.075),bone,'steel',bevel=.02)
 block('Shoulder trim '+side,(sign*.247,-.112,1.53),(.16,.016,.02),bone,'edge')
 for x in [.195,.295]:rivet((sign*x,-.123,1.53),bone)
 block('Wrist cuff '+side,(sign*.585,-.009,1.484),(.042,.126,.118),'DEF-forearm.'+side,'brass',bevel=.009)
 for z in [.18,.27]:block('Boot buckle '+side,(sign*.08,-.072,z),(.112,.018,.025),'DEF-shin.'+side,'brass')
block('Chest harness',(-.015,-.159,1.355),(.045,.026,.32),'DEF-spine.002','leather',rotation=-.47)
block('Belt buckle',(0,-.161,1.151),(.076,.026,.057),'DEF-hips','brass')
block('Belt pouch',(-.175,-.015,1.10),(.115,.105,.13),'DEF-hips','leather',bevel=.012)
# The short folded mantle is a genuine skinned surface with distributed weights.
verts=[];faces=[];rows=7;cols=9
for r in range(rows):
 t=r/(rows-1);width=.205+.095*t
 for c in range(cols):
  u=c/(cols-1);x=(u*2-1)*width;y=.125+.115*t+.017*math.cos(u*math.pi*8)*t
  z=1.51-.60*t+.018*math.cos(u*math.pi*4)*t
  verts.append((x,y,z))
for r in range(rows-1):
 for c in range(cols-1):
  i=r*cols+c;faces.append((i,i+1,i+1+cols,i+cols))
data=bpy.data.meshes.new('Folded mantle');data.from_pydata(verts,[],faces);data.update()
cape=bpy.data.objects.new('Skinned mantle',data);bpy.context.collection.objects.link(cape)
paint_object(cape,lambda v:'mantle')
for n in ['DEF-spine.003','DEF-spine.002','DEF-hips']:cape.vertex_groups.new(name=n)
for r in range(rows):
 t=r/(rows-1)
 for c in range(cols):
  i=r*cols+c;upper=max(0,1-t*2);hip=max(0,t*2-1)
  for n,w in [('DEF-spine.003',upper),('DEF-spine.002',1-upper-hip),('DEF-hips',hip)]:
   if w:cape.vertex_groups[n].add([i],w,'REPLACE')
mod=cape.modifiers.new('Mantle skin','ARMATURE');mod.object=rig;cape.parent=rig;parts.append(cape)
# Preserve one mesh/material and the complete source skin; accessories deform
# with its real skeleton instead of replacing the actor with rigid primitives.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=base;bpy.ops.object.join()
base.data.materials.clear();base.data.materials.append(mat)
for p in base.data.polygons:p.material_index=0
# Rebalance the old photograph model's unusually long legs. Move the complete
# bind skeleton with the surface; motion is retargeted to this bind afterwards.
def remap_z(z):return z*.88 if z<=1.069776 else 1.069776*.88+(z-1.069776)*(1.859645-1.069776*.88)/(1.859645-1.069776)
for v in base.data.vertices:
 z=v.co.z;v.co.z=remap_z(z)
 if z>1.62:v.co.x*=1.10;v.co.y=.017+(v.co.y-.017)*1.10
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:
 b.use_connect=False
for b in rig.data.edit_bones:
 h=b.head.copy();t=b.tail.copy();h.z=remap_z(h.z);t.z=remap_z(t.z);b.head=h;b.tail=t
bpy.ops.object.mode_set(mode='OBJECT')
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
# Bake original woven/hammered paint and contact shadows into a dedicated UV
# atlas. No source photograph or external texture is used by the new material.
bpy.ops.object.select_all(action='DESELECT');base.select_set(True);bpy.context.view_layer.objects.active=base
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.012);bpy.ops.object.mode_set(mode='OBJECT')
image=bpy.data.images.new('Sentinel original painted atlas',width=512,height=512,alpha=False)
nodes=mat.node_tree.nodes;links=mat.node_tree.links
coord=nodes.new('ShaderNodeTexCoord');large=nodes.new('ShaderNodeTexNoise');large.inputs['Scale'].default_value=8;large.inputs['Detail'].default_value=3
fine=nodes.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=145;fine.inputs['Detail'].default_value=2
links.new(coord.outputs['Object'],large.inputs['Vector']);links.new(coord.outputs['Object'],fine.inputs['Vector'])
def noise_mix(previous,noise,low,high):
 ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(low,low,low,1);ramp.color_ramp.elements[1].color=(high,high,high,1);links.new(noise.outputs['Fac'],ramp.inputs['Fac'])
 mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(previous,mix.inputs[1]);links.new(ramp.outputs['Color'],mix.inputs[2]);return mix.outputs[0]
white=nodes.new('ShaderNodeRGB');white.outputs[0].default_value=(1,1,1,1)
washed=noise_mix(white.outputs[0],large,.80,1.10);washed=noise_mix(washed,fine,.87,1.08)
ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.16;ao.samples=16
mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.48;links.new(washed,mix.inputs[1]);links.new(ao.outputs['Color'],mix.inputs[2])
emit=nodes.new('ShaderNodeEmission');links.new(mix.outputs[0],emit.inputs['Color']);links.new(emit.outputs[0],nodes.get('Material Output').inputs['Surface'])
tex=nodes.new('ShaderNodeTexImage');tex.image=image;nodes.active=tex
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=16
bpy.ops.object.bake(type='EMIT',margin=4)
image.pack()
nodes.clear();outnode=nodes.new('ShaderNodeOutputMaterial');bs=nodes.new('ShaderNodeBsdfPrincipled');tex=nodes.new('ShaderNodeTexImage');tex.image=image
links.new(tex.outputs['Color'],bs.inputs['Base Color']);links.new(bs.outputs[0],outnode.inputs['Surface']);bs.inputs['Metallic'].default_value=.18;bs.inputs['Roughness'].default_value=.72
bpy.ops.object.select_all(action='DESELECT');base.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
out=ROOT/'assets/characters/sentinel.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_apply=False,export_materials='EXPORT',export_vertex_color='ACTIVE')
manifest=json.loads((ROOT/'assets/characters/sources.json').read_text())
manifest['baseModelSha256']=hashlib.sha256(source.read_bytes()).hexdigest()
manifest['generatedSha256']=hashlib.sha256(out.read_bytes()).hexdigest()
manifest['changes'] += ['replaced photograph material with original painted vertex colours','replaced source helmet with original sculpted head, short hair, beard and leather circlet','authored shoulder plates, cuffs, buckles and leather harness','added folded mantle weighted across three spine/hip joints']
manifest['changes'] += ['rebalanced leg and torso proportions together with all bind joints','baked original 512px painted noise and contact shading atlas']
manifest['artBuild']='scripts/build_sentinel_art.py'
manifest['runtimeTexture']='Original 512px grayscale paint/noise/AO atlas multiplied by authored vertex colours; source photograph is not used'
(ROOT/'assets/characters/sentinel-sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('SENTINEL',len(base.data.vertices),'vertices',len(base.data.polygons),'faces',len(rig.data.bones),'bones')

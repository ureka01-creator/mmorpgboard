"""Build the complete licensed knight mesh, full skin weights and PBR GLB.
Run with Blender 4.3: blender -b -t 2 --python scripts/prepare_skinned_character.py -- --source /tmp/elderfall-knight --donor /tmp/elderfall-animation-reference
"""
import bpy,json,sys,os,hashlib,argparse
from pathlib import Path
from mathutils import Vector,Quaternion,Matrix
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);parser.add_argument('--donor',type=Path,required=True);parser.add_argument('--out',type=Path,default=Path(__file__).resolve().parents[1]/'assets/characters/fullplate.glb');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);root=str(args.source)+'/'
expected={'knight.blend':'cb9cfdd972faa59c21aae603d15cb32ba33e337f04ac0981cfdbb76f7347702a','knightlowres.png':'532126a65d280e886a4a0092c15da74f8172aae9ad1f824a31e6282685657c99'}
for name,sha in expected.items():
 if hashlib.sha256((args.source/name).read_bytes()).hexdigest()!=sha:raise RuntimeError('Knight source checksum mismatch: '+name)
for name,sha in {'AnimationLibrary_Godot_Standard.gltf':'0ff075c7ad6855c5c2c37a171592ee8f0d6ab2f58259e2be77a9b63dd8027765','AnimationLibrary_Godot_Standard.bin':'6e65377d81558333c4093dbb144a48fd19019343d82b1a3a7992a98ec0e0543c'}.items():
 if hashlib.sha256((args.donor/name).read_bytes()).hexdigest()!=sha:raise RuntimeError('Animation source checksum mismatch: '+name)
bpy.ops.wm.open_mainfile(filepath=root+'knight.blend')
native=next(o for o in bpy.data.objects if o.type=='ARMATURE');old=next(o for o in bpy.data.objects if o.type=='MESH')
native.animation_data_clear()
for b in native.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
# Bake an actual T pose into the complete mirrored source mesh.
for side,sign in [('l',1),('r',-1)]:
 for name in ['UpperArm','LowerArm','Hand']:
  b=native.pose.bones[name+'.'+side];head=b.head.copy();q=b.matrix.to_quaternion();direction=b.tail-b.head
  swing=direction.normalized().rotation_difference(Vector((sign,0,0)))
  b.matrix=Matrix.LocRotScale(head,swing@q,Vector((1,1,1)));bpy.context.view_layer.update()
anchors={b.name:(native.matrix_world@b.head).copy() for b in native.pose.bones}
depsgraph=bpy.context.evaluated_depsgraph_get();data=bpy.data.meshes.new_from_object(old.evaluated_get(depsgraph),preserve_all_data_layers=True,depsgraph=depsgraph)
data.transform(old.matrix_world)
mesh=bpy.data.objects.new('Elderfall_Fullplate',data);bpy.context.collection.objects.link(mesh)
for g in old.vertex_groups:mesh.vertex_groups.new(name=g.name)
weights=[[(mesh.vertex_groups[g.group].name,g.weight) for g in v.groups] for v in data.vertices]
for o in [old,native]:bpy.data.objects.remove(o,do_unlink=True)
# Import the complete authoring skeleton, retaining clavicles, neck and all spines.
bpy.ops.import_scene.gltf(filepath=str(args.donor/'AnimationLibrary_Godot_Standard.gltf'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis.identity()
for o in list(bpy.data.objects):
 if o not in [rig,mesh]:bpy.data.objects.remove(o,do_unlink=True)
rig.name='Elderfall_Rig';rig.matrix_world=Matrix.Identity(4)
original={b.name:{'head':b.head_local.copy(),'tail':b.tail_local.copy(),'rotation':b.matrix_local.to_quaternion().copy(),'parent':b.parent.name if b.parent else None} for b in rig.data.bones}
hips=anchors['Body'];head=anchors['Head'];positions={'root':Vector((0,0,0)),'DEF-hips':hips,'DEF-head':head}
for name,t in [('DEF-spine.001',.26),('DEF-spine.002',.52),('DEF-spine.003',.77),('DEF-neck',.90)]:positions[name]=hips.lerp(head,t)
for side,suffix in [('l','L'),('r','R')]:
 for target,source in [('upper_arm','UpperArm'),('forearm','LowerArm'),('hand','Hand'),('thigh','UpperLeg'),('shin','LowerLeg'),('foot','Foot')]:positions['DEF-'+target+'.'+suffix]=anchors[source+'.'+side]
 positions['DEF-shoulder.'+suffix]=positions['DEF-spine.003'].lerp(anchors['UpperArm.'+side],.35)
 positions['DEF-toe.'+suffix]=Vector((anchors['Foot.'+side].x,-.148,.008))
 # Finger details inherit the wrist's shift without changing their source bone axes.
 for name,v in original.items():
  if name.endswith('.'+suffix) and name not in positions:positions[name]=v['head']-original['DEF-hand.'+suffix]['head']+positions['DEF-hand.'+suffix]
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:b.use_connect=False
for b in rig.data.edit_bones:
 name=b.name;v=original[name];b.head=positions[name];b.tail=b.head+(v['tail']-v['head']);b.align_roll(v['rotation']@Vector((0,0,1)))
 # Direct limb heads/tails match the artist-designed armour anatomy.
 child={'DEF-upper_arm.L':'DEF-forearm.L','DEF-upper_arm.R':'DEF-forearm.R','DEF-forearm.L':'DEF-hand.L','DEF-forearm.R':'DEF-hand.R','DEF-thigh.L':'DEF-shin.L','DEF-thigh.R':'DEF-shin.R','DEF-shin.L':'DEF-foot.L','DEF-shin.R':'DEF-foot.R','DEF-foot.L':'DEF-toe.L','DEF-foot.R':'DEF-toe.R'}.get(name)
 if child:b.tail=positions[child];b.align_roll(v['rotation']@Vector((0,0,1)))
bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
# Replace source weights with a full skeleton and smoothly distributed torso weights.
for g in list(mesh.vertex_groups):mesh.vertex_groups.remove(g)
for b in rig.data.bones:mesh.vertex_groups.new(name=b.name)
spines=['DEF-hips','DEF-spine.001','DEF-spine.002','DEF-spine.003','DEF-neck'];spineZ=[positions[n].z for n in spines]
mapname={'Head':'DEF-head'}
for side,suffix in [('l','L'),('r','R')]:
 for source,target in [('UpperArm','upper_arm'),('LowerArm','forearm'),('Hand','hand'),('UpperLeg','thigh'),('LowerLeg','shin'),('Foot','foot')]:mapname[source+'.'+side]='DEF-'+target+'.'+suffix
for i,groups in enumerate(weights):
 combined={}
 for name,w in groups:
  if name=='Body':
   z=data.vertices[i].co.z
   if z<=spineZ[0]:pairs=[(spines[0],1)]
   elif z>=spineZ[-1]:pairs=[(spines[-1],1)]
   else:
    k=next(k for k in range(len(spineZ)-1) if spineZ[k]<=z<spineZ[k+1]);t=(z-spineZ[k])/(spineZ[k+1]-spineZ[k]);pairs=[(spines[k],1-t),(spines[k+1],t)]
  else:pairs=[(mapname[name],1)]
  for target,amount in pairs:combined[target]=combined.get(target,0)+w*amount
 top=sorted(combined.items(),key=lambda p:p[1],reverse=True)[:4];total=sum(w for _,w in top)
 for name,w in top:
  if w>0:mesh.vertex_groups[name].add([i],w/total,'REPLACE')
modifier=mesh.modifiers.new('Full skeleton deformation','ARMATURE');modifier.object=rig;mesh.parent=rig
# Use the original photograph as a lit albedo map instead of its emission-only shader.
mat=bpy.data.materials.new('Weathered Steel');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');bs=n.new('ShaderNodeBsdfPrincipled');tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(root+'knightlowres.png');tex.image.pack();bs.inputs['Metallic'].default_value=.55;bs.inputs['Roughness'].default_value=.62
mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);mat.node_tree.links.new(bs.outputs['BSDF'],out.inputs['Surface']);mesh.data.materials.clear();mesh.data.materials.append(mat)
for p in mesh.data.polygons:p.use_smooth=True
# Keep baked bind transforms and omit donor animations/models from the export.
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
args.out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(args.out),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_apply=False,export_materials='EXPORT')
print('EXPORTED',len(mesh.data.vertices),len(mesh.data.polygons),len(rig.data.bones),[(n,tuple(round(x,3) for x in positions[n])) for n in ['DEF-hips','DEF-head','DEF-upper_arm.R','DEF-hand.R','DEF-foot.R']])

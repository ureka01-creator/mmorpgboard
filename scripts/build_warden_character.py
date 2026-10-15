"""Author a coherent iron/leather character on the existing CC0-derived 53-bone rig.
Creates new 3D geometry and materials; does not modify sprite artwork or legacy GLBs.
blender -b -t 2 --python scripts/build_warden_character.py
"""
import bpy,bmesh,math,hashlib,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'assets/characters/sentinel.glb'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='de52bf8aa316076529345ee52363997338e54b862ee21e71342b97b0e6ee12e7'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');base=next(o for o in bpy.data.objects if o.type=='MESH'and len(o.data.vertices)>1000)
for o in list(bpy.data.objects):
 if o not in [rig,base]:bpy.data.objects.remove(o,do_unlink=True)
rig.animation_data_clear();base.name='Warden_body'
# Replace the old head and rectangular shoulder blocks with newly authored surfaces.
bm=bmesh.new();bm.from_mesh(base.data)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if all(v.co.z>1.56 for v in f.verts)or all(v.co.z>1.46 and abs(v.co.x)<.12 and v.co.y<.10 for v in f.verts)or all(.16<abs(v.co.x)<.35 and 1.44<v.co.z<1.58 for v in f.verts)],context='FACES')
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(base.data);bm.free();base.data.update()
materials={}
def mat(name,hex,metal=0,rough=.65):
 m=bpy.data.materials.new(name);values=[int(hex[i:i+2],16)/255 for i in [0,2,4]];m.diffuse_color=tuple(v/12.92 if v<=.04045 else((v+.055)/1.055)**2.4 for v in values)+(1,);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=m.diffuse_color;b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough;materials[name]=m;return m
steel=mat('Weathered steel','87928e',.65,.58);edge=mat('Worn steel edges','b2b6a6',.75,.42);dark=mat('Dark mail','252d2d',.65,.7);brass=mat('Old brass','8b7041',.65,.48);leather=mat('Oiled leather','58402b',0,.88);cloth=mat('Brown wool','373a32',0,.98);rust=mat('Oxide red cloth','7a3025',0,.98);skin=mat('Skin','b48b6e',0,.8);hair=mat('Brown hair','3d2c20',0,.95);ink=mat('Eyes','15120f',0,.6)
# The base is already UV mapped and skinned. Keep only its material-neutral AO
# texture; assign actual physical materials instead of a baked studio light.
oldMat=base.data.materials[0];base.data.materials.clear()
for m in [cloth,leather,steel,rust,brass,dark]:base.data.materials.append(m)
colors=base.data.color_attributes.active_color
for f in base.data.polygons:
 v=base.data.vertices[f.vertices[0]];groups=[(base.vertex_groups[g.group].name,g.weight)for g in v.groups];bone=max(groups,key=lambda x:x[1])[0]if groups else'';z=sum(base.data.vertices[i].co.z for i in f.vertices)/len(f.vertices)
 rgb=colors.data[f.loop_indices[0]].color if colors else(0,0,0,1)
 if rgb[0]>rgb[2]*2.3 and rgb[0]>rgb[1]*2.3:f.material_index=3
 elif any(n in bone for n in ['hand','forearm','shin','foot','toe']):f.material_index=1
 elif abs(v.co.x)>.22 and z>1.4:f.material_index=2
 else:f.material_index=0
 f.use_smooth=True
for a in list(base.data.color_attributes):base.data.color_attributes.remove(a)
parts=[base]
def finish(o,bone,m,smooth=True):
 bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.clear();o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=smooth
 o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Warden skin','ARMATURE');mod.object=rig;o.parent=rig;parts.append(o);return o

def ellipsoid(name,center,scale,bone,m,segments=32,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=center);o=bpy.context.object;o.name=name;o.scale=scale;return finish(o,bone,m)
def tube(name,points,radius,bone,m):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=2;curve.bevel_depth=radius;curve.bevel_resolution=2;s=curve.splines.new('POLY');s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,bone,m)
def block(name,center,size,bone,m,rot=0,bevel=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.name=name;o.dimensions=size;o.rotation_euler.y=rot;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 mod=o.modifiers.new('Soft forged edge','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name);return finish(o,bone,m)
# Tailored cuirass, a continuous curved front rather than a box.
verts=[];faces=[];levels=[(1.13,.145,.132),(1.19,.16,.149),(1.29,.19,.164),(1.40,.185,.156),(1.47,.145,.127)];N=24
for z,rx,ry in levels:
 for i in range(N):
  a=math.tau*i/N;verts.append((rx*math.sin(a),.006+ry*math.cos(a),z))
for j in range(len(levels)-1):
 for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a+N,b+N,b,a))
data=bpy.data.meshes.new('Curved forged cuirass');data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new('Forged cuirass',data);bpy.context.collection.objects.link(o);finish(o,'DEF-spine.002',steel)
for z,rx,ry in [levels[0],levels[-1]]:tube('Cuirass rolled edge',[(rx*math.sin(i*math.tau/48),.006+ry*math.cos(i*math.tau/48),z)for i in range(49)],.007,'DEF-spine.002',edge)
# Overlapping rounded pauldrons, articulated cuffs and knee plates.
for side,sgn in [('L',1),('R',-1)]:
 b='DEF-upper_arm.'+side
 ellipsoid('Rounded shoulder '+side,(sgn*.244,0,1.445),(.14,.13,.105),b,steel)
 for n in range(2):ellipsoid('Shoulder lame '+side,(sgn*(.285+.035*n),0,1.424-.018*n),(.075,.127-.005*n,.042),b,edge if n==0 else steel,24,12)
 for y in [-.107,.107]:ellipsoid('Pauldron rivet',(sgn*.244,y,1.468),(.010,.006,.010),b,brass,12,8)
 block('Bracer '+side,(sgn*.56,-.055,1.42),(.13,.06,.10),'DEF-forearm.'+side,steel,bevel=.018)
 for x in [.515,.60]:block('Leather wrap',(sgn*x,-.017,1.42),(.018,.13,.13),'DEF-forearm.'+side,leather)
 ellipsoid('Knee cop',(sgn*.085,-.06,.54),(.080,.065,.078),'DEF-shin.'+side,steel,24,12)
 ellipsoid('Rounded leather toe',(sgn*.08,-.095,.058),(.066,.135,.052),'DEF-foot.'+side,leather,24,12)
 for z in [.18,.28]:block('Boot strap',(sgn*.08,-.060,z),(.12,.019,.021),'DEF-shin.'+side,leather)
 for z in [1.17,1.23]:ellipsoid('Cuirass rivet',(sgn*.13,-.12,z),(.007,.007,.007),'DEF-spine.002',brass,10,6)
# Red scarf with folds and a brass clasp; same palette as the trial room.
for j in range(5):
 bpy.ops.mesh.primitive_torus_add(major_radius=.079,minor_radius=.017,major_segments=32,minor_segments=8,location=(0,.004,1.51+j*.008));o=bpy.context.object;o.scale.y=.92;finish(o,'DEF-neck',rust)
ellipsoid('Scarf clasp',(.062,-.080,1.52),(.015,.010,.015),'DEF-neck',brass,16,8)
block('Leather baldric',(-.02,-.17,1.32),(.034,.020,.33),'DEF-spine.002',leather,rot=-.48)
block('Baldric buckle',(-.02,-.187,1.32),(.047,.011,.045),'DEF-spine.002',brass,rot=-.48)
ellipsoid('Anatomical neck',(0,.008,1.525),(.049,.049,.060),'DEF-neck',skin)
# Adult head, ears, cheek planes, brow and short swept hair. No old cone cap.
profile=[(1.57,.027,.035),(1.60,.045,.049),(1.64,.066,.065),(1.69,.080,.069),(1.73,.077,.066),(1.77,.068,.063),(1.80,.044,.044),(1.815,.004,.004)]
verts=[];faces=[];N=32
for z,rx,ry in profile:
 for i in range(N):a=math.tau*i/N;verts.append((rx*math.sin(a),.006-ry*math.cos(a),z))
for j in range(len(profile)-1):
 for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
faces.extend([tuple(reversed(range(N))),tuple(range((len(profile)-1)*N,len(profile)*N))]);data=bpy.data.meshes.new('Warden facial surface');data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new('Warden head',data);bpy.context.collection.objects.link(o);finish(o,'DEF-head',skin)
for sg in [-1,1]:
 ellipsoid('Ear',(sg*.078,.002,1.686),(.016,.018,.028),'DEF-head',skin,16,12)
 ellipsoid('Eye socket',(sg*.026,-.058,1.705),(.018,.009,.010),'DEF-head',leather,16,10)
 ellipsoid('Eye',(sg*.026,-.067,1.705),(.009,.004,.004),'DEF-head',ink,16,8)
 tube('Brow',[(sg*.012,-.064,1.719),(sg*.028,-.066,1.722),(sg*.045,-.058,1.716)],.005,'DEF-head',hair)
ellipsoid('Nose',(0,-.066,1.681),(.012,.021,.025),'DEF-head',skin,20,12)
ellipsoid('Beard',(0,-.042,1.621),(.047,.023,.025),'DEF-head',hair,24,12)
# Hair cap follows the skull. Fine curved tufts break the smooth silhouette.
ellipsoid('Short brown hair',(0,.011,1.764),(.075,.066,.049),'DEF-head',hair)
for j in range(12):
 a=j*math.tau/12;points=[]
 for k in range(8):t=k/7;points.append((.073*math.sin(a)*math.sin(.45+t*1.4),.011+.065*math.cos(a)*math.sin(.45+t*1.4),1.805-.073*t))
 tube('Hair strand',points,.0025,'DEF-head',leather)
tube('Leather brow',[(.078*math.sin(a),.006-.067*math.cos(a),1.737)for a in[-math.pi*.75+j*math.pi*1.5/36 for j in range(37)]],.004,'DEF-head',leather)
# Seat the head into the scarf instead of retaining the old tall neck silhouette.
for part in parts:
 if len(part.vertex_groups)==1 and part.vertex_groups[0].name=='DEF-head':
  for v in part.data.vertices:v.co.z-=.040
# Small chain links around the collar and sleeve seams read as mail at game scale.
for row in range(3):
 for n in range(18):
  a=n*math.tau/18;r=.09+row*.007;bpy.ops.mesh.primitive_torus_add(major_radius=.009,minor_radius=.002,major_segments=8,minor_segments=4,location=(r*math.sin(a),r*math.cos(a),1.485-row*.012));o=bpy.context.object;o.rotation_euler.x=math.pi/2;o.rotation_euler.z=-a;finish(o,'DEF-neck',dark)
# Join the full skin but retain per-surface physically based material groups.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=base;bpy.ops.object.join()
for mod in list(base.modifiers):
 if mod.type=='ARMATURE':base.modifiers.remove(mod)
mod=base.modifiers.new('Warden complete skin','ARMATURE');mod.object=rig;base.parent=rig
# Explicitly preserve the complete matching skeleton, even for unused finger bones.
bpy.ops.object.select_all(action='DESELECT');base.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
out=ROOT/'assets/characters/warden.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_apply=False,export_materials='EXPORT',export_vertex_color='NONE')
manifest={'license':'CC0-1.0','base':'assets/characters/sentinel.glb','baseSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'generatedSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'build':'scripts/build_warden_character.py','changes':['original rounded iron cuirass and overlapping shoulder plates','articulated leather gloves, boots, knee plates and brass fittings','red scarf, mail collar and original sculpted human head with short hair','separate physical iron, cloth, skin and leather materials without baked studio illumination'],'joints':53}
(ROOT/'assets/characters/warden-sources.json').write_text(json.dumps(manifest,indent=2)+'\n');print('WARDEN',len(base.data.vertices),'vertices',len(base.data.polygons),'faces',out.stat().st_size,'bytes')

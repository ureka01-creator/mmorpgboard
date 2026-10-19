"""Align a supplied reference recording and an actual game capture without changing speed.
This produces a review artifact, not a similarity score or proof of Nox provenance.
"""
import argparse,hashlib,json,math,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--reference',required=True,type=Path)
p.add_argument('--reference-start',required=True,type=float,help='Seconds at the first attack input/pose in the reference')
p.add_argument('--game',type=Path,default=Path('docs/motion-review-v2.14/direction-2.mp4'))
p.add_argument('--game-start',type=float,default=1.15)
p.add_argument('--duration',type=float,default=.7)
p.add_argument('--out',type=Path,default=Path('/tmp/elderfall-attack-reference.mp4'))
a=p.parse_args()
for value in [a.reference_start,a.game_start,a.duration]:
 if not math.isfinite(value)or value<0:p.error('Times must be finite and nonnegative')
if a.duration<=0:p.error('Duration must be positive')
inputs=[]
for path,start in [(a.reference,a.reference_start),(a.game,a.game_start)]:
 path=path.resolve()
 if not path.is_file():p.error('Missing local recording: '+str(path))
 meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))
 video=next((s for s in meta['streams']if s['codec_type']=='video'),None)
 if video is None:p.error('No video stream: '+str(path))
 duration=float(meta['format']['duration'])
 if start+a.duration>duration+.001:p.error('Selected interval exceeds recording: '+str(path))
 inputs.append({'path':str(path),'startSeconds':start,'durationSeconds':duration,'sourceFrameRate':video['avg_frame_rate'],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
a.out=a.out.resolve();a.out.parent.mkdir(parents=True,exist_ok=True)
if a.out in [Path(i['path'])for i in inputs]:p.error('Output must not overwrite an input')
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
filters=[]
for i,(source,label)in enumerate(zip(inputs,['Reference recording','Game capture'])):
 filters.append(f'[{i}:v]trim=start={source["startSeconds"]}:duration={a.duration},setpts=PTS-STARTPTS,fps=60,scale=384:320:force_original_aspect_ratio=decrease,pad=384:350:(ow-iw)/2:30+(320-ih)/2:color=black,setsar=1,drawtext=fontfile={font}:text={label}:fontcolor=white:fontsize=16:x=10:y=7[v{i}]')
filters.append('[v0][v1]hstack=inputs=2[v]')
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',inputs[0]['path'],'-i',inputs[1]['path'],'-filter_complex',';'.join(filters),'-map','[v]','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(a.out)],check=True)
manifest={'inputs':inputs,'output':str(a.out),'durationSeconds':a.duration,'playbackSpeedChanged':False,'comparisonComplete':False,'note':'Manually verify reference provenance, attack-start offsets, direction and weapon. This tool aligns recordings only.'}
a.out.with_suffix('.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Saved synchronized original-speed review:',a.out)

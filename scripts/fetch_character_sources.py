"""Fetch pinned, checksum-verified offline build inputs; never needed at game runtime."""
import argparse,hashlib,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--out',type=Path,default=Path('/tmp/elderfall-art-sources'));args=p.parse_args()
for folder,manifest,prefix in [('knight','assets/characters/sources.json','Characters/knight/'),('animation','assets/animations/skinned-sources.json','glTF/')]:
 data=json.loads((ROOT/manifest).read_text());repo=data['mirror'].removeprefix('https://github.com/');commit=data['commit'];target=args.out/folder;target.mkdir(parents=True,exist_ok=True)
 for name,sha in data['sourceSha256'].items():
  dst=target/name
  if dst.exists():
   if hashlib.sha256(dst.read_bytes()).hexdigest()!=sha:raise SystemExit('Existing source differs; choose another --out directory: '+str(dst))
   print('Verified cached',dst);continue
  path=name if name=='LICENSE' else prefix+name
  with urllib.request.urlopen('https://raw.githubusercontent.com/'+repo+'/'+commit+'/'+path,timeout=40) as response:body=response.read()
  if hashlib.sha256(body).hexdigest()!=sha:raise SystemExit('Source checksum mismatch: '+name)
  dst.write_bytes(body);print('Fetched and verified',dst)

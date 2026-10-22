"""Import unchanged illustrated equipment and measure isolated-part UV rectangles."""
import argparse,hashlib,json,shutil
from pathlib import Path
import cv2,numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/sprites/native-motion'
p=argparse.ArgumentParser();p.add_argument('source',type=Path);args=p.parse_args()
target=OUT/'parts.png';shutil.copyfile(args.source,target)
im=np.asarray(Image.open(target).convert('RGBA'));h,w=im.shape[:2]
n,labels,stats,centers=cv2.connectedComponentsWithStats((im[:,:,3]>32).astype('uint8'),8)
ids=sorted(range(1,n),key=lambda i:stats[i,4],reverse=True)[:8]
assert len(ids)==8 and all(stats[i,4]>10000 for i in ids)
ids=sorted(ids,key=lambda i:centers[i,1]);rows=[sorted(ids[:4],key=lambda i:centers[i,0]),sorted(ids[4:],key=lambda i:centers[i,0])]
meta={'image':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'width':w,'height':h,'rects':[stats[i,:4].tolist()for row in rows for i in row],'source':args.source.name}
(OUT/'parts.json').write_text(json.dumps(meta,indent=2)+'\n')
print('Imported unchanged equipment artwork and measured eight part rectangles')

"""Read-only hair landmarks for sprite alignment; source artwork is never repainted."""
import numpy as np
from scipy.ndimage import label,find_objects

def hair_landmark(rgba,box,boot):
 x0,y0,x1,y1=box;im=rgba[y0:y1,x0:x1];r,g,b=[im[:,:,i].astype(float)for i in range(3)]
 mask=(im[:,:,3]>128)&(r>g*1.16)&(r<g*1.75)&(g>b*1.04)&(b<85)&(r>24)&(r<125)
 mask[max(0,int((boot-y0)*.70)):]=False
 labels,n=label(mask);sizes=np.bincount(labels.ravel());candidates=[]
 for i,sl in enumerate(find_objects(labels),1):
  if sl is None:continue
  y,x=sl
  if sizes[i]>=300 and y.stop-y.start>=10 and y.start<(boot-y0)*.60:
   yy,xx=np.nonzero(labels[y.start:min(y.stop,y.start+20)]==i)
   if len(xx) and 12<=xx.max()-xx.min()+1<=65:candidates.append((y.start,float(np.median(xx)),int(xx.max()-xx.min()+1),int(sizes[i])))
 if not candidates:raise ValueError('Cannot identify brown hair '+str(box.tolist()))
 top,cx,width,area=min(candidates,key=lambda c:c[0]);return np.array([x0+cx,y0+top+12]),width,y0+top,area

class HeadTracker:
 def __init__(self,rgba,box,boot,guide):
  self.rgba=rgba;self.guide=guide;self.initial,self.width,top,_=hair_landmark(rgba,box,boot)
  self.scale=(boot-self.initial[1])/(guide[0]['sole'][1]-guide[0]['head'][1]);self.pixelScale=2.05/(boot-top)
 def locate(self,i,cell,box,boot):
  head,width,top,area=hair_landmark(self.rgba,box,boot)
  return head,width/self.width,area

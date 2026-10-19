"""Compare actual GPU sequence peaks with the immutable 2.12 baseline; not a Nox score."""
import json,os
from pathlib import Path
baseline=Path(os.environ.get('ARENA_SEQUENCE_BASELINE','/tmp/elderfall-sequence-212/metrics.json'))
current=Path(os.environ.get('ARENA_SEQUENCE_CURRENT','/tmp/elderfall-sequence-213/metrics.json'))
a=json.loads(baseline.read_text());b=json.loads(current.read_text());rows=[]
for before,after in zip(a['directions'],b['directions']):
 assert before['direction']==after['direction']
 def peak(item,start,end):return max(item['changes'].get(str(i),0)for i in range(start,end+1))
 stop=peak(after,39,44)/peak(before,39,44);entry=peak(after,69,75)/peak(before,69,75)
 assert stop<.9 and entry<.95,(before['direction'],stop,entry)
 assert after['changes']['69']<before['changes']['69']*.2
 rows.append({'direction':before['direction'],'stopPeakRatio':round(stop,5),'entryPeakRatio':round(entry,5)})
assert len(rows)==8
print('PASS 8-direction continuous GPU stop/attack-entry comparison',rows,flush=True)

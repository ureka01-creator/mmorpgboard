"""Publish only the static RPG files to gh-pages without changing this checkout."""
import os,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
FILES=['index.html','styles.css','rpg-engine.js','app.js','.nojekyll','assets/rpg-world.png','assets/rpg-characters.png','assets/heroes.png']
def git(*args,env=None):return subprocess.check_output(['git',*args],env=env,text=True).strip()
if git('status','--porcelain'):
 raise SystemExit('Commit or resolve all source changes before publishing.')
for name in FILES:
 if not (ROOT/name).is_file():raise SystemExit('Missing deployment file: '+name)
subprocess.run(['git','fetch','origin','gh-pages'],check=True)
parent=git('rev-parse','FETCH_HEAD')
with tempfile.TemporaryDirectory(prefix='elderfall-deploy-') as tmp:
 env=dict(os.environ,GIT_INDEX_FILE=tmp+'/index')
 git('read-tree','--empty',env=env);git('add','--',*FILES,env=env)
 tree=git('write-tree',env=env)
 commit=git('commit-tree',tree,'-p',parent,'-m','Deploy Elderfall party RPG prototype 1.0')
# Push the new child commit directly; no force push or local branch/checkout replacement.
subprocess.run(['git','push','origin',commit+':refs/heads/gh-pages'],check=True)
print('Published gh-pages commit '+commit,flush=True)

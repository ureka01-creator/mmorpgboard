"""Publish only the static RPG files to gh-pages without changing this checkout."""
import os,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
from publication_files import publication_files
FILES=publication_files(ROOT)+['.nojekyll']
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
 commit=git('commit-tree',tree,'-p',parent,'-m','Add verified native walk and sword animation resource review')
# Push the new child commit directly; no force push or local branch/checkout replacement.
subprocess.run(['git','push','origin',commit+':refs/heads/gh-pages'],check=True)
print('Published gh-pages commit '+commit,flush=True)

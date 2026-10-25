"""Build current API mode into a disposable directory; never deploy or edit app source."""
from pathlib import Path
import json, os, subprocess, tempfile
root=Path.cwd(); app=root/'dealsonline_ui_ux_mock'
stage=Path(tempfile.mkdtemp(prefix='soko-seo-stage-'))
(stage/'scripts').symlink_to(app/'scripts',target_is_directory=True)
(stage/'src').symlink_to(app/'src',target_is_directory=True)
(stage/'node_modules').mkdir()
for child in (app/'node_modules').iterdir():
    if child.name != '.cache': (stage/'node_modules'/child.name).symlink_to(child,target_is_directory=child.is_dir())
(stage/'node_modules'/'.cache').mkdir()
env=os.environ.copy(); env.update(VITE_CATALOGUE='api',VITE_AD_SLOTS='off',SITE_URL='https://dealsonline-d58.pages.dev')
node=Path('/home/reginaldkyalo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
out=root/'docs/scraping-seo-review-2026-10-23/evidence';out.mkdir(exist_ok=True)
(out/'stage.json').write_text(json.dumps({'stage':str(stage),'note':'Temporary local build, never deployed','site_url_for_test':env['SITE_URL']},indent=2))
with (out/'isolated-build.log').open('w') as log:
    for command,cwd in [([str(node),str(app/'node_modules/vite/bin/vite.js'),'build','--outDir',str(stage/'dist'),'--emptyOutDir'],app),([str(node),str(stage/'scripts/postbuild.mjs')],stage)]:
        result=subprocess.run(command,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
        if result.returncode: print('Build failed; see evidence/isolated-build.log');raise SystemExit(result.returncode)
html=list((stage/'dist').rglob('*.html'))
result={'stage':str(stage),'dist_demo_exists':(stage/'dist/demo').exists(),'private_catalogue_exists':(stage/'.catalogue/manifest.json').exists(),'html_files':len(html),'json_files_in_public_dist':len(list((stage/'dist').rglob('*.json')))}
(out/'isolated-build.json').write_text(json.dumps(result,indent=2)); print(json.dumps(result))

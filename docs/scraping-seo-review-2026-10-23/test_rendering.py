"""Actual browser render of isolated current API build, with and without API access."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
OUT=Path(__file__).parent/'evidence'
probe=json.loads((OUT/'live-probes.json').read_text())
product=next(r['path'] for r in probe['requests'] if r['label']=='product')
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    for name,js,block in [('no-javascript',False,False),('api-available',True,False),('api-blocked',True,True)]:
        ctx=browser.new_context(java_script_enabled=js,viewport={'width':1280,'height':900})
        page=ctx.new_page(); blocked=[]; failures=[]
        def route(r):
            u=r.request.url
            if not u.startswith('http://127.0.0.1:8765'):
                r.abort();return
            if block and '/api/' in u:
                blocked.append(u);r.abort();return
            r.continue_()
        page.route('**/*',route)
        page.on('pageerror',lambda e:failures.append(str(e)))
        response=page.goto('http://127.0.0.1:8765'+product,wait_until='networkidle',timeout=45000)
        page.wait_for_timeout(1500)
        text=page.locator('body').inner_text()
        row={'name':name,'status':response.status,'h1':page.locator('h1').all_text_contents(),'KES_mentions':text.count('KES '),'shop_links':page.get_by_role('link',name=re.compile('Go to shop')).count(),'blocked_requests':len(blocked),'page_errors':failures,'body_text':text[:14000]}
        results.append(row);page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
        print(json.dumps({k:v for k,v in row.items() if k!='body_text'}),flush=True);ctx.close()
    browser.close()
(OUT/'rendering.json').write_text(json.dumps(results,indent=2))

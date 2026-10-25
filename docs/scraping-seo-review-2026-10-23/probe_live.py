"""Bounded, sequential, read-only probes of the owner-provided public site.

No crawling loop, credential use, challenge bypass, POST, or rate-limit stress.
Each response is capped at 2 MB. Redirects stay on the supplied hostname.
"""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import json
import time
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone

BASE = 'https://dealsonline-d58.pages.dev'
OUT = Path(__file__).parent / 'evidence'
OUT.mkdir(exist_ok=True)
LIMIT = 2_000_000
NORMAL = 'SokoPulseReview/1.0 (owner-requested SEO and exposure review)'

class SameHost(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).netloc != urllib.parse.urlsplit(BASE).netloc:
            raise RuntimeError('Cross-host redirect not followed: ' + newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class HTMLFacts(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.canonical=[]; self.robots=[]; self.h1=[]
        self.rows=0; self.jsonld=0; self.in_h1=False; self.text=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href'))
        if tag=='meta' and a.get('name')=='robots': self.robots.append(a.get('content'))
        if tag=='h1': self.in_h1=True
        if tag=='tr': self.rows+=1
        if tag=='script' and a.get('type')=='application/ld+json': self.jsonld+=1
    def handle_endtag(self, tag):
        if tag=='h1': self.in_h1=False
    def handle_data(self, data):
        if self.in_h1: self.h1.append(data.strip())
        self.text.append(data)

opener=urllib.request.build_opener(SameHost())
results=[]
def probe(label, path, ua=NORMAL):
    start=time.monotonic(); body=b''
    row={'label':label,'path':path,'user_agent':ua}
    try:
        req=urllib.request.Request(BASE+path,headers={'User-Agent':ua,'Accept':'*/*'})
        try: response=opener.open(req,timeout=25)
        except urllib.error.HTTPError as e: response=e
        with response:
            body=response.read(LIMIT+1)
            row.update(status=response.status,final_url=response.url,
                headers={k:v for k,v in response.headers.items() if k.lower() in {
                    'content-type','cache-control','x-robots-tag','cf-cache-status',
                    'cf-mitigated','location','server','retry-after','content-length',
                    'access-control-allow-origin','vary'}})
        row['truncated']=len(body)>LIMIT; body=body[:LIMIT]
        row['bytes_read']=len(body); row['sha256']=hashlib.sha256(body).hexdigest()
        content=body.decode('utf-8','replace')
        ct=next((v for k,v in row['headers'].items() if k.lower()=='content-type'),'')
        if 'html' in ct:
            facts=HTMLFacts(); facts.feed(content)
            row['html']={k:getattr(facts,k) for k in ['h1','canonical','robots','rows','jsonld']}
            row['html']['product_links']=sum('/prices/' in x for x in facts.links)
            row['html']['price_mentions']=content.count('KES ')
            row['html']['hidden_export_link']='/data/catalogue-export' in content
        if 'json' in ct and not row['truncated']:
            try:
                value=json.loads(content)
                row['json_type']=type(value).__name__
                row['json_keys']=list(value)[:35] if isinstance(value,dict) else []
                if isinstance(value,dict):
                    row['array_counts']={k:len(v) for k,v in value.items() if isinstance(v,list)}
                    row['scalars']={k:v for k,v in value.items() if k in {'total_clusters','total_stores','count','pages','page','total','cardCount','capped'}}
                elif isinstance(value,list): row['row_count']=len(value)
            except ValueError: row['invalid_json']=True
        if label in {'home','robots','sitemap','product','search'}:
            (OUT/(label+'.txt')).write_text(content)
    except Exception as e: row['error']=str(e)
    row['elapsed_seconds']=round(time.monotonic()-start,3); results.append(row)
    (OUT/'live-probes.json').write_text(json.dumps({'tested_at':datetime.now(timezone.utc).isoformat(),'requests':results},indent=2))
    print(json.dumps({k:row[k] for k in ['label','status','bytes_read','error','html','array_counts','scalars'] if k in row}),flush=True)
    time.sleep(0.7)
    return body

if __name__=='__main__':
    home=probe('home','/').decode('utf-8','replace')
    facts=HTMLFacts(); facts.feed(home)
    probe('robots','/robots.txt')
    probe('sitemap','/sitemap.xml')
    probe('raw-manifest','/demo/manifest.json')
    probe('api-manifest','/api/catalogue/manifest')
    probe('category','/browse/mobile-phones')
    probe('search','/search?q=Samsung')
    product=next((x for x in facts.links if x.startswith('/prices/')),None)
    if product:
        probe('product',product)
        probe('product-googlebot-ua',product,'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
        probe('api-detail','/api/catalogue/detail?id='+urllib.parse.quote(urllib.parse.unquote(product.split('/prices/',1)[1]),safe=''))
    probe('raw-card-index','/demo/cards/mobile-phones.json')
    probe('raw-category-page','/demo/categories/mobile-phones-000.json')
    probe('api-category-cap','/api/catalogue/category?slug=mobile-phones&limit=10000')
    probe('api-search-cap','/api/catalogue/search?q=Samsung&slug=mobile-phones&limit=10000')
    probe('missing-page','/review-nonexistent-page-20261023')

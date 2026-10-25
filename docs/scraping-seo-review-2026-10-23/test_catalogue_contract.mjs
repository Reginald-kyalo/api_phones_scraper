// Executes current production handler against a read-only local R2 substitute.
// This is an audit harness, not deployed mitigation code.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=resolve(process.argv[2] || 'dealsonline_ui_ux_mock');
const require=createRequire(join(root,'package.json'));
const {build}=require('esbuild');
const stage=await mkdtemp(join(tmpdir(),'soko-api-audit-'));
const bundle=join(stage,'handler.mjs');
await build({entryPoints:[join(root,'functions/api/catalogue/[[op]].ts')],outfile:bundle,bundle:true,platform:'node',format:'esm',logLevel:'error',define:{'import.meta.env.BASE_URL':'"/"'}});
const {onRequestGet}=await import(pathToFileURL(bundle));
let reads=0;
const env={CATALOGUE:{get:async path=>{reads++;try {const str=await readFile(join(root,'public/demo',path),'utf8');return {json:async()=>JSON.parse(str)};}catch{return null;}}},ASSETS:{fetch:()=>{throw new Error('Unexpected public asset fallback')}}};
const rows=[];
async function audit(name,path,expect){
  const before=reads;
  const url=new URL(path,'https://audit.example');
  const params={op:url.pathname.split('/').slice(3)};
  const response=await onRequestGet({request:new Request(url),env,params});
  const raw=await response.text(); let data;
  try{data=JSON.parse(raw)}catch{}
  const count=(data?.results?.length??0)+(data?.plain?.length??0);
  const actual={status:response.status,bytes:Buffer.byteLength(raw),results:data?.results?.length,plain:data?.plain?.length,total_product_rows:count,page:data?.page,file_reads:reads-before,keys:data?Object.keys(data):[],headers:Object.fromEntries(response.headers)};
  const row={name,path,expected:expect.description,pass:expect.check(actual,data),actual};rows.push(row);
  console.log(JSON.stringify({name,pass:row.pass,status:actual.status,rows:count,bytes:actual.bytes}));
  return data;
}
const cap={description:'200 JSON; at most 96 product rows across arrays',check:a=>a.status===200&&a.total_product_rows<=96};
const bad={description:'400 for malformed or unsupported input',check:a=>a.status===400};
await audit('manifest','/api/catalogue/manifest',{description:'200 with no public shard layout metadata',check:(a,d)=>a.status===200&&!d.categories.some(c=>'buckets'in c)});
const c=await audit('category cap','/api/catalogue/category?slug=mobile-phones&limit=10000',cap);
await audit('search scoped cap','/api/catalogue/search?q=Samsung&slug=mobile-phones&limit=10000',cap);
await audit('search broad cap','/api/catalogue/search?q=a&limit=10000',cap);
await audit('shelf cap','/api/catalogue/shelf?slug=smartphone-tablet-wearable&limit=10000',cap);
await audit('negative limit','/api/catalogue/category?slug=mobile-phones&limit=-2',bad);
await audit('non-finite limit','/api/catalogue/category?slug=mobile-phones&limit=Infinity',bad);
await audit('decimal page','/api/catalogue/browse?slug=mobile-phones&page=0.5',bad);
await audit('unexpected path suffix','/api/catalogue/manifest/extra',{description:'404 for unsupported route',check:a=>a.status===404});
await audit('unknown operation','/api/catalogue/does-not-exist',{description:'404 for unsupported route',check:a=>a.status===404});
await audit('oversized query','/api/catalogue/search?q='+('a'.repeat(257)),bad);
await audit('single detail','/api/catalogue/detail?id='+encodeURIComponent(c.results[0].cluster_id),{description:'200 for one product; record response fields for minimisation review',check:a=>a.status===200});
const out=resolve('docs/scraping-seo-review-2026-10-23/evidence');await mkdir(out,{recursive:true});
await writeFile(join(out,'catalogue-contract.json'),JSON.stringify({note:'Current handler tested against proposed hardening contracts. Failures are audit findings, not deployment failures.',rows},null,2));

// Local test adapter for Pages static responses and the actual catalogue handler.
// No Cloudflare WAF, verified-bot signal or distributed limiter is emulated here.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),app=join(root,'dealsonline_ui_ux_mock');
const stage=JSON.parse(await readFile(join(root,'docs/scraping-seo-review-2026-10-23/evidence/stage.json'),'utf8')).stage;
const {build}=createRequire(join(app,'package.json'))('esbuild');
const bundle=join(stage,'handler.mjs');
await build({entryPoints:[join(app,'functions/api/catalogue/[[op]].ts')],outfile:bundle,bundle:true,platform:'node',format:'esm',logLevel:'error',define:{'import.meta.env.BASE_URL':'"/"'}});
const {onRequestGet}=await import(pathToFileURL(bundle));
const env={CATALOGUE:{get:async path=>{try {const str=await readFile(join(stage,'.catalogue',path),'utf8');return {json:async()=>JSON.parse(str)};}catch{return null;}}},ASSETS:{fetch:()=>{throw new Error('Public fallback disabled in local adapter')}}};
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:8765');
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    if(url.pathname.startsWith('/api/catalogue/')){
      const r=await onRequestGet({request:new Request(url),env,params:{op:url.pathname.slice('/api/catalogue/'.length).split('/')}});
      res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;
    }
    const dist=join(stage,'dist');let file,status=200;
    const raw=resolve(dist,'.'+decodeURIComponent(url.pathname));
    if(!raw.startsWith(dist+'/')&&raw!==dist){res.writeHead(404);res.end();return;}
    for(const f of [raw,raw+'.html',join(raw,'index.html')]){try{if((await stat(f)).isFile()){file=f;break;}}catch{}}
    if(!file){file=join(dist,'404.html');status=404;}
    const ext=file.split('.').pop();
    const type={html:'text/html',js:'application/javascript',css:'text/css',json:'application/json',svg:'image/svg+xml',txt:'text/plain',xml:'application/xml',png:'image/png',woff2:'font/woff2'}[ext]||'application/octet-stream';
    res.writeHead(status,{'content-type':type});res.end(await readFile(file));
  }catch(e){res.writeHead(500,{'content-type':'text/plain'});res.end('Local test adapter error: '+e.message);}
}).listen(8765,'127.0.0.1',()=>console.log('Local SEO test adapter ready'));

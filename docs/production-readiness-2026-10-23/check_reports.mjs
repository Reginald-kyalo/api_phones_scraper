// Offline review harness. No network, real D1 writes or report submissions.
import { createRequire } from 'node:module';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve('dealsonline_ui_ux_mock');
const { build } = createRequire(join(root, 'package.json'))('esbuild');
const tmp = await mkdtemp(join(tmpdir(), 'production-report-review-'));
await build({entryPoints:[join(root,'functions/api/reports.ts')],outfile:join(tmp,'reports.mjs'),bundle:true,platform:'node',format:'esm',logLevel:'error'});
const { onRequestPost } = await import(pathToFileURL(join(tmp,'reports.mjs')));
const cases = [];
async function check(name, body, env = {}) {
  const ctx = {request:new Request('https://review.example/api/reports',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),env,waitUntil:()=>{}};
  try {
    const r=await onRequestPost(ctx);
    cases.push({name,status:r.status,body:await r.text()});
  } catch(e) {cases.push({name,uncaught:e.constructor.name,message:e.message});}
}
await check('null JSON body',null);
await check('numeric scope',{scope:42});
await check('numeric facet kind',{scope:'site',facets:[{kind:42}]});
await check('no configured sink',{scope:'site',note:'offline fixture'});
let parentWrites = 0;
const db={prepare:()=>({bind(){return this},async run(){parentWrites++;return {meta:{last_row_id:1}}}}),batch:async()=>{throw new Error('simulated facet write failure')}};
await check('facet write fails after parent insert',{scope:'site',facets:[{kind:'other',value:'offline fixture'}]},{DB:db});
cases.at(-1).parentWrites=parentWrites;
const realFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response('<html>Webhook application error</html>',{status:200,headers:{'content-type':'text/html'}});
try {await check('primary webhook returns HTML error with HTTP 200',{scope:'site',note:'offline fixture'},{REPORT_SINK:'webhook',REPORT_WEBHOOK_URL:'https://fixture.invalid/never-contacted'});}
finally {globalThis.fetch=realFetch;}
const result={scope:'Local handler with fake storage and intercepted fetch only',cases};
await writeFile('docs/production-readiness-2026-10-23/report-checks.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));

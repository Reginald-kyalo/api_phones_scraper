/**
 * Cloudflare Pages Function — POST /api/reports
 *
 * The site is otherwise fully static. This is the one server-side surface, and
 * it exists because bad matches are the dataset's known weak point: roughly 1 in
 * 6 automatic merges joins what a human would call variants, and only a reader
 * looking at the page can tell us which ones.
 *
 * Storage is D1 (binding `DB`). Pages Functions deploy from this repo with the
 * site, so there is no second service to run.
 *
 * ── SHAPE ──────────────────────────────────────────────────────────────────
 * One submission = one `reports` row (the context) + N `report_facets` rows (one
 * per thing the reader ticked). The valuable question — "do these belong
 * together?" — is one verdict PER ABSORBED CLUSTER, so a 5-way merge yields five
 * independently usable labels rather than one blob to re-parse later.
 *
 * ⚠️ A report is anchored on more than cluster_id. 4,082 clusters are unions of
 * several engine clusters, so a cluster_id can stop resolving after a rebuild.
 * `store_url` on a facet points at a real listing that exists independently of
 * our clustering, and `captured_at` says which snapshot the reader saw. The
 * absorbed ids are now published as `mvp_merged_from`, so a grouping facet can
 * name exactly which id it judged.
 */

/**
 * ── WHERE REPORTS GO ───────────────────────────────────────────────────────
 * The browser only ever knows the string "/api/reports". Storage is entirely
 * this function's business, and swapping it is an environment variable in the
 * Pages dashboard — no code change, no rebuild, no client release.
 *
 * ⭐ Forwarding from the EDGE rather than the browser is what makes that cheap.
 * A page posting straight to a Google Apps Script or an Airtable endpoint hits a
 * CORS preflight it cannot satisfy and a redirect it cannot follow, and any key
 * it carried would be readable in the JS bundle. Server-side, none of that
 * applies: any HTTPS endpoint works, and the credential never leaves Cloudflare.
 *
 *   REPORT_SINK          d1 | webhook | both   (default: whatever is configured)
 *   REPORT_WEBHOOK_URL   any endpoint that accepts a JSON POST
 *   REPORT_WEBHOOK_TOKEN optional; sent as Authorization: Bearer …
 *
 * ⚠️ A PRIMARY SINK IS AWAITED; A MIRROR IS NOT. With both configured, D1 is the
 * store of record and the webhook is fire-and-forget via waitUntil — a reader
 * should not wait on Google Sheets to be told their report landed. With only a
 * webhook configured it becomes the primary and IS awaited, because otherwise
 * the 201 would be a claim nothing backs.
 */
interface Env {
  DB?: D1Database;
  REPORT_SINK?: string;
  REPORT_WEBHOOK_URL?: string;
  REPORT_WEBHOOK_TOKEN?: string;
}

/** One submission, flattened — the shape every sink receives. */
interface Record_ {
  scope: string;
  cluster_id: string | null;
  title: string | null;
  category: string | null;
  captured_at: string | null;
  page_url: string | null;
  note: string | null;
  country: string | null;
  facets: { kind: string; subject: string | null; value: string | null }[];
}

interface FacetIn {
  kind?: string;
  subject?: string | null;
  value?: string | number | null;
}

interface ReportBody {
  scope?: string;
  cluster_id?: string;
  title?: string;
  category?: string;
  captured_at?: string;
  page_url?: string;
  note?: string;
  facets?: FacetIn[];
}

const SCOPES = new Set(['cluster', 'deal', 'site']);

/**
 * The checklist axes. Each names something the reader can actually see on the
 * page, because a report is only actionable if it points at one artefact:
 * `grouping` routes to the matcher, `category` to the categoriser, `price` and
 * `lowest_price` to the price guard, `dead_link` to freshness.
 *
 * Keep in step with the checklist the UI renders.
 */
const KINDS = new Set([
  'grouping',      // subject = absorbed cluster_id, value = 'wrong' | 'ok'
  'title',         // value = corrected name (optional)
  'image',
  'category',      // value = the category it belongs in (optional)
  'price',         // subject = store, value = corrected price (optional)
  'dead_link',     // subject = store
  'lowest_price',  // value = the store that is actually cheapest (optional)
  'spread',        // value = why the % is wrong (optional)
  'not_a_deal',    // value = why (optional)
  'other',
]);

const MAX_NOTE = 1000;
const MAX_VALUE = 200;
const MAX_SUBJECT = 300;
// A page shows at most a few dozen tickable things; anything beyond this is a
// script, not a reader. Rejected rather than truncated — silently storing half a
// submission would look like a reader who ticked half.
const MAX_FACETS = 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const trim = (v: unknown, max: number): string | null => {
  const s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v : '';
  const out = s.trim().slice(0, max);
  return out || null;
};

/** The store of record: one `reports` row + one `report_facets` row per tick. */
async function storeInD1(db: D1Database, r: Record_): Promise<void> {
  const insert = await db
    .prepare(
      `INSERT INTO reports
         (scope, cluster_id, title, category, captured_at, page_url, note,
          country, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      r.scope, r.cluster_id, r.title, r.category, r.captured_at, r.page_url,
      r.note, r.country,
    )
    .run();

  const reportId = insert.meta?.last_row_id;
  if (r.facets.length && reportId) {
    // Batched so the facets land with the report or not at all — a report whose
    // ticks silently vanished would read as "reader ticked nothing".
    await db.batch(
      r.facets.map((f) =>
        db
          .prepare(
            `INSERT INTO report_facets (report_id, kind, subject, value)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(reportId, f.kind, f.subject, f.value),
      ),
    );
  }
}

/**
 * Any endpoint that accepts a JSON POST: a Google Apps Script bound to a sheet,
 * Airtable, Supabase, the project's own FastAPI, a queue.
 *
 * ⚠️ A 2xx is the ONLY thing treated as stored. Apps Script in particular answers
 * 200 with an HTML error page when the script itself throws, so a bare "did it
 * respond" check would accept failures — the status is what gets trusted, and
 * nothing here infers success from the body.
 */
async function storeViaWebhook(env: Env, r: Record_): Promise<void> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (env.REPORT_WEBHOOK_TOKEN) {
    headers.authorization = `Bearer ${env.REPORT_WEBHOOK_TOKEN}`;
  }
  const res = await fetch(env.REPORT_WEBHOOK_URL as string, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...r, received_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
}

/** Which sinks this deployment actually has, honouring REPORT_SINK if set. */
function sinksFor(env: Env): { d1: boolean; webhook: boolean } {
  const wanted = (env.REPORT_SINK || '').trim().toLowerCase();
  const d1Ready = !!env.DB;
  const hookReady = !!env.REPORT_WEBHOOK_URL;
  if (wanted === 'd1') return { d1: d1Ready, webhook: false };
  if (wanted === 'webhook') return { d1: false, webhook: hookReady };
  // Unset or "both": use everything that is configured. A deployment with only
  // one of them set therefore needs no REPORT_SINK at all.
  return { d1: d1Ready, webhook: hookReady };
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: ReportBody;
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: 'expected a JSON body' }, 400);
  }

  const scope = (body.scope || 'cluster').trim();
  if (!SCOPES.has(scope)) return json({ error: 'unknown scope' }, 400);

  const clusterId = (body.cluster_id || '').trim();
  // Only a site-wide report may omit the product; anything else without one
  // cannot be routed to a fix.
  if (scope !== 'site' && !clusterId) {
    return json({ error: 'cluster_id is required unless scope is "site"' }, 400);
  }

  const facets = Array.isArray(body.facets) ? body.facets : [];
  if (facets.length > MAX_FACETS) return json({ error: 'too many facets' }, 400);

  const note = trim(body.note, MAX_NOTE);
  const clean: { kind: string; subject: string | null; value: string | null }[] = [];
  for (const f of facets) {
    const kind = (f?.kind || '').trim();
    if (!KINDS.has(kind)) return json({ error: `unknown facet kind: ${kind}` }, 400);
    clean.push({
      kind,
      subject: trim(f.subject, MAX_SUBJECT),
      value: trim(f.value, MAX_VALUE),
    });
  }

  // A submission with neither a ticked box nor a comment says nothing. Reject it
  // rather than storing an empty row that inflates every count downstream.
  if (!clean.length && !note) {
    return json({ error: 'nothing reported' }, 400);
  }

  const record: Record_ = {
    scope,
    cluster_id: clusterId || null,
    title: trim(body.title, 500),
    category: trim(body.category, 100),
    captured_at: trim(body.captured_at, 40),
    page_url: trim(body.page_url, 500),
    note,
    // Coarse origin only — enough to spot a flood, not enough to identify anyone.
    country: ctx.request.headers.get('cf-ipcountry') || null,
    facets: clean,
  };

  const sinks = sinksFor(ctx.env);

  // ⛔ No sink is a DEPLOYMENT fault, not a reader's. Saying "try again in a
  // moment" would invite them to retype a report that can never land, so it is a
  // 503 with a distinct message rather than the generic write failure below.
  if (!sinks.d1 && !sinks.webhook) {
    return json({ error: 'no report storage is configured' }, 503);
  }

  // D1 is the store of record wherever it exists; a webhook alongside it is a
  // mirror and must not make the reader wait. Whichever one is PRIMARY is
  // awaited, because a 201 has to be backed by a write that actually finished.
  const primary = sinks.d1
    ? () => storeInD1(ctx.env.DB as D1Database, record)
    : () => storeViaWebhook(ctx.env, record);

  try {
    await primary();
  } catch {
    // Never claim a report was filed when it was not.
    return json({ error: 'could not save the report' }, 500);
  }

  if (sinks.d1 && sinks.webhook) {
    // Mirror failures are deliberately invisible to the reader: the report IS
    // stored, and reporting the mirror's problem to them would be both useless
    // and untrue. waitUntil keeps the request alive past the response.
    ctx.waitUntil(storeViaWebhook(ctx.env, record).catch(() => {}));
  }

  return json({ ok: true, facets: clean.length }, 201);
};

/** Anything other than POST — say so rather than falling through to the SPA. */
export const onRequest: PagesFunction<Env> = async (ctx) =>
  ctx.request.method === 'POST'
    ? onRequestPost(ctx as never)
    : json({ error: 'method not allowed' }, 405);

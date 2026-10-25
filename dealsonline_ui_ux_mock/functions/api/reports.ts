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
  /** '1' makes the Idempotency-Key header mandatory (production). */
  REPORT_REQUIRE_KEY?: string;
}

import { readReportRequest } from '../lib/reportRequest';

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

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });

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
  // Validation happens before any storage call. Keys are optional until the
  // staging/client transition ends (REPORT_REQUIRE_KEY=1 in production).
  const req = await readReportRequest(ctx.request, {
    requireKey: ctx.env.REPORT_REQUIRE_KEY === '1',
  });
  if (!req.ok) return json({ error: req.error }, req.status);
  const { report } = req;
  const clean = report.facets;

  const record: Record_ = {
    scope: report.scope,
    cluster_id: report.cluster_id,
    title: report.title,
    category: report.category,
    captured_at: report.captured_at,
    page_url: report.page_url,
    note: report.note,
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
    : json({ error: 'method not allowed' }, 405, { allow: 'POST' });

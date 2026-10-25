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
 * ⚠️ D1 IS THE ONLY PRIMARY. With both configured, D1 is the store of record and
 * the webhook is a fire-and-forget mirror via waitUntil — a reader should not
 * wait on Google Sheets to be told their report landed. A webhook-only
 * deployment (no `DB`) answers 503 and never calls the webhook: it has no
 * idempotency, so client retries would duplicate reports at the sink.
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
import { ReportConflictError, saveReport } from '../lib/reportStore';

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
  const production = ctx.env.REPORT_REQUIRE_KEY === '1';
  const req = await readReportRequest(ctx.request, { requireKey: production });
  if (!req.ok) return json({ error: req.error }, req.status);
  const { report, submissionKey } = req;
  // Coarse origin only — enough to spot a flood, not enough to identify anyone.
  const country = ctx.request.headers.get('cf-ipcountry') || null;

  // ⛔ FIRST-LAUNCH PRODUCTION PROFILE (REPORT_REQUIRE_KEY=1): D1 is required and
  // the webhook is neither a primary nor a mirror. A webhook cannot give the
  // atomic, idempotent receipt this profile promises. Outside this
  // profile D1 is still the only primary; a webhook-only deployment answers 503.
  const sinks = production
    ? { d1: !!ctx.env.DB, webhook: false }
    : sinksFor(ctx.env);

  // ⛔ No sink is a DEPLOYMENT fault, not a reader's. Saying "try again in a
  // moment" would invite them to retype a report that can never land, so it is a
  // 503 with a distinct message and no Retry-After.
  if (!sinks.d1 && !sinks.webhook) {
    return json({ error: 'no report storage is configured' }, 503);
  }

  const record: Record_ = { ...report, country, facets: report.facets };
  const unavailable = () =>
    json({ error: 'could not save the report' }, 503, { 'retry-after': '30' });

  if (!sinks.d1) {
    // ⛔ Webhook-only is no longer a supported sink for submissions. The client
    // treats a bare `{ok:true, facets}` as a failure and retries, and the webhook
    // path has no idempotency, so every retry would duplicate the report at the
    // sink. Answer as an unconfigured deployment and never call the webhook as
    // primary. (D1 primary + webhook mirror, outside production mode, is intact.)
    return json({ error: 'no report storage is configured' }, 503, { 'retry-after': '30' });
  }

  let saved: { reportId: string; reference: string; created: boolean };
  try {
    saved = await saveReport(ctx.env.DB as D1Database, submissionKey, report, { country });
  } catch (err) {
    if (err instanceof ReportConflictError) {
      // Never echo the stored or submitted report.
      return json({ error: 'this submission key was already used for a different report' }, 409);
    }
    // Never claim a report was filed when it was not.
    return unavailable();
  }

  // A mirror (legacy, non-production) is told about a report once, on its first
  // write — a replay must not duplicate it. Its failures are deliberately
  // invisible: the report IS stored. waitUntil keeps the request alive.
  if (saved.created && sinks.webhook) {
    ctx.waitUntil(storeViaWebhook(ctx.env, record).catch(() => {}));
  }

  return json(
    { ok: true, report_id: saved.reportId, submission_key: submissionKey, reference: saved.reference },
    saved.created ? 201 : 200,
  );
};

/** Anything other than POST — say so rather than falling through to the SPA. */
export const onRequest: PagesFunction<Env> = async (ctx) =>
  ctx.request.method === 'POST'
    ? onRequestPost(ctx as never)
    : json({ error: 'method not allowed' }, 405, { allow: 'POST' });

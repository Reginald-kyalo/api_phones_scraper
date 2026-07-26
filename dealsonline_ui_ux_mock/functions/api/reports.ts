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

interface Env {
  DB: D1Database;
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

  // Coarse origin only — enough to spot a flood, not enough to identify anyone.
  const country = ctx.request.headers.get('cf-ipcountry') || null;

  try {
    const insert = await ctx.env.DB.prepare(
      `INSERT INTO reports
         (scope, cluster_id, title, category, captured_at, page_url, note,
          country, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        scope,
        clusterId || null,
        trim(body.title, 500),
        trim(body.category, 100),
        trim(body.captured_at, 40),
        trim(body.page_url, 500),
        note,
        country,
      )
      .run();

    const reportId = insert.meta?.last_row_id;
    if (clean.length && reportId) {
      // Batched so the facets land with the report or not at all — a report whose
      // ticks silently vanished would read as "reader ticked nothing".
      await ctx.env.DB.batch(
        clean.map((f) =>
          ctx.env.DB.prepare(
            `INSERT INTO report_facets (report_id, kind, subject, value)
             VALUES (?, ?, ?, ?)`,
          ).bind(reportId, f.kind, f.subject, f.value),
        ),
      );
    }
  } catch {
    // Never claim a report was filed when it was not.
    return json({ error: 'could not save the report' }, 500);
  }

  return json({ ok: true, facets: clean.length }, 201);
};

/** Anything other than POST — say so rather than falling through to the SPA. */
export const onRequest: PagesFunction<Env> = async (ctx) =>
  ctx.request.method === 'POST'
    ? onRequestPost(ctx as never)
    : json({ error: 'method not allowed' }, 405);

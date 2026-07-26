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
 * ⚠️ A report is anchored on more than cluster_id. 4,082 clusters are unions of
 * several engine clusters, and the absorbed ids are not published, so a
 * cluster_id can stop resolving after a rebuild. The store URL is the durable
 * anchor: it points at a real listing that exists independently of our
 * clustering, and `captured_at` says which snapshot the reader was looking at.
 */

interface Env {
  DB: D1Database;
}

interface ReportBody {
  cluster_id?: string;
  reason?: string;
  note?: string;
  title?: string;
  category?: string;
  store?: string;
  store_url?: string;
  captured_at?: string;
  page_url?: string;
}

/** Kept in step with REPORT_REASONS in ReportDialog.tsx. */
const REASONS = new Set([
  'wrong-grouping',
  'wrong-price',
  'wrong-category',
  'dead-link',
  'wrong-image',
  'other',
]);

const MAX_NOTE = 1000;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: ReportBody;
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: 'expected a JSON body' }, 400);
  }

  const clusterId = (body.cluster_id || '').trim();
  const reason = (body.reason || '').trim();
  if (!clusterId) return json({ error: 'cluster_id is required' }, 400);
  if (!REASONS.has(reason)) return json({ error: 'unknown reason' }, 400);

  // Free-text is the only field a stranger controls; cap it and store it as a
  // bound parameter. Nothing here is ever interpolated into SQL or into HTML.
  const note = (body.note || '').slice(0, MAX_NOTE);

  // Coarse origin only — enough to spot a flood, not enough to identify anyone.
  const country = ctx.request.headers.get('cf-ipcountry') || null;

  try {
    await ctx.env.DB.prepare(
      `INSERT INTO reports
         (cluster_id, reason, note, title, category, store, store_url,
          captured_at, page_url, country, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        clusterId,
        reason,
        note || null,
        body.title || null,
        body.category || null,
        body.store || null,
        body.store_url || null,
        body.captured_at || null,
        body.page_url || null,
        country,
      )
      .run();
  } catch (err) {
    // Never claim a report was filed when it was not.
    return json({ error: 'could not save the report' }, 500);
  }

  return json({ ok: true }, 201);
};

/** Anything other than POST — say so rather than falling through to the SPA. */
export const onRequest: PagesFunction<Env> = async (ctx) =>
  ctx.request.method === 'POST'
    ? onRequestPost(ctx as never)
    : json({ error: 'method not allowed' }, 405);

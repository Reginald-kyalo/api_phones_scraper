/**
 * Cloudflare Pages Function — GET /api/reports/:reference
 *
 * The public, read-only status of one report, so a reader can come back to the
 * reference they were given. It returns exactly reference, status, outcome and
 * status_updated_at — never the note, page URL, facets or any other content.
 * Status is written only by an operator (DEPLOY.md); this route has no write path.
 *
 * Routing: Pages maps functions/api/reports.ts to /api/reports and this file to
 * /api/reports/:id. They are distinct routes and do not shadow each other.
 */
import { getReportStatus } from '../../lib/reportStore';

interface Env {
  DB?: D1Database;
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });

export const onRequest: PagesFunction<Env, 'id'> = async (ctx) => {
  if (ctx.request.method !== 'GET') {
    return json({ error: 'method not allowed' }, 405, { allow: 'GET' });
  }
  const raw = ctx.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!ctx.env.DB) return json({ error: 'report status is not available' }, 503);

  let found: Awaited<ReturnType<typeof getReportStatus>>;
  try {
    found = await getReportStatus(ctx.env.DB, id ?? '');
  } catch {
    return json({ error: 'could not read the report status' }, 503, { 'retry-after': '30' });
  }
  if (!found) return json({ error: 'report not found' }, 404);
  return json({ ok: true, ...found });
};

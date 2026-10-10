/**
 * Cloudflare Pages Function — GET /data/*  (honeypot)
 *
 * Nothing on the site links here for people. The only links are hidden ones
 * (footer and the prerendered snapshot: aria-hidden, nofollow, no tab stop),
 * and robots.txt disallows /data/, so Googlebot and every crawler that obeys
 * robots never come. A visitor who requests it is a scraper walking every
 * link it finds. We record the hit so its IP can be challenged or blocked in
 * Cloudflare (a dashboard rule, not code), and answer with a plain 404.
 *
 * Storage: D1 binding `DB`, table `honeypot_hits` (schema.sql). The IP is
 * kept because blocking needs it; rows are for abuse handling only.
 */
interface Env {
  DB?: D1Database;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (env.DB) {
    const url = new URL(request.url);
    waitUntil(
      env.DB.prepare(
        'INSERT INTO honeypot_hits (ip, user_agent, path, country, created_at) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(
          request.headers.get('cf-connecting-ip'),
          (request.headers.get('user-agent') ?? '').slice(0, 300),
          url.pathname.slice(0, 200),
          request.headers.get('cf-ipcountry'),
          new Date().toISOString(),
        )
        .run()
        .then(() => undefined)
        .catch(() => undefined),
    );
  }
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' },
  });
};

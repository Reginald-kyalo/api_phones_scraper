import { Helmet } from 'react-helmet-async';

const BRAND = 'DealsOnline';

/**
 * Per-page `<title>`, description and canonical — roadmap 1.5.
 *
 * ⛔⛔ EVERY PAGE ON THIS SITE SHARED ONE TITLE. `HelmetProvider` was mounted in `App.tsx` and
 * not one page used it, so `index.html`'s "DealsOnline — Compare Prices on Phones, Laptops &
 * More | Kenya" was the title of all ~4,100 shelves, all 21 departments and every comparison
 * page. The category tree is this site's main long-tail surface and it was publishing several
 * thousand indexable URLs that a search engine could not tell apart.
 *
 * ⭐ THE TITLE IS DELIBERATELY STABLE AND THE DESCRIPTION CARRIES THE NUMBERS. Counts move on
 * every republish — `browse_nodes` went 4,185 → 4,137 between two runs of the category gate —
 * and a title that churns on a rebuild is worse than one that says less. Same reasoning as the
 * gate's own "assert relationships, not figures".
 */
export function PageMeta({
  title,
  description,
  canonical,
  noindex = false,
}: {
  /** The page's own name. The brand suffix is added here so it is never half-applied. */
  title: string;
  description?: string;
  /** Site-relative, e.g. `/shelf/smartphone`. Made absolute against the live origin. */
  canonical?: string;
  noindex?: boolean;
}) {
  const href =
    canonical && typeof window !== 'undefined'
      ? new URL(canonical, window.location.origin).toString()
      : undefined;

  return (
    <Helmet>
      <title>{`${title} | ${BRAND}`}</title>
      {description && <meta name="description" content={description} />}
      {href && <link rel="canonical" href={href} />}
      {/* ⛔ NOINDEX IS FOR PAGES THAT ARE REAL BUT NOT ANSWERS — a stale variant link, a shelf
          that no longer exists. They must still render honestly for the person who followed the
          link; they simply should not be the thing a search engine offers someone next. */}
      {noindex && <meta name="robots" content="noindex,follow" />}
      {/* Open Graph mirrors the same two strings. A price-comparison link is shared in chat far
          more often than it is searched, and an untitled preview is a dead link socially. */}
      <meta property="og:title" content={`${title} | ${BRAND}`} />
      {description && <meta property="og:description" content={description} />}
      {href && <meta property="og:url" content={href} />}
      <meta property="og:type" content="website" />
    </Helmet>
  );
}

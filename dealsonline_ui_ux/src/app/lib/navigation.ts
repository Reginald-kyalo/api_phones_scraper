import { useLocation } from 'react-router';

/**
 * Where a shopper was when they opened a detail page, carried in router state so that page's
 * own back control returns them there.
 *
 * ⛔⛔ THIS REPLACES A HARDCODED `<Link to="/deals">`, AND `navigate(-1)` IS NOT THE FIX.
 * History-based back is wrong on a cold load — a shared link, a new tab, a search result — where
 * there is no entry to return to. Naming the origin at the LINK, where it is known for certain,
 * means the detail page never guesses: it either has an origin or it has a real fallback.
 *
 * ⛔ AND IT IS AN HREF, NOT A SLUG. `/shelf`, `/department`, `/browse` and the retired spine are
 * overlapping slug spaces — measured 2026-09-03, the redesign spine alone shares 112 slugs with
 * the 424-node spine and 95 with `browse_nodes`, and they disagree about what those slugs mean.
 * A slug plus a guess at which builder to use resolves to a plausible WRONG page rather than to
 * a 404. The linking page already knows which page it is, so it passes the finished link.
 */
export interface CameFrom {
  href: string;
  label: string;
}

/**
 * The origin a detail page should offer as "back", or `fallback` when it was reached cold.
 *
 * ⭐ PASS A FALLBACK THAT IS ACTUALLY THAT PAGE'S PARENT, not a site-wide default. The
 * comparison page has no parent it can name safely, so it uses `/deals`; the product page has
 * its own breadcrumb category and should use that. A generic default is what made the original
 * defect — every product on the site claimed to have come from Deals.
 */
export function useOrigin(fallback: CameFrom): CameFrom {
  return useCameFrom() ?? fallback;
}

/**
 * The carried origin, or `null` when this page was reached cold.
 *
 * ⭐ SEPARATE FROM `useOrigin` BECAUSE A GOOD FALLBACK IS OFTEN NOT KNOWN AT HOOK TIME. The
 * product page's parent is its own category, which arrives with the async product — and a hook
 * cannot be called conditionally once it has. So the page takes the raw answer and composes the
 * fallback where the data is, instead of settling for a site-wide default it does not mean.
 */
export function useCameFrom(): CameFrom | null {
  const location = useLocation();
  return (location.state as { from?: CameFrom } | null)?.from ?? null;
}

/**
 * THIS page, as an origin to hand to a detail page — path AND query string.
 *
 * ⭐⭐ THE QUERY STRING IS THE POINT, AND OMITTING IT IS A REAL REGRESSION. This app
 * deliberately keeps view state in the URL rather than in component state — `ShelfPage`'s
 * `?multi_store=1` is the documented case, chosen so a "only things I can actually compare"
 * view is shareable and survives a back button. Rebuilding the origin from a slug
 * (`shelfHref(node.slug)`) throws exactly that away and returns the shopper to an UNFILTERED
 * shelf, quietly undoing the filter they set. Capturing the live location keeps the promise.
 *
 * ⭐ It also means a page serving several routes does not have to know which one it is on —
 * `BrowsePage` answers to `/browse/:productType`, `/search` and `/category/:id`.
 */
export function useHereAs(label: string): CameFrom {
  const { pathname, search } = useLocation();
  return { href: `${pathname}${search}`, label };
}

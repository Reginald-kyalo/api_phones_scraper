/**
 * ShelfPage — browsing the CANONICAL category tree (taxonomy_db.browse_nodes).
 *
 * ⛔ NOT `/browse`. That page reads `pricerunnerApi`, which serves the retired 424-node
 * PriceRunner spine. This one reads the canonical taxonomy built bottom-up from the shops.
 * The two slug spaces are DISJOINT — a slug from one never resolves in the other — so the two
 * live side by side and the cutover stays ADDITIVE, exactly as the API-side one was. Repointing
 * the existing pages instead was measured, in this project, to delete the storefront hierarchy.
 *
 * ⭐ Descendant closure happens SERVER-SIDE: `/clusters/by-node/{slug}` returns everything below
 * a shelf in one indexed query, so a coarse department still shows stock instead of an empty page.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useHereAs } from '../lib/navigation';
import { ApiError, browseApi, type BrowseNode, type ClusterSummary } from '../lib/api';
import {
  categoryIcon, categoryLabel, foldChildren, formatCount, shelfCount, shelfHref,
} from '../lib/categories';
import { ClusterDealCard } from '../features/clusters/components/ClusterDealCard';
import { PageMeta } from '../components/common/PageMeta';
import { Skeleton } from '../components/ui/skeleton';
import { ChevronRight, FolderTree, Loader2, PackageOpen, Store } from 'lucide-react';

/**
 * ⛔⛔ THIS FUNCTION SAID THE RIGHT THING AND DID THE OPPOSITE. Its comment read "a shelf's own
 * stock is not the point; what is below it is" — and it returned `n.n_clusters`, which is
 * exactly the shelf's own stock. So the subcategory grid advertised `Food Cupboard` at 2,010
 * and the page one click later opened at 6,220. The honest number now comes from the API as
 * `n_clusters_subtree`; `lib/categories.ts` owns reading it, so the three surfaces that render
 * a category count cannot disagree again.
 */

function ChildIcon({ node }: { node: BrowseNode }) {
  const Icon = categoryIcon(node);
  return <Icon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />;
}

function Crumbs({ node }: { node: BrowseNode | null }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link to="/shelf" className="hover:text-foreground">
            All categories
          </Link>
        </li>
        {(node?.ancestors ?? []).map((slug, i) => (
          <li key={slug} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <Link to={shelfHref(slug)} className="hover:text-foreground">
              {/* ⛔ index-for-index with `ancestors`; the API never drops an entry */}
              {categoryLabel({ slug, label: node?.ancestor_labels?.[i] ?? null })}
            </Link>
          </li>
        ))}
        {node && (
          <li className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-foreground font-medium">
              {categoryLabel(node)}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

/** One page of products. 24 fills a 4-column grid six rows deep without a wall of scroll. */
const PAGE = 24;

export default function ShelfPage() {
  const { slug } = useParams<{ slug?: string }>();
  // ⭐ THE FILTER LIVES IN THE URL, NOT IN STATE. On a price-comparison site "only things I can
  // actually compare" is the most on-brand filter available, so a shopper will want to send it
  // to someone. Component state would make that view unshareable and lose it on a back button.
  const [params, setParams] = useSearchParams();
  const multiStoreOnly = params.get('multi_store') === '1';

  const [node, setNode] = useState<BrowseNode | null>(null);
  const [children, setChildren] = useState<BrowseNode[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  // ⛔ 404 AND "no children" ARE DIFFERENT ANSWERS AND MUST NOT SHARE A SCREEN. The API is
  // deliberate about this: an empty `results` means "this shelf has nothing under it", a 404
  // means "there is no such shelf". Collapsing them into one "could not be loaded" hides broken
  // links behind what looks like a transient failure.
  const [error, setError] = useState<'missing' | 'failed' | null>(null);

  // Where a product card should send the shopper BACK to — this URL, filter and all.
  const here = useHereAs(node ? categoryLabel(node) : 'All categories');

  // The tree level. Runs for the roots too (slug undefined).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setClusters([]);
    browseApi
      .getTree(slug ?? null)
      .then((res) => {
        if (cancelled) return;
        setNode(res.parent);
        setChildren(res.results);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError && e.status === 404 ? 'missing' : 'failed');
        setNode(null);
        setChildren([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // The stock on this shelf and everything under it. Roots have no products view.
  // ⛔ RE-RUNS ON THE FILTER TOO, and resets to page one. Keeping the accumulated pages across a
  // filter change would show products the filter just excluded, under a total that says otherwise.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setProductsLoading(true);
    setClusters([]);
    browseApi
      .getClusters(slug, { limit: PAGE, multiStoreOnly })
      .then((res) => {
        if (cancelled) return;
        setClusters(res.results);
        setTotal(res.total);
      })
      .catch(() => {
        // ⛔ A products failure must not blank the tree — navigation still works without stock.
        if (!cancelled) setClusters([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, multiStoreOnly]);

  /**
   * ⛔⛔ THE SHELF ADVERTISED 6,220 PRODUCTS AND REACHED 24. `getClusters` has taken an `offset`
   * since it was written and nothing passed one, so every shelf on the site was a single page
   * under a headline promising thousands.
   *
   * ⭐ APPEND, don't replace: `offset` is derived from what is already on screen, so the button
   * stays correct even if a page comes back short.
   */
  const loadMore = useCallback(() => {
    if (!slug || loadingMore) return;
    setLoadingMore(true);
    browseApi
      .getClusters(slug, { limit: PAGE, offset: clusters.length, multiStoreOnly })
      .then((res) => {
        // ⛔ De-duplicate by cluster id. The server sorts by `n_listings`, which is not a
        // tiebreak — two clusters with equal listings can swap between calls and the same row
        // would arrive twice, producing a duplicate React key and a phantom product.
        setClusters((prev) => {
          const seen = new Set(prev.map((c) => c.cluster_id));
          return [...prev, ...res.results.filter((c) => !seen.has(c.cluster_id))];
        });
        setTotal(res.total);
      })
      .catch(() => {
        // Leave what is already on screen; the button stays available to retry.
      })
      .finally(() => setLoadingMore(false));
  }, [slug, clusters.length, loadingMore, multiStoreOnly]);

  const toggleMultiStore = useCallback(() => {
    const next = new URLSearchParams(params);
    if (multiStoreOnly) next.delete('multi_store');
    else next.set('multi_store', '1');
    setParams(next, { replace: true });
  }, [params, multiStoreOnly, setParams]);

  const heading = node ? categoryLabel(node) : 'All categories';
  // ⭐ A child that only restates its parent is a redundant tile, not a subdivision: `Phones`
  // (1,082) sat under `Smartphones` because 46 shops use both words for one concept and the
  // engine's label-keyed fold structurally cannot see across them. ⛔ Nothing is hidden — the
  // products are already in this page's own listing via descendant closure.
  const shownChildren = foldChildren(children, node?.label ?? null);

  return (
    <div className="bg-white">
      {/* ⭐ ROADMAP 1.5. ⛔ CANONICAL DROPS `?multi_store=1`: the filter shows a SUBSET of the
          same shelf, not different content, so the filtered and unfiltered URLs must not compete
          for the same query. ⛔ AND A MISSING SHELF IS `noindex` — it renders honestly for
          whoever followed the dead link, but it is not an answer to offer anyone else. */}
      <PageMeta
        title={
          error === 'missing'
            ? 'Category not found'
            : slug
              ? `${heading} — Compare Prices in Kenya`
              : 'All Categories — Compare Prices in Kenya'
        }
        description={
          error === 'missing'
            ? undefined
            : slug
              ? `Compare ${heading} prices across Kenyan shops${
                  total ? ` — ${total.toLocaleString()} products` : ''
                }. Find the cheapest shop before you buy.`
              : 'Browse every category on DealsOnline and compare prices across Kenyan shops.'
        }
        canonical={slug ? shelfHref(slug) : '/shelf'}
        noindex={error === 'missing'}
      />
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        {error !== 'missing' && <Crumbs node={node} />}

        {error !== 'missing' && <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <FolderTree className="w-5 h-5 text-teal-deep" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{heading}</h1>
          </div>
          {/* ⭐ THE PUBLISHER WRITES THESE AS FLAGS, NEVER FILTERS — it leaves the decision
              here on purpose. `coarse` is a grouping header a bigger child sits under;
              `unsorted` holds stock with nothing to sort it into. They want different copy,
              and `unsorted` also wants no subcategory grid at all. */}
          <p className="text-sm text-muted-foreground">
            {node?.coarse
              ? 'A grouping of several departments — pick one below to narrow it down.'
              : node?.unsorted
                ? 'A single shelf — everything here is listed below.'
                : 'Categories built from what Kenyan shops actually stock.'}
          </p>
        </div>}

        {error === 'missing' ? (
          <div className="py-12 text-center">
            <p className="text-base font-medium text-foreground mb-1">No such category</p>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-mono">{slug}</span> is not a shelf in this catalogue.
            </p>
            <Link to="/shelf" className="text-sm text-link hover:text-link-hover underline">
              Browse all categories
            </Link>
          </div>
        ) : error === 'failed' ? (
          <p className="text-sm text-muted-foreground py-8">
            That category could not be loaded. Please try again.
          </p>
        ) : null}

        {error === null && (loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          shownChildren.length > 0 && (
            <section aria-label="Subcategories" className="mb-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {shownChildren.map((c) => (
                  <Link
                    key={c.slug}
                    to={shelfHref(c.slug)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border
                               px-4 py-3 hover:border-teal-deep hover:bg-muted/40 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <ChildIcon node={c} />
                      <span className="text-sm font-medium text-foreground truncate">
                        {categoryLabel(c)}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {formatCount(shelfCount(c))}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        ))}

        {slug && error === null && (
          <section aria-label="Products">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {total > 0 ? `${total.toLocaleString()} products` : 'Products'}
              </h2>
              {/* ⭐ THE MOST ON-BRAND FILTER THIS SITE HAS, and nothing surfaced it. The API has
                  supported `multi_store_only` all along: it keeps only clusters priced at two or
                  more stores — i.e. the ones where a COMPARISON actually exists. On a
                  price-comparison storefront that is the difference between a catalogue and the
                  product. */}
              <button
                type="button"
                onClick={toggleMultiStore}
                aria-pressed={multiStoreOnly}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm
                            transition-colors ${
                  multiStoreOnly
                    ? 'border-teal-deep bg-teal/10 text-teal-deep font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-teal-deep'
                }`}
              >
                <Store className="w-3.5 h-3.5" aria-hidden="true" />
                Only compared across 2+ shops
              </button>
            </div>
            {productsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2
                  className="w-6 h-6 animate-spin text-muted-foreground"
                  aria-label="Loading products"
                />
              </div>
            ) : clusters.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {clusters.map((c) => (
                    /* ⛔ `here`, NOT `shelfHref(node.slug)`. Rebuilding the href from the slug
                       drops `?multi_store=1` and returns the shopper to an UNFILTERED shelf —
                       undoing the filter this page puts in the URL precisely so it survives a
                       back button. */
                    <ClusterDealCard key={c.cluster_id} cluster={c} from={here} />
                  ))}
                </div>
                {/* ⛔ `total` IS THE PROMISE AND `clusters.length` IS THE DELIVERY. Comparing the
                    two is what decides whether there is a next page — a fixed page count would
                    lie the moment the server returned a short page. */}
                {clusters.length < total && (
                  <div className="flex flex-col items-center gap-2 pt-8">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5
                                 text-sm font-medium text-foreground hover:border-teal-deep
                                 hover:bg-muted/40 transition-colors disabled:opacity-60"
                    >
                      {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                      {loadingMore ? 'Loading…' : 'Show more products'}
                    </button>
                    <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                      Showing {clusters.length.toLocaleString()} of {total.toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <PackageOpen className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm">
                  {multiStoreOnly
                    ? 'Nothing here is stocked by two or more shops yet — clear the filter to see everything.'
                    : 'Nothing on this shelf yet'}
                  {!multiStoreOnly && (shownChildren.length > 0 ? ' — try one of the categories above.' : '.')}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

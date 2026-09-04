/**
 * DepartmentPage — one of the storefront's 21 RULED departments.
 *
 * ⛔⛔ A DEPARTMENT IS NOT A SHELF, WHICH IS THE WHOLE REASON THIS PAGE EXISTS RATHER THAN A
 * REDIRECT. `Laptops` adopts three separate `browse_nodes` shelves — 655 + 590 + 285 = 1,530 —
 * that sit under three different parents because 46 shops each spelled the department their own
 * way. Linking the tile at `/shelf/laptop` instead would advertise 1,530 and deliver 655, which
 * is precisely the understatement (`Food Cupboard`: 2,010 promised, 6,220 delivered) that the
 * subtree rollup was built to remove. The count here and the count in the menu are the SAME
 * number from the SAME endpoint.
 *
 * ⭐ THE SPINE ADOPTS, IT DOES NOT RE-PARENT. Nothing upstream moves: a department claims each
 * shelf where it already sits, with its whole subtree. Re-parenting was simulated engine-side
 * and measured to STRAND clusters — promoting `smart-watch` to a root cost it 72 of 717.
 *
 * ⛔ NO BREADCRUMB ABOVE THE DEPARTMENT. A department has no parent — it IS the top level. The
 * crumb is `All categories → <Department>`, and `All categories` goes to `/shelf`, not to a
 * department index, because `/shelf` is the only surface that reaches the ~55% of the catalogue
 * the spine deliberately does not adopt.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useHereAs } from '../lib/navigation';
import {
  ApiError, departmentApi, type BrowseNode, type ClusterSummary, type Department,
} from '../lib/api';
import {
  categoryIcon, categoryLabel, departmentHref, foldChildren, formatCount, shelfCount,
  shelfHref,
} from '../lib/categories';
import { ClusterDealCard } from '../features/clusters/components/ClusterDealCard';
import { PageMeta } from '../components/common/PageMeta';
import { Skeleton } from '../components/ui/skeleton';
import { ChevronRight, FolderTree, Loader2, PackageOpen, Store } from 'lucide-react';

/** One page of products. 24 fills a 4-column grid six rows deep without a wall of scroll. */
const PAGE = 24;

export default function DepartmentPage() {
  const { id } = useParams<{ id: string }>();
  // ⭐ THE FILTER LIVES IN THE URL, NOT IN STATE — same ruling as ShelfPage. "Only things I can
  // actually compare" is the most on-brand filter this site has, so a shopper will want to send
  // it to someone; component state would make that view unshareable and lose it on a back button.
  const [params, setParams] = useSearchParams();
  const multiStoreOnly = params.get('multi_store') === '1';

  const [department, setDepartment] = useState<Department | null>(null);
  // Where a product card should send the shopper BACK to — this URL, filter and all.
  // ⛔ The department's RULED label, not a de-slugged id: `phone-accessories` is presented as
  // "Phone accessories", and `smart-watch` as "Wearables". The spine renames freely.
  const here = useHereAs(department?.label ?? 'Department');
  const [shelves, setShelves] = useState<BrowseNode[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // ⛔ 404 AND "nothing here" ARE DIFFERENT ANSWERS AND MUST NOT SHARE A SCREEN. An empty
  // `results` means "this department is bare"; a 404 means "there is no such department".
  // Collapsing them hides a broken link behind what looks like a transient failure.
  const [error, setError] = useState<'missing' | 'failed' | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setClusters([]);
    departmentApi
      .getClusters(id, { limit: PAGE, multiStoreOnly })
      .then((res) => {
        if (cancelled) return;
        setDepartment(res.department);
        setShelves(res.shelves);
        setClusters(res.results);
        setTotal(res.total);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError && e.status === 404 ? 'missing' : 'failed');
        setDepartment(null);
        setShelves([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, multiStoreOnly]);

  /**
   * ⭐ APPEND, don't replace: `offset` is derived from what is already on screen, so the button
   * stays correct even if a page comes back short.
   */
  const loadMore = useCallback(() => {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    departmentApi
      .getClusters(id, { limit: PAGE, offset: clusters.length, multiStoreOnly })
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
  }, [id, clusters.length, loadingMore, multiStoreOnly]);

  // ⭐ Same rule as the shelf grid: an adopted shelf that only restates the department name is
  // a redundant tile. Smartphones adopts `Phones`(67) beside `Smartphones`(3,325); both are in
  // the 3,392 this page lists, so the tile subdivides nothing.
  // ⛔⛔ `foldChildren` HERE, `departmentShelves` IN THE MENUS — and the difference is
  // deliberate. A menu tile is a CHOICE: three tiles all labelled "Laptops" (655 / 590 / 285)
  // cannot be chosen between, so the menus drop the group whole. This list is DOCUMENTATION of
  // what the department is made of, and `verify_categories.py` asserts the Laptops page "spans
  // more than one shelf" precisely so the 1,530 heading stays explicable. De-duplicating here
  // would delete that explanation to tidy a label.
  // ⚠️ It does leave three identically-labelled rows on this page. Disambiguating them (by
  // store count, or by the shop the shelf came from) is an open UI question, not a fold.
  const shownShelves = foldChildren(shelves, department?.label ?? null);

  const toggleMultiStore = useCallback(() => {
    const next = new URLSearchParams(params);
    if (multiStoreOnly) next.delete('multi_store');
    else next.set('multi_store', '1');
    setParams(next, { replace: true });
  }, [params, multiStoreOnly, setParams]);

  if (error === 'missing') {
    return (
      <div className="bg-white">
        <PageMeta title="Department not found" noindex />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
          <div className="py-12 text-center">
            <p className="text-base font-medium text-foreground mb-1">No such department</p>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-mono">{id}</span> is not one of this storefront&rsquo;s
              departments.
            </p>
            <Link to="/shelf" className="text-sm text-link hover:text-link-hover underline">
              Browse all categories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* ⛔ CANONICAL DROPS THE QUERY STRING, same rule as the shelf: a filtered department is a
          subset of itself, not a second page. */}
      <PageMeta
        title={`${department?.label ?? 'Department'} — Compare Prices in Kenya`}
        description={
          department
            ? `Compare ${department.label.toLowerCase()} prices across Kenyan shops${
                total ? ` — ${total.toLocaleString()} products` : ''
              }. Find the cheapest shop before you buy.`
            : undefined
        }
        canonical={id ? departmentHref(id) : undefined}
      />
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              {/* ⛔ `/shelf`, not a department index: it is the only route to the ~55% of the
                  catalogue no department adopts. */}
              <Link to="/shelf" className="hover:text-foreground">
                All categories
              </Link>
            </li>
            {department && (
              <li className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span aria-current="page" className="text-foreground font-medium">
                  {department.label}
                </span>
              </li>
            )}
          </ol>
        </nav>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <FolderTree className="w-5 h-5 text-teal-deep" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {department?.label ?? 'Department'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {department && department.adopts.length > 1
              ? `${department.adopts.length} shelves across ${department.n_stores}+ shops, gathered under one name.`
              : 'Categories built from what Kenyan shops actually stock.'}
          </p>
        </div>

        {error === 'failed' && (
          <p className="text-sm text-muted-foreground py-8">
            That department could not be loaded. Please try again.
          </p>
        )}

        {error === null && (loading && shelves.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          /* ⭐ The adopted shelves ARE the subcategory grid, and they arrive with the products
             in one response. ⛔ A department adopting a single shelf shows no grid — repeating
             the department as its own only child is the "five departments spend the second level
             restating the first" defect the panel already has. */
          shownShelves.length > 1 && (
            <section aria-label="Shelves" className="mb-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {shownShelves.map((s) => {
                  const Icon = categoryIcon(s);
                  return (
                    <Link
                      key={s.slug}
                      /* ⛔ A `browse_nodes` slug — `shelfHref`, never `departmentHref`. */
                      to={shelfHref(s.slug)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border
                                 px-4 py-3 hover:border-teal-deep hover:bg-muted/40 transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {categoryLabel(s)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {formatCount(shelfCount(s))}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )
        ))}

        {error === null && (
          <section aria-label="Products">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {total > 0 ? `${total.toLocaleString()} products` : 'Products'}
              </h2>
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

            {loading ? (
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
                    /* ⛔ `here`, not `departmentHref(department.id)` — see ShelfPage: rebuilding
                       the href from an id drops the query string this page keeps in the URL. */
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
                    : 'Nothing in this department yet.'}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

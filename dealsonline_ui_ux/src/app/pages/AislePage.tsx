/**
 * AislePage — one of the REDESIGN spine's 19 DESIGNED departments.
 *
 * ⛔⛔ A FOURTH SLUG SPACE, PARALLEL TO `/department` ON PURPOSE. `DepartmentPage` renders the
 * 21 CURATED departments ruled over the canonical tree, reaching ~46.0% of placed clusters. This
 * renders the 19 DESIGNED departments, reaching 79.9% (81,525 clusters). It is the migration
 * target for the curated set, run side by side until a cutover the owner has not made yet — so
 * this route is additive and is not linked from the header, the category strip or the mobile
 * sheet. Two department navs in front of a shopper is the failure mode the migration exists to
 * avoid.
 *
 * ⭐ OTHERWISE THIS MIRRORS `DepartmentPage.tsx` EXACTLY, on purpose: same loading, error,
 * pagination and `PageMeta` contracts, same reasons for `foldChildren` over `departmentShelves`,
 * same "All categories" door to `/shelf`. The only changes are the data source (`spineApi`
 * instead of `departmentApi`, `SpineDepartmentView` instead of `Department`) and the link
 * builder (`aisleHref` instead of `departmentHref`).
 *
 * ⛔ `home-appliances` names BOTH a designed and a curated department, and the two pages
 * genuinely differ — so an id from this endpoint must only ever go through `aisleHref`, never
 * `departmentHref`.
 *
 * ⛔ NO BREADCRUMB ABOVE THE DEPARTMENT. A designed department has no parent — it IS the top
 * level. The crumb is `All categories → <Department>`, and `All categories` goes to `/shelf`,
 * not to a department index, because `/shelf` is the only surface that reaches the ~20% of the
 * catalogue (20,513 placements) that no designed department adopts.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useHereAs } from '../lib/navigation';
import {
  ApiError, spineApi, type BrowseNode, type ClusterSummary, type SpineDepartmentView,
} from '../lib/api';
import {
  aisleHref, categoryIcon, categoryLabel, foldChildren, formatCount, shelfCount, shelfHref,
} from '../lib/categories';
import { ClusterDealCard } from '../features/clusters/components/ClusterDealCard';
import { PageMeta } from '../components/common/PageMeta';
import { Skeleton } from '../components/ui/skeleton';
import { ChevronRight, FolderTree, Loader2, PackageOpen, Store } from 'lucide-react';

/** One page of products. 24 fills a 4-column grid six rows deep without a wall of scroll. */
const PAGE = 24;

export default function AislePage() {
  const { id } = useParams<{ id: string }>();
  // ⭐ THE FILTER LIVES IN THE URL, NOT IN STATE — same ruling as DepartmentPage and ShelfPage.
  const [params, setParams] = useSearchParams();
  const multiStoreOnly = params.get('multi_store') === '1';

  const [department, setDepartment] = useState<SpineDepartmentView | null>(null);
  // Where a product card should send the shopper BACK to — this URL, filter and all.
  const here = useHereAs(department?.label ?? 'Department');
  const [shelves, setShelves] = useState<BrowseNode[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // ⛔ 404 AND "nothing here" ARE DIFFERENT ANSWERS AND MUST NOT SHARE A SCREEN. An empty
  // `results` means "this department is bare"; a 404 means "there is no such department" —
  // and the copy below says exactly that, so a wrong id space reads as a wrong id space.
  const [error, setError] = useState<'missing' | 'failed' | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setClusters([]);
    spineApi
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
    spineApi
      .getClusters(id, { limit: PAGE, offset: clusters.length, multiStoreOnly })
      .then((res) => {
        // ⛔ De-duplicate by cluster id — see DepartmentPage for why: the server sorts by
        // `n_listings`, which is not a tiebreak, so an equal-listings pair can swap between
        // calls and arrive twice.
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

  // ⭐ Same rule as DepartmentPage: an adopted shelf that only restates the department name is a
  // redundant tile.
  // ⛔⛔ `foldChildren` HERE, NOT `departmentShelves`. `departmentShelves` is for MENUS, where a
  // duplicate tile is a choice nobody can make. This list is DOCUMENTATION of what the
  // department is made of — deleting that here would delete the explanation, not tidy a label.
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
      {/* ⛔ CANONICAL DROPS THE QUERY STRING, same rule as DepartmentPage: a filtered department
          is a subset of itself, not a second page. */}
      <PageMeta
        title={`${department?.label ?? 'Department'} — Compare Prices in Kenya`}
        description={
          department
            ? `Compare ${department.label.toLowerCase()} prices across Kenyan shops${
                total ? ` — ${total.toLocaleString()} products` : ''
              }. Find the cheapest shop before you buy.`
            : undefined
        }
        canonical={id ? aisleHref(id) : undefined}
      />
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              {/* ⛔ `/shelf`, not a department index: at 79.9% reach the residue is 20,513
                  placements, and this is the only door back to them while browsing. */}
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
            {department && department.n_shelves > 1
              ? `${department.n_shelves} shelves gathered under one name.`
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
          /* ⭐ The reached shelves ARE the subcategory grid, and they arrive with the products in
             one response. ⛔ A department reaching a single shelf shows no grid. */
          shownShelves.length > 1 && (
            <section aria-label="Shelves" className="mb-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {shownShelves.map((s) => {
                  const Icon = categoryIcon(s);
                  return (
                    <Link
                      key={s.slug}
                      /* ⛔ A `browse_nodes` slug — `shelfHref`, never `aisleHref`. The two id
                         spaces overlap and this mistake resolves to a plausible wrong page
                         instead of erroring. */
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
                {/* ⛔ `total` FROM THE ENDPOINT, NEVER A SUM OF THE SHELVES' COUNTS: the shelves
                    are maximal but their subtrees are what this page actually lists. */}
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
                    /* ⛔ `here`, not `aisleHref(department.id)` — rebuilding the href from an id
                       drops the query string this page keeps in the URL. */
                    <ClusterDealCard key={c.cluster_id} cluster={c} from={here} />
                  ))}
                </div>
                {/* ⛔ `total` IS THE PROMISE AND `clusters.length` IS THE DELIVERY. */}
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

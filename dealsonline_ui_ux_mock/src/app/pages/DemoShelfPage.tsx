import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { browseApi, type BrowseNode, type ClusterSummary } from '../lib/api';
import { ClusterCard, ClusterGridSkeleton, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
import { Pagination } from '../components/common/Pagination';
import { Skeleton } from '../components/ui/skeleton';
import { PAGE_SIZE } from '../lib/listing';
import { isLegacyPhoneCollection } from '../data/taxonomyTree';


/** Render a shop-written browse-node label without echoing its ALL-CAPS form. */
function browseLabel(node: Pick<BrowseNode, 'slug' | 'label'>): string {
  const raw = (node.label ?? '').trim();
  if (!raw) return node.slug;
  if (raw === raw.toUpperCase() && /[A-Z]{2,}/.test(raw)) {
    return raw.toLowerCase().replace(/(^|[\s/()-])([a-z])/g, (_: string, sep: string, ch: string) => sep + ch.toUpperCase());
  }
  if (raw === raw.toLowerCase()) return raw.replace(/^[a-z]/, (c) => c.toUpperCase());
  return raw;
}

/**
 * Drop a child that merely restates its parent (`Phones` under `Smartphones`).
 * Products are already in the parent page via descendant closure, so this only
 * removes a redundant navigation tile.
 */
function canonicalForm(label: string | null): string {
  return (label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, '')
    .replace(/s$/, '');
}

const MODIFIERS = new Set(['smart', 'mobile', 'cell', 'feature']);

function foldsIntoParent(child: Pick<BrowseNode, 'label'>, parentLabel: string | null): boolean {
  const c = canonicalForm(child.label);
  const p = canonicalForm(parentLabel);
  if (!c || !p || c === p || !p.endsWith(c) || p.length <= c.length) return false;
  return MODIFIERS.has(p.slice(0, p.length - c.length));
}

function foldChildren<T extends Pick<BrowseNode, 'label'>>(children: T[], parentLabel: string | null): T[] {
  return children.filter((child) => !foldsIntoParent(child, parentLabel));
}

function Crumbs({ node }: { node: BrowseNode | null }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <Link to="/browse" className="hover:text-foreground">All categories</Link>
        </li>
        {(node?.ancestors ?? []).map((slug, i) => (
          <li key={slug} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <Link to={`/shelf/${encodeURIComponent(slug)}`} className="hover:text-foreground">
              {browseLabel({ slug, label: node?.ancestor_labels?.[i] ?? null })}
            </Link>
          </li>
        ))}
        {node && (
          <li className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-foreground font-medium">
              {browseLabel(node)}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

export default function DemoShelfPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const multiStoreOnly = params.get('multi_store') === '1';
  const page = Math.max(0, (Number(params.get('page') ?? '1') || 1) - 1);

  const [node, setNode] = useState<BrowseNode | null>(null);
  const [children, setChildren] = useState<BrowseNode[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<'missing' | 'failed' | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChildren([]);
    browseApi
      .getTree(slug)
      .then((res) => {
        if (cancelled) return;
        setNode(res.parent);
        setChildren(res.results);
      })
      .catch(() => {
        if (cancelled) return;
        setError('failed');
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

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setProductsLoading(true);
    setClusters([]);
    browseApi
      .getClusters(slug, { limit: PAGE_SIZE, offset: page * PAGE_SIZE, multiStoreOnly })
      .then((res) => {
        if (cancelled) return;
        setClusters(res.results);
        setTotal(res.total);
      })
      .catch(() => {
        // Products must not blank the tree; navigation still works without stock.
        if (cancelled) setClusters([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, multiStoreOnly, page]);


  const toggleMultiStore = useCallback(() => {
    const next = new URLSearchParams(params);
    if (multiStoreOnly) next.delete('multi_store');
    else next.set('multi_store', '1');
    next.delete('page');
    setParams(next, { replace: true });
  }, [params, multiStoreOnly, setParams]);

  if (!slug) {
    return (
      <div className="bg-background min-h-screen">
        <div className="page-container py-16 text-center">
          <p className="section-title mb-2">We couldn’t find that category</p>
          <Link to="/browse" className="text-sm text-link hover:underline underline-offset-4">
            Browse all categories
          </Link>
        </div>
      </div>
    );
  }

  const heading = node ? browseLabel(node) : slug;
  const shownChildren = foldChildren(children, node?.label ?? null);

  return (
    <div className="bg-background min-h-screen">
      <div className="page-container py-8">
        {error !== 'missing' && <Crumbs node={node} />}

        {error === 'missing' ? (
          <div className="py-12 text-center">
            <p className="section-title mb-2">We couldn’t find that category</p>
            <p className="text-sm text-muted-foreground mb-4">It may have moved.</p>
            <Link to="/browse" className="text-sm text-link hover:underline underline-offset-4">
              Browse all categories
            </Link>
          </div>
        ) : error === 'failed' ? (
          <p className="text-sm text-muted-foreground py-8">
            We couldn’t load this category. Refresh the page to try again.
          </p>
        ) : null}

        {error === null && (
          <>
            <div className="mb-6">
              <h1 className="page-title mb-1">{heading}</h1>
              <p className="text-sm text-muted-foreground">
                {isLegacyPhoneCollection(slug, node?.ancestors)
                  ? 'Related products from Kenyan shops.'
                  : node?.coarse
                  ? 'Choose a category below to narrow it down.'
                  : node?.unsorted
                    ? 'Every product in this category is listed below.'
                    : 'Prices from Kenyan shops, compared.'}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-md" />
                ))}
              </div>
            ) : shownChildren.length > 0 ? (
              <section aria-label="Subcategories" className="mb-10">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {shownChildren.map((child) => (
                    <Link
                      key={child.slug}
                      to={`/shelf/${encodeURIComponent(child.slug)}`}
                      className="flex items-center justify-between gap-2 rounded-md card-interactive px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground truncate">
                        {browseLabel(child)}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {child.n_clusters_subtree.toLocaleString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-label="Products">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="section-title">
                  {total > 0 ? `${total.toLocaleString()} products` : 'Products'}
                </h2>
                <button
                  type="button"
                  onClick={toggleMultiStore}
                  aria-pressed={multiStoreOnly}
                  className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors active:translate-y-px ${
                    multiStoreOnly
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-muted-foreground'
                  }`}
                >
                  Sold by 2 or more shops
                </button>
              </div>

              {productsLoading ? (
                <ClusterGridSkeleton />
              ) : clusters.length > 0 ? (
                <>
                  <div className={PRODUCT_GRID}>
                    {clusters.map((cluster) => (
                      <ClusterCard key={cluster.cluster_id} cluster={cluster} />
                    ))}
                  </div>
                  <Pagination
                    page={page}
                    pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
                    onChange={(p) => {
                      const next = new URLSearchParams(params);
                      if (p > 0) next.set('page', String(p + 1));
                      else next.delete('page');
                      setParams(next);
                      window.scrollTo({ top: 0 });
                    }}
                  />
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-sm">
                    {multiStoreOnly
                      ? 'Nothing here is sold by 2 or more shops yet.'
                      : 'No products here yet.'}
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

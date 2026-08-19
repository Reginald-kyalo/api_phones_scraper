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
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { browseApi, type BrowseNode, type ClusterSummary } from '../lib/api';
import { ClusterDealCard } from '../features/clusters/components/ClusterDealCard';
import { Skeleton } from '../components/ui/skeleton';
import { ChevronRight, FolderTree, Loader2, PackageOpen } from 'lucide-react';

/** A shelf's own stock is not the point; what is below it is. */
function shelfCount(n: BrowseNode) {
  return n.n_clusters.toLocaleString();
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
            <Link to={`/shelf/${encodeURIComponent(slug)}`} className="hover:text-foreground">
              {/* ⛔ index-for-index with `ancestors`; the API never drops an entry */}
              {node?.ancestor_labels?.[i] ?? slug}
            </Link>
          </li>
        ))}
        {node && (
          <li className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-foreground font-medium">
              {node.label ?? node.slug}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

export default function ShelfPage() {
  const { slug } = useParams<{ slug?: string }>();

  const [node, setNode] = useState<BrowseNode | null>(null);
  const [children, setChildren] = useState<BrowseNode[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      .catch(() => {
        if (!cancelled) setError('That category could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // The stock on this shelf and everything under it. Roots have no products view.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setProductsLoading(true);
    browseApi
      .getClusters(slug, { limit: 24 })
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
  }, [slug]);

  const heading = node ? (node.label ?? node.slug) : 'All categories';

  return (
    <div className="bg-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <Crumbs node={node} />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <FolderTree className="w-5 h-5 text-teal-deep" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{heading}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {node?.coarse
              ? 'A grouping of several departments — pick one below to narrow it down.'
              : 'Categories built from what Kenyan shops actually stock.'}
          </p>
        </div>

        {error && (
          <p className="text-sm text-muted-foreground py-8">{error}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          children.length > 0 && (
            <section aria-label="Subcategories" className="mb-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {children.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/shelf/${encodeURIComponent(c.slug)}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border
                               px-4 py-3 hover:border-teal-deep hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground truncate">
                      {c.label ?? c.slug}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {shelfCount(c)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        )}

        {slug && (
          <section aria-label="Products">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              {total > 0 ? `${total.toLocaleString()} products` : 'Products'}
            </h2>
            {productsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2
                  className="w-6 h-6 animate-spin text-muted-foreground"
                  aria-label="Loading products"
                />
              </div>
            ) : clusters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {clusters.map((c) => (
                  <ClusterDealCard key={c.cluster_id} cluster={c} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <PackageOpen className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm">
                  Nothing on this shelf yet
                  {children.length > 0 ? ' — try one of the categories above.' : '.'}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

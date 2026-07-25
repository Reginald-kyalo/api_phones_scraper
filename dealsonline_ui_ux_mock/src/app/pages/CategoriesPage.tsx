import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { pricerunnerApi, type PRProductType, type PRTreeNode } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { ChevronRight, Package, X } from 'lucide-react';
import { prIconMap } from '../components/layout/CategoryStrip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';

// Module-level cache — survives unmount/remount within the same session
let _ptCache: PRProductType[] | null = null;
let _tmCache: Record<string, PRTreeNode[]> = {};

export default function CategoriesPage() {
  const [productTypes, setProductTypes] = useState<PRProductType[]>(_ptCache ?? []);
  const [loading, setLoading] = useState(!_ptCache);
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<string | null>(_ptCache?.[0]?.id ?? null);
  const [treeMap, setTreeMap] = useState<Record<string, PRTreeNode[]>>(_tmCache);
  const [treeLoading, setTreeLoading] = useState(false);

  useEffect(() => {
    if (_ptCache) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await pricerunnerApi.getProductTypes();
        if (!cancelled) {
          _ptCache = res.productTypes;
          setProductTypes(res.productTypes);
          if (res.productTypes.length > 0) {
            setActiveType(res.productTypes[0].id);
          }
        }
      } catch {
        // degrade gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch subcategory tree when active type changes
  useEffect(() => {
    if (!activeType || treeMap[activeType]) return;
    let cancelled = false;
    setTreeLoading(true);
    pricerunnerApi.getCategoryTree(activeType).then((res) => {
      if (!cancelled) {
        _tmCache = { ..._tmCache, [activeType]: res.tree };
        setTreeMap((prev) => ({ ...prev, [activeType]: res.tree }));
      }
    }).catch(() => {}).finally(() => {
      if (!cancelled) setTreeLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeType, treeMap]);

  const totalProducts = productTypes.reduce((sum, pt) => sum + pt.productCount, 0);

  const subtree = activeType ? (treeMap[activeType] || []) : [];

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>All Categories</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              All Categories
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Compare prices across{' '}
              <span className="font-medium text-foreground">
                {totalProducts.toLocaleString()}
              </span>{' '}
              products in {productTypes.length} categories
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close categories"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-6">
            <div className="w-64 flex-shrink-0 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
            <div className="flex-1 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-6 min-h-[500px]">
            {/* Left: Parent category list */}
            <nav className="w-64 flex-shrink-0 hidden md:block">
              <ul className="space-y-0.5">
                {productTypes.map((pt) => {
                  const Icon = prIconMap[pt.id] || Package;
                  const isActive = activeType === pt.id;
                  return (
                    <li key={pt.id}>
                      <button
                        onClick={() => setActiveType(pt.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{pt.label}</span>
                        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Mobile: category selector (horizontal scroll) */}
            <div className="md:hidden w-full">
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
                {productTypes.map((pt) => {
                  const Icon = prIconMap[pt.id] || Package;
                  const isActive = activeType === pt.id;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => setActiveType(pt.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-white text-muted-foreground border-border hover:border-primary/30'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {pt.label}
                    </button>
                  );
                })}
              </div>
              {/* Mobile subcategory content (rendered below) is shared */}
              <SubcategoryPanel
                subtree={subtree}
                activeType={activeType}
                productTypes={productTypes}
                treeLoading={treeLoading && !treeMap[activeType || '']}
              />
            </div>

            {/* Right: Subcategories panel (desktop) */}
            <div className="flex-1 min-w-0 hidden md:block">
              <SubcategoryPanel
                subtree={subtree}
                activeType={activeType}
                productTypes={productTypes}
                treeLoading={treeLoading && !treeMap[activeType || '']}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Subcategory panel showing subcategory names under each parent ── */
function SubcategoryPanel({
  subtree,
  activeType,
  productTypes,
  treeLoading,
}: {
  subtree: PRTreeNode[];
  activeType: string | null;
  productTypes: PRProductType[];
  treeLoading: boolean;
}) {
  const activePt = productTypes.find(pt => pt.id === activeType);

  if (!activeType || !activePt) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-5">{activePt.label}</h2>

      {treeLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : subtree.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {subtree.map((node) => {
            const hasChildren = node.children && node.children.length > 0;
            const href = hasChildren
              ? `/browse/${activeType}?sub=${encodeURIComponent(node.slug)}`
              : `/browse/${activeType}?cat=${encodeURIComponent(node.categoryUrl || '')}`;

            return (
              <div key={node.slug}>
                {/* Parent subcategory heading */}
                <Link
                  to={href}
                  className="group flex items-center gap-2 mb-2"
                >
                  {node.image ? (
                    <div className="w-12 h-12 rounded bg-gray-50 overflow-hidden flex-shrink-0">
                      <img
                        src={node.image}
                        alt={node.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {node.name}
                  </h3>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </Link>
                {/* Child subcategory names listed */}
                {hasChildren && (
                  <ul className="space-y-1 pl-2">
                    {node.children!.slice(0, 8).map((child) => {
                      const childHasChildren = child.children && child.children.length > 0;
                      const childHref = childHasChildren
                        ? `/browse/${activeType}?sub=${encodeURIComponent(child.slug)}`
                        : `/browse/${activeType}?cat=${encodeURIComponent(child.categoryUrl || '')}`;
                      return (
                        <li key={child.slug}>
                          <Link
                            to={childHref}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {child.name}
                          </Link>
                        </li>
                      );
                    })}
                    {node.children!.length > 8 && (
                      <li>
                        <Link
                          to={href}
                          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          +{node.children!.length - 8} more…
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Browse all {activePt.label.toLowerCase()} products</p>
          <Link
            to={`/browse/${activeType}`}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            View products →
          </Link>
        </div>
      )}
    </div>
  );
}

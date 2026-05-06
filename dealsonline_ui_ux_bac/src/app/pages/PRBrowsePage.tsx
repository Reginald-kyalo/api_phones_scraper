import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router';
import { pricerunnerApi, type PRTreeNode, type PRProductType } from '../lib/api';
import { useBrowseProducts } from '../hooks/useProductData';
import { PRProductCard, PRProductCardGrid } from '../components/product/PRProductCard';
import { DynamicFilters } from '../components/filters/DynamicFilters';

import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import {
  Search,
  SlidersHorizontal,
  Package,
  ArrowLeft,
  X,
  ChevronRight,
} from 'lucide-react';
import { prIconMap } from '../components/layout/CategoryStrip';

type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'stores-desc';

// Helpers
function findNodeBySlug(nodes: PRTreeNode[], slug: string): PRTreeNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    if (node.children) {
      const found = findNodeBySlug(node.children, slug);
      if (found) return found;
    }
  }
  return null;
}

function findNodeByUrl(nodes: PRTreeNode[], url: string): PRTreeNode | null {
  for (const node of nodes) {
    if (node.categoryUrl === url) return node;
    if (node.children) {
      const found = findNodeByUrl(node.children, url);
      if (found) return found;
    }
  }
  return null;
}

function findRelevantSubtree(
  nodes: PRTreeNode[],
  categoryUrl: string,
  parentName: string | null = null,
): { nodes: PRTreeNode[]; parentName: string | null } | null {
  for (const node of nodes) {
    if (node.categoryUrl === categoryUrl) return { nodes, parentName };
    if (node.children) {
      const found = findRelevantSubtree(node.children, categoryUrl, node.name);
      if (found) return found;
    }
  }
  return null;
}

function SubcategoryGrid({
  nodes,
  productType,
  parentName,
  onBack,
}: {
  nodes: PRTreeNode[];
  productType: string;
  parentName: string;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h2 className="text-xl font-bold text-foreground mb-1">{parentName}</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {nodes.length} {nodes.length === 1 ? 'subcategory' : 'subcategories'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {nodes.map((node) => {
          const hasChildren = node.children && node.children.length > 0;
          const href = hasChildren
            ? `/browse/${productType}?sub=${encodeURIComponent(node.slug)}`
            : `/browse/${productType}?cat=${encodeURIComponent(node.categoryUrl || '')}`;
          return (
            <Link
              key={node.slug}
              to={href}
              className="group rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all overflow-hidden bg-white"
            >
              {node.image ? (
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                  <img
                    src={node.image}
                    alt={node.name}
                    className="h-full w-full object-contain p-3 transition-transform mix-blend-multiply"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <Package className="w-10 h-10 text-gray-300 group-hover:text-primary/40 transition-colors" />
                </div>
              )}
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {node.name}
                </p>
                {hasChildren && (
                  <div className="mt-1 space-y-0.5">
                    {node.children!.slice(0, 4).map((child) => (
                      <p key={child.slug} className="text-xs text-muted-foreground truncate">
                        {child.name}
                      </p>
                    ))}
                    {node.children!.length > 4 && (
                      <p className="text-xs text-primary/70 flex items-center gap-0.5">
                        +{node.children!.length - 4} more
                        <ChevronRight className="w-3 h-3" />
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function PRBrowsePage() {
  const { productType } = useParams<{ productType: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const subSlug = searchParams.get('sub') || null;

  // State
  const [tree, setTree] = useState<PRTreeNode[]>([]);
  const [treeLabel, setTreeLabel] = useState('');
  const [treeLoading, setTreeLoading] = useState(true);
  const [productTypes, setProductTypes] = useState<PRProductType[]>([]);

  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filter state
  const [selectedBrand, setSelectedBrand] = useState<string | null>(searchParams.get('brand') || null);
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [appliedMinPrice, setAppliedMinPrice] = useState(searchParams.get('minPrice') || '');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState(searchParams.get('maxPrice') || '');

  // Derived from URL
  const selectedCategoryUrl = searchParams.get('cat') || null;
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'price-asc');
  const activeSearch = searchParams.get('q') || '';

  // Load category tree
  useEffect(() => {
    if (!productType) return;
    let cancelled = false;
    setTreeLoading(true);

    async function loadTree() {
      try {
        const res = await pricerunnerApi.getCategoryTree(productType!);
        if (cancelled) return;
        setTree(res.tree);
        setTreeLabel(res.label);
      } catch {
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    }
    loadTree();
    return () => { cancelled = true; };
  }, [productType]);

  // Fetch product types for sidebar
  useEffect(() => {
    let cancelled = false;
    pricerunnerApi.getProductTypes().then((res) => {
      if (!cancelled) setProductTypes(res.productTypes);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // React Query Fetching
  const queryOptions = {
    categoryUrl: selectedCategoryUrl || undefined,
    sort: sortBy,
    page,
    q: activeSearch || undefined,
    brand: selectedBrand || undefined,
    minPrice: appliedMinPrice ? parseFloat(appliedMinPrice) : undefined,
    maxPrice: appliedMaxPrice ? parseFloat(appliedMaxPrice) : undefined,
  };
  
  const { data: productsData, isLoading: productsLoading } = useBrowseProducts(productType || '', queryOptions);
  
  const products = productsData?.products || [];
  const total = productsData?.total || 0;
  const totalPages = productsData?.totalPages || 1;
  const brands = productsData?.brands || [];

  // Determine if we're in subcategory drill-down mode
  const subNode = subSlug && tree.length > 0 ? findNodeBySlug(tree, subSlug) : null;
  const showSubcategoryGrid = !!subSlug && !selectedCategoryUrl;

  const selectedNode = selectedCategoryUrl && tree.length > 0 ? findNodeByUrl(tree, selectedCategoryUrl) : null;
  const selectedCategoryName = selectedNode?.name || '';
  const subtreeResult = selectedCategoryUrl && tree.length > 0 ? findRelevantSubtree(tree, selectedCategoryUrl) : null;
  const sidebarNodes = subtreeResult?.nodes ?? tree;
  const sidebarLabel = subtreeResult?.parentName || treeLabel;

  // Sync state-driven params to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (sortBy !== 'price-asc') params.set('sort', sortBy); else params.delete('sort');
    if (activeSearch) params.set('q', activeSearch); else params.delete('q');
    if (page > 1) params.set('page', String(page)); else params.delete('page');
    if (selectedBrand) params.set('brand', selectedBrand); else params.delete('brand');
    if (appliedMinPrice) params.set('minPrice', appliedMinPrice); else params.delete('minPrice');
    if (appliedMaxPrice) params.set('maxPrice', appliedMaxPrice); else params.delete('maxPrice');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, activeSearch, page, selectedBrand, appliedMinPrice, appliedMaxPrice]);

  useEffect(() => { setPage(1); }, [selectedCategoryUrl]);

  const handleCategorySelect = (url: string | null, _name: string) => {
    const params = new URLSearchParams(searchParams);
    if (url) { params.set('cat', url); params.delete('sub'); }
    else { params.delete('cat'); }
    params.delete('page');
    setSearchParams(params, { replace: true });
    setPage(1);
  };

  const handleApplyPrice = () => {
    setAppliedMinPrice(minPrice);
    setAppliedMaxPrice(maxPrice);
    setPage(1);
  };

  const handleClearPrice = () => {
    setMinPrice('');
    setMaxPrice('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setPage(1);
  };

  const handleBrandSelect = (brandName: string) => {
    setSelectedBrand(selectedBrand === brandName ? null : brandName);
    setPage(1);
  };

  const handleClearBrand = () => {
    setSelectedBrand(null);
    setPage(1);
  };

  const subcatNodes = (showSubcategoryGrid && subNode?.children) ? subNode.children : tree;
  const subcatTitle = (showSubcategoryGrid && subNode) ? subNode.name : treeLabel;
  const showTopLevelSubcategories = !subSlug && !selectedCategoryUrl && tree.length > 0 && tree.some(n => n.children && n.children.length > 0);

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
              <BreadcrumbLink asChild><Link to="/browse">Browse</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {(selectedCategoryName || subNode) ? (
                <BreadcrumbLink asChild>
                  <Link to={`/browse/${productType}`}>{treeLabel}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{treeLabel || 'Loading...'}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {subNode && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {selectedCategoryName ? (
                    <BreadcrumbLink asChild>
                      <Link to={`/browse/${productType}?sub=${subSlug}`}>{subNode.name}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{subNode.name}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {selectedCategoryName && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedCategoryName}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        {/* Subcategory mode with product types sidebar */}
        {(showSubcategoryGrid && subNode?.children) || (showTopLevelSubcategories && !selectedCategoryUrl) ? (
          <div className="flex gap-6 min-h-[500px]">
            {/* Left: Product types sidebar */}
            <nav className="w-64 flex-shrink-0 hidden md:block">
              <ul className="space-y-0.5">
                {productTypes.map((pt) => {
                  const Icon = prIconMap[pt.id] || Package;
                  const isActive = productType === pt.id;
                  return (
                    <li key={pt.id}>
                      <Link
                        to={`/browse/${pt.id}`}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ultra-border ${
                          isActive
                            ? 'bg-surface-alt text-primary font-semibold'
                            : 'text-muted-foreground bg-white hover:bg-gray-50 hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{pt.label}</span>
                        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Right: Subcategory panel */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">{subcatTitle}</h2>
                <button
                  onClick={() => navigate(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {treeLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : (
                <SubcategoryGrid
                  nodes={subcatNodes}
                  productType={productType!}
                  parentName={subcatTitle}
                  onBack={() => navigate(-1)}
                />
              )}
            </div>
          </div>
        ) : (
          /* Normal product listing mode */
          <div className="flex flex-col md:flex-row gap-8 items-start relative">
            {/* Desktop Filters */}
            <aside className="hidden md:block w-[240px] flex-shrink-0 sticky top-[80px]">
              <DynamicFilters
                tree={sidebarNodes}
                label={sidebarLabel}
                selectedUrl={selectedCategoryUrl}
                onSelectCategory={handleCategorySelect}
                treeLoading={treeLoading}
                minPrice={minPrice}
                maxPrice={maxPrice}
                appliedMinPrice={appliedMinPrice}
                appliedMaxPrice={appliedMaxPrice}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                onApplyPrice={handleApplyPrice}
                onClearPrice={handleClearPrice}
                brands={brands}
                selectedBrand={selectedBrand}
                onSelectBrand={handleBrandSelect}
                onClearBrand={handleClearBrand}
              />
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 w-full">
              {/* Header */}
              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                      {selectedCategoryName || treeLabel || 'Products'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {productsLoading ? 'Loading...' : `Showing ${total} products`}
                      {activeSearch && ` for "${activeSearch}"`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 self-start sm:self-auto w-full sm:w-auto">
                    {/* Mobile Filters */}
                    <div className="md:hidden flex-1 sm:flex-none">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto gap-2 ultra-border">
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] overflow-y-auto">
                          <div className="py-6">
                            <DynamicFilters
                              tree={sidebarNodes}
                              label={sidebarLabel}
                              selectedUrl={selectedCategoryUrl}
                              onSelectCategory={handleCategorySelect}
                              treeLoading={treeLoading}
                              minPrice={minPrice}
                              maxPrice={maxPrice}
                              appliedMinPrice={appliedMinPrice}
                              appliedMaxPrice={appliedMaxPrice}
                              setMinPrice={setMinPrice}
                              setMaxPrice={setMaxPrice}
                              onApplyPrice={handleApplyPrice}
                              onClearPrice={handleClearPrice}
                              brands={brands}
                              selectedBrand={selectedBrand}
                              onSelectBrand={handleBrandSelect}
                              onClearBrand={handleClearBrand}
                            />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>

                    {/* View mode toggle */}
                    <div className="hidden sm:flex border border-border rounded-md overflow-hidden flex-shrink-0 ultra-border">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-surface-alt text-primary' : 'bg-white text-muted-foreground hover:bg-gray-50'}`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 transition-colors border-l border-border ${viewMode === 'grid' ? 'bg-surface-alt text-primary' : 'bg-white text-muted-foreground hover:bg-gray-50'}`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                      </button>
                    </div>

                    {/* Sort */}
                    <div className="w-[140px] flex-shrink-0">
                      <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                        <SelectTrigger className="h-9 text-xs ultra-border">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price-asc">Price: Low to High</SelectItem>
                          <SelectItem value="price-desc">Price: High to Low</SelectItem>
                          <SelectItem value="name-asc">Name: A to Z</SelectItem>
                          <SelectItem value="stores-desc">Most Stores</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product List */}
              {productsLoading ? (
                <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={`rounded-xl border border-border overflow-hidden ${viewMode === 'list' ? 'flex h-44' : 'h-[320px]'}`}>
                      <Skeleton className={viewMode === 'list' ? 'w-44 h-full rounded-none' : 'w-full h-44 rounded-none'} />
                      <div className="p-4 flex-1 space-y-3">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="pt-4"><Skeleton className="h-6 w-1/3" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}>
                    {products.map((p) => (
                      viewMode === 'list' ? <PRProductCard key={p.id} product={p} /> : <PRProductCardGrid key={p.id} product={p} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-12">
                      <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0 }); }}
                        className="ultra-border"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground px-4">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0 }); }}
                        className="ultra-border"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-24 bg-surface-alt rounded-xl ultra-border">
                  <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-bold text-foreground">No products found</h3>
                  <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                    We couldn't find any products matching your criteria. Try adjusting your filters or search terms.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 ultra-border"
                    onClick={() => {
                      setMinPrice(''); setMaxPrice(''); setAppliedMinPrice(''); setAppliedMaxPrice(''); setSelectedBrand(null);
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useProductDetail } from '../hooks/useProductData';
import { generateStores, generatePriceHistory, generateRatingBreakdown } from '../data/mockServices';
import { ProductHero } from '../components/product/ProductHero';
import { StoreComparisonList } from '../components/product/StoreComparisonList';
import { PRPriceHistoryChart } from '../components/product/PRPriceHistoryChart';
import { ReviewSection } from '../components/product/ReviewSection';

import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import { Package } from 'lucide-react';
import PriceAlertDialog from '../components/PriceAlertDialog';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'prices', label: 'Prices' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'price-history', label: 'Price history' },
  { id: 'product-details', label: 'Product details' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PRProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  
  // React Query Fetching
  const { data: product, isLoading: loading } = useProductDetail(productId || '');

  const [activeTab, setActiveTab] = useState<TabId>('prices');
  const [alertOpen, setAlertOpen] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const tabBarRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // -- Intersection observer for active tab tracking --
  useEffect(() => {
    if (!product) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id as TabId);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    );
    const ids = TABS.map(t => t.id);
    ids.forEach(id => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [product]);

  const scrollToSection = useCallback((id: string) => {
    setActiveTab(id as TabId);
    const el = sectionRefs.current[id];
    if (!el) return;
    isScrollingRef.current = true;
    const offset = (tabBarRef.current?.offsetHeight ?? 48) + 8;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => { isScrollingRef.current = false; }, 600);
  }, []);

  // -- Generated data (memoised, stable per product) --
  const stores = useMemo(() => product ? generateStores(product) : [], [product]);
  const priceHistory = useMemo(() => product ? generatePriceHistory(product.price, product.id) : [], [product]);
  const ratingData = useMemo(() => product ? generateRatingBreakdown(product.rating) : generateRatingBreakdown(null), [product]);

  // -- Loading state --
  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
          <Skeleton className="h-5 w-64 mb-6" />
          <div className="grid md:grid-cols-[400px_1fr] gap-8">
            <Skeleton className="h-[360px] rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-16 w-40 rounded-lg" />
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
          {/* Tab bar placeholder */}
          <div className="mt-8 border-t pt-4 flex gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-24" />)}
          </div>
          {/* Content placeholder */}
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  // -- Not found --
  if (!product) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-20 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Product not found</h1>
          <p className="text-muted-foreground mb-6">
            This product may have been removed or the link is invalid.
          </p>
          <Link to="/browse">
            <Button>Browse products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 pt-4 pb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
            </BreadcrumbItem>
            {product.categoryPath.map((segment: string, i: number) => (
              <span key={i} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {i === 0 && product.productType ? (
                    <BreadcrumbLink asChild>
                      <Link to={`/browse/${product.productType}`}>{segment}</Link>
                    </BreadcrumbLink>
                  ) : i < product.categoryPath.length - 1 ? (
                    <span className="text-sm text-muted-foreground">{segment}</span>
                  ) : (
                    <BreadcrumbPage>{segment}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Product Hero */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 pb-6">
        <ProductHero 
          product={product} 
          ratingData={ratingData} 
          onScrollToSection={scrollToSection} 
          onSetAlertOpen={setAlertOpen} 
        />
      </div>

      {/* Sticky Tab Bar */}
      <div
        ref={tabBarRef}
        className="sticky top-0 z-20 bg-white shadow-sm ultra-border border-l-0 border-r-0"
      >
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide relative scroll-hint-x" aria-label="Product sections">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`whitespace-nowrap py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* SECTION: Prices (store comparison) */}
      <section
        id="prices"
        ref={el => { sectionRefs.current['prices'] = el; }}
        className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8"
      >
        <h2 className="text-xl font-bold text-foreground mb-1">
          Price comparison
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          {stores.length} stores selling {product.name}
        </p>

        <StoreComparisonList product={product} stores={stores} />
      </section>

      {/* SECTION: Reviews */}
      <section
        id="reviews"
        ref={el => { sectionRefs.current['reviews'] = el; }}
        className="bg-surface-alt border-y border-border"
      >
        <ReviewSection ratingData={ratingData} />
      </section>

      {/* SECTION: Price History */}
      <section
        id="price-history"
        ref={el => { sectionRefs.current['price-history'] = el; }}
        className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8"
      >
        <PRPriceHistoryChart product={product} priceHistory={priceHistory} />
      </section>

      {/* SECTION: Product details */}
      <section
        id="product-details"
        ref={el => { sectionRefs.current['product-details'] = el; }}
        className="bg-surface-alt border-y border-border py-8 mt-8"
      >
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Product details</h2>
          <div className="bg-white rounded-xl p-6 ultra-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">About this product</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {product.description || 'No detailed description available.'}
            </p>
          </div>
        </div>
      </section>

      {/* Price Alert Dialog */}
      <PriceAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        product={product}
      />
    </div>
  );
}

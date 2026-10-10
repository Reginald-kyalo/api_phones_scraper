import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLocalComparison } from '../hooks/useLocalStorage';
import { pricedShopCount, shopLabel } from '../lib/format';
import { categoryLabel } from '../lib/categories';
import { PriceOrDash } from '../components/common/PriceOrDash';
import { type ClusterSummary } from '../lib/api';
import { Button } from '../components/ui/button';
import {
  Package, X, ArrowLeft, Search, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import { ComparisonAddPanel } from '../features/comparison/components/ComparisonAddPanel';
import { buildComparisonTitle, COMPARISON_COL_WIDTH as COL_W } from '../features/comparison/utils/comparisonUtils';

export default function ComparisonPage() {
  const {
    comparisonItems,
    removeFromComparison,
    addToComparison,
    clearComparison,
  } = useLocalComparison();
  const [panelOpen, setPanelOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleAddFromPanel = useCallback(
    (product: ClusterSummary) => {
      addToComparison({
        id: product.cluster_id,
        name: product.display_name ?? product.title,
        image: product.image ?? '',
        price: product.best_price ?? 0,
        numStores: pricedShopCount(product),
        categoryName: product.category ?? '',
        categoryUrl: '',
        productType: product.category ?? '',
      });
    },
    [addToComparison],
  );

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -COL_W * 2 : COL_W * 2, behavior: 'smooth' });
  };

  // Empty state
  if (comparisonItems.length === 0) {
    return (
      <div className="page-container py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h1 className="page-title mb-2">Compare products</h1>
        <p className="text-muted-foreground mb-8">
          Add products side by side to compare their best prices. Use “Compare” on any product page,
          or search here.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => setPanelOpen(true)}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Find a product
          </Button>
          <Button asChild variant="outline">
            <Link to="/browse">Browse categories</Link>
          </Button>
        </div>
        <ComparisonAddPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onAdd={handleAddFromPanel}
          comparisonItems={comparisonItems}
        />
      </div>
    );
  }

  const title = buildComparisonTitle(comparisonItems);

  return (
    <div className="page-container py-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Title */}
      <h1 className="page-title mb-2 line-clamp-1">{title}</h1>

      {/* Controls row */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={clearComparison} className="text-muted-foreground">
          Clear all
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPanelOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add a product
        </Button>
      </div>

      {/* Scrollable comparison area */}
      <div className="relative">
        {/* Scroll arrows */}
        {comparisonItems.length > 4 && (
          <>
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="absolute left-0 top-[140px] z-10 p-2 rounded-full bg-card border border-border hover:bg-surface-alt"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="absolute right-0 top-[140px] z-10 p-2 rounded-full bg-card border border-border hover:bg-surface-alt"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div ref={scrollRef} className="overflow-x-auto">
          {/* Product cards row */}
          <div className="flex" style={{ minWidth: (comparisonItems.length + 1) * COL_W }}>
            {comparisonItems.map((item) => (
              <div
                key={item.product_id}
                className="flex-shrink-0 border-r border-border last:border-r-0 relative group"
                style={{ width: COL_W }}
              >
                {/* Remove button */}
                <button
                  onClick={() => removeFromComparison(item.product_id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-card border border-border z-10 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-muted"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>

                <div className="p-3 text-center">
                  {/* Image */}
                  <Link to={`/prices/${encodeURIComponent(item.product_id)}`}>
                    <div className="aspect-square bg-photo rounded-md flex items-center justify-center mb-2 border border-border">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain p-2"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                  </Link>

                  {/* Name */}
                  <Link to={`/prices/${encodeURIComponent(item.product_id)}`}>
                    <h3 className="text-sm font-medium line-clamp-3 leading-snug mb-2 hover:underline underline-offset-4 text-left min-h-[3.75rem]">
                      {item.name}
                    </h3>
                  </Link>

                  {/* Best price and how many shops it was compared across */}
                  <dl className="text-left space-y-2 border-t border-border pt-2">
                    <div>
                      <dt className="microcopy-label">Best price</dt>
                      <dd>
                        <PriceOrDash value={item.price} className="text-base font-bold text-foreground" />
                      </dd>
                    </div>
                    <div>
                      <dt className="microcopy-label">Shops</dt>
                      <dd className="text-sm text-foreground">{item.numStores > 0 ? shopLabel(item.numStores) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="microcopy-label">Category</dt>
                      <dd className="text-sm text-foreground">{categoryLabel(item.productType)}</dd>
                    </div>
                  </dl>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link to={`/prices/${encodeURIComponent(item.product_id)}`}>See all prices</Link>
                  </Button>
                </div>
              </div>
            ))}

            {/* Empty placeholder slot */}
            <div
              className="flex-shrink-0 border-r border-border"
              style={{ width: COL_W }}
            >
              <div className="p-3 h-full flex items-center justify-center">
                <button
                  onClick={() => setPanelOpen(true)}
                  className="w-full aspect-square bg-surface-alt rounded-md border border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add product</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add product overlay panel */}
      <ComparisonAddPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onAdd={handleAddFromPanel}
        comparisonItems={comparisonItems}
      />
    </div>
  );
}

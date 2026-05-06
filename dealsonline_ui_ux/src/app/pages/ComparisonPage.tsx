import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLocalComparison } from '../hooks/useLocalStorage';
import { type PRProduct } from '../lib/api';
import { Button } from '../components/ui/button';
import {
  Package, Star, X, ArrowLeft, Search, ChevronLeft, ChevronRight, Plus,
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

  // Clear comparison when leaving the page
  useEffect(() => {
    return () => {
      clearComparison();
    };
  }, [clearComparison]);

  const handleAddFromPanel = useCallback(
    (product: PRProduct) => {
      addToComparison({
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        numStores: product.numStores,
        categoryName: product.categoryName,
        categoryUrl: product.categoryUrl,
        productType: product.productType,
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
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h1 className="text-3xl font-bold mb-2">Product comparison</h1>
        <p className="text-muted-foreground mb-8">
          Add products from the browse or detail pages to begin comparing.
        </p>
        <div className="flex gap-3">
          <Link to="/browse">
            <Button>Browse products</Button>
          </Link>
          <Button variant="outline" onClick={() => setPanelOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            Search to add
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
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Title */}
      <h1 className="text-lg font-bold mb-2 line-clamp-1">{title}</h1>

      {/* Controls row */}
      <div className="flex items-center justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPanelOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Scrollable comparison area */}
      <div className="relative">
        {/* Scroll arrows */}
        {comparisonItems.length > 4 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-[140px] z-10 p-2 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-[140px] z-10 p-2 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50"
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
                className="flex-shrink-0 border-r border-gray-100 last:border-r-0 relative group"
                style={{ width: COL_W }}
              >
                {/* Remove button */}
                <button
                  onClick={() => removeFromComparison(item.product_id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-sm border border-gray-200 z-10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>

                <div className="p-3 text-center">
                  {/* Image */}
                  <Link to={`/product/${item.product_id}`}>
                    <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center mb-2 border border-gray-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain p-2"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-gray-300" />
                      )}
                    </div>
                  </Link>

                  {/* Name */}
                  <Link to={`/product/${item.product_id}`}>
                    <h3 className="text-sm font-medium line-clamp-3 leading-snug mb-2 hover:text-primary transition-colors text-left">
                      {item.name}
                    </h3>
                  </Link>

                  {/* Rating */}
                  {item.rating != null && (
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star
                            key={si}
                            className={`h-3.5 w-3.5 ${
                              si < Math.round(item.rating!) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{item.rating.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Price */}
                  <p className="text-base font-bold text-primary">
                    {item.price > 0 ? `£${item.price.toFixed(2)}` : 'N/A'}
                  </p>
                </div>
              </div>
            ))}

            {/* Empty placeholder slot */}
            <div
              className="flex-shrink-0 border-r border-gray-100"
              style={{ width: COL_W }}
            >
              <div className="p-3 h-full flex items-center justify-center">
                <button
                  onClick={() => setPanelOpen(true)}
                  className="w-full aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Plus className="h-6 w-6 text-gray-400" />
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

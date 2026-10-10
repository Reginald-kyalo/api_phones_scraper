import { Link, useLocation } from 'react-router';
import { useLocalComparison } from '../../../hooks/useLocalStorage';
import { Button } from '../../../components/ui/button';
import { X, BarChart3, Package } from 'lucide-react';

/** Height reserved under the page while the bar shows, so it never covers content. */
export const COMPARISON_BAR_HEIGHT = 80;

/**
 * Sticky "compare" bar: a floating, temporary element, so it is one of the
 * few things allowed a shadow. Hidden on the compare page itself, and below
 * lg on product pages, where the mobile best-price bar owns the bottom edge.
 */
export default function ComparisonBar() {
  const { comparisonItems, removeFromComparison, clearComparison } = useLocalComparison();
  const { pathname } = useLocation();

  if (comparisonItems.length === 0 || pathname === '/compare') return null;
  const onProduct = pathname.startsWith('/prices/');

  return (
    <>
    <div aria-hidden="true" className={onProduct ? 'hidden lg:block' : ''} style={{ height: COMPARISON_BAR_HEIGHT }} />
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-raised ${onProduct ? 'hidden lg:block' : ''}`}
      style={{ height: COMPARISON_BAR_HEIGHT }}
    >
      <div className="page-container py-3">
        <div className="flex items-center gap-4">
          {/* Product thumbnails */}
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
            {comparisonItems.map((item) => (
              <div key={item.product_id} className="relative flex-shrink-0 group">
                <div className="w-14 h-14 bg-white rounded-md border border-border flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <button
                  onClick={() => removeFromComparison(item.product_id)}
                  aria-label={`Remove ${item.name}`}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-canvas-ink text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button asChild size="sm" className="gap-2">
              <Link to="/compare">
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                Compare {comparisonItems.length}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={clearComparison} className="text-muted-foreground">
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

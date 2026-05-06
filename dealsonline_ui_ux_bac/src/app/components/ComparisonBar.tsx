import { Link } from 'react-router';
import { useLocalComparison } from '../hooks/useLocalStorage';
import { Button } from './ui/button';
import { X, BarChart3, Package } from 'lucide-react';

export default function ComparisonBar() {
  const { comparisonItems, removeFromComparison, clearComparison } = useLocalComparison();

  if (comparisonItems.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Product thumbnails */}
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
            {comparisonItems.map((item) => (
              <div key={item.product_id} className="relative flex-shrink-0 group">
                <div className="w-14 h-14 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Package className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <button
                  onClick={() => removeFromComparison(item.product_id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: 4 - comparisonItems.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-14 h-14 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex-shrink-0"
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {comparisonItems.length}/4 products
            </span>
            <Link to="/compare">
              <Button size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Compare ({comparisonItems.length})
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={clearComparison} className="text-muted-foreground">
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

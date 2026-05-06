import { type PRProductDetail } from '../../../lib/api';
import { type GeneratedStore } from '../../../data/mockServices';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Truck, ShieldCheck, ExternalLink } from 'lucide-react';

interface StoreComparisonListProps {
  product: PRProductDetail;
  stores: GeneratedStore[];
}

export function StoreComparisonList({ product, stores }: StoreComparisonListProps) {
  return (
    <div className="space-y-3">
      {stores.map((store, idx) => (
        <div
          key={store.name}
          className={`flex items-center gap-4 rounded-xl p-4 transition-colors ultra-border hover:bg-surface-alt ${
            idx === 0 ? 'border-primary/20 bg-primary/[0.01]' : 'border-border'
          }`}
        >
          {/* Store logo */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: store.color }}
          >
            {store.logo}
          </div>

          {/* Store info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">{store.name}</span>
              {idx === 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                  Best price
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {product.name}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Truck className="h-3 w-3" /> {store.shipping}
              </span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified seller
              </span>
            </div>
          </div>

          {/* Price + CTA */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-lg font-bold text-foreground">
              £{store.price.toFixed(2)}
            </span>
            <a
              href={product.productUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="text-xs h-8 px-4">
                Go to shop
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

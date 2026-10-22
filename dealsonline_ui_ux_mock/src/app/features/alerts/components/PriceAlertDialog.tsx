import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Slider } from '../../../components/ui/slider';
import { Package } from 'lucide-react';
import { useLocalPRAlerts } from '../../../hooks/useLocalStorage';
import { formatPrice } from '../../../lib/format';
import { toast } from 'sonner';

interface PriceAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    price: number;
    image: string | null;
    categoryName: string;
  };
}

/**
 * Save a target price for a product.
 *
 * The dialog saves one number in this browser and says exactly that. The
 * "tell me whenever the price drops" mode went: it described a notification
 * nobody would receive (design audit §12). When a notification service
 * exists this becomes "Set price alert" and gains an email field.
 */
export default function PriceAlertDialog({ open, onOpenChange, product }: PriceAlertDialogProps) {
  const { addPRAlert } = useLocalPRAlerts();
  const [targetPrice, setTargetPrice] = useState(Math.round(product.price * 0.9));
  const [error, setError] = useState<string | null>(null);

  const maxPrice = Math.ceil(product.price);
  const minPrice = 1;

  const handleCreate = () => {
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      setError('Enter a price greater than zero.');
      return;
    }
    const price = Math.max(minPrice, Math.round(targetPrice));
    addPRAlert(product, price);
    toast.success('Target price saved', {
      description: `${formatPrice(price)} for ${product.name}. Shown on this product page and in My products.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-center text-lg font-semibold">Save target price</DialogTitle>
          <DialogDescription className="sr-only">Save a target price for this product in this browser</DialogDescription>
        </DialogHeader>

        {/* Product info */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="w-14 h-14 bg-surface-alt rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img src={product.image} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
            <p className="text-sm text-muted-foreground">
              Lowest listed price <span className="price-num text-foreground">{formatPrice(product.price)}</span>
            </p>
          </div>
        </div>

        <form
          className="px-6 py-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <div>
            <label htmlFor="alert-target" className="microcopy-label">Target price (KES)</label>
            <div className="relative mt-1">
              <Input
                id="alert-target"
                inputMode="numeric"
                type="number"
                min={minPrice}
                max={maxPrice}
                value={targetPrice}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'alert-target-error' : undefined}
                onChange={(e) => {
                  setError(null);
                  setTargetPrice(Math.max(0, Math.min(maxPrice, Number(e.target.value) || 0)));
                }}
                className="pr-12 h-11 price-num"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KES</span>
            </div>
            {error && (
              <p id="alert-target-error" role="alert" className="mt-1 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <Slider
            value={[Math.max(minPrice, targetPrice)]}
            onValueChange={([v]) => { setError(null); setTargetPrice(v); }}
            min={minPrice}
            max={maxPrice}
            step={1}
            className="w-full"
            aria-label="Target price"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="price-num">{formatPrice(minPrice)}</span>
            <span>Lowest listed price <span className="price-num">{formatPrice(maxPrice)}</span></span>
          </div>

          <p className="pt-2 text-xs text-muted-foreground">
            Saved in this browser. No notifications are sent.
          </p>
          <div className="flex gap-3 pt-1 pb-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-11">
              Save target
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

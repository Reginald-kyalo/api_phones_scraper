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

export default function PriceAlertDialog({ open, onOpenChange, product }: PriceAlertDialogProps) {
  const { addPRAlert } = useLocalPRAlerts();
  const [mode, setMode] = useState<'drop' | 'target'>('target');
  const [targetPrice, setTargetPrice] = useState(Math.round(product.price * 0.9));

  const maxPrice = Math.ceil(product.price);
  const minPrice = 1;

  const handleCreate = () => {
    const price = mode === 'drop' ? product.price - 1 : targetPrice;
    addPRAlert(product, Math.max(minPrice, price));
    toast.success('Price alert set', {
      description: `We’ll tell you when ${product.name} is ${formatPrice(Math.max(minPrice, price))} or less.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-center text-lg font-semibold">Price alert</DialogTitle>
          <DialogDescription className="sr-only">Create a price alert for this product</DialogDescription>
        </DialogHeader>

        {/* Product info */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="w-14 h-14 bg-surface-alt rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img src={product.image} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
            <p className="text-sm text-muted-foreground price-num">{formatPrice(product.price)}</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Mode: Notify on drop */}
          <button
            type="button"
            onClick={() => setMode('drop')}
            className={`w-full flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-colors text-left ${
              mode === 'drop' ? 'border-foreground' : 'border-border hover:bg-surface-alt'
            }`}
          >
            <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              mode === 'drop' ? 'border-foreground' : 'border-border'
            }`}>
              {mode === 'drop' && <span className="w-2.5 h-2.5 rounded-full bg-foreground" />}
            </span>
            <span className="text-sm">Tell me whenever the price drops</span>
          </button>

          {/* Mode: Target price */}
          <div
            className={`w-full rounded-md border transition-colors ${
              mode === 'target' ? 'border-foreground' : 'border-border'
            }`}
          >
            <button
              type="button"
              onClick={() => setMode('target')}
              className="w-full flex items-center gap-3 p-4 cursor-pointer text-left"
            >
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                mode === 'target' ? 'border-foreground' : 'border-border'
              }`}>
                {mode === 'target' && <span className="w-2.5 h-2.5 rounded-full bg-foreground" />}
              </span>
              <span className="text-sm">Tell me when it reaches my target price</span>
            </button>

            {mode === 'target' && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label htmlFor="alert-target" className="microcopy-label">Target price</label>
                  <div className="relative mt-1">
                    <Input
                      id="alert-target"
                      inputMode="numeric"
                      type="number"
                      min={minPrice}
                      max={maxPrice}
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(Math.max(minPrice, Math.min(maxPrice, Number(e.target.value) || 0)))}
                      className="pr-12 h-11 price-num"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KES</span>
                  </div>
                </div>

                <Slider
                  value={[targetPrice]}
                  onValueChange={([v]) => setTargetPrice(v)}
                  min={minPrice}
                  max={maxPrice}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="price-num">{formatPrice(minPrice)}</span>
                  <span>Best price now <span className="price-num">{formatPrice(maxPrice)}</span></span>
                </div>
              </div>
            )}
          </div>

        </div>

        <p className="px-6 text-xs text-muted-foreground">
          Alerts are saved on this device. Sign in to get them by email.
        </p>
        <div className="flex gap-3 px-6 pb-6 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="flex-1 h-11">
            Set price alert
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

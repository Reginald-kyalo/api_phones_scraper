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
import { Checkbox } from '../../../components/ui/checkbox';
import { Package } from 'lucide-react';
import { useLocalPRAlerts } from '../../../hooks/useLocalStorage';
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
  const [reduceBy, setReduceBy] = useState(1);
  const [reduceEnabled, setReduceEnabled] = useState(true);

  const maxPrice = Math.ceil(product.price);
  const minPrice = 1;

  const handleCreate = () => {
    const price = mode === 'drop' ? product.price - 1 : targetPrice;
    addPRAlert(product, Math.max(minPrice, price));
    toast.success('Price alert created', {
      description: `We'll notify you when ${product.name} drops to £${Math.max(minPrice, price).toFixed(2)}`,
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
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-14 h-14 bg-gray-50 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img src={product.image} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <Package className="h-5 w-5 text-gray-300" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
            <p className="text-sm text-muted-foreground">£{product.price.toFixed(2)}</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Mode: Notify on drop */}
          <button
            type="button"
            onClick={() => setMode('drop')}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors text-left ${
              mode === 'drop' ? 'border-foreground' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              mode === 'drop' ? 'border-foreground' : 'border-gray-300'
            }`}>
              {mode === 'drop' && <span className="w-2.5 h-2.5 rounded-full bg-foreground" />}
            </span>
            <span className="text-sm">Notify me when the price has dropped</span>
          </button>

          {/* Mode: Target price */}
          <div
            className={`w-full rounded-lg border transition-colors ${
              mode === 'target' ? 'border-foreground' : 'border-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setMode('target')}
              className="w-full flex items-center gap-3 p-4 cursor-pointer text-left"
            >
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                mode === 'target' ? 'border-foreground' : 'border-gray-300'
              }`}>
                {mode === 'target' && <span className="w-2.5 h-2.5 rounded-full bg-foreground" />}
              </span>
              <span className="text-sm">Notify me when my target price has been reached</span>
            </button>

            {mode === 'target' && (
              <div className="px-4 pb-4 space-y-3">
                <div className="relative">
                  <div className="relative">
                    <span className="absolute left-3 top-0 text-[10px] text-muted-foreground">Price</span>
                    <Input
                      type="number"
                      min={minPrice}
                      max={maxPrice}
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(Math.max(minPrice, Math.min(maxPrice, Number(e.target.value) || 0)))}
                      className="pr-8 pt-4 h-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
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
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{minPrice}</span>
                  <span>{Math.round(maxPrice * 0.2)}</span>
                  <span>{Math.round(maxPrice * 0.4)}</span>
                  <span>{Math.round(maxPrice * 0.6)}</span>
                  <span>{Math.round(maxPrice * 0.8)}</span>
                  <span>{maxPrice}</span>
                </div>
              </div>
            )}
          </div>

          {/* Reduce by */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="reduce-by"
              checked={reduceEnabled}
              onCheckedChange={(v) => setReduceEnabled(v === true)}
            />
            <label htmlFor="reduce-by" className="text-sm text-foreground cursor-pointer">
              And each time the price is reduced by
            </label>
          </div>
          {reduceEnabled && (
            <div className="relative">
              <Input
                type="number"
                min={1}
                value={reduceBy}
                onChange={(e) => setReduceBy(Math.max(1, Number(e.target.value) || 1))}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="flex-1 h-11">
            Create price alert
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

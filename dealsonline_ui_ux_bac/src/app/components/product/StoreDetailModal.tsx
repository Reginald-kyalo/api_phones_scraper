import { ExternalLink, Star, Truck } from 'lucide-react';
import { type RetailerMeta, getRetailerInitials } from '../../data/retailers';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface StoreDetailModalProps {
  retailer: RetailerMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopUrl: string;
}

export default function StoreDetailModal({
  retailer,
  open,
  onOpenChange,
  shopUrl,
}: StoreDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ backgroundColor: retailer.color }}
            >
              {getRetailerInitials(retailer.name)}
            </div>
            <div>
              <DialogTitle className="text-base">{retailer.name}</DialogTitle>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs text-muted-foreground">Verified retailer</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Delivery info */}
          {retailer.deliveryInfo && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                Delivery
              </h4>
              <p className="text-sm text-muted-foreground">{retailer.deliveryInfo}</p>
            </div>
          )}

          {/* Payment methods */}
          {retailer.paymentMethods.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Payment methods</h4>
              <div className="flex flex-wrap gap-2">
                {retailer.paymentMethods.map((method) => (
                  <span
                    key={method}
                    className="text-xs px-3 py-1.5 bg-gray-50 border border-border rounded-md text-foreground"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Store website */}
          {retailer.website && retailer.website !== '#' && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Website</h4>
              <a
                href={retailer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-link hover:underline"
              >
                {retailer.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </div>
          )}

          {/* CTA */}
          <Button className="w-full gap-2" asChild>
            <a href={shopUrl} target="_blank" rel="noopener noreferrer">
              Shop at {retailer.name}
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

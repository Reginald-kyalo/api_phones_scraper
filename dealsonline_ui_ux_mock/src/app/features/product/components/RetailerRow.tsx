import { useState } from 'react';
import { ChevronDown, ExternalLink, Truck } from 'lucide-react';
import { type Product } from '../../../lib/api';
import { getRetailer, getRetailerInitials } from '../../../data/retailers';
import { Button } from '../../../components/ui/button';
import StoreDetailModal from './StoreDetailModal';

interface PriceData {
  retailerName: string;
  price: number;
  url: string;
  inStock: boolean;
}

interface RetailerRowProps {
  priceData: PriceData;
  isLowest: boolean;
  product: Product;
}

export default function RetailerRow({ priceData, isLowest, product }: RetailerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const retailer = getRetailer(priceData.retailerName);

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 flex-shrink-0"
        >
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        </button>

        {/* Retailer logo/initials */}
        <button
          onClick={() => setStoreModalOpen(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: retailer.color }}
          title={`View ${retailer.name} details`}
        >
          {getRetailerInitials(retailer.name)}
        </button>

        {/* Product name + retailer + shipping */}
        <div className="flex-1 min-w-0">
          <a
            href={priceData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-link hover:underline line-clamp-1"
          >
            {product.name}
          </a>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={() => setStoreModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              {retailer.name}
            </button>
            {retailer.deliveryInfo && (
              <>
                <span className="text-muted-foreground text-[10px]">·</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <Truck className="w-3 h-3" />
                  {retailer.deliveryInfo}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Price + badges */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-base font-bold text-foreground">
              KES {priceData.price.toLocaleString()}
            </span>
            {isLowest && (
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Lowest
              </span>
            )}
          </div>
          {!priceData.inStock && (
            <span className="text-[11px] text-muted-foreground">Out of stock</span>
          )}
        </div>

        {/* View in shop CTA */}
        <Button size="sm" className="h-8 text-xs font-semibold flex-shrink-0 hidden sm:inline-flex" asChild>
          <a href={priceData.url} target="_blank" rel="noopener noreferrer">
            View in shop ›
          </a>
        </Button>
        {/* Mobile: compact arrow */}
        <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0 sm:hidden" asChild>
          <a href={priceData.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pl-16 bg-gray-50/50">
          <div className="grid sm:grid-cols-2 gap-4 py-3">
            {/* Store info */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">{retailer.name}</h4>
              {retailer.website && retailer.website !== '#' && (
                <a
                  href={retailer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-link hover:underline"
                >
                  Visit store website
                </a>
              )}
              {retailer.deliveryInfo && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Truck className="w-3 h-3 inline mr-1" />
                  {retailer.deliveryInfo}
                </p>
              )}
            </div>

            {/* Payment methods */}
            {retailer.paymentMethods.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Payment methods</h4>
                <div className="flex flex-wrap gap-1.5">
                  {retailer.paymentMethods.map((method: string) => (
                    <span
                      key={method}
                      className="text-[10px] px-2 py-1 bg-white border border-border rounded text-muted-foreground"
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button size="sm" className="mt-2 h-8 text-xs" asChild>
            <a href={priceData.url} target="_blank" rel="noopener noreferrer">
              Shop at {retailer.name}
              <ExternalLink className="w-3 h-3 ml-1.5" />
            </a>
          </Button>
        </div>
      )}

      {/* Store detail modal */}
      <StoreDetailModal
        retailer={retailer}
        open={storeModalOpen}
        onOpenChange={setStoreModalOpen}
        shopUrl={priceData.url}
      />
    </div>
  );
}

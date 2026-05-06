import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';

export interface FilterState {
  priceRange: [number, number];
  selectedBrands: string[];
  selectedRetailers: string[];
  minDiscount: number;
  minRating: number;
}

const PRICE_PRESETS = [
  { label: 'Under 10K', min: 0, max: 10000 },
  { label: '10K–30K', min: 10000, max: 30000 },
  { label: '30K–70K', min: 30000, max: 70000 },
  { label: '70K+', min: 70000, max: 500000 },
];

const LIST_COLLAPSE_THRESHOLD = 5;

interface FilterSidebarProps {
  filters: FilterState;
  brands: string[];
  retailers: { id: string; name: string }[];
  onPriceRangeChange: (range: [number, number]) => void;
  onToggleBrand: (brand: string) => void;
  onToggleRetailer: (retailerId: string) => void;
  onMinDiscountChange: (discount: number) => void;
  onMinRatingChange: (rating: number) => void;
  onReset: () => void;
  maxPrice?: number;
  brandCounts?: Record<string, number>;
}

export default function FilterSidebar({
  filters,
  brands,
  retailers,
  onPriceRangeChange,
  onToggleBrand,
  onToggleRetailer,
  onMinDiscountChange,
  onMinRatingChange,
  onReset,
  maxPrice = 500000,
  brandCounts,
}: FilterSidebarProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [minInput, setMinInput] = useState(String(filters.priceRange[0]));
  const [maxInput, setMaxInput] = useState(String(filters.priceRange[1]));
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const [retailersExpanded, setRetailersExpanded] = useState(false);

  const query = filterQuery.toLowerCase();

  // Filtered brand/retailer lists
  const filteredBrands = query
    ? brands.filter((b) => b.toLowerCase().includes(query))
    : brands;
  const filteredRetailers = query
    ? retailers.filter((r) => r.name.toLowerCase().includes(query))
    : retailers;

  const visibleBrands = brandsExpanded ? filteredBrands : filteredBrands.slice(0, LIST_COLLAPSE_THRESHOLD);
  const visibleRetailers = retailersExpanded ? filteredRetailers : filteredRetailers.slice(0, LIST_COLLAPSE_THRESHOLD);

  const commitPriceInputs = () => {
    const min = Math.max(0, Math.min(Number(minInput) || 0, maxPrice));
    const max = Math.max(min, Math.min(Number(maxInput) || maxPrice, maxPrice));
    onPriceRangeChange([min, max]);
    setMinInput(String(min));
    setMaxInput(String(max));
  };

  const handlePriceInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitPriceInputs();
  };

  // Keep local inputs synced when slider moves
  const handleSliderChange = (v: number[]) => {
    const range = v as [number, number];
    onPriceRangeChange(range);
    setMinInput(String(range[0]));
    setMaxInput(String(range[1]));
  };

  const applyPreset = (preset: typeof PRICE_PRESETS[number]) => {
    onPriceRangeChange([preset.min, preset.max]);
    setMinInput(String(preset.min));
    setMaxInput(String(preset.max));
  };

  return (
    <div className="space-y-6">
      {/* Filter search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Find filter..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-xs font-semibold text-foreground mb-3 block uppercase tracking-wider">Price Range</Label>
        <div className="px-1">
          <Slider
            value={filters.priceRange}
            onValueChange={handleSliderChange}
            min={0}
            max={maxPrice}
            step={1000}
            className="mb-3"
          />
          {/* Min / Max inputs */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Min (KES)</label>
              <Input
                type="number"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                onBlur={commitPriceInputs}
                onKeyDown={handlePriceInputKey}
                className="h-7 text-xs"
                min={0}
                max={maxPrice}
              />
            </div>
            <span className="text-muted-foreground text-xs mt-4">–</span>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Max (KES)</label>
              <Input
                type="number"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                onBlur={commitPriceInputs}
                onKeyDown={handlePriceInputKey}
                className="h-7 text-xs"
                min={0}
                max={maxPrice}
              />
            </div>
          </div>
          {/* Price presets */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {PRICE_PRESETS.map((preset) => {
              const isActive = filters.priceRange[0] === preset.min && filters.priceRange[1] === preset.max;
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-muted-foreground border-border hover:border-foreground/30'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Brands */}
      {filteredBrands.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-foreground mb-3 block uppercase tracking-wider">Brand</Label>
          <div className="space-y-2">
            {visibleBrands.map((brand) => (
              <div key={brand} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand}`}
                  checked={filters.selectedBrands.includes(brand)}
                  onCheckedChange={() => onToggleBrand(brand)}
                />
                <label htmlFor={`brand-${brand}`} className="text-xs cursor-pointer text-foreground">
                  {brand}
                  {brandCounts && brandCounts[brand] != null && (
                    <span className="text-muted-foreground ml-1">({brandCounts[brand]})</span>
                  )}
                </label>
              </div>
            ))}
          </div>
          {filteredBrands.length > LIST_COLLAPSE_THRESHOLD && (
            <button
              onClick={() => setBrandsExpanded(!brandsExpanded)}
              className="text-xs text-link hover:underline mt-2"
            >
              {brandsExpanded ? 'Show less' : `Show all ${filteredBrands.length}`}
            </button>
          )}
        </div>
      )}

      {/* Retailers */}
      {filteredRetailers.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-foreground mb-3 block uppercase tracking-wider">Retailer</Label>
          <div className="space-y-2">
            {visibleRetailers.map((retailer) => (
              <div key={retailer.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`retailer-${retailer.id}`}
                  checked={filters.selectedRetailers.includes(retailer.id)}
                  onCheckedChange={() => onToggleRetailer(retailer.id)}
                />
                <label htmlFor={`retailer-${retailer.id}`} className="text-xs cursor-pointer text-foreground">
                  {retailer.name}
                </label>
              </div>
            ))}
          </div>
          {filteredRetailers.length > LIST_COLLAPSE_THRESHOLD && (
            <button
              onClick={() => setRetailersExpanded(!retailersExpanded)}
              className="text-xs text-link hover:underline mt-2"
            >
              {retailersExpanded ? 'Show less' : `Show all ${filteredRetailers.length}`}
            </button>
          )}
        </div>
      )}

      {/* Discount */}
      <div>
        <Label className="text-xs font-semibold text-foreground mb-3 block uppercase tracking-wider">Discount</Label>
        <div className="space-y-2">
          {[0, 10, 20, 30].map((discount) => (
            <div key={discount} className="flex items-center space-x-2">
              <Checkbox
                id={`discount-${discount}`}
                checked={filters.minDiscount === discount}
                onCheckedChange={() => onMinDiscountChange(discount)}
              />
              <label htmlFor={`discount-${discount}`} className="text-xs cursor-pointer text-foreground">
                {discount === 0 ? 'Any discount' : `${discount}%+ off`}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <Label className="text-xs font-semibold text-foreground mb-3 block uppercase tracking-wider">Rating</Label>
        <div className="space-y-2">
          {[0, 4, 4.5].map((rating) => (
            <div key={rating} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${rating}`}
                checked={filters.minRating === rating}
                onCheckedChange={() => onMinRatingChange(rating)}
              />
              <label htmlFor={`rating-${rating}`} className="text-xs cursor-pointer text-foreground">
                {rating === 0 ? 'Any rating' : `${rating}+ stars`}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="pt-4 border-t border-border">
        <Button onClick={onReset} variant="outline" size="sm" className="w-full text-xs">
          Reset filters
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useId, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Input } from '../../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../../components/ui/sheet';
import {
  activeFilterCount,
  SORT_OPTIONS,
  type PriceBucket,
  type ListingFilters,
  type SortKey,
} from '../../../lib/listing';

interface PanelProps {
  filters: ListingFilters;
  brands: { value: string; count: number }[];
  /** Price ranges with counts; the custom min/max form stays below them. */
  prices?: PriceBucket[];
  onChange: (next: ListingFilters) => void;
}

/** The one label for the multi-shop filter, on every listing surface. */
export const MULTI_SHOP_LABEL = 'Prices from 2+ shops';

/** Sort control, shared by browse and search. A native select: it is the most usable control on a phone. */
export function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="hidden sm:inline">Sort by</span>
      {/* aria-label as well: the visible "Sort by" is hidden on phones. */}
      <select
        aria-label="Sort by"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Filter controls: the desktop sidebar body, and the mobile sheet body. */
const BRANDS_COLLAPSED = 12;

export function FilterControls({ filters, brands, prices = [], onChange }: PanelProps) {
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');
  // Selected brands always stay visible, so a filter can be undone from the
  // sidebar even when the brand is outside the top of the list.
  const q = brandQuery.trim().toLowerCase();
  const matching = q ? brands.filter((b) => b.value.includes(q)) : brands;
  const top = showAllBrands || q ? matching : matching.slice(0, BRANDS_COLLAPSED);
  const pinned = filters.brands
    .filter((v) => !top.some((b) => b.value === v))
    .map((v) => brands.find((b) => b.value === v) ?? { value: v, count: 0 });
  const shownBrands = [...pinned, ...top];
  const [min, setMin] = useState(filters.min?.toString() ?? '');
  const [max, setMax] = useState(filters.max?.toString() ?? '');
  const [priceError, setPriceError] = useState<string | null>(null);
  const errorId = useId();
  useEffect(() => {
    setMin(filters.min?.toString() ?? '');
    setMax(filters.max?.toString() ?? '');
    setPriceError(null);
  }, [filters.min, filters.max]);

  const applyPrice = () => {
    const parse = (v: string) => {
      const n = Number(v.replace(/[^\d]/g, ''));
      return v && n > 0 ? n : null;
    };
    const lo = parse(min);
    const hi = parse(max);
    // A maximum below the minimum is a typing slip, not a filter: say so
    // inline and keep both numbers, rather than answering "No products match".
    if (lo != null && hi != null && hi < lo) {
      setPriceError('Enter a maximum price that is at least the minimum.');
      return;
    }
    setPriceError(null);
    onChange({ ...filters, min: lo, max: hi });
  };

  const toggleBrand = (brand: string) =>
    onChange({
      ...filters,
      brands: filters.brands.includes(brand)
        ? filters.brands.filter((b) => b !== brand)
        : [...filters.brands, brand],
    });

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="microcopy-label mb-2">Shops</legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={filters.multiShop}
            onCheckedChange={(v) => onChange({ ...filters, multiShop: v === true })}
          />
          {MULTI_SHOP_LABEL}
        </label>
      </fieldset>

      <fieldset>
        <legend className="microcopy-label mb-2">Price (KES)</legend>
        {prices.length > 0 && (
          <ul className="mb-3 space-y-1">
            {prices.map((b) => {
              const on = filters.min === b.min && filters.max === b.max;
              const k = (n: number) => n.toLocaleString('en-GB');
              const label =
                b.min == null ? `Under ${k(b.max! + 1)}` : b.max == null ? `${k(b.min)} and over` : `${k(b.min)} to ${k(b.max + 1)}`;
              return (
                <li key={label}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={!b.count && !on}
                    onClick={() => onChange({ ...filters, min: on ? null : b.min, max: on ? null : b.max })}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors disabled:opacity-40 ${
                      on ? 'bg-primary/10 font-medium text-foreground' : 'text-foreground hover:bg-surface-alt'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{b.count.toLocaleString('en-GB')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyPrice();
          }}
        >
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              aria-label="Minimum price"
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? errorId : undefined}
              placeholder="Minimum"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="h-9"
            />
            <span className="text-muted-foreground" aria-hidden="true">
              to
            </span>
            <Input
              inputMode="numeric"
              aria-label="Maximum price"
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? errorId : undefined}
              placeholder="Maximum"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="h-9"
            />
            <Button type="submit" variant="outline" size="sm" className="h-9">
              Apply
            </Button>
          </div>
          {priceError && (
            <p id={errorId} role="alert" className="text-xs text-destructive">
              {priceError}
            </p>
          )}
        </form>
      </fieldset>

      {brands.length > 1 && (
        <fieldset>
          <legend className="microcopy-label mb-2">Brand</legend>
          {brands.length > BRANDS_COLLAPSED && (
            <Input
              aria-label="Search brands"
              placeholder="Search brands"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              className="h-9 mb-3"
            />
          )}
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {shownBrands.map((b) => (
              <li key={b.value}>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={filters.brands.includes(b.value)}
                    onCheckedChange={() => toggleBrand(b.value)}
                  />
                  <span className="flex-1 capitalize">{b.value}</span>
                  <span className="text-xs text-muted-foreground">{b.count.toLocaleString()}</span>
                </label>
              </li>
            ))}
            {shownBrands.length === 0 && <li className="text-sm text-muted-foreground">No matching brands.</li>}
          </ul>
          {!q && brands.length > BRANDS_COLLAPSED && (
            <Button
              variant="link"
              className="h-auto p-0 mt-2 text-sm"
              onClick={() => setShowAllBrands((v) => !v)}
            >
              {showAllBrands ? 'Show fewer' : `Show all ${brands.length} brands`}
            </Button>
          )}
        </fieldset>
      )}

      {activeFilterCount(filters) > 0 && (
        <Button
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => onChange({ ...filters, brands: [], min: null, max: null, multiShop: false })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

/**
 * Mobile: a "Filters" button opening the same controls in a sheet. Filters
 * apply as they are tapped; the button at the foot says how many products
 * that leaves and closes the sheet (idealo's pattern).
 */
export function MobileFilters({ resultCount, ...props }: PanelProps & { resultCount?: number }) {
  const count = activeFilterCount(props.filters);
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 lg:hidden">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters{count > 0 ? ` (${count})` : ''}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <FilterControls {...props} />
        </div>
        {resultCount != null && (
          <div className="border-t border-border p-4">
            <Button className="w-full" onClick={() => setOpen(false)}>
              {resultCount === 0
                ? 'No products match these filters'
                : `Show ${resultCount.toLocaleString('en-GB')} ${resultCount === 1 ? 'product' : 'products'}`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

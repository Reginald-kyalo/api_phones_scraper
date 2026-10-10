import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Input } from '../../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../../components/ui/sheet';
import {
  activeFilterCount,
  SORT_OPTIONS,
  type ListingFilters,
  type SortKey,
} from '../../../lib/listing';

interface PanelProps {
  filters: ListingFilters;
  brands: { value: string; count: number }[];
  onChange: (next: ListingFilters) => void;
}

/** Sort control, shared by browse and search. A native select: it is the most usable control on a phone. */
export function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="hidden sm:inline">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-9 rounded-md border border-border bg-white px-3 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
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
export function FilterControls({ filters, brands, onChange }: PanelProps) {
  const [min, setMin] = useState(filters.min?.toString() ?? '');
  const [max, setMax] = useState(filters.max?.toString() ?? '');
  useEffect(() => {
    setMin(filters.min?.toString() ?? '');
    setMax(filters.max?.toString() ?? '');
  }, [filters.min, filters.max]);

  const applyPrice = () => {
    const parse = (v: string) => {
      const n = Number(v.replace(/[^\d]/g, ''));
      return v && n > 0 ? n : null;
    };
    onChange({ ...filters, min: parse(min), max: parse(max) });
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
        <legend className="microcopy-label mb-2">Comparison</legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={filters.multiShop}
            onCheckedChange={(v) => onChange({ ...filters, multiShop: v === true })}
          />
          Sold by 2 or more shops
        </label>
      </fieldset>

      <fieldset>
        <legend className="microcopy-label mb-2">Price (KES)</legend>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyPrice();
          }}
        >
          <Input
            inputMode="numeric"
            aria-label="Minimum price"
            placeholder="Min"
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
            placeholder="Max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="h-9"
          />
          <Button type="submit" variant="outline" size="sm" className="h-9">
            Go
          </Button>
        </form>
      </fieldset>

      {brands.length > 1 && (
        <fieldset>
          <legend className="microcopy-label mb-2">Brand</legend>
          <ul className="space-y-2">
            {brands.map((b) => (
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
          </ul>
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

/** Mobile: a "Filters" button opening the same controls in a sheet. */
export function MobileFilters(props: PanelProps) {
  const count = activeFilterCount(props.filters);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 lg:hidden">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters{count > 0 ? ` (${count})` : ''}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-5">
        <SheetHeader className="p-0 mb-4">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <FilterControls {...props} />
      </SheetContent>
    </Sheet>
  );
}

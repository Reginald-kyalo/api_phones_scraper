import { Package } from 'lucide-react';
import SearchBar from '../../features/search/components/SearchBar';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { SavingBadge } from '../common/SavingBadge';
import type { ClusterDetail } from '../../lib/api';
import { clusterSaving, formatPrice, hasPrice } from '../../lib/format';

interface HeroSectionProps {
  productCount?: number;
  /**
   * The hero renders a real comparison, so it needs the DETAIL view: listing
   * rows omit best_by_store to keep the feed small, and without it the offer
   * list silently fell back to placeholder prices.
   */
  showcase?: ClusterDetail | null;
}

/**
 * Homepage hero: the SokoPulse pitch and search on the left, one real
 * comparison on the right.
 *
 * Flat on purpose (DESIGN_RULES.md §2): a 1px border on the light canvas, no
 * shadows, no device mock-up, no floating cards. The right column is also the
 * slot a sold "campaign card" will take later (design review §4.4), which is
 * why it is a plain card of fixed size rather than a decoration.
 */
export default function HeroSection({ productCount, showcase }: HeroSectionProps) {
  // Real per-store offers, cheapest first. Stores stay anonymous by design — a
  // redacted bar, not a brand name: no store gets free placement in the hero.
  const prices = Object.values(showcase?.best_by_store ?? {})
    .map((v) => (typeof v === 'number' ? v : v?.price))
    .filter(hasPrice)
    .sort((a, b) => a - b);
  const saving = showcase ? clusterSaving(showcase) : null;
  const highest = prices.length ? prices[prices.length - 1] : null;
  const rows = prices.slice(0, 5).map((price, i) => ({
    bar: ['w-14', 'w-10', 'w-16', 'w-12', 'w-9'][i],
    price,
  }));
  const name = showcase ? (showcase.display_name ?? showcase.title) : null;

  return (
    <div className="page-container pt-6">
      <section className="rounded-lg border border-border bg-canvas-light">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-10 items-center px-6 py-8 sm:px-10 md:px-12 md:py-10">
          {/* Left: what SokoPulse is, and the search */}
          <div className="max-w-2xl">
            <p className="microcopy-label mb-4">Price comparison for Kenya</p>
            <h1 className="font-display text-[34px] md:text-[44px] font-bold leading-[1.08] tracking-tight text-ink mb-4">
              Know the real price before you buy.
            </h1>
            <p className="text-base md:text-lg max-w-xl mb-7 leading-relaxed text-muted-foreground">
              Every shop’s price for the same product, sorted by price, with the exact listing and
              when we last checked it.
            </p>

            <SearchBar variant="hero" placeholder="Search any product…" className="max-w-xl" />

            <p className="text-xs mt-4 text-muted-foreground">
              {productCount != null
                ? `${productCount.toLocaleString()} products compared · free price alerts`
                : 'Prices from Kenyan shops · free price alerts'}
            </p>
          </div>

          {/* Right: one real comparison, the product's own job made literal */}
          <div className="w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">
            <div className="rounded-md border border-border bg-white p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-md bg-surface-alt overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {showcase?.image ? (
                    <ImageWithFallback
                      src={showcase.image}
                      alt=""
                      className="w-full h-full object-contain p-1.5"
                      fallback={<Package className="w-5 h-5 text-muted-foreground/40" aria-hidden="true" />}
                    />
                  ) : (
                    <Package className="w-5 h-5 text-muted-foreground/40" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight text-foreground line-clamp-2">
                    {name ?? ' '}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {prices.length > 0 ? `${prices.length} shops · sorted by price` : ' '}
                  </p>
                </div>
              </div>

              {/* Fixed height: five rows whether or not the data has landed, so
                  nothing below shifts when it does. */}
              <ul className="space-y-1.5 h-[188px]" aria-label={name ? `${name} prices` : undefined}>
                {(rows.length ? rows : Array.from({ length: 5 }, () => null)).map((row, i) => (
                  <li
                    key={i}
                    className="flex h-[34px] items-center justify-between rounded-md bg-surface-alt px-3"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 rounded-full bg-muted-foreground/25 ${row ? row.bar : 'w-12'}`}
                        aria-hidden="true"
                      />
                      {row && i === 0 && (
                        <span className="text-[11px] font-semibold text-foreground">Lowest</span>
                      )}
                    </span>
                    {row && (
                      <span className={`price-num text-xs ${i === 0 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                        {formatPrice(row.price)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex h-6 items-center justify-between gap-2 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">
                  {highest != null && saving ? (
                    <>
                      Up to <span className="price-num text-foreground">{formatPrice(saving.kes)}</span> between shops
                    </>
                  ) : (
                    ' '
                  )}
                </span>
                <SavingBadge saving={saving} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

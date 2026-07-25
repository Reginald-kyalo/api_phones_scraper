import { Link } from 'react-router';
import type { ClusterSummary } from '../../lib/api';
import { Bell, TrendingDown, ArrowDown } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { Button } from '../ui/button';
import { Reveal, CountUp } from '../common/Reveal';
import { formatPrice } from '../../lib/format';

// The faux alert demonstrates the product doing its job: on reveal the price
// counts down from the old price to below target, then "Price dropped" lands.
// Generic title only — marketing/decorative UI stays anonymous (DESIGN_HANDOFF
// rule; BEHAVIORAL_PRINCIPLES.md §5).
/* Fallback only, used until the real cluster resolves. Every figure below
   prefers the passed-in cluster's own store prices. */
const OLD_PRICE = 41200;
const NEW_PRICE = 34499;
const EASE = [0.16, 1, 0.3, 1] as const;

export default function AlertsBanner({ example }: { example?: ClusterSummary | null }) {
  // A real product carried by several stores: `high` is what it costs at the
  // dearest, `low` at the cheapest. That gap is measured, unlike a "price
  // dropped over time" story the dataset has no history to support.
  const storePrices = Object.values(example?.best_by_store ?? {}).filter(
    (v): v is number => typeof v === 'number',
  );
  const low = example?.best_price ?? NEW_PRICE;
  const spreadPct = example?.like_for_like_spread_pct ?? null;
  const high = storePrices.length
    ? Math.max(...storePrices)
    : example?.best_price != null && spreadPct != null
      ? Math.round(example.best_price * (1 + spreadPct / 100))
      : OLD_PRICE;
  const label = example ? (example.display_name ?? example.title) : 'Wireless headphones';
  const reduce = useReducedMotion();

  return (
    <section className="ultra-border rounded-2xl overflow-hidden mb-12 hover:border-border">
      <div className="grid md:grid-cols-2 items-center">
        {/* Left: copy + CTA */}
        <Reveal className="p-8 md:p-12">
          <span className="microcopy-label">Price alerts</span>
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mt-2 mb-2">
            Never overpay again
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-md">
            Set a target price on any product and we’ll email you the moment a shop drops below it.
            Free, unlimited, and no spam.
          </p>
          <Button className="h-11 px-6 font-semibold gap-2" asChild>
            <Link to="/alerts">
              <Bell aria-hidden="true" className="w-4 h-4" /> Set a price alert
            </Link>
          </Button>
        </Reveal>

        {/* Right: faux alert card visual */}
        <div className="bg-surface-alt p-8 md:p-12 flex items-center justify-center">
          <Reveal className="w-full max-w-xs" y={16}>
            <div className="bg-card rounded-xl ultra-border p-4 hover:border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingDown aria-hidden="true" className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{label}</p>
                  <p className="microcopy-label">
                    {example?.n_stores ? `${example.n_stores} shops compared` : 'Across shops'}
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="price-num text-xs text-muted-foreground line-through">
                    {formatPrice(high)}
                  </p>
                  <CountUp
                    from={high}
                    to={low}
                    format={formatPrice}
                    className="price-num text-lg font-bold text-teal block"
                  />
                </div>
                <m.span
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, duration: 0.3, ease: EASE }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal bg-teal/10 px-2 py-1 rounded"
                >
                  <ArrowDown aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} /> Cheaper elsewhere
                </m.span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

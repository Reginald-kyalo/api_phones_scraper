import { Link } from 'react-router';
import { formatPrice, shopLabel } from '../lib/format';
import {
  mockDeals,
  mockPopular,
  mockPhones,
  mockComputing,
  mockSoundVision,
  type MockProduct,
} from '../data/homepageMock';
import HeroSection from '../components/layout/HeroSection';
import CategoryStrip from '../components/layout/CategoryStrip';
import HowItWorks from '../components/layout/HowItWorks';
import AlertsBanner from '../components/layout/AlertsBanner';
import { Reveal } from '../components/common/Reveal';
import {
  Package,
  ArrowRight,
  ArrowDown,
  ArrowUpRight,
  ShieldCheck,
  Ban,
  Tag,
} from 'lucide-react';
import type { ComponentType } from 'react';

// Single discount token: a calm teal "▼ %" — never a red sale tag.
// See BEHAVIORAL_PRINCIPLES.md §7 and DESIGN_HANDOFF.md (discount = teal down-arrow).
function DiscountBadge({ percent, className = '' }: { percent: number; className?: string }) {
  if (percent <= 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md bg-teal/10 text-teal text-xs font-bold px-1.5 py-1 ${className}`}
    >
      <ArrowDown aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
      {percent}%
    </span>
  );
}

function discountOf(product: MockProduct): number {
  return product.oldPrice && product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;
}

// Compact product card for homepage rails. Flat, border-only, snappy —
// no scaling or drop-shadow hovers (see DESIGN_HANDOFF.md design notes).
function HomeProductCard({ product }: { product: MockProduct; large?: boolean }) {
  const discount = discountOf(product);

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block min-w-[180px] max-w-[210px] flex-shrink-0 snap-start bg-card ultra-border rounded-lg overflow-hidden"
    >
      <div className="relative aspect-square bg-surface-alt overflow-hidden flex items-center justify-center">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-4"
            loading="lazy"
          />
        ) : (
          <Package className="h-10 w-10 text-muted-foreground" />
        )}
        <DiscountBadge percent={discount} className="absolute top-2 left-2" />
      </div>
      <div className="p-3">
        <p className="text-sm text-foreground line-clamp-2 leading-snug min-h-[2.6em] group-hover:text-primary transition-colors">
          {product.name}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="price-num text-base font-bold text-price">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="price-num price-old text-xs">{formatPrice(product.oldPrice)}</span>
          )}
        </div>
        {product.numStores > 0 && (
          <p className="microcopy-label mt-1">{shopLabel(product.numStores)}</p>
        )}
      </div>
    </Link>
  );
}

// Richer deal card — drop badge, savings line, filled CTA — for the deals rail
// where the discount is the story (PriceSpy daily-deals pattern, in our
// teal/mono identity). `large` gives the first rail a bigger, hero-rail feel.
function DealCard({ product, large = false }: { product: MockProduct; large?: boolean }) {
  const discount = discountOf(product);
  const savings = product.oldPrice ? product.oldPrice - product.price : 0;
  const brand = product.name.split(' ')[0];

  // Two targets: the card body opens our product page (internal); "View deal"
  // opens the vendor's product page (external, new tab). They're siblings — not
  // nested anchors — so each click goes exactly where intended.
  return (
    <div
      className={`flex flex-col flex-shrink-0 snap-start bg-card ultra-border rounded-lg overflow-hidden ${
        large ? 'min-w-[240px] max-w-[270px]' : 'min-w-[200px] max-w-[220px]'
      }`}
    >
      <Link to={`/product/${product.id}`} className="group flex flex-col flex-1">
        <div className="relative aspect-square bg-surface-alt flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-contain ${large ? 'p-5' : 'p-4'}`}
              loading="lazy"
            />
          ) : (
            <Package className="h-10 w-10 text-muted-foreground" />
          )}
          <DiscountBadge percent={discount} className="absolute top-2 left-2" />
        </div>
        <div className="px-3 pt-3 flex flex-col flex-1">
          <p className="microcopy-label">{brand}</p>
          <p className="text-sm text-foreground line-clamp-2 leading-snug min-h-[2.6em] mt-1 group-hover:text-primary transition-colors">
            {product.name}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`price-num font-bold text-price ${large ? 'text-lg' : 'text-base'}`}>
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="price-num price-old text-xs">{formatPrice(product.oldPrice)}</span>
            )}
          </div>
          {savings > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal">
              <ArrowDown aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} /> Save {formatPrice(savings)}
            </p>
          )}
          <p className="microcopy-label mt-1">{shopLabel(product.numStores)}</p>
        </div>
      </Link>

      {/* External CTA → vendor's product page (new tab). Always visible; fills teal on hover. */}
      <div className="px-3 pt-2.5 pb-3">
        <a
          href={product.vendorUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${product.name} deal at the vendor (opens in a new tab)`}
          className="group/btn flex items-center justify-center gap-1.5 h-9 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-deep transition-colors"
        >
          View deal
          <ArrowUpRight aria-hidden="true" className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </a>
      </div>
    </div>
  );
}

// "Deal of the day" — a single curated featured deal that breaks the rail run
// and reuses the hero's price-spread bar. Editorial rhythm so the page reads as
// a curated front page, not a feed. See HOMEPAGE_AUDIT.md (revertable).
function FeaturedDeal({ product }: { product: MockProduct }) {
  const discount = discountOf(product);
  const savings = product.oldPrice ? product.oldPrice - product.price : 0;
  const brand = product.name.split(' ')[0];
  const highest =
    product.oldPrice && product.oldPrice > product.price
      ? product.oldPrice
      : Math.round(product.price * 1.12);

  return (
    <Reveal className="mb-12">
      <section className="ultra-border rounded-2xl overflow-hidden hover:border-border">
        <div className="grid md:grid-cols-2 items-stretch">
          {/* Left: image well (links to our product page) */}
          <Link
            to={`/product/${product.id}`}
            className="group relative bg-surface-alt flex items-center justify-center p-8 md:p-10 min-h-[260px]"
          >
            <span className="microcopy-label absolute top-4 left-4 text-teal">Deal of the day</span>
            <DiscountBadge percent={discount} className="absolute top-4 right-4" />
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="max-h-[260px] w-auto object-contain"
                loading="lazy"
              />
            ) : (
              <Package className="h-16 w-16 text-muted-foreground" />
            )}
          </Link>

          {/* Right: the pricing story */}
          <div className="p-6 md:p-10 flex flex-col justify-center">
            <p className="microcopy-label">{brand}</p>
            <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight text-foreground mt-1 mb-3 leading-tight">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-3 mb-1">
              <span className="price-num text-2xl md:text-3xl font-bold text-price">
                {formatPrice(product.price)}
              </span>
              {product.oldPrice && (
                <span className="price-num price-old text-sm">{formatPrice(product.oldPrice)}</span>
              )}
            </div>
            {savings > 0 && (
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-teal mb-5">
                <ArrowDown aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} /> Save{' '}
                {formatPrice(savings)}
              </p>
            )}

            {/* Signature price-spread bar (lowest ● ── ○ highest) */}
            <div className="flex items-center gap-3 mb-6 max-w-md">
              <span className="price-num text-sm font-semibold text-teal">{formatPrice(product.price)}</span>
              <div className="relative h-1.5 flex-1 rounded-full bg-border">
                <span
                  className="absolute -top-1 left-0 w-3.5 h-3.5 rounded-full bg-teal"
                  style={{ boxShadow: '0 0 0 4px rgba(14,124,139,0.15)' }}
                />
                <span className="absolute -top-1 right-0 w-3.5 h-3.5 rounded-full bg-muted-foreground/40" />
              </div>
              <span className="price-num text-sm text-muted-foreground">{formatPrice(highest)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href={product.vendorUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${product.name} deal at the vendor (opens in a new tab)`}
                className="group/btn inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-deep transition-colors"
              >
                View deal
                <ArrowUpRight aria-hidden="true" className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </a>
              <Link
                to={`/product/${product.id}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:text-link-hover"
              >
                Compare {shopLabel(product.numStores)} <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function Rail({
  title,
  subtitle,
  href,
  linkLabel,
  products,
  CardComponent = HomeProductCard,
  large = false,
  reveal = false,
}: {
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
  products: MockProduct[];
  CardComponent?: ComponentType<{ product: MockProduct; large?: boolean }>;
  large?: boolean;
  reveal?: boolean;
}) {
  if (products.length === 0) return null;
  const row = (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x scroll-hint-x items-stretch">
      {products.map((product) => (
        <CardComponent key={`${title}-${product.id}`} product={product} large={large} />
      ))}
    </div>
  );
  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Link
          to={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:text-link-hover whitespace-nowrap"
        >
          {linkLabel} <ArrowRight aria-hidden="true" className="w-4 h-4" />
        </Link>
      </div>
      {reveal ? <Reveal>{row}</Reveal> : row}
    </section>
  );
}

// The three reasons to trust an independent comparison engine — the page's
// closing statement. See BEHAVIORAL_PRINCIPLES.md §5.
const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Truly independent',
    body: "We don't sell products and take no commission on what you buy.",
  },
  {
    icon: Ban,
    title: 'No paid rankings',
    body: 'Results are ordered by price. Shops can never pay to rank higher.',
  },
  {
    icon: Tag,
    title: 'Always free',
    body: 'Compare prices and track drops without paying — or even an account.',
  },
];

export default function HomePage() {
  // DESIGN PASS: rails are driven by static mock data. See homepageMock.ts for
  // the TODO(wire-data) notes on swapping in live endpoints.
  return (
    <div className="bg-white">
      <HeroSection productCount={921800} variant="light" />
      <div className="mt-5">
        <CategoryStrip />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <FeaturedDeal product={mockDeals[0]} />

        <Rail
          title="Top deals today"
          subtitle="The biggest price drops we're tracking right now"
          href="/deals"
          linkLabel="See all deals"
          products={mockDeals}
          CardComponent={DealCard}
          large
          reveal
        />
        <Rail
          title="Popular right now"
          subtitle="Most compared products this week"
          href="/browse"
          linkLabel="Browse all"
          products={mockPopular}
        />

        <HowItWorks />

        <Rail
          title="Trending in Phones & Wearables"
          subtitle="Top picks carried by the most shops"
          href="/browse/phones_wearables"
          linkLabel="See all phones"
          products={mockPhones}
        />
        <Rail
          title="Top in Computing"
          subtitle="Laptops, desktops and more"
          href="/browse/computing"
          linkLabel="See all computing"
          products={mockComputing}
        />

        <AlertsBanner />

        <Rail
          title="Popular in Sound & Vision"
          subtitle="TVs, speakers and home cinema"
          href="/browse/sound_vision"
          linkLabel="See all sound & vision"
          products={mockSoundVision}
        />

        {/* Trust close — the page ends on why to trust us, not a signup ask.
            Keeps the gradient; drops the "create an account" pressure.
            See BEHAVIORAL_PRINCIPLES.md §1, §3, §5. */}
        <Reveal>
          <section className="bg-hero-gradient text-white rounded-2xl px-6 py-12 md:px-12 md:py-14">
            <div className="max-w-2xl mx-auto text-center">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal-bright mb-4">
                Why DealsOnline
              </p>
              <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight mb-3">
                Independent. No ads. Nothing to sell.
              </h2>
              <p className="text-sm md:text-base text-white/65 max-w-xl mx-auto leading-relaxed">
                We compare live prices across every retailer we can find — ranked only by price,
                never by who pays us. Because no one does.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto mt-12">
              {TRUST_POINTS.map((point) => (
                <div key={point.title} className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-full bg-teal-bright/15 flex items-center justify-center mb-3">
                    <point.icon aria-hidden="true" className="w-5 h-5 text-teal-bright" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{point.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed max-w-[15rem]">{point.body}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/deals"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-teal-bright transition-colors"
              >
                Browse all deals <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

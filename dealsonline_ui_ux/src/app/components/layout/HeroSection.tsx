import { Check } from 'lucide-react';
import SearchBar from '../../features/search/components/SearchBar';
import { Reveal } from '../common/Reveal';

interface HeroSectionProps {
  productCount?: number;
  /** 'dark' = ink canvas (Linear-style); 'light' = airy canvas (Stripe-style). */
  variant?: 'dark' | 'light';
}

// Stores stay anonymous on purpose — a redacted bar, not a brand name (no
// store gets free promotion). Just the offer and its price.
const SCREEN_ROWS = [
  { bar: 'w-12', price: 'KES 34,499', lowest: true },
  { bar: 'w-8', price: 'KES 36,900', lowest: false },
  { bar: 'w-14', price: 'KES 38,200', lowest: false },
  { bar: 'w-10', price: 'KES 39,450', lowest: false },
  { bar: 'w-12', price: 'KES 41,000', lowest: false },
  { bar: 'w-9', price: 'KES 42,300', lowest: false },
];

export default function HeroSection({ productCount = 921800, variant = 'dark' }: HeroSectionProps) {
  const dark = variant === 'dark';

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 pt-6">
      <section
        className={`relative rounded-2xl overflow-hidden ${
          dark ? 'bg-canvas-ink text-white' : 'bg-canvas-light text-ink border border-border'
        }`}
      >
        {/* Ambient teal light — sits behind the phone, premium and quiet */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 w-[640px] h-[640px]"
          style={{
            background: dark
              ? 'radial-gradient(circle, rgba(43,194,212,0.22), transparent 62%)'
              : 'radial-gradient(circle, rgba(14,124,139,0.10), transparent 62%)',
          }}
        />

        <div className="relative grid lg:grid-cols-2 gap-10 items-center px-6 py-7 sm:px-10 md:px-12 md:py-9">
          {/* Left: thesis + search */}
          <div className="max-w-2xl">
            <p
              className={`font-mono text-xs uppercase tracking-[0.18em] mb-5 ${
                dark ? 'text-teal-bright' : 'text-teal'
              }`}
            >
              Kenya · Independent price comparison
            </p>
            <h1
              className={`font-display text-4xl md:text-5xl lg:text-[52px] font-bold leading-[1.04] mb-5 ${
                dark ? 'text-white' : 'text-ink'
              }`}
            >
              Know the real price
              <br />
              <span className={dark ? 'text-white/45' : 'text-ink/40'}>before you buy.</span>
            </h1>
            <p
              className={`text-base md:text-lg max-w-xl mb-7 leading-relaxed ${
                dark ? 'text-white/65' : 'text-muted-foreground'
              }`}
            >
              We compare live prices from Kenya’s top retailers — independently, with no ads and
              nothing to sell.
            </p>

            <SearchBar variant="hero" placeholder="Search any product…" className="max-w-xl" />

            <p
              className={`font-mono text-xs tracking-wide mt-5 ${
                dark ? 'text-white/40' : 'text-muted-foreground'
              }`}
            >
              {productCount.toLocaleString()}+ products · live prices · free alerts
            </p>
          </div>

          {/* Right: phone showcase with ambient light (desktop) */}
          <div className="hidden lg:flex justify-center">
            <PhoneShowcase />
          </div>

          {/* Mobile/tablet: a frameless comparison card so the signature
              "every offer, lowest in teal" visual reaches the mobile-first
              audience too (the phone showcase is desktop-only). */}
          <div className="lg:hidden">
            <MobileOffers dark={dark} />
          </div>
        </div>

        {/* Signature: the price-spread strip — the thesis, made literal */}
        <div
          className={`relative border-t px-8 md:px-12 py-5 ${
            dark ? 'border-white/10 bg-white/[0.03]' : 'border-border bg-surface-alt'
          }`}
        >
          <Reveal className="flex flex-wrap items-center gap-x-6 gap-y-3" y={8}>
            <div className="flex items-center gap-2.5">
              <span
                className={`font-mono text-[11px] uppercase tracking-[0.15em] ${
                  dark ? 'text-white/45' : 'text-muted-foreground'
                }`}
              >
                Price spread
              </span>
              <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-ink'}`}>
                Wireless headphones
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <span className={`price-num text-sm font-semibold ${dark ? 'text-teal-bright' : 'text-teal'}`}>
                KES 34,499
              </span>
              <div
                className={`relative h-1.5 flex-1 rounded-full ${dark ? 'bg-white/10' : 'bg-border'}`}
              >
                <span
                  className="absolute -top-1 left-0 w-3.5 h-3.5 rounded-full bg-teal-bright ring-4"
                  style={{ boxShadow: '0 0 0 4px rgba(43,194,212,0.18)' }}
                />
                <span
                  className={`absolute -top-1 right-0 w-3.5 h-3.5 rounded-full ${
                    dark ? 'bg-white/30' : 'bg-muted-foreground/40'
                  }`}
                />
              </div>
              <span className={`price-num text-sm ${dark ? 'text-white/45' : 'text-muted-foreground'}`}>
                KES 38,200
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                dark ? 'bg-teal-bright/15 text-teal-bright' : 'bg-teal/10 text-teal'
              }`}
            >
              Save KES 3,700 <span className="opacity-60">·</span> 9%
            </span>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/* A clean, device-agnostic SCREEN (no notch, no buttons, no app branding)
   showing the comparison moment — generic product, anonymous offers. */
function PhoneShowcase() {
  return (
    <div className="relative w-[270px]">
      {/* Floating mini deal (behind, top-left) — generic, no brand */}
      <div className="absolute -left-12 top-12 w-32 bg-card rounded-xl shadow-xl ultra-border p-2.5 z-0">
        <div className="aspect-square bg-surface-alt rounded-lg overflow-hidden mb-2">
          <img
            src="https://owp.klarna.com/product/232x232/3207276118/LG-OLED55C56LB-55-OLED-Smart-Television.jpg"
            alt=""
            className="w-full h-full object-contain p-1.5"
            loading="lazy"
          />
        </div>
        <p className="text-[11px] font-semibold text-foreground leading-tight">4K OLED TV</p>
        <div className="flex items-center justify-between mt-1">
          <span className="price-num text-xs font-bold text-ink">KES 159,999</span>
          <span className="rounded bg-teal/10 text-teal text-[9px] font-bold px-1.5 py-0.5">-14%</span>
        </div>
      </div>

      {/* Phone — narrow & tall, generous radius, neutral earpiece + gesture bar.
          No notch, no selfie camera, no side buttons. */}
      <div className="relative ml-auto w-[196px] rounded-[2.2rem] bg-[#0b1216] p-1.5 shadow-2xl ring-1 ring-white/10 z-10">
        <div className="relative bg-white rounded-[1.8rem] h-[400px] overflow-hidden flex flex-col">
          {/* earpiece speaker */}
          <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-muted-foreground/25" />
          <div className="px-4 pt-2 flex flex-col flex-1 min-h-0">
            <div className="aspect-square w-20 mx-auto bg-surface-alt rounded-xl overflow-hidden mb-2.5 flex-shrink-0">
              <img
                src="https://owp.klarna.com/product/232x232/3265537896/0353-Wireless-Headband-Headphones-Gray.jpg"
                alt=""
                className="w-full h-full object-contain p-2"
                loading="lazy"
              />
            </div>
            <p className="text-sm font-semibold text-foreground leading-tight text-center mb-0.5 flex-shrink-0">
              Wireless headphones
            </p>
            <p className="font-mono text-[10px] text-muted-foreground text-center mb-3 tracking-wide flex-shrink-0">
              8 OFFERS
            </p>
            {/* Offer list intentionally overflows the bottom edge — the last row
                clips + fades to hint there are more offers below. */}
            <div
              className="space-y-2 flex-1 min-h-0 overflow-hidden"
              style={{
                maskImage: 'linear-gradient(to bottom, #000 76%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, #000 76%, transparent)',
              }}
            >
              {SCREEN_ROWS.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 ${
                    row.lowest ? 'bg-teal/10 ring-1 ring-teal/30' : 'bg-surface-alt'
                  }`}
                >
                  <span
                    className={`h-2 rounded-full ${row.bar} ${
                      row.lowest ? 'bg-teal/60' : 'bg-muted-foreground/25'
                    }`}
                  />
                  <span
                    className={`price-num text-[11px] font-bold ${
                      row.lowest ? 'text-teal' : 'text-foreground'
                    }`}
                  >
                    {row.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lowest-price pill (front, bottom-right) */}
      <div className="absolute right-0 bottom-4 bg-white rounded-full shadow-xl pl-2.5 pr-3 py-1.5 flex items-center gap-1.5 z-20">
        <span className="w-5 h-5 rounded-full bg-teal flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </span>
        <span className="text-xs font-semibold text-foreground">Lowest price found</span>
      </div>
    </div>
  );
}

/* Compact, frameless version of the comparison moment for mobile/tablet —
   same anonymized offers + lowest-in-teal story as the phone, without the
   device chrome (a phone-inside-a-phone reads odd on a real phone). */
function MobileOffers({ dark }: { dark: boolean }) {
  const rows = SCREEN_ROWS.slice(0, 3);
  return (
    <div
      className={`w-full max-w-md mx-auto rounded-2xl p-4 ${
        dark ? 'bg-white/[0.04] border border-white/10' : 'bg-card ultra-border'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-lg bg-surface-alt overflow-hidden flex-shrink-0 flex items-center justify-center">
          <img
            src="https://owp.klarna.com/product/232x232/3265537896/0353-Wireless-Headband-Headphones-Gray.jpg"
            alt=""
            className="w-full h-full object-contain p-1.5"
            loading="lazy"
          />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-tight ${dark ? 'text-white' : 'text-foreground'}`}>
            Wireless headphones
          </p>
          <p
            className={`font-mono text-[10px] tracking-wide mt-0.5 ${
              dark ? 'text-white/45' : 'text-muted-foreground'
            }`}
          >
            8 OFFERS · LOWEST KES 34,499
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
              row.lowest
                ? 'bg-teal/10 ring-1 ring-teal/30'
                : dark
                  ? 'bg-white/[0.04]'
                  : 'bg-surface-alt'
            }`}
          >
            <span className="flex items-center gap-2">
              {row.lowest && (
                <span className="w-4 h-4 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
                  <Check aria-hidden="true" className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
              )}
              <span
                className={`h-2 rounded-full ${row.bar} ${
                  row.lowest ? 'bg-teal/60' : 'bg-muted-foreground/25'
                }`}
              />
            </span>
            <span
              className={`price-num text-xs font-bold ${
                row.lowest ? 'text-teal' : dark ? 'text-white' : 'text-foreground'
              }`}
            >
              {row.price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

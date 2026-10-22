import { ExternalLink, Target } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SavingBadge } from '../components/common/SavingBadge';
import { StoreMark } from '../components/common/StoreMark';
import { AdSlot, SponsoredLabel } from '../components/ads/AdSlot';
import { Seo } from '../components/common/Seo';

/**
 * Internal reference for the design rules (DESIGN_RULES.md), rendered with the
 * real components so it can never drift from them. Not linked from the site
 * and marked noindex. Sample values below are illustrative, not catalogue data.
 */
const SWATCHES = [
  { name: 'Ink', cls: 'bg-ink', note: 'All text' },
  { name: 'Background', cls: 'bg-background border border-border', note: 'Page' },
  { name: 'Surface', cls: 'bg-surface-alt border border-border', note: 'Bands, image wells' },
  { name: 'Border', cls: 'bg-border', note: '1px hairlines' },
  { name: 'Muted text', cls: 'bg-muted-foreground', note: 'Secondary text' },
  { name: 'Teal', cls: 'bg-primary', note: 'Action only' },
  { name: 'Saving', cls: 'bg-saving', note: 'Money saved' },
  { name: 'Success', cls: 'bg-success', note: 'In stock, done' },
  { name: 'Warning', cls: 'bg-warning', note: 'Caveats' },
  { name: 'Destructive', cls: 'bg-destructive', note: 'Errors only' },
];

export default function StyleGuidePage() {
  return (
    <div className="page-container py-10 space-y-12">
      <Seo title="Style guide" noindex />
      <header>
        <p className="microcopy-label">Internal</p>
        <h1 className="page-title mt-1">SokoPulse style guide</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          The rules live in DESIGN_RULES.md. This page renders them with the real components. Switch the
          theme in the footer to check dark mode.
        </p>
      </header>

      <Section title="Colour">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SWATCHES.map((s) => (
            <div key={s.name}>
              <div className={`h-14 rounded-md ${s.cls}`} />
              <p className="mt-2 text-sm font-medium text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="space-y-3">
          <p className="font-display text-[44px] font-bold leading-[1.08] tracking-tight text-ink">Hero, 44px</p>
          <p className="page-title">Page title, 28px</p>
          <p className="section-title">Section title, 20px</p>
          <p className="text-base text-foreground">Body, 16px Hanken Grotesk</p>
          <p className="microcopy-label">Eyebrow and column label</p>
          <p className="price-num text-2xl font-bold text-foreground">KES 52,000</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Go to shop <ExternalLink className="h-4 w-4" aria-hidden="true" /></Button>
          <Button variant="outline"><Target className="h-4 w-4" aria-hidden="true" /> Save target price</Button>
          <Button variant="ghost">Clear filters</Button>
          <Button variant="link">How we make money</Button>
          <button type="button" className="h-9 rounded-full border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground">
            Selected chip
          </button>
          <button type="button" className="h-9 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground">
            Chip
          </button>
        </div>
      </Section>

      <Section title="Price difference and price">
        <div className="flex flex-wrap items-center gap-4">
          <SavingBadge saving={{ pct: 18, kes: 9400 }} />
          <span className="price-num text-lg font-bold text-foreground">KES 52,000</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">Lowest</span>
        </div>
      </Section>

      <Section title="Offer row">
        <div className="rounded-md border border-border">
          <div className="flex items-center gap-4 px-4 py-3">
            <StoreMark store="jumia.co.ke" url="https://jumia.co.ke" size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Jumia</p>
              <p className="truncate text-xs text-muted-foreground">Exact listing title as the shop wrote it</p>
            </div>
            <span className="price-num text-base font-bold text-foreground">KES 52,000</span>
            <Button size="sm" className="h-9 px-4 text-xs">Go to shop</Button>
          </div>
        </div>
      </Section>

      <Section title="Sponsored">
        <div className="space-y-3">
          <SponsoredLabel />
          <AdSlot placement="product-sponsored-shop" />
        </div>
      </Section>

      <Section title="Elevation">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">Resting: border only</div>
          <div className="rounded-md bg-popover p-6 text-sm text-muted-foreground shadow-raised">Raised: menus, sticky bars</div>
          <div className="rounded-md bg-popover p-6 text-sm text-muted-foreground shadow-overlay">Overlay: dialogs, sheets</div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="section-title mb-4">{title}</h2>
      {children}
    </section>
  );
}

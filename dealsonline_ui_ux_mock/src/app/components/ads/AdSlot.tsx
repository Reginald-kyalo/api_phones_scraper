import { Link } from 'react-router';
import { Info } from 'lucide-react';
import { AD_MODE, LISTING_TILE_POSITIONS, PLACEMENTS, type Placement } from '../../lib/ads';

/** The label every paid element carries, with the honest explanation one click away. */
export function SponsoredLabel() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="microcopy-label">Sponsored</span>
      <Link
        to="/how-we-make-money"
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
        aria-label="Why is this sponsored?"
        title="Why is this here?"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </span>
  );
}

/**
 * A reserved ad placement. Until something is sold it renders nothing in
 * production and a dashed, labelled box in preview (see lib/ads.ts), always at
 * the placement's fixed height so filling it later moves nothing.
 *
 * `children` is the sold creative: a native card built from site components.
 */
export function AdSlot({
  placement,
  children,
  className = '',
}: {
  placement: Placement;
  children?: React.ReactNode;
  className?: string;
}) {
  const spec = PLACEMENTS[placement];
  const visibility = spec.desktopOnly ? 'hidden lg:block' : '';

  if (children) {
    return (
      <aside
        aria-label="Sponsored"
        className={`${visibility} rounded-md border border-border bg-canvas-light p-4 ${className}`}
        style={spec.height ? { minHeight: spec.height } : undefined}
      >
        <SponsoredLabel />
        <div className="mt-2">{children}</div>
      </aside>
    );
  }

  if (AD_MODE !== 'preview') return null;

  return (
    <div
      aria-hidden="true"
      data-ad-slot={placement}
      className={`${visibility} flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-canvas-light px-4 text-center ${className}`}
      style={spec.height ? { height: spec.height } : undefined}
    >
      <span className="microcopy-label">Sponsored slot</span>
      <span className="text-xs text-muted-foreground">{spec.label}</span>
    </div>
  );
}

/** A sponsored tile for product grids: same footprint as a ClusterCard. */
export function SponsoredTile() {
  if (AD_MODE !== 'preview') return null;
  return (
    <AdSlot
      placement="listing-tile"
      className="aspect-[3/5] h-full min-h-[280px] sm:aspect-auto"
    />
  );
}

/**
 * Interleave sponsored tiles into a grid of organic cards at the fixed
 * positions in LISTING_TILE_POSITIONS (one per viewport at most). Organic
 * order is untouched; with no tile to show the list comes back as-is.
 */
export function withSponsoredTiles(cards: React.ReactNode[]): React.ReactNode[] {
  if (AD_MODE !== 'preview') return cards;
  const out = [...cards];
  for (const pos of [...LISTING_TILE_POSITIONS].reverse()) {
    if (pos < out.length) out.splice(pos, 0, <SponsoredTile key={`sponsored-${pos}`} />);
  }
  return out;
}

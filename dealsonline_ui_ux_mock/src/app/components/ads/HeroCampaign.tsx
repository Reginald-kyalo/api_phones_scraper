import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useReducedMotion } from 'motion/react';
import { Button } from '../ui/button';
import { SponsoredLabel } from './AdSlot';
import { HERO_MAX_CAMPAIGNS, HERO_ROTATE_MS, type HeroCampaign as Campaign } from '../../lib/ads';

/**
 * The sold campaign card for the homepage hero. Same footprint as the hero's
 * comparison card so swapping one for the other moves nothing.
 *
 * Rotation pauses on hover and keyboard focus, and never runs for people who
 * ask for reduced motion; the dots always let a shopper choose by hand.
 */
export function HeroCampaign({ campaigns }: { campaigns: Campaign[] }) {
  const list = campaigns.slice(0, HERO_MAX_CAMPAIGNS);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (list.length < 2 || paused || reduce) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % list.length), HERO_ROTATE_MS);
    return () => window.clearInterval(t);
  }, [list.length, paused, reduce]);

  const c = list[index];
  if (!c) return null;

  return (
    <div
      className="flex h-[326px] flex-col rounded-md border border-border bg-card p-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={`Sponsored by ${c.shop}`}
    >
      <SponsoredLabel shop={c.shop} />
      <div className="mt-3 flex flex-1 flex-col">
        {c.image && (
          <div className="mb-3 flex h-28 items-center justify-center rounded-md bg-surface-alt">
            <img src={c.image} alt="" className="max-h-full object-contain p-2" />
          </div>
        )}
        <p className="mt-1 text-base font-semibold leading-snug text-foreground">{c.headline}</p>
        {c.detail && <p className="mt-1 text-sm text-muted-foreground">{c.detail}</p>}
        <Button asChild variant="outline" className="mt-auto">
          <Link to={c.href}>{c.cta}</Link>
        </Button>
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" role="group" aria-label="Choose campaign">
          {list.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.shop}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 w-6 rounded-full transition-colors ${i === index ? 'bg-foreground' : 'bg-border'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

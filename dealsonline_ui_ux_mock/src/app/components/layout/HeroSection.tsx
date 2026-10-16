import { Link } from 'react-router';
import SearchBar from '../../features/search/components/SearchBar';
import { HERO_CAMPAIGNS } from '../../lib/ads';
import { HeroCampaign } from '../ads/HeroCampaign';

interface HeroSectionProps {
  productCount?: number;
  /** Shops in the dataset (manifest.total_stores). */
  shopCount?: number;
  /** Products cheaper at one shop than another (manifest.deals.count). */
  dealCount?: number;
}

/**
 * Homepage top: a search band, not a pitch.
 *
 * Space has to do something (reg's critique, 16 Oct; the PriceRunner, idealo
 * and DealMtaani pattern). The old hero restated what the site is and showed
 * an illustrated price list the product pages already show for real. What is
 * left: one line saying what you can do, the search, and the numbers as links.
 *
 * The right-hand campaign card appears only when one is sold (HERO_CAMPAIGNS);
 * otherwise the band is search alone.
 */
export default function HeroSection({ productCount, shopCount, dealCount }: HeroSectionProps) {
  const sold = HERO_CAMPAIGNS.length > 0;
  return (
    <div className="page-container pt-6">
      <section className="rounded-lg border border-border bg-canvas-light">
        <div className={`grid items-center gap-8 px-6 py-7 sm:px-10 md:py-9 ${sold ? 'lg:grid-cols-[3fr_2fr]' : ''}`}>
          <div className={sold ? '' : 'mx-auto w-full max-w-2xl text-center'}>
            <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink md:text-[34px]">
              Compare prices across {shopCount ? `${shopCount} ` : ''}Kenyan shops
            </h1>
            <div id="hero-search" className="mt-5">
              <SearchBar variant="hero" placeholder="Search any product…" className={sold ? 'max-w-xl' : 'mx-auto max-w-xl'} />
            </div>
            <p className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground ${sold ? '' : 'justify-center'}`}>
              {productCount != null && (
                <Link to="/browse" className="hover:text-foreground">
                  <span className="font-semibold text-foreground">{productCount.toLocaleString('en-GB')}</span> products
                </Link>
              )}
              {dealCount != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <Link to="/deals" className="hover:text-foreground">
                    <span className="font-semibold text-foreground">{dealCount.toLocaleString('en-GB')}</span> cheaper at one shop
                  </Link>
                </>
              )}
            </p>
          </div>
          {sold && (
            <div className="mx-auto w-full max-w-sm lg:ml-auto lg:mr-0">
              <HeroCampaign campaigns={HERO_CAMPAIGNS} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

import { Link } from 'react-router';
import { ArrowUp } from 'lucide-react';
import Logo from './Logo';
import { BRAND } from '../../lib/brand';
import { ThemeSwitch } from './ThemeSwitch';

/**
 * The footer: brand line, link columns, theme and back to top.
 *
 * What is not here, and why (design audit 2026-10-21):
 *  - No newsletter form. The old one showed "You're on the list" after
 *    changing a React state: nothing was stored and no email could follow.
 *    It returns when a subscription service exists (copy deck §14).
 *  - No social icons. They linked to facebook.com, x.com and instagram.com
 *    themselves, not to any SokoPulse profile.
 *  - The money paragraph is one link away, not repeated here: the full
 *    statement lives on How we make money, where it can be read in context.
 * Removing the form also removes the only element that widened the page at
 * 320px (deep review §4).
 */
export default function Footer() {
  return (
    <footer className="bg-canvas-ink text-white/70 mt-auto">
      <div className="page-container">
        {/* ── Top: brand statement ── */}
        <div className="flex flex-col gap-4 py-10 border-b border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Logo variant="light" size={28} />
            <p className="section-title !text-white mt-4">Compare prices across Kenyan shops.</p>
          </div>
          <Link to="/how-we-make-money" className="text-sm text-white/80 underline underline-offset-4 decoration-white/40 hover:decoration-white hover:text-white">
            How we make money
          </Link>
        </div>

        {/* ── Middle: link columns ── */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          <FooterCol title="Explore">
            <FooterLink to="/browse">Categories</FooterLink>
            <FooterLink to="/deals">Deals</FooterLink>
            <FooterLink to="/favorites">Favourites</FooterLink>
            <FooterLink to="/alerts">Price targets</FooterLink>
          </FooterCol>

          <FooterCol title="About">
            <FooterLink to="/about">About SokoPulse</FooterLink>
            <FooterLink to="/about#how-we-compare">How we compare prices</FooterLink>
            <FooterLink to="/how-we-make-money">How we make money</FooterLink>
            <FooterLink to="/faq">Help</FooterLink>
            <FooterLink to="/contact">Contact</FooterLink>
          </FooterCol>

          {/* The B2B door (benchmark §2.13): PriceRunner and PriceSpy sell to
              shops and brands from exactly this column. */}
          <FooterCol title="For businesses">
            <FooterLink to="/for-business#list-your-shop">List your shop</FooterLink>
            <FooterLink to="/for-business#advertise">Advertising</FooterLink>
            <FooterLink to="/for-business#price-data">Price data enquiries</FooterLink>
          </FooterCol>

          <FooterCol title="Policies">
            <FooterLink to="/privacy">Privacy policy</FooterLink>
            <FooterLink to="/terms">Terms of service</FooterLink>
            <FooterLink to="/cookie-policy">Cookies and browser storage</FooterLink>
          </FooterCol>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-white/60">
          <p>&copy; {new Date().getFullYear()} {BRAND.name}</p>
          {/* Honeypot (functions/data/[[path]].ts): invisible, unreachable by
              keyboard and screen readers, nofollow and disallowed in
              robots.txt. Only a scraper walking every href ever requests it. */}
          <a href="/data/catalogue-export" rel="nofollow" tabIndex={-1} aria-hidden="true" className="sr-only">
            Catalogue export
          </a>
          <ThemeSwitch onDark />
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
          >
            Back to top <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="microcopy-label !text-white mb-3">{title}</h3>
      <ul className="space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="hover:text-white transition-colors">
        {children}
      </Link>
    </li>
  );
}

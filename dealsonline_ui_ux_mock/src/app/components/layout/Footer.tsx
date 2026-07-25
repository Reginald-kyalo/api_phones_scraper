import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUp, ShieldCheck, Send } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <footer className="bg-canvas-ink text-white/70 mt-auto">
      {/* Teal accent line */}
      <div className="h-1 bg-teal" />

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        {/* ── Top: brand statement + newsletter ── */}
        <div className="grid lg:grid-cols-2 gap-10 py-12 border-b border-white/10">
          <div>
            <h2 className="text-white text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Compare. <span className="text-badge-discount">Save.</span> Repeat.
            </h2>
            <p className="text-white/60 text-sm mt-3 max-w-md leading-relaxed">
              DealsOnline is Kenya’s independent price comparison platform. We don’t sell
              products — we help you find the best price across every retailer, for free.
            </p>
          </div>

          <div className="lg:pl-8">
            <p className="microcopy-label !text-white/50 mb-2">Get the best deals in your inbox</p>
            {subscribed ? (
              <div className="flex items-center gap-2 h-12 text-sm text-white">
                <ShieldCheck className="w-5 h-5 text-success" />
                Thanks — you’re on the list. Watch for our next price drops.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center gap-2 max-w-md">
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  aria-label="Email address for deal alerts"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 h-12 px-4 rounded-lg bg-white/10 text-white placeholder:text-white/40 text-sm outline-none ring-1 ring-white/15 focus:ring-white/40 transition"
                />
                <button
                  type="submit"
                  className="h-12 px-5 rounded-lg bg-badge-discount text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition"
                >
                  <Send className="w-4 h-4" /> Subscribe
                </button>
              </form>
            )}
            <p className="text-[11px] text-white/40 mt-2">
              No spam. Unsubscribe anytime. We respect your privacy.
            </p>
          </div>
        </div>

        {/* ── Middle: brand + link columns ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-12">
          <div className="col-span-2 md:col-span-2">
            <Logo variant="light" size={28} />
            <p className="text-xs leading-relaxed mt-3 max-w-xs">
              Compare prices on phones, laptops, TVs, beauty and more from across Kenya’s top
              retailers.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Social href="https://facebook.com" label="Facebook">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </Social>
              <Social href="https://x.com" label="X (Twitter)">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </Social>
              <Social href="https://instagram.com" label="Instagram">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </Social>
            </div>
          </div>

          <FooterCol title="Discover">
            <FooterLink to="/browse">All categories</FooterLink>
            <FooterLink to="/deals">Today’s deals</FooterLink>
            <FooterLink to="/favorites">My favourites</FooterLink>
            <FooterLink to="/alerts">Price alerts</FooterLink>
          </FooterCol>

          <FooterCol title="Categories">
            <FooterLink to="/browse/phones_wearables">Phones &amp; Wearables</FooterLink>
            <FooterLink to="/browse/computing">Computing</FooterLink>
            <FooterLink to="/browse/sound_vision">Sound &amp; Vision</FooterLink>
            <FooterLink to="/browse/health_beauty">Health &amp; Beauty</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink to="/contact">About us</FooterLink>
            <FooterLink to="/privacy">Privacy policy</FooterLink>
            <FooterLink to="/terms">Terms of service</FooterLink>
            <FooterLink to="/cookie-policy">Cookie policy</FooterLink>
          </FooterCol>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-white/40">
          <p>&copy; {new Date().getFullYear()} DealsOnline. All rights reserved.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
          >
            Back to top <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">{title}</h3>
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

function Social({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
    >
      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </a>
  );
}

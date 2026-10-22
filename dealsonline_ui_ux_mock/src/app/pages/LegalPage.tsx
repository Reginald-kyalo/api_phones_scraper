import { useEffect } from 'react';
import { useLocation, Link } from 'react-router';
import { Seo } from '../components/common/Seo';
import { BRAND, MONEY_LINE } from '../lib/brand';
import { FAQ } from '../lib/faq';
import { Breadcrumbs } from '../components/common/Breadcrumbs';

/**
 * The date the policy text below was last changed. Edit it when the text
 * changes, and only then: the old pages printed the current month on every
 * view, which is not a revision date (design audit §20).
 */
export const POLICY_REVISED = '22 October 2026';

const link = 'text-link underline underline-offset-4 decoration-link/40 hover:decoration-link';
const h2 = 'text-base font-semibold text-foreground';

/**
 * Company and policy pages. Every sentence describes what the site does
 * today: browser storage, listed shops, an enquiry address. Where a fact is
 * not established (hosting logs, third-party processing, retention periods,
 * the responsible entity) the page says it is to be confirmed rather than
 * filling the gap with boilerplate. The support address is a placeholder
 * until the mailbox exists (lib/brand.ts).
 */
const pages: Record<string, { title: string; description: string; content: React.ReactNode }> = {
  privacy: {
    title: 'Privacy policy',
    description: 'What information SokoPulse collects, why it is used and how to contact us about it.',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last revised {POLICY_REVISED}.</p>
        <p>This page explains what information SokoPulse collects, why it is used and how to contact us about it.</p>
        <h2 className={h2}>Who is responsible for your information</h2>
        <p>
          SokoPulse is operated by the SokoPulse team. The legal entity and its address will be published
          here before public launch.
        </p>
        <h2 className={h2}>Information we collect</h2>
        <p>
          Favourites, price targets, comparison selections and recently viewed products are saved in
          this browser. Your theme preference is also remembered here. None of this is sent to us.
        </p>
        <p>
          When you report a problem with a listing, we receive the report: the product, what you said
          is wrong, any note you add and the page you were on.
        </p>
        <p>
          Our hosting provider records standard server logs when pages are requested. The provider,
          what the logs contain and how long they are kept will be listed here once confirmed.
        </p>
        <h2 className={h2}>How we use it</h2>
        <p>
          Reports are used to correct prices, matches and categories. Server logs are used to keep the
          site running and to detect abuse.
        </p>
        <h2 className={h2}>Who receives it</h2>
        <p>
          We do not sell your information. Shops you visit through SokoPulse receive only the visit
          itself, as they would from any link.
        </p>
        <h2 className={h2}>How long we keep it</h2>
        <p>Items saved in your browser stay until you remove them or clear this site’s data. Retention periods for reports and logs will be stated here once confirmed.</p>
        <h2 className={h2}>Your choices</h2>
        <p>
          Clearing this website’s data in your browser removes locally saved items and preferences. See{' '}
          <Link to="/cookie-policy" className={link}>Cookies and browser storage</Link>.
        </p>
        <h2 className={h2}>Contact</h2>
        <p>Email {BRAND.supportEmail} with privacy questions.</p>
      </div>
    ),
  },
  terms: {
    title: 'Terms of service',
    description: 'The terms for using SokoPulse.',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last revised {POLICY_REVISED}.</p>
        <h2 className={h2}>Using SokoPulse</h2>
        <p>
          SokoPulse helps you compare listed prices from shops. Purchases take place on the shop’s website
          and are subject to that shop’s terms.
        </p>
        <h2 className={h2}>Prices and product information</h2>
        <p>
          Prices and availability may change after our last check. Listings are matched automatically
          and may differ in version, size or condition. Confirm the product details and final total with
          the shop before buying.
        </p>
        <h2 className={h2}>Buying from shops</h2>
        <p>
          The shop you buy from is responsible for the sale, payment, delivery, returns and warranty.
          SokoPulse is not a party to that transaction.
        </p>
        <h2 className={h2}>Saved items</h2>
        <p>
          Favourites, price targets and comparisons are saved in your browser and need no account. We
          cannot restore them if you clear your browser’s data.
        </p>
        <h2 className={h2}>Acceptable use</h2>
        <p>
          Do not copy the catalogue in bulk, automate requests against the site or interfere with its
          operation.
        </p>
        <h2 className={h2}>Contact</h2>
        <p>Email {BRAND.supportEmail} with questions about these terms.</p>
      </div>
    ),
  },
  'cookie-policy': {
    title: 'Cookies and browser storage',
    description: 'How SokoPulse uses browser storage and how to manage saved preferences.',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last revised {POLICY_REVISED}.</p>
        <p>SokoPulse uses browser storage to remember your preferences and saved products.</p>
        <h2 className={h2}>What is stored in this browser</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Favourites</strong>, <strong>price targets</strong>, <strong>comparison selections</strong> and <strong>recently viewed products</strong>: kept in local storage until you remove them.</li>
          <li><strong>Theme</strong>: your System, Light or Dark choice.</li>
        </ul>
        <p>
          These are stored by the browser on your device and are not sent to us. We do not set
          advertising or analytics cookies. Any cookies set by our hosting provider will be listed here
          once confirmed.
        </p>
        <h2 className={h2}>Managing storage</h2>
        <p>Clearing this website’s data in your browser removes locally saved items and preferences.</p>
      </div>
    ),
  },
  contact: {
    title: 'Contact',
    description: 'How to contact SokoPulse.',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Questions or feedback? Contact SokoPulse.</p>
        <h2 className={h2}>A wrong price or match</h2>
        <p>For a listing issue, use Report a problem on the product page.</p>
        <h2 className={h2}>Other enquiries</h2>
        <p>Email {BRAND.supportEmail}.</p>
        <h2 className={h2}>Help with an order</h2>
        <p>For delivery, returns or payment questions, contact the shop you bought from.</p>
        <h2 className={h2}>Business enquiries</h2>
        <p>For shop listings, advertising or price data, include your business name and website.</p>
      </div>
    ),
  },
  about: {
    title: 'About SokoPulse',
    description: 'Learn what SokoPulse compares and how to use its price information.',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          SokoPulse brings together listed prices from Kenyan shops so you can compare your options
          before buying.
        </p>
        <h2 id="how-it-works" className={`scroll-mt-24 ${h2}`}>How it works</h2>
        <p>
          Search for a product, review the shop listings and visit the shop you choose. The shop handles
          your purchase, delivery and returns.
        </p>
        <h2 id="how-we-compare" className={`scroll-mt-24 ${h2}`}>About the prices</h2>
        <p>
          Listings are grouped using product details. Check the version, condition and last-check date,
          then confirm the final price with the shop.
        </p>
        <h2 className={h2}>Coverage</h2>
        <p>We compare the shops included in our catalogue. We do not cover every shop or every product.</p>
        <p>
          <Link to="/how-we-make-money" className={link}>How we make money</Link>
          {' · '}
          <Link to="/faq" className={link}>Help</Link>
          {' · '}
          <Link to="/contact" className={link}>Contact</Link>
        </p>
      </div>
    ),
  },
  faq: {
    title: 'Help',
    description: 'Answers about prices, shops, saved products and using SokoPulse.',
    content: (
      <div className="space-y-6">
        {FAQ.map(({ q, a }) => (
          <section key={q}>
            <h2 className={h2}>{q}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </section>
        ))}
        <p className="text-sm text-muted-foreground">
          Something else?{' '}
          <Link to="/contact" className={link}>Contact us</Link>.
        </p>
      </div>
    ),
  },
  'for-business': {
    title: 'For shops and brands',
    description: 'Contact SokoPulse about shop listings, advertising and price data enquiries.',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-foreground">Help shoppers compare your products on SokoPulse.</p>
        <h2 id="list-your-shop" className={`scroll-mt-24 ${h2}`}>List your shop</h2>
        <p>Send us your shop name and website to ask about inclusion.</p>
        <h2 id="advertise" className={`scroll-mt-24 ${h2}`}>Advertising</h2>
        <p>
          Contact us about sponsored placements. Sponsored spots are labelled Sponsored and sit outside
          the price list; they never change its order.
        </p>
        <h2 id="price-data" className={`scroll-mt-24 ${h2}`}>Price data enquiries</h2>
        <p>Tell us which products, shops and dates you need.</p>
        <h2 className={h2}>Contact us</h2>
        <p>
          Email <a href={`mailto:${BRAND.supportEmail}`} className={link}>{BRAND.supportEmail}</a> with
          your business name and website.
        </p>
      </div>
    ),
  },
  'how-we-make-money': {
    title: 'How we make money',
    description: MONEY_LINE,
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-foreground">{MONEY_LINE}</p>
        <h2 className={h2}>Visits to shops</h2>
        <p>
          When you press “Go to shop”, a shop may pay us for the visit. The price you see on the shop’s
          page is set by the shop, not by that payment.
        </p>
        <h2 className={h2}>Sponsored spots</h2>
        <p>
          A shop may pay to appear in a box marked “Sponsored”, for example above a product’s price
          list. A sponsored shop must sell the product it appears beside, and the box always sits
          outside the price list, so the list still shows whether it is the cheapest.
        </p>
        <h2 className={h2}>What does not change</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>The price list is sorted by price, lowest first.</li>
          <li>No payment moves a shop up the price list.</li>
          <li>We don’t sell products ourselves; you buy from the shop you choose.</li>
        </ul>
      </div>
    ),
  },
};

export default function LegalPage() {
  const location = useLocation();
  const slug = location.pathname.slice(1);
  const page = pages[slug];

  // Footer links point at sections (/for-business#advertise); the router does
  // not scroll to a hash by itself, and Root scrolls to the top on navigation.
  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, [location.pathname, location.hash]);

  if (!page) {
    return (
      <div className="prose-container py-16 text-center">
        <h1 className="page-title mb-4">Page not found</h1>
        <Link to="/" className={link}>Home</Link>
      </div>
    );
  }

  return (
    <div className="prose-container py-8">
      <Seo title={page.title} description={page.description} />
      <Breadcrumbs items={[{ label: page.title }]} className="mb-6" />
      <h1 className="page-title mb-6">{page.title}</h1>
      {page.content}
    </div>
  );
}

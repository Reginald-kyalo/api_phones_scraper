import { useEffect } from 'react';
import { useLocation, Link } from 'react-router';
import { Seo } from '../components/common/Seo';
import { BRAND, MONEY_LINE } from '../lib/brand';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';

const pages: Record<string, { title: string; content: React.ReactNode }> = {
  privacy: {
    title: 'Privacy policy',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <h2 className="text-base font-semibold text-foreground">1. Information we collect</h2>
        <p>
          SokoPulse collects minimal personal information to provide our price comparison service.
          This includes account information (email, name) when you register, browsing preferences,
          and price alert configurations.
        </p>
        <h2 className="text-base font-semibold text-foreground">2. How we use your information</h2>
        <p>
          We use your information to provide price comparison results, send price alert notifications,
          maintain your favourites, and improve our service. We do not sell your personal data
          to third parties.
        </p>
        <h2 className="text-base font-semibold text-foreground">3. Data storage</h2>
        <p>
          Your data is stored securely and retained only as long as necessary to provide our services.
          You can request deletion of your account and associated data at any time.
        </p>
        <h2 className="text-base font-semibold text-foreground">4. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. See our cookie policy for details.
        </p>
        <h2 className="text-base font-semibold text-foreground">5. Contact</h2>
        <p>
          For privacy-related inquiries, please contact us through our contact page.
        </p>
      </div>
    ),
  },
  terms: {
    title: 'Terms of service',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <h2 className="text-base font-semibold text-foreground">1. Service description</h2>
        <p>
          SokoPulse is a price comparison platform that aggregates product prices from multiple
          Kenyan retailers. We do not sell products directly — we redirect you to the retailer's website.
        </p>
        <h2 className="text-base font-semibold text-foreground">2. Price accuracy</h2>
        <p>
          While we strive to display accurate and up-to-date pricing, prices may change between
          our last update and your visit to the retailer. The final price is always determined by
          the retailer.
        </p>
        <h2 className="text-base font-semibold text-foreground">3. User accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials.
          Features like favourites and price alerts require a registered account.
        </p>
        <h2 className="text-base font-semibold text-foreground">4. Acceptable use</h2>
        <p>
          You agree not to scrape, automate, or interfere with the normal operation of our service.
          We reserve the right to suspend accounts that violate these terms.
        </p>
        <h2 className="text-base font-semibold text-foreground">5. Limitation of liability</h2>
        <p>
          SokoPulse is not responsible for transactions between you and retailers. We provide
          information only and make no guarantees about product availability or retailer service.
        </p>
      </div>
    ),
  },
  'cookie-policy': {
    title: 'Cookie policy',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <h2 className="text-base font-semibold text-foreground">What are cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit a website. They help
          us remember your preferences and provide a better experience.
        </p>
        <h2 className="text-base font-semibold text-foreground">Cookies we use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Essential cookies:</strong> Required for authentication and session management.</li>
          <li><strong>Preference cookies:</strong> Remember your settings like recently viewed products.</li>
        </ul>
        <h2 className="text-base font-semibold text-foreground">Managing cookies</h2>
        <p>
          You can control cookies through your browser settings. Disabling essential cookies may
          affect the functionality of the site, particularly login and account features.
        </p>
      </div>
    ),
  },
  contact: {
    title: 'Contact us',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          Questions, feedback or a wrong price? Tell us.
        </p>
        <h2 className="text-base font-semibold text-foreground">Get in touch</h2>
        <ul className="list-none space-y-2 pl-0">
          <li><strong>Email:</strong> {BRAND.supportEmail}</li>
        </ul>
        <h2 className="text-base font-semibold text-foreground">Report a wrong price</h2>
        <p>
          Every product page has a “Report a wrong price or match” link. You can also email us with the
          product name and the shop in question.
        </p>
        <h2 className="text-base font-semibold text-foreground">Shops and advertisers</h2>
        <p>
          Shops that want to be listed, or to buy a clearly labelled sponsored spot, can email us.
          Sponsored spots never change the order of the price list.
        </p>
      </div>
    ),
  },
  about: {
    title: 'About SokoPulse',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          SokoPulse compares prices across Kenyan shops, online and off, so you can see what the
          same product costs at each one before you buy.
        </p>
        <h2 className="text-base font-semibold text-foreground">How we compare</h2>
        <p>
          We read each shop's listings, match the same product across shops, and sort every price
          list by price. Each product page shows the exact listing title from each shop and when we
          last checked it, so you can confirm the match yourself.
        </p>
        <h2 className="text-base font-semibold text-foreground">How we make money</h2>
        <p>{MONEY_LINE}</p>
        <p>
          <Link to="/how-we-make-money" className="text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
            More on how we make money
          </Link>
        </p>
      </div>
    ),
  },
  'for-business': {
    title: 'For shops and brands',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-foreground">
          Shoppers use SokoPulse to compare the same product across Kenyan shops. Here is how
          shops and brands can work with us.
        </p>
        <h2 id="list-your-shop" className="scroll-mt-24 text-base font-semibold text-foreground">List your shop</h2>
        <p>
          Listing is free. Send us your shop's website and we will add your prices to every
          product you sell, in the same price-sorted list as everyone else.
        </p>
        <h2 id="advertise" className="scroll-mt-24 text-base font-semibold text-foreground">Advertise</h2>
        <p>
          Sponsored spots sit in clearly labelled boxes beside products you actually sell, never
          inside the price list. {MONEY_LINE}
        </p>
        <h2 id="price-data" className="scroll-mt-24 text-base font-semibold text-foreground">Price data and API</h2>
        <p>
          Daily prices across Kenyan shops, matched product by product, with price history: as a
          dashboard, a regular file or an API. Useful for brands watching their prices and for
          retailers watching the market.
        </p>
        <h2 className="text-base font-semibold text-foreground">Talk to us</h2>
        <p>
          Email <a href={`mailto:${BRAND.supportEmail}`} className="text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">{BRAND.supportEmail}</a> and
          say which of these you are interested in.
        </p>
      </div>
    ),
  },
  'how-we-make-money': {
    title: 'How we make money',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-foreground">{MONEY_LINE}</p>
        <h2 className="text-base font-semibold text-foreground">Click-through fees</h2>
        <p>
          When you press “Go to shop”, the shop may pay us a small fee for sending you. You pay the
          same price either way.
        </p>
        <h2 className="text-base font-semibold text-foreground">Sponsored spots</h2>
        <p>
          Some shops pay to appear in a box marked “Sponsored”, for example above a product's price
          list. A sponsored shop must actually sell the product it appears beside, and the box always
          sits outside the price list. If the sponsored shop is not the cheapest, the list below it
          will show you that.
        </p>
        <h2 className="text-base font-semibold text-foreground">What never changes</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>The price list is sorted by price, cheapest first.</li>
          <li>No shop can pay to move up the price list.</li>
          <li>We never sell products ourselves.</li>
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
        <h1 className="text-lg font-semibold text-foreground">Page not found</h1>
      </div>
    );
  }

  return (
    <div className="prose-container py-8">
      <Seo title={page.title} />
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="text-xs">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs">{page.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="page-title mb-6">{page.title}</h1>
      {page.content}
    </div>
  );
}

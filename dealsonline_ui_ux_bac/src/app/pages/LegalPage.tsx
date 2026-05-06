import { useLocation, Link } from 'react-router';
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
    title: 'Privacy Policy',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
        <p>
          DealsOnline collects minimal personal information to provide our price comparison service.
          This includes account information (email, name) when you register, browsing preferences,
          and price alert configurations.
        </p>
        <h2 className="text-base font-semibold text-foreground">2. How We Use Your Information</h2>
        <p>
          We use your information to provide price comparison results, send price alert notifications,
          maintain your favorites list, and improve our service. We do not sell your personal data
          to third parties.
        </p>
        <h2 className="text-base font-semibold text-foreground">3. Data Storage</h2>
        <p>
          Your data is stored securely and retained only as long as necessary to provide our services.
          You can request deletion of your account and associated data at any time.
        </p>
        <h2 className="text-base font-semibold text-foreground">4. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. See our Cookie Policy for details.
        </p>
        <h2 className="text-base font-semibold text-foreground">5. Contact</h2>
        <p>
          For privacy-related inquiries, please contact us through our Contact page.
        </p>
      </div>
    ),
  },
  terms: {
    title: 'Terms of Service',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <h2 className="text-base font-semibold text-foreground">1. Service Description</h2>
        <p>
          DealsOnline is a price comparison platform that aggregates product prices from multiple
          Kenyan retailers. We do not sell products directly — we redirect you to the retailer's website.
        </p>
        <h2 className="text-base font-semibold text-foreground">2. Price Accuracy</h2>
        <p>
          While we strive to display accurate and up-to-date pricing, prices may change between
          our last update and your visit to the retailer. The final price is always determined by
          the retailer.
        </p>
        <h2 className="text-base font-semibold text-foreground">3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials.
          Features like favorites and price alerts require a registered account.
        </p>
        <h2 className="text-base font-semibold text-foreground">4. Acceptable Use</h2>
        <p>
          You agree not to scrape, automate, or interfere with the normal operation of our service.
          We reserve the right to suspend accounts that violate these terms.
        </p>
        <h2 className="text-base font-semibold text-foreground">5. Limitation of Liability</h2>
        <p>
          DealsOnline is not responsible for transactions between you and retailers. We provide
          information only and make no guarantees about product availability or retailer service.
        </p>
      </div>
    ),
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <h2 className="text-base font-semibold text-foreground">What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit a website. They help
          us remember your preferences and provide a better experience.
        </p>
        <h2 className="text-base font-semibold text-foreground">Cookies We Use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Essential cookies:</strong> Required for authentication and session management.</li>
          <li><strong>Preference cookies:</strong> Remember your settings like recently viewed products.</li>
        </ul>
        <h2 className="text-base font-semibold text-foreground">Managing Cookies</h2>
        <p>
          You can control cookies through your browser settings. Disabling essential cookies may
          affect the functionality of the site, particularly login and account features.
        </p>
      </div>
    ),
  },
  contact: {
    title: 'Contact Us',
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          Have questions, feedback, or found a pricing error? We'd love to hear from you.
        </p>
        <h2 className="text-base font-semibold text-foreground">Get in Touch</h2>
        <ul className="list-none space-y-2 pl-0">
          <li><strong>Email:</strong> support@dealsonline.ninja</li>
          <li><strong>Website:</strong> dealsonline.ninja</li>
        </ul>
        <h2 className="text-base font-semibold text-foreground">Report an Issue</h2>
        <p>
          If you notice incorrect pricing, broken product links, or other issues, please email us
          with the product name and the retailer in question. We'll investigate and update our data.
        </p>
        <h2 className="text-base font-semibold text-foreground">Business Inquiries</h2>
        <p>
          Retailers interested in being listed on DealsOnline can reach out via email.
          We're always looking to expand our coverage of Kenyan retailers.
        </p>
      </div>
    ),
  },
};

export default function LegalPage() {
  const location = useLocation();
  const slug = location.pathname.slice(1);
  const page = pages[slug];

  if (!page) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Page not found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
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

      <h1 className="text-2xl font-bold text-foreground mb-6">{page.title}</h1>
      {page.content}
    </div>
  );
}

import { Search, ListOrdered, Bell } from 'lucide-react';
import { Link } from 'react-router';
import { MONEY_LINE } from '../../lib/brand';

const STEPS = [
  {
    icon: Search,
    title: 'Search any product',
    body: 'Phones, laptops, TVs, groceries and more, from shops across Kenya in one place.',
  },
  {
    icon: ListOrdered,
    title: 'See every shop’s price',
    body: 'One list per product, sorted by price, with the exact listing and when we last checked it.',
  },
  {
    icon: Bell,
    title: 'Buy, or wait for a drop',
    body: 'Go straight to the cheapest shop, or set a free price alert and we’ll tell you when it falls.',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-surface-alt rounded-lg px-6 py-10 md:px-12 md:py-12 mb-12">
      <div className="text-center mb-8">
        <h2 className="section-title">How SokoPulse works</h2>
      </div>
      <ol className="grid md:grid-cols-3 gap-6 md:gap-8 list-none p-0">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-card ultra-border flex items-center justify-center mb-4">
              <step.icon aria-hidden="true" className="w-5 h-5 text-foreground" strokeWidth={1.75} />
            </div>
            <p className="microcopy-label mb-1">Step {i + 1}</p>
            <h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto mt-8 leading-relaxed">
        <span className="font-semibold text-foreground">How SokoPulse makes money.</span> {MONEY_LINE}{' '}
        <Link to="/how-we-make-money" className="text-link hover:underline underline-offset-4">
          Read more
        </Link>
      </p>
    </section>
  );
}

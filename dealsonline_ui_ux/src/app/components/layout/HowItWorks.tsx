import { Search, GitCompareArrows, PiggyBank } from 'lucide-react';
import { Reveal, RevealGroup, RevealItem } from '../common/Reveal';

const STEPS = [
  {
    icon: Search,
    title: 'Search any product',
    body: 'Find phones, laptops, TVs and more from across Kenya’s top retailers in one place.',
  },
  {
    icon: GitCompareArrows,
    title: 'Compare every price',
    body: 'See live prices from every shop side by side, with stock and delivery — no bias, no ads.',
  },
  {
    icon: PiggyBank,
    title: 'Buy at the best price',
    body: 'Go straight to the cheapest shop, or set a free price alert and we’ll tell you when it drops.',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-surface-alt rounded-2xl px-6 py-10 md:px-12 md:py-12 mb-12">
      <Reveal className="text-center mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
          How DealsOnline works
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Independent price comparison — we never sell products
        </p>
      </Reveal>
      <RevealGroup className="grid md:grid-cols-3 gap-6 md:gap-8">
        {STEPS.map((step, i) => (
          <RevealItem key={step.title} className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon aria-hidden="true" className="w-5 h-5 text-primary" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{step.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

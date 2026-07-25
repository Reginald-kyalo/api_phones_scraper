import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PRProductCardGrid } from '../features/product/components/ProductCard';
import { StarRating } from '../features/product/components/ProductHero';
import { Package, Store, Bell, GitCompareArrows, Heart, Search, TrendingDown, Tag } from 'lucide-react';

const MOCK_PRODUCT = {
  id: 'style-guide-prod',
  name: 'Premium Style Guide Product',
  description: 'A sample product to demonstrate design tokens and component consistency.',
  image: null,
  price: 999.99,
  numStores: 12,
  categoryName: 'Design System',
  categoryUrl: '/design',
  productUrl: '/design',
  productType: 'design_system',
};

export default function StyleGuidePage() {
  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="max-w-[1200px] mx-auto px-4 py-12">
        <header className="mb-12 border-b pb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Design System & Style Guide</h1>
          <p className="text-muted-foreground text-lg italic font-serif">
            The "Ultra PriceRunner" visual language. Use this page to verify design evolution.
          </p>
        </header>

        <div className="space-y-16">
          {/* 1. Typography */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-sm">1</span>
              Typography
            </h2>
            <div className="grid gap-6 bg-surface-alt p-8 rounded-xl ultra-border">
              <div>
                <p className="microcopy-label mb-2">Heading 1</p>
                <h1>Ultra PriceRunner Typography H1</h1>
              </div>
              <div>
                <p className="microcopy-label mb-2">Heading 2</p>
                <h2>Subheading Level 2 Example</h2>
              </div>
              <div>
                <p className="microcopy-label mb-2">Heading 3</p>
                <h3>Heading Level 3 Example</h3>
              </div>
              <div>
                <p className="microcopy-label mb-2">Body Text</p>
                <p className="text-sm leading-relaxed max-w-2xl">
                  This is the standard body text. It uses the "Inter" font family with a size of 14px.
                  The line height is optimized for readability in data-dense comparison tables.
                  <span className="font-bold"> Bold text </span> and <span className="italic"> italic text </span> variations.
                </p>
              </div>
              <div>
                <p className="microcopy-label mb-2">Microcopy</p>
                <p className="microcopy-label text-primary">Department / Category Name / Brand</p>
              </div>
            </div>
          </section>

          {/* 2. Colors */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-sm">2</span>
              Color Palette
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: 'Primary', class: 'bg-primary', text: 'text-primary-foreground' },
                { name: 'Secondary', class: 'bg-secondary', text: 'text-secondary-foreground' },
                { name: 'Background', class: 'bg-background', text: 'text-foreground', border: 'border' },
                { name: 'Surface Alt', class: 'bg-surface-alt', text: 'text-foreground', border: 'border' },
                { name: 'Muted', class: 'bg-muted', text: 'text-muted-foreground' },
                { name: 'Accent', class: 'bg-accent', text: 'text-accent-foreground' },
                { name: 'Destructive', class: 'bg-destructive', text: 'text-destructive-foreground' },
                { name: 'Price', class: 'bg-price', text: 'text-white' },
                { name: 'Success', class: 'bg-success', text: 'text-white' },
                { name: 'Warning', class: 'bg-warning', text: 'text-white' },
              ].map((c) => (
                <div key={c.name} className="space-y-2">
                  <div className={`aspect-square rounded-lg ${c.class} ${c.border || ''} flex items-end p-3`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>Aa</span>
                  </div>
                  <p className="text-[11px] font-semibold text-center uppercase tracking-tighter">{c.name}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Interactive Elements */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-sm">3</span>
              Buttons & Inputs
            </h2>
            <div className="space-y-8 bg-white p-8 rounded-xl ultra-border shadow-sm">
              <div className="flex flex-wrap gap-4">
                <Button>Default Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link Style</Button>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <Button size="sm">Small Button</Button>
                <Button size="default">Default Button</Button>
                <Button size="lg">Large Button</Button>
                <Button size="icon"><Heart className="h-4 w-4" /></Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-6 max-w-xl">
                <div className="space-y-2">
                  <p className="microcopy-label">Standard Input</p>
                  <Input placeholder="Enter text..." />
                </div>
                <div className="space-y-2">
                  <p className="microcopy-label">Input with Icon (Search)</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-9" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Atomic Components */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-sm">4</span>
              Badges & Indicators
            </h2>
            <div className="flex flex-wrap gap-4 items-center bg-surface-alt p-8 rounded-xl ultra-border">
              <Badge>Default Badge</Badge>
              <Badge variant="secondary">Secondary Badge</Badge>
              <Badge variant="outline">Outline Badge</Badge>
              <Badge variant="destructive">Price Drop</Badge>
              <div className="flex items-center gap-1">
                <StarRating rating={4.5} />
                <span className="text-xs text-muted-foreground">(4.5)</span>
              </div>
            </div>
          </section>

          {/* 5. Feature Components */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-sm">5</span>
              Card Variants
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <PRProductCardGrid product={MOCK_PRODUCT} />
              
              {/* Manual Card Construction for Custom UI */}
              <Card className="ultra-border overflow-hidden">
                <CardHeader className="bg-surface-alt border-b p-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-emerald-600" />
                    Custom Widget
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Example of a custom card layout using the ultra-border utility class.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">Action</Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 6. Feedback & Toasts */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-sm">6</span>
              Semantic Feedback
            </h2>
            <div className="grid gap-4 max-w-2xl">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Package className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-800 font-medium">Operation completed successfully.</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <Bell className="w-5 h-5 text-destructive" />
                <p className="text-sm text-destructive font-medium">Critical warning or error message.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

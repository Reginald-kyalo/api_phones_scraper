import { Smartphone, Laptop, Headphones } from 'lucide-react';

interface HeroSectionProps {
  productCount?: number;
  storeCount?: number;
}

export default function HeroSection({ productCount, storeCount }: HeroSectionProps) {
  return (
    <section className="bg-gradient-to-br from-[#1B1340] via-[#231854] to-[#2D1B69] text-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="grid md:grid-cols-2 gap-8 items-center py-12 md:py-16">
          {/* Left: Text + Search */}
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-[44px] font-bold leading-tight mb-2">
              Search, compare,
              <br />
              save
            </h1>
            <p className="text-lg md:text-xl text-white/80 font-medium mb-4">
              Find your next deal today
            </p>
            <p className="text-white/60 text-sm md:text-base mb-6 max-w-lg">
              {productCount
                ? `${productCount.toLocaleString()}+ products`
                : 'Thousands of products'}{' '}
              {storeCount
                ? `from ${storeCount} shops`
                : 'from top Kenyan retailers'}
            </p>

          </div>

          {/* Right: Device composite */}
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-72 h-72 lg:w-80 lg:h-80">
              {/* Phone outline */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-72 lg:w-48 lg:h-80 rounded-[2rem] border-2 border-white/20 bg-white/5 backdrop-blur-sm shadow-2xl">
                {/* Screen content */}
                <div className="absolute inset-3 rounded-[1.5rem] bg-gradient-to-b from-white/10 to-white/5 flex flex-col items-center justify-center gap-3 p-4">
                  <div className="w-10 h-1 rounded-full bg-white/20 mb-2" />
                  <div className="w-full space-y-2">
                    <div className="h-14 rounded-lg bg-white/10 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white/40" />
                    </div>
                    <div className="h-14 rounded-lg bg-white/10 flex items-center justify-center">
                      <Laptop className="w-6 h-6 text-white/40" />
                    </div>
                    <div className="h-14 rounded-lg bg-white/10 flex items-center justify-center">
                      <Headphones className="w-6 h-6 text-white/40" />
                    </div>
                  </div>
                  <div className="text-[10px] text-white/30 mt-auto">DealsOnline</div>
                </div>
              </div>

              {/* Floating price badges */}
              <div className="absolute top-4 -left-2 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                -25%
              </div>
              <div className="absolute bottom-8 -right-4 bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                KES 12,999
              </div>
              <div className="absolute top-1/3 -right-6 bg-amber-400 text-gray-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                ★ 4.8
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

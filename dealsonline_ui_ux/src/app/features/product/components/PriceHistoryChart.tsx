import { useMemo, useState } from 'react';
import { type PRProductDetail } from '../../../lib/api';
import { type PricePoint } from '../../../data/mockServices';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface PRPriceHistoryChartProps {
  product: PRProductDetail;
  priceHistory: PricePoint[];
}

const chartConfig: ChartConfig = {
  price: {
    label: 'Price',
    color: 'hsl(221, 83%, 53%)',
  },
};

export function PRPriceHistoryChart({ product, priceHistory }: PRPriceHistoryChartProps) {
  const [historyPeriod, setHistoryPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('1y');

  const filteredHistory = useMemo(() => {
    const sliceMap = { '3m': 9, '6m': 6, '1y': 0, 'all': 0 };
    return priceHistory.slice(sliceMap[historyPeriod]);
  }, [priceHistory, historyPeriod]);

  const historyStats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const prices = filteredHistory.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minMonth = filteredHistory.find(p => p.price === min)?.month ?? '';
    const maxMonth = filteredHistory.find(p => p.price === max)?.month ?? '';
    return { min, max, avg: Math.round(avg * 100) / 100, minMonth, maxMonth };
  }, [filteredHistory]);

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Price history</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Track how the price of {product.name} has changed over time
      </p>

      {/* Period selector */}
      <div className="flex gap-2 mb-5">
        {(Object.entries({ '3m': '3 months', '6m': '6 months', '1y': '1 year', 'all': 'All' }) as [typeof historyPeriod, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setHistoryPeriod(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              historyPeriod === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white text-muted-foreground border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <AreaChart data={filteredHistory} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-price)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            tickFormatter={(v: number) => `£${v}`}
            domain={['dataMin - 10', 'dataMax + 10']}
          />
          <ChartTooltip
            content={<ChartTooltipContent indicator="line" />}
            formatter={(value: number) => [`£${value.toFixed(2)}`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--color-price)"
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ChartContainer>

      {/* Summary cards */}
      {historyStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-surface-alt rounded-xl p-4 ultra-border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <span className="microcopy-label">Lowest price</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">£{historyStats.min.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">in {historyStats.minMonth}</span>
            </div>
          </div>
          <div className="bg-surface-alt rounded-xl p-4 ultra-border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="microcopy-label">Highest price</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">£{historyStats.max.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">in {historyStats.maxMonth}</span>
            </div>
          </div>
          <div className="bg-surface-alt rounded-xl p-4 ultra-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted-foreground font-serif italic font-bold">~</span>
              <span className="microcopy-label">Average price</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">£{historyStats.avg.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

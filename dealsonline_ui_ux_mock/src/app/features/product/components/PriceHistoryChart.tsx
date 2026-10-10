import { useMemo, useState } from 'react';
import { type PricePoint } from '../../../lib/api';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatPrice } from '../../../lib/format';

interface PRPriceHistoryChartProps {
  title: string;
  priceHistory: PricePoint[];
}

const chartConfig: ChartConfig = {
  price: {
    label: 'Price',
    color: 'var(--ink)',
  },
};

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** "17 Jun" — series are irregular observations, so day matters, not just month. */
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const WINDOW_DAYS = { '3m': 90, '6m': 182, '1y': 365, all: Infinity } as const;

/**
 * Y-axis ticks at round, distinct values. Recharts' own ticks on a narrow
 * range came out as "24k, 24k, 24k": three labels for one number.
 */
function priceTicks(min: number, max: number): { ticks: number[]; label: (v: number) => string } {
  // Show at least a 10% band around the prices, so a KES 100 change on a
  // KES 23,000 phone reads as the small move it is, not a cliff.
  if (max - min < max * 0.1) {
    const mid = (min + max) / 2;
    [min, max] = [mid - max * 0.05, mid + max * 0.05];
  }
  const span = Math.max(max - min, 1);
  const raw = span / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  // Thousands with as many decimals as the step needs: 24k, 24.5k, 24.25k.
  const decimals = step >= 1000 ? 0 : step >= 100 ? 1 : 2;
  const label = (v: number) =>
    v >= 1000 && step >= 10 ? `${(v / 1000).toFixed(decimals).replace(/\.?0+$/, '')}k` : String(v);
  return { ticks, label };
}

export function PRPriceHistoryChart({ title, priceHistory }: PRPriceHistoryChartProps) {
  const [historyPeriod, setHistoryPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('1y');

  // Real series are irregular dated observations, not 12 monthly points, so the
  // window is filtered by date. Slicing a fixed count silently showed a different
  // span per product.
  const filteredHistory = useMemo(() => {
    // Guard rail: drop points more than 5x away from the series median. The
    // capture has a few misplaced decimal points (KES 1,159,900 for an
    // 11,599 phone), and one of those flattens the whole chart into a cliff.
    const valid = priceHistory.filter((p) => !Number.isNaN(new Date(p.t).getTime()) && p.price >= 1);
    const ordered = valid.map((p) => p.price).sort((x, y) => x - y);
    const median = ordered.length ? ordered[Math.floor(ordered.length / 2)] : 0;
    const sorted = valid
      .filter((p) => median === 0 || (p.price <= median * 5 && p.price >= median / 5))
      .sort((a, b) => +new Date(a.t) - +new Date(b.t));
    const days = WINDOW_DAYS[historyPeriod];
    if (!Number.isFinite(days) || sorted.length === 0) return sorted;
    const newest = +new Date(sorted[sorted.length - 1].t);
    const cutoff = newest - days * 86_400_000;
    const within = sorted.filter((p) => +new Date(p.t) >= cutoff);
    // Never render an empty chart just because the window is narrower than the
    // data is old — fall back to the whole series.
    return within.length >= 2 ? within : sorted;
  }, [priceHistory, historyPeriod]);

  const historyStats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const prices = filteredHistory.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minMonth = shortDate(filteredHistory.find(p => p.price === min)?.t ?? '');
    const maxMonth = shortDate(filteredHistory.find(p => p.price === max)?.t ?? '');
    return { min, max, avg: Math.round(avg * 100) / 100, minMonth, maxMonth };
  }, [filteredHistory]);

  // Plot on a real time axis: the gap between two checks is part of the story.
  const points = useMemo(
    () => filteredHistory.map((p) => ({ ...p, time: +new Date(p.t) })),
    [filteredHistory],
  );

  // Fewer than two plausible points is not a history.
  if (filteredHistory.length < 2 || !historyStats) return null;

  const axis = priceTicks(historyStats.min, historyStats.max);

  return (
    <div>
      <h2 className="section-title mb-1">Price history</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {filteredHistory.length} prices recorded for {title} since {fullDate(filteredHistory[0].t)}.
        The line holds each price until the next check.
      </p>

      {/* Period selector: text tabs, not pills (DESIGN_RULES.md) */}
      <div role="tablist" aria-label="Period" className="flex gap-4 mb-5 border-b border-border">
        {(Object.entries({ '3m': '3 months', '6m': '6 months', '1y': '1 year', 'all': 'All' }) as [typeof historyPeriod, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={historyPeriod === key}
            onClick={() => setHistoryPeriod(key)}
            className={`-mb-px pb-2 text-sm font-medium border-b-2 transition-colors ${
              historyPeriod === key
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <AreaChart data={points} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-price)" stopOpacity={0.12} />
              <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => shortDate(new Date(v).toISOString())}
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
            ticks={axis.ticks}
            tickFormatter={axis.label}
            width={52}
            domain={[axis.ticks[0], axis.ticks[axis.ticks.length - 1]]}
          />
          <ChartTooltip
            content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => fullDate(String(payload?.[0]?.payload?.t ?? ''))} />}
            formatter={(value: number) => [formatPrice(value), 'Price']}
          />
          {/* A step, not a curve: the price was X until a check found Y. A
              smoothed line drew humps between four points that never happened. */}
          <Area
            type="stepAfter"
            dataKey="price"
            stroke="var(--color-price)"
            strokeWidth={1.75}
            fill="url(#priceGradient)"
            dot={{ r: 2.5, fill: 'var(--color-price)', strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>

      {/* Summary cards */}
      {historyStats && (
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="rounded-md p-4 ultra-border">
            <div className="flex items-center gap-2 mb-1">
                            <span className="microcopy-label">Lowest price</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base md:text-lg font-bold text-foreground price-num">{formatPrice(historyStats.min)}</span>
              <span className="text-xs text-muted-foreground">{historyStats.minMonth}</span>
            </div>
          </div>
          <div className="rounded-md p-4 ultra-border">
            <div className="flex items-center gap-2 mb-1">
                            <span className="microcopy-label">Highest price</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base md:text-lg font-bold text-foreground price-num">{formatPrice(historyStats.max)}</span>
              <span className="text-xs text-muted-foreground">{historyStats.maxMonth}</span>
            </div>
          </div>
          <div className="rounded-md p-4 ultra-border">
            <div className="flex items-center gap-2 mb-1">
                            <span className="microcopy-label">Average price</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base md:text-lg font-bold text-foreground price-num">{formatPrice(historyStats.avg)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

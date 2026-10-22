import { useMemo, useState } from 'react';
import { type PricePoint } from '../../../lib/api';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatPrice, usablePriceHistory } from '../../../lib/format';
import { Button } from '../../../components/ui/button';

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

type Period = '3m' | '6m' | '1y' | 'all';
const WINDOW_DAYS: Record<Period, number> = { '3m': 90, '6m': 182, '1y': 365, all: Infinity };
const PERIODS: [Period, string][] = [['3m', '3 months'], ['6m', '6 months'], ['1y', '1 year'], ['all', 'All history']];

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

/**
 * Recorded prices, plotted on a real time axis.
 *
 * What it says, and what it does not (design audit §8): the dates are the
 * dates prices were recorded, the summary figures are of recorded prices,
 * and nothing claims to know what happened between two checks. Periods count
 * back from today; a period with fewer than two records says so and offers
 * all history, rather than silently widening to a span the label does not
 * describe. "All history" is the default, because most series are sparse.
 */
export function PRPriceHistoryChart({ title, priceHistory }: PRPriceHistoryChartProps) {
  const [period, setPeriod] = useState<Period>('all');

  // Same cleaning as the product page's "Price history" link, so the link is
  // only offered where there is a chart to see.
  const series = useMemo(() => usablePriceHistory(priceHistory), [priceHistory]);

  const windowed = useMemo(() => {
    const days = WINDOW_DAYS[period];
    if (!Number.isFinite(days)) return series;
    const cutoff = Date.now() - days * 86_400_000;
    return series.filter((p) => Date.parse(p.t) >= cutoff);
  }, [series, period]);

  const stats = useMemo(() => {
    if (windowed.length === 0) return null;
    const prices = windowed.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minDate = shortDate(windowed.find((p) => p.price === min)?.t ?? '');
    const maxDate = shortDate(windowed.find((p) => p.price === max)?.t ?? '');
    return { min, max, avg: Math.round(avg), minDate, maxDate };
  }, [windowed]);

  // Plot on a real time axis: the gap between two checks is part of the story.
  const points = useMemo(
    () => windowed.map((p) => ({ ...p, time: Date.parse(p.t) })),
    [windowed],
  );

  // Fewer than two plausible points is not a history.
  if (series.length < 2) return null;

  const enough = windowed.length >= 2 && stats != null;
  const first = series[0].t;
  const last = series[series.length - 1].t;

  return (
    <div>
      <h2 className="section-title mb-1">Price history</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {series.length} prices recorded for {title} between {fullDate(first)} and {fullDate(last)}.
        Prices may have changed between checks.
      </p>

      {/* Period selector: text tabs, not pills (DESIGN_RULES.md) */}
      <div role="tablist" aria-label="Period" className="flex gap-4 mb-5 border-b border-border">
        {PERIODS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={period === key}
            onClick={() => setPeriod(key)}
            className={`-mb-px pb-2 text-sm font-medium border-b-2 transition-colors ${
              period === key
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!enough ? (
        <div className="rounded-md border border-border py-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            {windowed.length === 1
              ? `One price recorded in this period, on ${fullDate(windowed[0].t)}.`
              : 'Not enough recorded prices for this period.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => setPeriod('all')}>
            View all history
          </Button>
        </div>
      ) : (
        <>
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
                ticks={priceTicks(stats.min, stats.max).ticks}
                tickFormatter={priceTicks(stats.min, stats.max).label}
                width={52}
                domain={[
                  priceTicks(stats.min, stats.max).ticks[0],
                  priceTicks(stats.min, stats.max).ticks[priceTicks(stats.min, stats.max).ticks.length - 1],
                ]}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => fullDate(String(payload?.[0]?.payload?.t ?? ''))} />}
                formatter={(value: number) => [formatPrice(value), 'Recorded price']}
              />
              {/* A step, not a curve: each recorded price is drawn until the
                  next record. A smoothed line drew humps between four points
                  that never happened. */}
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

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="rounded-md p-4 ultra-border">
              <span className="microcopy-label">Lowest recorded</span>
              <div className="flex flex-col mt-1">
                <span className="text-base md:text-lg font-bold text-foreground price-num">{formatPrice(stats.min)}</span>
                <span className="text-xs text-muted-foreground">{stats.minDate}</span>
              </div>
            </div>
            <div className="rounded-md p-4 ultra-border">
              <span className="microcopy-label">Highest recorded</span>
              <div className="flex flex-col mt-1">
                <span className="text-base md:text-lg font-bold text-foreground price-num">{formatPrice(stats.max)}</span>
                <span className="text-xs text-muted-foreground">{stats.maxDate}</span>
              </div>
            </div>
            <div className="rounded-md p-4 ultra-border">
              <span className="microcopy-label">Average recorded</span>
              <div className="flex flex-col mt-1">
                <span className="text-base md:text-lg font-bold text-foreground price-num">{formatPrice(stats.avg)}</span>
                <span className="text-xs text-muted-foreground">of {windowed.length} recorded prices</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { TrendingDown, Tag } from 'lucide-react';

type TimeRange = '1m' | '3m' | 'all';

interface PriceHistoryChartProps {
  data: { date: string; price: number }[];
  currentPrice: number;
}

function filterByRange(data: { date: string; price: number }[], range: TimeRange) {
  if (range === 'all') return data;
  const now = new Date();
  const months = range === '1m' ? 1 : 3;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return data.filter((d) => new Date(d.date) >= cutoff);
}

export default function PriceHistoryChart({ data, currentPrice }: PriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const filteredData = useMemo(() => filterByRange(data, timeRange), [data, timeRange]);

  const lowest3m = useMemo(() => {
    const last3m = filterByRange(data, '3m');
    if (last3m.length === 0) return currentPrice;
    return Math.min(...last3m.map((d) => d.price));
  }, [data, currentPrice]);

  if (data.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground mb-1">Price tracking just started</p>
        <p className="text-xs text-muted-foreground">
          Current price: <span className="font-semibold text-foreground">KES {currentPrice.toLocaleString()}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-2">Check back soon for price trends.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-white space-y-4">
      {/* Time range controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Price over time</p>
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={(v) => { if (v) setTimeRange(v as TimeRange); }}
          size="sm"
          className="gap-1"
        >
          <ToggleGroupItem value="1m" className="text-xs h-7 px-2.5 rounded-md">1M</ToggleGroupItem>
          <ToggleGroupItem value="3m" className="text-xs h-7 px-2.5 rounded-md">3M</ToggleGroupItem>
          <ToggleGroupItem value="all" className="text-xs h-7 px-2.5 rounded-md">All</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={filteredData}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={{ fill: 'var(--color-primary)', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg p-3">
          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lowest (3M)</p>
            <p className="text-sm font-semibold text-foreground">KES {lowest3m.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg p-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p>
            <p className="text-sm font-semibold text-foreground">KES {currentPrice.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

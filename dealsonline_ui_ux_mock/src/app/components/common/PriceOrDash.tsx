import { formatPrice, hasPrice } from '../../lib/format';

/**
 * A price slot that never reads "Price N/A". With no usable price it says so
 * in plain muted text, outside the mono price voice.
 */
export function PriceOrDash({
  value,
  className = '',
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (!hasPrice(value)) {
    return <span className="text-sm text-muted-foreground">No current price</span>;
  }
  return <span className={`price-num ${className}`}>{formatPrice(value)}</span>;
}

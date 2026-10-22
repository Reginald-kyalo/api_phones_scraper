import { formatPrice, hasPrice } from '../../lib/format';

/**
 * A price slot that never reads "KES 0". With no usable price it says so in
 * plain muted text, outside the mono price voice. "Unavailable" is the
 * honest word: the dataset has no price, which says nothing about whether
 * a shop is selling it.
 */
export function PriceOrDash({
  value,
  className = '',
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (!hasPrice(value)) {
    return <span className="text-sm text-muted-foreground">Price unavailable</span>;
  }
  return <span className={`price-num ${className}`}>{formatPrice(value)}</span>;
}

import { type LocalComparisonItem } from '../../../hooks/useLocalStorage';

/** Build a "Product A vs. Product B + N" title string */
export function buildComparisonTitle(items: LocalComparisonItem[]): string {
  if (items.length === 0) return 'Product comparison';
  if (items.length === 1) return items[0].name;
  const extra = items.length - 2;
  const title = `${items[0].name} vs. ${items[1].name}`;
  return extra > 0 ? `${title} + ${extra}` : title;
}

export const COMPARISON_COL_WIDTH = 220;

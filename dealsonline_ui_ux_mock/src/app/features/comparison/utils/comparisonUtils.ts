import { type LocalComparisonItem } from '../../../hooks/useLocalStorage';

/**
 * "Product A vs Product B" and, with more, "Product A vs Product B and 2 more":
 * a title a person can read in a tab, not "+ 2" after two long names.
 */
export function buildComparisonTitle(items: LocalComparisonItem[]): string {
  if (items.length === 0) return 'Compare products';
  if (items.length === 1) return items[0].name;
  const extra = items.length - 2;
  const title = `${items[0].name} vs ${items[1].name}`;
  return extra > 0 ? `${title} and ${extra} more` : title;
}

export const COMPARISON_COL_WIDTH = 220;

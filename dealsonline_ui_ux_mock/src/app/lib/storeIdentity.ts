/**
 * Store values arrive in two shapes: bare names from the grocery scrapers
 * ("carrefour", "naivas") and domains from the device scrapers ("jumia.co.ke").
 * The same retailer can appear as both — `carrefour` (9,270 listings) and
 * `carrefour.ke` (29) are separate identities in the corpus.
 *
 * This folds them for DISPLAY only. The underlying duplication is a data issue
 * logged for the backend; nothing here rewrites what the capture stored.
 */
const TLD = /\.(co\.ke|or\.ke|ke|com|net|online|shop|store)$/;

/** Canonical key for comparing two store values. */
export function storeKey(raw: string | null | undefined): string {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(/^www\./, '')
    .replace(TLD, '');
}

/** Human label: "jumia.co.ke" -> "Jumia", "eastmatt" -> "Eastmatt". */
export function storeName(raw: string | null | undefined): string {
  const key = storeKey(raw);
  if (!key) return '';
  return key
    .split(/[-_.]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

/** Single-letter avatar seed. */
export function storeInitial(raw: string | null | undefined): string {
  return (storeName(raw)[0] || '?').toUpperCase();
}

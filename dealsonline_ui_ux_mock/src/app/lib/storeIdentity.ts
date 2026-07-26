/**
 * Store display labels.
 *
 * ⛔ DISPLAY ONLY — never use this to decide whether two stores are the same.
 * Duplicate retailer identities (`carrefour` vs `carrefour.ke`) are folded
 * upstream by `app/api/hygiene.canonical_store`, which uses an explicit
 * five-entry map. The TLD strip below is generic, so as a data rule it would
 * silently merge any two future retailers that happen to share a stem. By the
 * time values reach here they are already canonical; this only prettifies them.
 */
const TLD = /\.(co\.ke|or\.ke|ke|com|net|online|shop|store)$/;

/** Internal: display normalisation only. Not an identity. */
function storeKey(raw: string | null | undefined): string {
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

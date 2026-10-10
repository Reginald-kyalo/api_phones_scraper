import { useState } from 'react';
import { storeInitial } from '../../lib/storeIdentity';

/**
 * A shop's identity on an offer row: its favicon, or a neutral initial tile
 * when there is none. One component on every row, so no shop looks more
 * "real" than another (DESIGN_RULES.md §5).
 *
 * ⚠️ Favicons come from a public favicon service for now. Before launch, fetch
 * and cache the ~36 shop logos once and serve them ourselves.
 */
export function StoreMark({
  store,
  url,
  size = 32,
}: {
  store: string;
  /** Any URL on the shop's site; its host is used to find the icon. */
  url?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const host = hostFor(store, url);

  return (
    <span
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {host && !failed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
          alt=""
          width={size - 12}
          height={size - 12}
          loading="lazy"
          onError={() => setFailed(true)}
          className="object-contain"
        />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">{storeInitial(store)}</span>
      )}
    </span>
  );
}

function hostFor(store: string, url?: string | null): string | null {
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      /* fall through to the store key */
    }
  }
  return store.includes('.') ? store.replace(/^www\./, '') : null;
}

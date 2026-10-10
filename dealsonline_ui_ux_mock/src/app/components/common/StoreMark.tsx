import { useEffect, useState } from 'react';
import { storeInitial } from '../../lib/storeIdentity';

const ICON_BASE = `${import.meta.env.BASE_URL}shop-icons/`;
let iconIndex: Promise<Record<string, string>> | null = null;

/** {host: file} for every shop with a hosted icon; fetched once per visit. */
function loadIconIndex(): Promise<Record<string, string>> {
  iconIndex ??= fetch(`${ICON_BASE}index.json`)
    .then((res) => (res.ok ? res.json() : {}))
    .catch(() => ({}));
  return iconIndex;
}

/**
 * A shop's identity on an offer row: its favicon, or a neutral initial tile
 * when there is none. One component on every row, so no shop looks more
 * "real" than another (DESIGN_RULES.md §5).
 *
 * Icons are served from public/shop-icons/, downloaded once by
 * scripts/fetch_shop_icons.py. A shop without one gets the initial tile; no
 * request ever goes to a third party at view time.
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
  const [file, setFile] = useState<string | null>(null);
  const host = hostFor(store, url);

  useEffect(() => {
    let live = true;
    if (host) loadIconIndex().then((index) => live && setFile(index[host] ?? null));
    return () => {
      live = false;
    };
  }, [host]);

  return (
    <span
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-photo"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {file && !failed ? (
        <img
          src={`${ICON_BASE}${file}`}
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

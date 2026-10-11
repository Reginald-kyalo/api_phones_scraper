import { useEffect } from 'react';
import { BRAND } from '../../lib/brand';

const DEFAULT_TITLE = `${BRAND.name} · Compare prices across Kenyan shops, from Jumia to Naivas`;

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content == null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Per-page <title> and description. Titles read "Page · SokoPulse"; the
 * homepage passes no title and gets the brand line. `noindex` for pages with
 * nothing worth a search result (account, search results, 404).
 *
 * Sets the head directly: react-helmet-async 3 targets React 19's native
 * head hoisting and does nothing on this React 18 build.
 */
export function Seo({
  title,
  description,
  noindex = false,
}: {
  title?: string;
  description?: string;
  noindex?: boolean;
}) {
  const full = title ? `${title} · ${BRAND.name}` : DEFAULT_TITLE;
  useEffect(() => {
    document.title = full;
    setMeta('property', 'og:title', full);
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
    }
    setMeta('name', 'robots', noindex ? 'noindex' : null);
  }, [full, description, noindex]);
  return null;
}

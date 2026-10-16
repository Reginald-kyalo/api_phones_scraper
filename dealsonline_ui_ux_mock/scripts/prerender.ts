/**
 * Prerender: write a real HTML file for every page worth a search result.
 *
 * The app renders in the browser, so the HTML a crawler or a WhatsApp link
 * preview receives used to be an empty <div id="root">. This step runs after
 * `vite build`, reads the same static dataset the app reads (dist/demo), and
 * writes, per page:
 *
 *   - the page's own <title>, description, canonical URL and Open Graph tags;
 *   - Product / AggregateOffer structured data on product pages;
 *   - a plain HTML snapshot of the content (name, prices, shops, links) inside
 *     #root. React's createRoot replaces it on load, so shoppers see the app
 *     and crawlers see the same content without running JavaScript.
 *
 * It also writes sitemap.xml and robots.txt, and turns 404.html into the app
 * shell, so any page not prerendered (single-shop products, typos) still
 * boots the app at its own URL, with a 404 status.
 *
 * Which pages: products sold by two or more shops (the comparisons), every
 * category, department and shelf, and the static pages. Single-shop products
 * are left out on purpose: they are thin pages, and Cloudflare Pages allows
 * 20,000 files per deploy. Run by scripts/postbuild.mjs through esbuild.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as demo from '../src/app/lib/demoSource';
import type { ClusterDetail, ClusterStore, ClusterSummary } from '../src/app/lib/api';
import { BRAND, MONEY_LINE } from '../src/app/lib/brand';
import { FAQ } from '../src/app/lib/faq';
import { categoryLabel } from '../src/app/lib/categories';
import { brandName, formatPrice, hasPrice, priceVerdict, productName, shopLabel } from '../src/app/lib/format';
import * as catalogue from '../src/app/lib/catalogueQueries';
import { brandFacets, brandPageBrands, readFilters } from '../src/app/lib/listing';
import { storeName } from '../src/app/lib/storeIdentity';
import { bestImage } from '../src/app/lib/images';
import { browseLabel, familyDisplayLabel } from '../src/app/lib/navLabels';
import { TAXONOMY_DEPARTMENTS, departmentForCategory, shelfPlacement, spineShelfDisplay } from '../src/app/data/taxonomyTree';

const DIST = join(process.cwd(), 'dist');
const BASE = process.env.BASE_PATH || '/';
/** Absolute origin for canonical URLs and the sitemap. */
const ORIGIN = (process.env.SITE_URL || BRAND.url).replace(/\/$/, '');
const MAX_PRODUCTS = Number(process.env.PRERENDER_MAX_PRODUCTS || 12000);

// ── The dataset, read from disk through the app's own loader ──────────────
// demoSource fetches `${BASE}demo/<file>`; answer those from dist/demo.
globalThis.fetch = (async (input: string | URL) => {
  const url = String(input);
  const rel = decodeURIComponent(url.slice(`${BASE}demo/`.length));
  try {
    const body = readFileSync(join(DIST, 'demo', rel), 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) };
  } catch {
    return { ok: false, status: 404, json: async () => null };
  }
}) as unknown as typeof fetch;

// ── HTML helpers ───────────────────────────────────────────────────────────
const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const href = (path: string) => `${BASE}${path.replace(/^\//, '')}`;
const abs = (path: string) => `${ORIGIN}${href(path)}`;
const productPath = (id: string) => `/prices/${encodeURIComponent(id)}`;

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>')) {
  // index.html is overwritten with the homepage below; run a fresh `vite build`.
  throw new Error('prerender: dist/index.html is already prerendered; rebuild first');
}

interface Page {
  path: string;
  title?: string;
  description: string;
  body: string;
  noindex?: boolean;
  jsonLd?: object;
  /** Absolute URL of the share image; the brand card when absent. */
  image?: string | null;
}

function render(page: Page): string {
  const full = page.title ? `${page.title} · ${BRAND.name}` : `${BRAND.name} · Compare prices across Kenyan shops, from Jumia to Naivas`;
  const head = [
    `<link rel="canonical" href="${esc(abs(page.path))}" />`,
    page.noindex ? '<meta name="robots" content="noindex" />' : '',
    page.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`
      : '',
  ].filter(Boolean).join('\n    ');
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(full)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(page.description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(full)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(page.description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(abs(page.path))}$2`)
    // Share previews (WhatsApp, X, Facebook): the product's own photo where
    // there is one, else the brand card. Both as absolute URLs.
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(page.image ?? abs('/og-image.png'))}$2`)
    .replace(/\s*<meta property="og:image:width"[^>]*>\s*<meta property="og:image:height"[^>]*>/, page.image ? '' : '$&')
    .replace('</head>', `  ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${shell(page.body)}</div>`);
}

/** The snapshot's frame: a plain header and the page container the app uses. */
function shell(body: string): string {
  return (
    `<header class="border-b border-border"><div class="page-container flex h-16 items-center">` +
    `<a href="${href('/')}" class="font-display text-lg font-bold text-foreground">${BRAND.name}</a>` +
    `</div></header>` +
    `<main class="page-container py-8">${body}</main>` +
    // Honeypot, as in the footer: hidden, nofollow, disallowed in robots.txt.
    `<a href="${href('/data/catalogue-export')}" rel="nofollow" tabindex="-1" aria-hidden="true" class="sr-only">Catalogue export</a>`
  );
}

// The same trail the app draws (components/common/Breadcrumbs.tsx):
// department → category → brand, or department → family → shelf.
const deptCrumb = (slug: string): [string, string][] => {
  const d = departmentForCategory(slug);
  return d ? [[d.label, `/aisle/${d.id}`]] : [];
};
const shelfCrumbs = (slug: string): [string, string][] => {
  const p = shelfPlacement(slug);
  return p
    ? [[p.department.label, `/aisle/${p.department.id}`], [familyDisplayLabel(p.family), `/aisle/${p.department.id}#${p.family.id}`]]
    : [];
};

const crumbs = (items: [label: string, path?: string][]) =>
  `<nav aria-label="Breadcrumb" class="mb-4 text-sm text-muted-foreground">` +
  items
    .map(([label, path]) => (path ? `<a href="${href(path)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`))
    .join(' › ') +
  `</nav>`;

/** A list of products as links with their lowest price and shop count. */
function productList(rows: ClusterSummary[]): string {
  if (!rows.length) return '';
  return (
    `<ul class="mt-6 space-y-2">` +
    rows
      .map((r) => {
        const name = productName(r);
        const shops = r.n_stores_priced ?? r.n_stores ?? 0;
        const price = hasPrice(r.best_price)
          ? ` · from <span class="price-num">${esc(formatPrice(r.best_price))}</span>`
          : '';
        return `<li><a href="${href(productPath(r.cluster_id))}">${esc(name)}</a>` +
          `<span class="text-sm text-muted-foreground">${price}${shops ? ` · ${esc(shopLabel(shops))}` : ''}</span></li>`;
      })
      .join('') +
    `</ul>`
  );
}

// ── Writing ────────────────────────────────────────────────────────────────
const sitemap: string[] = [];
let written = 0;

function write(page: Page) {
  const rel = page.path === '/' ? 'index.html' : `${decodeURIComponent(page.path.replace(/^\//, ''))}.html`;
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(page));
  written += 1;
  if (!page.noindex) sitemap.push(abs(page.path));
}

// ── Pages ──────────────────────────────────────────────────────────────────
type Offer = [store: string, offer: ClusterStore];

function offersOf(cluster: ClusterDetail): Offer[] {
  return Object.entries(cluster.best_by_store ?? {})
    .map(([store, v]) => [store, typeof v === 'number' ? { price: v, url: '', title: '' } : v] as Offer)
    .filter(([, o]) => o != null && hasPrice(o.price))
    .sort(([, a], [, b]) => (a.price as number) - (b.price as number));
}

function productPage(cluster: ClusterDetail, capturedAt: string): Page | null {
  const name = productName(cluster);
  const offers = offersOf(cluster);
  if (offers.length < 2) return null;
  const [lowStore, low] = offers[0];
  const high = offers[offers.length - 1][1];
  const slug = cluster.category ?? '';
  const path = productPath(cluster.cluster_id);
  const verdict = cluster.condition_basis !== 'likely_used' && (cluster.configs?.length ?? 0) < 2
    ? priceVerdict(cluster.price_history, low.price)
    : null;
  const rows = offers
    .map(([store, o]) =>
      `<tr><td>${esc(storeName(store))}</td><td>${esc(o.title)}</td>` +
      `<td class="price-num">${esc(formatPrice(o.price))}</td></tr>`,
    )
    .join('');
  return {
    path,
    title: `${name} price in Kenya: from ${formatPrice(low.price)} at ${shopLabel(offers.length)}`,
    image: bestImage(cluster),
    description: `${name} from ${formatPrice(low.price)}. Compare ${shopLabel(offers.length)} in Kenya, sorted by price.`,
    body:
      crumbs([['Home', '/'], ...deptCrumb(slug), ...(slug ? [[categoryLabel(slug), `/browse/${slug}`] as [string, string]] : [])]) +
      `<h1 class="page-title">${esc(name)}</h1>` +
      // A summary written from the price data, never by hand: what Google
      // quotes, and the same numbers as the list below.
      `<p class="mt-2 text-sm">${esc(name)} is on sale at ${esc(shopLabel(offers.length))} in Kenya, from ` +
      `${esc(formatPrice(low.price))} at ${esc(storeName(lowStore))} to ${esc(formatPrice(high.price))}, ` +
      `a difference of ${esc(formatPrice((high.price as number) - (low.price as number)))}.` +
      (verdict ? ` ${esc(verdict)}` : '') +
      `</p>` +
      `<table class="mt-6 w-full text-sm"><caption class="microcopy-label text-left">Prices · sorted by price</caption>` +
      `<thead><tr><th class="text-left">Shop</th><th class="text-left">Listing</th><th class="text-left">Price</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      ...(cluster.brand ? { brand: { '@type': 'Brand', name: brandName(cluster.brand) } } : {}),
      ...(bestImage(cluster) ? { image: bestImage(cluster) } : {}),
      category: slug ? categoryLabel(slug) : undefined,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'KES',
        lowPrice: low.price,
        highPrice: high.price,
        offerCount: offers.length,
        offers: offers.map(([store, o]) => ({
          '@type': 'Offer',
          price: o.price,
          priceCurrency: 'KES',
          ...(o.url ? { url: o.url } : {}),
          seller: { '@type': 'Organization', name: storeName(store) },
          // Only claim a condition we know: classifieds and refurb listings.
          ...(cluster.condition_basis === 'likely_used' ? { itemCondition: 'https://schema.org/UsedCondition' } : {}),
        })),
      },
      dateModified: cluster.last_seen ?? capturedAt,
    },
  };
}

/**
 * Crawlers that build search results and AI answers (and so send shoppers):
 * allowed everywhere a shopper can go. GEO depends on these.
 */
const ANSWER_BOTS = [
  'Googlebot', 'Bingbot', 'DuckDuckBot', 'Applebot', 'OAI-SearchBot', 'ChatGPT-User',
  'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User',
];
/**
 * Crawlers that only collect training data and send nobody back. Today's
 * prices are public on purpose (benchmark, anti-scraping strategy); bulk
 * copying for model training is not part of that bargain.
 */
const TRAINING_BOTS = [
  'GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'Applebot-Extended',
  'Bytespider', 'meta-externalagent', 'FacebookBot', 'Amazonbot', 'cohere-ai', 'cohere-training-data-crawler',
  'Diffbot', 'ImagesiftBot', 'Omgilibot', 'omgili', 'PetalBot', 'Timpibot', 'AI2Bot', 'img2dataset',
];

/**
 * robots.txt. Every page we prerender stays open to search and answer
 * crawlers; the honeypot (/data/) and the catalogue API (/api/) are closed to
 * all of them. A crawler obeys only the most specific group naming it, so
 * each group repeats the two Disallow lines.
 */
function robotsTxt(): string {
  const closed = `Disallow: ${BASE}data/\nDisallow: ${BASE}api/\n`;
  return [
    '# Search and AI-answer crawlers: welcome on every public page.',
    ...ANSWER_BOTS.map((b) => `User-agent: ${b}`),
    `Allow: ${BASE}`,
    closed,
    '# Training-only crawlers: not permitted.',
    ...TRAINING_BOTS.map((b) => `User-agent: ${b}`),
    `Disallow: ${BASE}`,
    '',
    '# Everyone else.',
    'User-agent: *',
    `Allow: ${BASE}`,
    closed,
    `Sitemap: ${ORIGIN}${BASE}sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * llms.txt (llmstxt.org): a plain map of the site for AI answer engines,
 * saying what each kind of page holds and linking the entry points.
 */
function llmsTxt(manifest: Awaited<ReturnType<typeof demo.getManifest>>): string {
  const cats = manifest.categories
    .map((c) => `- [${categoryLabel(c.slug)}](${abs(`/browse/${c.slug}`)}): ${c.count.toLocaleString('en-GB')} products, ${c.multi_store.toLocaleString('en-GB')} sold by 2 or more shops`)
    .join('\n');
  return `# ${BRAND.name}

> ${BRAND.name} is a price comparison site for Kenya. For each product it lists every shop's current price, sorted by price, with the shop's own listing title and when the price was last checked. It covers ${manifest.total_clusters.toLocaleString('en-GB')} products from ${manifest.total_stores} Kenyan shops, including Jumia, Kilimall, Carrefour and Naivas. Prices are in Kenyan shillings (KES). ${BRAND.name} does not sell anything itself.

${MONEY_LINE}

## What the pages contain

- Product pages (${abs('/prices/')}<id>): one product, every shop's price for it sorted cheapest first, the price range, the number of shops, when prices were checked, price history where recorded, and Product/AggregateOffer structured data. Savings compare two real shop prices for the same configuration; they are never computed against a list price.
- Category pages (${abs('/browse/')}<category>): the products in a category, most compared first, with the lowest price and shop count for each.
- Brand pages (${abs('/browse/')}<category>/<brand>): one brand within a category, e.g. ${abs('/browse/mobile-phones/samsung')}.
- Deals (${abs('/deals')}): products that are cheaper at one shop than another, with savings between 1% and 60%.
- Questions and answers (${abs('/faq')}): how comparisons work, what to check before paying, how ${BRAND.name} makes money.

## Key pages

- [Home](${abs('/')})
- [All categories](${abs('/browse')})
- [Deals](${abs('/deals')})
- [Questions and answers](${abs('/faq')})
- [How we make money](${abs('/how-we-make-money')})
- [About](${abs('/about')})
- [For shops and brands](${abs('/for-business')})

## Categories

${cats}

## Notes for quoting

- Quote prices with the shop and the time they were checked; shops change prices, and the final price at checkout can include delivery.
- The full list of pages is in the sitemap: ${ORIGIN}${BASE}sitemap.xml
`;
}

/** Add the trap products (scripts/trap-products.json) to dist's card index. */
function plantTraps() {
  const { products } = JSON.parse(readFileSync(join(process.cwd(), 'scripts', 'trap-products.json'), 'utf8')) as {
    products: { slug: string; id: string; name: string; brand: string; price: number; store: string }[];
  };
  for (const p of products) {
    if (!demo.TRAP_HASHES.has(demo.fnv1a(p.id))) {
      throw new Error(`prerender: trap ${p.id} is missing from TRAP_HASHES in demoSource.ts`);
    }
    const file = join(DIST, 'demo', 'cards', `${p.slug}.json`);
    const index = JSON.parse(readFileSync(file, 'utf8')) as { stores: string[]; rows: unknown[][] };
    let store = index.stores.indexOf(p.store);
    if (store < 0) store = index.stores.push(p.store) - 1;
    // Same shape as a real row (see CardRow): one shop, no spread, no photo.
    // Placed mid-list, where a bulk copy keeps it and a skim misses it.
    index.rows.splice(Math.floor(index.rows.length / 2), 0, [p.id, p.name, p.brand, p.price, 1, 1, null, store, null, 0]);
    writeFileSync(file, JSON.stringify(index));
  }
}

async function main() {
  const manifest = await demo.getManifest();
  const capturedAt = manifest.captured_at;

  // Static pages
  const departmentLinks = TAXONOMY_DEPARTMENTS.map(
    (d) => `<li><a href="${href(`/aisle/${d.id}`)}">${esc(d.label)}</a></li>`,
  ).join('');
  const deals = await demo.getDeals({ page: 0, limit: 24 });

  write({
    path: '/',
    description: 'Compare prices on phones, laptops, TVs, groceries and more across Kenyan shops. Every shop’s price, sorted by price.',
    body:
      `<h1 class="page-title">Compare prices across ${esc(manifest.total_stores)} Kenyan shops</h1>` +
      `<p class="mt-2 text-muted-foreground">${esc(manifest.total_clusters.toLocaleString('en-GB'))} products. Every shop’s price for the same product, sorted by price.</p>` +
      `<h2 class="section-title mt-8">Departments</h2><ul class="mt-3 space-y-1">${departmentLinks}</ul>` +
      `<h2 class="section-title mt-8">Deals</h2>${productList(deals.results)}` +
      `<p class="mt-8 text-sm text-muted-foreground">${esc(MONEY_LINE)}</p>`,
  });
  write({
    path: '/deals',
    title: 'Deals',
    description: 'The same product, cheaper at one Kenyan shop than another. Real savings between shops, checked daily.',
    body: crumbs([['Home', '/'], ['Deals']]) + `<h1 class="page-title">Deals</h1>${productList(deals.results)}`,
  });
  write({
    path: '/browse',
    title: 'All categories',
    description: 'Browse every category SokoPulse compares, from phones and laptops to groceries.',
    body:
      crumbs([['Home', '/'], ['All categories']]) +
      `<h1 class="page-title">All categories</h1><ul class="mt-6 space-y-1">${departmentLinks}` +
      manifest.categories
        .map((c) => `<li><a href="${href(`/browse/${c.slug}`)}">${esc(categoryLabel(c.slug))}</a></li>`)
        .join('') +
      `</ul>`,
  });

  // Prose pages render from LegalPage; the snapshot carries the title only.
  const prose: [path: string, title: string, description: string][] = [
    ['/about', 'About us', 'SokoPulse compares prices across Kenyan shops so you can find the real lowest price for the exact product you want.'],
    ['/how-we-make-money', 'How we make money', MONEY_LINE],
    ['/for-business', 'For shops and brands', 'List your shop, advertise, or buy Kenyan price data and an API from SokoPulse.'],
    ['/contact', 'Contact', 'How to reach SokoPulse.'],
    ['/privacy', 'Privacy policy', 'How SokoPulse handles your data.'],
    ['/terms', 'Terms of service', 'The terms for using SokoPulse.'],
    ['/cookie-policy', 'Cookie policy', 'How SokoPulse uses cookies.'],
  ];
  write({
    path: '/faq',
    title: 'Questions and answers',
    description: 'How SokoPulse compares prices across Kenyan shops, what to check before you pay, and how we make money.',
    body:
      crumbs([['Home', '/'], ['Questions and answers']]) +
      `<h1 class="page-title">Questions and answers</h1>` +
      FAQ.map(({ q, a }) => `<h2 class="mt-6 text-base font-semibold">${esc(q)}</h2><p class="mt-1 text-sm">${esc(a)}</p>`).join(''),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  });
  for (const [path, title, description] of prose) {
    write({ path, title, description, body: crumbs([['Home', '/'], [title]]) + `<h1 class="page-title">${esc(title)}</h1><p class="mt-2">${esc(description)}</p>` });
  }

  // Pages with nothing for a search result: correct title, noindex, no snapshot.
  const privatePages: [string, string][] = [
    ['/search', 'Search'], ['/favorites', 'Favourites'], ['/alerts', 'Price alerts'],
    ['/account', 'Your account'], ['/auth', 'Sign in'], ['/compare', 'Compare products'],
    ['/style-guide', 'Style guide'],
  ];
  for (const [path, title] of privatePages) {
    write({ path, title, description: `${title} on SokoPulse.`, noindex: true, body: `<h1 class="page-title">${esc(title)}</h1>` });
  }

  // Categories, and the products sold by two or more shops in each.
  const productIds: string[] = [];
  for (const c of manifest.categories) {
    const label = categoryLabel(c.slug);
    const { rows } = await demo.getCategoryRows(c.slug);
    const multi = rows.filter((r) => r.is_multi_store);
    productIds.push(...multi.map((r) => r.cluster_id));
    const brands = brandPageBrands(brandFacets(rows));
    const popular = brands.length
      ? `<h2 class="section-title mt-8">Popular in ${esc(label)}</h2><ul class="mt-3 space-y-1">` +
        brands.map((b) => `<li><a href="${href(`/browse/${c.slug}/${b}`)}">${esc(brandName(b))} ${esc(label.toLowerCase())}</a></li>`).join('') +
        `</ul>`
      : '';
    write({
      path: `/browse/${c.slug}`,
      title: `${label} prices in Kenya`,
      description: `Compare ${label.toLowerCase()} prices across Kenyan shops, sorted by price.`,
      body:
        crumbs([['Home', '/'], ...deptCrumb(c.slug), [label]]) +
        `<h1 class="page-title">${esc(label)}</h1>` +
        `<p class="mt-1 text-sm text-muted-foreground">${esc(c.count.toLocaleString('en-GB'))} products · ${esc(c.multi_store.toLocaleString('en-GB'))} sold by 2 or more shops</p>` +
        productList(multi.slice(0, 48)) +
        popular,
    });

    // Brand pages: the category filtered to one brand, as the app renders
    // /browse/<category>/<brand>, most compared first.
    for (const b of brands) {
      const heading = `${brandName(b)} ${label.toLowerCase()}`;
      const page = await catalogue.browse(c.slug, { ...readFilters(new URLSearchParams()), brands: [b] }, 0);
      write({
        path: `/browse/${c.slug}/${b}`,
        title: `${heading} prices in Kenya`,
        description: `Compare ${heading.toLowerCase()} prices across Kenyan shops, sorted by price.`,
        body:
          crumbs([['Home', '/'], ...deptCrumb(c.slug), [label, `/browse/${c.slug}`], [brandName(b)]]) +
          `<h1 class="page-title">${esc(heading)}</h1>` +
          `<p class="mt-1 text-sm text-muted-foreground">${esc(page.count.toLocaleString('en-GB'))} products</p>` +
          productList(page.results) +
          popular,
      });
    }
  }

  // Departments and their shelves.
  for (const d of TAXONOMY_DEPARTMENTS) {
    write({
      path: `/aisle/${d.id}`,
      title: d.label,
      description: `Compare ${d.label.toLowerCase()} prices across Kenyan shops.`,
      body:
        crumbs([['Home', '/'], [d.label]]) +
        `<h1 class="page-title">${esc(d.label)}</h1>` +
        d.families
          .map((f) =>
            `<h2 class="section-title mt-6">${esc(familyDisplayLabel(f))}</h2><ul class="mt-2 space-y-1">` +
            f.shelves.map((s) => `<li><a href="${href(`/shelf/${s.slug}`)}">${esc(spineShelfDisplay(s))}</a></li>`).join('') +
            `</ul>`,
          )
          .join(''),
    });
  }

  const shelfSlugs = new Set(TAXONOMY_DEPARTMENTS.flatMap((d) => d.families.flatMap((f) => f.shelves.map((s) => s.slug))));
  for (const slug of shelfSlugs) {
    let shelf;
    try {
      shelf = await demo.getShelfClusters(slug, { limit: 48 });
    } catch {
      continue; // no capture for this shelf: the app shows its empty state
    }
    const heading = browseLabel(shelf.node);
    write({
      path: `/shelf/${slug}`,
      title: heading,
      description: `Compare ${heading.toLowerCase()} prices across Kenyan shops.`,
      body:
        crumbs([['Home', '/'], ...shelfCrumbs(slug), [heading]]) +
        `<h1 class="page-title">${esc(heading)}</h1>` +
        `<p class="mt-1 text-sm text-muted-foreground">${esc(shelf.total.toLocaleString('en-GB'))} products</p>` +
        productList(shelf.results),
    });
  }

  // Products last, capped so the deploy stays under the host's file limit.
  let products = 0;
  for (const id of productIds) {
    if (products >= MAX_PRODUCTS) break;
    let cluster: ClusterDetail;
    try {
      cluster = await demo.getDetail(id);
    } catch {
      continue;
    }
    const page = productPage(cluster, capturedAt);
    if (!page) continue;
    write(page);
    products += 1;
  }

  writeFileSync(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      sitemap.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n') +
      `\n</urlset>\n`,
  );
  writeFileSync(join(DIST, 'robots.txt'), robotsTxt());
  writeFileSync(join(DIST, 'llms.txt'), llmsTxt(manifest));

  // Trap entries go into the card index last, after every page above was
  // built from it, so they reach the bulk data file and nothing else.
  plantTraps();

  // Anything not prerendered boots the app at its own URL (with a 404 status
  // from the host). No snapshot, and noindex, so it never competes with a
  // prerendered page.
  writeFileSync(
    join(DIST, '404.html'),
    template.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>'),
  );

  console.log(`prerender: ${written} pages (${products} products), sitemap ${sitemap.length} URLs`);
}

// Awaited at the top level, so postbuild.mjs's `await import()` returns only
// when every page is written (it moves dist/demo away right after).
try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { clustersApi, type ClusterDetail } from '../lib/api';
import { comparedLabel, formatPrice, shopLabel } from '../lib/format';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useOrigin, type CameFrom } from '../lib/navigation';
import { OfferRow, pricedOffers } from '../features/clusters/components/OfferRow';
import { PageMeta } from '../components/common/PageMeta';
import { Loader2, AlertTriangle, ArrowLeft, ChevronDown, RefreshCw, TrendingDown } from 'lucide-react';

/** Where the page's own back control goes when nothing told it where the shopper came from. */
const DEFAULT_ORIGIN: CameFrom = { href: '/deals', label: 'All deals' };

type Config = ClusterDetail['configs'][number];

/**
 * The URL key for one configuration — `STOREFRONT_DEFECTS.md` #2b's route-key decision.
 *
 * ⛔⛔ `facet_value` IS NOT ONE TYPE. It is an `int` when the primary facet is `storage_gb`
 * (256, 128, 512) and a `str` when it is `cpu` ("Intel Core i5", "Apple M2") — verified over
 * live clusters. So it is stringified on the way out and compared as a string on the way back
 * in; `===` against the raw value would silently never match a storage variant.
 *
 * ⭐ AND IT IS A QUERY PARAM, NOT A PATH SEGMENT, BECAUSE THERE IS NO STABLE VARIANT ID. A
 * config is identified by its facet value WITHIN a cluster and nowhere else, so `/prices/{id}
 * ?facet=…` is the only key derivable without a backend change — which is exactly what the
 * defect entry said the decision was. It also puts the variant in the URL alongside
 * `?multi_store=1`, consistent with this app's rule that view state is shareable.
 */
function facetKey(config: Config): string | null {
  if (config.facet_value != null) return String(config.facet_value);
  return config.facet_label ?? null;
}

function variantLabel(config: Config): string {
  return config.facet_label ?? (config.storage_gb != null ? `${config.storage_gb}GB` : 'Variant');
}

function variantHref(clusterId: string, config: Config): string | null {
  const key = facetKey(config);
  if (!key) return null;
  return `/prices/${encodeURIComponent(clusterId)}?facet=${encodeURIComponent(key)}`;
}

/**
 * One configuration of a cluster, with the per-store comparison it carries.
 *
 * ⛔⛔ THIS BLOCK USED TO STATE A COMPARISON AND OFFER NO WAY TO SEE IT. It rendered
 * `facet_label · from PRICE at STORE · N shops` and dropped `by_store` — a full
 * `{price, url, title}` map per shop, already in the payload — on the floor. On a
 * price-comparison storefront, a shop count that opens nothing is the site failing at the one
 * thing it exists to do. (`STOREFRONT_DEFECTS.md` #2.)
 *
 * ⭐ AND THE VARIANT IS THE COMPARISON THAT IS ACTUALLY HONEST. The cluster-level list takes
 * each shop's best price across every configuration, so it will happily show a 128GB phone at
 * one shop beside a 256GB at another. `Samsung Galaxy A17` is the live case: 128GB is 18,999
 * vs 21,500 (13.2% apart) and 256GB is 24,999 vs 29,500 (18.0%) — two real comparisons that
 * the old page reduced to the text "· 2 shops", twice.
 *
 * ⭐ `spread_pct` IS SERVED AND WAS RENDERED NOWHERE. It is the per-variant, like-for-like
 * saving — the number a comparison page is for.
 */
function VariantBlock({
  config,
  href,
  origin,
}: {
  config: Config;
  href: string | null;
  origin: CameFrom;
}) {
  const [open, setOpen] = useState(false);
  // ⛔ DERIVED FROM THE ROWS THAT WILL RENDER, never from a served count: `ClusterConfig` has no
  // `n_stores_priced` (the TS type claimed one and the API never sent it), and `n_stores` is the
  // listing count that overstated the cluster headline by a mean of +9.6 shops.
  const offers = pricedOffers(config.by_store);
  const label = variantLabel(config);
  const spread = config.spread_pct;
  const comparable = offers.length > 1;

  return (
    <div data-testid="variant" className="rounded-xl ultra-border overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 flex items-baseline justify-between gap-2 flex-wrap
                   hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">{label}</span>
          {spread != null && spread > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-deep
                             bg-teal/10 rounded px-1.5 py-0.5">
              <TrendingDown className="h-3 w-3" aria-hidden="true" />
              {Math.round(spread)}%
            </span>
          )}
        </span>
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          from{' '}
          <span className="price-num font-bold text-foreground">
            {formatPrice(config.best_price)}
          </span>
          {config.cheapest_store ? ` at ${config.cheapest_store}` : ''}
          {' · '}
          {/* ⭐ `comparedLabel` says "only 1 shop — no comparison" below two, rather than a
              confident "1 shop" over an expander with nothing worth opening. */}
          {comparedLabel(offers.length)}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {offers.length > 0 ? (
            <>
              <ul aria-label={`${label} prices`} className="space-y-2 list-none p-0">
                {offers.map(([store, offer], idx) => (
                  <OfferRow key={store} store={store} offer={offer} best={idx === 0} compact />
                ))}
              </ul>
              {comparable && spread != null && spread > 0 && (
                <p className="text-xs text-teal-deep mt-2">
                  {Math.round(spread)}% between the cheapest and dearest {label} — same
                  configuration, so this saving is real.
                </p>
              )}
              {/* ⭐ THE EXPANDER STAYS AND THE PAGE IS ADDITIVE. Expanding is for scanning all
                  the variants at once; the permalink is for sending ONE of them to someone.
                  Replacing the expander with a link would have traded one affordance for the
                  other and broken the assertions that guard #2. */}
              {href && (
                <Link
                  to={href}
                  state={{ from: origin }}
                  data-testid="variant-permalink"
                  className="inline-block mt-3 text-xs font-semibold text-teal-deep hover:underline"
                >
                  Compare {label} on its own page →
                </Link>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No usable price for this configuration right now.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Live cross-store price comparison for one cluster (the matching engine's
 * output). Renders the honest-price contract: condition_basis labels the
 * headline, data_warning is surfaced as a caveat, comparison_grade=false gets
 * an accessory disclaimer, and per-store rows carry real click-through URLs.
 */
export default function ClusterPricesPage() {
  const { clusterId } = useParams<{ clusterId: string }>();
  // ⛔⛔ THE BACK CONTROL USED TO BE `<Link to="/deals">`, HARDCODED. Arriving from a shelf,
  // from a department or from favourites and pressing the page's own back control dropped the
  // shopper into a section they may never have visited — and it contradicted the breadcrumb
  // work done for the category tree, where the trail is accurate.
  //
  // ⭐ ROUTER STATE, NOT HISTORY. `navigate(-1)` is wrong on a cold load (a shared link, a new
  // tab) where there is no entry to go back to. The linking page knows its own href for
  // certain and passes it; a cold load falls through to a real default. Neither path guesses.
  const origin = useOrigin(DEFAULT_ORIGIN);
  // ⭐ THE SELECTED VARIANT LIVES IN THE URL — `STOREFRONT_DEFECTS.md` #2b. Same rule as
  // `?multi_store=1`: a like-for-like comparison of ONE configuration is the most shareable
  // thing this site produces, and component state would make it unsendable.
  const [params] = useSearchParams();
  const facet = params.get('facet');
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!clusterId) return;
    setLoading(true);
    setError(false);
    try {
      setCluster(await clustersApi.getDetail(clusterId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading price comparison" />
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">We couldn't load this price comparison.</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link to="/deals">All deals</Link>
          </Button>
        </div>
      </div>
    );
  }

  const clusterName = cluster.display_name ?? cluster.title;
  const likelyUsed = cluster.condition_basis === 'likely_used';

  // ⛔ COMPARE AS STRINGS. `facet_value` is an int for storage and a str for cpu; `===` against
  // the raw value would never match a storage variant and every phone link would 404-in-place.
  const selected = facet
    ? cluster.configs.find((c) => facetKey(c) === facet) ?? null
    : null;

  // ⛔⛔ A `?facet=` THAT MATCHES NOTHING MUST SAY SO, NOT SILENTLY SHOW THE WHOLE CLUSTER.
  // Configs are rebuilt whenever the engine re-clusters, so a shared variant link WILL go stale
  // — and a stale link that quietly renders the mixed-configuration view would hand someone a
  // cross-config price spread while they believed they were looking at one variant. That is the
  // exact dishonesty this page exists to remove.
  const facetMissing = facet != null && selected == null;

  // In variant mode the subject of the page is the CONFIGURATION, so every honest-price figure
  // comes from it — not from the cluster, whose list mixes configurations by construction.
  const name = selected ? `${clusterName} · ${variantLabel(selected)}` : clusterName;
  const rows = selected
    ? pricedOffers(selected.by_store)
    : pricedOffers(cluster.best_by_store);
  const spread = selected ? selected.spread_pct : cluster.like_for_like_spread_pct;
  const headlinePrice = selected ? selected.best_price : cluster.best_price;
  const clusterHref = `/prices/${encodeURIComponent(cluster.cluster_id)}`;
  const facetChips = Object.entries(cluster.spec_facets).flatMap(([k, vals]) =>
    vals.map((v) => `${k.toUpperCase()} ${v}`),
  );

  const selectedHref = selected ? variantHref(cluster.cluster_id, selected) : null;

  return (
    <div className="bg-white min-h-screen">
      {/* ⛔⛔ A VARIANT PAGE IS CANONICAL TO ITSELF, AND THAT IS THE WHOLE POINT OF #2b. The
          128GB and 256GB pages carry different prices from different shops — they are distinct
          comparable content, not a filtered view of one page, so pointing them at the bare
          cluster would ask a search engine to throw away the like-for-like comparison this site
          exists to make. That is the opposite of `?multi_store=1`, which IS a subset and IS
          canonicalised away on the shelf.
          ⛔ AND A STALE `?facet=` IS `noindex` — it renders honestly for whoever followed the
          dead link, but a configuration that no longer exists is not an answer for anyone else. */}
      <PageMeta
        title={selected ? `${name} — Price Comparison` : `${name} — Compare Prices in Kenya`}
        description={
          rows.length > 0
            ? `${selected ? `${clusterName} ${variantLabel(selected)}` : clusterName} — ${
                comparedLabel(rows.length)
              }, from ${formatPrice(headlinePrice)}. Compare Kenyan shops before you buy.`
            : `${clusterName} — no usable price across Kenyan shops right now.`
        }
        canonical={facetMissing ? clusterHref : selectedHref ?? clusterHref}
        noindex={facetMissing || rows.length === 0}
      />
      <div className="max-w-[900px] mx-auto px-4 lg:px-6 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-1">
          <Link to={origin.href} data-testid="back-link">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {origin.label}
          </Link>
        </Button>

        {/* ⛔ THE TRAIL IS TEXT, NOT LINKS, AND THAT IS DELIBERATE. `category_path` is served
            from the retired 424-node spine where it has an answer and from `browse_nodes`
            otherwise — two slug spaces, 112 and 95 slugs of which also exist in the redesign
            spine. Linking a path segment means picking a builder for a slug whose space this
            page cannot tell, and a wrong pick resolves to a plausible WRONG page rather than
            to a 404. Showing where the product sits is useful; guessing a URL for it is not. */}
        <p className="microcopy-label">
          {cluster.category_path?.path_string
            || [cluster.brand, cluster.category].filter(Boolean).join(' · ')
            || 'Price comparison'}
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight mt-1 mb-3">{name}</h1>

        {/* ⛔⛔ A STALE VARIANT LINK MUST FAIL LOUDLY. `configs` are rebuilt whenever the engine
            re-clusters, so a shared `?facet=` WILL eventually name a configuration that no
            longer exists. Falling through to the whole-cluster view would hand the reader a
            cross-configuration price spread while they believed they were looking at one
            variant — the precise dishonesty this page exists to remove. */}
        {facetMissing && (
          <div
            data-testid="facet-missing"
            className="flex items-start gap-2 rounded-lg ultra-border p-3 mb-4 text-sm text-muted-foreground"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              That configuration is no longer listed for this product — configurations change as
              shops restock.{' '}
              <Link to={clusterHref} className="font-semibold text-teal-deep hover:underline">
                Compare all configurations
              </Link>
              .
            </span>
          </div>
        )}

        {selected && (
          <p className="text-sm text-muted-foreground -mt-1 mb-4">
            Comparing one configuration only — every price below is for {variantLabel(selected)}.{' '}
            <Link
              to={clusterHref}
              state={{ from: origin }}
              data-testid="all-configurations"
              className="font-semibold text-teal-deep hover:underline"
            >
              Compare all configurations
            </Link>
            .
          </p>
        )}

        {facetChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {facetChips.map((chip) => (
              <Badge key={chip} variant="secondary" className="text-[11px] bg-teal/10 text-teal-deep border-primary/20">
                {chip}
              </Badge>
            ))}
          </div>
        )}

        {!cluster.comparison_grade && (
          <div className="flex items-start gap-2 rounded-lg ultra-border p-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            Accessory listings vary in exact model — treat this spread as a guide, not a like-for-like deal.
          </div>
        )}
        {cluster.data_warning && (
          <div className="flex items-start gap-2 rounded-lg ultra-border p-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            {cluster.data_warning}
          </div>
        )}

        {/* Honest two-tier price block */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-flex flex-col ultra-border">
          <p className="microcopy-label mb-0.5">
            {likelyUsed ? 'Lowest asking price (used/refurb)' : 'Best price (new)'}
          </p>
          <div className="flex items-end gap-3">
            <span className="price-num text-3xl font-bold text-foreground">{formatPrice(headlinePrice)}</span>
            {/* ⛔⛔ THE HEADLINE COUNT IS THE PRICED ONE. This read `across N shops` off
                `n_stores` — shops holding a LISTING — while the table below it renders only
                the shops that survived the engine's price gate. `Samsung Galaxy S23 Ultra`
                said 20 above a table with two rows in it.
                ⭐ In variant mode it is `rows.length` for the same reason one level down:
                a config has no served priced-count at all, so the only honest number is the
                length of the list directly beneath it. */}
            {rows.length > 0 && (
              <span className="text-sm text-muted-foreground mb-1">
                {comparedLabel(rows.length)}
              </span>
            )}
          </div>
          {/* ⭐ TWO COUNTS AND ONE EXPLANATION beats one silent number. The carried count is
              real and useful — it is why the product looks widely stocked — but it is not a
              comparison, and the gap is exactly what the trust warnings below describe. A card
              has no room for this; this page does. */}
          {/* ⛔ CLUSTER-ONLY. `n_stores` counts shops carrying the PRODUCT, not this
              configuration, so printing it above a variant's two rows would re-introduce the
              overstatement of defect #1 in a place the fix never looked. */}
          {!selected && cluster.n_stores != null && cluster.n_stores > cluster.n_stores_priced && (
            <p className="text-xs text-muted-foreground mt-1">
              Carried by {shopLabel(cluster.n_stores)} — the rest have no usable price right now
              (out of stock, delisted, or a used listing).
            </p>
          )}
          {spread != null && spread > 0 && (
            <p className="text-xs text-teal-deep mt-1">
              Prices for the same configuration vary up to {Math.round(spread)}% — comparing pays.
            </p>
          )}
          {!selected && !likelyUsed && cluster.likely_used_best_price != null && (cluster.n_likely_used ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Used/refurb asking from {formatPrice(cluster.likely_used_best_price)} ({cluster.n_likely_used} listings)
            </p>
          )}
        </div>

        {/* Store rows — real prices, real click-through */}
        <h2 className="text-lg font-semibold text-foreground mb-3">Price comparison</h2>
        {/* ⭐ A real list: these are N offers for one product, and the markup should say so.
            It also gives the render gate a stable hook to assert the card's "compared across N
            shops" against the rows actually shown — the check that catches the count drifting. */}
        <ul aria-label="Price comparison" className="space-y-3 mb-8 list-none p-0">
          {rows.map(([storeName, offer], idx) => (
            <OfferRow key={storeName} store={storeName} offer={offer} best={idx === 0} />
          ))}
        </ul>

        {/* ⭐ IN VARIANT MODE THE OTHER CONFIGURATIONS ARE A SWITCHER, NOT A LIST OF EXPANDERS.
            The shopper has already chosen one; what they need is to move sideways, or to step
            back up to the whole product. */}
        {selected && cluster.configs.length > 1 && (
          <section aria-label="Other configurations" className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">Other configurations</h2>
            <div className="flex flex-wrap gap-2">
              {cluster.configs.map((cfg, i) => {
                const key = facetKey(cfg);
                const href = variantHref(cluster.cluster_id, cfg);
                const isCurrent = key === facet;
                const label = variantLabel(cfg);
                if (isCurrent || !href) {
                  return (
                    <span
                      key={key ?? i}
                      aria-current={isCurrent ? 'page' : undefined}
                      className="rounded-lg px-3 py-2 text-sm font-semibold ultra-border
                                 bg-teal/10 text-teal-deep"
                    >
                      {label}
                    </span>
                  );
                }
                return (
                  <Link
                    key={key ?? i}
                    to={href}
                    state={{ from: origin }}
                    data-testid="variant-switch"
                    className="rounded-lg px-3 py-2 text-sm ultra-border hover:bg-gray-50
                               transition-colors"
                  >
                    <span className="font-semibold text-foreground">{label}</span>
                    <span className="text-muted-foreground">
                      {' '}from {formatPrice(cfg.best_price)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Per-configuration splits — only when the page's subject is the whole product. */}
        {!selected && cluster.configs.length > 1 && (
          <section aria-label="By configuration">
            <h2 className="text-lg font-semibold text-foreground mb-1">By configuration</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Like-for-like prices per variant — the honest comparison. The list above takes each
              shop's best offer whatever the variant, so it can put a 128GB price beside a 256GB
              one; these do not.
            </p>
            <div className="space-y-3">
              {cluster.configs.map((cfg, i) => (
                <VariantBlock
                  key={facetKey(cfg) ?? i}
                  config={cfg}
                  href={variantHref(cluster.cluster_id, cfg)}
                  origin={origin}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

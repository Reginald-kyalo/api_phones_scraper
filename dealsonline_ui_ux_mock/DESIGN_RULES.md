# SokoPulse design rules

**Product:** SokoPulse, Kenya's price comparison site. One job on every page: help a shopper find the real lowest price for the exact thing they want, and trust it.

**Stack:** React 18 + Vite + TypeScript, Tailwind CSS v4 (`@theme` in `src/styles/theme.css`), shadcn/Radix, react-router 7.

This file replaces the old `DESIGN_HANDOFF.md`. The reasoning behind each rule is in the frontend design review (project file `design/sokopulse-frontend-design-review.md`); this file is the contract. If code and this file disagree, fix the code or change this file in the same commit.

---

## 1. The three words

- **Neutral.** No shop or product is visually favoured. Every offer row has the same height, type and button. The price list is sorted by price and says so.
- **Quietly confident.** No exclamation marks, superlatives, red, countdowns or impossible percentages. Sentence case. Numbers do the talking: "KES 52,000 · 4 shops · checked 2 h ago".
- **Trustworthy.** Show the work: when a price was checked, which exact listing it is, what a percentage compares, how we rank, how we make money, and a way to report a problem. Say what the data holds and nothing it does not: a price is "listed", a difference is "lower", a saved number is "saved in this browser". (The 2026-10-21 design audit and copy deck in `docs/design-audit-2026-10-21/` are the reasoning behind this rule.)

---

## 2. Tokens

Use tokens, never raw palette classes (`gray-*`, `slate-*`, `emerald-*`, `red-*`, `amber-*`, `green-*`) or hex in components. `npm run check:design` fails on raw palette colours, stray shadows and arbitrary radii.

### Colour

| Token | Value | Meaning, and nothing else |
|---|---|---|
| `--ink` / `text-ink`, `text-foreground` | `#0C1416` | All text. The one near-black. |
| `--canvas-ink` / `bg-canvas-ink` | `#0A0F12` | Dark surfaces only (footer, trust block). |
| `--border` | `#DFE6E7` | 1px hairlines. |
| `--surface-alt` / `bg-surface-alt` | `#F4F7F7` | Image wells, alternate bands. |
| `--canvas-light` / `bg-canvas-light` | `#F8FAFA` | Hero card, sponsored surfaces. |
| `--muted-foreground` | `#5B6B6E` | Secondary text, labels. |
| `--primary` / `--teal` | `#0E7C8B` | **Action only:** primary buttons, links, focus ring, the selected filter. |
| `--teal-deep` | `#0A5C68` | Hover and pressed state of teal. |
| `--teal-bright` | `#2BC2D4` | Small accents on dark surfaces only. |
| `--saving` / `text-saving` | `#1F6B4A` | A price difference between shops. The `SavingBadge` chip and nothing else. |
| `--success` | `#16A34A` | In stock, confirmations. |
| `--warning` | `#B45309` | "Price changed since last check", caveats. |
| `--destructive` | `#DC2626` | Errors and destructive actions only. Never sale, urgency or favourites. |

Teal never means "good", "cheapest" or "discount". Green never means "action".

### Dark mode

Every colour above has a dark value under `.dark` in `theme.css`; components never pick a theme themselves. Use `bg-background` for page canvases, `bg-card` for cards and panels, `bg-popover` for floating menus and `bg-photo` (white in both themes) for product-photo frames. Never `bg-white`. The `.dark` class is set before first paint by the script in `index.html` (system setting, or the visitor's choice from the footer switch).

### Type

- **Space Grotesk** (`font-display`): headings.
- **Hanken Grotesk**: everything else.
- **JetBrains Mono** (`price-num`): prices and columns of numbers only. Not eyebrows, not counts in prose.
- Eyebrows and column headers: `.microcopy-label` (uppercase sans, 0.7rem, tracked). There is no second eyebrow style.
- Three heading sizes: the homepage search band's line (34px, homepage only), page title `.page-title` (28px), section `.section-title` (20px).

### Radius

- **6px** (`rounded-md`, `--radius`) for every card, button, input, chip, badge and panel.
- **8px** (`rounded-lg`) for big surfaces only: the homepage search band.
- `rounded-full` only for filter chips, avatars and the hero search field.
- Nothing larger. No `rounded-xl`, `rounded-2xl`, `rounded-[...]`.

### Shadow

Shadow means "floating and temporary". Two levels in the whole product:

| Class | Value | Use |
|---|---|---|
| `shadow-raised` | `0 4px 12px rgba(12,20,22,.08), 0 1px 2px rgba(12,20,22,.06)` | Menus, dropdowns, popovers, search suggestions, sticky bars. |
| `shadow-overlay` | `0 16px 40px rgba(12,20,22,.16)` | Modals, sheets, lightbox (with a dimmed backdrop). |

Everything resting on the page: a 1px border or nothing. No `shadow-sm` to `shadow-2xl` on cards.

### Content width

- `max-w-[1200px]` (`.page-container`) for listings and the product page.
- `max-w-[760px]` (`.prose-container`) for prose (legal, about, auth).

---

## 3. Interaction

- **One channel of feedback per hover.** A card changes its border colour (`.card-interactive`). Never border plus lift plus colour.
- **Timing:** 150ms ease-out, symmetric. Nothing slower than 200ms, no bounce.
- **Allowed on hover:** colour, border colour, opacity, transforms up to 2px. Never scale a card or an image.
- **Buttons darken, they do not glow.** No shadow on hover, no gradient.
- **Press state exists:** `active:translate-y-px` on buttons. Phone users only ever see this one.
- **Links inside sentences are underlined at rest** (a soft 40% underline that firms up on hover), so they are distinguishable without colour (WCAG 1.4.1). Standalone links (nav, "All deals") underline on hover only.

## 3a. Space and repetition

- **Every block earns its space by doing something**: searching, browsing, comparing or buying. No block exists to describe SokoPulse on pages a shopper is using; that lives in the FAQ, About and How we make money.
- **One control per job.** If the header, a sidebar and a chip row can all do the same thing on one screen, keep one: saved things have one header entry (My products); quick chips show only where the filter sidebar does not.
- **One breadcrumb trail**, from `Breadcrumbs` (`src/app/components/common/Breadcrumbs.tsx`): Home › department › category or shelf › brand. It is the hierarchy, built from the taxonomy, so every link resolves; never a shop's own ancestor names. "All categories" is not a step.
- **Category names are text links, not boxes.** A box per name was most of a category page and said nothing. Lists of categories are plain links with a muted count, in columns.
- **Say a fact once per view.** The product name already carries the brand, so cards and product titles have no brand eyebrow; the breadcrumb names the category.

## 4. Motion

- Animate data that changes (`CountUp` on a live price), not layout that loads.
- No orchestrated entrance moments. Everything renders at rest: no scroll-reveal anywhere.
- Skeletons in the exact shape of the content, never spinners for page loads. Reserve image heights so nothing shifts.
- Reduced motion is respected globally (`theme.css`).
- **Department icons are the one exception to "nothing slower than 200ms"**: on the homepage department strip, each icon acts out its subject once on hover or keyboard focus (the pot's lid lifts and closes, the pen writes its line, the drum turns), about 560ms, ease-out, never looping, and not at all under reduced motion. Scenes live in `src/styles/icon-motion.css`, one per department; a new department gets a scene there. Nowhere else animates icons.

---

## 5. Components with a contract

### Price-difference chip: `SavingBadge` (`src/app/components/common/SavingBadge.tsx`)

- The **only** way a price difference is shown. One icon (`ArrowDown`), one wording ("18% lower", with "than the highest matching price shown" for screen readers and in the tooltip), one colour (`text-saving` on `bg-saving/10`), one radius (6px). Never "Save 18%": it is a gap between two shops, not a discount from an earlier price.
- Its number comes from `displaySaving()` / `clusterSaving()` in `src/app/lib/format.ts`, which return `null` (render nothing) when:
  - there is no like-for-like spread, or fewer than two shops quote a price;
  - the difference is over **60%** (almost always a mismatched pair, not a deal);
  - the cash difference is under **KES 50**;
  - the listings are used or refurbished (`condition_basis === 'likely_used'`): asking prices of unknown grade are not two prices for one item.
- Cards show the chip only where the difference is the point (`showSaving`: the Deals rail and page). A neutral card shows product, version, condition, price and shop count. Condition always has its own row; it is never displaced by the chip.
- "All versions" on a product page mixes configurations, so it carries no chip.
- Never compute a percentage inline. Never render `like_for_like_spread_pct` or a config `spread_pct` to a shopper.

### Prices

- `formatPrice()` returns `null`-safe text; anything without a usable price renders `PriceOrDash` ("Price unavailable" in muted text, not mono). Never "No current price": the dataset lacking a price says nothing about the market.
- Shop counts come from one function: `pricedShopCount()` (`n_stores_priced`, falling back to `n_stores`). A product shows the same number everywhere.
- The headline on a product page names what the number is: "Lowest listed price" (several shops), "Listed price" (one), "Lowest asking price (used)", or "Last recorded price" when the last check is over `STALE_AFTER_DAYS` (30) old, decided at view time by `isStale()`. Never "Best price".
- Freshness: `checkedAgo()` is relative within 24 hours ("2 h ago") and a date after that ("18 Jul 2026"). A relative time reads as fresh, so it is only used while it is.
- One shop is one shop: "{shop}" or "1 listed shop", never "Only at {shop}".
- Price history draws only `usablePriceHistory()` (dated, positive, within 5x of the median), labels its figures "recorded", and a period with fewer than two records says so rather than widening silently. `priceVerdict()` counts 90 days back from today and returns null when the newest record is stale.

### Images

- Product photos are `object-contain` inside a fixed-ratio frame with 12px padding, so nothing overlaps the saving chip.
- Cards without a photo never appear on the homepage or deals page. In listings the default order ("Most shops") is the number of shops with a price, most first; a photo only breaks ties between equal counts. A six-shop product never sits behind a zero-shop one for want of a picture.

### Retailer identity

- `StoreMark` renders the shop's icon from `public/shop-icons/` (downloaded once by `scripts/fetch_shop_icons.py`; re-run after a re-capture), falling back to a neutral initial tile. One component on every offer row. No third-party request at view time.

### Sponsored slots: `AdSlot`, `SponsoredLabel`, `withSponsoredTiles` (`src/app/components/ads/AdSlot.tsx`)

Placements and reserved sizes live in `src/app/lib/ads.ts`: sponsored shop above the product price list, 300×250 product right rail (reserved, not rendered: see rule 4), sponsored tiles at grid positions 3 and 15, one result above search results, one featured-shop band after the second homepage rail. The homepage search band shows a campaign card on its right only when one is sold (`HERO_CAMPAIGNS`).

`VITE_AD_SLOTS=off` (the production default) renders nothing; `VITE_AD_SLOTS=preview` (the dev default) renders dashed, labelled placeholders at the reserved size.

1. Native in form (site card, radius, type), labelled "Sponsored" (or "Sponsored by {shop}" for a named campaign) in `.microcopy-label`, with an "About this ad" link to `/how-we-make-money`. Never a developer label ("Sponsored slot", dimensions) outside `VITE_AD_SLOTS=preview`.
2. Never inside the price-sorted list. A sponsored shop sits in its own card above the list.
3. Relevant or absent. A sponsored shop must sell the product it sits beside.
4. At most one paid element per viewport (roughly one per 8 to 12 organic cards). On the product page that is the sponsored-shop card; the right rail stays reserved in `ads.ts` but is not rendered, because the two sat in one 1440×1000 viewport together.
5. Fixed height reserved in the layout; an unsold slot renders nothing at build time, never collapses at runtime.
6. No pop-ups, interstitials, sticky overlay ads, autoplay, or anything between a product and its price.
7. Native slots take the site's tokens. Programmatic banners live only in fixed rectangles (300×600, 300×250, 320×100).

---

## 6. Copy

- Sentence case everywhere. Kenyan/British spelling (favourites, colour, organise).
- No superlatives and no promises we will break. Never write "no ads", "nothing to sell", "no commission", "we never…". Never "best", "every shop", "verified", "trusted", "real-time", "checked daily" or "we'll tell you" without the service or evidence behind it.
- Capability claims match the build. Favourites, price targets and comparisons are "saved in this browser"; no sync, email or monitoring is promised; the sign-in entry appears only while `ACCOUNT_AVAILABLE` is true; a success message follows a real successful action and nothing else.
- The money line (`MONEY_LINE` in `src/app/lib/brand.ts`), used verbatim on How we make money, in the FAQ and behind every "About this ad" link, and linked from the footer rather than repeated there:
  > Comparing prices on SokoPulse is free, and you buy directly from the shop you choose. Shops may pay us when you visit them through SokoPulse, and some may pay for spots labelled Sponsored. Neither changes the order of the price list, which is sorted by price. We don’t sell products ourselves.

  It states the model as built, not as contracts signed. When a shop actually pays, "may pay" becomes "pay" in that one file.
- Numbers with units and time: "KES 52,000 · 4 shops · checked 2 h ago".
- Never expose the pipeline: no "pending", "Needs review", "captured", "title similarity", "collections may contain mixed product types", or raw slugs. "How listings are matched" is the shopper's name for the merge explanation.
- A failed request, a successful empty result and a filter that excludes everything are three different messages: "We couldn't load … Try again.", "No … yet", "No products match these filters."
- One name per thing:

| Thing | Name |
|---|---|
| The site | SokoPulse (one word, capital S and P) |
| Search field | Search products and brands |
| Deals page | Deals ("Lower prices across shops") |
| Saved products | Favourites |
| A saved price, while nothing monitors it | Price targets ("Save target price"). Becomes "Price alerts" / "Set price alert" only when notifications are delivered. |
| Put products side by side | Compare products / Add to compare |
| Open a product's offers | View prices |
| Product page CTA | Go to shop |
| Breadcrumb root | Home |
| FAQ page | Help |
| Cookie page | Cookies and browser storage |
| Default listing order | Most shops |
| Across-shop gap | Price difference / "{n}% lower" |
| Report link | Report a problem |
| Departments | `departmentDisplayLabel()` in `src/app/lib/navLabels.ts`, the same name in the strip, both menus, the page title, breadcrumbs and the prerender |

- Error and empty states say what to do next, in one line, with one button.

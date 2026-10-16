# SokoPulse design rules

**Product:** SokoPulse, Kenya's price comparison site. One job on every page: help a shopper find the real lowest price for the exact thing they want, and trust it.

**Stack:** React 18 + Vite + TypeScript, Tailwind CSS v4 (`@theme` in `src/styles/theme.css`), shadcn/Radix, react-router 7.

This file replaces the old `DESIGN_HANDOFF.md`. The reasoning behind each rule is in the frontend design review (project file `design/sokopulse-frontend-design-review.md`); this file is the contract. If code and this file disagree, fix the code or change this file in the same commit.

---

## 1. The three words

- **Neutral.** No shop or product is visually favoured. Every offer row has the same height, type and button. The price list is sorted by price and says so.
- **Quietly confident.** No exclamation marks, superlatives, red, countdowns or impossible percentages. Sentence case. Numbers do the talking: "KES 52,000 · 4 shops · checked 2 h ago".
- **Trustworthy.** Show the work: when a price was checked, which exact listing it is, what a saving compares, how we rank, how we make money, and a way to report a wrong price.

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
| `--saving` / `text-saving` | `#1F6B4A` | Money saved. The saving chip and nothing else. |
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

### Saving chip: `SavingBadge` (`src/app/components/common/SavingBadge.tsx`)

- The **only** way a saving is shown. One icon (`ArrowDown`), one wording ("Save 18%"), one colour (`text-saving` on `bg-saving/10`), one radius (6px).
- Its number comes from `displaySaving()` in `src/app/lib/format.ts`, which returns `null` (render nothing) when:
  - there is no like-for-like spread;
  - the saving is over **60%** (almost always a mismatched pair, not a deal);
  - the absolute saving is under **KES 50**.
- Never compute a percentage inline. Never render `like_for_like_spread_pct` or a config `spread_pct` to a shopper.

### Prices

- `formatPrice()` returns `null`-safe text; anything that would read "Price N/A" in a price slot renders `PriceOrDash` instead ("No current price" in muted text, not mono).
- Shop counts come from one function: `pricedShopCount()` (`n_stores_priced`, falling back to `n_stores`). A product shows the same number everywhere.

### Images

- Product photos are `object-contain` inside a fixed-ratio frame with 12px padding, so nothing overlaps the saving chip.
- Cards without a photo never appear on the homepage or deals page, and sort below cards with photos elsewhere (`withPhotosFirst()`).

### Retailer identity

- `StoreMark` renders the shop's icon from `public/shop-icons/` (downloaded once by `scripts/fetch_shop_icons.py`; re-run after a re-capture), falling back to a neutral initial tile. One component on every offer row. No third-party request at view time.

### Sponsored slots: `AdSlot`, `SponsoredLabel`, `withSponsoredTiles` (`src/app/components/ads/AdSlot.tsx`)

Placements and reserved sizes live in `src/app/lib/ads.ts`: sponsored shop above the product price list, 300×250 product right rail (desktop), sponsored tiles at grid positions 3 and 15, one result above search results, one featured-shop band after the second homepage rail. The homepage search band shows a campaign card on its right only when one is sold (`HERO_CAMPAIGNS`).

`VITE_AD_SLOTS=off` (the production default) renders nothing; `VITE_AD_SLOTS=preview` (the dev default) renders dashed, labelled placeholders at the reserved size.

1. Native in form (site card, radius, type), labelled "Sponsored" in `.microcopy-label`, with a "Why is this here?" link to `/how-we-make-money`.
2. Never inside the price-sorted list. A sponsored shop sits in its own card above the list.
3. Relevant or absent. A sponsored shop must sell the product it sits beside.
4. At most one paid element per viewport (roughly one per 8 to 12 organic cards).
5. Fixed height reserved in the layout; an unsold slot renders nothing at build time, never collapses at runtime.
6. No pop-ups, interstitials, sticky overlay ads, autoplay, or anything between a product and its price.
7. Native slots take the site's tokens. Programmatic banners live only in fixed rectangles (300×600, 300×250, 320×100).

---

## 6. Copy

- Sentence case everywhere. Kenyan/British spelling (favourites, colour, organise).
- No superlatives and no promises we will break. Never write "no ads", "nothing to sell", "no commission", "we never…".
- The money line, used verbatim in the footer, the FAQ, How we make money and behind every "Why is this sponsored?" link:
  > Shops pay us a small fee when you click through to them, at no extra cost to you, and some pay for clearly labelled sponsored spots. Neither affects the order of the price list, which is always sorted by price. We never sell products ourselves.
- Numbers with units and time: "KES 52,000 · 4 shops · checked 2 h ago".
- Never expose the pipeline: no "pending", "Needs review", "captured", "collections may contain mixed product types", or raw slugs.
- One name per thing:

| Thing | Name |
|---|---|
| The site | SokoPulse (one word, capital S and P) |
| Deals page | Deals |
| Saved products | Favourites |
| Price alerts | Price alerts |
| Product page CTA | Go to shop |
| Breadcrumb root | Home |

- Error and empty states say what to do next, in one line, with one button.

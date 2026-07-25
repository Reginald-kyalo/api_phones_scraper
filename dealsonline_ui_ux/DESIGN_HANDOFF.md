# DealsOnline — Design System & Handoff

**Product:** DealsOnline — Kenya's independent price-comparison engine for tech & lifestyle goods (phones, computing, sound & vision, etc.). Mobile-first audience; the job of every page is to help a shopper *find the real lowest price and trust it*. We don't sell — we compare.

**Stack:** React 18 + Vite + TypeScript, Tailwind CSS **v4** (CSS-first `@theme`), shadcn/ui (Radix), `react-router`. Data via FastAPI at `/api` (Vite proxy → `localhost:10000`).

**Status:** The **homepage** is the reference implementation of the new identity. This document is the contract for taking that identity into the remaining pages (Browse/Category, Product detail, Comparison, Deals, Account, Auth, Legal).

---

## 1. Visual identity

The product must read **premium, confident, and grounded — never persuasive**. North star: Linear's restraint (quiet surfaces, immaculate type, one accent, generous space). Reference points captured in `../other_price_comparison_websites_designs/` (PriceRunner, PriceSpy).

### Palette (tokens in `src/styles/theme.css`)
Always use tokens — never hardcode hex in components.

| Token | Value | Use |
|---|---|---|
| `--primary` / `text-teal` `bg-teal` | `#0E7C8B` | brand, actions, "lowest/savings" on light |
| `--teal-bright` | `#2BC2D4` | accent / "lowest" on **dark** surfaces |
| `--teal-deep` | `#0A5C68` | hover/pressed; accent text on light (contrast-safe) |
| `--canvas-ink` | `#0A0F12` | dark surfaces (hero-dark, footer, CTA, dock) |
| `--ink` | `#0C1416` | premium near-black text |
| `--canvas-light` | `#F8FAFA` | light hero canvas |
| `--surface-alt` | `#f8fafc` | image wells, subtle bands |
| `--border` | `#e2e8f0` | hairlines (use `.ultra-border`) |
| `--destructive` | `#DC2626` | **only** genuine destructive actions (delete/sign-out) |

**No red as a brand/marketing color.** Discount/price-drop = **teal** (a down-arrow `▼`, not a red sale tag). "Price up" should be a muted neutral, never alarm-red.

### Typography (loaded in `src/styles/fonts.css`)
- **Display** (`--font-display`, headings, `.font-display`): **Space Grotesk**
- **Body** (`--font-family`, default): **Hanken Grotesk**
- **Prices & data** (`.price-num`): **JetBrains Mono**, tabular figures. Every price across the app must use `.price-num` — prices are the product's authoritative "data voice."
- Base size **16px**. Headings get `text-wrap: balance` + `-0.02em` tracking (set globally). Sentence case for headings/buttons (deliberate — premium, not shouty).

### Signature element — the **price-spread bar**
Lowest ●━━━━○ highest, with `Save KES X · Y%`. It's the literal embodiment of what the product does. Lives in the hero; **reuse it on the product page** (it's the natural hero of a product's pricing).

### Idioms / rules
- **Flat, border-only.** Use `.ultra-border` (1px hairline; hover = border-color + `surface-alt`). **No drop shadows, no scale/lift hovers on cards** (border-color change only). Shadows are reserved for floating overlays (hero phone, dock).
- **Microcopy:** `.microcopy-label` (uppercase, tracked, mono-ish) for category/brand/meta.
- **Currency:** always `formatPrice()` / `shopLabel()` from `src/app/lib/format.ts` (KES, guards junk < 1). Never hardcode `£`/`KES`.
- **Non-promotional:** generic product titles in decorative/marketing UI (e.g. "Wireless headphones", "4K OLED TV" — not "Sony WH-1000XM5"); **never name a specific store** in marketing surfaces (anonymize as bars). Real brand/store names are fine in *functional* data (actual product pages, the real comparison table).
- **Motion:** 150ms, `transform`/`opacity` only; global `prefers-reduced-motion` reset is in place.
- **Focus:** global `:focus-visible` teal ring — don't remove it; don't add `outline:none` without a replacement.

---

## 2. What's built (homepage)

Files under `src/app/`:

- **`components/layout/HeroSection.tsx`** — light contained hero (rounded-2xl), `variant: 'dark' | 'light'` (light is live; dark kept for reuse). Eyebrow (mono) → display headline → subcopy → in-hero `SearchBar` → trust line → **price-spread strip**. Right: a **generic phone** mock (narrow/tall, earpiece + gesture cue, **no notch/buttons/logo**) showing anonymized offer rows (redacted bars + `.price-num` prices, lowest in teal) that **clip+fade at the bottom edge** to imply more offers. Ambient teal glow.
- **`components/layout/CategoryStrip.tsx`** — full-width category nav; hairline-bordered icon tiles, teal hover, `lg:justify-between` (spans edge-to-edge on desktop), horizontal scroll on mobile.
- **`components/layout/HowItWorks.tsx`** — 3-step Search → Compare → Save trust band.
- **`components/layout/AlertsBanner.tsx`** — price-alerts feature banner (teal, faux alert card).
- **`components/layout/Footer.tsx`** — ink canvas, teal accent line, newsletter, link columns, `Logo variant="light"`.
- **`components/layout/Header.tsx`** — white sticky bar; header search hidden on homepage (hero owns it); "Deals" (teal, was red "Sale").
- **`components/layout/Logo.tsx`** — ink squircle + falling-price line + teal drop-dot; "Online" = `teal-deep` on light / `teal-bright` on dark (contrast).
- **`pages/HomePage.tsx`** — composition + two card types:
  - **`HomeProductCard`** (lean): image, title (`<p>`, not heading), `.price-num` price, struck original, shop count. Border-only hover.
  - **`DealCard`** (rich, **Top-deals rail only**): `▼ teal %` badge, mono price + struck original, `↓ Save KES X` line, shop count, and a **filled teal "View deal ↗"** button (darkens on hover). **Dual-link behavior:** the card body → our internal `/product/:id`; the **"View deal" button → the vendor's product page** (`vendorUrl`, `target="_blank"`, `rel="noopener noreferrer"`). They are siblings, not nested anchors.
- **`data/homepageMock.ts`** — DESIGN-PASS static data (real Klarna images, plausible KES). `TODO(wire-data)` markers throughout.

---

## 3. Skills & tooling used (and how)

| Skill / tool | Role here |
|---|---|
| **frontend-design** | Set the "distinctive, non-templated" bar; drove the identity brief (subject → palette → type → signature). |
| **ui-ux-pro-max** | Palette/type/style cross-checks (searchable DB; `scripts/search.py --domain …`). |
| **design-audit** | Ran the homepage audit → phased plan (Critical / Refinement / Polish) executed with review gates. |
| **typography** | Curly apostrophes, ellipses, tabular figures, `text-wrap: balance` on headings. |
| **web-design-guidelines** | Web Interface Guidelines review (forms, focus, decorative icons, semantics). |
| **accesslint** (`scan`) | WCAG gate against the live page. |
| **webapp-testing** / Playwright | DOM assertions + multi-viewport screenshots. |

**How to run the app + QA** (no Node Playwright/Puppeteer installed — use system Chrome):
```bash
# app
cd dealsonline_ui_ux && npm run dev            # :5173
apienv/bin/uvicorn app.main:app --port 10000 --host 127.0.0.1   # from repo root

# screenshots / DOM checks
google-chrome --headless --no-sandbox --window-size=1440,900 \
  --virtual-time-budget=9000 --screenshot=/tmp/x.png http://localhost:5173/
# Python Playwright: apienv/bin/python + launch(executable_path="/usr/bin/google-chrome")

# accessibility gate — IMPORTANT: scan the production build, not the dev server.
# (HMR churn gives stale/false a11y readings.)
npm run build && npx vite preview --port 4173 &
PORT=$(npx -y @accesslint/chrome@latest ensure | node -e 'process.stdin.on("data",d=>process.stdout.write(""+JSON.parse(d).port))')
npx -y @accesslint/cli@latest scan http://localhost:4173/ --port "$PORT" --wait-for "h1" --format json
```

---

## 4. QA status

- **accesslint (WCAG): 0 violations** on the production build. Fixed during this pass: struck-price contrast (`--price-old` → `#64748b`), `<button>` nested in `<a>` (→ `Button asChild`), inputs labelled by placeholder only (→ `aria-label`/`name`/`autocomplete`), h2→h4 heading skips (card titles → `<p>`), footer logo contrast on dark.
- **web-design-guidelines:** applied — semantic `type="search"`, form `name`/`autocomplete`, `aria-hidden` on decorative icons in the showcase components, icon-only hamburger `aria-label`, `text-wrap: balance`.
  - **Remaining (carry into each page as you build):** add `aria-hidden="true"` to **all** remaining decorative lucide icons (CategoryStrip, HowItWorks, AlertsBanner, Footer social SVGs, Header dropdown icons); add explicit `width`/`height` to `<img>` (aspect-containers currently prevent CLS, but explicit dims are preferred); consider `text-balance` already global.

---

## 5. Handoff — next sections

Build order: **Browse/Category → Product detail → Comparison → Deals → Account/Auth/Legal.**

**Apply the identity (don't reinvent):** import tokens, use `.ultra-border`, `.price-num` for every price, `formatPrice`, sentence-case headings, teal accents, border-only card hovers, the price-spread bar on the product page.

**Deferred items to resolve when you touch the relevant page:**
1. **Currency/price-font cascade (app-wide):** many components still print hardcoded `£` and use the body font for prices — `ProductCard`, `StoreComparisonList`, `PriceHistoryChart`, `PriceAlertRow`, `ComparisonPage`, `MyProductsPanel`, `ProductHero`. Route all through `formatPrice` + `.price-num`.
2. **Wire real data (replace `homepageMock`):** `trending` ← `getHomepageProducts()`; themed rails ← `getProducts(type,{sort:'stores-desc',minPrice})`; deal `vendorUrl` ← the lowest offer's real retailer URL.
3. **Backend "Top deals" curation** (`app/api/routes/pricerunner.py`): current deals are 0.1-priced junk; select real discounts.
4. **Content safety:** category top-products can surface **NSFW** items (e.g. `health_beauty`) — filter before display on any auto-populated surface.
5. **Functional vs marketing naming:** on real product/comparison pages, show real store names + logos (that's the actual service); keep anonymization only in decorative/marketing UI.

**Component reuse for Product detail:** `DealCard`'s dual-link pattern (internal detail vs external "View deal") and the price-spread bar are the two pieces most directly reusable. Split the large `PRProductDetailPage` per the existing feature components (`ProductHero`, `StoreComparisonList`, `ReviewSection`, `PriceHistoryChart`).

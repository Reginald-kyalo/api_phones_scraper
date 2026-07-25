# Homepage Design Audit & Plan

**Scope:** Homepage only (`pages/HomePage.tsx` + its layout components). Visual/UX only — see
[DESIGN_HANDOFF.md](DESIGN_HANDOFF.md) for the design system and [BEHAVIORAL_PRINCIPLES.md](BEHAVIORAL_PRINCIPLES.md)
for the *why*. Conducted with the `design-audit` skill methodology.

**Goal of this round:** elevate the homepage to a premium feel — edit the back half (which read
as a feed with stacked signup asks), add restrained motion to the explainer sections, and reframe
the closing moment around trust rather than account creation.

---

## Overall assessment

The hero is genuinely premium (confident type, the phone showcase, the price-spread signature).
Below the fold the page lost altitude: five visually identical rails, interrupted by three
separate "sign up / get alerts" asks, closing on a near-empty gradient asking for an account. The
bones are excellent — this round **edits**, it doesn't add.

---

## Decisions taken (this round)

| Topic | Decision | Status |
|---|---|---|
| Bottom gradient | **Trust close** (Direction #2) — keep the gradient, drop the account ask; close on "Independent · no ads · nothing to sell" + 3 proof points + a quiet "Browse all deals" link. Footer newsletter is the only email ask. | ✅ Implementing |
| Rail monotony | **Editorial rhythm** — a "Deal of the day" featured block + larger first-rail cards. **User flagged this as possibly-revert.** Kept isolated/easy to remove. | ✅ Implementing (revertable) |
| Discount badge | Unify on the `▼` teal-tint badge; retire the solid `.discount-badge` for product cards. | ✅ Implementing |
| Marketing naming | Anonymize the AlertsBanner product ("Sony WH-1000XM5" → "Wireless headphones"). | ✅ Implementing |
| Motion | Add restrained scroll-reveal + data animation to "How it works", the alert card, the hero spread bar, and the first rail. | ✅ Done |
| Mobile hero showcase | The phone is `hidden lg:flex` (desktop only). Added a **frameless `MobileOffers` card** (lg:hidden) so the "every offer, lowest in teal" signature reaches mobile/tablet without a phone-inside-a-phone. | ✅ Done |
| Motion bundle cost | `motion` bloated the HomePage chunk (~50KB gzip). Moved to **`LazyMotion` + `m`** (provider in `Root.tsx`); HomePage chunk → ~13.6KB gzip, motion now shared once app-wide. | ✅ Done |

---

## Motion budget (the answer to "to what extent?")

Capability exists (`motion` v12 + `tw-animate-css` installed; global `prefers-reduced-motion`
reset in `theme.css`). Policy, not capability, is the constraint:

| Motion type | Budget |
|---|---|
| Hover / interaction state | 150ms, `transform`/`opacity` only |
| Scroll-reveal entrance | 300–450ms, `opacity 0→1` + `translateY 8–12px`, ~70ms stagger, **once** |
| Data animation (bar fill, count-up) | 600–900ms ease-out, one-shot on first view |
| ❌ Forbidden | bounce/spring overshoot, parallax, looping/idle motion, scale-pop on cards, layout-shifting motion |

Everything must be `useReducedMotion()`-gated in addition to the global CSS reset.
Easing token: `--ease-out-premium: cubic-bezier(0.16, 1, 0.3, 1)`.

---

## Phased plan

### Phase 1 — Critical (consistency + the conversion-pressure problem)
1. **Bottom CTA stacking / account framing** → trust-close section (above).
2. **Discount badge inconsistency** → shared `<DiscountBadge>` (`▼` tint), used by both card types.
3. **Marketing surface names a real product** → anonymize AlertsBanner.

### Phase 2 — Refinement (rhythm + consistency)
4. **Rail monotony** → "Deal of the day" featured block + larger first rail (revertable).
5. **Heading hierarchy drift** → one section-title scale (`text-xl md:text-2xl`, 700, `-0.02em`).
6. **Category label vs rail-title mismatch** → `computing` strip label "Electronics" → "Computing".
7. **Mobile hero showcase desktop-only** → *deferred, needs sign-off.*

### Phase 3 — Polish (motion)
8. **How it works** → staggered scroll-reveal of the three steps.
9. **Never overpay alert card** → on reveal, demonstrate a price drop (strike old → count down to
   target → "Price dropped" pill).
10. **Hero price-spread bar** → draws/fades in on load.
11. **First rail** → cards reveal in a gentle stagger on first view.

---

## New design-system additions (this round)

- **Motion tokens** in `theme.css`: `--ease-out-premium`, `--motion-micro/reveal/data`,
  `--motion-stagger`.
- **`Reveal` / `RevealItem` / `CountUp`** helpers in `components/common/Reveal.tsx` (wrap `motion`
  + `useReducedMotion`). Reusable across future pages.
- **`<DiscountBadge>`** — the single discount token (`▼` teal tint). Retires `.discount-badge`.
- **`FeaturedDeal`** — "Deal of the day" block; reuses the price-spread bar pattern.

---

## Deferred / flagged for later

- **Mobile hero showcase** (condensed phone vs strengthened price-spread) — needs a decision.
- **Wire real data** for rails + featured deal (currently `homepageMock`); add skeletons
  (`ProductCardSkeleton`) and empty states. (Tracked in DESIGN_HANDOFF §5.)
- **Currency/price-font cascade** app-wide (DESIGN_HANDOFF §5.1).

---

## Revert notes

- The **editorial rhythm** (Deal of the day + larger first rail) is the user-flagged revert
  candidate. It's isolated to: the `FeaturedDeal` component + the `large` prop on `DealCard`/`Rail`
  + one block in `HomePage.tsx`. Removing those three restores the prior all-equal-rails layout.

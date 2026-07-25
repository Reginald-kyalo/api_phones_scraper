# DealsOnline — Behavioral Design Principles

**Purpose:** This is the *why* behind the design. [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md) records
what the interface looks like and which tokens to use; this document records the human-behavior
reasoning that decides what we build and how we frame it. When a future page raises a "should we
ask for X here?" or "how do we phrase this CTA?" question, the answer lives here.

These principles are derived from established UX heuristics (the `ui-ux-pro-max` 99-guideline DB,
the `design-audit` design-principles, and the Web Interface Guidelines) and adapted to *our*
product: an **independent, mobile-first price-comparison engine for Kenya**. Our entire value
proposition is **trust** — we don't sell, we don't take commissions, we don't run ads. Every
behavioral decision must protect that trust.

---

## The one thing to remember

> **Trust is the product. Friction is the enemy. Let every action be the user's idea.**

If a design choice trades away trust for a conversion, it's wrong — even if it converts. We are
the calm, honest alternative to retailer marketing. The interface must feel like it's on the
user's side.

---

## 1. Friction & motivation — never make an account the price of entry

**Principle:** People resist signing up. An account is a *cost* to the user (effort, privacy,
commitment) with a benefit that's often abstract at the moment of asking. Self-Determination
Theory: people act when the action is *their* idea and the benefit is concrete and immediate.

**How we apply it:**
- The core service — search, compare, see the lowest price — requires **no account, ever**.
- Never lead a CTA with "Create an account." Lead with the *benefit the user already wants*
  ("Watch this price", "Tell me when it drops"). If an account is needed, create it *silently*
  on the first valuable action, framed as a consequence, not a gate.
- "Free" is stated as reassurance ("always free, no account needed"), never as bait.

**Where it shows on the homepage:** we removed the "Create free account" closing CTA — it asked
for commitment at the lowest-intent moment (end of page) and framed the account as the goal. The
page now closes on trust, not a signup.

**See also:** §3 (one ask per moment), §5 (trust as the product).

---

## 2. Loss aversion beats gain framing

**Principle:** People feel a loss roughly twice as strongly as an equivalent gain (Kahneman &
Tversky). "Don't lose money you didn't have to" motivates more than "save money."

**How we apply it:**
- Price-alert and deal messaging is framed as *avoiding a loss*: **"Never overpay"**, **"Never
  miss a price drop"** — not "Save up to X%."
- The price-spread bar makes the loss visceral: the gap between the lowest and highest price *is*
  the money the user would lose by not comparing.

**Where it shows:** the AlertsBanner headline ("Never overpay again") and the hero's
"Save KES X · Y%" spread. Keep this framing on the product and comparison pages.

---

## 3. One ask per moment (the isolation / Von Restorff effect)

**Principle:** A single, isolated call-to-action gets noticed and acted on. Stack three asks and
users learn to ignore all of them ("banner blindness"). Competing CTAs flatten hierarchy —
*if everything is bold, nothing is bold.*

**How we apply it:**
- Each screen has **one** primary action. Secondary actions are visibly quieter.
- We don't repeat the same conversion ask in multiple sections of one page.

**Where it shows:** the homepage previously closed with three capture asks in a row (price alert
→ create account → newsletter). We cut it to one *email* ask (the footer newsletter), and the
page body now ends on trust with a single quiet "Browse all deals" link.

---

## 4. Show, don't tell

**Principle:** A demonstration is processed faster and trusted more than a description. People
believe what they watch happen more than what they're told.

**How we apply it:**
- Explain the product by *animating it doing its job*, not with paragraphs.
- Motion is in service of comprehension, never decoration (see [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md)
  motion rules and [HOMEPAGE_AUDIT.md](HOMEPAGE_AUDIT.md) for the motion budget).

**Where it shows:**
- "How DealsOnline works" reveals as a narrated Search → Compare → Save sequence.
- The "Never overpay" alert card animates a real price drop (old price strikes through, the new
  price counts down to target, "Price dropped" appears) — it demonstrates the value in ~1 second.

---

## 5. Trust as the product — make independence loud, not buried

**Principle:** For a comparison engine, *perceived neutrality* is the entire moat. Users assume
"comparison" sites are paid placement until proven otherwise. Stating independence plainly, and
repeatedly, is the highest-leverage persuasion we have.

**How we apply it:**
- "Independent · no ads · nothing to sell" appears in the hero, recurs through the page, and is
  the page's **closing statement** (it earns the most colorful moment on the page — the gradient).
- Rankings are by price; we never imply pay-to-rank. In marketing/decorative UI we **anonymize
  stores** (a redacted bar, not a logo) so no retailer appears to get free promotion. Real store
  names appear only in *functional* data (actual product/comparison pages).

**Where it shows:** the hero eyebrow, the footer statement, and the new trust-close section.

---

## 6. Reduce choice load at decision points (Hick's Law)

**Principle:** Decision time grows with the number and complexity of options. Too many choices at
once causes hesitation and abandonment.

**How we apply it:**
- The homepage *curates* rather than dumps: a single "Deal of the day", then focused rails — not
  an undifferentiated wall of products.
- Category navigation stays scannable; we don't surface every filter up front.

**Where it shows:** the editorial structure (one featured deal → curated rails) instead of five
identical product walls.

---

## 7. Honesty in microcopy and signals

**Principle:** Dark patterns (fake urgency, fake scarcity, alarm-red "SALE" tags, confirmshaming)
erode the trust that is our whole product. Short-term lift, long-term loss.

**How we apply it:**
- **No alarm-red marketing.** A price drop is **teal with a `▼`**, calm and factual — never a
  red "SALE" tag. Red is reserved for genuinely destructive actions only.
- No countdown timers, no "3 people viewing", no "limited stock" unless it's literally true and
  sourced.
- Decline copy is neutral, never guilt-tripping.

**Where it shows:** the unified `▼`-style discount badge across all cards; teal everywhere a
retailer would use red.

---

## 8. Respect the user's context — mobile-first, motion-optional, fast

**Principle:** Our audience is mobile-first and may be on constrained connections/devices. A
premium feeling is *calm and responsive*, not heavy and flashy.

**How we apply it:**
- Design for thumbs first; every screen must feel intentional at mobile, not just resized.
- All motion is `prefers-reduced-motion`-gated and `transform`/`opacity` only; nothing blocks
  reading or interaction. Animations run **once**, never loop.
- Never trade load time or interactivity for visual flourish.

---

## How to use this document

When designing a new page or section, ask in order:
1. **Does this protect trust?** (§5, §7) — if not, stop.
2. **Is there exactly one primary action, framed as the user's benefit?** (§1, §3)
3. **Are we showing value or just describing it?** (§4)
4. **Have we reduced the choices at this decision point?** (§6)
5. **Does it hold up on mobile, with reduced motion, on a slow connection?** (§8)

Update this file when a new behavioral decision is made — record the decision *and the reasoning*,
not just the outcome.

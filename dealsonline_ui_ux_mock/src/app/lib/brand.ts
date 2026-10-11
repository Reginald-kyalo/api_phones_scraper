/**
 * Brand constants. One place to change the name, domain and contact address.
 *
 * ⚠️ The domain and support address are placeholders until the SokoPulse
 * domain is registered; nothing else in the app hard-codes them.
 */
export const BRAND = {
  name: 'SokoPulse',
  domain: 'sokopulse.co.ke',
  url: 'https://sokopulse.co.ke',
  supportEmail: 'support@sokopulse.co.ke',
} as const;

/**
 * The money line (DESIGN_RULES.md §6). Used verbatim in How it works, the
 * footer, the homepage trust block and behind every "Why is this sponsored?"
 * link, so the claim can only ever be changed in one place.
 */
export const MONEY_LINE =
  'Shops pay us a small fee when you click through to them, at no extra cost to you, and some pay for clearly labelled sponsored spots. Neither affects the order of the price list, which is always sorted by price. We never sell products ourselves.';

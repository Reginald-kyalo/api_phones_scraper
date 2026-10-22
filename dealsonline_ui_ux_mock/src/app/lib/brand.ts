/**
 * Brand constants. One place to change the name, domain and contact address.
 *
 * ⚠️ The domain and support address are placeholders until the SokoPulse
 * domain is registered and the mailbox exists. Nothing else in the app
 * hard-codes them, so a real address is a one-line change here. Until then
 * the address is shown as text on Contact only, and never promised a reply.
 */
export const BRAND = {
  name: 'SokoPulse',
  domain: 'sokopulse.co.ke',
  url: 'https://sokopulse.co.ke',
  supportEmail: 'support@sokopulse.co.ke',
} as const;

/**
 * The money line (DESIGN_RULES.md §6): the one statement of how SokoPulse
 * is paid for. Used verbatim on How we make money, in the FAQ and behind
 * every "About this ad" link, so the claim can only ever change here.
 *
 * It states the model as it is built, not as a contract: no shop pays
 * anything yet, so "may pay" is the accurate verb. The ranking promise is
 * enforced in code (AdSlot never renders inside the price list). Nothing
 * here claims a saving for the shopper: comparing is free, and the price
 * they pay is set by the shop.
 */
export const MONEY_LINE =
  'Comparing prices on SokoPulse is free, and you buy directly from the shop you choose. Shops may pay us when you visit them through SokoPulse, and some may pay for spots labelled Sponsored. Neither changes the order of the price list, which is sorted by price. We don’t sell products ourselves.';

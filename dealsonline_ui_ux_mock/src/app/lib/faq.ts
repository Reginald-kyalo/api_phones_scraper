/**
 * Frequently asked questions: /faq, its prerendered page and its FAQPage
 * structured data all read this list, so the answers exist in one place.
 * Plain text only (the structured data cannot carry markup). Numbers and
 * claims must stay true: shop counts come from the dataset, never a guess.
 */
import { MONEY_LINE } from './brand';

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is SokoPulse?',
    a: 'SokoPulse is a price comparison site for Kenya. We show what the same product costs at each shop, sorted by price, so you can see the cheapest one before you buy. We don’t sell anything ourselves.',
  },
  {
    q: 'How does it work?',
    a: 'We read the listings of Kenyan shops, match the same product across them, and put every price in one list, cheapest first. Each row shows the shop’s own listing title and when we last checked it, so you can confirm the match yourself.',
  },
  {
    q: 'Is SokoPulse free?',
    a: 'Yes. Comparing prices is free and needs no account. Favourites and price alerts are free too.',
  },
  {
    q: 'How does SokoPulse make money?',
    a: MONEY_LINE,
  },
  {
    q: 'Is the price on SokoPulse what I’ll pay at checkout?',
    a: 'Not always. The shop may add delivery, run out of stock or change the price after our last check. Each price shows when we last checked it; confirm the final total on the shop’s page before you pay.',
  },
  {
    q: 'What should I check before I buy?',
    a: 'Make sure the listing is the exact model, size and colour you want, then on the shop’s page check the final price, the delivery fee and time, how you can pay, and the return policy. For phones and electronics, also check the warranty and whether it is a local or imported unit.',
  },
  {
    q: 'Which shops do you compare?',
    a: 'Kenyan online shops and supermarkets, from Jumia, Kilimall, Carrefour and Naivas to specialist phone and electronics shops. Each product page lists every shop we found selling it.',
  },
  {
    q: 'Why is the same product cheaper at one shop?',
    a: 'Each shop sets its own prices, promotions and delivery fees, and buys stock from different suppliers. For phones, a lower price can also mean a different warranty or an imported unit, so read the listing.',
  },
  {
    q: 'How often are prices updated?',
    a: 'We check prices regularly, and every product page shows when each price was last checked, down to the minute.',
  },
  {
    q: 'I found a wrong price or a wrong match. What do I do?',
    a: 'Use “Report a wrong price or match” on the product page, or email us. We read every report.',
  },
];

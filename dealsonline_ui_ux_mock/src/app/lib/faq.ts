/**
 * Help (/faq): the page, its prerendered copy and its FAQPage structured data
 * all read this list, so the answers exist in one place. Plain text only (the
 * structured data cannot carry markup).
 *
 * Every answer describes what the site does today. Nothing here promises a
 * check schedule, a notification, a reply to a report or a shop we do not
 * list; those sentences return when the service behind them exists.
 */
import { MONEY_LINE } from './brand';

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is SokoPulse?',
    a: 'SokoPulse is a price comparison website for Kenyan shoppers. It brings together shop listings for the same product, sorted by price, to help you choose where to buy.',
  },
  {
    q: 'Do I buy from SokoPulse?',
    a: 'No. You buy directly from the shop you choose. That shop handles payment, delivery, returns and warranty questions.',
  },
  {
    q: 'Is it free to compare prices?',
    a: 'Yes. You can search and compare prices without paying or creating an account.',
  },
  {
    q: 'Which shops are included?',
    a: 'Each product page names the shops with listings for that product. We compare the shops in our catalogue; we do not cover every shop or every product.',
  },
  {
    q: 'Are the prices current?',
    a: 'Check the date beside each price. Prices and availability can change after that check, so confirm the final total on the shop’s page before you pay.',
  },
  {
    q: 'Does the price include delivery?',
    a: 'Delivery is included only where the shop says so. Confirm the final total, including delivery, with the shop.',
  },
  {
    q: 'Why do prices differ between shops?',
    a: 'Shops set their own prices. Listings can also differ in version, pack size, condition or warranty, so check those details on each shop’s listing.',
  },
  {
    q: 'What does “12% lower” mean?',
    a: 'It compares the lowest and highest matching prices shown on SokoPulse for the same version. It is a difference between shops, not a reduction from an earlier price.',
  },
  {
    q: 'What should I check before buying?',
    a: 'Check the exact product, its condition, the final price, delivery terms and the return policy. For phones and electronics, also check the warranty and whether it is a local or imported unit.',
  },
  {
    q: 'How are listings matched?',
    a: 'We group listings using product details. Similar names can refer to different versions, sizes or pack quantities, so each product page shows each shop’s own listing title for you to check.',
  },
  {
    q: 'Can I save products?',
    a: 'Yes. Use Save on a product page to add it to Favourites in this browser. Clearing your browser’s site data removes saved items.',
  },
  {
    q: 'Will you send me a price alert?',
    a: 'Not yet. Price targets are saved in this browser and shown on the product page and in My products. They do not send notifications.',
  },
  {
    q: 'How does SokoPulse make money?',
    a: MONEY_LINE,
  },
  {
    q: 'How do I report a wrong price or match?',
    a: 'Use Report a problem on the product page and choose what is wrong.',
  },
  {
    q: 'Who can help with my order?',
    a: 'Contact the shop you bought from, using the details in your order confirmation.',
  },
];

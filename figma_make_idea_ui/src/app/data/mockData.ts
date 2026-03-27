// Mock data for the price comparison platform

export interface Retailer {
  id: string;
  name: string;
  logo?: string;
}

export interface PriceData {
  retailerId: string;
  retailerName: string;
  price: number;
  inStock: boolean;
  url: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  helpful: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  images: string[];
  brand: string;
  rating: number;
  reviewCount: number;
  prices: PriceData[];
  discount?: number;
  specifications: { [key: string]: string };
  reviews: Review[];
  priceHistory: { date: string; price: number }[];
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  dealCount: number;
}

export const retailers: Retailer[] = [
  { id: 'jb', name: 'JB Hi-Fi' },
  { id: 'noel', name: 'Noel Leeming' },
  { id: 'harvey', name: 'Harvey Norman' },
  { id: 'pbtech', name: 'PB Tech' },
  { id: 'warehouse', name: 'The Warehouse' },
  { id: 'mighty', name: 'Mighty Ape' },
];

export const categories: Category[] = [
  { id: 'phones', name: 'Phones', emoji: '📱', dealCount: 45 },
  { id: 'laptops', name: 'Laptops', emoji: '💻', dealCount: 32 },
  { id: 'cosmetics', name: 'Cosmetics', emoji: '💄', dealCount: 28 },
  { id: 'shoes', name: 'Shoes', emoji: '👟', dealCount: 38 },
  { id: 'sound', name: 'Sound Systems', emoji: '🔊', dealCount: 24 },
  { id: 'cameras', name: 'Cameras', emoji: '📷', dealCount: 19 },
];

export const products: Product[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro 256GB Midnight Black',
    category: 'phones',
    brand: 'Apple',
    image: 'https://images.unsplash.com/photo-1696446702782-8538a0d1e3f7?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1696446702782-8538a0d1e3f7?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1592286927505-b0c4d0ca1b91?w=800&h=800&fit=crop',
    ],
    rating: 4.5,
    reviewCount: 234,
    discount: 15,
    prices: [
      { retailerId: 'jb', retailerName: 'JB Hi-Fi', price: 1699.99, inStock: true, url: '#' },
      { retailerId: 'noel', retailerName: 'Noel Leeming', price: 1749.00, inStock: true, url: '#' },
      { retailerId: 'harvey', retailerName: 'Harvey Norman', price: 1799.99, inStock: true, url: '#' },
      { retailerId: 'pbtech', retailerName: 'PB Tech', price: 1729.99, inStock: false, url: '#' },
    ],
    specifications: {
      'Screen': '6.1" OLED Super Retina XDR',
      'Processor': 'A17 Pro chip',
      'Camera': '48MP Main + 12MP Ultra Wide + 12MP Telephoto',
      'Storage': '256GB',
      'Battery': 'Up to 23 hours video playback',
      'Color': 'Midnight Black',
      'Weight': '187g',
      '5G': 'Yes',
    },
    reviews: [
      { id: 'r1', author: 'Sarah M.', rating: 5, date: '2026-03-05', text: 'Amazing phone! The camera quality is outstanding and the battery lasts all day.', helpful: 45 },
      { id: 'r2', author: 'James T.', rating: 4, date: '2026-03-01', text: 'Great performance but quite expensive. Worth it if you can afford it.', helpful: 32 },
      { id: 'r3', author: 'Emma L.', rating: 5, date: '2026-02-28', text: 'Best iPhone yet. The titanium build feels premium.', helpful: 28 },
    ],
    priceHistory: [
      { date: '2026-02-08', price: 1899 },
      { date: '2026-02-15', price: 1850 },
      { date: '2026-02-22', price: 1799 },
      { date: '2026-03-01', price: 1750 },
      { date: '2026-03-08', price: 1699 },
    ],
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra 512GB',
    category: 'phones',
    brand: 'Samsung',
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop',
    ],
    rating: 4.7,
    reviewCount: 189,
    discount: 20,
    prices: [
      { retailerId: 'jb', retailerName: 'JB Hi-Fi', price: 1899.99, inStock: true, url: '#' },
      { retailerId: 'noel', retailerName: 'Noel Leeming', price: 1949.00, inStock: true, url: '#' },
      { retailerId: 'pbtech', retailerName: 'PB Tech', price: 1879.99, inStock: true, url: '#' },
    ],
    specifications: {
      'Screen': '6.8" Dynamic AMOLED 2X',
      'Processor': 'Snapdragon 8 Gen 3',
      'Camera': '200MP Main + 50MP Periscope + 12MP Ultra Wide',
      'Storage': '512GB',
      'Battery': '5000mAh',
      'S Pen': 'Included',
    },
    reviews: [
      { id: 'r4', author: 'Mike P.', rating: 5, date: '2026-03-06', text: 'The S Pen is incredibly useful for note-taking!', helpful: 38 },
    ],
    priceHistory: [
      { date: '2026-02-08', price: 2199 },
      { date: '2026-02-15', price: 2099 },
      { date: '2026-02-22', price: 1999 },
      { date: '2026-03-01', price: 1949 },
      { date: '2026-03-08', price: 1879 },
    ],
  },
  {
    id: '3',
    name: 'MacBook Pro 14" M3 Pro 18GB 512GB',
    category: 'laptops',
    brand: 'Apple',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=800&fit=crop',
    ],
    rating: 4.8,
    reviewCount: 312,
    discount: 10,
    prices: [
      { retailerId: 'jb', retailerName: 'JB Hi-Fi', price: 3299.99, inStock: true, url: '#' },
      { retailerId: 'noel', retailerName: 'Noel Leeming', price: 3399.00, inStock: true, url: '#' },
      { retailerId: 'pbtech', retailerName: 'PB Tech', price: 3249.99, inStock: true, url: '#' },
    ],
    specifications: {
      'Display': '14.2" Liquid Retina XDR',
      'Processor': 'Apple M3 Pro chip',
      'RAM': '18GB Unified Memory',
      'Storage': '512GB SSD',
      'Battery': 'Up to 18 hours',
      'Ports': '3x Thunderbolt 4, HDMI, SD card',
    },
    reviews: [
      { id: 'r5', author: 'David K.', rating: 5, date: '2026-03-07', text: 'Perfect for video editing. The M3 Pro handles 4K footage effortlessly.', helpful: 67 },
    ],
    priceHistory: [
      { date: '2026-02-08', price: 3499 },
      { date: '2026-02-15', price: 3449 },
      { date: '2026-02-22', price: 3399 },
      { date: '2026-03-01', price: 3299 },
      { date: '2026-03-08', price: 3249 },
    ],
  },
  {
    id: '4',
    name: 'Dell XPS 15 i9 32GB 1TB RTX 4060',
    category: 'laptops',
    brand: 'Dell',
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=800&fit=crop',
    ],
    rating: 4.6,
    reviewCount: 156,
    prices: [
      { retailerId: 'pbtech', retailerName: 'PB Tech', price: 2899.99, inStock: true, url: '#' },
      { retailerId: 'harvey', retailerName: 'Harvey Norman', price: 2999.99, inStock: true, url: '#' },
    ],
    specifications: {
      'Display': '15.6" 4K OLED Touch',
      'Processor': 'Intel Core i9-13900H',
      'RAM': '32GB DDR5',
      'Storage': '1TB NVMe SSD',
      'Graphics': 'NVIDIA RTX 4060 8GB',
    },
    reviews: [],
    priceHistory: [
      { date: '2026-02-08', price: 3199 },
      { date: '2026-02-15', price: 3099 },
      { date: '2026-02-22', price: 2999 },
      { date: '2026-03-01', price: 2949 },
      { date: '2026-03-08', price: 2899 },
    ],
  },
  {
    id: '5',
    name: 'Dior Forever Foundation 30ml',
    category: 'cosmetics',
    brand: 'Dior',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop',
    ],
    rating: 4.4,
    reviewCount: 89,
    discount: 25,
    prices: [
      { retailerId: 'warehouse', retailerName: 'The Warehouse', price: 89.99, inStock: true, url: '#' },
      { retailerId: 'mighty', retailerName: 'Mighty Ape', price: 94.99, inStock: true, url: '#' },
    ],
    specifications: {
      'Size': '30ml',
      'Coverage': 'Medium to Full',
      'Finish': 'Matte',
      'SPF': 'SPF 15',
      'Shades': '40+ shades available',
    },
    reviews: [],
    priceHistory: [
      { date: '2026-02-08', price: 99 },
      { date: '2026-02-15', price: 95 },
      { date: '2026-02-22', price: 92 },
      { date: '2026-03-01', price: 90 },
      { date: '2026-03-08', price: 89 },
    ],
  },
  {
    id: '6',
    name: 'Nike Air Max 270 Running Shoes',
    category: 'shoes',
    brand: 'Nike',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop',
    ],
    rating: 4.3,
    reviewCount: 201,
    discount: 30,
    prices: [
      { retailerId: 'warehouse', retailerName: 'The Warehouse', price: 179.99, inStock: true, url: '#' },
      { retailerId: 'mighty', retailerName: 'Mighty Ape', price: 189.99, inStock: true, url: '#' },
      { retailerId: 'jb', retailerName: 'JB Hi-Fi', price: 199.99, inStock: false, url: '#' },
    ],
    specifications: {
      'Material': 'Mesh upper with synthetic overlays',
      'Cushioning': 'Max Air unit',
      'Sizes': 'US 7-13',
      'Colors': 'Multiple colorways available',
    },
    reviews: [],
    priceHistory: [
      { date: '2026-02-08', price: 229 },
      { date: '2026-02-15', price: 209 },
      { date: '2026-02-22', price: 199 },
      { date: '2026-03-01', price: 189 },
      { date: '2026-03-08', price: 179 },
    ],
  },
  {
    id: '7',
    name: 'Sony WH-1000XM5 Wireless Headphones',
    category: 'sound',
    brand: 'Sony',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=800&fit=crop',
    ],
    rating: 4.9,
    reviewCount: 445,
    discount: 18,
    prices: [
      { retailerId: 'jb', retailerName: 'JB Hi-Fi', price: 449.99, inStock: true, url: '#' },
      { retailerId: 'noel', retailerName: 'Noel Leeming', price: 469.00, inStock: true, url: '#' },
      { retailerId: 'harvey', retailerName: 'Harvey Norman', price: 479.99, inStock: true, url: '#' },
      { retailerId: 'pbtech', retailerName: 'PB Tech', price: 459.99, inStock: true, url: '#' },
    ],
    specifications: {
      'Type': 'Over-ear wireless',
      'Noise Cancellation': 'Industry-leading ANC',
      'Battery': 'Up to 30 hours',
      'Connectivity': 'Bluetooth 5.2, multipoint',
      'Voice Assistant': 'Alexa & Google Assistant',
    },
    reviews: [],
    priceHistory: [
      { date: '2026-02-08', price: 499 },
      { date: '2026-02-15', price: 489 },
      { date: '2026-02-22', price: 479 },
      { date: '2026-03-01', price: 469 },
      { date: '2026-03-08', price: 449 },
    ],
  },
  {
    id: '8',
    name: 'Canon EOS R6 Mark II Mirrorless Camera',
    category: 'cameras',
    brand: 'Canon',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=800&fit=crop',
    ],
    rating: 4.8,
    reviewCount: 78,
    prices: [
      { retailerId: 'noel', retailerName: 'Noel Leeming', price: 3799.00, inStock: true, url: '#' },
      { retailerId: 'harvey', retailerName: 'Harvey Norman', price: 3899.99, inStock: true, url: '#' },
      { retailerId: 'pbtech', retailerName: 'PB Tech', price: 3749.99, inStock: true, url: '#' },
    ],
    specifications: {
      'Sensor': '24.2MP Full-frame CMOS',
      'Video': '4K 60p',
      'Autofocus': 'Dual Pixel CMOS AF II',
      'ISO Range': '100-102400',
      'Image Stabilization': '5-axis in-body IS',
    },
    reviews: [],
    priceHistory: [
      { date: '2026-02-08', price: 3999 },
      { date: '2026-02-15', price: 3899 },
      { date: '2026-02-22', price: 3849 },
      { date: '2026-03-01', price: 3799 },
      { date: '2026-03-08', price: 3749 },
    ],
  },
  {
    id: '9',
    name: 'Adidas Ultraboost 23 Running Shoes',
    category: 'shoes',
    brand: 'Adidas',
    image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop',
    ],
    rating: 4.5,
    reviewCount: 167,
    discount: 22,
    prices: [
      { retailerId: 'warehouse', retailerName: 'The Warehouse', price: 219.99, inStock: true, url: '#' },
      { retailerId: 'mighty', retailerName: 'Mighty Ape', price: 229.99, inStock: true, url: '#' },
    ],
    specifications: {
      'Cushioning': 'Boost midsole',
      'Upper': 'Primeknit',
      'Outsole': 'Continental rubber',
      'Weight': '310g (US 9)',
    },
    reviews: [],
    priceHistory: [
      { date: '2026-02-08', price: 269 },
      { date: '2026-02-15', price: 249 },
      { date: '2026-02-22', price: 239 },
      { date: '2026-03-01', price: 229 },
      { date: '2026-03-08', price: 219 },
    ],
  },
  {
    id: '10',
    name: 'Google Pixel 8 Pro 256GB',
    category: 'phones',
    brand: 'Google',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=800&fit=crop',
    ],
    rating: 4.6,
    reviewCount: 143,
    discount: 12,
    prices: [
      { retailerId: 'jb', retailerName: 'JB Hi-Fi', price: 1399.99, inStock: true, url: '#' },
      { retailerId: 'noel', retailerName: 'Noel Leeming', price: 1449.00, inStock: true, url: '#' },
      { retailerId: 'pbtech', retailerName: 'PB Tech', price: 1389.99, inStock: true, url: '#' },
    ],
    specifications: {
      'Screen': '6.7" LTPO OLED',
      'Processor': 'Google Tensor G3',
      'Camera': '50MP Main + 48MP Telephoto + 48MP Ultra Wide',
      'Storage': '256GB',
      'AI Features': 'Magic Eraser, Best Take, Audio Magic Eraser',
    },
    reviews: [],
    priceHistory: [
      { date: '2026-02-08', price: 1499 },
      { date: '2026-02-15', price: 1459 },
      { date: '2026-02-22', price: 1429 },
      { date: '2026-03-01', price: 1399 },
      { date: '2026-03-08', price: 1389 },
    ],
  },
];

// Get products by category
export const getProductsByCategory = (categoryId: string): Product[] => {
  return products.filter(p => p.category === categoryId);
};

// Get lowest price for a product
export const getLowestPrice = (product: Product): number => {
  const inStockPrices = product.prices.filter(p => p.inStock);
  if (inStockPrices.length === 0) return product.prices[0].price;
  return Math.min(...inStockPrices.map(p => p.price));
};

// Get retailer count
export const getRetailerCount = (product: Product): number => {
  return product.prices.length;
};

// Featured deals (products with highest discounts)
export const getFeaturedDeals = (): Product[] => {
  return products
    .filter(p => p.discount && p.discount > 0)
    .sort((a, b) => (b.discount || 0) - (a.discount || 0))
    .slice(0, 6);
};

// Trending products (highest rated with most reviews)
export const getTrendingProducts = (): Product[] => {
  return [...products]
    .sort((a, b) => {
      const scoreA = a.rating * a.reviewCount;
      const scoreB = b.rating * b.reviewCount;
      return scoreB - scoreA;
    })
    .slice(0, 8);
};

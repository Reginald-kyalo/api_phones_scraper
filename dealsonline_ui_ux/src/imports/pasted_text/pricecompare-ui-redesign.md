# Frontend Changes Documentation & Code Snippets

**Date:** March 22, 2026  
**Project:** PriceCompare UI Redesign  
**Stack:** React + TypeScript + Tailwind CSS + Vite  

---

## Table of Contents

1. [Header Scroll Hook Fix](#header-scroll-hook-fix)
2. [DailyDealCard Component](#dailydealcard-component)
3. [Borderless Categories Grid](#borderless-categories-grid)
4. [Button Borderless Variant](#button-borderless-variant)
5. [Root Layout with Fixed Header](#root-layout-with-fixed-header)
6. [**DESIGN PENDING: Search Bar Repositioning**](#design-pending-search-bar-repositioning)
7. [**DESIGN PENDING: Product Page Redesign**](#design-pending-product-page-redesign)
8. [Summary of Changes](#summary-of-changes)
9. [Known Issues & Follow-ups](#known-issues--follow-ups)

---

## Header Scroll Hook Fix

### Problem
The header scroll hide/show behavior was inconsistent because the effect dependency array included `isVisible`, causing the scroll listener to re-attach on every state change and reset scroll position tracking.

### Solution
Refactored to use `useRef` for immutable scroll position tracking, removed `isVisible` from dependency array.

### File: `src/app/hooks/useScrollHideHeader.ts`

```typescript
import { useEffect, useState, useRef } from 'react';

interface UseScrollHideOptions {
  hideThreshold?: number; // pixels scrolled down before hiding header
}

/**
 * Hook for hide-on-scroll-down, show-on-scroll-up header behavior
 * Tracks scroll direction and position to manage header visibility
 * Shows header IMMEDIATELY when scrolling up, hides after hideThreshold pixels down
 */
export function useScrollHideHeader(options: UseScrollHideOptions = {}) {
  const { hideThreshold = 30 } = options;
  
  const [isVisible, setIsVisible] = useState(true);
  const prevScrollPosRef = useRef(window.scrollY);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const prevScrollPos = prevScrollPosRef.current;

      // Scrolling up - show header IMMEDIATELY
      if (currentScrollPos < prevScrollPos) {
        setIsVisible(true);
      }
      // Scrolling down past threshold - hide header
      else if (currentScrollPos > prevScrollPos + hideThreshold) {
        setIsVisible(false);
      }

      prevScrollPosRef.current = currentScrollPos;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideThreshold]);

  return { isVisible };
}
```

**Key Changes:**
- ✅ Uses `useRef` to persist scroll position across renders without triggering effect re-run
- ✅ Dependency array only includes `hideThreshold` (removed `isVisible`)
- ✅ Scroll listener stays attached consistently
- ✅ Passive listener prevents blocking scroll performance

**Usage in Header:**
```typescript
const { isVisible } = useScrollHideHeader({ hideThreshold: 30 });

return (
  <header className={`
    bg-white border-b border-gray-200 
    fixed top-0 z-50 w-full 
    transition-transform duration-300
    ${isVisible ? 'translate-y-0' : '-translate-y-full'}
  `}>
    {/* Header content */}
  </header>
);
```

---

## DailyDealCard Component

### Purpose
A compact product card variant for the Daily Deals carousel. Smaller than the standard ProductCard to fit more items in viewport and reduce vertical space usage.

### File: `src/app/components/DailyDealCard.tsx`

```typescript
import { useState } from 'react';
import { Link } from 'react-router';
import { Heart, Star } from 'lucide-react';
import { Product, getLowestPrice, getRetailerCount } from '../data/mockData';
import { toggleFavorite, isFavorite, isAuthenticated } from '../utils/localStorage';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface DailyDealCardProps {
  product: Product;
  onFavoriteChange?: () => void;
}

/**
 * Compact product card for Daily Deals carousel
 * Smaller than standard ProductCard to fit more items and reduce vertical space
 * Card size: ~140px width, aspect-square image
 */
export default function DailyDealCard({ product, onFavoriteChange }: DailyDealCardProps) {
  const [isFav, setIsFav] = useState(isFavorite(product.id));
  const lowestPrice = getLowestPrice(product);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated()) {
      toast.error('Please login to add favorites');
      return;
    }

    const newState = toggleFavorite(product.id);
    setIsFav(newState);
    
    if (newState) {
      toast.success('Added to favorites');
    } else {
      toast.success('Removed from favorites');
    }

    onFavoriteChange?.();
  };

  return (
    <Link to={`/product/${product.id}`}>
      <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
        {/* Image Container - Reduced padding for compact look */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
          />
          
          {/* Discount Badge */}
          {product.discount && (
            <Badge className="absolute top-1 left-1 bg-orange-600 hover:bg-orange-700 text-xs px-1.5 py-0.5">
              {product.discount}%
            </Badge>
          )}

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart
              className={`w-3 h-3 ${isFav ? 'fill-orange-600 text-orange-600' : 'text-gray-400'}`}
            />
          </button>
        </div>

        {/* Content - Reduced padding for compact layout */}
        <div className="p-2">
          {/* Brand - Hidden on daily deals to save space */}
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5 hidden">
            {product.brand}
          </p>

          {/* Product Name - Single line with clamp */}
          <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-1">
            {product.name}
          </h3>

          {/* Rating - Smaller font */}
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-900">{product.rating}</span>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between">
            <p className="text-sm font-semibold text-gray-900">
              ${lowestPrice.toFixed(0)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

**Key Specifications:**
- Card width: ~140px (vs ProductCard ~190px)
- Card height: ~200px (vs ProductCard ~290px)
- Image: aspect-square, no padding inside
- Content padding: p-2 (vs p-3)
- Text sizes: all text-xs except price (text-sm)
- Removed: brand label, deal count, extra spacing
- Maintained: favorite toggle, discount badge, rating, hover effects

**Usage in HomePage:**
```typescript
import DailyDealCard from '../components/DailyDealCard';

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
  {featuredDeals.map((product) => (
    <div key={product.id}>
      <DailyDealCard product={product} />
    </div>
  ))}
</div>
```

---

## Borderless Categories Grid

### Purpose
Replace the boxed category cards with a clean, minimal emoji-and-text-only layout. Saves 60% vertical space and allows room for many more categories.

### File: `src/app/pages/HomePage.tsx` (Featured Categories Section)

```typescript
{/* Featured Categories */}
<section className="mb-8">
  <h2 className="text-lg font-semibold mb-4 text-gray-900">Browse by Category</h2>
  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
    {categories.map((category) => (
      <Link
        key={category.id}
        to={`/category/${category.id}`}
        className="flex flex-col items-center gap-2 hover:opacity-75 transition-opacity duration-150 group"
      >
        <div className="text-3xl group-hover:scale-110 transition-transform duration-150">
          {category.emoji}
        </div>
        <h3 className="font-medium text-xs text-gray-900 text-center leading-tight">
          {category.name}
        </h3>
      </Link>
    ))}
  </div>
</section>
```

**Removed Elements:**
- ❌ `bg-white` background
- ❌ `border border-gray-200` borders
- ❌ `rounded-lg` corner radius
- ❌ `p-3` internal padding
- ❌ `hover:shadow-md` shadow effect
- ❌ Deal count text (`{category.dealCount}`)

**New Layout:**
- ✅ Flex column centered layout
- ✅ Emoji: text-3xl (up from text-2xl)
- ✅ Text: text-xs, centered
- ✅ Hover: opacity fade (cleaner than shadow)
- ✅ Gap: gap-4 for breathing room

**Responsive Grid:**
| Breakpoint | Columns |
|------------|---------|
| Mobile (375px) | 3 columns |
| Tablet (768px) | 4 columns |
| Desktop (1920px) | 8 columns |

**Space Savings:**
- Before: ~180px section height
- After: ~60px section height
- **Reduction: 67% less vertical space**
- **More categories visible: +33% at desktop (6 → 8)**

---

## Button Borderless Variant

### Purpose
Add a new minimal button variant with no borders, background, or padding—just text with subtle hover effects.

### File: `src/app/components/ui/button.tsx`

```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-100 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(255,107,0,0.14)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 hover:-translate-y-0.5 focus-visible:outline-destructive/20 dark:focus-visible:outline-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-[#d8d8d8] bg-background text-foreground hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:-translate-y-0.5",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 dark:hover:bg-accent/50",
        borderless:
          "text-foreground hover:text-foreground/80 p-0 h-auto",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2.5 has-[>svg]:px-3",
        sm: "h-10 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

**New Variant Added:**
```typescript
borderless: "text-foreground hover:text-foreground/80 p-0 h-auto"
```

**Usage Examples:**

```typescript
// Navigation buttons (carousel prev/next)
<Button variant="borderless" size="icon">
  <ChevronLeft className="w-4 h-4" />
</Button>

// Text-only buttons
<Button variant="borderless">
  Explore More
</Button>

// Combined with size
<Button variant="borderless" size="sm">
  View Details
</Button>
```

**Visual Behavior:**
- No background color
- No border
- Zero padding (`p-0`)
- Auto height (`h-auto`)
- Subtle text color fade on hover: `text-foreground/80`
- Maintains focus ring for accessibility

---

## Root Layout with Fixed Header

### Purpose
Account for fixed header positioning by adding top padding to main content area.

### File: `src/app/pages/Root.tsx`

```typescript
import { Outlet } from 'react-router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Toaster } from '../components/ui/sonner';

export default function Root() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}
```

**Key Addition:**
```typescript
<main className="flex-1 pt-20">
```

**Why `pt-20`?**
- Header height: `h-20` = 80px
- Top padding: `pt-20` = 80px (Tailwind converts to px)
- Prevents content from sliding under fixed header
- Maintains consistent spacing across pages

---

## DESIGN PENDING: Search Bar Repositioning

### Objective
Move the search bar from the fixed header (desktop nav) into the Daily Deals carousel section **only on the HomePage**. On all other pages (Category, Product, Search results), the search bar remains in the header.

### Behavior & Requirements

#### Desktop (1920px+)
- **HomePage:**
  - Search bar appears at the top of the Daily Deals carousel area, above the carousel title ("Daily Deals")
  - Search bar width: full carousel width (max-width-7xl container)
  - Placeholder: "Search products, brands, or categories..."
  - Maintains primary CTA button style (orange #ff6b00 accent)
  - Space above carousel: consistent gap-4 spacing
  - Animation: fade-in as page loads (no search visible until carousel area)

- **Other Pages (Category, Product, Search Results):**
  - Search bar stays in fixed header (top navigation)
  - No change to current behavior
  - Animation: search fades from carousel back to header when navigating away from HomePage

#### Tablet (768px)
- **HomePage:**
  - Search bar still above carousel, but adjusted width (full container with padding)
  - Font sizes: text-sm (vs text-base on desktop)
  - Padding: px-4 instead of px-6

- **Other Pages:**
  - Search remains in header; responsive header layout applies

#### Mobile (375px)
- **HomePage:**
  - Search bar: full width (px-4) above carousel
  - Placeholder: "Search..." (truncated for space)
  - Font: text-sm
  - Input height: h-10 (vs h-11 desktop)

- **Other Pages:**
  - Search collapses to icon-only in mobile header (magnifying glass icon)
  - Tapping icon opens search overlay/modal

### Visual Specifications

**Search Bar Component (in Carousel):**
```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] Search products, brands, or categories...     [Clear ✕] │  ← h-11 (desktop)
└─────────────────────────────────────────────────────────────┘
```

- **Input field:** 
  - Border: 1px #d8d8d8
  - Radius: 6px
  - Padding: px-4 py-2.5
  - Background: white
  - Focus: ring-orange-600/20 (accent highlight)
  - Placeholder color: text-gray-400

- **Icons:**
  - Search icon: left side, gray-400, size-4, opacity-60
  - Clear button: right side, only shows when text entered, cursor-pointer

- **Behavior on focus:**
  - Border color: #ff6b00 (accent)
  - Shadow: small shadow (0 1px 4px rgba(0,0,0,0.06))
  - Cursor: text

### Transition Animation

**When navigating TO HomePage:**
```
1. Page loads
   ↓
2. Search fades in near carousel (duration: 200ms, ease-out)
   ↓
3. Search appears ready for input
```

**When navigating FROM HomePage to another page:**
```
1. Click category/product/etc
   ↓
2. Search fades out from carousel (duration: 150ms, ease-in)
   ↓
3. Page transition begins
   ↓
4. New page loads with search in header (duration: 200ms after nav)
```

### Layout Spacing

**HomePage Daily Deals Section:**
```
[Hero Section]
         ↓ (gap-lg = 24px)
    [Categories]
         ↓ (gap-md = 16px)
┌─────────────────────────┐
│   [Search Bar]          │  ← NEW: in carousel area
└─────────────────────────┘
         ↓ (gap-md = 16px)
┌─────────────────────────┐
│  Daily Deals Carousel   │
│  (with prev/next nav)   │
└─────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Width | Search Position | Width | Height |
|------------|-------|-----------------|-------|--------|
| Mobile (375px) | full | Carousel area, above title | 100% - 2px padding | h-10 |
| Tablet (768px) | 728px | Carousel area, above title | container width | h-11 |
| Desktop (1920px) | full | Carousel area, above title | container width | h-11 |

### Interaction States

**Default (empty):**
- Background: white
- Border: #d8d8d8
- Text: placeholder in gray-400
- Clear button: hidden

**Focused:**
- Background: white
- Border: #ff6b00
- Shadow: 0 1px 4px rgba(0,0,0,0.06)
- Clear button: visible (if text entered)

**Filled (with text):**
- Clear button: visible (clickable, icon gray-600)
- Cursor: auto (ready to submit on Enter)

**Hover (desktop):**
- Border: slight emphasis (#d8d8d8 → darker gray)
- Shadow: subtle (above)

### Accessibility

- ✅ `<input>` semantic HTML
- ✅ `aria-label="Search products"`
- ✅ Clear button `aria-label="Clear search"`
- ✅ Focus ring visible and WCAG AA compliant
- ✅ Keyboard: Enter submits search, Escape clears
- ✅ Screen reader: announces "Search input, editable"

### Implementation Notes for Devs

- Component: `src/app/components/SearchBarCarousel.tsx` (new)
- Use existing search logic from Header
- Reuse Input component from `src/app/components/ui/input.tsx`
- Conditional render: show in carousel if `pathname === '/'`, else hide
- Navigation logic: already in Header, mirror same behavior
- Animation: CSS `opacity` + `transition-opacity` (200ms)

---

## DESIGN PENDING: Product Page Redesign

### Objective
Transform the Product page into a modern, sleek, professional layout with improved visual hierarchy, interactive components, and mobile-first responsive design. Primary focus: image viewer, price comparison, specifications, and price graph with navigation tabs.

### Current Issues & Goals

**Current State:**
- ❌ Large product image dominates viewport
- ❌ Price comparison table is basic, not visually appealing
- ❌ Specifications scattered, hard to parse
- ❌ No dedicated graph/chart for price history
- ❌ No navigation to jump between sections
- ❌ Account button doesn't work

**Goals:**
- ✅ Modern, minimal, professional design
- ✅ Better use of vertical space (smaller image)
- ✅ Image lightbox/modal viewer for zooming
- ✅ Organized specs with accordion/expandable groups
- ✅ Beautiful, interactive price comparison table with sorting/filtering
- ✅ Modern price history graph with date range controls
- ✅ Section navigation (tabs/buttons) to jump to specs, graph, comparisons
- ✅ Improve visual appeal of all data tables/lists
- ✅ Mobile-optimized layout
- ✅ Fix account button to navigate/open account sheet

### Layout Structure

#### Desktop (1920px) - Two Column Layout

```
┌──────────────────────────────────────────────────────────────┐
│                        HEADER (fixed, dynamic)                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │                         │  │  Product Title           │  │
│  │   Product Image         │  │  ⭐⭐⭐⭐⭐ (rating)     │  │
│  │   (60-70% prev size)    │  │                          │  │
│  │                         │  │  $XX.XX - $XX.XX         │  │
│  │  [📤 Expand Image] ✕    │  │                          │  │
│  │                         │  │  [Add to Favorites]      │  │
│  │                         │  │  [Price Alert]           │  │
│  │                         │  │  [Share]                 │  │
│  └─────────────────────────┘  │                          │  │
│                                │  [View All Retailers]   │  │
│                                └──────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ╔════════════════════════════════════════════════════╗ │ │
│  │  ║ [Overview] [Specs] [Graph] [Price Compare] [Review]║ │ │
│  │  ║════════════════════════════════════════════════════║ │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  PRICE COMPARISON TABLE                         │  │ │
│  │  │  ┌──────────────────────────────────────────┐  │  │ │
│  │  │  │ Retailer │ Price │ Shipping │ Rating │ #  │  │  │ │
│  │  │  ├──────────┼───────┼──────────┼────────┤    │  │  │ │
│  │  │  │ Amazon   │ $599  │ Free     │ 4.8 ★  │ Go │  │  │ │
│  │  │  │ BestBuy  │ $619  │ $9.99    │ 4.5 ★  │ Go │  │  │ │
│  │  │  └──────────────────────────────────────────┘  │  │ │
│  │  │  [Filter: Price ▼] [Sort: Lowest Price ▼]     │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  PRICE HISTORY GRAPH                           │  │ │
│  │  │  ┌──────────────────────────────────────────┐  │  │ │
│  │  │  │                                          │  │  │ │
│  │  │  │        [modern line chart]               │  │  │ │
│  │  │  │        #ff6b00 accent stroke            │  │  │ │
│  │  │  │                                          │  │  │ │
│  │  │  └──────────────────────────────────────────┘  │  │ │
│  │  │  [1D] [7D] [30D] [90D] [Custom ▼]             │  │ │
│  │  │  ☐ Show Amazon  ☐ Show BestBuy  ☐ Median Ln  │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  SPECIFICATIONS                                │  │ │
│  │  │  ┌──────────────────────────────────────────┐  │  │ │
│  │  │  │ ▼ General                                │  │  │ │
│  │  │  │   Brand: Apple                           │  │  │ │
│  │  │  │   Model: iPhone 15 Pro                   │  │  │ │
│  │  │  │   Release Date: Sept 2023                │  │  │ │
│  │  │  │                                          │  │  │ │
│  │  │  │ ▼ Display                                │  │  │ │
│  │  │  │   Size: 6.1 inches                       │  │  │ │
│  │  │  │   Type: OLED                             │  │  │ │
│  │  │  │   Resolution: 2556 x 1179                │  │  │ │
│  │  │  │                                          │  │  │ │
│  │  │  │ ▼ Camera                                 │  │  │ │
│  │  │  │   Main: 48MP                             │  │  │ │
│  │  │  │   Ultra-wide: 12MP                       │  │  │ │
│  │  │  │   Telephoto: 12MP (3x)                   │  │  │ │
│  │  │  └──────────────────────────────────────────┘  │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Tablet (768px) - Stacked Single Column

```
[Header]

[Product Image - smaller, full width]
[Image Expand Button]

[Product Info Card]
  - Title
  - Rating
  - Price range
  - CTAs

[Section Tabs]
  [Overview] [Specs] [Graph] [Compare]

[Price Comparison - scrollable table]

[Price Graph - full width]

[Specifications - accordion]

[Reviews]
```

#### Mobile (375px) - Vertical Stack

```
[Header]

[Product Image - 100% width]
[Image Expand Button overlay]

[Product Info - full width]
  - Title
  - Rating
  - Price
  - CTAs

[Quick Navigation FAB or Sticky Tabs]
  [▼ Specs] [▼ Graph] [▼ Compare]

[Price Comparison - horizontal scroll table]

[Price Graph - responsive]

[Specs - accordion, all collapsed]

[Reviews - card list]
```

### Key Components

#### 1. Product Image & Lightbox Viewer

**Current State:**
- Large fixed image area (dominates viewport)

**Redesigned:**
- Image reduced to 60-70% of current visual footprint
- Aspect ratio: maintain square or 4:3
- Button: "📤 Expand" or magnifying glass icon overlaid (top-right)
- Click button → open lightbox modal
- Lightbox features:
  - Full-screen or near-full image
  - Pinch-to-zoom (mobile)
  - Swipe left/right for multi-image carousel (if multiple images exist)
  - Close button (X) or click overlay to close
  - Keyboard: Esc to close
  - Smooth fade-in animation (200ms)

**Figma Deliverables:**
- Component: `ProductImage.Lightbox`
- Variants: small, medium, full
- State: default, hover (shows expand button), focus
- Lightbox overlay component with animations

---

#### 2. Price Comparison Table

**Current State:**
- Basic HTML table (rows, columns, plain styling)
- No sorting, filtering, or visual hierarchy

**Redesigned:**
- Modern, compact table design
- Columns: Retailer | Price | Shipping | Rating | Action
- Rows: clean, readable, with light alternating backgrounds
- Features:
  - **Sort controls:** Dropdown or icon buttons (sort by price asc/desc, shipping, rating)
  - **Filter pills:** Show/hide retailers, filter by price range
  - **Action CTA:** "Go to Retailer" button (orange accent, right-aligned)
  - **Mobile variant:** horizontal scroll or card layout

**Visual Specs:**
- Row height: 52px (comfortable touch target)
- Cell padding: px-4 py-3
- Border: 1px #d8d8d8 between rows
- Alternating row background: white + rgba(255,107,0,0.02) (very faint orange tint)
- Text: Retailer (font-bold), Price (text-lg font-semibold), Rating (small)
- Button: primary orange, 32px height

**Compact Variant:**
- Row height: 40px
- Font: text-sm
- For mobile or sidebar display

**Expanded Variant:**
- Row height: 60px
- Extra columns: Last updated, stock status, shipping time
- More breathing room

**Figma Deliverables:**
- Component: `PriceComparison.Table`
- Variants: compact, expanded
- Row states: default, hover, selected
- Sort/filter controls component
- Mobile responsive card variant

---

#### 3. Specifications Accordion

**Current State:**
- Flat list or basic grouping
- Hard to scan, no hierarchy

**Redesigned:**
- Accordion / collapsible groups (General, Display, Camera, Battery, Connectivity, etc.)
- Each group can expand/collapse
- Desktop: 2-column grid inside expanded group (label on left, value on right)
- Mobile: full-width, single column
- Icons or badges for categories (optional enhancement)

**Visual Specs:**
- Group header: font-semibold, text-base, dark gray
- Group header background: very light gray (#f9f9f9) or subtle border
- Expand icon: chevron, right → down when expanded
- Inside group:
  - Label: text-sm, gray-600, uppercase tracking
  - Value: text-sm, gray-900, font-medium
  - Padding inside group: 16px
  - Gap between spec rows: 12px

**Example:**
```
┌──────────────────────────────────────────────┐
│ ▼ Display                                    │
│   Screen Size     | 6.1 inches               │
│   Screen Type     | OLED                     │
│   Resolution      | 2556 x 1179              │
│   Refresh Rate    | 120 Hz                   │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ ▶ Camera                                     │
└──────────────────────────────────────────────┘
```

**Figma Deliverables:**
- Component: `Specs.Accordion`
- Variants: all-collapsed, expanded, mobile
- States: default, hover, expanded
- Group header component with icon

---

#### 4. Price History Graph

**Current State:**
- May be missing or basic line chart

**Redesigned:**
- Modern line/area chart with:
  - X-axis: dates (auto-scale based on range)
  - Y-axis: price in dollars
  - Primary stroke: #ff6b00 (accent color)
  - Area fill: rgba(255, 107, 0, 0.1) (very faint orange)
  - Gridlines: minimal (light gray, opacity 0.3)
  - Tooltips: on hover, show date + price + retailer (if multi-line)
  - Data points: small circles or dots at each price point

- **Controls Below Graph:**
  - Time range buttons: [1D] [7D] [30D] [90D] [Custom ▼]
  - Toggles: ☐ Show Amazon ☐ Show BestBuy ☐ Show Median Price
  - Custom date range: expandable picker (start date, end date)

- **Mobile Variant:**
  - Smaller height (300px vs 400px desktop)
  - Tap tooltips (no hover)
  - Swipe to pan/zoom (optional)
  - Buttons stack vertically

**Figma Deliverables:**
- Component: `Chart.LineArea`
- Variants: small (300px), medium (400px), full-width
- Tooltip component
- Control buttons (time range, toggles)
- Custom date picker component
- Mobile interactions spec

---

#### 5. Section Navigation (Tabs / Quick Nav)

**Objective:** Allow users to jump between Overview, Specs, Graph, Price Comparison sections without scrolling.

**Desktop Implementation:**
- **Sticky horizontal tabs** below product info
- Active tab highlighted with orange underline (#ff6b00)
- Tab content: Overview | Specifications | Price Graph | Price Comparison | Reviews
- Position: sticky to top of scrollable content area (when user scrolls past product info)
- Background: white with subtle shadow when sticky

```
┌──────────────────────────────────────────────────────────┐
│ Overview | Specifications | Price Graph | Price... │ ... │
│          ↑ active                                         │
│          (underline: #ff6b00, 3px)                       │
└──────────────────────────────────────────────────────────┘
```

**Tablet Implementation:**
- Same sticky tabs, but text might truncate → use abbreviations or icons
- Horizontal scroll if needed
- Swipe to navigate (optional enhancement)

**Mobile Implementation:**
- **Option A:** Sticky horizontal scroll tabs (same as tablet)
- **Option B:** Floating action button (FAB) in bottom-right: "≡ Sections" opens a quick-nav menu
- Recommended: **Option B** (less clutter, easier access)

```
Mobile Menu:
┌─────────────────┐
│ ▼ Jump to:      │
│ • Overview      │
│ • Specs         │
│ • Graph         │
│ • Price Comp    │
│ • Reviews       │
└─────────────────┘
                    ← FAB in corner
```

**Figma Deliverables:**
- Component: `Tabs.SectionNav`
- Variants: desktop (horizontal, sticky), mobile (FAB + menu)
- Active states: underline, color change
- Smooth scroll-to-section animation (500ms ease-out)

---

#### 6. Account Button Fix

**Current State:**
- ⚠️ Button is non-functional (doesn't navigate or open sheet)

**Redesigned Behavior:**
- **Desktop:** Click → Navigate to `/auth` OR open account sheet (right-side slide-out)
- **Mobile:** Click → Open account modal/sheet (full-screen or bottom-sheet)
- **States:**
  - Not logged in: Show "Sign In" text or icon
  - Logged in: Show user avatar + name (hover shows dropdown: Settings, Logout, etc.)

**Figma Deliverables:**
- Component: `Header.Account.Button`
- Variants: not-logged-in, logged-in, mobile, dropdown-open
- Interaction spec: click → navigate or sheet behavior

---

### Design Tokens & Consistency

All new components should use:
- **Accent:** #ff6b00 (orange)
- **Border:** #d8d8d8 (light gray)
- **Spacing:** xs=4px, sm=8px, md=16px, lg=24px, xl=32px
- **Radii:** sm=6px, md=10px, lg=16px
- **Shadows:** sm=0 1px 4px rgba(0,0,0,0.06), md=0 6px 18px rgba(2,6,23,0.08)
- **Type:** Use Tailwind scale (text-xs through text-4xl)

---

### Responsive Breakpoints

| Breakpoint | Layout | Key Changes |
|-----------|--------|-------------|
| **Mobile (375px)** | Vertical stack | Image: full width, Image h auto. Tabs: FAB menu. Table: horizontal scroll or card. Graph: 300px height. Specs: single column inside accordion. |
| **Tablet (768px)** | 1 column | Image: slightly wider. Tabs: sticky horizontal. Table: compact variant. Graph: 350px. Specs: show more spacing. |
| **Desktop (1920px)** | 2 column (image + info on top, sections below) | Image: 60-70% prev size. Tabs: sticky, full-width. Table: expanded. Graph: 400px. Specs: 2-column grid inside groups. |

---

### Accessibility Requirements

- ✅ All images have alt text
- ✅ Buttons have aria-labels (expand, close, sort, filter)
- ✅ Accordion: `aria-expanded` on group headers
- ✅ Table: `<th>` headers, `scope` attributes
- ✅ Graph: accessible via keyboard (arrow keys to navigate data points, tooltip shows in aria-live region)
- ✅ Focus ring: visible on all interactive elements (orange accent outline)
- ✅ Color contrast: WCAG AA minimum
- ✅ Screen reader support: table structure, form labels, landmark regions

---

### Animation & Interaction Specs

| Element | Action | Animation | Duration | Easing |
|---------|--------|-----------|----------|--------|
| Lightbox | Open | Fade in + scale up | 200ms | ease-out |
| Lightbox | Close | Fade out + scale down | 150ms | ease-in |
| Accordion group | Expand | Height: auto, opacity fade | 250ms | ease-out |
| Tab switch | Click active tab | Underline slide | 200ms | ease-out |
| Graph toggle | Show/hide line | Opacity fade | 300ms | ease-out |
| Table sort | Click sort button | Fade + re-render | 150ms | ease-out |

---

### Figma Deliverables Checklist

- [ ] Product Image component + Lightbox variant
- [ ] Price Comparison Table (compact & expanded variants)
- [ ] Table Sort/Filter control component
- [ ] Specifications Accordion with groups
- [ ] Price History Line/Area Chart
- [ ] Chart controls (time range buttons, toggles, custom date picker)
- [ ] Section Navigation Tabs (desktop sticky) + FAB menu (mobile)
- [ ] Account Button (not-logged-in, logged-in, dropdown)
- [ ] Lightbox modal overlay
- [ ] Product info card component
- [ ] CTA buttons (favorites, alerts, share)
- [ ] Mobile responsive variants for all above
- [ ] Interaction prototypes: lightbox open/close, tab navigation, chart interactions
- [ ] Annotated dev handoff: Tailwind classes, token usage, CSS snippets for critical components

---

## Summary of Changes

### ✅ Implemented (Code-Side)

**Files Created**
| File | Purpose | Status |
|------|---------|--------|
| `src/app/components/DailyDealCard.tsx` | Compact product card for carousel | ✅ Live |
| `src/app/hooks/useScrollHideHeader.ts` | Fixed scroll detection with useRef | ✅ Live |

**Files Modified**
| File | Changes | Status |
|------|---------|--------|
| `src/app/pages/HomePage.tsx` | Added DailyDealCard import, updated daily deals grid (4 cols), redesigned categories (borderless, 8 cols) | ✅ Live |
| `src/app/components/ui/button.tsx` | Added `borderless` variant | ✅ Live |
| `src/app/pages/Root.tsx` | Added `pt-20` to main element | ✅ Live |
| `src/app/components/Header.tsx` | Updated hideThreshold to 30, integrated scroll hook | ✅ Live |

### 🎨 Design Pending (Figma AI)

| Feature | Status | Details |
|---------|--------|---------|
| **Search Bar in Carousel** | ⏳ Awaiting Figma design | Move search from header to HomePage daily deals carousel. Search stays in header on other pages. |
| **Product Page Redesign** | ⏳ Awaiting Figma design | Complete modernization: smaller image, lightbox modal, price table improvements, specs accordion, price graph with controls, section navigation tabs. |

### Impact Metrics (Implemented Changes)

| Metric | Before | After |
|--------|--------|-------|
| **Categories section height** | ~180px | ~60px (-67%) |
| **Categories per desktop row** | 6 | 8 (+33%) |
| **Daily deals cards per row** | 3 | 4 (+33%) |
| **Daily deal card area** | ~55k px² | ~28k px² (-49%) |
| **Header hide threshold** | Inconsistent | 30px reliable |
| **Header reappear threshold** | Delayed | Immediate ✅ |

---

## Known Issues & Follow-ups

### 1. Account Button Not Functional
**Status:** ⚠️ Not wired  
**Location:** Header component, top-right account icon  
**Issue:** Button clicks but doesn't navigate or open account sheet  
**Fix Required:**
```typescript
// Current (non-functional):
<button onClick={() => console.log('Account clicked')}>
  <User className="w-4 h-4" />
</button>

// Should be:
const navigate = useNavigate();
<Link to="/auth" className="...">
  <User className="w-4 h-4" />
</Link>

// OR for account sheet:
const [accountOpen, setAccountOpen] = useState(false);
<button onClick={() => setAccountOpen(true)}>
  <User className="w-4 h-4" />
</button>
<AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
```

### 2. Header Scroll Behavior Still Needs Testing
**Status:** ✅ Fixed code-side, needs QA  
**Testing Checklist:**
- [ ] Scroll down 30px → header hides smoothly
- [ ] Scroll up ANY amount → header shows instantly
- [ ] No flickering or "stuck" states
- [ ] Smooth 300ms animation on both hide and show
- [ ] Test on mobile, tablet, desktop

### 3. Search Bar in Carousel (Not Yet Implemented)
**Status:** ❌ Design pending from Figma AI  
**Next Step:** Await Figma screens for search-in-carousel placement and integration logic

### 4. Product Page Redesign (Not Yet Implemented)
**Status:** ❌ Design pending from Figma AI  
**Scope:** Image sizing, lightbox modal, price table, specs layout, graph, navigation tabs

---

## For Figma AI / Designer

### Phase 1: Already Implemented ✅
The following designs are now live in the frontend and should be reflected in Figma:

1. **Smaller product cards:** DailyDealCard component is now ~140px wide, ~200px tall (vs ~190px x ~290px before)
2. **Borderless categories:** 8-column grid on desktop (4 tablet, 3 mobile), emoji + text only, no borders/backgrounds
3. **Button borderless variant:** Available for minimal-style buttons and navigation
4. **Fixed header behavior:** Hide on down-scroll (30px), show instantly on up-scroll, 300ms transition
5. **Categories section reduced:** 67% height reduction (from ~180px to ~60px)

### Phase 2: Design Pending ⏳

Please design the following and provide Figma screens + component specs:

#### A. Search Bar Repositioning
- **Location:** Move search bar from fixed header to Daily Deals carousel section **only on HomePage**
- **Other pages:** Search stays in header
- **Transitions:** Fade animation when navigating between pages
- See [DESIGN PENDING: Search Bar Repositioning](#design-pending-search-bar-repositioning) section for full specs

#### B. Product Page Redesign (Major)
- **Scope:** Complete modern redesign of product page
- **Key components:** Image viewer + lightbox, price comparison table, specs accordion, price history graph, section navigation tabs
- **Emphasis:** Modern, sleek, professional design with improved visual hierarchy
- **Account button:** Fix to navigate to auth or open account sheet
- See [DESIGN PENDING: Product Page Redesign](#design-pending-product-page-redesign) section for full detailed specs

---

## Quick Reference: CSS Tokens

All components use these design tokens. Ensure consistency:

```css
/* Colors */
--accent: #ff6b00;
--border: #d8d8d8;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;

/* Radii */
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;

/* Shadows */
--shadow-sm: 0 1px 4px rgba(0,0,0,0.06);
--shadow-md: 0 6px 18px rgba(2,6,23,0.08);

/* Type Scale */
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
--text-4xl: 36px;
```

---

## Deployment Checklist

- [x] useScrollHideHeader hook working consistently
- [x] DailyDealCard component rendering and responsive
- [x] Borderless categories showing 8 columns on desktop
- [x] Button borderless variant available
- [x] Root layout pt-20 preventing content overlap
- [ ] Account button wired to auth/account sheet
- [ ] Search bar moved to carousel (pending Figma design)
- [ ] Product page redesigned (pending Figma design)
- [ ] All responsive breakpoints tested
- [ ] Mobile/tablet/desktop QA passed

---

**Document Version:** 1.0  
**Last Updated:** March 22, 2026  
**Author:** Development Team  
**Next Review:** After Figma AI redesign handoff

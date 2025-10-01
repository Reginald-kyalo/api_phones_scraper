# Centralized Design System Guide

## Overview
This document outlines the new centralized color and font system implemented in `app/static/css/header/variables.css` and `app/static/css/design-system.css`.

## File Structure
```
app/static/css/
├── header/variables.css          # All CSS variables (colors, fonts, spacing, etc.)
├── design-system.css             # Global styles using the variables
├── base-modal.css               # Updated to use centralized variables
├── product/product-card.css     # Updated to use centralized variables
└── [other CSS files]            # Need to be updated
```

## Color System

### Primary Brand Colors
```css
--color-primary: #FF6B35          /* Main brand color (orange) */
--color-primary-dark: #E85A2B      /* Darker variant */
--color-primary-light: #FFB299     /* Lighter variant */
--color-accent: #2E86AB            /* Secondary brand color (blue) */
```

### Text Colors
```css
--text-primary: #111827            /* Main headings, important text */
--text-secondary: #6B7280          /* Secondary text, descriptions */
--text-muted: #9CA3AF              /* Placeholder text, disabled */
--text-inverse: #ffffff            /* Text on dark backgrounds */
```

### Background Colors
```css
--bg-primary: #ffffff              /* Main backgrounds */
--bg-secondary: #F9FAFB            /* Secondary backgrounds */
--bg-tertiary: #F3F4F6             /* Tertiary backgrounds */
```

### Status Colors
```css
--color-success: #10B981           /* Success states */
--color-warning: #F59E0B           /* Warning states */
--color-error: #EF4444             /* Error states */
--color-info: #3B82F6              /* Info states */
```

## Typography System

### Font Families
```css
--font-primary: 'Arvo', serif          /* Headings, titles */
--font-secondary: 'Montserrat', sans-serif  /* Body text, UI */
```

### Font Sizes (Mobile-first)
```css
--font-size-xs: 0.75rem            /* 12px */
--font-size-sm: 0.875rem           /* 14px */
--font-size-base: 1rem             /* 16px */
--font-size-lg: 1.125rem           /* 18px */
--font-size-xl: 1.25rem            /* 20px */
--font-size-2xl: 1.5rem            /* 24px */
--font-size-3xl: 1.875rem          /* 30px */
--font-size-4xl: 2.25rem           /* 36px */
```

### Font Weights
```css
--font-weight-light: 300
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

## Usage Examples

### Before (Hardcoded)
```css
.my-element {
  color: #333;
  background-color: #fff;
  font-size: 16px;
  font-weight: 600;
}
```

### After (Using Variables)
```css
.my-element {
  color: var(--text-primary);
  background-color: var(--bg-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}
```

## Migration Strategy

### Phase 1: Core Files (Completed)
- ✅ `header/variables.css` - Centralized all variables
- ✅ `design-system.css` - Global utility classes
- ✅ `base-modal.css` - Updated to use variables
- ✅ `product/product-card.css` - Partially updated

### Phase 2: Component Files (Next)
Files that need to be updated to use centralized variables:
- `product/product-sidebar.css`
- `product/product-icons.css`
- `product/comparison-panel.css`
- `product/filter-bar.css`
- `track-alerts.css`
- `price-alarm.css`
- `auth.css`
- `favorites.css`
- `side-panel.css`
- `mainpage.css`

### Phase 3: Legacy Cleanup
- Remove duplicate variable definitions
- Remove hardcoded colors/fonts
- Test across all components

## Common Patterns

### Buttons
```css
.btn-primary {
  background-color: var(--color-primary);
  color: var(--text-inverse);
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
}
```

### Cards
```css
.card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  color: var(--text-primary);
}
```

### Form Elements
```css
input {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
}

input:focus {
  border-color: var(--border-focus);
}
```

## Utility Classes

The `design-system.css` provides utility classes for common patterns:

### Text Utilities
```css
.text-primary      /* Primary text color */
.text-secondary    /* Secondary text color */
.text-muted        /* Muted text color */
.text-success      /* Success text color */
```

### Background Utilities
```css
.bg-primary        /* Primary background */
.bg-secondary      /* Secondary background */
.bg-success        /* Success background */
```

### Typography Utilities
```css
.text-xs, .text-sm, .text-base, .text-lg, .text-xl, .text-2xl
.font-light, .font-normal, .font-medium, .font-bold
```

## Benefits

1. **Consistency**: All colors and fonts defined in one place
2. **Maintainability**: Easy to update colors globally
3. **Theming**: Can easily create dark mode or alternative themes
4. **Performance**: Reduced CSS duplication
5. **Developer Experience**: Clear naming conventions
6. **Accessibility**: Consistent contrast ratios

## Next Steps

1. Import `design-system.css` in main templates
2. Update remaining CSS files to use variables
3. Remove hardcoded colors/fonts
4. Test across all components
5. Consider implementing dark mode support

## Import Order

In HTML templates, import CSS in this order:
```html
<link rel="stylesheet" href="/static/css/header/variables.css" />
<link rel="stylesheet" href="/static/css/design-system.css" />
<link rel="stylesheet" href="/static/css/[component].css" />
```
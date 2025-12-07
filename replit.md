# Hydrogen MLM Cabinet Prototype

## Overview

This project is an MLM (Multi-Level Marketing) management application for hydrogen powder and wellness products. It provides a web-based partner cabinet for managing sales networks, tracking earnings via a three-level commission system, and offering comprehensive administrative tools for system oversight. The application aims to deliver real-time statistics, team visualization, order processing, and automated commission calculations to its users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18, TypeScript, and Vite. It utilizes Tailwind CSS and shadcn/ui (Radix UI components) for a modular and responsive design with a mobile-first approach. Key features include a robust routing system, reusable UI components, and a dual implementation pattern for performance-critical components (standard vs. optimized versions). State management primarily uses React hooks and `@tanstack/react-query` for server state caching. Performance is optimized through virtual scrolling for large lists, memoization, and server-side metrics pre-calculation. The design incorporates error boundaries, a demo mode for testing, and inline admin controls.

### Backend Architecture

The backend is developed using the Hono web framework on the Deno runtime, deployed as Supabase Edge Functions. It offers RESTful API endpoints and utilizes Supabase KV Store for data persistence, employing a structured key-value storage strategy for various data types like user profiles, products, orders, and cached metrics. Authentication supports email/password, Telegram OAuth, and Google OAuth, with token-based authentication and role-based access control. The core MLM commission system supports a three-level structure with customizable commissions per product, automatically calculated upon order creation and distributed through the sponsor chain. Caching is implemented for user metrics and paginated results to enhance performance. Admin utilities are in place for data recovery, ID management, and tree visualization.

### Data Recovery & Integrity Tools

The system includes admin utilities for data integrity, such as `DataRecoveryTool` for fixing relationships, `IdManager` for managing partner IDs, and `AutoBackupManager` for scheduled backups. A hierarchical team structure visualization supports virtual scrolling, search, and filtering for large networks.

## External Dependencies

### Third-Party Services

- **Supabase**: Used for KV Store (data persistence), Edge Functions (serverless backend), and Authentication services (email, OAuth).
- **Telegram**: Integrated for Mini App functionality and OAuth login, specifically with the @h2enterbot.
- **Google OAuth**: Utilized for authentication provider integration through Supabase.

### Key NPM Packages

- **UI Framework**: `@radix-ui/*`, `lucide-react`, `tailwindcss`, `class-variance-authority`, `cmdk`.
- **Data & State Management**: `@tanstack/react-query`, `@tanstack/react-virtual`, `@supabase/supabase-js`.
- **Utilities**: `date-fns`, `html2canvas`, `jspdf`, `qr-code-styling`, `embla-carousel-react`.
- **Backend (Deno)**: `hono`, Web Crypto API.

### Build & Development Tools

- **Vite**: Build tool and development server.
- **TypeScript**: For type safety.
- `@vitejs/plugin-react-swc`: For fast React refreshing.

### Deployment Configuration

- **Vercel**: Used for frontend deployment with custom routing.
- **Environment Variables**: Frontend requires `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY`. Backend requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Commission System (December 6, 2025)

### Price Ladder as Single Source of Truth

Commissions are calculated from product price ladder, not from separate commission fields.

**Product price fields:**
- `цена_розница` (P₀) — Retail price (for guests)
- `цена1` (P₁) — Level 1 price (partner price)
- `цена2` (P₂) — Level 2 price
- `цена3` (P₃) — Level 3 price
- `цена4` (P_company) — Company price

**Commission formulas (STRICT LOGIC):**
```
L0 = max(0, P₀ - P₁)  // Always calculated
L1 = P₂ > 0 ? max(0, P₁ - P₂) : 0  // Only if P₂ is set
L2 = (P₂ > 0 && P₃ > 0) ? max(0, P₂ - P₃) : 0  // Only if P₂ and P₃ are set
L3 = (P₃ > 0 && P_company > 0) ? max(0, P₃ - P_company) : 0  // Only if P₃ and P_company are set
```

**Important:** If any price level = 0 (not set), the commission for that level = 0. This prevents ambiguous fallback calculations.

**Key files:**
- `src/supabase/functions/server/commission_backend.ts` — Backend calculation functions
- `src/supabase/functions/server/index.tsx` — `calculatePayouts()`, `createEarningsFromOrder()`
- `src/components/CatalogRu.tsx` — Frontend auto-calculation in product form

**Verification (should match if all prices are set):**
- Guest sale: `L0 + L1 + L2 + L3 + P_company = P₀`
- Partner purchase: `L1 + L2 + L3 + P_company = P₁`

## Shopping Cart System (December 7, 2025)

### Cart Implementation

The catalog now uses a shopping cart instead of direct purchase modals:

**User Flow:**
1. User clicks "В корзину" (add to cart) button in the catalog
2. Items are collected in the cart sidebar (Sheet component)
3. User can adjust quantities, remove items in the cart
4. Final checkout creates all orders at once

**Components:**
- `src/components/CartRu.tsx` — Cart sidebar with checkout functionality
- `src/components/CatalogRu.tsx` — Catalog with "add to cart" buttons
- `src/MainApp.tsx` — Cart state management (`cartItems`, `isCartOpen`, cart handlers)

**Cart Item Structure:**
```typescript
{
  product: ProductData,
  quantity: number,
  isPartner: boolean  // false = guest price, true = partner price
}
```

**Key Functions in MainApp:**
- `handleAddToCart(product, isPartner, quantity)` — Add/update cart item
- `handleUpdateQuantity(productId, isPartner, newQuantity)` — Change quantity
- `handleRemoveItem(productId, isPartner)` — Remove from cart
- `handleClearCart()` — Clear entire cart

## Deployment Notes (December 6, 2025)

### Edge Functions Deployment

Backend Edge Functions are deployed to Supabase. To deploy updated code:

```bash
# Copy updated files to deployment directory
cp src/supabase/functions/server/*.tsx supabase/functions/make-server-05aa3c8a/
cp src/supabase/functions/server/*.ts supabase/functions/make-server-05aa3c8a/

# Create index.ts (Supabase expects .ts not .tsx)
cp supabase/functions/make-server-05aa3c8a/index.tsx supabase/functions/make-server-05aa3c8a/index.ts

# Deploy using API method (no Docker required)
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" supabase functions deploy make-server-05aa3c8a --project-ref vbjueuhgcyfberivihiv --use-api
```

**Important:** Changes to `src/supabase/functions/server/` are NOT automatically deployed. You must manually deploy after making backend changes.
# Hydrogen MLM Cabinet Prototype

## Overview

This is a multi-level marketing (MLM) management application for hydrogen powder and wellness products. The system enables partners to manage their sales structure, track earnings through a three-level commission system, and provides comprehensive admin tools for system oversight.

**Core Purpose:** A web-based partner cabinet for managing MLM sales networks with real-time statistics, team visualization, order processing, and automated commission calculations.

**Technology Stack:**
- Frontend: React 18 + TypeScript + Vite
- UI Framework: Tailwind CSS + shadcn/ui (Radix UI components)
- Backend: Supabase Edge Functions (Deno + Hono framework)
- Database: Supabase KV Store (key-value storage)
- Authentication: Email/password + Telegram Mini App integration
- Deployment: Vercel (frontend) + Supabase (backend)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Structure:**
- Main application router (`AppRu.tsx`, `MainApp.tsx`) handles authentication flows and section navigation
- Modular page components for each feature area (Dashboard, Catalog, Orders, Balance, etc.)
- Reusable UI components from shadcn/ui library located in `/components/ui/`
- Dual implementation pattern: Standard and Optimized versions of heavy components (e.g., `UsersManagementRu` vs `UsersManagementOptimized`)

**State Management:**
- Local component state with React hooks
- React Query (`@tanstack/react-query`) for server state caching in optimized components
- LocalStorage for demo mode data and user preferences

**Performance Optimizations:**
- Virtual scrolling with `@tanstack/react-virtual` for large lists (10,000+ users)
- Memoization with `useMemo` and `useCallback` hooks
- Server-side metrics pre-calculation and caching
- Progressive enhancement: standard version for <100 users, optimized for 1000+

**Key Design Patterns:**
- Error boundaries for fault isolation
- Demo mode support for testing without backend
- Inline admin controls (embedded CRUD operations within user views)
- Responsive design with mobile-first approach

### Backend Architecture

**Server Framework:**
- Hono web framework running on Deno runtime
- Edge functions deployed to Supabase
- RESTful API endpoints with `/make-server-05aa3c8a/` prefix

**Data Storage Strategy:**
- Key-value store with structured key naming:
  - `user:id:{userId}` - partner data
  - `admin:id:{adminId}` - administrator data
  - `user:email:{email}` - email lookup index
  - `product:id:{sku}` - product catalog
  - `order:id:{orderId}` - order records
  - `withdrawal:id:{id}` - withdrawal requests
  - `reserved:id:{number}` - reserved ID numbers
  - `metrics:user:{userId}` - cached user metrics (1-hour TTL)
  - `cache:page:{key}` - paginated results cache (5-minute TTL)

**Authentication & Authorization:**
- Multi-provider auth: Email/password, Telegram OAuth, Google OAuth
- Token-based authentication with bearer tokens
- Role-based access control (admin vs partner)
- Admin detection: `isAdmin` flag or `email === 'admin@admin.com'`
- Middleware functions: `verifyUser()`, `requireAdmin()` for route protection

**MLM Commission System:**
- Three-level commission structure (L0, L1, L2, L3)
- Customizable commissions per product
- Default commissions: L0=1600₽, L1=900₽, L2=500₽, L3=200₽
- Automatic commission calculation on order creation
- Commission distribution to sponsor chain (up to 3 levels)

**API Endpoint Categories:**
1. Authentication: `/auth/login`, `/auth/register`, `/auth/google`, `/telegram-auth`
2. User management: `/user/:userId`, `/users/optimized`, `/admin/users`
3. Product catalog: `/products`, `/admin/products`
4. Orders: `/orders`, `/admin/orders`
5. Withdrawals: `/withdrawals`, `/admin/withdrawals`
6. Metrics: `/metrics/recalculate`, `/users/:userId/metrics`
7. Admin utilities: `/admin/change-user-id`, `/admin/reserved-ids`

**Caching Strategy:**
- User metrics cached for 1 hour (`user_metrics_cache.tsx`)
- Paginated results cached for 5 minutes
- Manual cache invalidation on data mutations
- Batch processing for metric recalculation (20 users per batch)

### Data Recovery & Integrity Tools

**Admin Utilities:**
- `DataRecoveryTool` - Analyzes and fixes broken relationships (orphan users, broken sponsor links)
- `IdManager` - Manages ID number reservations and assignments (001-99999 range)
- `ManualLinkFixer` - Manual repair of user relationships
- `SmartOrphanFixer` - Automatic parent detection using referral codes
- `AutoBackupManager` - Scheduled backups every 24 hours

**Tree Visualization:**
- Hierarchical team structure rendering
- Virtual scrolling for large trees (10,000+ nodes)
- Search and filter by rank, name, email
- Auto-expansion of search results path
- Recursive team size calculation

## External Dependencies

### Third-Party Services

**Supabase:**
- KV Store for data persistence
- Edge Functions for serverless backend
- Authentication services (email, OAuth providers)
- Project configuration via environment variables:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Telegram:**
- Mini App integration for mobile experience
- OAuth login widget for web authentication
- Bot configuration: @h2enterbot
- Domain whitelisting required for widget functionality

**Google OAuth:**
- Client ID and Secret for OAuth flow
- Configured through Supabase Auth providers

### Key NPM Packages

**UI Framework:**
- `@radix-ui/*` - 20+ accessible UI primitives (dialogs, dropdowns, tabs, etc.)
- `lucide-react` - Icon library
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variant utilities
- `cmdk` - Command palette component

**Data & State Management:**
- `@tanstack/react-query` - Server state synchronization and caching
- `@tanstack/react-virtual` - Virtual scrolling for performance
- `@supabase/supabase-js` - Supabase client SDK

**Utilities:**
- `date-fns` - Date manipulation
- `html2canvas` + `jspdf` - PDF generation for reports
- `qr-code-styling` - QR code generation for referral links
- `embla-carousel-react` - Carousel component

**Backend (Deno):**
- `hono` - Web framework
- Web Crypto API - Cryptographic operations (replaces node:crypto for Vercel compatibility)

### Build & Development Tools

- Vite - Build tool and dev server
- `@vitejs/plugin-react-swc` - Fast React refresh
- TypeScript - Type safety
- Path aliases configured via `vite.config.ts` (`@/` → `./src/`)

### Deployment Configuration

**Vercel:**
- Output directory: `dist/`
- Build command: `npm run build`
- Custom routing via `vercel.json` for SPA behavior

**Environment Variables Required:**
- Frontend: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY`
- Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
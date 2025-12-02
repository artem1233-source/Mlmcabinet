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
- Deployment: Replit (development) + Vercel (production frontend) + Supabase (backend)

## Recent Changes

**December 2, 2025 - Multiple ID/Code System Implementation:**
- Implemented new multi-ID system where partners can have multiple permanent codes (numeric and alphanumeric)
- IDs are never freed for reuse - once assigned to a partner, they belong to that partner forever
- Added `PartnerCode` data model with fields: value, type, primary, isActive, createdAt, assignedBy
- Created global code mapping: `id:code:{value}` → userId for fast code resolution
- New API endpoints for code management:
  - `GET /admin/user/:userId/codes` - Get all codes for a user
  - `POST /admin/user/:userId/codes` - Add new code to user
  - `POST /admin/user/:userId/codes/set-primary` - Set code as primary
  - `POST /admin/user/:userId/codes/deactivate` - Deactivate a code
  - `POST /admin/user/:userId/codes/activate` - Reactivate a code
  - `GET /admin/codes/check/:code` - Check code availability
  - `GET /admin/codes/resolve/:code` - Find user by any code
  - `POST /admin/codes/migrate-all` - Migrate existing users to new system
- Modified `change-user-id` endpoint to preserve old IDs instead of freeing them
- Modified `assign-reserved-id` endpoint to preserve old IDs when assigning reserved IDs to users:
  - Old ID is saved as additional code in user's codes[] array
  - Global code mappings created for both old and new IDs
  - Old IDs are NEVER returned to free IDs pool
- Orders now track `usedReferralCode` field to record which specific code was used
- Created `UserCodesManager.tsx` UI component for managing partner codes
- Created `CodeLookup.tsx` component for searching users by any code
- Integrated `UserCodesManager` into user details dialog as "ID/Коды" tab
- Integrated `CodeLookup` into ID Management page (IdManagementOptimized.tsx)

**December 2, 2025 - Replit Environment Setup:**
- Configured Vite to run on port 5000 with `allowedHosts: true` for Replit proxy
- Fixed duplicate `Download` icon import in `UsersManagementOptimized.tsx`
- Removed misplaced `src/vite.config.ts` file (was causing bundler conflicts)
- Updated lucide-react to version 0.555.0
- Added Supabase environment secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

## Development Environment

**Running the Application:**
- Workflow: "Start application" runs `npm run dev`
- Development server: http://localhost:5000
- Frontend is proxied through Replit's web preview

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
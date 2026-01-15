# Hydrogen MLM Cabinet Prototype

## Overview

This is a multi-level marketing (MLM) partner cabinet application for hydrogen-based health products. The application provides a comprehensive dashboard for partners to manage their network, track orders, monitor earnings, and access training materials. It includes a full administrative backend for managing users, products, orders, payouts, and system configuration.

The project is built as a React single-page application with a Hono-based backend running on Supabase Edge Functions, using Supabase KV store for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
- **Styling**: Tailwind CSS with custom design tokens
- **UI Components**: Radix UI primitives wrapped with shadcn/ui styling patterns
- **State Management**: React Query (@tanstack/react-query) for server state caching
- **Routing**: URL-based routing handled in AppRu.tsx with pathname matching

### Component Organization

- **Dashboard System**: Unified dashboard with multiple modes (CEO, Admin Ops, Finance, Warehouse, SEO, Support, Partner)
- **Admin Panel**: Comprehensive admin interface for user management, products, orders, payouts, and training content
- **Authentication**: Email/password auth, Google OAuth, Telegram widget, and demo mode
- **Figma UI Integration**: Separate `/figma-ui/` directory for UI components following Container+View pattern

### Backend Architecture

- **Runtime**: Deno on Supabase Edge Functions
- **Framework**: Hono for HTTP routing
- **Database**: Supabase KV store for all data persistence
- **Key Prefixes**: 
  - `user:id:*` - Partner users
  - `admin:id:*` - Admin users (CEO, admin-1, admin-2)
  - `user:email:*` and `admin:email:*` - Email indexes
  - `order:*`, `product:*`, `withdrawal:*`, `lesson:*` - Entity data

### Authentication Flow

1. Multiple auth methods: Email/password, Google OAuth, Telegram
2. Admin detection via `isUserAdmin()` function checking multiple conditions
3. Token stored in localStorage with userId
4. Middleware validates requests via `X-User-Id` header

### MLM Commission System

- Multi-level commissions (L0-L3) calculated per product
- Customizable commission rates stored on product objects
- Automatic payout processing through sponsor chain
- Partner levels (1-3) with tiered pricing

### Team Structure Metrics (A/B/C Display)

- **Format**: A/B/C = firstLine / depth / totalTeam
- **API Endpoint**: `/users/:userId/team-structure`
- **Components**: TeamStructureBadge displays metrics with tooltips
- **Data Flow**: ProfileRu and PartnerDashboard fetch from API on mount
- **Calculation**: Uses recursive depth-first traversal with cycle protection (visited set) and max depth limit (50 levels)

## External Dependencies

### Supabase Services
- **Supabase Edge Functions**: Backend API hosting
- **Supabase KV Store**: Primary data storage
- **Supabase Auth**: OAuth provider integration

### Third-Party Libraries
- **@tanstack/react-query**: Server state management and caching
- **@tanstack/react-virtual**: List virtualization for performance
- **Recharts**: Data visualization and charts
- **Lucide React**: Icon library
- **date-fns**: Date manipulation
- **html2canvas + jspdf**: PDF generation
- **qr-code-styling**: QR code generation for referral links

### Authentication Providers
- Google OAuth (via Supabase Auth)
- Telegram Login Widget

### Environment Variables Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for KV operations
- `SUPABASE_ANON_KEY`: Public anon key for client requests
# Hydrogen MLM Cabinet Prototype

## Overview

This is a React-based MLM (Multi-Level Marketing) partner cabinet application for hydrogen wellness products. The application provides a comprehensive dashboard system for partners, administrators, and CEO-level users to manage their network, track earnings, process orders, and monitor business metrics.

The platform includes:
- Multi-role dashboard system (Partner, Admin, CEO, Finance, Warehouse, SEO, Support views)
- MLM structure visualization with team tree rendering
- Order management and commission calculations
- Withdrawal/payout processing
- Product catalog management
- Training/education modules
- Achievement and gamification systems
- Marketing tools with QR code generation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Stack
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite with SWC plugin for fast compilation
- **Styling:** Tailwind CSS with custom design tokens
- **UI Components:** shadcn/ui (Radix UI primitives) for accessible, composable components
- **State Management:** React useState/useEffect with React Query (@tanstack/react-query) for server state
- **Virtualization:** @tanstack/react-virtual for large list rendering (user trees)
- **Charts:** Recharts for data visualization
- **Animations:** Framer Motion (via 'motion' package)

### Backend Architecture
- **Runtime:** Supabase Edge Functions (Deno)
- **Framework:** Hono.js for HTTP routing
- **Database:** Supabase KV Store (key-value storage)
- **Authentication:** Custom JWT-based auth with support for email/password and OAuth (Google, Telegram)

### Data Storage Pattern
The application uses a prefix-based KV store pattern:
- `user:id:{userId}` - Partner user records
- `admin:id:{adminId}` - Administrator records  
- `user:email:{email}` - Email to user ID index
- `admin:email:{email}` - Email to admin ID index
- `order:{orderId}` - Order records
- `withdrawal:{id}` - Withdrawal requests
- `product:{id}` - Product catalog items
- `lesson:{id}` - Training lessons

### Key Design Patterns

**Unified Dashboard System:**
The `UnifiedDashboard` component serves as a single entry point that dynamically renders different dashboard views based on user role (CEO, Admin, Finance, Partner, etc.). This is wrapped in `DrilldownProvider` for cross-component navigation context.

**Container + View Pattern:**
UI components are split between pure presentation (in `/figma-ui/`) and logic containers (in `/src/containers/`), allowing design updates without breaking business logic.

**Demo Mode:**
The application supports a full demo mode with generated mock data (`/utils/demoData.ts`) that allows preview without a live backend.

**MLM Commission Calculation:**
The `/utils/mlm.ts` module handles multi-level commission calculations with configurable rates per product and support for up to 5 sponsor levels (L0-L5).

### Route Structure
API endpoints follow the pattern `/make-server-05aa3c8a/{resource}`:
- `/auth/*` - Authentication (login, register, OAuth callbacks)
- `/user/*` - User profile and data
- `/orders/*` - Order management
- `/admin/*` - Administrative operations
- `/products/*` - Catalog management

## External Dependencies

### Core Services
- **Supabase:** Backend-as-a-Service providing:
  - Edge Functions for serverless API
  - KV Store for data persistence
  - OAuth integration support
  - Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Authentication Providers
- **Google OAuth:** For single sign-on authentication
- **Telegram Login Widget:** For Telegram-based authentication (Mini App support)

### Frontend Libraries
- **Radix UI:** Complete primitive component library for dialogs, dropdowns, tabs, etc.
- **Recharts:** Charting library for dashboard visualizations
- **Lucide React:** Icon library
- **date-fns:** Date manipulation utilities
- **html2canvas + jspdf:** PDF generation for reports/certificates
- **qr-code-styling:** QR code generation for referral links
- **embla-carousel-react:** Carousel component for product displays

### Development Tools
- **React Query:** Server state caching and synchronization
- **React Virtual:** Virtualized list rendering for performance
- **cmdk:** Command palette component
- **sonner:** Toast notification system
- **react-hook-form:** Form state management
- **react-day-picker:** Date picker component
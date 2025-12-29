# Figma Make Integration Guide

## Overview

This project uses the "GitHub as Bridge" pattern:
- **Figma Make** → exports UI components to GitHub
- **GitHub** → stores UI components
- **Replit** → imports UI and adds business logic
- **Vercel** → deploys the final app

## Folder Structure

```
/src
├── figma-ui/              # UI from Figma Make (synced via GitHub)
│   ├── components/
│   │   ├── dashboard/     # Dashboard UI
│   │   ├── admin/         # Admin UI
│   │   └── shared/        # Shared components
│   └── ui/                # shadcn/ui components
│
├── containers/            # Business logic (Container pattern)
│   ├── dashboard/
│   └── admin/
│
├── components/            # Existing components (legacy)
├── hooks/                 # React hooks
├── utils/                 # API client, utilities
└── MainApp.tsx
```

## Container Pattern

### Concept

Separate UI (presentation) from Logic (behavior):

| Layer | Location | Contains |
|-------|----------|----------|
| UI (View) | `/figma-ui` | Pure React components, props only |
| Logic (Container) | `/containers` | State, API calls, handlers |

### Example Migration

**Before (mixed):**
```tsx
// Old component with mixed UI and logic
function Dashboard() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setData);
  }, []);
  
  return (
    <div className="p-6">
      <h1>Dashboard</h1>
      <span>{data?.count}</span>
    </div>
  );
}
```

**After (separated):**

```tsx
// /src/figma-ui/components/dashboard/DashboardView.tsx
// Pure UI - no useState, no useEffect, no fetch
interface DashboardViewProps {
  loading: boolean;
  count: number;
  onRefresh: () => void;
}

export function DashboardView({ loading, count, onRefresh }: DashboardViewProps) {
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="p-6">
      <h1>Dashboard</h1>
      <span>{count}</span>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  );
}
```

```tsx
// /src/containers/dashboard/DashboardContainer.tsx
// All logic here
import { DashboardView } from '../../figma-ui/components/dashboard/DashboardView';

export function DashboardContainer() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    const response = await fetch('/api/stats');
    setData(await response.json());
    setLoading(false);
  };
  
  return (
    <DashboardView 
      loading={loading}
      count={data?.count || 0}
      onRefresh={loadData}
    />
  );
}
```

## Step-by-Step Migration

### 1. Setup GitHub Sync

```bash
# In Replit Shell
git remote add figma-origin https://github.com/YOUR_ORG/figma-ui-components.git

# Pull UI components
git fetch figma-origin
git checkout figma-origin/main -- src/figma-ui/
```

### 2. Create Container for Existing Component

1. Identify component to migrate (e.g., `CEOMissionControl`)
2. Copy UI part to `/figma-ui/components/dashboard/CEOMissionControlView.tsx`
3. Create `/containers/dashboard/CEOMissionControlContainer.tsx`
4. Move all logic (hooks, API calls) to Container
5. Update imports in `MainApp.tsx`

### 3. Update MainApp.tsx

```tsx
// Before
import { CEOMissionControl } from './components/dashboard/CEOMissionControl';

// After
import { CEOMissionControlContainer } from './containers/dashboard/CEOMissionControlContainer';
```

## API Integration

All API calls should be in Containers, using `/src/utils/api.ts`:

```tsx
import * as api from '../../utils/api';

// In Container
const loadStats = async () => {
  const response = await api.getAdminStats();
  if (response.success) {
    setStats(response.stats);
  }
};
```

## Supabase Queries

For direct Supabase access in Containers:

```tsx
import { supabase } from '../../utils/supabase';

const loadUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(10);
    
  if (!error) setUsers(data);
};
```

## Props Interface Convention

Define clear interfaces for UI components:

```tsx
// In View component file
export interface DashboardViewProps {
  // Data
  loading: boolean;
  stats: DashboardStats | null;
  error: string | null;
  
  // Handlers
  onRefresh: () => void;
  onPeriodChange: (period: number) => void;
  
  // Optional
  className?: string;
}
```

## Testing Migration

1. Create Container
2. Import View from figma-ui (or use placeholder)
3. Test Container logic works
4. Replace placeholder with Figma Make component
5. Verify UI renders correctly

## Deployment

Deploy from Replit to Vercel:

```bash
# Automatic via vercel.json
npm run build
```

Vercel config is already set up in `/vercel.json`.

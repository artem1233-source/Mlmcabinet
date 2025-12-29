# Container Components

This folder contains Container components that connect UI with business logic.

## Container Pattern

Container components:
- Import pure UI from `/src/figma-ui/`
- Contain all business logic (useState, useEffect, API calls)
- Handle Supabase queries
- Format data for display
- Pass props to UI components

## Structure

```
/containers
├── dashboard/
│   ├── CEOMissionControlContainer.tsx
│   ├── AdminOpsDashboardContainer.tsx
│   └── FinanceDashboardContainer.tsx
└── admin/
    └── ...
```

## Example

```tsx
import { useState, useEffect } from 'react';
import { DashboardView } from '../../figma-ui/components/dashboard/DashboardView';
import * as api from '../../utils/api';

export function DashboardContainer({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const response = await api.getAdminStats();
      setStats(response.stats);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <DashboardView 
      loading={loading}
      stats={stats}
      onRefresh={loadData}
    />
  );
}
```

## Migration Steps

1. Create UI component in `/figma-ui` (or import from Figma Make)
2. Create Container in `/containers`
3. Move logic from old component to Container
4. Update imports in MainApp.tsx

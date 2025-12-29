# Figma UI Components

This folder is synchronized with GitHub repository containing UI components from Figma Make.

## Structure

```
/figma-ui
├── components/           # Main UI components from Figma Make
│   ├── dashboard/       # Dashboard UI (no logic!)
│   ├── admin/           # Admin UI
│   └── shared/          # Shared UI components
└── ui/                  # shadcn/ui components from Figma Make
```

## Important Rules

1. **DO NOT add business logic here** - This folder contains pure UI only
2. **DO NOT manually edit files** - They will be overwritten by Figma Make sync
3. **Use Container pattern** - Import UI from here into `/src/containers/`

## Sync Workflow

```
Figma Make → GitHub → Replit (this folder)
```

## Example Usage

```tsx
// In /src/containers/dashboard/CEOMissionControlContainer.tsx
import { CEOMissionControlView } from '../../figma-ui/components/dashboard/CEOMissionControlView';

export function CEOMissionControlContainer({ currentUser }) {
  const [data, setData] = useState(null);
  
  // All logic here...
  
  return <CEOMissionControlView data={data} />;
}
```

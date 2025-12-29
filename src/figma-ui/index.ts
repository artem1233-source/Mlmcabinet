/**
 * 📦 FIGMA UI EXPORTS
 * 
 * Централизованный экспорт всех UI компонентов из Figma Make
 */

// ============================================================================
// DASHBOARD VIEWS
// ============================================================================

export { 
  CEOMissionControlView,
  type CEOMissionControlViewProps,
  type DashboardStats,
  type ActionAlert,
  type TopPartner,
} from './components/dashboard/CEOMissionControlView';

// TODO: Добавить остальные Dashboard Views после миграции
// export { AdminOpsDashboardView } from './components/dashboard/AdminOpsDashboardView';
// export { FinanceDashboardView } from './components/dashboard/FinanceDashboardView';
// export { SEODashboardView } from './components/dashboard/SEODashboardView';
// export { SupportDashboardView } from './components/dashboard/SupportDashboardView';
// export { WarehouseDashboardView } from './components/dashboard/WarehouseDashboardView';

// ============================================================================
// ADMIN VIEWS
// ============================================================================

// TODO: Добавить Admin Views
// export { UsersManagementView } from './components/admin/UsersManagementView';
// export { FinanceManagementView } from './components/admin/FinanceManagementView';

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================

export { KPICard } from './components/shared/KPICard';
export { StatusLight } from './components/shared/StatusLight';
export { ChartContainer } from './components/shared/ChartContainer';
export { ActionItem, type ActionSeverity } from './components/shared/ActionItem';

// ============================================================================
// UI PRIMITIVES (shadcn/ui)
// ============================================================================

export { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from './ui/card';
export { Badge } from './ui/badge';
export { Button } from './ui/button';
export { cn } from './ui/utils';
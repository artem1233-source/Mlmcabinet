export type TrendDirection = 'up' | 'down' | 'flat';
export type AlertLevel = 'critical' | 'warning' | 'info';

export interface KPI {
  id: string;
  title: string;
  value: number | string;
  delta?: number;
  trend?: TrendDirection;
  suffix?: string;
  prefix?: string;
}

export interface ChartSeries {
  name: string;
  data: Array<{ x: string | number; y: number }>;
  color?: string;
}

export interface ChartData {
  id: string;
  title: string;
  type?: 'line' | 'bar' | 'area' | 'pie';
  series: ChartSeries[];
}

export interface TableColumn {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, any>[];
}

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface DashboardPayload {
  kpis: KPI[];
  charts: ChartData[];
  table?: TableData;
  alerts?: Alert[];
}

export type DashboardMode = 
  | 'ceo'
  | 'admin'
  | 'finance'
  | 'warehouse'
  | 'seo'
  | 'support';

export interface DashboardModeConfig {
  id: DashboardMode;
  label: string;
  icon: string;
  allowedRoles: string[];
}

export const DASHBOARD_MODES: DashboardModeConfig[] = [
  { id: 'ceo', label: 'Центр управления', icon: 'Crown', allowedRoles: ['ceo'] },
  { id: 'admin', label: 'Администрирование', icon: 'Settings', allowedRoles: ['ceo', 'admin', 'manager'] },
  { id: 'finance', label: 'Финансы', icon: 'DollarSign', allowedRoles: ['ceo', 'admin', 'manager'] },
  { id: 'warehouse', label: 'Склад', icon: 'Package', allowedRoles: ['ceo', 'admin', 'manager', 'warehouse'] },
  { id: 'seo', label: 'SEO / Маркетинг', icon: 'TrendingUp', allowedRoles: ['ceo', 'seo'] },
  { id: 'support', label: 'Поддержка', icon: 'Headphones', allowedRoles: ['ceo', 'support'] },
];

export type PeriodOption = 1 | 7 | 30 | 90 | 365;

export const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 1, label: '1 день' },
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
  { value: 365, label: '365 дней' },
];

export type DashboardState = 'loading' | 'empty' | 'error' | 'success';

export interface DashboardData {
  kpis: KPI[];
  charts: ChartData[];
  tables: TableData[];
  alerts: Alert[];
}

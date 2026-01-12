// H2 Platform Admin Panel Types

export type Role = 'SEO' | 'AdminOps' | 'Finance' | 'Warehouse' | 'Marketing' | 'Support' | 'Partner';

export type ViewMode = 'view' | 'act';

export interface RoleConfig {
  id: Role;
  name: string;
  description: string;
  icon: string;
  color: string;
  canSwitchRoles: boolean;
  permissions: Permission[];
}

export type Permission = 
  | 'view_all'
  | 'manage_users'
  | 'manage_orders'
  | 'manage_finances'
  | 'manage_warehouse'
  | 'manage_marketing'
  | 'manage_support'
  | 'view_pii'
  | 'view_costs'
  | 'audit_log'
  | 'impersonate'
  | 'bulk_operations'
  | 'force_actions';

export type Period = 'today' | '7' | '30' | '90' | 'year';

export type OrderStatus = 
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'picking'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refund_requested'
  | 'refund_processing'
  | 'refunded'
  | 'payment_failed'
  | 'address_issue';

export interface KPIData {
  label: string;
  value: string | number;
  delta?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  clickable?: boolean;
  size?: 'S' | 'M' | 'L';
}

export interface AlertBanner {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  SEO: {
    id: 'SEO',
    name: 'Владелец (Owner/SuperAdmin)',
    description: 'Полный доступ ко всем функциям',
    icon: '👑',
    color: '#8B5CF6',
    canSwitchRoles: true,
    permissions: ['view_all', 'manage_users', 'manage_orders', 'manage_finances', 'manage_warehouse', 'manage_marketing', 'manage_support', 'view_pii', 'view_costs', 'audit_log', 'impersonate', 'bulk_operations', 'force_actions']
  },
  AdminOps: {
    id: 'AdminOps',
    name: 'Администрирование (AdminOps)',
    description: 'Управление партнёрами и операциями',
    icon: '⚙️',
    color: '#3B82F6',
    canSwitchRoles: false,
    permissions: ['manage_users', 'view_pii', 'bulk_operations', 'audit_log']
  },
  Finance: {
    id: 'Finance',
    name: 'Финансы (Finance)',
    description: 'Выплаты, возвраты, себестоимость',
    icon: '💰',
    color: '#10B981',
    canSwitchRoles: false,
    permissions: ['manage_finances', 'view_costs', 'audit_log']
  },
  Warehouse: {
    id: 'Warehouse',
    name: 'Склад (Warehouse)',
    description: 'Сборка, отправка, остатки',
    icon: '📦',
    color: '#F59E0B',
    canSwitchRoles: false,
    permissions: ['manage_warehouse', 'view_pii', 'audit_log']
  },
  Marketing: {
    id: 'Marketing',
    name: 'Маркетинг (Marketing)',
    description: 'Источники, UTM, промокоды',
    icon: '📊',
    color: '#EC4899',
    canSwitchRoles: false,
    permissions: ['manage_marketing', 'audit_log']
  },
  Support: {
    id: 'Support',
    name: 'Поддержка (Support)',
    description: 'Тикеты, возвраты, помощь клиентам',
    icon: '💬',
    color: '#6366F1',
    canSwitchRoles: false,
    permissions: ['manage_support', 'view_pii', 'audit_log']
  },
  Partner: {
    id: 'Partner',
    name: 'Партнёр (Partner)',
    description: 'Личный кабинет партнёра',
    icon: '👤',
    color: '#39B7FF',
    canSwitchRoles: false,
    permissions: []
  }
};

export const ORDER_STATUSES: Record<OrderStatus, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: 'gray' },
  pending_payment: { label: 'Ожидает оплаты', color: 'orange' },
  paid: { label: 'Оплачен', color: 'green' },
  picking: { label: 'В сборке', color: 'blue' },
  packed: { label: 'Собран', color: 'blue' },
  shipped: { label: 'Отправлен', color: 'purple' },
  delivered: { label: 'Доставлен', color: 'green' },
  cancelled: { label: 'Отменён', color: 'red' },
  refund_requested: { label: 'Возвра�� запрошен', color: 'yellow' },
  refund_processing: { label: 'Возврат в обработке', color: 'yellow' },
  refunded: { label: 'Возврат завершён', color: 'gray' },
  payment_failed: { label: 'Ошибка оплаты', color: 'red' },
  address_issue: { label: 'Проблема адреса', color: 'red' }
};
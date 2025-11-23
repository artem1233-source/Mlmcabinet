// Helper function to get permissions based on role
export function getPermissionsForRole(role: string): string[] {
  const permissions: { [key: string]: string[] } = {
    ceo: [
      'manage_admins',
      'manage_users', 
      'manage_products',
      'manage_orders',
      'manage_finance',
      'manage_warehouse',
      'view_analytics',
      'manage_settings'
    ],
    finance: [
      'manage_finance',
      'view_orders',
      'view_users',
      'view_analytics'
    ],
    warehouse: [
      'manage_warehouse',
      'manage_products',
      'view_orders'
    ],
    manager: [
      'manage_users',
      'manage_orders',
      'view_analytics'
    ],
    support: [
      'view_users',
      'view_orders',
      'view_products'
    ]
  };
  
  return permissions[role] || permissions.support;
}

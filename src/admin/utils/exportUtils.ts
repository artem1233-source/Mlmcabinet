/**
 * Утилиты для экспорта данных из админ-панели H2 Platform
 */

// Экспорт в CSV
export function exportToCSV(data: any[], filename: string, columns?: string[]) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Определяем колонки
  const cols = columns || Object.keys(data[0]);
  
  // Создаём заголовок CSV
  const header = cols.join(',');
  
  // Создаём строки CSV
  const rows = data.map(row => {
    return cols.map(col => {
      const value = row[col];
      // Экранируем значения с запятыми и кавычками
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',');
  });
  
  // Объединяем всё вместе
  const csv = [header, ...rows].join('\n');
  
  // Создаём Blob и скачиваем
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  // Очистка
  URL.revokeObjectURL(link.href);
}

// Экспорт заказов
export function exportOrders(orders: any[], role: string) {
  const columns = role === 'SEO' 
    ? ['id', 'date', 'customer', 'product', 'amount', 'cost', 'margin', 'status', 'partner']
    : role === 'Finance'
    ? ['id', 'date', 'customer', 'amount', 'status', 'commissions']
    : role === 'Warehouse'
    ? ['id', 'customer', 'phone', 'address', 'product', 'status', 'track']
    : ['id', 'date', 'customer', 'product', 'amount', 'status'];
  
  exportToCSV(orders, `orders_${role.toLowerCase()}`, columns);
}

// Экспорт пользователей (AdminOps)
export function exportUsers(users: any[]) {
  const columns = ['id', 'name', 'email', 'phone', 'level', 'team', 'revenue', 'status'];
  const formattedUsers = users.map(u => ({
    id: u.id,
    name: u.name || u.full_name,
    email: u.email,
    phone: u.phone || u.phone_number,
    level: u.rank || u.level,
    team: u.team_size || 0,
    revenue: u.total_revenue || 0,
    status: u.is_blocked ? 'blocked' : u.rank > 0 ? 'active' : 'pending'
  }));
  
  exportToCSV(formattedUsers, 'users_adminops', columns);
}

// Экспорт запросов на выплаты (Finance)
export function exportPayouts(payouts: any[]) {
  const columns = ['id', 'user', 'amount', 'frozen', 'available', 'status', 'date'];
  exportToCSV(payouts, 'payouts_finance', columns);
}

// Экспорт возвратов (Finance)
export function exportRefunds(refunds: any[]) {
  const columns = ['id', 'order', 'customer', 'amount', 'type', 'status', 'daysLeft'];
  exportToCSV(refunds, 'refunds_finance', columns);
}

// Экспорт остатков товаров (Warehouse)
export function exportStock(stockItems: any[]) {
  const columns = ['name', 'qty', 'lowStock'];
  exportToCSV(stockItems, 'stock_warehouse', columns);
}

// Экспорт дашборда (Owner)
export function exportDashboard(data: any) {
  const dashboardData = [
    { metric: 'Выручка', value: data.kpis.revenue },
    { metric: 'Комиссии', value: data.kpis.commissions },
    { metric: 'Frozen комиссии', value: data.kpis.frozen },
    { metric: 'Выплаты pending', value: data.kpis.payouts },
    { metric: 'Активные партнёры', value: data.kpis.partners },
    { metric: 'Заказов', value: data.kpis.orders },
  ];
  
  exportToCSV(dashboardData, 'dashboard_owner', ['metric', 'value']);
}

// Экспорт в JSON (для резервных копий)
export function exportToJSON(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Форматирование для печати
export function formatForPrint(data: any, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #39B7FF; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #E6E9EE; padding: 8px; text-align: left; }
        th { background: #F7FAFC; font-weight: bold; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>Дата: ${new Date().toLocaleDateString('ru-RU')}</p>
      ${Array.isArray(data) ? arrayToTable(data) : objectToTable(data)}
      <button onclick="window.print()">Печать</button>
    </body>
    </html>
  `;
}

function arrayToTable(data: any[]): string {
  if (data.length === 0) return '<p>Нет данных</p>';
  
  const keys = Object.keys(data[0]);
  const header = keys.map(k => `<th>${k}</th>`).join('');
  const rows = data.map(row => 
    `<tr>${keys.map(k => `<td>${row[k]}</td>`).join('')}</tr>`
  ).join('');
  
  return `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}

function objectToTable(data: any): string {
  const rows = Object.entries(data).map(([key, value]) => 
    `<tr><th>${key}</th><td>${value}</td></tr>`
  ).join('');
  
  return `<table><tbody>${rows}</tbody></table>`;
}

// Открыть окно печати
export function printData(data: any, title: string) {
  const html = formatForPrint(data, title);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

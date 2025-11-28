/**
 * 📊 ЭКСПОРТ ДАННЫХ ДАШБОРДА В CSV
 * 
 * Функции для экспорта различных разделов дашборда:
 * - Общая статистика
 * - Заказы
 * - Доходы
 * - Аналитика по периодам
 */

/**
 * Экспорт общей статистики дашборда
 */
export function exportDashboardStats(stats: any, adminStats?: any) {
  const rows = [
    ['Метрика', 'Значение'],
    ['Общий доход', `₽${stats.totalEarnings?.toLocaleString('ru-RU') || 0}`],
    ['Доход за месяц', `₽${stats.monthEarnings?.toLocaleString('ru-RU') || 0}`],
    ['Активные заказы', stats.activeOrders || 0],
    ['Размер команды', stats.teamSize || 0],
  ];

  // Добавляем админ статистику если есть
  if (adminStats) {
    rows.push(
      ['', ''],
      ['=== АДМИНИСТРАТОРСКАЯ СТАТИСТИКА ===', ''],
      ['Всего пользователей', adminStats.totalUsers || 0],
      ['Всего заказов', adminStats.totalOrders || 0],
      ['Общий оборот', `₽${adminStats.totalRevenue?.toLocaleString('ru-RU') || 0}`],
      ['Активные партнёры', adminStats.activePartners || 0],
    );
  }

  downloadCSV(rows, `dashboard-stats-${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Экспорт недавних заказов
 */
export function exportRecentOrders(orders: any[]) {
  const rows = [
    ['№ Заказа', 'Дата', 'Клиент', 'Сумма', 'Статус']
  ];

  orders.forEach(order => {
    rows.push([
      order.номерЗаказа || order.id || '-',
      new Date(order.дата || order.createdAt).toLocaleDateString('ru-RU'),
      order.клиент || order.покупатель || '-',
      `₽${(order.сумма || order.total || 0).toLocaleString('ru-RU')}`,
      order.статус || order.status || '-'
    ]);
  });

  downloadCSV(rows, `recent-orders-${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Экспорт доходов
 */
export function exportEarnings(earnings: any[]) {
  const rows = [
    ['Дата', 'Тип', 'Сумма', 'От кого', 'Описание']
  ];

  earnings.forEach(earning => {
    rows.push([
      new Date(earning.дата || earning.date || earning.createdAt).toLocaleDateString('ru-RU'),
      earning.тип || earning.type || '-',
      `₽${(earning.сумма || earning.amount || 0).toLocaleString('ru-RU')}`,
      earning.отКого || earning.from || '-',
      earning.описание || earning.description || '-'
    ]);
  });

  downloadCSV(rows, `earnings-${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Экспорт данных графика
 */
export function exportChartData(chartData: any[], period: string) {
  const rows = [
    ['Дата', 'Заказы', 'Доход']
  ];

  chartData.forEach(item => {
    rows.push([
      item.displayDate || item.date,
      item.orders || 0,
      `₽${(item.revenue || 0).toLocaleString('ru-RU')}`
    ]);
  });

  downloadCSV(rows, `chart-data-${period}-${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Экспорт данных роста команды
 */
export function exportTeamGrowthData(growthData: any[], period: string) {
  const rows = [
    ['Дата', 'Количество партнёров']
  ];

  growthData.forEach(item => {
    rows.push([
      item.displayDate || item.date,
      item.count || 0
    ]);
  });

  downloadCSV(rows, `team-growth-${period}-${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Экспорт полного отчёта дашборда
 */
export function exportFullDashboard(data: {
  stats: any;
  adminStats?: any;
  orders: any[];
  earnings: any[];
  chartData: any[];
  teamGrowthData: any[];
  period: string;
}) {
  const { stats, adminStats, orders, earnings, chartData, teamGrowthData, period } = data;

  const rows = [
    ['=== ОТЧЁТ ДАШБОРДА ==='],
    [`Дата создания: ${new Date().toLocaleString('ru-RU')}`],
    [`Период: ${period}`],
    [''],
    ['=== ОБЩАЯ СТАТИСТИКА ==='],
    ['Метрика', 'Значение'],
    ['Общий доход', `₽${stats.totalEarnings?.toLocaleString('ru-RU') || 0}`],
    ['Доход за месяц', `₽${stats.monthEarnings?.toLocaleString('ru-RU') || 0}`],
    ['Активные заказы', stats.activeOrders || 0],
    ['Размер команды', stats.teamSize || 0],
  ];

  // Админ статистика
  if (adminStats) {
    rows.push(
      [''],
      ['=== АДМИНИСТРАТОРСКАЯ СТАТИСТИКА ==='],
      ['Всего пользователей', adminStats.totalUsers || 0],
      ['Всего заказов', adminStats.totalOrders || 0],
      ['Общий оборот', `₽${adminStats.totalRevenue?.toLocaleString('ru-RU') || 0}`],
      ['Активные партнёры', adminStats.activePartners || 0],
    );
  }

  // Недавние заказы
  rows.push(
    [''],
    ['=== НЕДАВНИЕ ЗАКАЗЫ ==='],
    ['№ Заказа', 'Дата', 'Клиент', 'Сумма', 'Статус']
  );

  orders.slice(0, 10).forEach(order => {
    rows.push([
      order.номерЗаказа || order.id || '-',
      new Date(order.дата || order.createdAt).toLocaleDateString('ru-RU'),
      order.клиент || order.покупатель || '-',
      `₽${(order.сумма || order.total || 0).toLocaleString('ru-RU')}`,
      order.статус || order.status || '-'
    ]);
  });

  // Доходы
  rows.push(
    [''],
    ['=== ПОСЛЕДНИЕ ДОХОДЫ ==='],
    ['Дата', 'Тип', 'Сумма', 'От кого']
  );

  earnings.slice(0, 10).forEach(earning => {
    rows.push([
      new Date(earning.дата || earning.date || earning.createdAt).toLocaleDateString('ru-RU'),
      earning.тип || earning.type || '-',
      `₽${(earning.сумма || earning.amount || 0).toLocaleString('ru-RU')}`,
      earning.отКого || earning.from || '-'
    ]);
  });

  // График продаж
  rows.push(
    [''],
    ['=== ДИНАМИКА ПРОДАЖ ==='],
    ['Дата', 'Заказы', 'Доход']
  );

  chartData.forEach(item => {
    rows.push([
      item.displayDate || item.date,
      item.orders || 0,
      `₽${(item.revenue || 0).toLocaleString('ru-RU')}`
    ]);
  });

  // Рост команды
  if (teamGrowthData && teamGrowthData.length > 0) {
    rows.push(
      [''],
      ['=== РОСТ КОМАНДЫ ==='],
      ['Дата', 'Количество партнёров']
    );

    teamGrowthData.forEach(item => {
      rows.push([
        item.displayDate || item.date,
        item.count || 0
      ]);
    });
  }

  downloadCSV(rows, `full-dashboard-${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Вспомогательная функция для скачивания CSV
 */
function downloadCSV(rows: any[][], filename: string) {
  // Преобразуем данные в CSV формат
  const csvContent = rows
    .map(row => 
      row.map(cell => {
        // Экранируем кавычки и запятые
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
    .join('\n');

  // Добавляем BOM для корректного отображения кириллицы в Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Создаём ссылку для скачивания
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log('📥 CSV файл скачан:', filename);
}

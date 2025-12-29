/**
 * Утилиты для экспорта данных из Dashboard с поддержкой drilldown
 */

import { downloadCSV, exportDashboard } from './exportCSV';
import { DrilldownFilter } from '../components/dashboard/DrilldownProvider';
import { formatDelta } from './periodCalculations';

export interface ExportableKPI {
  title: string;
  value: number | string;
  delta?: number;
  status?: string;
  suffix?: string;
  period?: string;
}

export interface ExportableChart {
  name: string;
  data: any[];
}

/**
 * Экспортирует KPI метрики из Dashboard
 */
export function exportKPIMetrics(
  metrics: ExportableKPI[],
  dashboardName: string,
  period?: string
) {
  const formatted = metrics.map((m) => ({
    'Метрика': m.title,
    'Значение': m.value,
    'Суффикс': m.suffix || '',
    'Изменение': m.delta !== undefined ? formatDelta(m.delta) : '',
    'Статус': m.status || '',
    'Период': period || m.period || '',
  }));

  const filename = `${dashboardName}_KPI_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formatted, filename);
}

/**
 * Экспортирует данные графика
 */
export function exportChartData(
  chartData: any[],
  chartName: string,
  dashboardName: string
) {
  if (!chartData || chartData.length === 0) {
    console.warn('No chart data to export');
    return;
  }

  const filename = `${dashboardName}_${chartName}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(chartData, filename);
}

/**
 * Экспортирует данные из таблицы действий (Action Items)
 */
export function exportActionItems(
  actions: Array<{
    severity: string;
    title: string;
    subtitle: string;
    timestamp?: string;
  }>,
  dashboardName: string
) {
  const formatted = actions.map((a) => ({
    'Приоритет': a.severity === 'critical' ? 'Критический' : 
                  a.severity === 'warning' ? 'Предупреждение' : 'Информация',
    'Заголовок': a.title,
    'Описание': a.subtitle,
    'Время': a.timestamp || '',
  }));

  const filename = `${dashboardName}_Actions_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formatted, filename);
}

/**
 * Экспортирует данные из Top Partners / Team Members
 */
export function exportTopPartners(
  partners: Array<{
    id?: string;
    name?: string;
    имя?: string;
    revenue?: number;
    выручка?: number;
    orders?: number;
    заказы?: number;
    rank?: number;
    уровень?: number;
  }>,
  dashboardName: string
) {
  const formatted = partners.map((p, index) => ({
    'Место': index + 1,
    'ID': p.id || '',
    'Имя': p.name || p.имя || '',
    'Выручка': p.revenue || p.выручка || 0,
    'Заказы': p.orders || p.заказы || 0,
    'Уровень': p.rank || p.уровень || 1,
  }));

  const filename = `${dashboardName}_Top_Partners_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formatted, filename);
}

/**
 * Экспортирует данные с применением drilldown фильтра
 */
export function exportWithDrilldown(
  data: any[],
  filter: DrilldownFilter,
  dashboardName: string
) {
  let exportFunction: ((data: any[]) => void) | null = null;
  
  switch (filter.type) {
    case 'users':
      exportFunction = exportDashboard.users;
      break;
    case 'orders':
      exportFunction = exportDashboard.orders;
      break;
    case 'payouts':
      exportFunction = exportDashboard.payouts;
      break;
    case 'tickets':
      exportFunction = exportDashboard.tickets;
      break;
    case 'inventory':
      exportFunction = exportDashboard.inventory;
      break;
  }

  if (exportFunction) {
    // Применяем фильтры если они есть
    let filteredData = data;
    if (filter.filters) {
      filteredData = applyFilters(data, filter.filters);
    }
    
    exportFunction(filteredData);
    console.log(`📥 Exported ${filteredData.length} items with drilldown filter:`, filter);
  } else {
    console.warn('Unknown drilldown type:', filter.type);
  }
}

/**
 * Применяет фильтры к данным
 */
function applyFilters(data: any[], filters: { [key: string]: any }): any[] {
  return data.filter((item) => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return true; // Пропускаем пустые фильтры
      }
      
      // Если значение массив, проверяем вхождение
      if (Array.isArray(value)) {
        return value.includes(item[key]);
      }
      
      // Если строка, проверяем на совпадение (case-insensitive)
      if (typeof value === 'string') {
        const itemValue = String(item[key] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      }
      
      // Для остальных типов - прямое сравнение
      return item[key] === value;
    });
  });
}

/**
 * Создаёт комплексный экспорт всего Dashboard
 */
export async function exportFullDashboard(
  dashboardData: {
    name: string;
    kpis?: ExportableKPI[];
    charts?: ExportableChart[];
    actions?: any[];
    topPartners?: any[];
    period?: string;
  }
) {
  const { name, kpis, charts, actions, topPartners, period } = dashboardData;
  
  console.log(`📥 Starting full export for ${name}...`);

  // Экспортируем KPI
  if (kpis && kpis.length > 0) {
    exportKPIMetrics(kpis, name, period);
  }

  // Экспортируем графики
  if (charts && charts.length > 0) {
    charts.forEach((chart) => {
      exportChartData(chart.data, chart.name, name);
    });
  }

  // Экспортируем действия
  if (actions && actions.length > 0) {
    exportActionItems(actions, name);
  }

  // Экспортируем топ партнёров
  if (topPartners && topPartners.length > 0) {
    exportTopPartners(topPartners, name);
  }

  console.log(`✅ Full export for ${name} completed`);
}

/**
 * Хелперы для быстрого экспорта из конкретных Dashboard
 */
export const dashboardExporters = {
  ceo: (data: any) => exportFullDashboard({ name: 'CEO_Mission_Control', ...data }),
  admin: (data: any) => exportFullDashboard({ name: 'Admin_Ops', ...data }),
  finance: (data: any) => exportFullDashboard({ name: 'Finance', ...data }),
  warehouse: (data: any) => exportFullDashboard({ name: 'Warehouse', ...data }),
  seo: (data: any) => exportFullDashboard({ name: 'SEO_Marketing', ...data }),
  support: (data: any) => exportFullDashboard({ name: 'Support', ...data }),
  partner: (data: any) => exportFullDashboard({ name: 'Partner_View', ...data }),
};

/**
 * Утилиты для экспорта данных в CSV формат
 */

interface ExportOptions {
  filename?: string;
  delimiter?: string;
  includeHeaders?: boolean;
  dateFormat?: 'ru' | 'iso';
}

/**
 * Конвертирует массив объектов в CSV строку
 */
export function convertToCSV(
  data: any[],
  options: ExportOptions = {}
): string {
  const {
    delimiter = ';', // Для Excel в России лучше точка с запятой
    includeHeaders = true,
    dateFormat = 'ru',
  } = options;

  if (!data || data.length === 0) {
    return '';
  }

  // Получаем заголовки из первого объекта
  const headers = Object.keys(data[0]);

  // Форматируем значение для CSV
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }

    // Дата
    if (value instanceof Date) {
      return dateFormat === 'ru'
        ? value.toLocaleDateString('ru-RU')
        : value.toISOString();
    }

    // Строка - экранируем кавычки и оборачиваем в кавычки если есть спецсимволы
    if (typeof value === 'string') {
      const needsQuotes = value.includes(delimiter) || value.includes('\n') || value.includes('"');
      const escaped = value.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    }

    // Число
    if (typeof value === 'number') {
      return value.toString().replace('.', ','); // Для русского формата
    }

    // Булево
    if (typeof value === 'boolean') {
      return value ? 'Да' : 'Нет';
    }

    // Объект или массив - конвертируем в JSON
    if (typeof value === 'object') {
      return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
    }

    return String(value);
  };

  // Собираем CSV
  const lines: string[] = [];

  // Добавляем заголовки
  if (includeHeaders) {
    lines.push(headers.join(delimiter));
  }

  // Добавляем данные
  data.forEach((row) => {
    const values = headers.map((header) => formatValue(row[header]));
    lines.push(values.join(delimiter));
  });

  return lines.join('\n');
}

/**
 * Скачивает CSV файл
 */
export function downloadCSV(
  data: any[],
  filename: string = 'export.csv',
  options: ExportOptions = {}
): void {
  const csv = convertToCSV(data, options);

  // Добавляем BOM для корректного отображения кириллицы в Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  // Создаём временную ссылку и кликаем по ней
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Освобождаем память
  URL.revokeObjectURL(url);

  console.log(`📥 Exported ${data.length} rows to ${filename}`);
}

/**
 * Хелперы для экспорта из Dashboard
 */
export const exportDashboard = {
  /**
   * Экспорт пользователей
   */
  users: (users: any[]) => {
    const formatted = users.map((u) => ({
      'ID': u.id || '',
      'Имя': u.имя || u.name || '',
      'Email': u.email || '',
      'Телефон': u.телефон || u.phone || '',
      'Уровень': u.уровень || u.rank || '',
      'Реферер': u.реферер || u.referrer || '',
      'Реф. код': u.реф_код || u.refCode || '',
      'Баланс': u.баланс || u.balance || 0,
      'Дата регистрации': u.дата_регистрации || u.createdAt || '',
    }));

    downloadCSV(formatted, `users_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Экспорт заказов
   */
  orders: (orders: any[]) => {
    const formatted = orders.map((o) => ({
      'ID': o.id || '',
      'Партнёр': o.партнёр || o.partner || '',
      'Товар': o.товар || o.product || '',
      'Сумма': o.сумма || o.amount || 0,
      'Комиссия': o.комиссия || o.commission || 0,
      'Статус': o.статус || o.status || '',
      'Дата': o.дата || o.date || '',
    }));

    downloadCSV(formatted, `orders_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Экспорт выплат
   */
  payouts: (payouts: any[]) => {
    const formatted = payouts.map((p) => ({
      'ID': p.id || '',
      'Партнёр': p.партнёр || p.partner || '',
      'Сумма': p.сумма || p.amount || 0,
      'Метод': p.метод || p.method || '',
      'Статус': p.статус || p.status || '',
      'Дата создания': p.дата_создания || p.created || '',
      'Дата обработки': p.дата_обработки || p.processed || '',
    }));

    downloadCSV(formatted, `payouts_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Экспорт тикетов
   */
  tickets: (tickets: any[]) => {
    const formatted = tickets.map((t) => ({
      'ID': t.id || '',
      'Клиент': t.customer || '',
      'Тема': t.subject || '',
      'Категория': t.category || '',
      'Приоритет': t.priority || '',
      'Статус': t.status || '',
      'Исполнитель': t.assignee || '',
      'Дата создания': t.created || '',
    }));

    downloadCSV(formatted, `tickets_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Экспорт инвентаря
   */
  inventory: (items: any[]) => {
    const formatted = items.map((i) => ({
      'SKU': i.sku || '',
      'Название': i.name || '',
      'Количество': i.quantity || 0,
      'В пути': i.inTransit || 0,
      'Резерв': i.reserved || 0,
      'Доступно': i.available || 0,
      'Min уровень': i.minLevel || 0,
      'Burn Rate': i.burnRate || 0,
      'Runway (дни)': i.runwayDays || 0,
    }));

    downloadCSV(formatted, `inventory_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Экспорт KPI метрик
   */
  kpi: (metrics: any[], dashboardName: string) => {
    const formatted = metrics.map((m) => ({
      'Метрика': m.title || m.name || '',
      'Значение': m.value || 0,
      'Суффикс': m.suffix || '',
      'Дельта': m.delta || 0,
      'Статус': m.status || '',
      'Период': m.period || '',
    }));

    downloadCSV(
      formatted,
      `${dashboardName}_KPI_${new Date().toISOString().split('T')[0]}.csv`
    );
  },
};

/**
 * Копирует данные в буфер обмена (для быстрого копирования)
 */
export async function copyToClipboard(data: any[], options: ExportOptions = {}): Promise<void> {
  const csv = convertToCSV(data, options);
  
  try {
    await navigator.clipboard.writeText(csv);
    console.log('📋 Copied to clipboard');
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    throw err;
  }
}

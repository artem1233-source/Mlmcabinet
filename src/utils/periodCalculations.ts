/**
 * Утилиты для работы с периодами и расчёта дельты (изменений)
 */

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

export interface DeltaResult {
  current: number;
  previous: number;
  delta: number; // В процентах
  deltaAbsolute: number; // Абсолютное изменение
  trend: 'up' | 'down' | 'stable';
}

/**
 * Получает диапазон дат на основе периода (в днях)
 */
export function getPeriodRange(days: number): PeriodRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  const labels: { [key: number]: string } = {
    1: 'Сегодня',
    7: 'За 7 дней',
    30: 'За 30 дней',
    90: 'За 90 дней',
    365: 'За год',
  };

  return {
    start,
    end,
    label: labels[days] || `За ${days} дней`,
  };
}

/**
 * Получает предыдущий период той же длины для сравнения
 */
export function getPreviousPeriodRange(days: number): PeriodRange {
  const end = new Date();
  end.setDate(end.getDate() - days);
  
  const start = new Date();
  start.setDate(start.getDate() - (days * 2));

  return {
    start,
    end,
    label: `Предыдущие ${days} дней`,
  };
}

/**
 * Вычисляет дельту (изменение) между текущим и предыдущим периодом
 */
export function calculateDelta(current: number, previous: number): DeltaResult {
  const deltaAbsolute = current - previous;
  
  // Защита от деления на ноль
  const delta = previous === 0 
    ? (current > 0 ? 100 : 0)
    : ((current - previous) / previous) * 100;

  const trend: 'up' | 'down' | 'stable' = 
    Math.abs(delta) < 0.5 ? 'stable' :
    delta > 0 ? 'up' : 'down';

  return {
    current,
    previous,
    delta: Number(delta.toFixed(1)),
    deltaAbsolute: Number(deltaAbsolute.toFixed(2)),
    trend,
  };
}

/**
 * Фильтрует массив объектов по дате в заданном периоде
 */
export function filterByPeriod<T extends { [key: string]: any }>(
  items: T[],
  dateField: string,
  periodDays: number
): T[] {
  const { start, end } = getPeriodRange(periodDays);
  
  return items.filter((item) => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= start && itemDate <= end;
  });
}

/**
 * Группирует данные по дням для графиков
 */
export function groupByDay<T extends { [key: string]: any }>(
  items: T[],
  dateField: string,
  valueField: string,
  periodDays: number
): Array<{ date: string; value: number }> {
  const { start, end } = getPeriodRange(periodDays);
  
  // Создаём карту дней
  const daysMap = new Map<string, number>();
  
  // Инициализируем все дни в периоде нулями
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    daysMap.set(dateKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Заполняем данными
  items.forEach((item) => {
    const itemDate = new Date(item[dateField]);
    if (itemDate >= start && itemDate <= end) {
      const dateKey = itemDate.toISOString().split('T')[0];
      const currentValue = daysMap.get(dateKey) || 0;
      daysMap.set(dateKey, currentValue + (item[valueField] || 0));
    }
  });
  
  // Конвертируем в массив и форматируем даты
  return Array.from(daysMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({
      date: formatDateForChart(date),
      value,
    }));
}

/**
 * Форматирует дату для отображения на графике
 */
function formatDateForChart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('ru-RU', { month: 'short' });
  
  return `${day} ${month}`;
}

/**
 * Вычисляет агрегированные метрики за период
 */
export function calculatePeriodMetrics<T extends { [key: string]: any }>(
  items: T[],
  dateField: string,
  periodDays: number
): {
  current: {
    total: number;
    count: number;
    average: number;
  };
  previous: {
    total: number;
    count: number;
    average: number;
  };
  delta: DeltaResult;
} {
  const currentPeriod = getPeriodRange(periodDays);
  const previousPeriod = getPreviousPeriodRange(periodDays);
  
  // Фильтруем данные по периодам
  const currentItems = items.filter((item) => {
    const date = new Date(item[dateField]);
    return date >= currentPeriod.start && date <= currentPeriod.end;
  });
  
  const previousItems = items.filter((item) => {
    const date = new Date(item[dateField]);
    return date >= previousPeriod.start && date <= previousPeriod.end;
  });
  
  // Вычисляем метрики
  const currentCount = currentItems.length;
  const previousCount = previousItems.length;
  
  const currentTotal = currentCount;
  const previousTotal = previousCount;
  
  const currentAverage = currentCount > 0 ? currentTotal / currentCount : 0;
  const previousAverage = previousCount > 0 ? previousTotal / previousCount : 0;
  
  return {
    current: {
      total: currentTotal,
      count: currentCount,
      average: currentAverage,
    },
    previous: {
      total: previousTotal,
      count: previousCount,
      average: previousAverage,
    },
    delta: calculateDelta(currentTotal, previousTotal),
  };
}

/**
 * Вычисляет сумму за период
 */
export function calculatePeriodSum<T extends { [key: string]: any }>(
  items: T[],
  dateField: string,
  valueField: string,
  periodDays: number
): DeltaResult {
  const currentPeriod = getPeriodRange(periodDays);
  const previousPeriod = getPreviousPeriodRange(periodDays);
  
  const currentSum = items
    .filter((item) => {
      const date = new Date(item[dateField]);
      return date >= currentPeriod.start && date <= currentPeriod.end;
    })
    .reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);
  
  const previousSum = items
    .filter((item) => {
      const date = new Date(item[dateField]);
      return date >= previousPeriod.start && date <= previousPeriod.end;
    })
    .reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);
  
  return calculateDelta(currentSum, previousSum);
}

/**
 * Конвертирует строку периода (из селектора) в число дней
 */
export function parsePeriod(period: string | number): number {
  const periodNum = typeof period === 'string' ? parseInt(period, 10) : period;
  return isNaN(periodNum) ? 30 : periodNum; // По умолчанию 30 дней
}

/**
 * Форматирует дельту для отображения (+12.5%, -5.3%, etc.)
 */
export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

/**
 * Определяет статус на основе дельты и порогов
 */
export function getStatusFromDelta(
  delta: number,
  thresholds: { critical: number; warning: number } = { critical: -20, warning: -10 }
): 'ok' | 'warning' | 'critical' {
  if (delta <= thresholds.critical) {
    return 'critical';
  }
  if (delta <= thresholds.warning) {
    return 'warning';
  }
  return 'ok';
}

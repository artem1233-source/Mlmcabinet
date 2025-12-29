export function parsePeriod(period: string): number {
  const num = parseInt(period, 10);
  return isNaN(num) ? 30 : num;
}

export function filterByPeriod<T>(
  items: T[],
  dateField: string,
  periodDays: number
): T[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  return items.filter((item: any) => {
    const date = item[dateField];
    if (!date) return false;
    return new Date(date) >= cutoff;
  });
}

export function calculatePeriodSum<T>(
  items: T[],
  dateField: string,
  valueField: string,
  periodDays: number
): { current: number; previous: number } {
  const now = new Date();
  const currentCutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousCutoff = new Date(currentCutoff.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  let current = 0;
  let previous = 0;
  
  items.forEach((item: any) => {
    const date = new Date(item[dateField]);
    const value = item[valueField] || 0;
    
    if (date >= currentCutoff) {
      current += value;
    } else if (date >= previousCutoff) {
      previous += value;
    }
  });
  
  return { current, previous };
}

export function calculatePeriodMetrics<T>(
  items: T[],
  dateField: string,
  periodDays: number
): { current: number; previous: number } {
  const now = new Date();
  const currentCutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousCutoff = new Date(currentCutoff.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  let current = 0;
  let previous = 0;
  
  items.forEach((item: any) => {
    const date = new Date(item[dateField]);
    
    if (date >= currentCutoff) {
      current++;
    } else if (date >= previousCutoff) {
      previous++;
    }
  });
  
  return { current, previous };
}

export function groupByDay<T>(
  items: T[],
  dateField: string,
  valueField: string | null,
  periodDays: number
): Array<{ date: string; value: number }> {
  const now = new Date();
  const result: Array<{ date: string; value: number }> = [];
  
  for (let i = periodDays - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    
    let value = 0;
    items.forEach((item: any) => {
      const itemDate = new Date(item[dateField]);
      if (itemDate.toDateString() === date.toDateString()) {
        if (valueField) {
          value += item[valueField] || 0;
        } else {
          value++;
        }
      }
    });
    
    result.push({ date: dateStr, value });
  }
  
  return result;
}

export function getPreviousPeriodRange(periodDays: number): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - periodDays * 24 * 60 * 60 * 1000);
  return { start, end };
}

export function calculateDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

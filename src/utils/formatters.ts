// Утилиты для форматирования данных

/**
 * Форматирование числа в рублевую строку
 * @param value - число для форматирования
 * @param showCurrency - показывать ли символ валюты
 * @returns отформатированная строка
 */
export function formatRubles(value: number | null | undefined, showCurrency = true): string {
  const numValue = value || 0;
  const formatted = numValue.toLocaleString('ru-RU');
  return showCurrency ? `${formatted}₽` : formatted;
}

/**
 * Форматирование даты в русский формат
 * @param date - дата для форматирования
 * @param options - опции форматирования
 * @returns отформатированная строка
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  if (!date) return '—';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('ru-RU', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}

/**
 * Форматирование даты и времени в русский формат
 * @param date - дата для форматирования
 * @returns отформатированная строка
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '—';
  }
}

/**
 * Форматирование процентов
 * @param value - число для форматирования
 * @param decimals - количество знаков после запятой
 * @returns отформатированная строка
 */
export function formatPercent(value: number | null | undefined, decimals = 0): string {
  const numValue = value || 0;
  return `${numValue.toFixed(decimals)}%`;
}

/**
 * Безопасное получение числового значения
 * @param value - значение для преобразования
 * @param defaultValue - значение по умолчанию
 * @returns числовое значение
 */
export function safeNumber(value: any, defaultValue = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  return defaultValue;
}

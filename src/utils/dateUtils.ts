/**
 * 🛡️ БЕЗОПАСНЫЕ УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ
 * 
 * Предотвращает RangeError: Invalid time value при работе с некорректными датами
 */

/**
 * Безопасно парсит дату из любого значения
 * @param value - string | Date | null | undefined | number
 * @returns Date | null - валидная дата или null если парсинг невозможен
 */
export function safeParseDate(value: string | Date | null | undefined | number): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      date = new Date(value);
    } else if (typeof value === 'string') {
      date = new Date(value);
    } else {
      return null;
    }

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * Безопасно форматирует дату в ISO строку
 * @param value - любое значение даты
 * @param fallback - значение по умолчанию если дата невалидна (по умолчанию пустая строка)
 * @returns ISO строка или fallback
 */
export function safeToISOString(value: string | Date | null | undefined | number, fallback: string = ''): string {
  const date = safeParseDate(value);
  return date ? date.toISOString() : fallback;
}

/**
 * Безопасно получает только дату (YYYY-MM-DD) из ISO строки
 * @param value - любое значение даты
 * @param fallback - значение по умолчанию
 * @returns строка YYYY-MM-DD или fallback
 */
export function safeToDateString(value: string | Date | null | undefined | number, fallback: string = ''): string {
  const date = safeParseDate(value);
  if (!date) return fallback;
  return date.toISOString().split('T')[0];
}

/**
 * Безопасно форматирует дату для отображения пользователю
 * @param value - любое значение даты
 * @param locale - локаль (по умолчанию ru-RU)
 * @param options - опции форматирования
 * @param fallback - значение по умолчанию
 * @returns отформатированная строка или fallback
 */
export function safeFormatDate(
  value: string | Date | null | undefined | number,
  locale: string = 'ru-RU',
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '—'
): string {
  const date = safeParseDate(value);
  if (!date) return fallback;
  
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return fallback;
  }
}

/**
 * Безопасно получает timestamp
 * @param value - любое значение даты
 * @param fallback - значение по умолчанию (0)
 * @returns timestamp в миллисекундах или fallback
 */
export function safeGetTime(value: string | Date | null | undefined | number, fallback: number = 0): number {
  const date = safeParseDate(value);
  return date ? date.getTime() : fallback;
}

/**
 * Проверяет, является ли значение валидной датой
 */
export function isValidDate(value: any): boolean {
  return safeParseDate(value) !== null;
}

/**
 * Сравнивает две даты безопасно
 * @returns -1 если a < b, 0 если равны, 1 если a > b, 0 если одна из дат невалидна
 */
export function safeCompareDate(a: any, b: any): number {
  const dateA = safeParseDate(a);
  const dateB = safeParseDate(b);
  
  if (!dateA || !dateB) return 0;
  
  const timeA = dateA.getTime();
  const timeB = dateB.getTime();
  
  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;
  return 0;
}

/**
 * Проверяет, попадает ли дата в указанный месяц/год
 */
export function isInMonth(value: any, month: number, year: number): boolean {
  const date = safeParseDate(value);
  if (!date) return false;
  return date.getMonth() === month && date.getFullYear() === year;
}

/**
 * Проверяет, меньше или равна ли дата указанной
 */
export function isDateBeforeOrEqual(value: any, compareDate: Date): boolean {
  const date = safeParseDate(value);
  if (!date) return false;
  return date.getTime() <= compareDate.getTime();
}

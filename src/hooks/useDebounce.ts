/**
 * 🎯 ХУК ДЛЯ DEBOUNCE (ЗАДЕРЖКА ВЫПОЛНЕНИЯ)
 * 
 * Использование:
 * const debouncedValue = useDebounce(value, 300);
 * 
 * Значение обновится только через 300ms после последнего изменения.
 * Отлично подходит для поисковых запросов!
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Устанавливаем таймер для обновления значения
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Очищаем таймер если значение изменилось до истечения delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Пример использования:
 * 
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 300);
 * 
 * useEffect(() => {
 *   // Поиск выполнится только через 300ms после остановки ввода
 *   performSearch(debouncedQuery);
 * }, [debouncedQuery]);
 */

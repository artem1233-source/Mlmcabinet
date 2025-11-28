/**
 * 💾 ХУК ДЛЯ РАБОТЫ С LOCALSTORAGE
 * 
 * Использование:
 * const [value, setValue] = useLocalStorage('key', defaultValue);
 * 
 * Автоматически:
 * - Загружает значение из localStorage при монтировании
 * - Сохраняет в localStorage при изменении
 * - Типобезопасный (TypeScript)
 */

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Получаем значение из localStorage или используем initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Обёртка для setValue которая также обновляет localStorage
  const setValue = (value: T) => {
    try {
      // Сохраняем в state
      setStoredValue(value);
      
      // Сохраняем в localStorage
      window.localStorage.setItem(key, JSON.stringify(value));
      
      console.log(`💾 Saved to localStorage: ${key}`, value);
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Пример использования:
 * 
 * // Сохранение раскрытых узлов дерева
 * const [expandedNodes, setExpandedNodes] = useLocalStorage<Set<string>>(
 *   'structure-expanded-nodes',
 *   new Set()
 * );
 * 
 * // Сохранение фильтров
 * const [filters, setFilters] = useLocalStorage('structure-filters', {
 *   searchQuery: '',
 *   level: null,
 * });
 */

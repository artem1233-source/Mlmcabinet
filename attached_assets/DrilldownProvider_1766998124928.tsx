import React, { createContext, useContext, useState } from 'react';

/**
 * DrilldownProvider - контекст для управления drilldown навигацией
 * Позволяет переходить из Dashboard в детальные страницы с фильтрами
 */

export interface DrilldownFilter {
  type: 'users' | 'orders' | 'payouts' | 'tickets' | 'inventory';
  filters?: {
    status?: string;
    period?: string;
    category?: string;
    priority?: string;
    rank?: number;
    userId?: string;
    [key: string]: any;
  };
  title?: string;
}

interface DrilldownContextType {
  activeDrilldown: DrilldownFilter | null;
  setDrilldown: (filter: DrilldownFilter) => void;
  clearDrilldown: () => void;
  navigateToPage: (page: string, filter: DrilldownFilter) => void;
}

const DrilldownContext = createContext<DrilldownContextType | undefined>(undefined);

export function DrilldownProvider({ children }: { children: React.ReactNode }) {
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownFilter | null>(null);

  const setDrilldown = (filter: DrilldownFilter) => {
    setActiveDrilldown(filter);
    console.log('🔍 Drilldown activated:', filter);
  };

  const clearDrilldown = () => {
    setActiveDrilldown(null);
    console.log('🔍 Drilldown cleared');
  };

  const navigateToPage = (page: string, filter: DrilldownFilter) => {
    setDrilldown(filter);
    
    // Сохраняем фильтр в localStorage для восстановления после перехода
    localStorage.setItem('drilldown_filter', JSON.stringify(filter));
    
    // Генерируем URL с параметрами
    const params = new URLSearchParams();
    if (filter.filters) {
      Object.entries(filter.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const url = params.toString() ? `${page}?${params.toString()}` : page;
    console.log('🔍 Navigate to:', url);
    
    // В реальном приложении здесь будет React Router navigate
    // navigate(url);
    
    // Пока что просто логируем
    console.log('📍 Would navigate to:', url, 'with filters:', filter);
  };

  return (
    <DrilldownContext.Provider value={{ activeDrilldown, setDrilldown, clearDrilldown, navigateToPage }}>
      {children}
    </DrilldownContext.Provider>
  );
}

export function useDrilldown() {
  const context = useContext(DrilldownContext);
  if (context === undefined) {
    throw new Error('useDrilldown must be used within a DrilldownProvider');
  }
  return context;
}

/**
 * Hook для восстановления drilldown фильтра после навигации
 */
export function useRestoreDrilldown() {
  const { setDrilldown } = useDrilldown();

  React.useEffect(() => {
    const savedFilter = localStorage.getItem('drilldown_filter');
    if (savedFilter) {
      try {
        const filter = JSON.parse(savedFilter);
        setDrilldown(filter);
        console.log('🔍 Restored drilldown filter:', filter);
      } catch (e) {
        console.error('Failed to restore drilldown filter:', e);
      }
    }
  }, [setDrilldown]);
}

/**
 * Хелпер для создания drilldown для разных типов
 */
export const createDrilldown = {
  users: (filters?: any, title?: string): DrilldownFilter => ({
    type: 'users',
    filters,
    title: title || 'Пользователи',
  }),
  
  orders: (filters?: any, title?: string): DrilldownFilter => ({
    type: 'orders',
    filters,
    title: title || 'Заказы',
  }),
  
  payouts: (filters?: any, title?: string): DrilldownFilter => ({
    type: 'payouts',
    filters,
    title: title || 'Выплаты',
  }),
  
  tickets: (filters?: any, title?: string): DrilldownFilter => ({
    type: 'tickets',
    filters,
    title: title || 'Тикеты',
  }),
  
  inventory: (filters?: any, title?: string): DrilldownFilter => ({
    type: 'inventory',
    filters,
    title: title || 'Склад',
  }),
};

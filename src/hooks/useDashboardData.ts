/**
 * 🚀 ОПТИМИЗИРОВАННЫЙ ХУК ДЛЯ ЗАГРУЗКИ ДАННЫХ ДАШБОРДА
 * 
 * Особенности:
 * - React Query для кэширования заказов, доходов, статистики
 * - Автоматическая инвалидация кэша
 * - Мемоизация вычислений графиков
 * - Параллельная загрузка всех данных
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../utils/api';
import { toast } from 'sonner';
import { useMemo } from 'react';

/**
 * Хук для загрузки заказов
 */
export function useOrders(enabled = true) {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      console.log('🔄 useDashboardData: Loading orders');
      const response = await api.getOrders();
      
      if (!response.success) {
        throw new Error('Failed to load orders');
      }
      
      console.log('✅ useDashboardData: Loaded', response.orders?.length || 0, 'orders');
      return response.orders || [];
    },
    enabled,
    staleTime: 30000, // 30 секунд
    cacheTime: 300000, // 5 минут
    retry: 2,
    onError: (error) => {
      console.error('❌ useDashboardData: Error loading orders:', error);
      toast.error('Не удалось загрузить заказы');
    },
  });
}

/**
 * Хук для загрузки доходов
 */
export function useEarnings(enabled = true) {
  return useQuery({
    queryKey: ['earnings'],
    queryFn: async () => {
      console.log('🔄 useDashboardData: Loading earnings');
      const response = await api.getEarnings();
      
      if (!response.success) {
        throw new Error('Failed to load earnings');
      }
      
      console.log('✅ useDashboardData: Loaded', response.earnings?.length || 0, 'earnings');
      return response.earnings || [];
    },
    enabled,
    staleTime: 30000,
    cacheTime: 300000,
    retry: 2,
    onError: (error) => {
      console.error('❌ useDashboardData: Error loading earnings:', error);
      toast.error('Не удалось загрузить доходы');
    },
  });
}

/**
 * Хук для загрузки статистики администратора
 */
export function useAdminStats(isAdmin: boolean) {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      console.log('🔄 useDashboardData: Loading admin stats');
      const response = await api.getAdminStats();
      
      if (!response.success) {
        throw new Error('Failed to load admin stats');
      }
      
      console.log('✅ useDashboardData: Loaded admin stats');
      return response.stats;
    },
    enabled: isAdmin,
    staleTime: 60000, // 1 минута для админ статистики
    cacheTime: 300000,
    retry: 2,
    onError: (error) => {
      console.error('❌ useDashboardData: Error loading admin stats:', error);
    },
  });
}

/**
 * Хук для вычисления статистики дашборда (мемоизированный)
 */
export function useDashboardStats(orders: any[], earnings: any[], team: any[]) {
  return useMemo(() => {
    // Считаем общий доход
    const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Считаем доход за месяц
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthEarnings = earnings
      .filter(e => {
        const date = new Date(e.date || e.createdAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Считаем активные заказы
    const activeOrders = orders.filter(o => 
      o.status === 'pending' || o.status === 'processing'
    ).length;
    
    // Размер команды
    const teamSize = team.length;
    
    console.log('📊 Dashboard stats calculated:', {
      totalEarnings,
      monthEarnings,
      activeOrders,
      teamSize
    });
    
    return {
      totalEarnings,
      monthEarnings,
      activeOrders,
      teamSize
    };
  }, [orders, earnings, team]);
}

/**
 * Хук для вычисления данных графика (мемоизированный)
 */
export function useChartData(orders: any[], period: '7d' | '30d' | '90d' | '1y' = '30d') {
  return useMemo(() => {
    // Определяем количество дней
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[period];
    
    // Создаём массив дат
    const now = new Date();
    const chartData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Считаем заказы и доход за этот день
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt || o.date);
        return orderDate.toISOString().split('T')[0] === dateStr;
      });
      
      const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      
      chartData.push({
        date: dateStr,
        displayDate: date.toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit' 
        }),
        orders: dayOrders.length,
        revenue
      });
    }
    
    console.log('📈 Chart data calculated for', period, ':', chartData.length, 'points');
    
    return chartData;
  }, [orders, period]);
}

/**
 * Хук для вычисления недавних заказов (мемоизированный)
 */
export function useRecentOrders(orders: any[], limit = 5) {
  return useMemo(() => {
    const sorted = [...orders]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date).getTime();
        const dateB = new Date(b.createdAt || b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
    
    console.log('📋 Recent orders calculated:', sorted.length, 'orders');
    
    return sorted;
  }, [orders, limit]);
}

/**
 * Хук для вычисления роста команды (мемоизированный)
 */
export function useTeamGrowthData(team: any[], period: '7d' | '30d' | '90d' | '1y' = '30d') {
  return useMemo(() => {
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[period];
    
    const now = new Date();
    const growthData = [];
    let cumulativeCount = 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Считаем партнёров зарегистрированных до этой даты
      const partnersUntilDate = team.filter(m => {
        const regDate = new Date(m.датаРегистрации || m.зарегистрирован);
        return regDate <= date;
      }).length;
      
      growthData.push({
        date: dateStr,
        displayDate: date.toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit' 
        }),
        count: partnersUntilDate
      });
    }
    
    console.log('📈 Team growth data calculated:', growthData.length, 'points');
    
    return growthData;
  }, [team, period]);
}

/**
 * Хук для инвалидации кэша дашборда
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  
  return () => {
    console.log('🔄 Invalidating dashboard cache');
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['earnings'] });
    queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    queryClient.invalidateQueries({ queryKey: ['team'] }); // Если используется
  };
}

/**
 * Хук для принудительного обновления данных
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  
  return async () => {
    console.log('🔄 Refreshing dashboard data');
    await queryClient.refetchQueries({ queryKey: ['orders'] });
    await queryClient.refetchQueries({ queryKey: ['earnings'] });
    await queryClient.refetchQueries({ queryKey: ['adminStats'] });
    toast.success('Данные обновлены');
  };
}

/**
 * Хук для вычисления воронки конверсии
 */
export function useConversionFunnel(team: any[]) {
  return useMemo(() => {
    const total = team.length;
    
    // Активные - те у кого баланс > 0
    const active = team.filter(m => (m.баланс || 0) > 0).length;
    
    // Лидеры - те у кого есть команда (предполагаем, что команда сохранена)
    const leaders = team.filter(m => m.команда && m.команда.length > 0).length;
    
    return {
      total,
      active,
      leaders,
      activeRate: total > 0 ? (active / total * 100).toFixed(1) : 0,
      leaderRate: active > 0 ? (leaders / active * 100).toFixed(1) : 0
    };
  }, [team]);
}

/**
 * Хук для загрузки всех пользователей (только для админа)
 */
export function useAllUsers(isAdmin: boolean) {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      console.log('🔄 useDashboardData: Loading all users for filtering');
      const response = await api.getAllUsers();
      
      if (!response.success) {
        throw new Error('Failed to load users');
      }
      
      console.log('✅ useDashboardData: Loaded', response.users?.length || 0, 'users');
      return response.users || [];
    },
    enabled: isAdmin,
    staleTime: 60000, // 1 минута
    cacheTime: 300000, // 5 минут
    retry: 2,
    onError: (error) => {
      console.error('❌ useDashboardData: Error loading users:', error);
      toast.error('Не удалось загрузить пользователей');
    },
  });
}

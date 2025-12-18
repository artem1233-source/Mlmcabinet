/**
 * 🚀 ОПТИМИЗИРОВАННЫЙ ХУК ДЛЯ ЗАГРУЗКИ ДАННЫХ ДАШБОРДА
 * 
 * SINGLE SOURCE OF TRUTH: Все данные загружаются НАПРЯМУЮ из Supabase SQL
 * - orders → SQL таблица `orders`
 * - earnings → SQL таблица `earnings`
 * - profiles → SQL таблица `profiles`
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { safeParseDate, safeToDateString, safeGetTime, isInMonth, isDateBeforeOrEqual } from '../utils/dateUtils';

/**
 * Хук для загрузки заказов из SQL
 */
export function useOrders(enabled = true) {
  return useQuery({
    queryKey: ['orders-sql'],
    queryFn: async () => {
      console.log('🔄 useDashboardData: Loading orders from SQL...');
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Orders SQL error:', error);
        throw new Error(error.message);
      }
      
      const mappedOrders = (orders || []).map((o: any) => ({
        id: o.id,
        партнерId: o.user_id || o.partner_id,
        покупательId: o.buyer_id || o.user_id,
        итого: o.total || 0,
        статус: o.status || 'pending',
        товары: o.items || [],
        датаСоздания: o.created_at,
        createdAt: o.created_at,
        d1: o.d1,
        d2: o.d2,
        d3: o.d3,
        комиссияD1: o.commission_d1 || 0,
        комиссияD2: o.commission_d2 || 0,
        комиссияD3: o.commission_d3 || 0,
      }));
      
      console.log('✅ useDashboardData: Loaded', mappedOrders.length, 'orders from SQL');
      return mappedOrders;
    },
    enabled,
    staleTime: 30000,
    gcTime: 300000,
    retry: 2,
  });
}

/**
 * Хук для загрузки доходов из SQL
 */
export function useEarnings(enabled = true) {
  return useQuery({
    queryKey: ['earnings-sql'],
    queryFn: async () => {
      console.log('🔄 useDashboardData: Loading earnings from SQL...');
      
      const { data: earnings, error } = await supabase
        .from('earnings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Earnings SQL error:', error);
        throw new Error(error.message);
      }
      
      const mappedEarnings = (earnings || []).map((e: any) => ({
        id: e.id,
        userId: e.user_id,
        amount: e.amount || 0,
        level: e.level,
        orderId: e.order_id,
        date: e.created_at,
        createdAt: e.created_at,
      }));
      
      console.log('✅ useDashboardData: Loaded', mappedEarnings.length, 'earnings from SQL');
      return mappedEarnings;
    },
    enabled,
    staleTime: 30000,
    gcTime: 300000,
    retry: 2,
  });
}

/**
 * Хук для загрузки статистики администратора из SQL
 */
export function useAdminStats(isAdmin: boolean) {
  return useQuery({
    queryKey: ['adminStats-sql'],
    queryFn: async () => {
      console.log('🔄 useDashboardData: Loading admin stats from SQL...');
      
      // Загружаем агрегированные данные из SQL
      const [
        { count: totalUsers },
        { data: balanceData },
        { data: ordersData },
        { data: earningsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('balance'),
        supabase.from('orders').select('total'),
        supabase.from('earnings').select('amount'),
      ]);
      
      const totalBalance = (balanceData || []).reduce((sum: number, p: any) => sum + (p.balance || 0), 0);
      const totalRevenue = (ordersData || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      const totalEarnings = (earningsData || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      
      const stats = {
        totalUsers: totalUsers || 0,
        totalBalance,
        totalRevenue,
        totalEarnings,
        totalOrders: ordersData?.length || 0,
      };
      
      console.log('✅ useDashboardData: Loaded admin stats from SQL:', stats);
      return stats;
    },
    enabled: isAdmin,
    staleTime: 60000,
    gcTime: 300000,
    retry: 2,
  });
}

/**
 * Хук для вычисления статистики дашборда (мемоизированный)
 */
export function useDashboardStats(orders: any[], earnings: any[], team: any[]) {
  return useMemo(() => {
    const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthEarnings = earnings
      .filter(e => {
        return isInMonth(e.date || e.createdAt, currentMonth, currentYear);
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const activeOrders = orders.filter(o => 
      o.статус === 'pending' || o.статус === 'processing' || o.status === 'pending'
    ).length;
    
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
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[period];
    
    const now = new Date();
    const chartData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(o => {
        const orderDateStr = safeToDateString(o.createdAt || o.датаСоздания);
        return orderDateStr === dateStr;
      });
      
      const revenue = dayOrders.reduce((sum, o) => sum + (o.итого || o.total || 0), 0);
      
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
        const dateA = safeGetTime(a.createdAt || a.датаСоздания, 0);
        const dateB = safeGetTime(b.createdAt || b.датаСоздания, 0);
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
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const partnersUntilDate = team.filter(m => {
        return isDateBeforeOrEqual(m.датаРегистрации || m.зарегистрирован || m.created, date);
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
 * 🆕 Хук для загрузки РЕАЛЬНОЙ статистики пользователя из SQL
 * Показывает: баланс, личные продажи, доход от команды, за сегодня
 */
export function useRealStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['realStats-sql', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      console.log('🔄 useRealStats: Loading real stats for user:', userId);
      
      // Load balance from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Profile error:', profileError);
      }
      
      const balance = profile?.balance || 0;
      
      // Load all earnings for this user
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('amount, level, created_at')
        .eq('user_id', userId);
      
      if (earningsError) {
        console.error('❌ Earnings error:', earningsError);
      }
      
      const earningsList = earnings || [];
      
      // Calculate stats
      const totalEarned = earningsList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const personalSales = earningsList
        .filter(e => e.level === 0)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const teamIncome = earningsList
        .filter(e => e.level > 0)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      // Today's earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEarnings = earningsList
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      const stats = {
        balance,
        totalEarned,
        personalSales,
        teamIncome,
        todayEarnings,
      };
      
      console.log('✅ useRealStats: Loaded real stats:', stats);
      return stats;
    },
    enabled: !!userId,
    staleTime: 30000,
    gcTime: 300000,
    retry: 2,
  });
}

/**
 * Хук для инвалидации кэша дашборда
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  
  return () => {
    console.log('🔄 Invalidating dashboard cache (SQL)');
    queryClient.invalidateQueries({ queryKey: ['orders-sql'] });
    queryClient.invalidateQueries({ queryKey: ['earnings-sql'] });
    queryClient.invalidateQueries({ queryKey: ['adminStats-sql'] });
    queryClient.invalidateQueries({ queryKey: ['all-users-sql'] });
  };
}

/**
 * Хук для принудительного обновления данных
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  
  return async () => {
    console.log('🔄 Refreshing dashboard data (SQL)');
    await queryClient.refetchQueries({ queryKey: ['orders-sql'] });
    await queryClient.refetchQueries({ queryKey: ['earnings-sql'] });
    await queryClient.refetchQueries({ queryKey: ['adminStats-sql'] });
    toast.success('Данные обновлены');
  };
}

/**
 * Хук для вычисления воронки конверсии
 */
export function useConversionFunnel(team: any[]) {
  return useMemo(() => {
    const total = team.length;
    const active = team.filter(m => (m.баланс || m.balance || 0) > 0).length;
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
 * Хук для загрузки всех пользователей из SQL (только для админа)
 */
export function useAllUsers(isAdmin: boolean) {
  return useQuery({
    queryKey: ['allUsers-sql'],
    queryFn: async () => {
      console.log('🔄 useDashboardData: Loading all users from SQL profiles...');
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Profiles SQL error:', error);
        throw new Error(error.message);
      }
      
      const users = (profiles || []).map((p: any) => ({
        id: p.user_id || p.id,
        имя: p.name || p.first_name || '',
        фамилия: p.last_name || '',
        email: p.email || '',
        баланс: p.balance || 0,
        уровень: p.level || 0,
        isAdmin: p.is_admin || false,
        created: p.created_at,
        спонсорId: p.referrer_id || p.sponsor_id || null,
        команда: p.team || [],
      }));
      
      console.log('✅ useDashboardData: Loaded', users.length, 'users from SQL');
      return users;
    },
    enabled: isAdmin,
    staleTime: 60000,
    gcTime: 300000,
    retry: 2,
  });
}

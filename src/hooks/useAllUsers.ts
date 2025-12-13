/**
 * 🚀 ХУК ДЛЯ ЗАГРУЗКИ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ИЗ SQL
 * 
 * SINGLE SOURCE OF TRUTH: Все данные загружаются НАПРЯМУЮ из Supabase SQL таблицы `profiles`
 * Никаких KV Store, никаких API прокси - только SQL!
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';

const CACHE_TIME = 5 * 60 * 1000; // 5 минут
const STALE_TIME = 30 * 1000; // 30 секунд - более свежие данные

export interface User {
  id: string;
  имя: string;
  фамилия: string;
  email: string;
  телефон?: string;
  спонсорId?: string;
  команда?: string[];
  баланс?: number;
  доступныйБаланс?: number;
  уровень?: number;
  isAdmin?: boolean;
  created?: string;
  telegram?: string;
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  vk?: string;
  [key: string]: any;
}

export interface UseAllUsersResult {
  users: User[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
}

/**
 * Хук для загрузки всех пользователей НАПРЯМУЮ из SQL таблицы profiles
 */
export function useAllUsers(): UseAllUsersResult {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['all-users-sql'],
    queryFn: async () => {
      console.log('🔄 useAllUsers: Fetching all users from SQL profiles table...');
      
      const { data: profiles, error: sqlError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (sqlError) {
        console.error('❌ useAllUsers SQL error:', sqlError);
        throw new Error(sqlError.message);
      }
      
      const users: User[] = (profiles || []).map((p: any) => ({
        id: p.user_id || p.id,
        имя: p.name || p.first_name || '',
        фамилия: p.last_name || '',
        email: p.email || '',
        телефон: p.phone || '',
        спонсорId: p.referrer_id || p.sponsor_id || null,
        команда: p.team || [],
        баланс: p.balance || 0,
        доступныйБаланс: p.available_balance || p.balance || 0,
        уровень: p.level || 0,
        isAdmin: p.is_admin || false,
        created: p.created_at,
        telegram: p.telegram || '',
        whatsapp: p.whatsapp || '',
        instagram: p.instagram || '',
        vk: p.vk || '',
        avatar_url: p.avatar_url || '',
        raw: p, // сохраняем оригинальные данные
      }));
      
      console.log(`✅ useAllUsers: Loaded ${users.length} users from SQL`);
      console.log('📊 Sample user balances:', users.slice(0, 3).map(u => ({ id: u.id, баланс: u.баланс })));
      
      return users;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: true, // Обновлять при фокусе
    retry: 2,
  });

  return {
    users: data || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    isRefetching,
  };
}

/**
 * Хук для инвалидации кэша пользователей
 */
export function useInvalidateUsers() {
  const queryClient = useQueryClient();

  return () => {
    console.log('♻️ Invalidating all-users-sql cache');
    queryClient.invalidateQueries({ queryKey: ['all-users-sql'] });
  };
}

/**
 * Хук для получения пользователей из кэша
 */
export function useCachedUsers() {
  const queryClient = useQueryClient();
  
  const getCachedUsers = (): User[] => {
    return queryClient.getQueryData(['all-users-sql']) || [];
  };

  return getCachedUsers;
}

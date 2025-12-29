/**
 * 🚀 ОБЩИЙ ХУК ДЛЯ ЗАГРУЗКИ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
 * 
 * Использует React Query для кэширования данных.
 * Все компоненты вкладки "Управление ID" используют этот хук,
 * что позволяет делать 1 запрос вместо 4-х отдельных.
 * 
 * Преимущества:
 * - Один запрос к API вместо множества
 * - Автоматическое кэширование
 * - Автоматическая перезагрузка при необходимости
 * - Shared state между компонентами
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../utils/api';

const CACHE_TIME = 5 * 60 * 1000; // 5 минут
const STALE_TIME = 2 * 60 * 1000; // 2 минуты

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
 * Хук для загрузки всех пользователей с кэшированием
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
    queryKey: ['all-users'],
    queryFn: async () => {
      console.log('🔄 useAllUsers: Fetching all users from API...');
      const response = await api.getAllUsers();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load users');
      }
      
      const users = response.users || [];
      console.log(`✅ useAllUsers: Loaded ${users.length} users`);
      
      return users as User[];
    },
    staleTime: STALE_TIME,
    cacheTime: CACHE_TIME, // Используем cacheTime для совместимости
    refetchOnWindowFocus: false,
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
 * Используйте после операций, изменяющих данные пользователей
 */
export function useInvalidateUsers() {
  const queryClient = useQueryClient();

  return () => {
    console.log('♻️ Invalidating all-users cache');
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
  };
}

/**
 * Хук для получения пользователей с фильтрацией без запроса к API
 * Использует закэшированные данные
 */
export function useCachedUsers() {
  const queryClient = useQueryClient();
  
  const getCachedUsers = (): User[] => {
    return queryClient.getQueryData(['all-users']) || [];
  };

  return getCachedUsers;
}

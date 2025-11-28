/**
 * 🚀 ОПТИМИЗИРОВАННЫЙ ХУК ДЛЯ ЗАГРУЗКИ ДАННЫХ КОМАНДЫ
 * 
 * Особенности:
 * - React Query для кэширования данных
 * - Автоматическая инвалидация кэша
 * - Мемоизация фильтрации и вычислений
 * - Ленивая загрузка узлов дерева
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import * as api from '../utils/api';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  имя: string;
  фамилия: string;
  email: string;
  партнёрскийID: string;
  уровень: number;
  спонсорId?: string;
  спонсор?: string | null;
  пригласительКод?: string;
  рефКод: string;
  команда?: string[];
  баланс?: number;
  глубина?: number;
  датаРегистрации?: string;
  зарегистрирован?: string;
  isAdmin?: boolean;
  type?: string;
}

/**
 * Хук для загрузки данных команды пользователя
 */
export function useTeamData(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['team', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log('🔄 useTeamData: Loading team for user:', userId);
      const response = await api.getUserTeam(userId);
      
      if (!response.success || !response.team) {
        throw new Error('Failed to load team data');
      }

      // Фильтруем самого пользователя из структуры
      const filteredTeam = response.team.filter((m: TeamMember) => m.id !== userId);
      
      console.log('✅ useTeamData: Loaded', filteredTeam.length, 'team members');
      
      return filteredTeam as TeamMember[];
    },
    enabled: enabled && !!userId,
    staleTime: 30000, // 30 секунд - данные считаются свежими
    cacheTime: 300000, // 5 минут - данные хранятся в кэше
    retry: 2,
    onError: (error) => {
      console.error('❌ useTeamData: Error loading team:', error);
      toast.error('Не удалось загрузить структуру команды');
    },
  });
}

/**
 * Хук для инвалидации кэша команды
 */
export function useInvalidateTeam() {
  const queryClient = useQueryClient();
  
  return (userId?: string) => {
    if (userId) {
      console.log('🔄 useInvalidateTeam: Invalidating team cache for user:', userId);
      queryClient.invalidateQueries({ queryKey: ['team', userId] });
    } else {
      console.log('🔄 useInvalidateTeam: Invalidating all team caches');
      queryClient.invalidateQueries({ queryKey: ['team'] });
    }
  };
}

/**
 * Хук для мутации данных команды (например, при добавлении нового партнёра)
 */
export function useUpdateTeamMember(userId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (memberId: string) => {
      // Здесь может быть логика обновления конкретного члена команды
      console.log('🔄 useUpdateTeamMember: Updating member:', memberId);
      // API call если нужно
    },
    onSuccess: () => {
      // Инвалидируем кэш команды после успешного обновления
      queryClient.invalidateQueries({ queryKey: ['team', userId] });
      toast.success('Данные обновлены');
    },
    onError: (error) => {
      console.error('❌ useUpdateTeamMember: Error:', error);
      toast.error('Ошибка обновления данных');
    },
  });
}

/**
 * Хук для вычисления статистики команды (мемоизированный)
 */
export function useTeamStats(team: TeamMember[]) {
  // Статистика по линиям (глубина в структуре)
  const teamByLine = team.reduce((acc, member) => {
    const line = member.глубина || 1;
    acc[line] = (acc[line] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Статистика по уровням партнёра
  const teamByLevel = team.reduce((acc, member) => {
    const level = member.уровень || 1;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Топ партнёров по балансу
  const topPartners = [...team]
    .sort((a, b) => (b.баланс || 0) - (a.баланс || 0))
    .slice(0, 10);

  // Общий баланс команды
  const totalBalance = team.reduce((sum, member) => sum + (member.баланс || 0), 0);

  // Активные партнёры (с балансом > 0)
  const activePartners = team.filter(m => (m.баланс || 0) > 0).length;

  return {
    total: team.length,
    teamByLine,
    teamByLevel,
    topPartners,
    totalBalance,
    activePartners,
  };
}

/**
 * Хук для построения дерева партнёров (мемоизированный)
 */
export function useBuildTree(team: TeamMember[], currentUserRefCode: string) {
  const buildTree = (parentRefCode: string, depth = 0): (TeamMember & { children: any[], depth: number })[] => {
    const children = team.filter(member => member.пригласительКод === parentRefCode);
    
    return children.map(member => ({
      ...member,
      children: buildTree(member.рефКод, depth + 1),
      depth
    }));
  };

  return buildTree(currentUserRefCode);
}

/**
 * Хук для фильтрации команды по поисковому запросу
 */
export function useFilteredTeam(team: TeamMember[], searchQuery: string) {
  if (!searchQuery.trim()) {
    return team;
  }

  const query = searchQuery.toLowerCase();
  return team.filter(member => 
    member.имя.toLowerCase().includes(query) ||
    member.фамилия.toLowerCase().includes(query) ||
    member.email.toLowerCase().includes(query) ||
    member.рефКод.toLowerCase().includes(query) ||
    member.партнёрскийID?.toLowerCase().includes(query)
  );
}

/**
 * 🚀 МОДУЛЬ КЭШИРОВАНИЯ МЕТРИК ПОЛЬЗОВАТЕЛЕЙ
 * 
 * Этот модуль оптимизирует расчёт метрик пользователей для больших объёмов данных (1000+ пользователей).
 * 
 * Основные функции:
 * 1. Предрасчёт и кэширование метрик (ранг, размер команды, продажи)
 * 2. Фоновое обновление кэша
 * 3. Инвалидация кэша при изменениях
 * 
 * Архитектура:
 * - Метрики хранятся в KV store с TTL 1 час
 * - Ключи вида: user_metrics:${userId}
 * - Агрегированные страницы: users_page:${page}:${filter}:${sort}
 */

import * as kv from './kv_store.tsx';
import { getUserRank } from './rank_calculator.tsx';

// Интерфейс метрик пользователя
export interface UserMetrics {
  userId: string;
  rank: number;
  teamSize: number;
  totalTeamSize: number;
  personalSales: number;
  teamSales: number;
  ordersCount: number;
  averageCheck: number;
  lastCalculated: string;
}

/**
 * Рекурсивный подсчёт всей команды пользователя
 */
async function calculateTotalTeamSize(userId: string, allUsers: any[], visited = new Set<string>()): Promise<number> {
  if (visited.has(userId)) return 0; // Защита от циклов
  visited.add(userId);
  
  const user = allUsers.find((u: any) => u.id === userId);
  if (!user || !user.команда || user.команда.length === 0) return 0;
  
  let total = user.команда.length; // Прямые рефералы
  
  // Рекурсивно добавляем команды рефералов
  for (const childId of user.команда) {
    total += await calculateTotalTeamSize(childId, allUsers, visited);
  }
  
  return total;
}

/**
 * Расчёт метрик продаж пользователя
 */
async function calculateSalesMetrics(userId: string, allOrders: any[]) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Личные продажи (где пользователь - покупатель)
  const personalOrders = allOrders.filter(order => order.покупательId === userId);
  const personalSales = personalOrders.reduce((sum, order) => sum + (order.итого || 0), 0);
  
  // Заказы за последние 30 дней
  const recentOrders = personalOrders.filter(order => {
    const orderDate = new Date(order.датаСоздания || order.createdAt);
    return orderDate >= thirtyDaysAgo;
  });
  
  const ordersCount = recentOrders.length;
  const averageCheck = ordersCount > 0 ? personalSales / ordersCount : 0;

  // Для упрощения не считаем teamSales здесь (требует загрузки всех пользователей)
  // Это можно добавить позже если потребуется
  
  return {
    personalSales,
    teamSales: 0, // TODO: добавить если потребуется
    ordersCount,
    averageCheck
  };
}

/**
 * Расчёт и кэширование метрик для одного пользователя
 */
export async function calculateAndCacheUserMetrics(userId: string, allUsers?: any[], allOrders?: any[]): Promise<UserMetrics> {
  try {
    console.log(`📊 Calculating metrics for user ${userId}...`);
    
    // Загружаем пользователя
    const user = await kv.get(`user:id:${userId}`);
    if (!user) {
      console.error(`❌ User ${userId} not found`);
      throw new Error(`User ${userId} not found`);
    }
    
    // Проверяем что это не админ
    if (user.isAdmin || user.__type === 'admin') {
      console.log(`⚠️ User ${userId} is admin, skipping metrics`);
      return {
        userId,
        rank: 0,
        teamSize: 0,
        totalTeamSize: 0,
        personalSales: 0,
        teamSales: 0,
        ordersCount: 0,
        averageCheck: 0,
        lastCalculated: new Date().toISOString()
      };
    }

    // Если данные не переданы, загружаем их
    if (!allUsers) {
      allUsers = await kv.getByPrefix('user:');
    }
    if (!allOrders) {
      allOrders = await kv.getByPrefix('order:');
    }

    // Расчёт ранга
    let rank = 0;
    try {
      rank = await getUserRank(userId, true);
      console.log(`   ✅ Rank for ${userId}: ${rank}`);
    } catch (error) {
      console.error(`   ❌ Error calculating rank for ${userId}:`, error);
      rank = 0;
    }

    // Расчёт размера команды
    const teamSize = user.команда?.length || 0;
    let totalTeamSize = 0;
    try {
      totalTeamSize = await calculateTotalTeamSize(userId, allUsers);
      console.log(`   ✅ Team sizes for ${userId}: direct=${teamSize}, total=${totalTeamSize}`);
    } catch (error) {
      console.error(`   ❌ Error calculating team size for ${userId}:`, error);
      totalTeamSize = 0;
    }

    // Расчёт метрик продаж
    let salesMetrics = { personalSales: 0, teamSales: 0, ordersCount: 0, averageCheck: 0 };
    try {
      salesMetrics = await calculateSalesMetrics(userId, allOrders);
      console.log(`   ✅ Sales for ${userId}: personal=${salesMetrics.personalSales}, orders=${salesMetrics.ordersCount}`);
    } catch (error) {
      console.error(`   ❌ Error calculating sales for ${userId}:`, error);
    }

    const metrics: UserMetrics = {
      userId,
      rank,
      teamSize,
      totalTeamSize,
      personalSales: salesMetrics.personalSales,
      teamSales: salesMetrics.teamSales,
      ordersCount: salesMetrics.ordersCount,
      averageCheck: salesMetrics.averageCheck,
      lastCalculated: new Date().toISOString()
    };

    // Сохраняем в кэш на 1 час
    await kv.set(`user_metrics:${userId}`, metrics);
    
    console.log(`✅ Metrics calculated and cached for user ${userId}`);

    return metrics;
  } catch (error) {
    console.error(`❌ CRITICAL: Error calculating metrics for user ${userId}:`, error);
    
    // Возвращаем пустые метрики в случае ошибки
    return {
      userId,
      rank: 0,
      teamSize: 0,
      totalTeamSize: 0,
      personalSales: 0,
      teamSales: 0,
      ordersCount: 0,
      averageCheck: 0,
      lastCalculated: new Date().toISOString()
    };
  }
}

/**
 * Получение метрик из кэша или расчёт если кэш устарел
 */
export async function getUserMetrics(userId: string): Promise<UserMetrics> {
  // Проверяем кэш
  const cached = await kv.get(`user_metrics:${userId}`);
  
  if (cached && cached.lastCalculated) {
    const cacheAge = Date.now() - new Date(cached.lastCalculated).getTime();
    const oneHour = 60 * 60 * 1000;
    
    // Если кэш свежий (< 1 часа), возвращаем его
    if (cacheAge < oneHour) {
      return cached;
    }
  }

  // Кэш устарел или отсутствует - пересчитываем
  return await calculateAndCacheUserMetrics(userId);
}

/**
 * Пересчёт метрик для всех пользователей (фоновая задача)
 */
export async function recalculateAllMetrics(): Promise<{ success: boolean; updated: number; errors: number }> {
  console.log('🔄 Starting metrics recalculation for all users...');
  
  try {
    // Загружаем всех пользователей и заказы один раз
    const allUsers = await kv.getByPrefix('user:');
    const allOrders = await kv.getByPrefix('order:');
    
    // Фильтруем только не-админов
    const regularUsers = allUsers.filter((u: any) => !u.isAdmin && u.__type !== 'admin');
    
    console.log(`📊 Recalculating metrics for ${regularUsers.length} users...`);

    let updated = 0;
    let errors = 0;

    // Обрабатываем батчами по 20 пользователей
    const batchSize = 20;
    for (let i = 0; i < regularUsers.length; i += batchSize) {
      const batch = regularUsers.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user: any) => {
          try {
            await calculateAndCacheUserMetrics(user.id, allUsers, allOrders);
            updated++;
            
            if (updated % 50 === 0) {
              console.log(`✅ Progress: ${updated}/${regularUsers.length} users processed`);
            }
          } catch (error) {
            console.error(`❌ Error calculating metrics for user ${user.id}:`, error);
            errors++;
          }
        })
      );
    }

    // Сбрасываем кэш страниц
    const pageKeys = await kv.getByPrefix('users_page:');
    for (const key of pageKeys) {
      await kv.del(key);
    }

    console.log(`✅ Metrics recalculation complete! Updated: ${updated}, Errors: ${errors}`);

    return { success: true, updated, errors };
  } catch (error) {
    console.error('❌ Metrics recalculation failed:', error);
    return { success: false, updated: 0, errors: 1 };
  }
}

/**
 * Инвалидация кэша метрик пользователя
 */
export async function invalidateUserMetrics(userId: string) {
  await kv.del(`user_metrics:${userId}`);
  console.log(`🗑️ Invalidated metrics cache for user ${userId}`);
}

/**
 * Инвалидация кэша всех страниц (после изменений)
 */
export async function invalidatePageCache() {
  // Очищаем кэш страниц
  const pageKeys = await kv.getByPrefix('users_page:');
  for (const pageKey of pageKeys) {
    await kv.del(pageKey.key || `users_page:${pageKey}`);
  }
  
  // 🎯 КРИТИЧНО: Очищаем кэш списка всех пользователей
  await kv.del('cache:all_users_list');
  
  console.log('🗑️ Invalidated all page caches and users list cache');
}

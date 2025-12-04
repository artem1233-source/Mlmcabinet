import * as kv from './kv_store.tsx';

/**
 * 🎯 ИСПРАВЛЕННАЯ ЛОГИКА РАСЧЁТА РАНГА (v2)
 * 
 * ВАЖНО: Дети определяются по полю спонсорId, а НЕ по полю команда!
 * Поле команда может содержать неправильные данные.
 * 
 * Ранг = максимальная глубина структуры ВНИЗ от пользователя.
 * - Сам пользователь НЕ включается в расчёт.
 * - Если потомков нет → ранг = 0
 * - Если есть прямые партнёры без своих структур → ранг = 1
 * - A → B → C означает: A=2, B=1, C=0
 */

// Глобальный кэш для карты детей (обновляется при каждом вызове calculateUserRank)
let childrenMapCache: Map<string, string[]> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000; // 1 минута

/**
 * Строит карту детей по спонсорId из всех пользователей
 */
async function buildChildrenMap(): Promise<Map<string, string[]>> {
  // Используем кэш если он свежий
  const now = Date.now();
  if (childrenMapCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    console.log('📦 Using cached children map');
    return childrenMapCache;
  }
  
  console.log('🔄 Building children map from спонсорId relationships...');
  
  const allUsers = await kv.getByPrefix('user:id:');
  const users = allUsers.filter((u: any) => u.__type !== 'admin' && !u.isAdmin);
  
  const childrenMap = new Map<string, string[]>();
  
  // Инициализируем всех пользователей
  for (const user of users) {
    if (!childrenMap.has(user.id)) {
      childrenMap.set(user.id, []);
    }
  }
  
  // Строим связи по спонсорId
  for (const user of users) {
    if (user.спонсорId && typeof user.спонсорId === 'string') {
      if (!childrenMap.has(user.спонсорId)) {
        childrenMap.set(user.спонсорId, []);
      }
      childrenMap.get(user.спонсорId)!.push(user.id);
    }
  }
  
  console.log(`✅ Children map built: ${childrenMap.size} users`);
  
  // Обновляем кэш
  childrenMapCache = childrenMap;
  cacheTimestamp = now;
  
  return childrenMap;
}

/**
 * Инвалидирует кэш карты детей
 */
export function invalidateChildrenMapCache(): void {
  childrenMapCache = null;
  cacheTimestamp = 0;
  console.log('🗑️ Children map cache invalidated');
}

/**
 * Рекурсивно вычисляет глубину дерева от пользователя
 */
function calculateTreeDepthFromMap(
  userId: string, 
  childrenMap: Map<string, string[]>,
  calculatedRanks: Map<string, number>,
  calculating: Set<string>
): number {
  // Если уже рассчитан — возвращаем из кэша
  if (calculatedRanks.has(userId)) {
    return calculatedRanks.get(userId)!;
  }
  
  // Защита от циклов
  if (calculating.has(userId)) {
    console.warn(`⚠️ Cycle detected for user ${userId}`);
    return 0;
  }
  
  calculating.add(userId);
  
  const children = childrenMap.get(userId) || [];
  
  // Если нет детей — ранг 0
  if (children.length === 0) {
    calculatedRanks.set(userId, 0);
    calculating.delete(userId);
    return 0;
  }
  
  // Рекурсивно вычисляем ранги детей
  const childRanks = children.map((childId: string) => 
    calculateTreeDepthFromMap(childId, childrenMap, calculatedRanks, calculating)
  );
  
  // Ранг = max(ранги детей) + 1
  const maxChildRank = Math.max(...childRanks);
  const rank = maxChildRank + 1;
  
  calculatedRanks.set(userId, rank);
  calculating.delete(userId);
  
  return rank;
}

/**
 * Вычисляет ранг партнёра (максимальная глубина дерева)
 * @param userId - ID партнёра
 * @returns Ранг партнёра (0 = нет команды, N = максимальная глубина)
 */
export async function calculateUserRank(userId: string): Promise<number> {
  try {
    console.log(`📊 Calculating rank for user ${userId}...`);
    const startTime = Date.now();
    
    // Строим карту детей по спонсорId
    const childrenMap = await buildChildrenMap();
    
    // Вычисляем ранг
    const calculatedRanks = new Map<string, number>();
    const calculating = new Set<string>();
    const rank = calculateTreeDepthFromMap(userId, childrenMap, calculatedRanks, calculating);
    
    const endTime = Date.now();
    console.log(`✅ Rank calculated for user ${userId}: ${rank} (took ${endTime - startTime}ms)`);
    
    return rank;
  } catch (error) {
    console.error(`❌ Error calculating rank for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Рассчитывает и СОХРАНЯЕТ ранг в объект пользователя + обновляет кэш
 * @param userId - ID партнёра
 * @returns Рассчитанный ранг
 */
export async function updateUserRank(userId: string): Promise<number> {
  try {
    console.log(`🔄 Updating rank for user ${userId}...`);
    
    // Инвалидируем кэш карты детей для свежего расчёта
    invalidateChildrenMapCache();
    
    // Вычисляем ранг
    const rank = await calculateUserRank(userId);
    
    // Получаем пользователя
    const user = await kv.get(`user:id:${userId}`);
    if (!user) {
      console.error(`❌ User ${userId} not found, cannot update rank`);
      return 0;
    }
    
    // Обновляем уровень в объекте пользователя
    user.уровень = rank;
    await kv.set(`user:id:${userId}`, user);
    
    // ✅ Также обновляем кэш ранга
    await kv.set(`rank:user:${userId}`, rank);
    
    console.log(`✅ User ${userId} rank updated: ${rank}`);
    return rank;
  } catch (error) {
    console.error(`❌ Error updating rank for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Обновляет ранги для пользователя и всей upline цепочки
 * @param userId - ID партнёра (с которого начинается обновление)
 */
export async function updateUplineRanks(userId: string): Promise<void> {
  try {
    console.log(`🔄 Updating ranks for user ${userId} and upline...`);
    
    // Инвалидируем кэш для свежего расчёта
    invalidateChildrenMapCache();
    
    let currentUserId = userId;
    let depth = 0;
    const maxDepth = 100; // Защита от бесконечного цикла
    const visitedIds = new Set<string>();
    
    while (currentUserId && depth < maxDepth && !visitedIds.has(currentUserId)) {
      visitedIds.add(currentUserId);
      
      // Обновляем ранг текущего пользователя
      await updateUserRank(currentUserId);
      
      // Переходим к спонсору
      const user = await kv.get(`user:id:${currentUserId}`);
      if (!user || !user.спонсорId) {
        break;
      }
      
      currentUserId = user.спонсорId;
      depth++;
    }
    
    console.log(`✅ Updated ranks for upline chain (${depth} users)`);
  } catch (error) {
    console.error(`❌ Error updating upline ranks:`, error);
  }
}

/**
 * Получает ранг партнёра с кэшированием
 * @param userId - ID партнёра
 * @param useCache - Использовать кэш (по умолчанию true)
 * @returns Ранг партнёра
 */
export async function getUserRank(userId: string, useCache: boolean = true): Promise<number> {
  const cacheKey = `rank:user:${userId}`;
  
  if (useCache) {
    // Проверяем кэш
    const cachedRank = await kv.get(cacheKey);
    if (cachedRank !== null && cachedRank !== undefined) {
      console.log(`📦 Using cached rank for user ${userId}: ${cachedRank}`);
      return cachedRank;
    }
  }
  
  // Вычисляем ранг
  const rank = await calculateUserRank(userId);
  
  // Сохраняем в кэш
  await kv.set(cacheKey, rank);
  
  return rank;
}

/**
 * Инвалидирует кэш ранга для пользователя и его upline
 * @param userId - ID партнёра
 */
export async function invalidateRankCache(userId: string): Promise<void> {
  try {
    console.log(`🔄 Invalidating rank cache for user ${userId} and upline...`);
    
    // Инвалидируем кэш самого пользователя
    await kv.del(`rank:user:${userId}`);
    
    // Инвалидируем кэш карты детей
    invalidateChildrenMapCache();
    
    // Получаем пользователя
    const user = await kv.get(`user:id:${userId}`);
    
    if (!user) {
      return;
    }
    
    // Инвалидируем кэш upline (спонсор -> спонсор спонсора -> и т.д.)
    let currentUserId = user.спонсорId;
    const visitedIds = new Set<string>();
    
    while (currentUserId && !visitedIds.has(currentUserId)) {
      visitedIds.add(currentUserId);
      await kv.del(`rank:user:${currentUserId}`);
      
      const currentUser = await kv.get(`user:id:${currentUserId}`);
      if (!currentUser) {
        break;
      }
      
      currentUserId = currentUser.спонсорId;
    }
    
    console.log(`✅ Invalidated rank cache for ${visitedIds.size + 1} users`);
  } catch (error) {
    console.error(`❌ Error invalidating rank cache for user ${userId}:`, error);
  }
}

import * as kv from './kv_store.tsx';

/**
 * Рекурсивно вычисляет максимальную глубину дерева партнёров
 * @param userId - ID партнёра
 * @param visitedIds - Множество посещённых ID (защита от циклов)
 * @returns Максимальная глубина дерева (ранг)
 */
async function calculateTreeDepth(userId: string, visitedIds: Set<string> = new Set()): Promise<number> {
  // Защита от циклов
  if (visitedIds.has(userId)) {
    console.warn(`⚠️ Cycle detected for user ${userId}`);
    return 0;
  }
  
  visitedIds.add(userId);
  
  // Получаем пользователя
  const user = await kv.get(`user:id:${userId}`);
  
  if (!user) {
    console.warn(`⚠️ User ${userId} not found`);
    return 0;
  }
  
  // Если нет команды - ранг 0
  if (!user.команда || user.команда.length === 0) {
    console.log(`📊 User ${userId} (${user.имя}): команда пуста → ранг 0`);
    return 0;
  }
  
  console.log(`📊 User ${userId} (${user.имя}): команда = [${user.команда.join(', ')}]`);
  
  // Рекурсивно вычисляем глубину для каждого партнёра в команде
  const depths: number[] = [];
  
  for (const partnerId of user.команда) {
    try {
      const partnerDepth = await calculateTreeDepth(partnerId, new Set(visitedIds));
      depths.push(partnerDepth);
      console.log(`   └─ Партнёр ${partnerId}: глубина = ${partnerDepth}`);
    } catch (error) {
      console.error(`Error calculating depth for partner ${partnerId}:`, error);
      depths.push(0);
    }
  }
  
  // Возвращаем максимальную глубину + 1
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
  const resultRank = maxDepth + 1;
  console.log(`📊 User ${userId} (${user.имя}): max(${depths.join(', ')}) + 1 = ${resultRank}`);
  return resultRank;
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
    
    const rank = await calculateTreeDepth(userId);
    
    const endTime = Date.now();
    console.log(`✅ Rank calculated for user ${userId}: ${rank} (took ${endTime - startTime}ms)`);
    
    return rank;
  } catch (error) {
    console.error(`❌ Error calculating rank for user ${userId}:`, error);
    return 0;
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
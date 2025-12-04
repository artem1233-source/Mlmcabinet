import * as kv from './kv_store.tsx';

/**
 * 🎯 ИСПРАВЛЕННАЯ ЛОГИКА РАСЧЁТА РАНГА
 * 
 * Ранг = максимальная глубина структуры ВНИЗ от пользователя.
 * - Сам пользователь НЕ включается в расчёт.
 * - Если потомков нет → ранг = 0
 * - Если есть прямые партнёры без своих структур → ранг = 1
 * - A → B → C означает: A=2, B=1, C=0
 * 
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
    console.warn(`⚠️ User ${userId} not found in KV store`);
    return 0;
  }
  
  console.log(`📊 Calculating depth for user ${userId} (${user.имя || ''} ${user.фамилия || ''})`);
  
  // ✅ КЛЮЧЕВАЯ ПРОВЕРКА: Если нет команды — ранг СТРОГО 0
  if (!user.команда || !Array.isArray(user.команда) || user.команда.length === 0) {
    console.log(`   ✅ User ${userId}: команда пуста → rank = 0`);
    return 0;
  }
  
  // Фильтруем невалидные ID из команды (null, undefined, пустые строки)
  const validTeam = user.команда.filter((id: any) => {
    return id && typeof id === 'string' && id.trim() !== '';
  });
  
  // ✅ Если все ID невалидные — ранг 0
  if (validTeam.length === 0) {
    console.log(`   ⚠️ User ${userId}: все ID в команде невалидны → rank = 0`);
    return 0;
  }
  
  console.log(`   👥 Valid team members: [${validTeam.join(', ')}]`);
  
  // Рекурсивно вычисляем ранг для каждого партнёра в команде
  const childRanks: number[] = [];
  
  for (const partnerId of validTeam) {
    try {
      // Передаем копию Set для каждой ветки
      const partnerRank = await calculateTreeDepth(partnerId, new Set(visitedIds));
      childRanks.push(partnerRank);
    } catch (error) {
      console.error(`   ❌ Error calculating rank for partner ${partnerId}:`, error);
      childRanks.push(0);
    }
  }
  
  // ✅ ФОРМУЛА: ранг = max(ранги детей) + 1
  // Если дети есть, но все с рангом 0 → max(0) + 1 = 1 (1 уровень глубины)
  // Если дети с рангами [0, 1, 2] → max(2) + 1 = 3 (3 уровня глубины)
  const maxChildRank = Math.max(...childRanks);
  const resultRank = maxChildRank + 1;
  
  console.log(`   📊 User ${userId}: childRanks=[${childRanks.join(',')}], max=${maxChildRank}, rank=${resultRank}`);
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
 * Рассчитывает и СОХРАНЯЕТ ранг в объект пользователя + обновляет кэш
 * @param userId - ID партнёра
 * @returns Рассчитанный ранг
 */
export async function updateUserRank(userId: string): Promise<number> {
  try {
    console.log(`🔄 Updating rank for user ${userId}...`);
    
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
    
    let currentUserId = userId;
    let depth = 0;
    const maxDepth = 100; // Защита от бесконечного цикла
    
    while (currentUserId && depth < maxDepth) {
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
// Вспомогательная функция для фильтрации пользователей по рангу
export async function filterUsersByRank(users: any[], rankFilter: string, calculateRank: (userId: string) => Promise<number>): Promise<any[]> {
  if (!rankFilter || rankFilter === '') {
    return users;
  }

  console.log(`🎯 Filtering ${users.length} users by rank: ${rankFilter}`);
  
  // Загружаем ранги для всех пользователей
  const ranksPromises = users.map(async (u: any) => {
    // Админы не имеют рангов
    if (u.__type === 'admin' || u.isAdmin) {
      return { user: u, rank: null };
    }
    
    try {
      const rank = await calculateRank(u.id);
      return { user: u, rank };
    } catch (error) {
      console.error(`Error calculating rank for user ${u.id}:`, error);
      return { user: u, rank: 0 };
    }
  });
  
  const usersWithRanks = await Promise.all(ranksPromises);
  
  // Фильтруем по рангу
  const filtered = usersWithRanks.filter(({ user, rank }) => {
    // Админы не проходят фильтр по рангу
    if (user.__type === 'admin' || user.isAdmin) {
      return false;
    }
    
    if (rank === null) {
      return false;
    }
    
    // Точное совпадение для 0-10
    if (rankFilter >= '0' && rankFilter <= '10') {
      const targetRank = parseInt(rankFilter);
      return rank === targetRank;
    }
    
    // Диапазоны
    if (rankFilter === '10-20') return rank > 10 && rank <= 20;
    if (rankFilter === '20-30') return rank > 20 && rank <= 30;
    if (rankFilter === '30-40') return rank > 30 && rank <= 40;
    if (rankFilter === '40-50') return rank > 40 && rank <= 50;
    if (rankFilter === '50-60') return rank > 50 && rank <= 60;
    if (rankFilter === '60-70') return rank > 60 && rank <= 70;
    if (rankFilter === '70-80') return rank > 70 && rank <= 80;
    if (rankFilter === '80-90') return rank > 80 && rank <= 90;
    if (rankFilter === '90-100') return rank > 90 && rank <= 100;
    if (rankFilter === '100+') return rank > 100;
    
    return true;
  });
  
  console.log(`✅ Filtered to ${filtered.length} users after rank filter`);
  
  return filtered.map(({ user }) => user);
}

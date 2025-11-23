// Gamification utilities for MLM system
import { getDemoData } from './demoApi';

/**
 * Получить статистику MLM для пользователя
 */
function getMLMStats(viewerUserId: string) {
  const data = getDemoData();
  
  const L1 = data.users.filter((u: any) => u.пригласившийId === viewerUserId);
  const L1_ids = L1.map((u: any) => u.id);
  const L2 = data.users.filter((u: any) => L1_ids.includes(u.пригласившийId || ''));
  const L2_ids = L2.map((u: any) => u.id);
  const L3 = data.users.filter((u: any) => L2_ids.includes(u.пригласившийId || ''));
  
  return {
    countL1: L1.length,
    countL2: L2.length,
    countL3: L3.length,
    totalPartners: L1.length + L2.length + L3.length
  };
}

/**
 * Получить заказы пользователя
 */
function getUserOrders(userId: string) {
  const data = getDemoData();
  return data.orders.filter((o: any) => o.userId === userId);
}

/**
 * Получить доходы пользователя
 */
function getUserEarnings(userId: string) {
  const data = getDemoData();
  return data.earnings.filter((e: any) => e.userId === userId);
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Получить достижения пользователя
 */
export async function demoGetAchievements() {
  await delay(300);
  const data = getDemoData();
  const currentUserId = data.currentUserId;
  const currentUser = data.users.find((u: any) => u.id === currentUserId);
  
  if (!currentUser) {
    return { achievements: [], stats: {} };
  }
  
  // Вычисляем статистику пользователя
  const mlmStats = getMLMStats(currentUserId);
  const userOrders = getUserOrders(currentUserId);
  const userEarnings = getUserEarnings(currentUserId);
  const totalEarnings = userEarnings.reduce((sum, e) => sum + (e.сумма || 0), 0);
  const totalSales = userOrders.filter((o: any) => o.статус === 'completed').length;
  
  // Определяем достижения
  const achievements = [
    {
      id: 'first_sale',
      название: 'Первая продажа',
      описание: 'Совершите первую продажу',
      иконка: '🎯',
      категория: 'sales',
      прогресс: Math.min(totalSales, 1),
      цель: 1,
      завершено: totalSales >= 1,
      награда: '500₽ бонус',
      цвет: '#10B981'
    },
    {
      id: 'sales_10',
      название: '10 продаж',
      описание: 'Совершите 10 успешных продаж',
      иконка: '🔥',
      категория: 'sales',
      прогресс: Math.min(totalSales, 10),
      цель: 10,
      завершено: totalSales >= 10,
      награда: '2000₽ бонус',
      цвет: '#F59E0B'
    },
    {
      id: 'sales_50',
      название: 'Звезда продаж',
      описание: 'Совершите 50 успешных продаж',
      иконка: '⭐',
      категория: 'sales',
      прогресс: Math.min(totalSales, 50),
      цель: 50,
      завершено: totalSales >= 50,
      награда: '10000₽ бонус',
      цвет: '#8B5CF6'
    },
    {
      id: 'first_partner',
      название: 'Первый партнёр',
      описание: 'Пригласите первого партнёра',
      иконка: '🤝',
      категория: 'team',
      прогресс: Math.min(mlmStats.countL1, 1),
      цель: 1,
      завершено: mlmStats.countL1 >= 1,
      награда: '1000₽ бонус',
      цвет: '#39B7FF'
    },
    {
      id: 'partners_10',
      название: '10 партнёров',
      описание: 'Соберите команду из 10 прямых партнёров',
      иконка: '👥',
      категория: 'team',
      прогресс: Math.min(mlmStats.countL1, 10),
      цель: 10,
      завершено: mlmStats.countL1 >= 10,
      награда: '5000₽ бонус',
      цвет: '#12C9B6'
    },
    {
      id: 'team_50',
      название: 'Большая команда',
      описание: 'Общая структура 50+ человек',
      иконка: '🏆',
      категория: 'team',
      прогресс: Math.min(mlmStats.totalPartners, 50),
      цель: 50,
      завершено: mlmStats.totalPartners >= 50,
      награда: '20000₽ бонус',
      цвет: '#EF4444'
    },
    {
      id: 'earnings_10k',
      название: 'Первые 10 000₽',
      описание: 'Заработайте 10 000₽',
      иконка: '💰',
      категория: 'money',
      прогресс: Math.min(totalEarnings, 10000),
      цель: 10000,
      завершено: totalEarnings >= 10000,
      награда: '1000₽ бонус',
      цвет: '#10B981'
    },
    {
      id: 'earnings_100k',
      название: 'Сто тысяч',
      описание: 'Заработайте 100 000₽',
      иконка: '💎',
      категория: 'money',
      прогресс: Math.min(totalEarnings, 100000),
      цель: 100000,
      завершено: totalEarnings >= 100000,
      награда: '10000₽ бонус',
      цвет: '#8B5CF6'
    },
    {
      id: 'millionaire',
      название: 'Миллионер',
      описание: 'Заработайте 1 000 000₽',
      иконка: '👑',
      категория: 'money',
      прогресс: Math.min(totalEarnings, 1000000),
      цель: 1000000,
      завершено: totalEarnings >= 1000000,
      награда: '100000₽ бонус',
      цвет: '#F59E0B'
    },
    {
      id: 'level_2',
      название: 'Партнёр 2 уровня',
      описание: 'Достигните 2 уровня партнёрства',
      иконка: '📈',
      категория: 'level',
      прогресс: Math.min(currentUser.уровень || 1, 2),
      цель: 2,
      завершено: (currentUser.уровень || 1) >= 2,
      награда: 'Скидка 15%',
      цвет: '#39B7FF'
    },
    {
      id: 'level_3',
      название: 'Партнёр 3 уровня',
      описание: 'Достигните максимального 3 уровня',
      иконка: '🚀',
      категория: 'level',
      прогресс: Math.min(currentUser.уровень || 1, 3),
      цель: 3,
      завершено: (currentUser.уровень || 1) >= 3,
      награда: 'Скидка 20%',
      цвет: '#12C9B6'
    }
  ];
  
  const stats = {
    total: achievements.length,
    completed: achievements.filter(a => a.завершено).length,
    inProgress: achievements.filter(a => !a.завершено && a.прогресс > 0).length,
    totalSales,
    totalEarnings,
    totalPartners: mlmStats.totalPartners,
    userLevel: currentUser.уровень || 1
  };
  
  return { achievements, stats };
}

/**
 * Получить челленджи (вызовы)
 */
export async function demoGetChallenges() {
  await delay(300);
  const data = getDemoData();
  const currentUserId = data.currentUserId;
  
  const mlmStats = getMLMStats(currentUserId);
  const userOrders = getUserOrders(currentUserId);
  const thisMonthSales = userOrders.filter((o: any) => {
    const orderDate = new Date(o.дата);
    const now = new Date();
    return orderDate.getMonth() === now.getMonth() && 
           orderDate.getFullYear() === now.getFullYear() &&
           o.статус === 'completed';
  }).length;
  
  const thisMonthNewPartners = mlmStats.countL1; // Упрощение для демо
  
  // Текущий месяц
  const currentMonth = new Date().toLocaleString('ru-RU', { month: 'long' });
  
  const challenges = [
    {
      id: 'monthly_sales_50',
      название: `Продайте 50 единиц в ${currentMonth}`,
      описание: 'Совершите 50 успешных продаж до конца месяца',
      иконка: '📦',
      категория: 'sales',
      прогресс: Math.min(thisMonthSales, 50),
      цель: 50,
      завершено: thisMonthSales >= 50,
      дедлайн: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      награда: '15000₽',
      тип: 'monthly',
      цвет: '#10B981'
    },
    {
      id: 'monthly_partners_5',
      название: `5 новых партнёров в ${currentMonth}`,
      описание: 'Пригласите 5 новых партнёров до конца месяца',
      иконка: '🎯',
      категория: 'team',
      прогресс: Math.min(thisMonthNewPartners, 5),
      цель: 5,
      завершено: thisMonthNewPartners >= 5,
      дедлайн: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      награда: '10000₽',
      тип: 'monthly',
      цвет: '#39B7FF'
    },
    {
      id: 'weekly_sales_10',
      название: '10 продаж за неделю',
      описание: 'Совершите 10 продаж за эту неделю',
      иконка: '⚡',
      категория: 'sales',
      прогресс: Math.min(thisMonthSales % 10, 10), // Упрощение для демо
      цель: 10,
      завершено: false,
      дедлайн: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      награда: '3000₽',
      тип: 'weekly',
      цвет: '#F59E0B'
    },
    {
      id: 'special_december',
      название: 'Новогодний марафон',
      описание: 'Специальный челлендж: продайте 100 единиц в декабре',
      иконка: '🎄',
      категория: 'special',
      прогресс: Math.min(thisMonthSales, 100),
      цель: 100,
      завершено: false,
      дедлайн: '2025-12-31T23:59:59',
      награда: '50000₽ + Бонус',
      тип: 'special',
      цвет: '#EF4444'
    }
  ];
  
  return { challenges };
}

/**
 * Получить рейтинг партнёров
 */
export async function demoGetLeaderboard() {
  await delay(300);
  const data = getDemoData();
  
  // Рейтинг по продажам
  const salesLeaderboard = data.users
    .map((user: any) => {
      const orders = getUserOrders(user.id);
      const completedSales = orders.filter((o: any) => o.статус === 'completed').length;
      return {
        userId: user.id,
        имя: user.имя,
        фамилия: user.фамилия,
        уровень: user.уровень,
        значение: completedSales,
        метрика: 'продаж'
      };
    })
    .sort((a: any, b: any) => b.значение - a.значение)
    .slice(0, 10);
  
  // Рейтинг по команде
  const teamLeaderboard = data.users
    .map((user: any) => {
      const stats = getMLMStats(user.id);
      return {
        userId: user.id,
        имя: user.имя,
        фамилия: user.фамилия,
        уровень: user.уровень,
        значение: stats.totalPartners,
        метрика: 'партнёров'
      };
    })
    .sort((a: any, b: any) => b.значение - a.значение)
    .slice(0, 10);
  
  // Рейтинг по доходам
  const earningsLeaderboard = data.users
    .map((user: any) => {
      const earnings = getUserEarnings(user.id);
      const totalEarnings = earnings.reduce((sum, e) => sum + (e.сумма || 0), 0);
      return {
        userId: user.id,
        имя: user.имя,
        фамилия: user.фамилия,
        уровень: user.уровень,
        значение: totalEarnings,
        метрика: '₽'
      };
    })
    .sort((a: any, b: any) => b.значение - a.значение)
    .slice(0, 10);
  
  return {
    sales: salesLeaderboard,
    team: teamLeaderboard,
    earnings: earningsLeaderboard
  };
}

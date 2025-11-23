// API functions for Achievements Admin management
import { loadDemoDataFromStorage, saveDemoDataToStorage } from './demoData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getDemoData() {
  const data = loadDemoDataFromStorage();
  if (!data) {
    throw new Error('Demo data not initialized');
  }
  return data;
}

/**
 * Получить базовые шаблоны достижений для админа
 */
function getAchievementTemplates() {
  return [
    {
      id: 'first_sale',
      название: 'Первая продажа',
      описание: 'Совершите первую продажу',
      иконка: '🎯',
      категория: 'sales',
      цель: 1,
      награда: '500₽ бонус',
      цвет: '#10B981'
    },
    {
      id: 'sales_10',
      название: '10 продаж',
      описание: 'Совершите 10 успешных продаж',
      иконка: '🔥',
      категория: 'sales',
      цель: 10,
      награда: '2000₽ бонус',
      цвет: '#F59E0B'
    },
    {
      id: 'sales_50',
      название: 'Звезда продаж',
      описание: 'Совершите 50 успешных продаж',
      иконка: '⭐',
      категория: 'sales',
      цель: 50,
      награда: '10000₽ бонус',
      цвет: '#8B5CF6'
    },
    {
      id: 'first_partner',
      название: 'Первый партнёр',
      описание: 'Пригласите первого партнёра',
      иконка: '🤝',
      категория: 'team',
      цель: 1,
      награда: '1000₽ бонус',
      цвет: '#39B7FF'
    },
    {
      id: 'partners_10',
      название: '10 партнёров',
      описание: 'Соберите команду из 10 прямых партнёров',
      иконка: '👥',
      категория: 'team',
      цель: 10,
      награда: '5000₽ бонус',
      цвет: '#12C9B6'
    },
    {
      id: 'team_50',
      название: 'Большая команда',
      описание: 'Общая структура 50+ человек',
      иконка: '🏆',
      категория: 'team',
      цель: 50,
      награда: '20000₽ бонус',
      цвет: '#EF4444'
    },
    {
      id: 'earnings_10k',
      название: 'Первые 10 000₽',
      описание: 'Заработайте 10 000₽',
      иконка: '💰',
      категория: 'money',
      цель: 10000,
      награда: '1000₽ бонус',
      цвет: '#10B981'
    },
    {
      id: 'earnings_100k',
      название: 'Сто тысяч',
      описание: 'Заработайте 100 000₽',
      иконка: '💎',
      категория: 'money',
      цель: 100000,
      награда: '10000₽ бонус',
      цвет: '#8B5CF6'
    },
    {
      id: 'millionaire',
      название: 'Миллионер',
      описание: 'Заработайте 1 000 000₽',
      иконка: '👑',
      категория: 'money',
      цель: 1000000,
      награда: '100000₽ бонус',
      цвет: '#F59E0B'
    },
    {
      id: 'level_2',
      название: 'Партнёр 2 уровня',
      описание: 'Достигните 2 уровня партнёрства',
      иконка: '📈',
      категория: 'level',
      цель: 2,
      награда: 'Скидка 15%',
      цвет: '#39B7FF'
    },
    {
      id: 'level_3',
      название: 'Партнёр 3 уровня',
      описание: 'Достигните максимального 3 уровня',
      иконка: '🚀',
      категория: 'level',
      цель: 3,
      награда: 'Скидка 20%',
      цвет: '#12C9B6'
    }
  ];
}

/**
 * Получить базовые шаблоны челленджей для админа
 */
function getChallengeTemplates() {
  const currentMonth = new Date().toLocaleString('ru-RU', { month: 'long' });
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  return [
    {
      id: 'monthly_sales_50',
      название: `Продайте 50 единиц в ${currentMonth}`,
      описание: 'Совершите 50 успешных продаж до конца месяца',
      иконка: '📦',
      категория: 'sales',
      цель: 50,
      дедлайн: endOfMonth,
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
      цель: 5,
      дедлайн: endOfMonth,
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
      цель: 10,
      дедлайн: nextWeek,
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
      цель: 100,
      дедлайн: '2025-12-31T23:59:59',
      награда: '50000₽ + Бонус',
      тип: 'special',
      цвет: '#EF4444'
    }
  ];
}

// ============= ACHIEVEMENTS ADMIN =============

/**
 * Получить список достижений для админа
 */
export async function demoGetAchievementsAdmin() {
  await delay(300);
  const data = getDemoData();
  
  // Инициализируем achievements если их нет
  if (!data.achievements) {
    data.achievements = getAchievementTemplates();
    saveDemoDataToStorage(data);
  }
  
  return data.achievements || [];
}

/**
 * Создать достижение
 */
export async function demoCreateAchievement(achievementData: any) {
  await delay(400);
  console.log('🎭 Demo: Creating achievement...', achievementData);
  const data = getDemoData();
  
  // Инициализируем achievements если их нет
  if (!data.achievements) {
    data.achievements = [];
  }
  
  // Создаём новое достижение
  const newAchievement = {
    id: `achievement_${Date.now()}`,
    название: achievementData.название,
    описание: achievementData.описание,
    иконка: achievementData.иконка || '🎯',
    категория: achievementData.категория || 'sales',
    цель: achievementData.цель || 1,
    награда: achievementData.награда,
    цвет: achievementData.цвет || '#10B981'
  };
  
  // Добавляем в список
  data.achievements.push(newAchievement);
  
  // Сохраняем
  saveDemoDataToStorage(data);
  
  console.log('✅ Demo achievement created:', newAchievement);
  
  return {
    success: true,
    message: 'Достижение создано',
    achievement: newAchievement
  };
}

/**
 * Обновить достижение
 */
export async function demoUpdateAchievement(id: string, updates: any) {
  await delay(400);
  console.log('🎭 Demo: Updating achievement...', id, updates);
  const data = getDemoData();
  
  if (!data.achievements) {
    data.achievements = [];
  }
  
  // Находим достижение
  const achievementIndex = data.achievements.findIndex((a: any) => a.id === id);
  
  if (achievementIndex !== -1) {
    // Обновляем достижение
    data.achievements[achievementIndex] = {
      ...data.achievements[achievementIndex],
      название: updates.название,
      описание: updates.описание,
      иконка: updates.иконка,
      категория: updates.категория,
      цель: updates.цель,
      награда: updates.награда,
      цвет: updates.цвет
    };
    
    // Сохраняем
    saveDemoDataToStorage(data);
    
    console.log('✅ Demo achievement updated:', data.achievements[achievementIndex]);
    
    return {
      success: true,
      message: 'Достижение обновлено',
      achievement: data.achievements[achievementIndex]
    };
  }
  
  return {
    success: false,
    message: 'Достижение не найдено'
  };
}

/**
 * Удалить достижение
 */
export async function demoDeleteAchievement(id: string) {
  await delay(400);
  console.log('🎭 Demo: Deleting achievement...', id);
  const data = getDemoData();
  
  if (!data.achievements) {
    data.achievements = [];
  }
  
  // Находим индекс достижения
  const achievementIndex = data.achievements.findIndex((a: any) => a.id === id);
  
  if (achievementIndex !== -1) {
    const deletedAchievement = data.achievements[achievementIndex];
    // Удаляем достижение
    data.achievements.splice(achievementIndex, 1);
    
    // Сохраняем
    saveDemoDataToStorage(data);
    
    console.log('✅ Demo achievement deleted:', deletedAchievement);
    
    return {
      success: true,
      message: 'Достижение удалено'
    };
  }
  
  return {
    success: false,
    message: 'Достижение не найдено'
  };
}

// ============= CHALLENGES ADMIN =============

/**
 * Получить список челленджей для админа
 */
export async function demoGetChallengesAdmin() {
  await delay(300);
  const data = getDemoData();
  
  // Инициализируем challenges если их нет
  if (!data.challenges) {
    data.challenges = getChallengeTemplates();
    saveDemoDataToStorage(data);
  }
  
  return data.challenges || [];
}

/**
 * Создать челлендж
 */
export async function demoCreateChallenge(challengeData: any) {
  await delay(400);
  console.log('🎭 Demo: Creating challenge...', challengeData);
  const data = getDemoData();
  
  // Инициализируем challenges если их нет
  if (!data.challenges) {
    data.challenges = [];
  }
  
  // Создаём новый челлендж
  const newChallenge = {
    id: `challenge_${Date.now()}`,
    название: challengeData.название,
    описание: challengeData.описание,
    иконка: challengeData.иконка || '🎯',
    категория: challengeData.категория || 'sales',
    цель: challengeData.цель || 1,
    дедлайн: challengeData.дедлайн,
    награда: challengeData.награда,
    тип: challengeData.тип || 'monthly',
    цвет: challengeData.цвет || '#10B981'
  };
  
  // Добавляем в список
  data.challenges.push(newChallenge);
  
  // Сохраняем
  saveDemoDataToStorage(data);
  
  console.log('✅ Demo challenge created:', newChallenge);
  
  return {
    success: true,
    message: 'Челлендж создан',
    challenge: newChallenge
  };
}

/**
 * Обновить челлендж
 */
export async function demoUpdateChallenge(id: string, updates: any) {
  await delay(400);
  console.log('🎭 Demo: Updating challenge...', id, updates);
  const data = getDemoData();
  
  if (!data.challenges) {
    data.challenges = [];
  }
  
  // Находим челлендж
  const challengeIndex = data.challenges.findIndex((c: any) => c.id === id);
  
  if (challengeIndex !== -1) {
    // Обновляем челлендж
    data.challenges[challengeIndex] = {
      ...data.challenges[challengeIndex],
      название: updates.название,
      описание: updates.описание,
      иконка: updates.иконка,
      категория: updates.категория,
      цель: updates.цель,
      дедлайн: updates.дедлайн,
      награда: updates.награда,
      тип: updates.тип,
      цвет: updates.цвет
    };
    
    // Сохраняем
    saveDemoDataToStorage(data);
    
    console.log('✅ Demo challenge updated:', data.challenges[challengeIndex]);
    
    return {
      success: true,
      message: 'Челлендж обновлён',
      challenge: data.challenges[challengeIndex]
    };
  }
  
  return {
    success: false,
    message: 'Челлендж не найден'
  };
}

/**
 * Удалить челлендж
 */
export async function demoDeleteChallenge(id: string) {
  await delay(400);
  console.log('🎭 Demo: Deleting challenge...', id);
  const data = getDemoData();
  
  if (!data.challenges) {
    data.challenges = [];
  }
  
  // Находим индекс челленджа
  const challengeIndex = data.challenges.findIndex((c: any) => c.id === id);
  
  if (challengeIndex !== -1) {
    const deletedChallenge = data.challenges[challengeIndex];
    // Удаляем челлендж
    data.challenges.splice(challengeIndex, 1);
    
    // Сохраняем
    saveDemoDataToStorage(data);
    
    console.log('✅ Demo challenge deleted:', deletedChallenge);
    
    return {
      success: true,
      message: 'Челлендж удалён'
    };
  }
  
  return {
    success: false,
    message: 'Челлендж не найден'
  };
}

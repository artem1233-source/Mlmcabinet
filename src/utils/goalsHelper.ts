// Хелперы для работы с целями партнёра

export interface Goal {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  deadline?: string; // опционально
}

export interface GoalsStats {
  totalCompleted: number;
  weekCompleted: number;
  monthCompleted: number;
  streak: number;
  completionRate: number; // процент выполнения
}

// 📖 Загрузить цели из localStorage
export function loadGoals(userId: string): Goal[] {
  try {
    const key = `user_goals_${userId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading goals:', error);
  }
  
  // Если нет сохранённых целей, возвращаем дефолтные
  return getDefaultGoals();
}

// 🎯 Дефолтные цели при первом входе
function getDefaultGoals(): Goal[] {
  const now = new Date().toISOString();
  return [
    {
      id: generateId(),
      title: 'Пригласить 2 новых партнёров',
      completed: false,
      createdAt: now,
    },
    {
      id: generateId(),
      title: 'Сделать 1 заказ',
      completed: false,
      createdAt: now,
    },
    {
      id: generateId(),
      title: 'Провести 3 консультации',
      completed: false,
      createdAt: now,
    },
  ];
}

// 💾 Сохранить цели в localStorage
export function saveGoals(userId: string, goals: Goal[]): void {
  try {
    const key = `user_goals_${userId}`;
    localStorage.setItem(key, JSON.stringify(goals));
  } catch (error) {
    console.error('Error saving goals:', error);
  }
}

// ➕ Добавить новую цель
export function addGoal(userId: string, title: string, deadline?: string): Goal {
  const goals = loadGoals(userId);
  const newGoal: Goal = {
    id: generateId(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
    deadline,
  };
  goals.push(newGoal);
  saveGoals(userId, goals);
  return newGoal;
}

// ✅ Отметить цель как выполненную
export function toggleGoalCompletion(userId: string, goalId: string): void {
  const goals = loadGoals(userId);
  const goal = goals.find(g => g.id === goalId);
  if (goal) {
    goal.completed = !goal.completed;
    goal.completedAt = goal.completed ? new Date().toISOString() : undefined;
    saveGoals(userId, goals);
  }
}

// 🗑️ Удалить цель
export function deleteGoal(userId: string, goalId: string): void {
  const goals = loadGoals(userId);
  const filtered = goals.filter(g => g.id !== goalId);
  saveGoals(userId, filtered);
}

// 📊 Получить статистику по целям
export function getGoalsStats(userId: string): GoalsStats {
  const goals = loadGoals(userId);
  const completed = goals.filter(g => g.completed);
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const weekCompleted = completed.filter(g => 
    g.completedAt && new Date(g.completedAt) >= weekAgo
  ).length;
  
  const monthCompleted = completed.filter(g => 
    g.completedAt && new Date(g.completedAt) >= monthAgo
  ).length;
  
  // Расчёт стрика (упрощённый)
  const streak = calculateStreak(goals);
  
  // Процент выполнения (активные + выполненные за месяц)
  const recentGoals = goals.filter(g => 
    new Date(g.createdAt) >= monthAgo
  );
  const completionRate = recentGoals.length > 0 
    ? Math.round((completed.filter(g => new Date(g.createdAt) >= monthAgo).length / recentGoals.length) * 100)
    : 0;
  
  return {
    totalCompleted: completed.length,
    weekCompleted,
    monthCompleted,
    streak,
    completionRate,
  };
}

// 🔥 Рассчитать стрик (упрощённая версия - сколько дней подряд выполнял цели)
function calculateStreak(goals: Goal[]): number {
  const completed = goals
    .filter(g => g.completed && g.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  
  if (completed.length === 0) return 0;
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  // Простой подсчёт: есть ли выполненные цели в последние N дней
  for (let i = 0; i < 30; i++) {
    const hasGoalOnDate = completed.some(g => {
      const completedDate = new Date(g.completedAt!);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === currentDate.getTime();
    });
    
    if (hasGoalOnDate) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// 🔢 Генератор ID
function generateId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 📋 Получить активные цели
export function getActiveGoals(userId: string): Goal[] {
  return loadGoals(userId).filter(g => !g.completed);
}

// ✅ Получить выполненные цели (последние N)
export function getCompletedGoals(userId: string, limit: number = 10): Goal[] {
  return loadGoals(userId)
    .filter(g => g.completed)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, limit);
}

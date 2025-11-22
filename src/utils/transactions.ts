// Система отслеживания транзакций и доходов

export interface Transaction {
  id: string;
  userId: string;
  orderId: string;
  amount: number;
  level: string;
  type: 'earning' | 'withdrawal' | 'refund';
  timestamp: Date;
  description: string;
}

export interface Earning {
  userId: string;
  orderId: string;
  amount: number;
  level: string;
  fromUserId: string; // кто сделал продажу
  timestamp: Date;
}

/**
 * Создает запись о доходе
 */
export function createEarning(
  userId: string, 
  orderId: string, 
  amount: number, 
  level: string,
  fromUserId: string
): Earning {
  return {
    userId,
    orderId,
    amount,
    level,
    fromUserId,
    timestamp: new Date()
  };
}

/**
 * Создает транзакцию
 */
export function createTransaction(
  id: string,
  userId: string,
  orderId: string,
  amount: number,
  level: string,
  type: 'earning' | 'withdrawal' | 'refund',
  description: string
): Transaction {
  return {
    id,
    userId,
    orderId,
    amount,
    level,
    type,
    timestamp: new Date(),
    description
  };
}

/**
 * Получить общий доход пользователя
 * 
 * ✅ ИСПРАВЛЕНО: Работает с реальной структурой демо-��анных
 */
export function getTotalEarnings(earnings: Earning[], userId: string): number {
  if (!earnings || !Array.isArray(earnings)) {
    return 0;
  }
  
  // ✅ Функция для получения суммы из earnings (поддержка разных форматов)
  const getAmount = (e: any) => e.amount || e.сумма || 0;
  
  return earnings
    .filter((e: any) => e.userId === userId)
    .reduce((sum, e) => sum + getAmount(e), 0);
}

/**
 * Получить доход по уровням
 * 
 * ✅ ИСПРАВЛЕНО: Работает с реальной структурой демо-данных
 * - earnings могут иметь поле `level` (строка) ИЛИ `линия` (число)
 * - earnings могут иметь поле `amount` (число) ИЛИ `сумма` (число)
 */
export function getEarningsByLevel(earnings: Earning[], userId: string): {
  L0: number;
  L1: number;
  L2: number;
  L3: number;
} {
  if (!earnings || !Array.isArray(earnings)) {
    return { L0: 0, L1: 0, L2: 0, L3: 0 };
  }
  const userEarnings = earnings.filter((e: any) => e.userId === userId);
  
  // ✅ Функция для получения суммы из earnings (поддержка разных форматов)
  const getAmount = (e: any) => e.amount || e.сумма || 0;
  
  // ✅ Функция для определени�� уровня (поддержка level и линия)
  const isLevel = (e: any, levelNum: number) => {
    // Проверяем поле линия (число)
    if (typeof e.линия === 'number' && e.линия === levelNum) {
      return true;
    }
    // Проверяем поле level (строка)
    if (e.level === `L${levelNum}`) {
      return true;
    }
    return false;
  };
  
  return {
    L0: userEarnings.filter(e => isLevel(e, 0)).reduce((sum, e) => sum + getAmount(e), 0),
    L1: userEarnings.filter(e => isLevel(e, 1)).reduce((sum, e) => sum + getAmount(e), 0),
    L2: userEarnings.filter(e => isLevel(e, 2)).reduce((sum, e) => sum + getAmount(e), 0),
    L3: userEarnings.filter(e => isLevel(e, 3)).reduce((sum, e) => sum + getAmount(e), 0),
  };
}

/**
 * Получить историю транзакций пользователя
 */
export function getUserTransactions(transactions: Transaction[], userId: string): Transaction[] {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }
  return transactions
    .filter(t => t.userId === userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Получить статистику доходов за период
 * 
 * ✅ ИСПРАВЛЕНО: Работает с реальной структурой демо-данных
 */
export function getEarningsStats(earnings: Earning[], userId: string, days: number = 30): {
  total: number;
  count: number;
  average: number;
  byLevel: { L0: number; L1: number; L2: number; L3: number };
} {
  if (!earnings || !Array.isArray(earnings)) {
    return { total: 0, count: 0, average: 0, byLevel: { L0: 0, L1: 0, L2: 0, L3: 0 } };
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // ✅ Функция для получения даты из earnings (поддержка разных форматов)
  const getTimestamp = (e: any) => {
    if (e.timestamp instanceof Date) return e.timestamp;
    if (e.дата) return new Date(e.дата);
    if (e.timestamp) return new Date(e.timestamp);
    return new Date();
  };
  
  // ✅ Функция для получения суммы из earnings (поддержка разных форматов)
  const getAmount = (e: any) => e.amount || e.сумма || 0;
  
  const periodEarnings = earnings.filter(
    (e: any) => e.userId === userId && getTimestamp(e) >= cutoffDate
  );
  
  const total = periodEarnings.reduce((sum, e) => sum + getAmount(e), 0);
  const count = periodEarnings.length;
  const average = count > 0 ? total / count : 0;
  
  return {
    total,
    count,
    average,
    byLevel: getEarningsByLevel(periodEarnings, userId)
  };
}
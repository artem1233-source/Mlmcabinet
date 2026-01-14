/**
 * 🔐 Проверяет, является ли пользователь СИСТЕМНЫМ администратором
 * 
 * Системные администраторы исключаются из дерева команды и партнёрских отчётов.
 * Это специальные служебные учётные записи:
 * - admin@admin.com (главный системный админ)
 * - CEO (корпоративный CEO с id 'ceo' или 'CEO', либо с email ceo@*)
 * - admin-* (служебные админские аккаунты с префиксом)
 * 
 * ⚠️ ВАЖНО: Пользователи с правами администратора (isAdmin: true), но БЕЗ этих признаков,
 * являются ПАРТНЁРАМИ с админскими правами и ДОЛЖНЫ отображаться в дереве!
 * 
 * Пример: Пользователь 001 (artem1233@mail.ru) с isAdmin: true - это партнёр с правами админа,
 * а НЕ системный администратор.
 * 
 * @param user - объект пользователя
 * @returns true если пользователь является системным админом
 */
export function isSystemAdmin(user: any): boolean {
  if (!user) return false;
  
  // П��оверяем email
  const isAdminEmail = user.email?.toLowerCase() === 'admin@admin.com';
  const isCeoEmail = user.email?.toLowerCase().startsWith('ceo@');
  const isSeoEmail = user.email?.toLowerCase().startsWith('seo@');
  
  // Проверяем ID
  const isCeoId = user.id?.toLowerCase() === 'ceo';
  const isSeoId = user.id?.toLowerCase() === 'seo';
  const hasAdminIdPrefix = typeof user.id === 'string' && user.id.toLowerCase().startsWith('admin-');
  
  return isAdminEmail || isCeoEmail || isSeoEmail || isCeoId || isSeoId || hasAdminIdPrefix;
}

/**
 * 🎯 Проверяет, является ли пользователь обычным партнёром
 * (не системный админ, включая партнёров с админскими правами)
 * 
 * @param user - объект пользователя
 * @returns true если пользователь является партнёром
 */
export function isPartner(user: any): boolean {
  return !isSystemAdmin(user);
}

/**
 * 👥 Фильтрует массив пользователей, оставляя только партнёров
 * (исключает системных админов)
 * 
 * @param users - массив пользователей
 * @returns массив только партнёров
 */
export function filterPartners(users: any[]): any[] {
  return users.filter(u => isPartner(u));
}
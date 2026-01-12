# Исправление переключения ролей в H2 Platform

## Проблема
При смене роли в админ-панели H2 Platform менялось только левое меню (sidebar), но главный дашборд оставался прежним.

## Решение
Внесены изменения в `/admin/AdminDashboard.tsx`:

### 1. Динамический рендеринг дашборда по роли
В функции `renderContent()` добавлен switch для секции 'dashboard', который выбирает соответствующий компонент дашборда в зависимости от `currentRole`:

```tsx
case 'dashboard':
  switch (currentRole) {
    case 'SEO': return <OwnerDashboard />;
    case 'AdminOps': return <AdminOpsDashboard />;
    case 'Finance': return <FinanceDashboard />;
    case 'Warehouse': return <WarehouseDashboard />;
    case 'Marketing': return <MarketingDashboard />;
    case 'Support': return <SupportDashboard />;
    case 'Partner': return <PartnerDashboard />;
    default: return <OwnerDashboard />;
  }
```

### 2. Автоматический переход к дашборду при смене роли
Упрощена функция `handleRoleChange()` - теперь она всегда переводит пользователя на секцию 'dashboard' при смене роли:

```tsx
const handleRoleChange = (role: Role) => {
  setCurrentRole(role);
  toast.success(`Режим изменён: ${ROLE_CONFIGS[role].name}`);
  setActiveSection('dashboard');
};
```

### 3. Динамический заголовок с названием роли
Обновлена функция `getSectionTitle()` для отображения текущей роли в заголовке дашборда:

```tsx
if (activeSection === 'dashboard') {
  return `${ROLE_CONFIGS[currentRole].name} - Центр управления`;
}
```

## Результат
Теперь при смене роли:
1. ✅ Меняется содержимое дашборда
2. ✅ Меняется левое меню
3. ✅ Автоматически открывается дашборд выбранной роли
4. ✅ Заголовок отображает текущую роль
5. ✅ Показывается уведомление о смене режима

## Тестирование
Для проверки:
1. Откройте админ-панель H2 Platform
2. Используйте переключатель ролей в верхней панели (доступен для роли SEO/Owner)
3. Убедитесь, что при выборе каждой роли отображается соответствующий дашборд:
   - **SEO/Owner** → Центр управления владельца
   - **AdminOps** → Дашборд администратора
   - **Finance** → Финансовый дашборд
   - **Warehouse** → Дашборд склада
   - **Marketing** → Маркетинговый дашборд
   - **Support** → Дашборд поддержки
   - **Partner** → Партнёрский кабинет

## Дата исправления
6 января 2026 г.

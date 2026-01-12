# 📊 Руководство по интеграции реальных данных

**Дата**: 6 января 2026  
**Версия**: 1.0

---

## 🎯 Обзор

Этот документ описывает процесс интеграции реальных данных из Supabase в админ-панель H2 Platform вместо моковых данных.

---

## 📦 Созданные хуки

### Файл: `/admin/hooks/useAdminData.ts`

Содержит хуки для получения данных из Supabase:

1. **useOwnerDashboardData(period)** - данные для Owner Dashboard
2. **useAdminOpsData()** - данные для AdminOps Dashboard
3. **useFinanceData()** - данные для Finance Dashboard
4. **useWarehouseData()** - данные для Warehouse Dashboard
5. **useRoleOrders(role)** - заказы по роли

---

## 🔄 Как использовать хуки

### Пример 1: Owner Dashboard

**До (моковые данные):**
```tsx
export function OwnerDashboard() {
  const revenue = 2450000;
  const commissions = 350000;
  // ...
}
```

**После (реальные данные):**
```tsx
import { useOwnerDashboardData } from '../../hooks/useAdminData';

export function OwnerDashboard() {
  const { data, loading, error } = useOwnerDashboardData('30');
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;
  
  const { kpis, users, orders, products } = data;
  
  return (
    <div>
      <KPICard label="Выручка" value={`₽${kpis.revenue.toLocaleString()}`} />
      {/* ... */}
    </div>
  );
}
```

### Пример 2: AdminOps Dashboard

**До (моковые данные):**
```tsx
export function AdminOpsDashboard() {
  const users = [
    { id: '1', name: 'Александр Иванов', ... },
    // ...
  ];
}
```

**После (реальные данные):**
```tsx
import { useAdminOpsData } from '../../hooks/useAdminData';

export function AdminOpsDashboard() {
  const { data, loading, error } = useAdminOpsData();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;
  
  const { kpis, users } = data;
  
  return (
    <div>
      <KPICard label="Всего партнёров" value={kpis.total} />
      {/* ... */}
    </div>
  );
}
```

### Пример 3: Finance Dashboard

```tsx
import { useFinanceData } from '../../hooks/useAdminData';

export function FinanceDashboard() {
  const { data, loading, error } = useFinanceData();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;
  
  const { kpis, payoutRequests, refundRequests } = data;
  
  return (
    <div>
      <KPICard label="Выплаты pending" value={`₽${kpis.pending.toLocaleString()}`} />
      {/* Таблица запросов на выплаты */}
      {payoutRequests.map(request => (
        <PayoutRequestRow key={request.id} data={request} />
      ))}
    </div>
  );
}
```

---

## 🛠️ Шаги интеграции

### Шаг 1: Обновить компонент Owner Dashboard

1. Откройте `/admin/components/roles/OwnerDashboard.tsx`
2. Импортируйте хук: `import { useOwnerDashboardData } from '../../hooks/useAdminData';`
3. Используйте хук в начале компонента: `const { data, loading, error } = useOwnerDashboardData(period);`
4. Замените все hardcoded значения на `data.kpis.*`
5. Добавьте обработку состояний loading и error

### Шаг 2: Обновить компонент AdminOps Dashboard

1. Откройте `/admin/components/roles/AdminOpsDashboard.tsx`
2. Импортируйте хук: `import { useAdminOpsData } from '../../hooks/useAdminData';`
3. Замените массив `users` на `data.users` из хука
4. Обновите KPI карточки на `data.kpis.*`

### Шаг 3: Обновить компонент Finance Dashboard

1. Откройте `/admin/components/roles/FinanceDashboard.tsx`
2. Импортируйте хук: `import { useFinanceData } from '../../hooks/useAdminData';`
3. Замените `payoutRequests` и `refundRequests` на данные из хука
4. Обновите KPI

### Шаг 4: Обновить компонент Warehouse Dashboard

1. Откройте `/admin/components/roles/WarehouseDashboard.tsx`
2. Импортируйте хук: `import { useWarehouseData } from '../../hooks/useAdminData';`
3. Замените `orders` и `stockItems` на данные из хука
4. Обновите KPI

### Шаг 5: Обновить экраны заказов

1. Для каждого компонента заказов (OwnerOrders, FinanceOrders, WarehouseOrders, SupportOrders)
2. Импортируйте хук: `import { useRoleOrders } from '../../hooks/useAdminData';`
3. Используйте хук: `const { data: orders, loading, error } = useRoleOrders(currentRole);`
4. Замените hardcoded массив `orders` на данные из хука

---

## 🎨 Компоненты для состояний

### LoadingSpinner

```tsx
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="w-16 h-16 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

### ErrorMessage

```tsx
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-24 h-24 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">Ошибка загрузки</h2>
        <p className="text-[#666]">{message}</p>
      </div>
    </div>
  );
}
```

---

## 📋 Checklist интеграции

### Owner Dashboard
- [ ] Импортировать хук `useOwnerDashboardData`
- [ ] Добавить обработку loading/error
- [ ] Заменить все KPI на данные из хука
- [ ] Обновить графики на реальные данные
- [ ] Протестировать с разными периодами (7д, 30д, 90д)

### AdminOps Dashboard
- [ ] Импортировать хук `useAdminOpsData`
- [ ] Добавить обработку loading/error
- [ ] Заменить массив users на данные из хука
- [ ] Обновить KPI
- [ ] Протестировать фильтрацию и поиск

### Finance Dashboard
- [ ] Импортировать хук `useFinanceData`
- [ ] Добавить обработку loading/error
- [ ] Заменить payoutRequests и refundRequests
- [ ] Обновить KPI
- [ ] Протестировать approve/reject действия

### Warehouse Dashboard
- [ ] Импортировать хук `useWarehouseData`
- [ ] Добавить обработку loading/error
- [ ] Заменить orders и stockItems
- [ ] Обновить KPI
- [ ] Протестировать обновление статусов

### Marketing Dashboard
- [ ] Создать хук `useMarketingData` (аналогично другим)
- [ ] Интегрировать данные UTM и источников
- [ ] Обновить KPI
- [ ] Добавить графики по источникам

### Support Dashboard
- [ ] Создать хук `useSupportData`
- [ ] Интегрировать данные тикетов
- [ ] Обновить KPI
- [ ] Добавить фильтрацию по приоритету

### Экраны заказов
- [ ] OwnerOrders - интегрировать `useRoleOrders('SEO')`
- [ ] FinanceOrders - интегрировать `useRoleOrders('Finance')`
- [ ] WarehouseOrders - интегрировать `useRoleOrders('Warehouse')`
- [ ] SupportOrders - интегрировать `useRoleOrders('Support')`
- [ ] PartnerOrders - интегрировать `useRoleOrders('Partner')`

---

## 🔍 API методы

Используемые методы из `/utils/api.ts`:

- `fetchAllUsers()` - получить всех пользователей
- `fetchOrders()` - получить все заказы
- `fetchProducts()` - получить все товары
- `updateOrderStatus(orderId, status)` - обновить статус заказа
- `createPayout(userId, amount)` - создать выплату
- `processRefund(orderId, amount)` - обработать возврат

### Нужно добавить:

```typescript
// В /utils/api.ts

export async function fetchDashboardStats(period: string) {
  // Получить статистику за период
}

export async function fetchPayoutRequests() {
  // Получить запросы на выплаты
}

export async function fetchRefundRequests() {
  // Получить запросы на возврат
}

export async function fetchStockItems() {
  // Получить остатки товаров
}

export async function fetchSupportTickets() {
  // Получить тикеты поддержки
}
```

---

## ⚠️ Важные замечания

### 1. Кэширование
Данные могут кэшироваться на 1-5 минут для снижения нагрузки на Supabase:

```tsx
const { data, loading, error } = useOwnerDashboardData(period, {
  cacheTime: 5 * 60 * 1000, // 5 минут
  refetchOnWindowFocus: true
});
```

### 2. Оптимизация запросов
Избегайте множественных вызовов API. Используйте `Promise.all()`:

```typescript
const [users, orders, products] = await Promise.all([
  api.fetchAllUsers(),
  api.fetchOrders(),
  api.fetchProducts()
]);
```

### 3. Обработка ошибок
Всегда обрабатывайте ошибки и показывайте понятные сообщения:

```tsx
if (error) {
  return (
    <ErrorMessage 
      message="Не удалось загрузить данные. Попробуйте обновить страницу." 
    />
  );
}
```

### 4. Периоды времени
При фильтрации по периодам используйте ISO 8601 формат:

```typescript
const startDate = new Date();
startDate.setDate(startDate.getDate() - parseInt(period));
const isoDate = startDate.toISOString();
```

---

## 🚀 Приоритеты интеграции

### Фаза 1 (Критически важно)
1. ✅ Создать хуки для получения данных
2. ⏳ Owner Dashboard - основные KPI и графики
3. ⏳ AdminOps Dashboard - список пользователей
4. ⏳ Экраны заказов по ролям

### Фаза 2 (Важно)
5. ⏳ Finance Dashboard - выплаты и возвраты
6. ⏳ Warehouse Dashboard - склад и отправка
7. ⏳ OrderDetailsDrawer - детали заказа

### Фаза 3 (Желательно)
8. ⏳ Marketing Dashboard - UTM и источники
9. ⏳ Support Dashboard - тикеты
10. ⏳ Real-time обновления через Supabase Realtime

---

## 📞 Помощь и поддержка

### Если возникли проблемы:

1. **Проверьте консоль браузера** - там будут логи ошибок API
2. **Проверьте Supabase Dashboard** - есть ли данные в таблицах
3. **Проверьте RLS политики** - имеет ли пользователь доступ к данным
4. **Используйте режим отладки**: `console.log(data)` после получения данных

### Типичные ошибки:

| Ошибка | Причина | Решение |
|--------|---------|---------|
| "Failed to fetch" | Нет подключения к Supabase | Проверить URL и ключи |
| "Unauthorized" | Нет доступа к данным | Настроить RLS политики |
| "Data is undefined" | Неправильная структура ответа | Проверить формат данных |
| "Loading forever" | Зацикленный запрос | Добавить зависимости в useEffect |

---

## 🎓 Дополнительные ресурсы

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [React Hooks Guide](https://react.dev/reference/react)
- [API Documentation](/utils/api.ts)
- [Admin Panel README](/admin/README.md)

---

**Создано**: 6 января 2026  
**Автор**: H2 Platform Development Team  
**Статус**: 🚧 В работе

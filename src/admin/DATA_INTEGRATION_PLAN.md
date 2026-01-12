# 🔌 План интеграции H2 Admin с реальными данными

**Дата**: 6 января 2026  
**Приоритет**: 🔴 КРИТИЧЕСКИЙ  
**Срок**: 5-7 дней

---

## 📋 Обзор

Сейчас все дашборды H2 Admin используют моковые (hardcoded) данные. Необходимо подключить их к реальным данным из Supabase/KV Store, которые уже используются в партнёрском кабинете.

### Существующая структура данных в KV Store:

```
users_{userId}                    # Данные пользователя
orders_{orderId}                  # Данные заказа
products_{productId}              # Данные товара
withdrawals_{withdrawalId}        # Запросы на выплаты
achievements_{userId}             # Достижения пользователя
notifications_{userId}            # Уведомления
```

---

## 🎯 Цели интеграции

1. ✅ Заменить все моковые данные на реальные
2. ✅ Создать API endpoints для каждого дашборда
3. ✅ Реализовать фильтрацию по периодам
4. ✅ Добавить loading states и error handling
5. ✅ Оптимизировать производительность с кэшированием

---

## 📊 Этап 1: API Endpoints (День 1-2)

### 1.1 Owner Dashboard APIs

**Endpoint**: `GET /make-server-05aa3c8a/admin/dashboard/owner`  
**Query params**: `period` (today, 7, 30, 90, year)

**Данные для возврата**:
```typescript
{
  kpis: {
    revenue: { value: number, delta: number, trend: 'up' | 'down' },
    commissions: { value: number, delta: number, trend: 'up' | 'down' },
    obligations: { value: number, delta: number, trend: 'up' | 'down' },
    payouts: { value: number, delta: number, trend: 'up' | 'down' }
  },
  charts: {
    revenueCommissionsPayouts: Array<{ date: string, revenue: number, commissions: number, payouts: number }>,
    partnerActivity: Array<{ date: string, active: number, newRegistrations: number }>
  },
  topBranches: Array<{
    userId: string,
    name: string,
    avatar: string,
    revenue: number,
    partners: number
  }>,
  actionCenter: Array<{
    type: 'critical' | 'warning' | 'info',
    title: string,
    message: string,
    action?: { label: string, onClick: string }
  }>
}
```

**Логика расчёта**:
1. Получить все заказы за период: `orders_*`
2. Рассчитать выручку: сумма всех `order.total_price` где `status = 'paid'`
3. Рассчитать комиссии: сумма всех `order.commission_d1 + d2 + d3`
4. Получить выплаты: `withdrawals_*` где `status = 'completed'`
5. Рассчитать дельту: сравнить с предыдущим периодом

### 1.2 AdminOps Dashboard APIs

**Endpoint**: `GET /make-server-05aa3c8a/admin/dashboard/adminops`  
**Query params**: `period`, `search`, `status` (all, active, blocked)

**Данные для возврата**:
```typescript
{
  kpis: {
    totalPartners: { value: number, delta: number },
    newPartners: { value: number, delta: number },
    activePartners: { value: number, delta: number },
    blockedPartners: { value: number, delta: number }
  },
  partners: Array<{
    id: string,
    full_name: string,
    email: string,
    phone: string,
    rank: number,
    ref_code: string,
    created_at: string,
    status: 'active' | 'blocked',
    team_size: number
  }>
}
```

**Логика расчёта**:
1. Получить всех пользователей: `users_*`
2. Фильтровать по роли (только партнёры, не CEO)
3. Подсчитать активных: те, у кого есть заказы за период
4. Подсчитать новых: `created_at` в текущем периоде
5. Применить поиск и фильтры

### 1.3 Finance Dashboard APIs

**Endpoint**: `GET /make-server-05aa3c8a/admin/dashboard/finance`  
**Query params**: `period`

**Данные для возврата**:
```typescript
{
  kpis: {
    payoutsPending: { value: number, count: number },
    payoutsProcessing: { value: number, count: number },
    payoutsCompleted: { value: number, count: number },
    refunds: { value: number, count: number }
  },
  payoutRequests: Array<{
    id: string,
    user_id: string,
    user_name: string,
    amount: number,
    status: 'pending' | 'processing' | 'completed' | 'rejected',
    created_at: string,
    payment_method: string
  }>,
  refundRequests: Array<{
    id: string,
    order_id: string,
    user_id: string,
    user_name: string,
    amount: number,
    reason: string,
    status: 'requested' | 'approved' | 'completed',
    created_at: string
  }>,
  frozenCommissions: {
    amount: number,
    reason: string
  }
}
```

**Логика расчёта**:
1. Получить все выплаты: `withdrawals_*`
2. Группировать по статусам
3. Получить заказы с возвратами: `orders_*` где `status = 'refund_*'`
4. Рассчитать замороженные комиссии (за последние 30 дней)

### 1.4 Warehouse Dashboard APIs

**Endpoint**: `GET /make-server-05aa3c8a/admin/dashboard/warehouse`  
**Query params**: `period`, `status`

**Данные для возврата**:
```typescript
{
  kpis: {
    picking: { count: number, delta: number },
    packed: { count: number, delta: number },
    shipped: { count: number, delta: number },
    issues: { count: number, delta: number }
  },
  orders: Array<{
    id: string,
    order_number: string,
    user_name: string,
    items_count: number,
    status: 'picking' | 'packed' | 'shipped' | 'address_issue',
    shipping_address: string,
    created_at: string,
    tracking_number?: string
  }>,
  stockAlerts: Array<{
    product_id: string,
    product_name: string,
    current_stock: number,
    min_stock: number,
    status: 'critical' | 'warning'
  }>
}
```

**Логика расчёта**:
1. Получить заказы: `orders_*`
2. Фильтровать по статусам сборки
3. Подсчитать проблемные заказы
4. Получить остатки товаров: `products_*`
5. Определить низкие остатки

### 1.5 Marketing Dashboard APIs

**Endpoint**: `GET /make-server-05aa3c8a/admin/dashboard/marketing`  
**Query params**: `period`

**Данные для возврата**:
```typescript
{
  kpis: {
    sources: { count: number, delta: number },
    conversion: { value: number, delta: number },
    roi: { value: number, delta: number }
  },
  utmSources: Array<{
    source: string,
    medium: string,
    campaign: string,
    clicks: number,
    registrations: number,
    orders: number,
    revenue: number,
    conversion: number
  }>,
  promoCodes: Array<{
    code: string,
    discount: number,
    uses: number,
    max_uses: number,
    revenue: number,
    status: 'active' | 'expired'
  }>
}
```

**Логика расчёта**:
1. Получить пользователей с UTM метками
2. Связать с заказами
3. Рассчитать конверсию: заказы / регистрации
4. Рассчитать ROI (если есть данные о расходах)
5. Группировать по источникам

### 1.6 Support Dashboard APIs

**Endpoint**: `GET /make-server-05aa3c8a/admin/dashboard/support`  
**Query params**: `period`, `status`

**Данные для возврата**:
```typescript
{
  kpis: {
    openTickets: { count: number, delta: number },
    inProgress: { count: number, delta: number },
    closedTickets: { count: number, delta: number },
    sla: { value: number, delta: number } // % в пределах SLA
  },
  tickets: Array<{
    id: string,
    user_id: string,
    user_name: string,
    user_email: string,
    user_phone: string,
    subject: string,
    status: 'open' | 'in_progress' | 'closed',
    priority: 'low' | 'medium' | 'high',
    created_at: string,
    assigned_to?: string
  }>,
  refundRequests: Array<{
    id: string,
    order_id: string,
    user_name: string,
    reason: string,
    status: 'requested' | 'approved' | 'completed'
  }>
}
```

**Логика расчёта**:
1. Получить тикеты (нужно создать структуру `tickets_*`)
2. Группировать по статусам
3. Рассчитать SLA: % тикетов закрытых в течение 24ч
4. Получить запросы на возврат

### 1.7 Orders APIs (для всех ролей)

**Endpoint**: `GET /make-server-05aa3c8a/admin/orders`  
**Query params**: `role`, `period`, `status`, `search`, `userId` (для Partner)

**Данные для возврата**:
```typescript
{
  orders: Array<{
    id: string,
    order_number: string,
    user_id: string,
    user_name: string,
    
    // Общая информация
    created_at: string,
    status: OrderStatus,
    total_price: number,
    items_count: number,
    
    // Для Owner
    cost?: number,
    margin?: number,
    commission_d1?: number,
    commission_d2?: number,
    commission_d3?: number,
    
    // Для Warehouse
    shipping_address?: string,
    tracking_number?: string,
    
    // Для Finance
    payout_status?: string,
    payout_amount?: number,
    
    // Для Support
    customer_email?: string,
    customer_phone?: string,
    support_notes?: string
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    hasMore: boolean
  }
}
```

**Фильтрация по ролям**:
- **Owner**: все данные
- **Partner**: только свои заказы и заказы команды
- **Finance**: фокус на выплатах
- **Warehouse**: фокус на доставке
- **Support**: фокус на проблемах

---

## 🔧 Этап 2: Backend Implementation (День 2-3)

### 2.1 Создать файл `/supabase/functions/server/admin_api.tsx`

```typescript
import { Context } from 'npm:hono';
import * as kv from './kv_store';

// Типы
interface Period {
  start: Date;
  end: Date;
}

// Утилиты для периодов
export function getPeriodDates(period: string): Period {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return { start: today, end: now };
    case '7':
      return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
    case '30':
      return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
    case '90':
      return { start: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), end: now };
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    default:
      return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
  }
}

// Owner Dashboard
export async function getOwnerDashboard(c: Context) {
  const period = c.req.query('period') || '30';
  const { start, end } = getPeriodDates(period);
  
  // Получить все заказы
  const allOrders = await kv.getByPrefix('orders_');
  const ordersInPeriod = allOrders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= start && orderDate <= end && order.status === 'paid';
  });
  
  // Рассчитать KPI
  const revenue = ordersInPeriod.reduce((sum, order) => sum + order.total_price, 0);
  const commissions = ordersInPeriod.reduce((sum, order) => 
    sum + (order.commission_d1 || 0) + (order.commission_d2 || 0) + (order.commission_d3 || 0), 0
  );
  
  // Получить выплаты
  const allWithdrawals = await kv.getByPrefix('withdrawals_');
  const withdrawalsInPeriod = allWithdrawals.filter(w => {
    const wDate = new Date(w.created_at);
    return wDate >= start && wDate <= end && w.status === 'completed';
  });
  const payouts = withdrawalsInPeriod.reduce((sum, w) => sum + w.amount, 0);
  
  // Obligations = commissions - payouts
  const obligations = commissions - payouts;
  
  // Дельта (сравнение с предыдущим периодом)
  // TODO: Реализовать расчёт дельты
  
  // График Revenue vs Commissions vs Payouts
  const chartData = generateChartData(ordersInPeriod, withdrawalsInPeriod, start, end);
  
  // ТОП-5 веток
  const topBranches = await getTopBranches(ordersInPeriod);
  
  // Action Center
  const actionCenter = await getActionCenter();
  
  return c.json({
    kpis: {
      revenue: { value: revenue, delta: 0, trend: 'up' },
      commissions: { value: commissions, delta: 0, trend: 'up' },
      obligations: { value: obligations, delta: 0, trend: 'neutral' },
      payouts: { value: payouts, delta: 0, trend: 'up' }
    },
    charts: {
      revenueCommissionsPayouts: chartData.revenue,
      partnerActivity: chartData.activity
    },
    topBranches,
    actionCenter
  });
}

// AdminOps Dashboard
export async function getAdminOpsDashboard(c: Context) {
  const period = c.req.query('period') || '30';
  const search = c.req.query('search') || '';
  const statusFilter = c.req.query('status') || 'all';
  
  const { start, end } = getPeriodDates(period);
  
  // Получить всех пользователей
  const allUsers = await kv.getByPrefix('users_');
  const partners = allUsers.filter(u => u.role !== 'CEO'); // Только партнёры
  
  // Подсчитать новых
  const newPartners = partners.filter(p => {
    const created = new Date(p.created_at);
    return created >= start && created <= end;
  });
  
  // Подсчитать активных (с заказами за период)
  const allOrders = await kv.getByPrefix('orders_');
  const activeUserIds = new Set(
    allOrders.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate >= start && orderDate <= end;
    }).map(o => o.user_id)
  );
  const activePartners = partners.filter(p => activeUserIds.has(p.id));
  
  // Подсчитать заблокированных
  const blockedPartners = partners.filter(p => p.status === 'blocked');
  
  // Применить фильтры
  let filteredPartners = partners;
  if (statusFilter === 'active') {
    filteredPartners = activePartners;
  } else if (statusFilter === 'blocked') {
    filteredPartners = blockedPartners;
  }
  
  if (search) {
    filteredPartners = filteredPartners.filter(p => 
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.ref_code?.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Добавить размер команды
  const partnersWithTeam = await Promise.all(
    filteredPartners.map(async (p) => {
      const teamSize = await getTeamSize(p.id);
      return { ...p, team_size: teamSize };
    })
  );
  
  return c.json({
    kpis: {
      totalPartners: { value: partners.length, delta: 0 },
      newPartners: { value: newPartners.length, delta: 0 },
      activePartners: { value: activePartners.length, delta: 0 },
      blockedPartners: { value: blockedPartners.length, delta: 0 }
    },
    partners: partnersWithTeam
  });
}

// Finance Dashboard
export async function getFinanceDashboard(c: Context) {
  const period = c.req.query('period') || '30';
  const { start, end } = getPeriodDates(period);
  
  // Получить все выплаты
  const allWithdrawals = await kv.getByPrefix('withdrawals_');
  const withdrawalsInPeriod = allWithdrawals.filter(w => {
    const wDate = new Date(w.created_at);
    return wDate >= start && wDate <= end;
  });
  
  // Группировать по статусам
  const pending = withdrawalsInPeriod.filter(w => w.status === 'pending');
  const processing = withdrawalsInPeriod.filter(w => w.status === 'processing');
  const completed = withdrawalsInPeriod.filter(w => w.status === 'completed');
  
  // Возвраты
  const allOrders = await kv.getByPrefix('orders_');
  const refunds = allOrders.filter(o => 
    o.status.startsWith('refund') && 
    new Date(o.updated_at) >= start && 
    new Date(o.updated_at) <= end
  );
  
  // Получить детали пользователей для выплат
  const payoutRequestsWithUsers = await Promise.all(
    [...pending, ...processing].map(async (w) => {
      const user = await kv.get(`users_${w.user_id}`);
      return {
        ...w,
        user_name: user?.full_name || 'Неизвестно'
      };
    })
  );
  
  // Замороженные комиссии (за последние 30 дней)
  const recentOrders = allOrders.filter(o => {
    const orderDate = new Date(o.created_at);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return orderDate >= thirtyDaysAgo && o.status === 'paid';
  });
  const frozenAmount = recentOrders.reduce((sum, o) => 
    sum + (o.commission_d1 || 0) + (o.commission_d2 || 0) + (o.commission_d3 || 0), 0
  );
  
  return c.json({
    kpis: {
      payoutsPending: { 
        value: pending.reduce((s, w) => s + w.amount, 0),
        count: pending.length
      },
      payoutsProcessing: { 
        value: processing.reduce((s, w) => s + w.amount, 0),
        count: processing.length
      },
      payoutsCompleted: { 
        value: completed.reduce((s, w) => s + w.amount, 0),
        count: completed.length
      },
      refunds: { 
        value: refunds.reduce((s, o) => s + o.total_price, 0),
        count: refunds.length
      }
    },
    payoutRequests: payoutRequestsWithUsers,
    refundRequests: refunds.map(o => ({
      id: o.id,
      order_id: o.id,
      user_id: o.user_id,
      amount: o.total_price,
      reason: o.refund_reason || 'Не указано',
      status: o.status,
      created_at: o.updated_at
    })),
    frozenCommissions: {
      amount: frozenAmount,
      reason: 'Комиссии за последние 30 дней (период удержания)'
    }
  });
}

// Warehouse Dashboard
export async function getWarehouseDashboard(c: Context) {
  const period = c.req.query('period') || '30';
  const { start, end } = getPeriodDates(period);
  
  // Получить заказы
  const allOrders = await kv.getByPrefix('orders_');
  const ordersInPeriod = allOrders.filter(o => {
    const orderDate = new Date(o.created_at);
    return orderDate >= start && orderDate <= end;
  });
  
  // Группировать по статусам
  const picking = ordersInPeriod.filter(o => o.status === 'picking');
  const packed = ordersInPeriod.filter(o => o.status === 'packed');
  const shipped = ordersInPeriod.filter(o => o.status === 'shipped');
  const issues = ordersInPeriod.filter(o => o.status === 'address_issue');
  
  // Добавить информацию о пользователях
  const ordersWithUsers = await Promise.all(
    [...picking, ...packed, ...issues].map(async (o) => {
      const user = await kv.get(`users_${o.user_id}`);
      return {
        id: o.id,
        order_number: `#${o.id.substring(0, 8)}`,
        user_name: user?.full_name || 'Неизвестно',
        items_count: o.items?.length || 0,
        status: o.status,
        shipping_address: o.shipping_address || 'Не указан',
        created_at: o.created_at,
        tracking_number: o.tracking_number
      };
    })
  );
  
  // Получить остатки товаров
  const allProducts = await kv.getByPrefix('products_');
  const stockAlerts = allProducts
    .filter(p => p.stock <= p.min_stock)
    .map(p => ({
      product_id: p.id,
      product_name: p.name,
      current_stock: p.stock,
      min_stock: p.min_stock,
      status: p.stock === 0 ? 'critical' : 'warning'
    }));
  
  return c.json({
    kpis: {
      picking: { count: picking.length, delta: 0 },
      packed: { count: packed.length, delta: 0 },
      shipped: { count: shipped.length, delta: 0 },
      issues: { count: issues.length, delta: 0 }
    },
    orders: ordersWithUsers,
    stockAlerts
  });
}

// Marketing Dashboard
export async function getMarketingDashboard(c: Context) {
  const period = c.req.query('period') || '30';
  const { start, end } = getPeriodDates(period);
  
  // Получить пользователей с UTM метками
  const allUsers = await kv.getByPrefix('users_');
  const usersInPeriod = allUsers.filter(u => {
    const created = new Date(u.created_at);
    return created >= start && created <= end;
  });
  
  // Группировать по UTM источникам
  const utmGroups = new Map();
  usersInPeriod.forEach(u => {
    if (u.utm_source) {
      const key = `${u.utm_source}_${u.utm_medium}_${u.utm_campaign}`;
      if (!utmGroups.has(key)) {
        utmGroups.set(key, {
          source: u.utm_source,
          medium: u.utm_medium || 'direct',
          campaign: u.utm_campaign || 'none',
          registrations: 0,
          userIds: []
        });
      }
      const group = utmGroups.get(key);
      group.registrations++;
      group.userIds.push(u.id);
    }
  });
  
  // Добавить данные о заказах
  const allOrders = await kv.getByPrefix('orders_');
  const utmSources = Array.from(utmGroups.values()).map(group => {
    const ordersFromGroup = allOrders.filter(o => 
      group.userIds.includes(o.user_id) &&
      new Date(o.created_at) >= start &&
      new Date(o.created_at) <= end
    );
    
    const revenue = ordersFromGroup.reduce((s, o) => s + o.total_price, 0);
    const conversion = group.registrations > 0 
      ? (ordersFromGroup.length / group.registrations) * 100 
      : 0;
    
    return {
      ...group,
      clicks: group.registrations * 10, // Примерная оценка
      orders: ordersFromGroup.length,
      revenue,
      conversion: Math.round(conversion * 10) / 10
    };
  });
  
  // TODO: Промокоды (нужно создать структуру)
  const promoCodes = [];
  
  return c.json({
    kpis: {
      sources: { count: utmGroups.size, delta: 0 },
      conversion: { 
        value: utmSources.length > 0 
          ? utmSources.reduce((s, u) => s + u.conversion, 0) / utmSources.length 
          : 0,
        delta: 0
      },
      roi: { value: 0, delta: 0 } // TODO: Требует данные о расходах
    },
    utmSources,
    promoCodes
  });
}

// Support Dashboard
export async function getSupportDashboard(c: Context) {
  // TODO: Требует создания структуры тикетов
  
  const period = c.req.query('period') || '30';
  const { start, end } = getPeriodDates(period);
  
  // Пока используем проблемные заказы как "тикеты"
  const allOrders = await kv.getByPrefix('orders_');
  const problemOrders = allOrders.filter(o => 
    (o.status === 'address_issue' || o.status.startsWith('refund')) &&
    new Date(o.created_at) >= start &&
    new Date(o.created_at) <= end
  );
  
  const ordersWithUsers = await Promise.all(
    problemOrders.map(async (o) => {
      const user = await kv.get(`users_${o.user_id}`);
      return {
        id: o.id,
        user_id: o.user_id,
        user_name: user?.full_name || 'Неизвестно',
        user_email: user?.email || '',
        user_phone: user?.phone || '',
        subject: `Заказ ${o.id.substring(0, 8)} - ${o.status}`,
        status: o.status === 'address_issue' ? 'open' : 'in_progress',
        priority: 'medium',
        created_at: o.created_at
      };
    })
  );
  
  return c.json({
    kpis: {
      openTickets: { count: ordersWithUsers.filter(t => t.status === 'open').length, delta: 0 },
      inProgress: { count: ordersWithUsers.filter(t => t.status === 'in_progress').length, delta: 0 },
      closedTickets: { count: 0, delta: 0 },
      sla: { value: 85, delta: 0 }
    },
    tickets: ordersWithUsers,
    refundRequests: problemOrders
      .filter(o => o.status.startsWith('refund'))
      .map(o => ({
        id: o.id,
        order_id: o.id,
        user_name: 'Загрузка...',
        reason: o.refund_reason || 'Не указано',
        status: o.status
      }))
  });
}

// Orders для всех ролей
export async function getAdminOrders(c: Context) {
  const role = c.req.query('role') || 'SEO';
  const period = c.req.query('period') || '30';
  const statusFilter = c.req.query('status');
  const search = c.req.query('search');
  const userId = c.req.query('userId'); // Для Partner
  
  const { start, end } = getPeriodDates(period);
  
  // Получить заказы
  let allOrders = await kv.getByPrefix('orders_');
  
  // Фильтр по периоду
  allOrders = allOrders.filter(o => {
    const orderDate = new Date(o.created_at);
    return orderDate >= start && orderDate <= end;
  });
  
  // Фильтр по статусу
  if (statusFilter) {
    allOrders = allOrders.filter(o => o.status === statusFilter);
  }
  
  // Фильтр для Partner (только свои и команды)
  if (role === 'Partner' && userId) {
    const teamIds = await getTeamIds(userId);
    allOrders = allOrders.filter(o => 
      o.user_id === userId || teamIds.includes(o.user_id)
    );
  }
  
  // Добавить данные в зависимости от роли
  const ordersWithDetails = await Promise.all(
    allOrders.map(async (o) => {
      const user = await kv.get(`users_${o.user_id}`);
      
      const baseOrder = {
        id: o.id,
        order_number: `#${o.id.substring(0, 8)}`,
        user_id: o.user_id,
        user_name: user?.full_name || 'Неизвестно',
        created_at: o.created_at,
        status: o.status,
        total_price: o.total_price,
        items_count: o.items?.length || 0
      };
      
      // Данные для Owner
      if (role === 'SEO') {
        return {
          ...baseOrder,
          cost: o.cost || o.total_price * 0.3, // Примерная себестоимость
          margin: o.total_price - (o.cost || o.total_price * 0.3),
          commission_d1: o.commission_d1 || 0,
          commission_d2: o.commission_d2 || 0,
          commission_d3: o.commission_d3 || 0
        };
      }
      
      // Данные для Warehouse
      if (role === 'Warehouse') {
        return {
          ...baseOrder,
          shipping_address: o.shipping_address || 'Не указан',
          tracking_number: o.tracking_number
        };
      }
      
      // Данные для Finance
      if (role === 'Finance') {
        return {
          ...baseOrder,
          payout_status: 'pending',
          payout_amount: (o.commission_d1 || 0) + (o.commission_d2 || 0) + (o.commission_d3 || 0)
        };
      }
      
      // Данные для Support
      if (role === 'Support') {
        return {
          ...baseOrder,
          customer_email: user?.email || '',
          customer_phone: user?.phone || '',
          support_notes: o.support_notes || ''
        };
      }
      
      return baseOrder;
    })
  );
  
  // Поиск
  let filteredOrders = ordersWithDetails;
  if (search) {
    filteredOrders = filteredOrders.filter(o =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.user_name.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Пагинация
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const startIndex = (page - 1) * limit;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + limit);
  
  return c.json({
    orders: paginatedOrders,
    pagination: {
      page,
      limit,
      total: filteredOrders.length,
      hasMore: startIndex + limit < filteredOrders.length
    }
  });
}

// Вспомогательные функции
async function getTeamSize(userId: string): Promise<number> {
  const allUsers = await kv.getByPrefix('users_');
  let count = 0;
  
  function countDescendants(sponsorId: string) {
    allUsers.forEach(u => {
      if (u.sponsor_id === sponsorId) {
        count++;
        countDescendants(u.id);
      }
    });
  }
  
  countDescendants(userId);
  return count;
}

async function getTeamIds(userId: string): Promise<string[]> {
  const allUsers = await kv.getByPrefix('users_');
  const teamIds: string[] = [];
  
  function getDescendants(sponsorId: string) {
    allUsers.forEach(u => {
      if (u.sponsor_id === sponsorId) {
        teamIds.push(u.id);
        getDescendants(u.id);
      }
    });
  }
  
  getDescendants(userId);
  return teamIds;
}

async function getTopBranches(orders: any[]): Promise<any[]> {
  // Группировать заказы по пользователям
  const revenueByUser = new Map();
  
  orders.forEach(o => {
    if (!revenueByUser.has(o.user_id)) {
      revenueByUser.set(o.user_id, 0);
    }
    revenueByUser.set(o.user_id, revenueByUser.get(o.user_id) + o.total_price);
  });
  
  // Сортировать и взять топ-5
  const sortedUsers = Array.from(revenueByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Получить детали пользователей
  const topBranches = await Promise.all(
    sortedUsers.map(async ([userId, revenue]) => {
      const user = await kv.get(`users_${userId}`);
      const teamSize = await getTeamSize(userId);
      
      return {
        userId,
        name: user?.full_name || 'Неизвестно',
        avatar: user?.avatar_url || '',
        revenue,
        partners: teamSize
      };
    })
  );
  
  return topBranches;
}

async function getActionCenter(): Promise<any[]> {
  const actions = [];
  
  // Проверить низкие остатки товаров
  const products = await kv.getByPrefix('products_');
  const lowStock = products.filter(p => p.stock <= p.min_stock);
  
  if (lowStock.length > 0) {
    actions.push({
      type: 'critical',
      title: 'Низкие остатки товаров',
      message: `${lowStock.length} товаров требуют пополнения`
    });
  }
  
  // Проверить ожидающие выплаты
  const withdrawals = await kv.getByPrefix('withdrawals_');
  const pending = withdrawals.filter(w => w.status === 'pending');
  
  if (pending.length > 0) {
    actions.push({
      type: 'warning',
      title: 'Ожидающие выплаты',
      message: `${pending.length} запросов на выплату требуют одобрения`
    });
  }
  
  // Проверить проблемные заказы
  const orders = await kv.getByPrefix('orders_');
  const issues = orders.filter(o => o.status === 'address_issue' || o.status === 'payment_failed');
  
  if (issues.length > 0) {
    actions.push({
      type: 'warning',
      title: 'Проблемные заказы',
      message: `${issues.length} заказов требуют внимания`
    });
  }
  
  return actions;
}

function generateChartData(orders: any[], withdrawals: any[], start: Date, end: Date): any {
  // Группировать данные по дням
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const chartData = [];
  
  for (let i = 0; i <= days; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    // Заказы за день
    const ordersForDay = orders.filter(o => 
      o.created_at.startsWith(dateStr)
    );
    
    const revenue = ordersForDay.reduce((s, o) => s + o.total_price, 0);
    const commissions = ordersForDay.reduce((s, o) => 
      s + (o.commission_d1 || 0) + (o.commission_d2 || 0) + (o.commission_d3 || 0), 0
    );
    
    // Выплаты за день
    const withdrawalsForDay = withdrawals.filter(w => 
      w.created_at.startsWith(dateStr) && w.status === 'completed'
    );
    const payouts = withdrawalsForDay.reduce((s, w) => s + w.amount, 0);
    
    chartData.push({
      date: dateStr,
      revenue,
      commissions,
      payouts
    });
  }
  
  // График активности партнёров
  const activityData = [];
  // TODO: Реализовать подсчёт активных партнёров по дням
  
  return {
    revenue: chartData,
    activity: activityData
  };
}
```

### 2.2 Добавить роуты в `/supabase/functions/server/index.tsx`

```typescript
import { getOwnerDashboard, getAdminOpsDashboard, getFinanceDashboard, 
         getWarehouseDashboard, getMarketingDashboard, getSupportDashboard,
         getAdminOrders } from './admin_api';

// Добавить роуты
app.get('/make-server-05aa3c8a/admin/dashboard/owner', getOwnerDashboard);
app.get('/make-server-05aa3c8a/admin/dashboard/adminops', getAdminOpsDashboard);
app.get('/make-server-05aa3c8a/admin/dashboard/finance', getFinanceDashboard);
app.get('/make-server-05aa3c8a/admin/dashboard/warehouse', getWarehouseDashboard);
app.get('/make-server-05aa3c8a/admin/dashboard/marketing', getMarketingDashboard);
app.get('/make-server-05aa3c8a/admin/dashboard/support', getSupportDashboard);
app.get('/make-server-05aa3c8a/admin/orders', getAdminOrders);
```

---

## 🎨 Этап 3: Frontend Hooks (День 3-4)

### 3.1 Создать `/admin/hooks/useAdminDashboard.ts`

```typescript
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function useAdminDashboard(role: string, period: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const roleMap: Record<string, string> = {
          'SEO': 'owner',
          'AdminOps': 'adminops',
          'Finance': 'finance',
          'Warehouse': 'warehouse',
          'Marketing': 'marketing',
          'Support': 'support'
        };

        const endpoint = roleMap[role] || 'owner';
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/dashboard/${endpoint}?period=${period}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (e) {
        console.error('Error fetching admin dashboard:', e);
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [role, period]);

  return { data, loading, error };
}
```

### 3.2 Создать `/admin/hooks/useAdminOrders.ts`

```typescript
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface UseAdminOrdersParams {
  role: string;
  period: string;
  status?: string;
  search?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export function useAdminOrders(params: UseAdminOrdersParams) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams({
          role: params.role,
          period: params.period,
          page: String(params.page || 1),
          limit: String(params.limit || 20)
        });

        if (params.status) queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);
        if (params.userId) queryParams.append('userId', params.userId);

        const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/orders?${queryParams}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (e) {
        console.error('Error fetching admin orders:', e);
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [params.role, params.period, params.status, params.search, params.userId, params.page, params.limit]);

  return { data, loading, error };
}
```

---

## 🔄 Этап 4: Обновление компонентов (День 4-5)

### 4.1 Обновить дашборды

Заменить моковые данные на:

```typescript
// Пример: OwnerDashboard.tsx
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

export function OwnerDashboard({ period = '30' }) {
  const { data, loading, error } = useAdminDashboard('SEO', period);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div>Ошибка: {error.message}</div>;
  }

  // Использовать данные из data
  const { kpis, charts, topBranches, actionCenter } = data;
  
  // Рендерить компоненты с реальными данными...
}
```

### 4.2 Добавить loading states

```typescript
// Скелетон для KPI карточек
function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#E6E9EE] p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-16"></div>
    </div>
  );
}
```

### 4.3 Добавить error handling

```typescript
// Компонент ошибки
function ErrorAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-red-600" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">Ошибка загрузки данных</h3>
          <p className="text-sm text-red-700 mt-1">{message}</p>
        </div>
        <Button onClick={onRetry} variant="outline">
          Повторить
        </Button>
      </div>
    </div>
  );
}
```

---

## ⚡ Этап 5: Оптимизация (День 5-6)

### 5.1 Кэширование

Добавить простое кэширование в memory:

```typescript
// /admin/utils/cache.ts
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

export function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache() {
  cache.clear();
}
```

### 5.2 Auto-refresh

```typescript
// Обновлять данные каждые 30 секунд
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

### 5.3 Индикатор последнего обновления

```typescript
const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

// После загрузки данных
setLastUpdate(new Date());

// В UI
<div className="text-xs text-[#999]">
  Обновлено {formatDistanceToNow(lastUpdate, { locale: ru, addSuffix: true })}
</div>
```

---

## 📝 Чеклист выполнения

### Backend
- [ ] Создать `/supabase/functions/server/admin_api.tsx`
- [ ] Реализовать `getOwnerDashboard`
- [ ] Реализовать `getAdminOpsDashboard`
- [ ] Реализовать `getFinanceDashboard`
- [ ] Реализовать `getWarehouseDashboard`
- [ ] Реализовать `getMarketingDashboard`
- [ ] Реализовать `getSupportDashboard`
- [ ] Реализовать `getAdminOrders`
- [ ] Добавить роуты в `index.tsx`
- [ ] Протестировать все endpoints

### Frontend Hooks
- [ ] Создать `/admin/hooks/useAdminDashboard.ts`
- [ ] Создать `/admin/hooks/useAdminOrders.ts`
- [ ] Добавить типы для всех данных
- [ ] Протестировать хуки

### Компоненты
- [ ] Обновить `OwnerDashboard.tsx`
- [ ] Обновить `AdminOpsDashboard.tsx`
- [ ] Обновить `FinanceDashboard.tsx`
- [ ] Обновить `WarehouseDashboard.tsx`
- [ ] Обновить `MarketingDashboard.tsx`
- [ ] Обновить `SupportDashboard.tsx`
- [ ] Обновить все экраны заказов
- [ ] Добавить loading states
- [ ] Добавить error handling

### Оптимизация
- [ ] Добавить кэширование
- [ ] Добавить auto-refresh
- [ ] Добавить индикатор последнего обновления
- [ ] Оптимизировать запросы

### Тестирование
- [ ] Протестировать все дашборды
- [ ] Протестировать фильтры и поиск
- [ ] Протестировать переключение периодов
- [ ] Проверить производительность
- [ ] Проверить ошибки и edge cases

---

## 🎯 Ожидаемый результат

После завершения интеграции:
- ✅ Все дашборды показывают реальные данные
- ✅ Фильтрация по периодам работает корректно
- ✅ Loading states показываются при загрузке
- ✅ Ошибки обрабатываются корректно
- ✅ Данные обновляются автоматически
- ✅ Система работает быстро и стабильно

---

## 📞 Следующие шаги

После завершения интеграции с данными переходим к:
1. **Фаза 2**: Детальный просмотр заказов и экспорт
2. **Фаза 3**: Глобальный поиск
3. **Фаза 4**: Audit Log
4. **Фаза 5**: Массовые операции

---

**Создано**: 6 января 2026  
**Приоритет**: 🔴 КРИТИЧЕСКИЙ  
**Срок**: 5-7 дней

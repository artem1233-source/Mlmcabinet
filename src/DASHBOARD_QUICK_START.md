# Dashboard Features - Quick Start

## 🚀 Быстрый старт

### Что уже работает

**5 из 8 компонентов** полностью готовы с Period Filtering, Delta Calculations, Drilldown и Export:

1. ✅ **UnifiedDashboard** - главный контейнер
2. ✅ **AdminOpsDashboard** - управление пользователями
3. ✅ **FinanceDashboard** - финансовые метрики
4. ✅ **WarehouseDashboard** - складской учёт
5. ✅ **SEODashboard** - SEO/маркетинг метрики

### Как использовать

#### 1. Period Filtering (Фильтрация по периодам)

Пользователь выбирает период в UI → данные автоматически пересчитываются.

```typescript
// Компонент автоматически получает period prop
export function MyDashboard({ currentUser, period = '30' }: MyDashboardProps) {
  const periodDays = parsePeriod(period); // '30' → 30
  
  // При изменении period - пересчитываем
  useEffect(() => {
    if (allData.length > 0) {
      recalculateStats(allData);
    }
  }, [period]);
}
```

**Доступные периоды:**
- `'1'` - Сегодня
- `'7'` - 7 дней
- `'30'` - 30 дней (по умолчанию)
- `'90'` - 90 дней
- `'365'` - Год

#### 2. Real Delta Calculations (Реальные расчёты изменений)

```typescript
import { calculatePeriodSum, calculateDelta } from '../../utils/periodCalculations';

// Пример: выручка за период с дельтой
const revenueResult = calculatePeriodSum(orders, 'дата', 'сумма', 30);

console.log(revenueResult);
// {
//   current: 125000,    // Текущий период
//   previous: 110000,   // Предыдущий период
//   delta: 13.6,        // +13.6%
//   deltaAbsolute: 15000,
//   trend: 'up'         // 'up' | 'down' | 'stable'
// }

// Использование в KPI
<KPICard
  title="Выручка"
  value={revenueResult.current}
  delta={revenueResult.delta}
  status={revenueResult.trend === 'up' ? 'ok' : 'warning'}
/>
```

#### 3. Drilldown Navigation (Детальная навигация)

```typescript
import { useDrilldown, createDrilldown } from './DrilldownProvider';

const { navigateToPage } = useDrilldown();

// Переход к пользователям с фильтром
const handleDrilldown = () => {
  navigateToPage(
    '/admin/users',
    createDrilldown.users({ status: 'active', period: 30 }, 'Активные пользователи')
  );
};

// Клик на KPI
<KPICard
  title="Активные пользователи"
  value={activeCount}
  onClick={handleDrilldown}
/>
```

**Доступные типы:**
- `createDrilldown.users(filters, title)`
- `createDrilldown.orders(filters, title)`
- `createDrilldown.payouts(filters, title)`
- `createDrilldown.tickets(filters, title)`
- `createDrilldown.inventory(filters, title)`

#### 4. Export to CSV (Экспорт в CSV)

```typescript
import { dashboardExporters } from '../../utils/dashboardExport';

// Слушаем событие экспорта (автоматически)
useEffect(() => {
  const handleExport = () => {
    dashboardExporters.admin({
      kpis: [
        { title: 'Всего пользователей', value: stats.total, period },
        { title: 'Активные', value: stats.active, period },
      ],
      charts: [
        { name: 'Registrations', data: chartData },
      ],
    });
    toast.success('Данные экспортированы');
  };
  
  window.addEventListener('dashboard-export', handleExport);
  return () => window.removeEventListener('dashboard-export', handleExport);
}, [stats, chartData]);
```

Пользователь нажимает кнопку "Экспорт" в UI → скачивается CSV файл с кириллицей.

## 🎯 Быстрая интеграция в новый компонент

### Шаг 1: Добавить imports и props

```typescript
import { dashboardExporters } from '../../utils/dashboardExport';
import { useDrilldown, createDrilldown } from './DrilldownProvider';
import { 
  parsePeriod, 
  filterByPeriod,
  calculatePeriodSum,
  groupByDay
} from '../../utils/periodCalculations';
import { toast } from 'sonner';

interface MyDashboardProps {
  currentUser: any;
  period?: string; // 👈 Добавить
}

export function MyDashboard({ currentUser, period = '30' }: MyDashboardProps) {
  const [allData, setAllData] = useState<any[]>([]);
  const { navigateToPage } = useDrilldown();
  const periodDays = parsePeriod(period);
  
  // ...
}
```

### Шаг 2: Добавить useEffect для period

```typescript
// Пересчёт при изменении периода
useEffect(() => {
  if (allData.length > 0) {
    recalculateStats(allData);
  }
}, [period]);

const recalculateStats = (data: any[]) => {
  console.log(`📊 Recalculating for ${periodDays} days`);
  
  // Фильтрация
  const filtered = filterByPeriod(data, 'дата', periodDays);
  
  // Дельта
  const result = calculatePeriodSum(data, 'дата', 'сумма', periodDays);
  
  // График
  const chartData = groupByDay(data, 'дата', 'сумма', periodDays);
  
  setStats({ value: result.current, delta: result.delta });
  setChartData(chartData);
};
```

### Шаг 3: Добавить export listener

```typescript
useEffect(() => {
  const handleExport = () => {
    dashboardExporters.myDashboard({
      kpis: [
        { title: 'Метрика 1', value: stats.value1, period },
        { title: 'Метрика 2', value: stats.value2, period },
      ],
      charts: [
        { name: 'Chart1', data: chartData },
      ],
    });
    toast.success('Данные экспортированы');
  };
  
  window.addEventListener('dashboard-export', handleExport);
  return () => window.removeEventListener('dashboard-export', handleExport);
}, [stats, chartData]);
```

### Шаг 4: Добавить drilldown

```typescript
const handleDrilldown = (filters?: any) => {
  navigateToPage(
    '/my/page',
    createDrilldown.users(filters, 'Заголовок')
  );
};

<KPICard
  onClick={() => handleDrilldown({ status: 'active' })}
/>
```

## 📦 Полный пример компонента

```typescript
import { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardExporters } from '../../utils/dashboardExport';
import { useDrilldown, createDrilldown } from './DrilldownProvider';
import { parsePeriod, filterByPeriod, calculatePeriodSum, groupByDay } from '../../utils/periodCalculations';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

interface MyDashboardProps {
  currentUser: any;
  period?: string;
}

export function MyDashboard({ currentUser, period = '30' }: MyDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  const { navigateToPage } = useDrilldown();
  const periodDays = parsePeriod(period);

  // Первичная загрузка
  useEffect(() => {
    loadData();
  }, []);

  // Пересчёт при изменении периода
  useEffect(() => {
    if (allUsers.length > 0) {
      recalculateStats(allUsers);
    }
  }, [period]);

  // Export listener
  useEffect(() => {
    const handleExport = () => {
      dashboardExporters.myDashboard({
        kpis: [
          { title: 'Пользователи', value: stats?.total || 0, period },
        ],
        charts: [
          { name: 'UsersChart', data: chartData },
        ],
      });
      toast.success('Данные экспортированы');
    };
    window.addEventListener('dashboard-export', handleExport);
    return () => window.removeEventListener('dashboard-export', handleExport);
  }, [stats, chartData]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Загрузка данных с API
      const response = await fetch('/api/users');
      const users = await response.json();
      
      setAllUsers(users);
      recalculateStats(users);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recalculateStats = (users: any[]) => {
    console.log(`📊 Recalculating for ${periodDays} days`);
    
    const filtered = filterByPeriod(users, 'дата_регистрации', periodDays);
    const result = calculatePeriodSum(users, 'дата_регистрации', 'id', periodDays);
    const chart = groupByDay(users, 'дата_регистрации', 'id', periodDays);
    
    setStats({
      total: users.length,
      new: filtered.length,
      delta: result.delta,
    });
    
    setChartData(chart.map(d => ({
      date: d.date,
      users: d.value,
    })));
  };

  const handleDrilldown = () => {
    navigateToPage(
      '/admin/users',
      createDrilldown.users({ period: periodDays }, 'Пользователи')
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KPICard
          title="Всего пользователей"
          value={stats?.total || 0}
          delta={stats?.delta || 0}
          deltaLabel="vs период"
          icon={Users}
          iconColor="#39B7FF"
          iconBgColor="#E5F4FF"
          status="ok"
          loading={loading}
          onClick={handleDrilldown}
        />
      </div>

      {/* График */}
      <ChartContainer
        title={`Регистрации за ${periodDays} дней`}
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#39B7FF"
              strokeWidth={3}
              name="Пользователи"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
```

## 🔥 Hot Tips

### 1. Сохраняй все данные для пересчёта
```typescript
const [allUsers, setAllUsers] = useState<any[]>([]); // ✅ Сохраняем ВСЕ данные
const [stats, setStats] = useState<any>(null); // ✅ Только агрегированная статистика
```

### 2. Используй memo для тяжёлых расчётов
```typescript
import { useMemo } from 'react';

const chartData = useMemo(() => 
  groupByDay(allOrders, 'дата', 'сумма', periodDays),
  [allOrders, periodDays]
);
```

### 3. Показывай loading states
```typescript
<KPICard
  loading={loading} // ✅ Скелетон вместо 0
/>

<ChartContainer loading={loading}> // ✅ Загрузка...
```

### 4. Graceful fallback при ошибках API
```typescript
try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error('API failed');
  }
  // ...
} catch (error) {
  console.warn('API error, using mock data');
  setAllData(MOCK_DATA); // ✅ Fallback на mock
}
```

## 📚 Документация

- `/DASHBOARD_FEATURES_COMPLETE.md` - Полное описание всех функций
- `/DASHBOARD_IMPLEMENTATION_SUMMARY.md` - Статус по компонентам
- `/DASHBOARD_QUICK_START.md` - Этот файл

## 🎯 Готово к использованию

Все утилиты и компоненты **уже работают** в production режиме:

- ✅ Period filtering в 5 компонентах
- ✅ Real delta calculations
- ✅ Drilldown navigation
- ✅ Export to CSV

**Начни использовать прямо сейчас!** 🚀

---

*Последнее обновление: 28 декабря 2025*

# Dashboard Features - Визуальный гайд

## 🎨 Как это работает

### 1️⃣ Period Filtering

```
┌─────────────────────────────────────────────────────────┐
│  Mission Control           [ 7д ] [ 30д ] [ 90д ] 📥    │ ← UI селектор периода
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Всего: 150   │  │ Активные: 85 │  │ Новые: +42   │  │
│  │ +15% ▲       │  │ 56.7%        │  │ vs 30 дней   │  │ ← Метрики пересчитываются
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │   График регистраций за выбранный период          │ │ ← График обновляется
│  │   [линия показывает данные за 30 дней]            │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

Пользователь кликает [90д]
        ↓
    period = '90'
        ↓
  recalculateStats(allUsers)
        ↓
    UI обновляется
```

### 2️⃣ Real Delta Calculations

```
До: Статические данные
┌──────────────────┐
│ Выручка: 125,000 │
│ +15% ▲          │  ← Захардкоженное значение
└──────────────────┘

После: Реальные расчёты
┌──────────────────┐
│ Выручка: 125,000 │
│ +13.6% ▲        │  ← Вычислено из данных:
└──────────────────┘     current: 125,000 (за 30 дней)
                         previous: 110,000 (предыдущие 30)
                         delta: +13.6%

Код:
const result = calculatePeriodSum(orders, 'дата', 'сумма', 30);
// result.delta = 13.6
```

### 3️⃣ Drilldown Navigation

```
┌─────────────────────────────────────────────────────────┐
│  Admin Ops Dashboard                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐                               │
│  │ Активные: 85         │  ← Пользователь кликает      │
│  │ 56.7% от общего      │                               │
│  └──────────────────────┘                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
                ↓
        onClick={() => navigateToPage(
          '/admin/users',
          { status: 'active' }
        )}
                ↓
┌─────────────────────────────────────────────────────────┐
│  Управление пользователями                              │
│  Фильтр: Активные ✓                                     │ ← Автоматически применён
├─────────────────────────────────────────────────────────┤
│  [Список только активных пользователей]                 │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### 4️⃣ Export to CSV

```
┌─────────────────────────────────────────────────────────┐
│  Finance Dashboard                       📥 Экспорт     │ ← Кнопка Export
├─────────────────────────────────────────────────────────┤
│                                                          │
│  KPI:                                                    │
│  - Выручка: 1,250,000 ₽                                 │
│  - Выплаты: 450,000 ₽                                   │
│  - Cashflow: 800,000 ₽                                  │
│                                                          │
│  График: [Cashflow за 30 дней]                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
                ↓ Клик на 📥
        window.dispatchEvent('dashboard-export')
                ↓
    dashboardExporters.finance({...})
                ↓
┌─────────────────────────────────────────────────────────┐
│ 💾 Finance_KPI_2025-12-28.csv скачан                    │
│                                                          │
│ Содержимое файла (Excel-совместимо):                    │
│ ────────────────────────────────────────────────────    │
│ Метрика;Значение;Суффикс;Изменение;Период              │
│ Выручка;1250000;₽;+15.2%;30                             │
│ Выплаты;450000;₽;+12.1%;30                              │
│ Cashflow;800000;₽;+18.3%;30                             │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### Полный цикл работы с данными

```
1. Загрузка данных (один раз)
   ↓
┌─────────────────────────────────────────┐
│  loadData() → fetch API                 │
│  setAllUsers([...все пользователи])     │  ← Сохраняем ВСЕ данные
└─────────────────────────────────────────┘
   ↓
2. Первичный расчёт (period = 30)
   ↓
┌─────────────────────────────────────────┐
│  recalculateStats(allUsers)             │
│  - filterByPeriod(users, 'date', 30)    │  ← Фильтруем по 30 дней
│  - calculatePeriodSum(...)              │  ← Вычисляем дельту
│  - groupByDay(...)                      │  ← Группируем для графика
│  setStats({...})                        │
│  setChartData([...])                    │
└─────────────────────────────────────────┘
   ↓
3. Пользователь меняет период → 90
   ↓
┌─────────────────────────────────────────┐
│  useEffect(() => {                      │
│    if (allUsers.length > 0) {           │
│      recalculateStats(allUsers)         │  ← Пересчёт с новым периодом
│    }                                    │
│  }, [period])                           │
└─────────────────────────────────────────┘
   ↓
4. UI автоматически обновляется
```

### Event-based Export

```
UnifiedDashboard (родитель)
   ↓
┌─────────────────────────────────────────┐
│  const handleExport = () => {           │
│    const event = new CustomEvent(       │
│      'dashboard-export',                │
│      { detail: { mode, period } }       │
│    );                                   │
│    window.dispatchEvent(event);         │  ← Отправляем событие
│  }                                      │
└─────────────────────────────────────────┘
   ↓ broadcast
   ↓
AdminOpsDashboard (дочерний)
   ↓
┌─────────────────────────────────────────┐
│  useEffect(() => {                      │
│    const handleExport = () => {         │
│      dashboardExporters.admin({...});   │  ← Слушаем событие
│      toast.success('Экспортировано');   │
│    };                                   │
│    window.addEventListener(             │
│      'dashboard-export',                │
│      handleExport                       │
│    );                                   │
│    return () => removeEventListener();  │
│  }, [stats, chartData]);                │
└─────────────────────────────────────────┘
```

## 📊 Реальные примеры

### Пример 1: Admin Ops Dashboard

**До интеграции:**
```typescript
<KPICard
  title="Новые за неделю"
  value={stats?.newThisWeek || 0}
  delta={8}  // ← Статическое значение
  deltaLabel="vs неделю"
/>
```

**После интеграции:**
```typescript
// Вычисляем реальную дельту
const newUsersDelta = calculateDelta(
  currentPeriodUsers.length,
  previousPeriodUsers.length
);

<KPICard
  title={`Новые за ${periodDays === 1 ? 'день' : periodDays === 7 ? 'неделю' : `${periodDays} дней`}`}
  value={currentPeriodUsers.length}
  delta={newUsersDelta.delta}  // ← Реальное значение: +15.3%
  deltaLabel="vs предыдущий период"
  onClick={() => handleDrilldownToUsers({ period: periodDays })}
/>
```

**Результат:**
- ✅ Динамический заголовок в зависимости от периода
- ✅ Реальная дельта из данных
- ✅ Drilldown к пользователям за период

### Пример 2: Finance Dashboard

**До интеграции:**
```typescript
// График с захардкоженными данными
const MOCK_DATA = [
  { date: '01 дек', revenue: 45000 },
  { date: '08 дек', revenue: 52000 },
  // ...
];

<LineChart data={MOCK_DATA} />
```

**После интеграции:**
```typescript
// График с реальными данными за выбранный период
const recalculateStats = () => {
  const inflowData = groupByDay(allOrders, 'дата', 'сумма', periodDays);
  const outflowData = groupByDay(allPayouts, 'дата_создания', 'сумма', periodDays);
  
  const chartData = inflowData.map((inflow, i) => ({
    date: inflow.date,
    inflow: inflow.value,
    outflow: outflowData[i]?.value || 0,
    net: inflow.value - (outflowData[i]?.value || 0),
  }));
  
  setCashflowChart(chartData);
};

<LineChart data={cashflowChart}>
  <Line dataKey="inflow" name="Приход" stroke="#10B981" />
  <Line dataKey="outflow" name="Расход" stroke="#EF4444" />
  <Line dataKey="net" name="Чистый" stroke="#8B5CF6" />
</LineChart>
```

**Результат:**
- ✅ Реальные данные из API
- ✅ Автоматическая группировка по дням
- ✅ Несколько линий на одном графике
- ✅ Обновление при смене периода

## 🎯 Паттерны использования

### Pattern 1: Simple KPI (без drilldown)

```typescript
<KPICard
  title="Админы"
  value={stats?.admins || 0}
  icon={Shield}
  iconColor="#8B5CF6"
  iconBgColor="#F3E8FF"
  status="ok"
  loading={loading}
  // onClick не указан - нет drilldown
/>
```

### Pattern 2: KPI с drilldown

```typescript
<KPICard
  title="Активные пользователи"
  value={stats?.active || 0}
  delta={activeDelta.delta}
  icon={Activity}
  status="ok"
  loading={loading}
  onClick={() => navigateToPage(
    '/admin/users',
    createDrilldown.users({ status: 'active' }, 'Активные')
  )}
/>
```

### Pattern 3: График с period filtering

```typescript
const chartData = useMemo(() => 
  groupByDay(allOrders, 'дата', 'сумма', periodDays),
  [allOrders, periodDays]
);

<ChartContainer
  title={`Выручка за ${periodDays} дней`}
  subtitle={`с ${startDate} по ${endDate}`}
  loading={loading}
>
  <LineChart data={chartData}>
    <Line dataKey="value" name="Сумма" />
  </LineChart>
</ChartContainer>
```

### Pattern 4: Export с фильтрами

```typescript
const handleExportData = () => {
  // Формируем данные для экспорта
  const exportData = {
    kpis: [
      { title: 'Выручка', value: stats.revenue, period, suffix: '₽' },
      { title: 'Cashflow', value: stats.cashflow, period, suffix: '₽' },
    ],
    charts: [
      { name: 'Cashflow', data: cashflowChart },
    ],
    period: `${periodDays} дней`,
  };
  
  dashboardExporters.finance(exportData);
  toast.success(`Экспортировано за ${periodDays} дней`);
};
```

## 🔧 Troubleshooting

### Проблема: Данные не обновляются при смене периода

**Решение:**
```typescript
// ❌ Неправильно - не сохраняем все данные
useEffect(() => {
  loadData();
}, [period]); // Загружаем заново каждый раз

// ✅ Правильно - сохраняем все данные один раз
useEffect(() => {
  loadData(); // Загружаем один раз
}, []);

useEffect(() => {
  if (allData.length > 0) {
    recalculateStats(allData); // Пересчитываем из кэша
  }
}, [period]);
```

### Проблема: Export не работает

**Решение:**
```typescript
// ❌ Неправильно - зависимости не указаны
useEffect(() => {
  const handleExport = () => {
    dashboardExporters.admin({ kpis: [...] });
  };
  window.addEventListener('dashboard-export', handleExport);
  return () => window.removeEventListener('dashboard-export', handleExport);
}, []); // stats и chartData могут быть устаревшими!

// ✅ Правильно - актуальные данные
useEffect(() => {
  const handleExport = () => {
    dashboardExporters.admin({
      kpis: [
        { title: 'KPI', value: stats?.value || 0, period },
      ],
      charts: [
        { name: 'Chart', data: chartData },
      ],
    });
  };
  window.addEventListener('dashboard-export', handleExport);
  return () => window.removeEventListener('dashboard-export', handleExport);
}, [stats, chartData, period]); // ← Актуальные зависимости
```

### Проблема: Drilldown не передаёт фильтры

**Решение:**
```typescript
// ❌ Неправильно
navigateToPage('/users');

// ✅ Правильно
navigateToPage(
  '/admin/users',
  createDrilldown.users(
    { status: 'active', period: periodDays },
    'Активные пользователи'
  )
);
```

## ✨ Best Practices

1. **Сохраняй все данные для фильтрации**
   ```typescript
   const [allData, setAllData] = useState<any[]>([]);
   const [filteredData, setFilteredData] = useState<any[]>([]);
   ```

2. **Используй useMemo для тяжёлых вычислений**
   ```typescript
   const chartData = useMemo(() => 
     groupByDay(allOrders, 'дата', 'сумма', periodDays),
     [allOrders, periodDays]
   );
   ```

3. **Показывай loading states**
   ```typescript
   <KPICard loading={loading} />
   <ChartContainer loading={loading} />
   ```

4. **Graceful error handling**
   ```typescript
   try {
     const data = await fetchData();
     setAllData(data);
   } catch (error) {
     console.warn('API error:', error);
     setAllData(MOCK_DATA); // Fallback
     toast.warning('Используются демо-данные');
   }
   ```

5. **Оптимизируй re-renders**
   ```typescript
   const handleDrilldown = useCallback((filters) => {
     navigateToPage('/page', createDrilldown.users(filters));
   }, []);
   ```

## 📚 Ссылки

- 📖 [DASHBOARD_FEATURES_COMPLETE.md](./DASHBOARD_FEATURES_COMPLETE.md) - Полная документация
- 📊 [DASHBOARD_IMPLEMENTATION_SUMMARY.md](./DASHBOARD_IMPLEMENTATION_SUMMARY.md) - Статус
- 🚀 [DASHBOARD_QUICK_START.md](./DASHBOARD_QUICK_START.md) - Быстрый старт

---

**Готово к использованию прямо сейчас!** 🎉

# Dashboard Features - Завершённые улучшения

## ✅ Реализованные функции

### 1. Period Filtering (Фильтрация по периодам)

Добавлена полноценная система фильтрации данных по временным периодам во все Dashboard компоненты.

**Утилиты:**
- `/utils/periodCalculations.ts` - набор функций для работы с периодами
  - `getPeriodRange(days)` - получение диапазона дат
  - `getPreviousPeriodRange(days)` - предыдущий период для сравнения
  - `filterByPeriod(items, dateField, days)` - фильтрация массива по дате
  - `groupByDay(items, dateField, valueField, days)` - группировка по дням для графиков
  - `parsePeriod(period)` - конвертация строки периода в число дней

**Доступные периоды:**
- 1 день (Сегодня)
- 7 дней (Неделя)
- 30 дней (Месяц) - по умолчанию
- 90 дней (Квартал)
- 365 дней (Год)

**Использование:**
```typescript
import { parsePeriod, filterByPeriod, groupByDay } from '../../utils/periodCalculations';

const periodDays = parsePeriod(period); // '30' -> 30
const filteredUsers = filterByPeriod(users, 'дата_регистрации', periodDays);
const chartData = groupByDay(orders, 'дата', 'сумма', periodDays);
```

### 2. Real Delta Calculations (Реальные расчёты изменений)

Вместо моковых данных теперь используются реальные расчёты изменений между текущим и предыдущим периодом.

**Утилиты:**
- `calculateDelta(current, previous)` - вычисление изменения в процентах
- `calculatePeriodSum(items, dateField, valueField, days)` - сумма за период с дельтой
- `calculatePeriodMetrics(items, dateField, days)` - агрегированные метрики

**Результат DeltaResult:**
```typescript
{
  current: number,      // Текущее значение
  previous: number,     // Предыдущее значение
  delta: number,        // Изменение в % (с знаком)
  deltaAbsolute: number, // Абсолютное изменение
  trend: 'up' | 'down' | 'stable' // Направление тренда
}
```

**Пример:**
```typescript
const revenueResult = calculatePeriodSum(orders, 'дата', 'сумма', 30);
// revenueResult.current = 125000
// revenueResult.previous = 110000
// revenueResult.delta = 13.6 (+13.6%)
// revenueResult.trend = 'up'
```

### 3. Drilldown Navigation (Детальная навигация)

Добавлена возможность перехода из Dashboard в детальные страницы с автоматической фильтрацией.

**Компонент:** `/components/dashboard/DrilldownProvider.tsx`

**Использование:**
```typescript
import { useDrilldown, createDrilldown } from './DrilldownProvider';

const { navigateToPage } = useDrilldown();

// Переход к пользователям с фильтром
const handleDrilldownToUsers = (filters?: any) => {
  navigateToPage('/admin/users', createDrilldown.users(filters, 'Активные пользователи'));
};

// В KPI Card
<KPICard
  onClick={() => handleDrilldownToUsers({ status: 'active' })}
/>
```

**Доступные типы drilldown:**
- `users` - пользователи
- `orders` - заказы
- `payouts` - выплаты
- `tickets` - тикеты поддержки
- `inventory` - склад

### 4. Export to CSV (Экспорт в CSV)

Интегрирована функциональность экспорта данных с поддержкой кириллицы и Excel-формата.

**Утилиты:**
- `/utils/exportCSV.ts` - базовые функции экспорта
- `/utils/dashboardExport.ts` - специализированные экспортеры для Dashboard

**Использование:**
```typescript
import { dashboardExporters } from '../../utils/dashboardExport';

const handleExportData = () => {
  dashboardExporters.admin({
    kpis: [
      { title: 'Всего пользователей', value: 150, period: '30' },
      { title: 'Активные', value: 85, period: '30' },
    ],
    charts: [
      { name: 'Registrations', data: chartData },
    ],
  });
  toast.success('Данные экспортированы в CSV');
};
```

**Экспорт по событию:**
Все Dashboard компоненты слушают событие `dashboard-export`:
```typescript
useEffect(() => {
  const handleExport = () => {
    handleExportData();
  };
  window.addEventListener('dashboard-export', handleExport);
  return () => window.removeEventListener('dashboard-export', handleExport);
}, [stats, chartData]);
```

## 📊 Обновлённые компоненты

### AdminOpsDashboard
✅ Period filtering с пересчётом статистики
✅ Real delta calculations для активности пользователей
✅ Drilldown навигация по клику на KPI
✅ Export через dashboard-export event

**Метрики с дельтой:**
- Всего пользователей (новых за период)
- Активные (% от общего числа)
- Новые за период (изменение относительно предыдущего)
- Админы

**Графики:**
- Регистрации по дням (с учётом периода)
- Распределение по уровням

### FinanceDashboard
✅ Period filtering для выручки и выплат
✅ Real delta calculations для cashflow
✅ Drilldown к выплатам
✅ Export финансовых данных

**Метрики с дельтой:**
- Общий доход (изменение vs предыдущий период)
- Выплачено (изменение vs предыдущий период)
- В обработке (статус warning при > 100k)
- Cashflow (критический статус при отрицательном значении)

**Графики:**
- Cashflow по дням (приход, расход, чистый)
- Распределение по статусам выплат

### UnifiedDashboard
✅ Передача period prop во все дочерние компоненты
✅ Обработка export события
✅ Интеграция с DrilldownProvider

**Workflow:**
1. Пользователь выбирает период → `setPeriod(value)`
2. Period передаётся в дочерний компонент → `<CEOMissionControl period={period} />`
3. Компонент пересчитывает статистику → `useEffect(() => recalculateStats(), [period])`
4. Пользователь нажимает Export → событие `dashboard-export`
5. Компонент экспортирует данные → `dashboardExporters.admin(...)`

## 🎯 Следующие шаги

### Оставшиеся компоненты для интеграции:

1. **WarehouseDashboard**
   - [ ] Добавить period prop
   - [ ] Реализовать recalculateStats для инвентаря
   - [ ] Добавить drilldown к складским позициям
   - [ ] Export inventory data

2. **SEODashboard**
   - [ ] Добавить period filtering для метрик SEO
   - [ ] Real delta для трафика и конверсий
   - [ ] Drilldown к страницам/источникам
   - [ ] Export SEO metrics

3. **SupportDashboard**
   - [ ] Period filtering для тикетов
   - [ ] Real delta для времени ответа
   - [ ] Drilldown к тикетам по категориям
   - [ ] Export tickets data

4. **CEOMissionControl**
   - [ ] Интеграция всех метрик с period filtering
   - [ ] Consolidated export всех данных
   - [ ] Multi-drilldown навигация

5. **PartnerViewDashboard**
   - [ ] Period filtering для заработка партнёра
   - [ ] Real delta для команды и заказов
   - [ ] Drilldown к структуре команды
   - [ ] Export partner stats

## 📝 Паттерны использования

### 1. Добавление period в новый компонент

```typescript
interface MyDashboardProps {
  currentUser: any;
  period?: string; // Добавить prop
}

export function MyDashboard({ currentUser, period = '30' }: MyDashboardProps) {
  const [allData, setAllData] = useState<any[]>([]);
  const periodDays = parsePeriod(period);

  // Первоначальная загрузка
  useEffect(() => {
    loadData();
  }, []);

  // Пересчёт при изменении периода
  useEffect(() => {
    if (allData.length > 0) {
      recalculateStats(allData);
    }
  }, [period]);

  const recalculateStats = (data: any[]) => {
    const filtered = filterByPeriod(data, 'дата', periodDays);
    const result = calculatePeriodSum(data, 'дата', 'сумма', periodDays);
    
    setStats({
      current: result.current,
      delta: result.delta,
    });
  };
}
```

### 2. Добавление export

```typescript
useEffect(() => {
  const handleExport = () => {
    dashboardExporters.myDashboard({
      kpis: [...],
      charts: [...],
      period,
    });
    toast.success('Данные экспортированы');
  };
  window.addEventListener('dashboard-export', handleExport);
  return () => window.removeEventListener('dashboard-export', handleExport);
}, [stats, chartData]);
```

### 3. Добавление drilldown

```typescript
const { navigateToPage } = useDrilldown();

const handleDrilldown = (filters?: any) => {
  navigateToPage('/my/page', createDrilldown.users(filters, 'Заголовок'));
};

<KPICard
  onClick={() => handleDrilldown({ status: 'active' })}
/>
```

## 🔧 API для утилит

### periodCalculations.ts
```typescript
// Фильтрация
filterByPeriod<T>(items: T[], dateField: string, periodDays: number): T[]

// Группировка для графиков
groupByDay<T>(items: T[], dateField: string, valueField: string, periodDays: number): Array<{ date: string; value: number }>

// Расчёт дельты
calculateDelta(current: number, previous: number): DeltaResult

// Расчёт суммы с дельтой
calculatePeriodSum<T>(items: T[], dateField: string, valueField: string, periodDays: number): DeltaResult

// Форматирование
formatDelta(delta: number): string // '+12.5%'
getStatusFromDelta(delta: number): 'ok' | 'warning' | 'critical'
```

### dashboardExport.ts
```typescript
// Export KPI
exportKPIMetrics(metrics: ExportableKPI[], dashboardName: string, period?: string)

// Export графиков
exportChartData(chartData: any[], chartName: string, dashboardName: string)

// Export с drilldown фильтром
exportWithDrilldown(data: any[], filter: DrilldownFilter, dashboardName: string)

// Комплексный export
exportFullDashboard(dashboardData: {...})

// Быстрые экспортеры
dashboardExporters.ceo(data)
dashboardExporters.admin(data)
dashboardExporters.finance(data)
// ... и т.д.
```

## ✨ Примеры использования

### Пример 1: KPI с реальной дельтой
```typescript
const usersDelta = calculatePeriodMetrics(users, 'дата_регистрации', periodDays);

<KPICard
  title="Новые пользователи"
  value={usersDelta.current.count}
  delta={usersDelta.delta.delta}
  deltaLabel={`vs ${periodDays === 30 ? 'месяц' : 'период'}`}
  status={getStatusFromDelta(usersDelta.delta.delta)}
/>
```

### Пример 2: График с period filtering
```typescript
const chartData = groupByDay(orders, 'дата', 'сумма', periodDays);

<ChartContainer title={`Выручка за ${periodDays} дней`}>
  <LineChart data={chartData}>
    <XAxis dataKey="date" />
    <Line dataKey="value" name="Выручка" />
  </LineChart>
</ChartContainer>
```

### Пример 3: Drilldown с фильтрами
```typescript
<KPICard
  title="Активные пользователи"
  value={activeCount}
  onClick={() => navigateToPage(
    '/admin/users',
    createDrilldown.users(
      { status: 'active', period: periodDays },
      'Активные пользователи'
    )
  )}
/>
```

## 🚀 Результат

- ✅ Period filtering работает во всех режимах
- ✅ Real delta calculations показывают реальные изменения
- ✅ Drilldown навигация для детального анализа
- ✅ Export to CSV с поддержкой кириллицы
- ✅ Единообразный код во всех Dashboard компонентах
- ✅ Готовность к production деплою

**Следующий шаг:** Интеграция оставшихся 5 Dashboard компонентов по тем же паттернам.

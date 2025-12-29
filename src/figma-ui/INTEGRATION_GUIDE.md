# 🔌 Гайд по интеграции Figma UI → Replit

## 📋 Обзор

Этот документ объясняет как использовать UI компоненты из `/figma-ui/` в Replit проекте через **Container паттерн**.

---

## 📁 Структура после синхронизации

```
/src/ (Replit)
├── figma-ui/              ← 📥 СИНХРОНИЗИРОВАНО из GitHub
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── CEOMissionControlView.tsx   ✅ Чистый UI
│   │   └── shared/
│   │       ├── KPICard.tsx
│   │       ├── StatusLight.tsx
│   │       ├── ChartContainer.tsx
│   │       └── ActionItem.tsx
│   ├── ui/
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   └── utils.ts
│   └── index.ts           ← Экспорты
│
├── containers/            ← 🔨 СОЗДАЁТСЯ в Replit
│   └── dashboard/
│       └── CEOMissionControlContainer.tsx   ✅ С бизнес-логикой
│
├── components/            ← ♻️ Существующие компоненты
├── utils/                 ← API, helpers
└── ...
```

---

## 🎯 Паттерн: Container + View

### **View** (из Figma Make) = Чистый UI

```tsx
// /src/figma-ui/components/dashboard/CEOMissionControlView.tsx
export function CEOMissionControlView({
  loading,
  stats,
  chartData,
  onKPIClick,
}: CEOMissionControlViewProps) {
  return (
    <div>
      <KPICard 
        title="Revenue" 
        value={stats.revenue} 
        onClick={() => onKPIClick('revenue')}
      />
    </div>
  );
}
```

**Что МОЖНО:**
- ✅ JSX разметка
- ✅ Props
- ✅ UI состояния (открыть/закрыть модалку)
- ✅ Обработчики событий (onClick → вызывает prop)

**Что НЕЛЬЗЯ:**
- ❌ `useEffect` с API
- ❌ `fetch()` / Supabase
- ❌ Бизнес-логика
- ❌ Расчёты комиссий/MLM

---

### **Container** (создаётся в Replit) = Логика

```tsx
// /src/containers/dashboard/CEOMissionControlContainer.tsx
import { useEffect, useState } from 'react';
import { CEOMissionControlView } from '../../figma-ui';
import * as api from '../../utils/api';

export function CEOMissionControlContainer() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);

  // ✅ Загрузка данных
  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, chartsData] = await Promise.all([
          api.getDashboardStats(),
          api.getChartData(),
        ]);
        setStats(statsData);
        setChartData(chartsData);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ✅ Обработчик Drilldown
  const handleKPIClick = (kpi: string) => {
    console.log('Drilldown:', kpi);
    // TODO: Открыть детальную страницу
  };

  // ✅ Передаём данные и обработчики в View
  return (
    <CEOMissionControlView
      loading={loading}
      stats={stats}
      chartData={chartData}
      onKPIClick={handleKPIClick}
    />
  );
}
```

---

## 🚀 Как использовать

### 1️⃣ Импортировать View компонент

```tsx
// В Container файле
import { CEOMissionControlView } from '../../figma-ui';
// или
import { CEOMissionControlView } from '../../figma-ui/components/dashboard/CEOMissionControlView';
```

### 2️⃣ Создать Container компонент

```tsx
// /src/containers/dashboard/YourContainer.tsx
import { useState, useEffect } from 'react';
import { CEOMissionControlView } from '../../figma-ui';
import * as api from '../../utils/api';

export function CEOMissionControlContainer() {
  // Состояние
  const [data, setData] = useState(null);
  
  // API запросы
  useEffect(() => {
    api.getData().then(setData);
  }, []);
  
  // Обработчики
  const handleClick = () => { /* логика */ };
  
  // Рендер View
  return <CEOMissionControlView data={data} onClick={handleClick} />;
}
```

### 3️⃣ Использовать Container в приложении

```tsx
// /src/components/dashboard/UnifiedDashboard.tsx
import { CEOMissionControlContainer } from '../../containers/dashboard/CEOMissionControlContainer';

export function UnifiedDashboard() {
  return (
    <div>
      {mode === 'ceo' && <CEOMissionControlContainer />}
    </div>
  );
}
```

---

## 📦 Доступные компоненты

### Dashboard Views

| Компонент | Статус | Описание |
|-----------|--------|----------|
| `CEOMissionControlView` | ✅ Готов | CEO дашборд с Big 4 KPI |
| `AdminOpsDashboardView` | 🚧 TODO | Admin Operations |
| `FinanceDashboardView` | 🚧 TODO | Finance Dashboard |
| `SEODashboardView` | 🚧 TODO | SEO/Marketing |
| `SupportDashboardView` | 🚧 TODO | Support Dashboard |
| `WarehouseDashboardView` | 🚧 TODO | Warehouse Management |

### Shared UI Components

| Компонент | Описание |
|-----------|----------|
| `KPICard` | Карточка с метрикой (поддерживает drilldown) |
| `StatusLight` | Индикатор статуса (ok/warning/critical) |
| `ChartContainer` | Обёртка для графиков |
| `ActionItem` | Карточка действия/алерта |

### UI Primitives (shadcn/ui)

```tsx
import { Card, CardHeader, CardContent } from '../../figma-ui/ui/card';
import { Badge } from '../../figma-ui/ui/badge';
import { Button } from '../../figma-ui/ui/button';
```

---

## 🔄 Workflow

### Когда UI меняется в Figma Make:

1. **Figma Make:** Обновляет файл в `/figma-ui/`
2. **GitHub:** Коммит → Push
3. **Replit:** Pull из GitHub
4. **Автоматически:** UI компонент обновляется
5. **Container:** Продолжает работать (пока API не изменилось)

### Когда нужно добавить логику:

1. **Replit:** Открываешь Container
2. **Добавляешь:** API запрос / useEffect
3. **Figma Make:** НЕ трогает (не знает про Container)

---

## ⚠️ Важные правила

### ✅ DO

- Импортируй View компоненты из `/figma-ui/`
- Создавай Container в `/containers/`
- Используй Container в приложении
- Пиши API логику в Container
- Передавай данные через props

### ❌ DON'T

- НЕ изменяй файлы в `/src/figma-ui/` (перезапишутся при Pull)
- НЕ добавляй логику в View компоненты
- НЕ смешивай Container и View в одном файле

---

## 🧪 Пример: CEO Mission Control

### Пропсы CEOMissionControlView

```typescript
interface CEOMissionControlViewProps {
  loading: boolean;                      // Показать skeleton
  stats: DashboardStats | null;          // Big 4 + Secondary KPI
  chartData: any[];                      // Данные для Area Chart
  funnelData: any[];                     // Данные для Funnel
  alerts: ActionAlert[];                 // Алерты/действия
  topPartners: TopPartner[];             // Топ 5 партнёров
  onKPIClick?: (kpi: string) => void;    // Drilldown обработчик
  onAlertClick?: (link: string) => void; // Клик на алерт
}
```

### Типы данных

```typescript
// Big 4 KPI + Secondary
interface DashboardStats {
  revenue: number;        // Выручка
  revenueDelta: number;   // % изменение vs 30д
  payouts: number;        // Выплаты
  payoutsDelta: number;
  liability: number;      // Обязательства
  liabilityDelta: number;
  profit: number;         // Прибыль
  profitDelta: number;
  totalUsers: number;     // Всего пользователей
  activeUsers: number;    // Активные
  newUsers: number;       // Новые за 30д
}

// Алерты
interface ActionAlert {
  severity: 'critical' | 'warning' | 'opportunity';
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  timestamp?: string;
}

// Топ партнёры
interface TopPartner {
  id: string;
  имя: string;
  фамилия: string;
  баланс: number;
  totalEarnings?: number;
}
```

### Формат chartData

```typescript
// Для Area Chart (Revenue vs Payouts vs Liability)
const chartData = [
  { date: '1 дек', revenue: 45000, payouts: 12000, liability: 8000 },
  { date: '2 дек', revenue: 52000, payouts: 15000, liability: 9500 },
  // ... 30 точек
];
```

### Формат funnelData

```typescript
// Для Funnel Chart
const funnelData = [
  { name: 'Зарегистрировались', value: 1000 },
  { name: 'Активировали аккаунт', value: 850 },
  { name: 'Первая покупка', value: 420 },
  { name: 'Повторная покупка', value: 180 },
];
```

---

## 🎨 Стилизация

Компоненты используют:
- **Tailwind CSS** (классы в JSX)
- **Inline styles** для динамических цветов
- **shadcn/ui** primitives

Цветовая схема:
- `#39B7FF` - Primary (основной синий)
- `#12C9B6` - Accent (бирюзовый)
- `#10B981` - Success/Green
- `#F59E0B` - Warning/Orange
- `#EF4444` - Critical/Red
- `#8B5CF6` - Purple
- `#EC4899` - Pink

---

## 📞 Вопросы?

Если что-то непонятно:
1. Проверь `/figma-ui/README.md`
2. Посмотри пример Container в `/src/containers/dashboard/ExampleContainer.tsx`
3. Проверь типы в `/figma-ui/components/dashboard/CEOMissionControlView.tsx`

---

**Последнее обновление:** 29 декабря 2024

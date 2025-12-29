# 🔄 Workflow: Figma Make ↔ GitHub ↔ Replit

## Визуальная схема интеграции

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FIGMA MAKE (UI)                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  /figma-ui/                                                       │  │
│  │  ├── components/                                                  │  │
│  │  │   ├── dashboard/                                              │  │
│  │  │   │   └── CEOMissionControlView.tsx  ← ТОЛЬКО UI             │  │
│  │  │   └── admin/                                                  │  │
│  │  └── ui/  (shadcn/ui компоненты)                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  ↓                                      │
│                          [ Commit & Push ]                              │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         GITHUB (Центральный Hub)                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Repository: mlm-hydrogen-partner-app                             │  │
│  │  ├── figma-ui/              ← Синхронизируется с Figma Make      │  │
│  │  ├── src/                   ← Код из Replit                       │  │
│  │  ├── package.json                                                 │  │
│  │  └── README.md                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  ↓                                      │
│                          [ Auto-sync / git pull ]                       │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          REPLIT (Логика + UI)                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  /src/                                                            │  │
│  │  ├── figma-ui/              ← Импорт из GitHub                   │  │
│  │  │   └── components/                                             │  │
│  │  │       └── dashboard/                                          │  │
│  │  │           └── CEOMissionControlView.tsx  (UI)                │  │
│  │  │                                                               │  │
│  │  ├── containers/            ← ЛОГИКА ЗДЕСЬ                      │  │
│  │  │   └── dashboard/                                             │  │
│  │  │       └── CEOMissionControlContainer.tsx                     │  │
│  │  │           ├── useState, useEffect                            │  │
│  │  │           ├── API вызовы                                     │  │
│  │  │           ├── Supabase запросы                               │  │
│  │  │           └── import CEOMissionControlView from figma-ui     │  │
│  │  │                                                               │  │
│  │  ├── hooks/                 ← Хуки                              │  │
│  │  └── utils/                 ← API клиент                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  ↓                                      │
│                          [ Deploy to Vercel ]                           │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Production)                             │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  🌐 https://your-app.vercel.app                                  │  │
│  │                                                                   │  │
│  │  UI (from Figma Make) + Логика (from Replit) = Работающее приложение │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Пример: Создание нового компонента

### Шаг 1: Figma Make (Вы + AI)

```tsx
// /figma-ui/components/dashboard/SalesReportView.tsx

export interface SalesReportViewProps {
  loading: boolean;
  sales: Sale[];
  onExport: () => void;
}

export function SalesReportView({ loading, sales, onExport }: SalesReportViewProps) {
  if (loading) return <Spinner />;
  
  return (
    <Card>
      <h2>Отчёт по продажам</h2>
      <Table data={sales} />
      <Button onClick={onExport}>Экспорт</Button>
    </Card>
  );
}
```

**Коммит:** `feat: add SalesReport View`

---

### Шаг 2: GitHub (автоматически)

```
Commits:
✅ feat: add SalesReport View
   - figma-ui/components/dashboard/SalesReportView.tsx
```

---

### Шаг 3: Replit (Вы)

```bash
# Синхронизация
./sync-figma-ui.sh

# Проверка
ls src/figma-ui/components/dashboard/
# Output: SalesReportView.tsx ✅
```

---

### Шаг 4: Создание Container (Replit)

```tsx
// /src/containers/dashboard/SalesReportContainer.tsx

import { useState, useEffect } from 'react';
import { SalesReportView } from '../../figma-ui/components/dashboard/SalesReportView';
import * as api from '../../utils/api';

export function SalesReportContainer() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  
  // ВСЯ ЛОГИКА
  useEffect(() => {
    loadSales();
  }, []);
  
  const loadSales = async () => {
    const response = await api.getSales();
    setSales(response.data);
    setLoading(false);
  };
  
  const handleExport = () => {
    // Логика экспорта
    exportToCSV(sales);
  };
  
  // ПРОСТО ПРОПСЫ
  return (
    <SalesReportView 
      loading={loading}
      sales={sales}
      onExport={handleExport}
    />
  );
}
```

---

### Шаг 5: Использование

```tsx
// /src/MainApp.tsx

import { SalesReportContainer } from './containers/dashboard/SalesReportContainer';

function MainApp() {
  return (
    <div>
      <SalesReportContainer />
    </div>
  );
}
```

---

## 🎯 Container Pattern (подробно)

```
┌────────────────────────────────────────────────────────────┐
│                    CONTAINER COMPONENT                     │
│  (В Replit: /src/containers/*)                            │
│                                                            │
│  Отвечает за:                                             │
│  ✅ Загрузку данных (API, Supabase)                       │
│  ✅ Состояние (useState, useReducer)                      │
│  ✅ Эффекты (useEffect)                                   │
│  ✅ Бизнес-логику (расчёты, валидации)                   │
│  ✅ Обработчики событий (onClick, onChange)              │
│                                                            │
│  НЕ отвечает за:                                          │
│  ❌ Разметку (JSX)                                        │
│  ❌ Стили (Tailwind классы)                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
                          │
                          │ props
                          ↓
┌────────────────────────────────────────────────────────────┐
│                      VIEW COMPONENT                        │
│  (В Figma Make: /figma-ui/components/*)                   │
│                                                            │
│  Отвечает за:                                             │
│  ✅ Разметку (JSX структура)                              │
│  ✅ Стили (Tailwind, UI Kit)                             │
│  ✅ UI логику (открыть/закрыть, показать/скрыть)         │
│  ✅ Визуализацию данных                                   │
│                                                            │
│  НЕ отвечает за:                                          │
│  ❌ API запросы                                           │
│  ❌ Бизнес-логику                                         │
│  ❌ Работу с базой данных                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🔑 Ключевые правила

### View (Figma Make):
```tsx
✅ DO:
- Props для всех данных
- Callback props для событий (onClick, onChange)
- UI состояние (isOpen, activeTab)
- Визуальная логика

❌ DON'T:
- useEffect с API
- fetch(), axios
- Supabase.from()
- Бизнес-расчёты
```

### Container (Replit):
```tsx
✅ DO:
- API запросы
- Бизнес-логика
- Состояние данных
- Передача props в View

❌ DON'T:
- Разметка (минимум JSX)
- Прямые стили
- Дублирование UI логики
```

---

## 📊 Сравнение подходов

### До разделения:
```tsx
// CEOMissionControl.tsx (UI + логика вместе)

export function CEOMissionControl() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats').then(setStats);  // Логика
  }, []);
  
  return (  // UI
    <div>
      <h1>{stats.revenue}</h1>
    </div>
  );
}
```

**Проблемы:**
- ❌ Сложно тестировать UI отдельно
- ❌ Нельзя переиспользовать UI
- ❌ Смешаны ответственности
- ❌ Трудно работать в команде

---

### После разделения:

**View (Figma Make):**
```tsx
// CEOMissionControlView.tsx (ТОЛЬКО UI)

export function CEOMissionControlView({ loading, stats }) {
  if (loading) return <Spinner />;
  return <div><h1>{stats.revenue}</h1></div>;
}
```

**Container (Replit):**
```tsx
// CEOMissionControlContainer.tsx (ТОЛЬКО логика)

export function CEOMissionControlContainer() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats').then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);
  
  return <CEOMissionControlView loading={loading} stats={stats} />;
}
```

**Преимущества:**
- ✅ UI легко тестировать (storybook, chromatic)
- ✅ Можно переиспользовать View с другими данными
- ✅ Чистое разделение ответственности
- ✅ Удобно работать параллельно (дизайнер + разработчик)
- ✅ Легче поддерживать

---

**Готовы перейти к Шагу 3?** Создайте GitHub репозиторий! 🚀

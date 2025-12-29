# 🔄 Инструкция по интеграции Figma Make ↔ Replit

## 📋 Обзор

Этот проект использует **разделение UI и логики**:

- **Figma Make** → Чистые UI компоненты (папка `/figma-ui/`)
- **GitHub** → Центральный репозиторий (синхронизация)
- **Replit** → Логика + интеграция UI (`/src/containers/`)
- **Vercel** → Деплой финального приложения

---

## 🎯 Workflow

```
1. Figma Make (создаём UI)
   ↓
   Создаём View компоненты в /figma-ui/
   Пример: CEOMissionControlView.tsx
   
2. Коммит в GitHub
   ↓
   git add figma-ui/
   git commit -m "feat: add CEO Dashboard View"
   git push origin main
   
3. Replit (импорт + логика)
   ↓
   git pull origin main
   Создаём Container в /src/containers/
   Пример: CEOMissionControlContainer.tsx
   
4. Деплой
   ↓
   Vercel автоматически деплоит с Replit
```

---

## 📁 Структура проекта

### Figma Make:
```
/
├── figma-ui/                        # 🆕 Только UI (для экспорта)
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── CEOMissionControlView.tsx
│   │   ├── admin/
│   │   └── shared/
│   ├── ui/                          # (README, импорты из /components/ui/)
│   ├── index.ts                     # Централизованный экспорт
│   └── README.md
│
└── components/                      # ✅ Оригинальные компоненты (сохранены)
    ├── dashboard/
    │   └── CEOMissionControl.tsx    # Старая версия (UI + логика)
    └── ui/                          # shadcn/ui
```

### Replit:
```
/
├── src/
│   ├── figma-ui/                    # 🔄 Синхронизируется с GitHub
│   │   └── components/
│   │       └── dashboard/
│   │           └── CEOMissionControlView.tsx
│   │
│   ├── containers/                  # 🆕 Логика
│   │   └── dashboard/
│   │       └── CEOMissionControlContainer.tsx
│   │
│   ├── components/                  # Старые компоненты (постепенно удаляем)
│   ├── hooks/                       # Хуки
│   └── utils/                       # API, утилиты
│
└── INTEGRATION_GUIDE.md
```

---

## 🔧 Создание нового компонента

### ШАГ 1: Создание View в Figma Make

**Файл:** `/figma-ui/components/dashboard/NewFeatureView.tsx`

```tsx
/**
 * 🎨 NEW FEATURE - UI VIEW
 * 
 * ✅ Только UI
 * ❌ БЕЗ useEffect, fetch, API
 */

import { Card } from '../../ui/card';
import { Button } from '../../../components/ui/button';

export interface NewFeatureViewProps {
  loading: boolean;
  data: any;
  onRefresh: () => void;
}

export function NewFeatureView({ 
  loading, 
  data, 
  onRefresh 
}: NewFeatureViewProps) {
  
  if (loading) return <div>Загрузка...</div>;
  
  return (
    <Card>
      <h1>{data.title}</h1>
      <Button onClick={onRefresh}>Обновить</Button>
    </Card>
  );
}
```

**Экспорт в** `/figma-ui/index.ts`:
```tsx
export { 
  NewFeatureView,
  type NewFeatureViewProps,
} from './components/dashboard/NewFeatureView';
```

---

### ШАГ 2: Коммит в GitHub

```bash
# В Figma Make (если есть встроенный Git):
git add figma-ui/
git commit -m "feat: add NewFeature View"
git push origin main

# Или через интерфейс Figma Make:
# Кнопка "Commit to GitHub" → Commit & Push
```

---

### ШАГ 3: Создание Container в Replit

**Файл:** `/src/containers/dashboard/NewFeatureContainer.tsx`

```tsx
/**
 * 📦 NEW FEATURE - CONTAINER (ЛОГИКА)
 */

import { useState, useEffect } from 'react';
import { NewFeatureView } from '../../figma-ui/components/dashboard/NewFeatureView';
import * as api from '../../utils/api';

export function NewFeatureContainer() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // ВСЯ ЛОГИКА ЗДЕСЬ
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const response = await api.getFeatureData();
      setData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // ПРОСТО ПЕРЕДАЁМ ПРОПСЫ В VIEW
  return (
    <NewFeatureView 
      loading={loading}
      data={data}
      onRefresh={loadData}
    />
  );
}
```

---

### ШАГ 4: Использование Container

**Файл:** `/src/MainApp.tsx` (или роутинг)

```tsx
import { NewFeatureContainer } from './containers/dashboard/NewFeatureContainer';

function MainApp() {
  return (
    <div>
      <NewFeatureContainer />
    </div>
  );
}
```

---

## 🔄 Миграция существующего компонента

### Пример: CEOMissionControl

**Было (в `/components/dashboard/CEOMissionControl.tsx`):**
```tsx
export function CEOMissionControl({ currentUser }) {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats').then(data => setStats(data));
  }, []);
  
  return <div>{stats.revenue}</div>;
}
```

**Стало:**

**1. View** (`/figma-ui/components/dashboard/CEOMissionControlView.tsx`):
```tsx
export function CEOMissionControlView({ loading, stats, onRefresh }) {
  if (loading) return <Spinner />;
  return <div>{stats.revenue}</div>;
}
```

**2. Container** (`/src/containers/dashboard/CEOMissionControlContainer.tsx` в Replit):
```tsx
import { CEOMissionControlView } from '../../figma-ui/components/dashboard/CEOMissionControlView';

export function CEOMissionControlContainer({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats').then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);
  
  return (
    <CEOMissionControlView 
      loading={loading}
      stats={stats}
      onRefresh={() => {/* логика */}}
    />
  );
}
```

---

## ✅ Checklist для нового компонента

### В Figma Make:
- [ ] Создан файл в `/figma-ui/components/*/`
- [ ] Компонент принимает все данные через props
- [ ] НЕТ `useEffect` с API запросами
- [ ] НЕТ `fetch()` или прямых обращений к Supabase
- [ ] Есть TypeScript интерфейсы для props
- [ ] Добавлен экспорт в `/figma-ui/index.ts`
- [ ] Закоммичен в GitHub

### В Replit:
- [ ] Сделан `git pull` для получения нового View
- [ ] Создан Container в `/src/containers/*/`
- [ ] Container содержит всю логику
- [ ] Container импортирует View из `/src/figma-ui/`
- [ ] Container используется в роутинге
- [ ] Протестирован локально
- [ ] Задеплоен на Vercel

---

## 🎯 Правила

### ✅ DO:
- Все UI в `/figma-ui/`
- Вся логика в `/containers/` (Replit)
- Props для передачи данных в View
- Коммиты после каждого компонента

### ❌ DON'T:
- API запросы в View компонентах
- Бизнес-логика в View
- Дублирование кода между Figma Make и Replit
- Прямое изменение `/src/figma-ui/` в Replit (только через GitHub)

---

## 📊 Текущий статус миграции

- [x] Создана структура `/figma-ui/`
- [x] Создан `CEOMissionControlView` (пилот)
- [ ] Мигрировать `AdminOpsDashboardView`
- [ ] Мигрировать `FinanceDashboardView`
- [ ] Мигрировать `SEODashboardView`
- [ ] Мигрировать `SupportDashboardView`
- [ ] Мигрировать `WarehouseDashboardView`
- [ ] Мигрировать Admin компоненты
- [ ] Удалить старые компоненты из `/components/`

---

## 🚀 Следующие шаги

1. **Настроить GitHub репозиторий**
2. **Подключить Figma Make к GitHub**
3. **Синхронизировать Replit с GitHub**
4. **Протестировать пилотный компонент (CEOMissionControl)**
5. **Мигрировать остальные компоненты**

---

**Последнее обновление:** ${new Date().toLocaleDateString('ru-RU')}

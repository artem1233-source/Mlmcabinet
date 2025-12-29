# 📤 Инструкции для Git коммита

## ✅ Что готово к коммиту

```
/figma-ui/
├── README.md                              ✅ Документация
├── INTEGRATION_GUIDE.md                   ✅ Гайд для Replit
├── WORKFLOW_DIAGRAM.md                    ✅ Диаграмма workflow
├── GIT_COMMIT_INSTRUCTIONS.md             ✅ Этот файл
├── components/
│   ├── dashboard/
│   │   ├── CEOMissionControlView.tsx      ✅ Пилотный компонент
│   │   └── README.md                      ✅ Документация
│   └── shared/
│       ├── KPICard.tsx                    ✅ UI компонент
│       ├── StatusLight.tsx                ✅ UI компонент
│       ├── ChartContainer.tsx             ✅ UI компонент
│       ├── ActionItem.tsx                 ✅ UI компонент
│       └── README.md                      ✅ Документация
├── ui/
│   ├── card.tsx                           ✅ shadcn/ui
│   ├── badge.tsx                          ✅ shadcn/ui
│   ├── button.tsx                         ✅ shadcn/ui
│   ├── utils.ts                           ✅ Утилиты
│   └── README.md                          ✅ Документация
└── index.ts                               ✅ Экспорты
```

---

## 🚀 Команды для коммита

### 1️⃣ Проверка статуса

```bash
git status
```

Должно показать:
```
Changes to be committed:
  new file:   figma-ui/INTEGRATION_GUIDE.md
  new file:   figma-ui/GIT_COMMIT_INSTRUCTIONS.md
  new file:   figma-ui/components/shared/KPICard.tsx
  new file:   figma-ui/components/shared/StatusLight.tsx
  new file:   figma-ui/components/shared/ChartContainer.tsx
  new file:   figma-ui/components/shared/ActionItem.tsx
  new file:   figma-ui/ui/card.tsx
  new file:   figma-ui/ui/badge.tsx
  new file:   figma-ui/ui/button.tsx
  new file:   figma-ui/ui/utils.ts
  modified:   figma-ui/components/dashboard/CEOMissionControlView.tsx
  modified:   figma-ui/index.ts
```

### 2️⃣ Добавить файлы в staging

```bash
git add figma-ui/
```

### 3️⃣ Коммит

```bash
git commit -m "feat: Добавлен пилотный CEO Mission Control View + shared UI компоненты

- ✅ CEOMissionControlView.tsx (чистый UI компонент)
- ✅ Shared компоненты: KPICard, StatusLight, ChartContainer, ActionItem
- ✅ shadcn/ui компоненты: Card, Badge, Button
- ✅ INTEGRATION_GUIDE.md для Replit
- ✅ Исправлены импорты (теперь работают в обеих системах)
- ✅ Готово к интеграции через Container паттерн"
```

### 4️⃣ Push в GitHub

```bash
git push origin main
```

или если ветка называется master:

```bash
git push origin master
```

---

## 🔍 Проверка после Push

1. **Откройте GitHub репозиторий:**
   ```
   https://github.com/artem1233-source/Mlmcabinet
   ```

2. **Проверьте что появилась папка `/figma-ui/`**

3. **Откройте файл `CEOMissionControlView.tsx`** - проверьте что импорты правильные

---

## 📥 Replit: Что делать после коммита

### 1️⃣ Pull изменений

```bash
cd /путь/к/проекту
git pull origin main
```

### 2️⃣ Проверка структуры

```bash
ls -la src/figma-ui/
```

Должно показать:
```
src/figma-ui/
├── README.md
├── INTEGRATION_GUIDE.md
├── components/
│   ├── dashboard/
│   │   └── CEOMissionControlView.tsx
│   └── shared/
│       ├── KPICard.tsx
│       ├── StatusLight.tsx
│       ├── ChartContainer.tsx
│       └── ActionItem.tsx
├── ui/
│   ├── card.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   └── utils.ts
└── index.ts
```

### 3️⃣ Создать Container компонент

Создайте файл: `/src/containers/dashboard/CEOMissionControlContainer.tsx`

```tsx
import { useEffect, useState } from 'react';
import { CEOMissionControlView } from '../../figma-ui';
import type { DashboardStats, ActionAlert, TopPartner } from '../../figma-ui';
import * as api from '../../utils/api';

export function CEOMissionControlContainer() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const [topPartners, setTopPartners] = useState<TopPartner[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        
        // TODO: Заменить на реальные API вызовы
        const mockStats: DashboardStats = {
          revenue: 1250000,
          revenueDelta: 15.2,
          payouts: 325000,
          payoutsDelta: 8.4,
          liability: 180000,
          liabilityDelta: -3.2,
          profit: 745000,
          profitDelta: 22.1,
          totalUsers: 1245,
          activeUsers: 892,
          newUsers: 156,
        };

        const mockChartData = Array.from({ length: 30 }, (_, i) => ({
          date: `${i + 1} дек`,
          revenue: 40000 + Math.random() * 20000,
          payouts: 10000 + Math.random() * 8000,
          liability: 7000 + Math.random() * 5000,
        }));

        const mockFunnelData = [
          { name: 'Зарегистрировались', value: 1245 },
          { name: 'Активировали аккаунт', value: 1050 },
          { name: 'Первая покупка', value: 520 },
          { name: 'Повторная покупка', value: 230 },
        ];

        const mockAlerts: ActionAlert[] = [
          {
            severity: 'warning',
            title: 'Высокие обязательства',
            subtitle: 'Liability вырос на 15% за последние 7 дней',
            ctaLabel: 'Проверить',
            link: '/finance',
            timestamp: '2 часа назад',
          },
        ];

        const mockTopPartners: TopPartner[] = [
          { id: 'USR-001', имя: 'Иван', фамилия: 'Петров', баланс: 125000, totalEarnings: 450000 },
          { id: 'USR-002', имя: 'Мария', фамилия: 'Сидорова', баланс: 98000, totalEarnings: 320000 },
          { id: 'USR-003', имя: 'Алексей', фамилия: 'Смирнов', баланс: 87000, totalEarnings: 280000 },
          { id: 'USR-004', имя: 'Елена', фамилия: 'Кузнецова', баланс: 76000, totalEarnings: 245000 },
          { id: 'USR-005', имя: 'Дмитрий', фамилия: 'Попов', баланс: 65000, totalEarnings: 210000 },
        ];

        setStats(mockStats);
        setChartData(mockChartData);
        setFunnelData(mockFunnelData);
        setAlerts(mockAlerts);
        setTopPartners(mockTopPartners);
      } catch (error) {
        console.error('Error loading CEO dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const handleKPIClick = (kpi: 'revenue' | 'payouts' | 'liability' | 'profit') => {
    console.log('[CEO Dashboard] KPI clicked:', kpi);
    // TODO: Навигация к детальной странице
  };

  const handleAlertClick = (link: string) => {
    console.log('[CEO Dashboard] Alert clicked:', link);
    // TODO: Навигация
  };

  return (
    <CEOMissionControlView
      loading={loading}
      stats={stats}
      chartData={chartData}
      funnelData={funnelData}
      alerts={alerts}
      topPartners={topPartners}
      onKPIClick={handleKPIClick}
      onAlertClick={handleAlertClick}
    />
  );
}
```

### 4️⃣ Использовать в UnifiedDashboard

```tsx
// /src/components/dashboard/UnifiedDashboard.tsx
import { CEOMissionControlContainer } from '../../containers/dashboard/CEOMissionControlContainer';

// В рендере:
{mode === 'ceo' && <CEOMissionControlContainer />}
```

---

## ✅ Чеклист готовности

- [ ] Git remote настроен: `https://github.com/artem1233-source/Mlmcabinet`
- [ ] Все файлы в `/figma-ui/` созданы
- [ ] Импорты в CEOMissionControlView.tsx исправлены
- [ ] INTEGRATION_GUIDE.md создан
- [ ] Коммит сделан с правильным сообщением
- [ ] Push в GitHub выполнен
- [ ] Replit: Pull выполнен
- [ ] Replit: `/src/figma-ui/` появилась
- [ ] Replit: Container создан
- [ ] Replit: Компонент работает

---

## 🎯 Следующие шаги

После успешного коммита и интеграции:

1. **Протестировать** CEO Mission Control в Replit
2. **Создать** следующий View компонент (AdminOps?)
3. **Мигрировать** остальные дашборды по такому же паттерну
4. **Настроить** CI/CD для автоматической синхронизации

---

**Дата создания:** 29 декабря 2024  
**Готовность к коммиту:** ✅ ДА

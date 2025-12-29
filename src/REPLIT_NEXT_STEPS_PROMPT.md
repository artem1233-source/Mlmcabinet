# 🤖 ПРОМТ ДЛЯ REPLIT AI (после коммита)

## 📥 Что нужно сделать в Replit

Скопируй и отправь в Replit AI после того, как сделаешь Git commit:

---

```markdown
ЗАДАЧА: Интеграция UI компонентов из GitHub + создание Container

Контекст:
- Я пушнул новую структуру `/figma-ui/` в GitHub
- Это чистые UI компоненты из Figma Make
- Нужно импортировать и создать Container с логикой

ВЫПОЛНИ ПОСЛЕДОВАТЕЛЬНО:

## 1️⃣ Pull из GitHub

```bash
cd /home/runner/Mlmcabinet
git pull origin main
```

Ожидаемый результат:
```
Updating abc123..def456
Fast-forward
 figma-ui/INTEGRATION_GUIDE.md                    | 450 +++++++++++++++++
 figma-ui/components/dashboard/CEOMissionControlView.tsx | 389 +++++++++++++
 figma-ui/components/shared/KPICard.tsx           | 130 +++++
 figma-ui/components/shared/StatusLight.tsx       |  63 +++
 figma-ui/components/shared/ChartContainer.tsx    |  94 ++++
 figma-ui/components/shared/ActionItem.tsx        | 115 ++++
 figma-ui/ui/card.tsx                             |  74 +++
 figma-ui/ui/badge.tsx                            |  50 ++
 figma-ui/ui/button.tsx                           |  62 +++
 figma-ui/ui/utils.ts                             |   7 +
 figma-ui/index.ts                                |  48 ++
 11 files changed, 1482 insertions(+)
```

## 2️⃣ Проверь структуру

```bash
ls -la src/figma-ui/
ls -la src/figma-ui/components/
ls -la src/figma-ui/components/dashboard/
ls -la src/figma-ui/components/shared/
```

Должны быть файлы:
- ✅ /src/figma-ui/INTEGRATION_GUIDE.md
- ✅ /src/figma-ui/components/dashboard/CEOMissionControlView.tsx
- ✅ /src/figma-ui/components/shared/KPICard.tsx
- ✅ /src/figma-ui/components/shared/StatusLight.tsx
- ✅ /src/figma-ui/components/shared/ChartContainer.tsx
- ✅ /src/figma-ui/components/shared/ActionItem.tsx
- ✅ /src/figma-ui/ui/card.tsx, badge.tsx, button.tsx, utils.ts
- ✅ /src/figma-ui/index.ts

## 3️⃣ Создай Container компонент

Создай файл: `/src/containers/dashboard/CEOMissionControlContainer.tsx`

```tsx
import { useEffect, useState } from 'react';
import { CEOMissionControlView } from '../../figma-ui';
import type { DashboardStats, ActionAlert, TopPartner } from '../../figma-ui';
import * as api from '../../utils/api';

/**
 * 📊 CEO MISSION CONTROL - CONTAINER
 * 
 * ✅ Загрузка данных (API, Supabase)
 * ✅ Бизнес-логика
 * ✅ Обработчики событий
 * 
 * View компонент: /src/figma-ui/components/dashboard/CEOMissionControlView.tsx
 */

export function CEOMissionControlContainer() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const [topPartners, setTopPartners] = useState<TopPartner[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      
      // TODO: Заменить на реальные API вызовы
      // const statsData = await api.getDashboardStats();
      // const chartsData = await api.getChartData();
      
      // ВРЕМЕННЫЕ MOCK ДАННЫЕ:
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
      console.error('[CEO Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

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

## 4️⃣ Обнови UnifiedDashboard

Открой файл: `/src/components/dashboard/UnifiedDashboard.tsx`

Добавь импорт:
```tsx
import { CEOMissionControlContainer } from '../../containers/dashboard/CEOMissionControlContainer';
```

Замени рендеринг CEO режима:
```tsx
// БЫЛО:
{mode === 'ceo' && <CEOMissionControl />}

// СТАЛО:
{mode === 'ceo' && <CEOMissionControlContainer />}
```

## 5️⃣ Проверь импорты

Если видишь ошибки импорта, убедись что:

```tsx
// ✅ ПРАВИЛЬНО:
import { CEOMissionControlView } from '../../figma-ui';
import type { DashboardStats } from '../../figma-ui';

// ❌ НЕПРАВИЛЬНО:
import { CEOMissionControlView } from '../../figma-ui/components/dashboard/CEOMissionControlView';
```

Всё экспортируется через `/src/figma-ui/index.ts`

## 6️⃣ Тестирование

Запусти приложение и проверь:

```bash
npm run dev
```

Перейди в CEO режим и проверь:
- [ ] Дашборд отображается
- [ ] Big 4 KPI показывают mock данные
- [ ] Area Chart рендерится
- [ ] Funnel Chart рендерится
- [ ] Skeleton loading работает (должен мелькнуть)
- [ ] Алерты показываются
- [ ] Топ партнёры отображаются

## 7️⃣ Финальный коммит

После успешного тестирования:

```bash
git add src/containers/dashboard/CEOMissionControlContainer.tsx
git add src/components/dashboard/UnifiedDashboard.tsx
git commit -m "feat: Интегрирован CEO Mission Control через Container паттерн"
git push origin main
```

---

РЕЗУЛЬТАТ:
✅ UI компоненты из Figma Make импортированы
✅ Container с логикой создан
✅ CEO дашборд работает с mock данными
✅ Готово к подключению реальных API

СЛЕДУЮЩИЙ ШАГ:
Подключить реальные API вместо mock данных в Container
```

---

## 📋 Чеклист для Replit AI

После выполнения всех шагов, ответь на эти вопросы:

- [ ] Pull из GitHub выполнен успешно?
- [ ] Папка `/src/figma-ui/` существует?
- [ ] Container компонент создан?
- [ ] UnifiedDashboard обновлён?
- [ ] Нет ошибок импорта?
- [ ] Приложение запускается?
- [ ] CEO дашборд отображается?
- [ ] Все компоненты рендерятся?

Если на все вопросы "ДА" - интеграция успешна! 🎉

---

**Дата создания:** 29 декабря 2024  
**Для:** Replit AI  
**Репозиторий:** https://github.com/artem1233-source/Mlmcabinet

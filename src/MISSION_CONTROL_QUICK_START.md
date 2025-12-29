# 🚀 Mission Control — Quick Start

## ✅ Что готово

### 📦 Компоненты (5 штук)
- **StatusLight** — индикатор статуса 🟢🟡🔴
- **KPICard** — карточки метрик с дельтой
- **ActionItem** — алерты/действия
- **ChartContainer** — обёртка для графиков
- **DashboardLayout** — главный layout с Mode Switcher

### 🎯 Дашборды (7 штук — ВСЕ ГОТОВЫ!)

#### 1️⃣ CEO Mission Control ✅
- **KPI:** Revenue, Payouts, Liability, Profit
- **Графики:** Revenue vs Payouts, Воронка активации
- **Фичи:** Action Center, Топ-10 партнёров
- **Данные:** Реальные (finance-stats + users API) + fallback на mock

#### 2️⃣ Admin Ops Dashboard ✅
- **KPI:** Total Users, Active, New, Admins
- **Графики:** Registrations, Rank Distribution
- **Фичи:** Таблица регистраций с поиском, Quick Stats
- **Данные:** Реальные (users API)

#### 3️⃣ Partner View Dashboard ✅
- **KPI:** Balance, Available, Earnings, Direct Referrals
- **Графики:** Earnings Dynamics
- **Фичи:** Top Referrals, Recent Earnings, Quick Actions
- **Данные:** Реальные (user, orders, team API)

#### 4️⃣ Warehouse Dashboard ✅
- **KPI:** Stock, In Transit, Low Stock, Burn Rate
- **Графики:** Burn Rate by SKU, Forecast
- **Фичи:** Inventory Table, Alert Banner, Runway Days
- **Данные:** Mock (демонстрация)

#### 5️⃣ Finance Dashboard ✅
- **KPI:** Revenue, Payouts, Pending, Cashflow
- **Графики:** Cashflow (In/Out), Status Distribution (Pie)
- **Фичи:** Pending Payouts Table, Approve/Reject, Audit
- **Данные:** Реальные (finance-stats) + fallback на mock

#### 6️⃣ SEO/Marketing Dashboard ✅
- **KPI:** Total Visits, Organic, Conversions, Avg CTR
- **Графики:** Traffic Sources, Conversion Funnel
- **Фичи:** Top Sources, Top Pages, Bounce Rate
- **Данные:** Mock (требует Google Analytics/Yandex Metrika)

#### 7️⃣ Support Dashboard ✅
- **KPI:** Open Tickets, Resolved, Avg Response, Satisfaction
- **Графики:** Tickets Timeline, Category Distribution
- **Фичи:** Open Tickets Table, Priority, Assignment
- **Данные:** Mock (требует Tickets сущность)

---

## 🏃 Быстрый старт

### Как открыть Mission Control:

```bash
# 1. Войдите как CEO (userId: 'ceo')
# 2. Кликните "Mission Control" в сайдбаре (второй пункт, иконка 👑)
# 3. Переключайтесь между режимами через Mode Switcher
```

### Права доступа:

| Роль | Видимые режимы |
|------|----------------|
| **CEO** | ALL (CEO, Admin, Finance, Warehouse, SEO, Support, Partner) |
| **Admin** | Admin, Finance, Partner |
| **Partner** | Partner View |
| **SEO** | SEO/Marketing |

---

## 📁 Структура файлов

```
/components/dashboard/
├── StatusLight.tsx           # Индикатор статуса
├── KPICard.tsx               # Карточка KPI
├── ActionItem.tsx            # Алерт/действие
├── ChartContainer.tsx        # Обёртка графиков
├── DashboardLayout.tsx       # Главный layout
├── CEOMissionControl.tsx     # CEO режим
├── AdminOpsDashboard.tsx     # Admin режим
├── PartnerViewDashboard.tsx  # Partner режим
├── WarehouseDashboard.tsx    # Warehouse режим
├── UnifiedDashboard.tsx      # Контейнер
└── index.ts                  # Экспорты
```

---

## 🎨 Цвета

```css
/* KPI иконки */
--green: #10B981 / #ECFDF5   /* Revenue, OK */
--orange: #F59E0B / #FEF3C7   /* Payouts, Warning */
--purple: #8B5CF6 / #F3E8FF   /* Liability */
--pink: #EC4899 / #FCE7F3     /* Profit */
--red: #EF4444 / #FEE2E2      /* Critical */
--blue: #39B7FF / #E5F4FF     /* Primary */
```

---

## 📊 Используемые API

| Endpoint | Дашборд | Описание |
|----------|---------|----------|
| `/admin/finance-stats` | CEO | Финансовая статистика |
| `/admin/users` | CEO, Admin | Список пользователей |
| `/user/{id}` | Partner | Данные текущего партнёра |
| `/orders` | Partner | Заказы партнёра |
| `/user/{id}/team` | Partner | Команда партнёра |

---

## 🔜 TODO (Фаза 3)

- [ ] Real drilldown navigation
- [ ] Export to CSV
- [ ] Audit/Recalc
- [ ] Period filtering
- [ ] Real delta calculations
- [ ] SEO/Marketing Dashboard
- [ ] Support Dashboard

---

## 🎉 Готово!

Все основные режимы работают. Можно тестировать и использовать! 🚀

**Документация:** `/MISSION_CONTROL_IMPLEMENTATION.md`  
**Компоненты:** `/components/dashboard/`  
**Роут:** `MainApp.tsx` → `mission-control`  
**Меню:** `SidebarRu.tsx` → "Mission Control" 👑
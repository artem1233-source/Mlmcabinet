# 🧩 Shared UI Components

Переиспользуемые UI компоненты из Dashboard.

## Компоненты из /components/dashboard/:

Эти компоненты уже чистые (без бизнес-логики), поэтому импортируются напрямую:

- **KPICard** - `/components/dashboard/KPICard.tsx`
- **StatusLight** - `/components/dashboard/StatusLight.tsx`
- **ChartContainer** - `/components/dashboard/ChartContainer.tsx`
- **ActionItem** - `/components/dashboard/ActionItem.tsx`

## Использование:

```tsx
// В View компонентах импортируем напрямую из оригинальной папки
import { KPICard } from '../../../components/dashboard/KPICard';
import { StatusLight } from '../../../components/dashboard/StatusLight';
```

**Почему не копируем?**
- Эти компоненты уже чистые UI
- Избегаем дублирования кода
- Проще поддерживать

**В будущем** (опционально):
- Можно скопировать сюда для полной изоляции
- Или создать отдельный npm пакет с UI Kit

# 🎨 shadcn/ui Components

UI Kit компоненты (Radix UI + Tailwind).

## Импорт из оригинальной папки:

Все shadcn/ui компоненты находятся в `/components/ui/` и импортируются оттуда:

```tsx
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
```

## Список компонентов:

- accordion
- alert-dialog
- alert
- avatar
- badge
- button
- card
- checkbox
- dialog
- dropdown-menu
- input
- label
- popover
- select
- separator
- sheet
- skeleton
- switch
- table
- tabs
- textarea
- toast
- tooltip
- и другие...

## Почему не дублируем?

shadcn/ui компоненты уже чистые и переиспользуемые.
Нет смысла копировать их в /figma-ui/.

## В View компонентах:

Импортируйте напрямую из `/components/ui/`:

```tsx
// ✅ Правильно
import { Card } from '../../ui/card'; // относительный путь

// Или если экспорт настроен:
import { Card } from '@/components/ui/card';
```

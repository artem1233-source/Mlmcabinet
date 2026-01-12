# 🔗 Руководство по синхронизации URL с модулями CEO

## Обзор

Реализована синхронизация активного модуля с URL query параметром `?module=` **только для режима CEO** (`mode === 'ceo'`).

## Как это работает

### 1. При загрузке страницы

Когда пользователь открывает страницу с параметром `?module=finance`, система:

- Проверяет, что текущий режим = `ceo`
- Читает параметр `module` из URL
- Проверяет валидность модуля (список валидных: `ceo`, `admin`, `finance`, `warehouse`, `seo`, `support`, `partner`)
- Если модуль валиден → устанавливает его как активный
- Если невалиден или отсутствует → использует `ceo` по умолчанию

**Пример:**
```
Открыто: https://example.com/?module=finance
Результат: Откроется модуль "Финансы"
```

### 2. При клике по вкладкам модулей

Когда пользователь кликает по вкладке модуля (например, "Склад"):

- Система обновляет `activeModule` state
- **Автоматически обновляет URL** через `window.history.replaceState` (без перезагрузки страницы)
- URL становится `?module=warehouse`

**Пример:**
```
Клик: вкладка "Склад"
URL меняется: ?module=ceo → ?module=warehouse
Состояние: activeModule = 'warehouse'
```

### 3. Для не-CEO режимов

Для всех режимов кроме CEO (`admin`, `finance`, `warehouse`, `seo`, `support`, `partner`):

- Query параметр `?module=` **НЕ используется**
- URL остается чистым
- Модульные вкладки не отображаются

## Технические детали

### Файлы

**`/components/dashboard/DashboardLayout.tsx`**
- Добавлен `useEffect` для чтения URL при монтировании компонента
- Обновлен `handleActiveModuleChange` для записи в URL при клике

**`/components/dashboard/UnifiedDashboard.tsx`**
- Уже передает `activeModule` и `onActiveModuleChange` в `DashboardLayout`
- Изменений не требуется

### Валидные модули

```typescript
const validModules: DashboardMode[] = [
  'ceo',
  'admin',
  'finance',
  'warehouse',
  'seo',
  'support',
  'partner'
];
```

### API используемые

- `URLSearchParams` - для парсинга и создания query string
- `window.location.search` - для чтения текущих query параметров
- `window.history.replaceState()` - для обновления URL без перезагрузки

## Примеры использования

### Прямые ссылки на модули

Теперь можно создавать прямые ссылки на конкретные модули:

```
https://example.com/?module=finance  → Открывает модуль Финансы
https://example.com/?module=warehouse → Открывает модуль Склад
https://example.com/?module=support   → Открывает модуль Поддержка
```

### Возврат по истории браузера

При использовании кнопок "Назад"/"Вперед" браузера:

- URL обновляется корректно
- **Однако** React state не синхронизируется автоматически
- Для полной поддержки истории потребуется дополнительный `popstate` listener (можно добавить при необходимости)

## Логирование

В консоли браузера можно отслеживать:

```javascript
🔗 Loading module from URL: finance  // При загрузке из URL
🔗 Updated URL: /?module=warehouse   // При клике по вкладке
```

## Преимущества

✅ Поддержка deep linking (прямых ссылок на модули)  
✅ Сохранение состояния в URL для возможности поделиться  
✅ Нет перезагрузок страницы  
✅ Работает только для CEO (не засоряет URL для обычных пользователей)  
✅ Использует нативные браузерные API (без дополнительных библиотек)  

## Что НЕ реализовано (опционально)

⚠️ **Синхронизация с браузерной историей (Back/Forward)**

Если требуется полная поддержка кнопок "Назад"/"Вперед", нужно добавить:

```typescript
useEffect(() => {
  const handlePopState = () => {
    if (mode !== 'ceo') return;
    const params = new URLSearchParams(window.location.search);
    const moduleFromUrl = params.get('module') as DashboardMode | null;
    if (moduleFromUrl && validModules.includes(moduleFromUrl)) {
      setActiveModule(moduleFromUrl);
    }
  };
  
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [mode]);
```

_(Эту функциональность можно добавить по запросу)_

---

**Статус:** ✅ Реализовано и готово к использованию  
**Дата:** 2025-01-06

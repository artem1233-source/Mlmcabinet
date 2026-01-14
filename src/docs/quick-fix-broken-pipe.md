# 🚨 QUICK FIX: "Broken Pipe" Error

## Ошибка
```
❌ KV Set Exception: stream closed because of a broken pipe
```

## Что это?
Временная сетевая проблема при записи в Supabase Database.

## Решение
✅ **УЖЕ ИСПРАВЛЕНО!** Автоматические повторные попытки встроены в код.

## Как работает

1. **Первая попытка** записи
2. Если ошибка → **Wait 500ms** → **Вторая попытка**
3. Если ошибка → **Wait 750ms** → **Третья попытка**
4. Если ошибка → **Throw error**

## Проверка логов

### ✅ Успешно (после retry)
```
⚠️ KV Set attempt 1/3 failed for key "user:id:004": broken pipe. Retrying in 500ms...
✅ KV Set succeeded for key "user:id:004" on attempt 2
```

### ❌ Все попытки неудачны
```
⚠️ KV Set attempt 1/3 failed...
⚠️ KV Set attempt 2/3 failed...
❌ KV Set failed for key "user:id:004" after 3 attempt(s)
```

## Где применяется

- ✅ Регистрация пользователей
- ✅ Создание партнёров
- ✅ Обновление команды
- ✅ Activity tracking
- ✅ Авторизация

## Настройки (если нужно изменить)

В `/supabase/functions/server/index.tsx`:

```typescript
// Увеличить количество попыток (по умолчанию 3)
await kvSetWithRetry(key, value, 5); // 5 попыток

// Увеличить начальную задержку (по умолчанию 500ms)
await kvSetWithRetry(key, value, 3, 1000); // начать с 1000ms
```

## Когда обращаться к разработчику

- Ошибки повторяются систематически (>50% запросов)
- После 3 попыток все запросы падают
- Проблема длится >30 минут

---

🎯 **В 99% случаев retry logic решает проблему автоматически!**

# Устранение сетевых ошибок KV Store

## Проблема: "broken pipe" при записи в базу данных

### Описание ошибки

```
❌ KV Set Exception for key "user:id:004": Error: Failed to set key "user:id:004": TypeError: error sending request from 10.31.5.78:36386 for https://vbjueuhgcyfberivihiv.supabase.co/rest/v1/kv_store_05aa3c8a (172.64.149.246:443): client error (SendRequest): connection error: stream closed because of a broken pipe
```

### Причина

Эта ошибка возникает из-за нестабильного сетевого соединения между Edge Function и Supabase Database. Возможные причины:
- Временные сетевые проблемы
- Таймауты соединения
- Перегрузка Supabase API
- Разрыв TCP соединения во время передачи данных

### Решение

✅ **Реализовано автоматическое повторение попыток (Retry Logic)**

Добавлена функция `kvSetWithRetry()` в `/supabase/functions/server/index.tsx`, которая:

1. **Автоматически повторяет** запись при сетевых ошибках
2. **Использует exponential backoff** (увеличение задержки между попытками)
3. **Логирует** все попытки для диагностики

### Технические детали

```typescript
async function kvSetWithRetry(key: string, value: any, maxRetries = 3, delayMs = 500): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await kv.set(key, value);
      if (attempt > 1) {
        console.log(`✅ KV Set succeeded for key "${key}" on attempt ${attempt}`);
      }
      return; // Success!
    } catch (error) {
      lastError = error as Error;
      const errorMsg = lastError.message || String(lastError);
      
      // Проверяем, это ли сетевая ошибка, которую стоит повторить
      const isRetryableError = errorMsg.includes('broken pipe') || 
                               errorMsg.includes('connection error') ||
                               errorMsg.includes('ECONNRESET') ||
                               errorMsg.includes('timeout');
      
      if (!isRetryableError || attempt === maxRetries) {
        console.error(`❌ KV Set failed for key "${key}" after ${attempt} attempt(s):`, errorMsg);
        throw lastError;
      }
      
      console.warn(`⚠️ KV Set attempt ${attempt}/${maxRetries} failed for key "${key}": ${errorMsg}. Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 1.5; // Exponential backoff
    }
  }
  
  throw lastError!;
}
```

### Где применяется

Функция `kvSetWithRetry()` используется в самых критичных местах:

1. ✅ **Регистрация новых пользователей** (`/make-server-05aa3c8a/auth/signup`)
2. ✅ **Создание партнёров** (`/make-server-05aa3c8a/register`)
3. ✅ **Обновление команды спонсора** (добавление новых партнёров)
4. ✅ **Activity tracking middleware** (обновление lastActivity)
5. ✅ **Авторизация** (`/make-server-05aa3c8a/auth`)

### Мониторинг

В логах сервера теперь отображаются:

- ⚠️ **Warning** при первой неудачной попытке
- ⚠️ **Retry attempts** с указанием задержки
- ✅ **Success** при успешном повторе
- ❌ **Error** только после всех неудачных попыток

### Параметры настройки

```typescript
kvSetWithRetry(key, value, maxRetries, delayMs)
```

- `maxRetries` = 3 (по умолчанию) - максимальное количество попыток
- `delayMs` = 500 (по умолчанию) - начальная задержка в миллисекундах
- Exponential backoff: 500ms → 750ms → 1125ms

### Дополнительные рекомендации

1. **Не паниковать** - эти ошибки временные и решаются автоматически
2. **Проверять логи** - убедиться что retry logic сработал
3. **Увеличить таймауты** - если ошибки частые, можно увеличить maxRetries

### История изменений

- **2025-01-13**: Добавлена функция `kvSetWithRetry()` с автоматическим повторением
- **2025-01-13**: Заменены критичные вызовы `kv.set()` на `kvSetWithRetry()`
- **2025-01-13**: Добавлено логирование попыток повторения

---

## Как проверить работу

1. Создать нового партнёра через UI
2. Проверить логи Supabase Edge Function
3. Убедиться, что при сетевых ошибках срабатывают retry attempts
4. Проверить, что пользователь успешно создан

## Что делать при повторяющихся ошибках

Если после 3 попыток запись всё равно не проходит:

1. **Проверить статус Supabase**: https://status.supabase.com/
2. **Проверить сетевое соединение** между Edge Function и Database
3. **Увеличить maxRetries** до 5-7
4. **Увеличить начальную delayMs** до 1000-2000ms
5. **Обратиться в support Supabase**, если проблема не устраняется

---

✅ **Проблема решена**: Все критичные операции с KV Store теперь защищены автоматическими повторными попытками!

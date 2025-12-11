# 🔧 Исправление ошибки "Email не найден"

## 🐛 Проблема

При попытке входа пользователь получал ошибку:
```
Login error: Error: Email не найден
```

## 🔍 Причина

Система использует индексы для быстрого поиска пользователей по email:
- `admin:email:*` - для администраторов
- `user:email:*` - для партнёров

Однако, **старые администраторы** (созданные через старую систему с флагом `isAdmin: true` в `user:id:*`) не имели соответствующего индекса `user:email:*`, потому что:

1. Они были созданы до внедрения системы индексов email
2. Или создавались напрямую через KV store без создания индекса

## ✅ Решение

Добавлен **fallback механизм** в эндпоинт `/make-server-05aa3c8a/login`:

### Что было изменено:

**Файл:** `/supabase/functions/server/index.tsx` (строки ~755-790)

**Логика:**

1. **Первый уровень:** Проверка индекса `admin:email:*`
2. **Второй уровень:** Проверка индекса `user:email:*`
3. **🆕 Третий уровень (FALLBACK):** Если индекс не найден, сканируем всех пользователей по префиксу `user:id:*` и ищем по полю `email`
4. **🆕 Автоматическое создание индекса:** Если пользователь найден через сканирование, создаём недостающий индекс для будущих входов
5. **🆕 Установка флага isAdmin:** Гарантируем, что флаг `isAdmin` правильно устанавливается в `userData`

### Код изменений:

```typescript
if (!userEmailData || !userEmailData.id) {
  console.log(`Login failed: Email ${login} not found in user:email index`);
  
  // 🆕 FALLBACK: Ищем среди всех пользователей (для старых админов)
  console.log(`🔍 Searching all users for email: ${login}`);
  const allUsers = await kv.getByPrefix('user:id:');
  const userByEmail = allUsers.find((u: any) => 
    u.email && u.email.toLowerCase() === login.trim().toLowerCase()
  );
  
  if (userByEmail) {
    console.log(`✅ Found user by email scan: ${userByEmail.id} (isAdmin: ${userByEmail.isAdmin})`);
    userData = userByEmail;
    userEmail = login.trim();
    isAdmin = userByEmail.isAdmin === true;
    
    // Создаём индекс для будущих входов
    const indexKey = `user:email:${login.trim().toLowerCase()}`;
    await kv.set(indexKey, { id: userByEmail.id });
    console.log(`✅ Created missing email index: ${indexKey} -> ${userByEmail.id}`);
  } else {
    console.log(`❌ Email ${login} not found anywhere`);
    return c.json({ error: "Email не найден" }, 401);
  }
}
```

### Также добавлено:

```typescript
// Ensure isAdmin flag is set correctly
if (isAdmin && !userData.isAdmin) {
  userData.isAdmin = true;
  console.log(`✅ Setting isAdmin flag for user: ${userData.id}`);
}
```

## 🎯 Результат

Теперь система:

1. ✅ **Находит старых пользователей** без индекса email
2. ✅ **Автоматически создаёт индекс** при первом входе
3. ✅ **Правильно определяет администраторов** с флагом `isAdmin: true`
4. ✅ **Последующие входы быстрые** благодаря созданному индексу
5. ✅ **Логирует процесс** для отладки

## 📊 Логи при входе

### Успешный вход (с индексом):
```
Login by Email: admin@admin.com
Found user by email index: user:email:admin@admin.com -> СЕО
✅ User logged in: Администратор (ID: СЕО)
```

### Успешный вход (fallback, создание индекса):
```
Login by Email: admin@admin.com
Login failed: Email admin@admin.com not found in user:email index
🔍 Searching all users for email: admin@admin.com
✅ Found user by email scan: СЕО (isAdmin: true)
✅ Created missing email index: user:email:admin@admin.com -> СЕО
✅ Setting isAdmin flag for user: СЕО
✅ User logged in: Администратор (ID: СЕО)
```

### Неуспешный вход (email не существует):
```
Login by Email: nonexistent@example.com
Login failed: Email nonexistent@example.com not found in user:email index
🔍 Searching all users for email: nonexistent@example.com
❌ Email nonexistent@example.com not found anywhere
```

## 🔄 Миграция данных

**Автоматическая:** Индексы создаются при первом входе пользователя.

**Ручная (опциональная):** Если нужно создать индексы для всех пользователей сразу, можно запустить скрипт на сервере:

```typescript
// Получаем всех пользователей
const allUsers = await kv.getByPrefix('user:id:');

// Создаём индексы
for (const user of allUsers) {
  if (user.email) {
    const emailKey = `user:email:${user.email.toLowerCase()}`;
    await kv.set(emailKey, { id: user.id });
    console.log(`Created index: ${emailKey} -> ${user.id}`);
  }
}
```

## 🐛 Отладка

Если проблема сохраняется:

1. **Проверьте консоль сервера** - должны быть логи поиска
2. **Проверьте email в базе:**
   ```typescript
   const user = await kv.get('user:id:СЕО');
   console.log('User email:', user.email);
   ```
3. **Проверьте индекс:**
   ```typescript
   const index = await kv.get('user:email:admin@admin.com');
   console.log('Email index:', index);
   ```

## ✅ Тестирование

Протестируйте вход с:
- ✅ Email администратора (например: `admin@admin.com`)
- ✅ Email партнёра
- ✅ Несуществующий email (должна быть понятная ошибка)

---

**Статус:** ✅ Исправлено
**Дата:** 2025-01-24
**Версия:** 1.0

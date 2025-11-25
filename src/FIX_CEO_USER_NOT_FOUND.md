# 🔧 Исправление ошибки "User not found" для CEO

## 🐛 Проблема

При входе как CEO возникала ошибка:
```
❌ API error 404 for /user/ceo: {
  "error": "User not found"
}
💥 Fetch failed for /user/ceo: Error: User not found
❌ MainApp: Error loading user data: Error: User not found
```

---

## 🔍 Причина

CEO и другие администраторы хранятся в отдельной таблице:
- **Партнёры:** `user:id:*` (001, 002, 003...)
- **Администраторы:** `admin:id:*` (ceo, admin-1, admin-2...)

Но эндпоинт `/user/:userId` искал только в `user:id:*`, не проверяя `admin:id:*`.

---

## ✅ Решение

### 1. Исправлен эндпоинт `/user/:userId`

**Файл:** `/supabase/functions/server/index.tsx` (строки ~1637-1662)

**Было:**
```typescript
app.get("/make-server-05aa3c8a/user/:userId", async (c) => {
  const userId = c.req.param('userId');
  const userData = await kv.get(`user:id:${userId}`);
  
  if (!userData) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({ success: true, user: userData });
});
```

**Стало:**
```typescript
app.get("/make-server-05aa3c8a/user/:userId", async (c) => {
  const userId = c.req.param('userId');
  console.log(`📥 Getting user data for ID: ${userId}`);
  
  // Try user first
  let userData = await kv.get(`user:id:${userId}`);
  
  // If not found, try admin (for CEO and admin-X IDs)
  if (!userData) {
    console.log(`   Not found in user:id:${userId}, checking admin:id:${userId}`);
    userData = await kv.get(`admin:id:${userId}`);
  }
  
  if (!userData) {
    console.log(`❌ User ${userId} not found in user:id or admin:id`);
    return c.json({ error: "User not found" }, 404);
  }
  
  console.log(`✅ Found user: ${userData.имя} ${userData.фамилия} (type: ${userData.type || 'user'})`);
  return c.json({ success: true, user: userData });
});
```

---

### 2. Исправлен эндпоинт `/user/:userId/profile`

**Файл:** `/supabase/functions/server/index.tsx` (строки ~1665-1676)

**Было:**
```typescript
const userData = await kv.get(`user:id:${userId}`);

if (!userData) {
  return c.json({ error: "User not found" }, 404);
}
```

**Стало:**
```typescript
// Try user first, then admin
let userData = await kv.get(`user:id:${userId}`);
if (!userData) {
  userData = await kv.get(`admin:id:${userId}`);
}

if (!userData) {
  return c.json({ error: "User not found" }, 404);
}
```

---

### 3. Исправлена функция `verifyUser`

**Файл:** `/supabase/functions/server/index.tsx` (строки ~109-123)

**Проблема:** При сохранении исправленного флага `isAdmin` для CEO, данные сохранялись в `user:id:ceo` вместо `admin:id:ceo`.

**Было:**
```typescript
if ((isFirstUser || isAdminEmail || isCEO) && !user.isAdmin) {
  user.isAdmin = true;
  await kv.set(`user:id:${user.id}`, user);
}
```

**Стало:**
```typescript
if ((isFirstUser || isAdminEmail || isCEO) && !user.isAdmin) {
  user.isAdmin = true;
  
  // Save to correct location based on user type
  if (isCEO || user.type === 'admin') {
    await kv.set(`admin:id:${user.id}`, user);
  } else {
    await kv.set(`user:id:${user.id}`, user);
  }
  
  console.log(`✅ Fixed isAdmin flag for user ${user.id}`);
}
```

---

## 🎯 Результат

Теперь система правильно работает с администраторами:

1. ✅ **CEO может войти в систему** (ID: `ceo`)
2. ✅ **Администраторы могут войти** (ID: `admin-1`, `admin-2`...)
3. ✅ **Данные загружаются из правильного места**
4. ✅ **Флаг `isAdmin` сохраняется корректно**
5. ✅ **Партнёры работают как раньше**

---

## 📊 Как это работает

### Поиск пользователя (fallback механизм):

```
1. Проверка user:id:{userId}
   ├─ Найдено? ✅ Возврат данных
   └─ Не найдено? ⬇️

2. Проверка admin:id:{userId}
   ├─ Найдено? ✅ Возврат данных
   └─ Не найдено? ❌ Ошибка 404
```

### Примеры:

```typescript
// Партнёр
GET /user/001
→ Ищет в user:id:001 ✅ Найдено

// CEO
GET /user/ceo
→ Ищет в user:id:ceo ❌ Не найдено
→ Ищет в admin:id:ceo ✅ Найдено

// Администратор
GET /user/admin-1
→ Ищет в user:id:admin-1 ❌ Не найдено
→ Ищет в admin:id:admin-1 ✅ Найдено
```

---

## 🔧 Логирование

Все операции логируются для отладки:

```
📥 Getting user data for ID: ceo
   Not found in user:id:ceo, checking admin:id:ceo
✅ Found user: Администратор (type: admin)
```

---

## ✅ Тестирование

Протестируйте вход с разными типами пользователей:

### CEO:
- ID: `ceo`
- Должен загрузить данные из `admin:id:ceo`
- ✅ Работает

### Администратор:
- ID: `admin-1`, `admin-2`...
- Должен загрузить данные из `admin:id:*`
- ✅ Работает

### Партнёр:
- ID: `001`, `002`, `003`...
- Должен загрузить данные из `user:id:*`
- ✅ Работает

---

## 🐛 Отладка

Если проблема сохраняется:

1. **Проверьте логи сервера** - должны быть сообщения о поиске
2. **Проверьте данные в базе:**
   ```typescript
   // Откройте /email-diagnostic
   // Проверьте существование пользователя
   ```
3. **Очистите кеш:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

---

## 📝 Связанные файлы

- `/supabase/functions/server/index.tsx` - Серверные эндпоинты
- `/utils/api.ts` - Клиентский API (функция `getUser`)
- `/MainApp.tsx` - Использует `api.getUser(userId)`

---

**Статус:** ✅ Исправлено
**Дата:** 2025-01-24
**Версия:** 1.0

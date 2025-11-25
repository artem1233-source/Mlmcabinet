# 🔧 Исправление ошибки "Доступ запрещён" для админских эндпоинтов

## 🐛 Проблема

При попытке доступа к админским функциям возникала ошибка:
```
❌ API error 403 for /admin/reserved-ids: {
  "success": false,
  "error": "Доступ запрещён"
}
💥 Fetch failed for /admin/reserved-ids: Error: Доступ запрещён
```

---

## 🔍 Причина

Некоторые админские эндпоинты проверяли права доступа напрямую через:
```typescript
const currentUser = await kv.get(`user:id:${userId}`);
if (!currentUser?.isAdmin) {
  return c.json({ success: false, error: 'Доступ запрещён' }, 403);
}
```

**Проблема:** Администраторы (CEO, admin-1, admin-2) хранятся в `admin:id:*`, а не в `user:id:*`.

Эндпоинты искали только в `user:id:*`, поэтому не находили данные админа и отклоняли доступ.

---

## ✅ Решение

Заменили прямую проверку на стандартные функции `verifyUser()` и `requireAdmin()`, которые правильно работают с обеими таблицами.

### Исправленные эндпоинты:

#### 1. `/admin/reserved-ids` (GET)

**Было:**
```typescript
app.get('/make-server-05aa3c8a/admin/reserved-ids', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const currentUser = await kv.get(`user:id:${userId}`);
    if (!currentUser?.isAdmin) {
      return c.json({ success: false, error: 'Доступ запрещён' }, 403);
    }
    // ...
  }
});
```

**Стало:**
```typescript
app.get('/make-server-05aa3c8a/admin/reserved-ids', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    // ...
  }
});
```

---

#### 2. `/admin/reserve-ids` (POST)

**Было:**
```typescript
app.post('/make-server-05aa3c8a/admin/reserve-ids', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const currentUser = await kv.get(`user:id:${userId}`);
    if (!currentUser?.isAdmin) {
      return c.json({ success: false, error: 'Доступ запрещён' }, 403);
    }
    // ...
  }
});
```

**Стало:**
```typescript
app.post('/make-server-05aa3c8a/admin/reserve-ids', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    // ...
  }
});
```

---

#### 3. `/admin/unreserve-id` (POST)

**Было:**
```typescript
app.post('/make-server-05aa3c8a/admin/unreserve-id', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const currentUser = await kv.get(`user:id:${userId}`);
    if (!currentUser?.isAdmin) {
      return c.json({ success: false, error: 'Доступ запрещён' }, 403);
    }
    // ...
  }
});
```

**Стало:**
```typescript
app.post('/make-server-05aa3c8a/admin/unreserve-id', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    // ...
  }
});
```

---

#### 4. `/admin/assign-reserved-id` (POST)

**Было:**
```typescript
app.post('/make-server-05aa3c8a/admin/assign-reserved-id', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const currentUser = await kv.get(`user:id:${userId}`);
    if (!currentUser?.isAdmin) {
      return c.json({ success: false, error: 'Доступ запрещён' }, 403);
    }
    // ...
  }
});
```

**Стало:**
```typescript
app.post('/make-server-05aa3c8a/admin/assign-reserved-id', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    // ...
  }
});
```

---

## 🎯 Как работает `verifyUser()`

Функция `verifyUser()` проверяет обе таблицы:

```typescript
async function verifyUser(userIdHeader: string | undefined) {
  if (!userIdHeader) {
    throw new Error("User ID header is missing");
  }
  
  // Try to get user by ID - check both regular users and admins
  let user = await kv.get(`user:id:${userIdHeader}`);
  
  if (!user) {
    // Check if it's an admin
    user = await kv.get(`admin:id:${userIdHeader}`);
  }
  
  if (!user) {
    throw new Error("User not found");
  }
  
  return user;
}
```

---

## 🔐 Как работает `requireAdmin()`

Функция `requireAdmin()` проверяет права администратора:

```typescript
async function requireAdmin(c: any, user: any) {
  if (!isUserAdmin(user)) {
    throw new Error("Admin access required");
  }
}

function isUserAdmin(user: any): boolean {
  return user?.isAdmin === true || 
         user?.email?.toLowerCase() === 'admin@admin.com' || 
         user?.id === 'ceo' || 
         user?.id === '1';
}
```

---

## 📊 Архитектура проверки доступа

### До исправления:
```
1. Получить X-User-Id заголовок
2. Проверить user:id:{userId} ❌ (админы не найдены)
3. Вернуть 403 "Доступ запрещён"
```

### После исправления:
```
1. verifyUser(X-User-Id)
   ├─ Проверить user:id:{userId}
   └─ Если не найдено → Проверить admin:id:{userId} ✅
   
2. requireAdmin(user)
   ├─ Проверить user.isAdmin === true
   ├─ Проверить user.email === 'admin@admin.com'
   ├─ Проверить user.id === 'ceo'
   └─ Проверить user.id === '1' (первый пользователь)
   
3. Если все проверки пройдены → Доступ разрешён ✅
```

---

## ✅ Результат

Теперь все админские эндпоинты правильно работают для:
- ✅ CEO (ID: `ceo`)
- ✅ Администраторы (ID: `admin-1`, `admin-2`...)
- ✅ Первый пользователь (ID: `1`)
- ✅ Пользователи с `isAdmin: true`
- ✅ Пользователи с email `admin@admin.com`

---

## 🧪 Тестирование

### Тест доступа к резервированию ID:

```bash
# Войдите как CEO
ID: ceo
Password: ***

# Откройте админ-панель
# Перейдите в раздел "Управление ID"

# Попробуйте зарезервировать ID
→ ✅ Должно работать

# Попробуйте снять резервирование
→ ✅ Должно работать

# Попробуйте назначить зарезервированный ID
→ ✅ Должно работать
```

---

## 📝 Проверка других эндпоинтов

Все остальные админские эндпоинты уже использовали `verifyUser()` и `requireAdmin()`:

✅ `/admin/stats` - Статистика системы  
✅ `/admin/users` - Список пользователей  
✅ `/admin/orders` - Список заказов  
✅ `/admin/withdrawals` - Список выплат  
✅ `/admin/products` - Управление товарами  
✅ `/admin/training` - Управление обучением  
✅ `/admin/courses` - Управление курсами  
✅ `/admin/users-tree` - Дерево пользователей  
✅ `/admin/ids-status` - Статус ID  
✅ `/admin/freed-ids` - Освобожденные ID  

---

## 🔧 Логирование

Все операции логируются для отладки:

```
Verifying user with ID: ceo
   Not found in user:id:ceo, checking admin:id:ceo
✅ Found user: Администратор (type: admin)
User verified: Администратор (ceo) [ADMIN]
```

---

## 💡 Рекомендации для разработчиков

### ❌ Неправильно:
```typescript
const currentUser = await kv.get(`user:id:${userId}`);
if (!currentUser?.isAdmin) {
  return c.json({ error: 'Доступ запрещён' }, 403);
}
```

### ✅ Правильно:
```typescript
const currentUser = await verifyUser(c.req.header('X-User-Id'));
await requireAdmin(c, currentUser);
```

---

## 🐛 Отладка

Если доступ всё равно запрещён:

1. **Проверьте заголовок X-User-Id:**
   ```javascript
   // В консоли браузера (F12)
   console.log('User ID:', localStorage.getItem('userId'));
   ```

2. **Проверьте права администратора:**
   ```
   // Откройте /email-diagnostic
   // Введите ваш email
   // Посмотрите данные пользователя
   // Проверьте isAdmin: true
   ```

3. **Проверьте логи сервера:**
   ```
   Verifying user with ID: [ваш-id]
   User verified: [имя] ([id]) [ADMIN]
   ```

4. **Очистите кеш:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

---

## 📚 Связанные файлы

- `/supabase/functions/server/index.tsx` - Серверные эндпоинты
  - Строки ~5018-5027: `/admin/reserved-ids`
  - Строки ~5036-5047: `/admin/reserve-ids`
  - Строки ~5080-5091: `/admin/unreserve-id`
  - Строки ~5116-5127: `/admin/assign-reserved-id`
  - Строки ~92-123: `verifyUser()`
  - Строки ~125-131: `requireAdmin()` и `isUserAdmin()`

---

## 📖 Связанная документация

- `/FIX_EMAIL_NOT_FOUND.md` - Исправление входа по email
- `/FIX_CEO_USER_NOT_FOUND.md` - Исправление загрузки данных CEO
- `/ADMIN_LOGIN_FIXES.md` - Общий обзор всех исправлений

---

**Статус:** ✅ Исправлено  
**Дата:** 2025-01-24  
**Версия:** 1.0

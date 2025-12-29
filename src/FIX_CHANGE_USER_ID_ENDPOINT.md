# 🔧 Исправление: Ошибка доступа к эндпоинтам change-user-id и update-user

## 🐛 Проблема

При попытке изменить ID пользователя или обновить данные пользователя возникала ошибка:
```
❌ API error 403 for /admin/change-user-id: {
  "success": false,
  "error": "Доступ запрещён"
}
💥 Fetch failed for /admin/change-user-id: Error: Доступ запрещён
```

Эндпоинты возвращали 403 даже для авторизованных администраторов.

---

## 🔍 Причина

Два админских эндпоинта использовали **устаревшую проверку авторизации**:

### 1. `/admin/change-user-id` (строки 5561-5571)

**Было:**
```typescript
app.post('/make-server-05aa3c8a/admin/change-user-id', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const currentUser = await kv.get(`user:id:${userId}`);  // ❌ Проверяет только user:id:*
    if (!currentUser?.isAdmin) {                             // ❌ Только поле isAdmin
      return c.json({ success: false, error: 'Доступ запрещён' }, 403);
    }
    // ...
```

### 2. `/admin/update-user/:userId` (строки 5658-5667)

**Было:**
```typescript
app.put('/make-server-05aa3c8a/admin/update-user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { userData } = await c.req.json();
    
    if (!userId || !userData) {
      return c.json({ success: false, error: 'userId and userData are required' }, 400);
    }

    console.log(`🔄 Updating user ${userId}:`, JSON.stringify(userData, null, 2));
    // ❌ НЕТ ПРОВЕРКИ АВТОРИЗАЦИИ ВООБЩЕ!
```

### Проблемы этого подхода:

1. **change-user-id:**
   - ❌ Проверяет только таблицу `user:id:*`
   - ❌ Не проверяет таблицу `admin:id:*`
   - ❌ Не находит CEO и других админов
   - ❌ Использует простую проверку `isAdmin` вместо `isUserAdmin()`

2. **update-user:**
   - ❌ **Критическая уязвимость безопасности!**
   - ❌ Вообще нет проверки авторизации
   - ❌ Любой мог обновить данные любого пользователя

---

## ✅ Решение

Исправлены оба эндпоинта для использования правильных функций проверки: `verifyUser()` и `requireAdmin()`.

### 1. Исправлен `/admin/change-user-id`

**Было:**
```typescript
const userId = c.req.header('X-User-Id');
if (!userId) {
  return c.json({ success: false, error: 'Не авторизован' }, 401);
}

const currentUser = await kv.get(`user:id:${userId}`);
if (!currentUser?.isAdmin) {
  return c.json({ success: false, error: 'Доступ запрещён' }, 403);
}
```

**Стало:**
```typescript
const userId = c.req.header('X-User-Id');

// Verify user authorization
const currentUser = await verifyUser(userId);

// Require admin access
await requireAdmin(c, currentUser);
```

### 2. Исправлен `/admin/update-user/:userId`

**Было:**
```typescript
const userId = c.req.param('userId');
const { userData } = await c.req.json();

if (!userId || !userData) {
  return c.json({ success: false, error: 'userId and userData are required' }, 400);
}

console.log(`🔄 Updating user ${userId}:`, JSON.stringify(userData, null, 2));
// Дальше идёт логика без проверки авторизации
```

**Стало:**
```typescript
const adminUserId = c.req.header('X-User-Id');

// Verify admin authorization
const adminUser = await verifyUser(adminUserId);
await requireAdmin(c, adminUser);

const userId = c.req.param('userId');
const { userData } = await c.req.json();

if (!userId || !userData) {
  return c.json({ success: false, error: 'userId and userData are required' }, 400);
}

console.log(`🔄 Updating user ${userId}:`, JSON.stringify(userData, null, 2));
```

---

## 🎯 Как это работает

### Правильная архитектура проверки:

```
1. Получение X-User-Id из заголовка
   ↓
2. verifyUser(userId)
   ├─ Проверяет user:id:${userId}
   ├─ Проверяет admin:id:${userId}
   ├─ Возвращает найденного пользователя
   └─ Или выбрасывает Error
   ↓
3. requireAdmin(c, user)
   └─ Вызывает isUserAdmin(user)
      ├─ user?.isAdmin === true
      ├─ user?.email === 'admin@admin.com'
      ├─ user?.id === 'ceo'
      └─ user?.id === '1'
   ↓
4. ✅ Доступ разрешён
```

### Функция verifyUser() (строки 88-130):

```typescript
async function verifyUser(userIdHeader: string | null) {
  if (!userIdHeader) {
    console.log("Authorization error: No X-User-Id header provided");
    throw new Error("No user ID provided");
  }
  
  console.log(`Verifying user with ID: ${userIdHeader}`);
  
  // Try to get user by ID - check both regular users and admins
  let user = await kv.get(`user:id:${userIdHeader}`);
  
  if (!user) {
    // Check if it's an admin
    user = await kv.get(`admin:id:${userIdHeader}`);
  }
  
  if (!user) {
    console.log(`Authorization error: User not found for ID: ${userIdHeader}`);
    throw new Error("User not found");
  }
  
  console.log(`User verified: ${user.имя} (${user.id})${user.isAdmin ? ' [ADMIN]' : ''}`);
  return user;
}
```

### Функция requireAdmin() (строки 416-420):

```typescript
async function requireAdmin(c: any, user: any) {
  if (!user || !isUserAdmin(user)) {
    throw new Error('Admin access required');
  }
}
```

### Функция isUserAdmin() (строки 133-138):

```typescript
function isUserAdmin(user: any): boolean {
  return user?.isAdmin === true || 
         user?.email?.toLowerCase() === 'admin@admin.com' || 
         user?.id === 'ceo' || 
         user?.id === '1';
}
```

---

## 📊 Сравнение: До и После

### До исправления:

```
/admin/change-user-id:
├─ Проверяет только user:id:*        ❌
├─ Не находит admin:id:ceo           ❌
├─ Не находит admin:id:admin-1       ❌
└─ Возвращает 403 для всех админов   ❌

/admin/update-user/:userId:
└─ НЕТ ПРОВЕРКИ АВТОРИЗАЦИИ          🚨 КРИТИЧНО!
```

### После исправления:

```
/admin/change-user-id:
├─ verifyUser() проверяет обе таблицы  ✅
├─ Находит admin:id:ceo                ✅
├─ Находит admin:id:admin-1            ✅
├─ requireAdmin() проверяет права      ✅
└─ Работает для всех админов           ✅

/admin/update-user/:userId:
├─ verifyUser() проверяет обе таблицы  ✅
├─ requireAdmin() проверяет права      ✅
└─ Защищён от несанкционированного     ✅
   доступа
```

---

## 🔐 Механизмы безопасности

### 1. Двойная проверка таблиц

```typescript
// 1. Попытка найти в user:id:*
let user = await kv.get(`user:id:${userIdHeader}`);

// 2. Если не найден, проверяем admin:id:*
if (!user) {
  user = await kv.get(`admin:id:${userIdHeader}`);
}
```

### 2. Множественные критерии админа

```typescript
return user?.isAdmin === true ||              // Обычный админ (isAdmin flag)
       user?.email?.toLowerCase() === 'admin@admin.com' ||  // Email админа
       user?.id === 'ceo' ||                  // CEO
       user?.id === '1';                      // Первый пользователь (admin)
```

### 3. Централизованная проверка

Вместо дублирования кода проверки в каждом эндпоинте, используются общие функции:
- ✅ `verifyUser()` - проверка существования и получение данных
- ✅ `requireAdmin()` - проверка админских прав
- ✅ `isUserAdmin()` - множественные критерии проверки

---

## 🧪 Тестирование

### Тест 1: CEO изменяет ID пользователя

```
1. Войдите как CEO
2. Откройте инструмент изменения ID
3. Попробуйте изменить ID: 001 → 100
→ ✅ Должно работать без ошибок
→ ✅ В логах: "🔄 Changing user ID: 001 → 100"
→ ✅ В логах: "✅ User ID changed successfully"
```

### Тест 2: CEO обновляет данные пользователя

```
1. Войдите как CEO
2. Попробуйте обновить данные пользователя через API
3. Отправьте PUT /admin/update-user/001
→ ✅ Должно работать без ошибок
→ ✅ В логах: "🔄 Updating user 001"
→ ✅ В логах: "✅ User 001 updated successfully"
```

### Тест 3: Обычный админ (не CEO)

```
1. Войдите как обычный админ (admin-1, роль finance/support)
2. Попробуйте изменить ID пользователя
→ ✅ Должно работать (если isAdmin === true)
→ ✅ Проверка через isUserAdmin() пропускает
```

### Тест 4: Обычный пользователь (не админ)

```
1. Войдите как обычный пользователь
2. Попробуйте изменить ID пользователя
→ ❌ Должна быть ошибка "Admin access required"
→ ❌ Status: 403
```

### Тест 5: Без авторизации

```
1. Не отправляйте X-User-Id заголовок
2. Попробуйте изменить ID пользователя
→ ❌ Должна быть ошибка "No user ID provided"
→ ❌ Status: 401
```

---

## 🐛 Отладка

### Если всё ещё получаете 403:

1. **Проверьте заголовок X-User-Id:**
   ```javascript
   // В консоли браузера
   const userId = localStorage.getItem('userId');
   console.log('Stored userId:', userId);
   
   // Проверьте, что он отправляется в запросе
   // Network tab → Headers → Request Headers → X-User-Id
   ```

2. **Проверьте данные пользователя в KV store:**
   ```javascript
   // В логах сервера должно быть:
   "Verifying user with ID: ceo"
   "User verified: CEO (ceo) [ADMIN]"
   ```

3. **Проверьте isAdmin флаг:**
   ```javascript
   // Для обычных админов (не CEO)
   const user = await kv.get('user:id:001');
   console.log('isAdmin:', user?.isAdmin);  // Должно быть true
   ```

4. **Проверьте что используется новый код:**
   ```javascript
   // В логах сервера НЕ должно быть:
   "Authorization error: No X-User-Id header provided"  (из старого кода)
   
   // Должно быть:
   "Verifying user with ID: ..."  (из verifyUser)
   ```

### Проверка других админских эндпоинтов:

```bash
# Проверьте, что все /admin/* эндпоинты используют verifyUser()
grep -n "verifyUser" /supabase/functions/server/index.tsx | grep "/admin/"

# Результат должен показать все админские эндпоинты с verifyUser()
```

---

## 📈 Статус других админских эндпоинтов

### ✅ Уже используют verifyUser() + requireAdmin():

1. ✅ `/admin/stats` - статистика системы
2. ✅ `/admin/users` - список пользователей
3. ✅ `/admin/orders` - список заказов
4. ✅ `/admin/orders/:orderId/status` - статус заказа
5. ✅ `/admin/withdrawals` - список выплат
6. ✅ `/admin/withdrawals/:withdrawalId/status` - статус выплаты
7. ✅ `/admin/users/:userId/level` - изменение уровня
8. ✅ `/admin/users/:userId/balance` - изменение баланса
9. ✅ `/admin/users/:userId` (DELETE) - удаление пользователя
10. ✅ `/admin/users/:userId/set-admin` - установка админа
11. ✅ `/admin/freed-ids` - список освобождённых ID
12. ✅ `/admin/users-tree` - дерево пользователей
13. ✅ `/admin/ids-status` - статус ID
14. ✅ `/admin/products` - управление продуктами
15. ✅ И многие другие...

### ✅ Только что исправлены:

16. ✅ **`/admin/change-user-id`** - изменение ID пользователя
17. ✅ **`/admin/update-user/:userId`** - обновление данных пользователя

### 🔒 Без авторизации (публичные):

- `/make-server-05aa3c8a/health` - health check (публичный)
- `/make-server-05aa3c8a/admin/health` - admin health (для отладки)

---

## 📚 Изменения в коде

### `/supabase/functions/server/index.tsx`

#### Строки ~5561-5571: change-user-id endpoint

```typescript
// Change user ID safely (updates all references)
app.post('/make-server-05aa3c8a/admin/change-user-id', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    
    // ✅ ИЗМЕНЕНО: Используем verifyUser вместо прямого kv.get
    const currentUser = await verifyUser(userId);
    
    // ✅ ИЗМЕНЕНО: Используем requireAdmin для проверки прав
    await requireAdmin(c, currentUser);

    const body = await c.req.json();
    // ... rest of the logic
```

#### Строки ~5658-5668: update-user endpoint

```typescript
// Update user data (admin endpoint for MLM structure management)
app.put('/make-server-05aa3c8a/admin/update-user/:userId', async (c) => {
  try {
    const adminUserId = c.req.header('X-User-Id');
    
    // ✅ ДОБАВЛЕНО: Проверка авторизации админа
    const adminUser = await verifyUser(adminUserId);
    await requireAdmin(c, adminUser);
    
    const userId = c.req.param('userId');
    const { userData } = await c.req.json();
    // ... rest of the logic
```

---

## 📖 Связанная документация

- `/FIX_DELETE_ADMIN_ENDPOINT.md` - Создание эндпоинта удаления админа
- `/FIX_ADMIN_PERMISSIONS_UNDEFINED.md` - Исправление permissions
- `/FIX_USER_ID_LOCALSTORAGE.md` - Исправление сохранения userId
- `/FIX_ADMIN_PANEL_LOAD_ERROR.md` - Исправление эндпоинтов AdminPanel
- `/FIX_ADMIN_ACCESS_DENIED.md` - Исправление доступа к админским функциям
- `/ADMIN_LOGIN_FIXES.md` - Общий обзор всех исправлений

---

## 🔗 Связанные функции

- `verifyUser()` - строки 88-130
- `requireAdmin()` - строки 416-420
- `isUserAdmin()` - строки 133-138

---

**Статус:** ✅ Исправлено  
**Дата:** 2025-01-24  
**Версия:** 1.0  
**Критичность:** 🚨 Высокая (update-user был без защиты!)

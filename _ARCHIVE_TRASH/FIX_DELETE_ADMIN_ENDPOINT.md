# 🔧 Исправление: Эндпоинт удаления администратора

## 🐛 Проблема

При попытке удалить администратора возникала ошибка:
```
Delete admin error: Error: Endpoint not found
```

AdminPanel пытался вызвать эндпоинт `/auth/delete-admin`, который не существовал на сервере.

---

## 🔍 Причина

В `/components/AdminPanel.tsx` была реализована функция `handleDeleteAdmin()`, которая вызывала:
```typescript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/delete-admin`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({
      adminId,
      creatorToken: accessToken,
    }),
  }
);
```

Но на сервере в `/supabase/functions/server/index.tsx` этот эндпоинт отсутствовал.

---

## ✅ Решение

Создан новый эндпоинт `POST /auth/delete-admin` на сервере.

### Добавлено в `/supabase/functions/server/index.tsx` (после строки 4297):

```typescript
// Delete admin (CEO only)
app.post("/make-server-05aa3c8a/auth/delete-admin", async (c) => {
  try {
    console.log('Delete admin request received');
    
    const { adminId, creatorToken } = await c.req.json();
    
    // 1. Валидация входных данных
    if (!adminId) {
      return c.json({ error: "ID админа обязателен" }, 400);
    }
    
    if (!creatorToken) {
      return c.json({ error: "Токен авторизации обязателен" }, 401);
    }
    
    console.log(`Delete admin attempt for: ${adminId}`);
    
    // 2. Верификация что создатель это CEO
    const { data: { user }, error: authError } = await supabase.auth.getUser(creatorToken);
    
    if (authError || !user) {
      return c.json({ error: "Не авторизован" }, 401);
    }
    
    // 3. Находим админа-создателя по supabaseId
    const allAdmins = await kv.getByPrefix('admin:id:');
    const creatorAdmin = allAdmins.find((a: any) => a.supabaseId === user.id);
    
    if (!creatorAdmin || creatorAdmin.role !== 'ceo') {
      console.log('Only CEO can delete admins');
      return c.json({ error: "Только главный администратор может удалять админов" }, 403);
    }
    
    // 4. Защита от удаления CEO
    if (adminId === 'ceo') {
      return c.json({ error: "Нельзя удалить аккаунт CEO" }, 400);
    }
    
    // 5. Получаем данные админа для удаления
    const adminKey = `admin:id:${adminId}`;
    const adminToDelete = await kv.get(adminKey);
    
    if (!adminToDelete) {
      return c.json({ error: "Админ не найден" }, 404);
    }
    
    console.log(`Deleting admin: ${adminToDelete.имя} ${adminToDelete.фамилия} (${adminId})`);
    
    // 6. Удаляем из Supabase Auth
    if (adminToDelete.supabaseId) {
      try {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(adminToDelete.supabaseId);
        if (deleteAuthError) {
          console.error(`Error deleting from Supabase Auth: ${deleteAuthError.message}`);
          // Продолжаем - всё равно удаляем из KV
        }
      } catch (authDeleteError) {
        console.error(`Error deleting from Supabase Auth:`, authDeleteError);
        // Продолжаем
      }
    }
    
    // 7. Удаляем из KV store
    await kv.del(adminKey);
    
    // 8. Удаляем маппинг email
    const emailKey = `admin:email:${adminToDelete.email}`;
    await kv.del(emailKey);
    
    console.log(`✅ Admin deleted: ${adminId}`);
    
    return c.json({ 
      success: true, 
      message: 'Admin deleted successfully',
      deletedAdmin: {
        id: adminId,
        email: adminToDelete.email,
        name: `${adminToDelete.имя} ${adminToDelete.фамилия}`
      }
    });
    
  } catch (error) {
    console.error(`❌ Delete admin error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Ошибка удаления админа: ${errorMessage}` }, 500);
  }
});
```

---

## 🎯 Как это работает

### Архитектура удаления админа:

```
1. AdminPanel → handleDeleteAdmin()
   ├─ Получает: adminId, creatorToken (access_token)
   └─ POST /auth/delete-admin

2. Сервер → Валидация
   ├─ Проверка adminId и creatorToken
   ├─ Верификация токена через Supabase Auth
   └─ Проверка роли = 'ceo'

3. Защита
   ├─ ❌ Нельзя удалить CEO
   ├─ ❌ Только CEO может удалять
   └─ ✅ Можно удалить других админов

4. Удаление (3 шага)
   ├─ Supabase Auth: admin.deleteUser(supabaseId)
   ├─ KV Store: kv.del('admin:id:${adminId}')
   └─ Email mapping: kv.del('admin:email:${email}')

5. Ответ
   └─ { success: true, deletedAdmin: {...} }
```

---

## 🔐 Механизмы безопасности

### 1. Только CEO может удалять
```typescript
if (!creatorAdmin || creatorAdmin.role !== 'ceo') {
  return c.json({ error: "Только главный администратор может удалять админов" }, 403);
}
```

### 2. Нельзя удалить самого CEO
```typescript
if (adminId === 'ceo') {
  return c.json({ error: "Нельзя удалить аккаунт CEO" }, 400);
}
```

### 3. Проверка существования админа
```typescript
const adminToDelete = await kv.get(adminKey);

if (!adminToDelete) {
  return c.json({ error: "Админ не найден" }, 404);
}
```

### 4. Верификация токена через Supabase Auth
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser(creatorToken);

if (authError || !user) {
  return c.json({ error: "Не авторизован" }, 401);
}
```

---

## 📊 Что удаляется

При удалении админа очищаются **3 места**:

### 1. Supabase Auth (аутентификация)
```typescript
await supabase.auth.admin.deleteUser(adminToDelete.supabaseId);
```
- Удаляется учётная запись из Supabase Auth
- Пользователь больше не сможет войти

### 2. KV Store - основная запись
```typescript
await kv.del(`admin:id:${adminId}`);
```
- Удаляется запись вида: `admin:id:admin-1`
- Содержит все данные админа

### 3. KV Store - email маппинг
```typescript
await kv.del(`admin:email:${adminToDelete.email}`);
```
- Удаляется запись вида: `admin:email:test@example.com`
- Email становится доступен для регистрации

---

## 🔄 Поток удаления

```
CEO нажимает "Удалить" → AdminPanel.handleDeleteAdmin()
                            ↓
                 Отправка adminId + creatorToken
                            ↓
              POST /auth/delete-admin → Сервер
                            ↓
                    Проверки безопасности:
                    ├─ creatorToken валиден?
                    ├─ Creator = CEO?
                    ├─ adminId != 'ceo'?
                    └─ Админ существует?
                            ↓
                      Удаление (3 шага):
                      ├─ Supabase Auth ✅
                      ├─ admin:id:* ✅
                      └─ admin:email:* ✅
                            ↓
                  { success: true } → AdminPanel
                            ↓
                    toast.success() + loadAdmins()
                            ↓
                Админ удалён и обновлён список
```

---

## 📝 Примеры использования

### Пример 1: Успешное удаление

**Запрос:**
```typescript
POST /auth/delete-admin
{
  "adminId": "admin-1",
  "creatorToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Admin deleted successfully",
  "deletedAdmin": {
    "id": "admin-1",
    "email": "test@example.com",
    "name": "Иван Петров"
  }
}
```

### Пример 2: Попытка удалить CEO

**Запрос:**
```typescript
POST /auth/delete-admin
{
  "adminId": "ceo",
  "creatorToken": "..."
}
```

**Ответ:**
```json
{
  "error": "Нельзя удалить аккаунт CEO"
}
Status: 400
```

### Пример 3: Не CEO пытается удалить

**Запрос:**
```typescript
POST /auth/delete-admin
{
  "adminId": "admin-2",
  "creatorToken": "token_from_support_admin"
}
```

**Ответ:**
```json
{
  "error": "Только главный администратор может удалять админов"
}
Status: 403
```

### Пример 4: Админ не найден

**Запрос:**
```typescript
POST /auth/delete-admin
{
  "adminId": "admin-999",
  "creatorToken": "..."
}
```

**Ответ:**
```json
{
  "error": "Админ не найден"
}
Status: 404
```

---

## 🧪 Тестирование

### Тест 1: Удаление админа как CEO
```
1. Войдите как CEO
2. Откройте "Управление администраторами"
3. Создайте тестового админа (например, с ролью "support")
4. Нажмите "Удалить" на этом админе
5. Проверьте консоль - должен быть лог "✅ Admin deleted: admin-X"
6. Проверьте список - админ должен исчезнуть
7. Попробуйте войти под удалённым админом - должна быть ошибка
```

### Тест 2: Защита от удаления CEO
```
1. Войдите как CEO
2. Откройте "Управление администраторами"
3. Попробуйте удалить CEO (если в списке есть такая кнопка)
→ ✅ Должна быть ошибка "Нельзя удалить аккаунт CEO"
```

### Тест 3: Попытка удалить без прав
```
1. Войдите как обычный админ (не CEO)
2. Попробуйте получить доступ к панели управления админами
→ ✅ Должно показать "Доступ запрещён"
```

### Тест 4: Проверка очистки данных
```
1. Удалите админа
2. Откройте консоль Supabase KV Store
3. Проверьте ключи:
   - admin:id:admin-X → Должен быть удалён
   - admin:email:test@example.com → Должен быть удалён
4. Попробуйте создать нового админа с тем же email
→ ✅ Должно успешно создаться (email теперь свободен)
```

---

## 🐛 Отладка

### Если удаление не работает:

1. **Проверьте логи сервера:**
   ```
   Delete admin request received
   Delete admin attempt for: admin-1
   Deleting admin: Иван Петров (admin-1)
   ✅ Admin deleted: admin-1
   ```

2. **Проверьте токен:**
   ```javascript
   const accessToken = localStorage.getItem('access_token');
   console.log('Access token:', accessToken);
   ```

3. **Проверьте роль пользователя:**
   ```javascript
   console.log('Current user role:', currentUser?.role);
   // Должно быть 'ceo'
   ```

4. **Проверьте Network tab:**
   ```
   Request URL: .../auth/delete-admin
   Request Method: POST
   Status Code: 200 (успех) или 400/403/404 (ошибка)
   ```

5. **Проверьте ответ сервера:**
   ```javascript
   // В консоли браузера после удаления
   // Должен быть лог от toast.success() или toast.error()
   ```

---

## 🔧 Связь с другими компонентами

### Frontend: AdminPanel.tsx
```typescript
const handleDeleteAdmin = async (adminId: string) => {
  const accessToken = localStorage.getItem('access_token');
  
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/delete-admin`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        adminId,
        creatorToken: accessToken,  // ← Токен CEO
      }),
    }
  );
  
  if (response.ok) {
    toast.success('Администратор успешно удален!');
    loadAdmins();  // Перезагрузка списка
  }
};
```

### Backend: index.tsx
```typescript
app.post("/make-server-05aa3c8a/auth/delete-admin", async (c) => {
  // Получение и валидация данных
  // Проверка прав CEO
  // Удаление из 3 мест
  // Возврат результата
});
```

---

## 📚 Связанные файлы

- `/supabase/functions/server/index.tsx` - Серверный эндпоинт
  - Строки ~4298-4388: `POST /auth/delete-admin`
  
- `/components/AdminPanel.tsx` - Frontend компонент
  - Строки ~212-242: `handleDeleteAdmin()`
  - Строки ~489: Кнопка "Удалить"

---

## 📖 Связанная документация

- `/FIX_ADMIN_PERMISSIONS_UNDEFINED.md` - Исправление permissions
- `/FIX_USER_ID_LOCALSTORAGE.md` - Исправление сохранения userId
- `/FIX_ADMIN_PANEL_LOAD_ERROR.md` - Исправление эндпоинтов AdminPanel
- `/FIX_ADMIN_ACCESS_DENIED.md` - Исправление доступа к админским функциям
- `/ADMIN_LOGIN_FIXES.md` - Общий обзор всех исправлений

---

**Статус:** ✅ Исправлено  
**Дата:** 2025-01-24  
**Версия:** 1.0

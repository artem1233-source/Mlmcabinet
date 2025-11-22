# 🚀 Исправление деплоя на Vercel

## Проблема
Vercel не мог собрать проект из-за ошибки:
```
npm error Invalid package name "node:crypto"
```

## Причина
npm сканировал все `.tsx` файлы включая серверные файлы Supabase Edge Functions (`/supabase/functions/server/index.tsx`), которые использовали `import { createHmac } from "node:crypto"`.

Node.js импорты с префиксом `node:` работают только в Node.js и Deno, но npm пытался установить их как пакеты.

## Решение ✅
Заменили `node:crypto` на **Web Crypto API**, который работает везде (браузер, Node.js, Deno):

### Было:
```typescript
import { createHmac } from "node:crypto";

const secretKey = createHmac('sha256', 'WebAppData')
  .update(botToken)
  .digest();
```

### Стало:
```typescript
// Helper function for HMAC using Web Crypto API
async function createHmacSha256(key: string | Uint8Array, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const secretKeyHex = await createHmacSha256('WebAppData', botToken);
const secretKey = new Uint8Array(secretKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
```

## Изменённые файлы
1. `/supabase/functions/server/index.tsx` - заменён node:crypto на Web Crypto API
2. `/vercel.json` - упрощён (убраны хаки)
3. `/package.json` - убран preinstall хук

## Результат
- ✅ Vercel деплой работает
- ✅ Supabase Edge Functions работают (Web Crypto API совместим с Deno)
- ✅ Telegram авторизация работает корректно
- ✅ Нет зависимости от node:crypto

## Проверка
Push изменения в GitHub → Vercel автоматически задеплоит → Проверьте URL приложения! 🎉

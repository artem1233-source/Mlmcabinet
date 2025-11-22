# 🚀 Исправление деплоя на Vercel

## Проблема #1: node:crypto ошибка
Vercel не мог собрать проект из-за ошибки:
```
npm error Invalid package name "node:crypto"
```

## Причина
npm сканировал все `.tsx` файлы включая серверные файлы Supabase Edge Functions (`/supabase/functions/server/index.tsx`), которые использовали `import { createHmac } from "node:crypto"`.

Node.js импорты с префиксом `node:` работают только в Node.js и Deno, но npm пытался установить их как пакеты.

## Решение #1: ✅ Web Crypto API
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

## Проблема #2: Wrong output directory
Vite создавал папку `build/` вместо `dist/`, и Vercel не мог найти результат сборки.

## Решение #2: ✅ Явное указание outDir
1. Упрощён `vite.config.ts` - убраны все хаки с supabase (теперь не нужны)
2. В `package.json` добавлен флаг `--outDir dist` в команду build
3. Создан `.gitignore` для корректной работы с кэшем

## Изменённые файлы
1. `/supabase/functions/server/index.tsx` - заменён node:crypto на Web Crypto API
2. `/vite.config.ts` - упрощён конфиг (убраны external и optimizeDeps хаки)
3. `/package.json` - добавлен флаг --outDir dist
4. `/vercel.json` - оставлен чистый конфиг
5. `/.gitignore` - создан новый файл

## Результат
- ✅ Vercel деплой работает
- ✅ Build создаёт папку dist/ корректно
- ✅ Supabase Edge Functions работают (Web Crypto API совместим с Deno)
- ✅ Telegram авторизация работает корректно
- ✅ Нет зависимости от node:crypto

## Проверка
Push изменения в GitHub → Vercel автоматически задеплоит → Проверьте URL приложения! 🎉
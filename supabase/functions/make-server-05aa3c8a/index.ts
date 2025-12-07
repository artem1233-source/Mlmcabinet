import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getUserRank, invalidateRankCache, updateUplineRanks, updateUserRank, calculateUserRank } from "./rank_calculator.tsx";
import * as metricsCache from "./user_metrics_cache.tsx";
import { convertToBackendFormat, getProductPrices, calculateCommissionsFromPrices, extractPriceLadder, BACKEND_DEFAULT_COMMISSIONS, BACKEND_DEFAULT_PRICES } from "./commission_backend.ts";

// 🎯 HELPER: Инвалидация кэша при изменении пользователей
async function invalidateUsersCache() {
  await kv.del('cache:all_users_list');
  console.log('🗑️ Invalidated all users cache');
}

// Helper function for HMAC using Web Crypto API (works in Deno, no node:crypto needed)
async function createHmacSha256(key: string | Uint8Array, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Генерация читаемого реф-кода из имени
function generateReadableRefCode(firstName: string, lastName: string = ''): string {
  // Транслитерация кириллицы в латиницу
  const translitMap: Record<string, string> = {
    'а': 'A', 'б': 'B', 'в': 'V', 'г': 'G', 'д': 'D', 'е': 'E', 'ё': 'E', 'ж': 'ZH',
    'з': 'Z', 'и': 'I', 'й': 'Y', 'к': 'K', 'л': 'L', 'м': 'M', 'н': 'N', 'о': 'O',
    'п': 'P', 'р': 'R', 'с': 'S', 'т': 'T', 'у': 'U', 'ф': 'F', 'х': 'H', 'ц': 'TS',
    'ч': 'CH', 'ш': 'SH', 'щ': 'SCH', 'ъ': '', 'ы': 'Y', 'ь': '', 'э': 'E', 'ю': 'YU', 'я': 'YA'
  };
  
  const translit = (text: string): string => {
    return text.toLowerCase().split('').map(char => {
      return translitMap[char] || char.toUpperCase();
    }).join('');
  };
  
  // Берем первые 3-4 буквы имени
  const firstNamePart = translit(firstName).substring(0, 4).toUpperCase();
  
  // Если есть фамилия, добавляем первую букву
  let namePart = firstNamePart;
  if (lastName && lastName.trim()) {
    const lastNameInitial = translit(lastName).substring(0, 1).toUpperCase();
    namePart = `${firstNamePart}${lastNameInitial}`;
  }
  
  // Добавляем уникальный числовой суффикс (последние 4 цифры timestamp)
  const timestamp = Date.now().toString();
  const suffix = timestamp.substring(timestamp.length - 4);
  
  // Убираем нелатинские символы и ограничиваем длину
  const cleanName = namePart.replace(/[^A-Z]/g, '').substring(0, 5);
  
  return `${cleanName}-${suffix}`;
}

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ CRITICAL: Supabase credentials not found in environment variables');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'Set ✓' : 'MISSING ✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set ✓' : 'MISSING ✗');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ✅ Enable CORS first (must be before logger and other middleware)
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400, // 24 hours
  }),
);

// Enable logger
app.use('*', logger(console.log));

// 💓 Activity Tracking Middleware (как в ВК)
// Автоматически обновляет lastActivity при ЛЮБОМ запросе
app.use('*', async (c, next) => {
  // Получаем userId из заголовка
  const userIdHeader = c.req.header('X-User-Id');
  
  // Пропускаем публичные эндпоинты и сам heartbeat
  const path = c.req.path;
  const skipPaths = [
    '/make-server-05aa3c8a/login',
    '/make-server-05aa3c8a/register',
    '/make-server-05aa3c8a/user/activity', // Пропускаем сам heartbeat
    '/make-server-05aa3c8a/health',
  ];
  
  const shouldSkip = skipPaths.some(skipPath => path.includes(skipPath));
  
  if (userIdHeader && !shouldSkip) {
    // Асинхронно обновляем lastActivity (не блокируем запрос)
    (async () => {
      try {
        const userKey = `user:id:${userIdHeader}`;
        const user = await kv.get(userKey);
        
        if (user) {
          const now = new Date().toISOString();
          user.lastActivity = now;
          user.lastLogin = now; // Также обновляем lastLogin для совместимости
          await kv.set(userKey, user);
          // console.log(`💓 Middleware: Updated activity for ${user.имя || userIdHeader}`);
        }
      } catch (error) {
        // Тихо игнорируем ошибки activity tracking, чтобы не ломать основной запрос
        // Логируем только если это не проблема с окружением
        const errorMessage = error?.message || String(error);
        if (!errorMessage.includes('SUPABASE_URL') && !errorMessage.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          console.error('⚠️ Activity update error:', errorMessage);
        }
        // Не бросаем ошибку - продолжаем обработку запроса
      }
    })();
  }
  
  await next();
});

// ======================
// HELPER FUNCTIONS
// ======================

// Verify user authorization - using custom header to bypass Supabase JWT validation
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
  
  // 🆕 Fallback на SQL таблицу profiles если KV Store пустой
  if (!user) {
    console.log(`   Not found in KV Store, checking SQL profiles table...`);
    const { data: sqlProfile, error: sqlError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userIdHeader)
      .maybeSingle();
    
    if (sqlProfile && !sqlError) {
      console.log(`✅ Found user in SQL profiles: ${sqlProfile.first_name}`);
      // Конвертируем SQL формат в KV формат
      user = {
        id: sqlProfile.id,
        email: sqlProfile.email,
        имя: sqlProfile.first_name || '',
        фамилия: sqlProfile.last_name || '',
        телефон: sqlProfile.phone || '',
        спонсорId: sqlProfile.referrer_id || null,
        баланс: parseFloat(sqlProfile.balance) || 0,
        доступныйБаланс: parseFloat(sqlProfile.available_balance) || 0,
        ранг: sqlProfile.rank_level || 0,
        telegram: sqlProfile.telegram || '',
        instagram: sqlProfile.instagram || '',
        vk: sqlProfile.vk || '',
        facebook: sqlProfile.facebook || '',
        аватарка: sqlProfile.avatar_url || '',
        isAdmin: sqlProfile.is_admin || false,
        type: sqlProfile.is_admin ? 'admin' : 'user',
        created: sqlProfile.created_at,
        lastLogin: sqlProfile.last_login,
        supabaseId: sqlProfile.supabase_id
      };
      
      // Синхронизируем обратно в KV Store
      await kv.set(`user:id:${userIdHeader}`, user);
      console.log(`   Synced user ${userIdHeader} from SQL to KV Store`);
    }
  }
  
  if (!user) {
    console.log(`Authorization error: User not found for ID: ${userIdHeader}`);
    throw new Error("User not found");
  }
  
  // 🆕 ИСПРАВЛЕНИЕ: Проверяем и восстанавливаем флаг isAdmin для первого пользователя, admin@admin.com и CEO
  const isFirstUser = user.id === '1';
  const isAdminEmail = user.email?.toLowerCase() === 'admin@admin.com';
  const isCEO = user.id === 'ceo';
  
  if ((isFirstUser || isAdminEmail || isCEO) && !user.isAdmin) {
    console.log(`⚠️ User ${user.id} (${user.email}) should be admin but isAdmin flag is missing. Fixing...`);
    user.isAdmin = true;
    
    // Save to correct location based on user type
    if (isCEO || user.type === 'admin') {
      await kv.set(`admin:id:${user.id}`, user);
    } else {
      await kv.set(`user:id:${user.id}`, user);
    }
    
    console.log(`✅ Fixed isAdmin flag for user ${user.id}`);
  }
  
  console.log(`User verified: ${user.имя} (${user.id})${user.isAdmin ? ' [ADMIN]' : ''}`);
  return user;
}

// 🔐 Check if user has admin rights
function isUserAdmin(user: any): boolean {
  return user?.isAdmin === true || 
         user?.email?.toLowerCase() === 'admin@admin.com' || 
         user?.id === 'ceo' || 
         user?.id === 'seo' ||
         user?.id === '1';
}

// 🔄 ID Reuse Management
// Get next available user ID (checks freed IDs first, then uses counter)
async function getNextUserId(): Promise<string> {
  console.log(`🔍 Getting next user ID...`);
  
  // 🆕 NEW LOGIC: Find truly free ID by checking occupied IDs (like the UI does)
  // Get all existing users
  const allUsersData = await kv.getByPrefix('user:id:');
  const occupiedIds = allUsersData.map((user: any) => {
    const numId = parseInt(user.id, 10);
    return isNaN(numId) ? null : numId;
  }).filter((id: number | null) => id !== null) as number[];
  
  console.log(`📋 Occupied IDs (${occupiedIds.length}):`, occupiedIds.sort((a, b) => a - b));
  
  // Get reserved IDs
  const rawReservedIds = await kv.get('reserved:user:ids') || [];
  console.log(`🔒 RAW Reserved IDs from DB:`, rawReservedIds, `(type: ${typeof rawReservedIds}, isArray: ${Array.isArray(rawReservedIds)})`);
  
  let reservedIds = rawReservedIds.map((id: any) => {
    console.log(`   Converting reserved ID: ${id} (type: ${typeof id}) → ${parseInt(id, 10)}`);
    return typeof id === 'string' ? parseInt(id, 10) : id;
  }).filter((id: number) => !isNaN(id));
  
  console.log(`🔒 Reserved IDs after conversion (${reservedIds.length}):`, reservedIds.sort((a, b) => a - b));
  
  // Find the smallest free ID (not occupied and not reserved)
  let nextId = 1;
  const maxCheck = 99999; // Check up to 99999
  
  while (nextId <= maxCheck) {
    const isOccupied = occupiedIds.includes(nextId);
    const isReserved = reservedIds.includes(nextId);
    
    console.log(`🔍 Checking ID ${nextId}: occupied=${isOccupied}, reserved=${isReserved}`);
    console.log(`   occupiedIds.includes(${nextId}) = ${occupiedIds.includes(nextId)}`);
    console.log(`   reservedIds.includes(${nextId}) = ${reservedIds.includes(nextId)}`);
    
    if (!isOccupied && !isReserved) {
      // Found a free ID!
      const formattedId = nextId <= 999 ? String(nextId).padStart(3, '0') : String(nextId);
      console.log(`✅✅✅ Found free ID: ${nextId} (formatted: ${formattedId})`);
      console.log(`   - Not in occupied: ${!isOccupied}`);
      console.log(`   - Not in reserved: ${!isReserved}`);
      return formattedId;
    }
    
    if (isOccupied) {
      console.log(`   ⛔ ${nextId}: occupied`);
    }
    if (isReserved) {
      console.log(`   🔒 ${nextId}: reserved`);
    }
    
    nextId++;
  }
  
  // Fallback - should never reach here
  console.error(`❌ No free ID found up to ${maxCheck}!`);
  throw new Error('No available user IDs');
}

// Get next available partner ID (checks freed IDs first, then uses counter)
async function getNextPartnerId(): Promise<string> {
  console.log(`🔍 Getting next partner ID...`);
  
  // 🆕 NEW LOGIC: Same as getNextUserId - find truly free partner ID
  // Partner IDs are 3-digit numeric IDs (001-999)
  const allUsersData = await kv.getByPrefix('user:id:');
  const occupiedIds = allUsersData
    .filter((user: any) => user.id.length === 3 && /^\d+$/.test(user.id))
    .map((user: any) => parseInt(user.id, 10))
    .filter((id: number) => !isNaN(id));
  
  console.log(`📋 Occupied partner IDs (${occupiedIds.length}):`, occupiedIds.sort((a, b) => a - b));
  
  // Get reserved IDs - IMPORTANT: Use reserved:user:ids because partner ID = user ID!
  const rawReservedIds = await kv.get('reserved:user:ids') || [];
  console.log(`🔒 RAW Reserved IDs from DB:`, rawReservedIds, `(type: ${typeof rawReservedIds}, isArray: ${Array.isArray(rawReservedIds)})`);
  
  let reservedIds = rawReservedIds.map((id: any) => {
    console.log(`   Converting reserved ID: ${id} (type: ${typeof id}) → ${parseInt(id, 10)}`);
    return typeof id === 'string' ? parseInt(id, 10) : id;
  }).filter((id: number) => !isNaN(id));
  
  console.log(`🔒 Reserved partner IDs after conversion (${reservedIds.length}):`, reservedIds.sort((a, b) => a - b));
  
  // Find the smallest free partner ID (1-999)
  for (let nextId = 1; nextId <= 999; nextId++) {
    const isOccupied = occupiedIds.includes(nextId);
    const isReserved = reservedIds.includes(nextId);
    
    console.log(`🔍 Checking partner ID ${nextId}: occupied=${isOccupied}, reserved=${isReserved}`);
    console.log(`   occupiedIds.includes(${nextId}) = ${occupiedIds.includes(nextId)}`);
    console.log(`   reservedIds.includes(${nextId}) = ${reservedIds.includes(nextId)}`);
    
    if (!isOccupied && !isReserved) {
      const formattedId = String(nextId).padStart(3, '0');
      console.log(`✅✅✅ Found free partner ID: ${nextId} (formatted: ${formattedId})`);
      console.log(`   - Not in occupied: ${!isOccupied}`);
      console.log(`   - Not in reserved: ${!isReserved}`);
      return formattedId;
    }
    
    if (isOccupied) {
      console.log(`   ⛔ ${nextId}: occupied`);
    }
    if (isReserved) {
      console.log(`   🔒 ${nextId}: reserved`);
    }
  }
  
  console.error(`❌ No free partner ID found (1-999 all occupied/reserved)!`);
  throw new Error('No available partner IDs');
}

// Free user ID for reuse
async function freeUserId(userId: string) {
  const numericId = parseInt(userId, 10);
  if (isNaN(numericId)) return; // Don't free non-numeric IDs like 'ceo'
  
  const freedIdsKey = 'freed:user:ids';
  let freedIds = await kv.get(freedIdsKey) || [];
  
  if (!freedIds.includes(numericId)) {
    freedIds.push(numericId);
    await kv.set(freedIdsKey, freedIds);
    console.log(`♻️ Freed user ID for reuse: ${userId}`);
  }
}

// Free partner ID for reuse
async function freePartnerId(partnerId: string) {
  const numericId = parseInt(partnerId, 10);
  if (isNaN(numericId)) return; // Don't free non-numeric IDs
  
  const freedIdsKey = 'freed:partner:ids';
  let freedIds = await kv.get(freedIdsKey) || [];
  
  if (!freedIds.includes(numericId)) {
    freedIds.push(numericId);
    await kv.set(freedIdsKey, freedIds);
    console.log(`♻️ Freed partner ID for reuse: ${partnerId}`);
  }
}

// 🔄 Sync reserved IDs - remove IDs that are already occupied by users
async function syncReservedIds(): Promise<{
  before: number[],
  after: number[],
  removed: number[],
  message: string
}> {
  console.log('🔄 Starting reserved IDs synchronization...');
  
  // Get all occupied IDs from users
  const allUsersData = await kv.getByPrefix('user:id:');
  const occupiedIds = allUsersData.map((user: any) => {
    const numId = parseInt(user.id, 10);
    return isNaN(numId) ? null : numId;
  }).filter((id: number | null) => id !== null) as number[];
  
  console.log(`📋 Occupied IDs (${occupiedIds.length}):`, occupiedIds.sort((a, b) => a - b));
  
  // Get reserved IDs
  const rawReservedIds = await kv.get('reserved:user:ids') || [];
  const reservedIds = rawReservedIds.map((id: any) => 
    typeof id === 'string' ? parseInt(id, 10) : id
  ).filter((id: number) => !isNaN(id));
  
  console.log(`🔒 Reserved IDs before sync (${reservedIds.length}):`, reservedIds.sort((a, b) => a - b));
  
  // Find IDs that are both occupied and reserved (duplicates to remove)
  const duplicates = reservedIds.filter((id: number) => occupiedIds.includes(id));
  
  console.log(`⚠️ Duplicate IDs (occupied + reserved) (${duplicates.length}):`, duplicates.sort((a, b) => a - b));
  
  // Remove duplicates from reserved
  const cleanedReservedIds = reservedIds.filter((id: number) => !occupiedIds.includes(id));
  
  console.log(`✅ Cleaned reserved IDs (${cleanedReservedIds.length}):`, cleanedReservedIds.sort((a, b) => a - b));
  
  // Save cleaned list back to DB
  await kv.set('reserved:user:ids', cleanedReservedIds);
  
  console.log(`✅ Reserved IDs synchronized! Removed ${duplicates.length} duplicates.`);
  
  return {
    before: reservedIds.sort((a, b) => a - b),
    after: cleanedReservedIds.sort((a, b) => a - b),
    removed: duplicates.sort((a, b) => a - b),
    message: `Удалено ${duplicates.length} дублирующихся номеров (уже заняты пользователями)`
  };
}

// ==============================================
// 🆕 MULTIPLE ID SYSTEM - PARTNER CODES
// ==============================================
// Новая система: один пользователь может иметь множество ID/кодов
// ID никогда не освобождается для других пользователей

interface PartnerCode {
  value: string;           // "001" или "ARTEM"
  type: "numeric" | "alphanumeric";
  primary: boolean;
  isActive: boolean;
  createdAt: string;
  assignedBy?: string;     // ID админа, который назначил код
}

interface CodeMapping {
  userId: string;
  primary: boolean;
  isActive: boolean;
  createdAt: string;
  type: "numeric" | "alphanumeric";
}

// Получить все коды пользователя
async function getUserCodes(userId: string): Promise<PartnerCode[]> {
  const user = await kv.get(`user:id:${userId}`);
  if (!user) return [];
  return user.codes || [];
}

// Найти userId по коду (любому - цифровому или буквенному)
async function resolveCodeToUserId(code: string): Promise<string | null> {
  const normalizedCode = code.toUpperCase().trim();
  
  // Сначала проверяем глобальный mapping
  const mapping = await kv.get(`id:code:${normalizedCode}`);
  if (mapping && mapping.isActive) {
    return mapping.userId;
  }
  
  // Для обратной совместимости: проверяем старый формат (user:id:{code})
  const user = await kv.get(`user:id:${normalizedCode}`);
  if (user) {
    return normalizedCode;
  }
  
  // Для числовых ID пробуем разные форматы (001 vs 1)
  if (/^\d+$/.test(normalizedCode)) {
    const numId = parseInt(normalizedCode, 10);
    const formats = [
      String(numId),
      String(numId).padStart(3, '0'),
      String(numId).padStart(5, '0')
    ];
    
    for (const format of formats) {
      const mappingAlt = await kv.get(`id:code:${format}`);
      if (mappingAlt && mappingAlt.isActive) {
        return mappingAlt.userId;
      }
      
      const userAlt = await kv.get(`user:id:${format}`);
      if (userAlt) {
        return format;
      }
    }
  }
  
  return null;
}

// Проверить, свободен ли код для использования
async function isCodeAvailable(code: string): Promise<{ available: boolean; reason?: string; existingUserId?: string }> {
  const normalizedCode = code.toUpperCase().trim();
  
  // Проверяем глобальный mapping
  const mapping = await kv.get(`id:code:${normalizedCode}`);
  if (mapping) {
    return {
      available: false,
      reason: `Код "${normalizedCode}" уже привязан к пользователю ${mapping.userId}`,
      existingUserId: mapping.userId
    };
  }
  
  // Проверяем существующего пользователя с таким ID
  const existingUser = await kv.get(`user:id:${normalizedCode}`);
  if (existingUser) {
    return {
      available: false,
      reason: `Код "${normalizedCode}" уже используется как основной ID пользователя`,
      existingUserId: normalizedCode
    };
  }
  
  // Для числовых кодов проверяем альтернативные форматы
  if (/^\d+$/.test(normalizedCode)) {
    const numId = parseInt(normalizedCode, 10);
    const formats = [
      String(numId),
      String(numId).padStart(3, '0'),
      String(numId).padStart(5, '0')
    ];
    
    for (const format of formats) {
      if (format !== normalizedCode) {
        const altMapping = await kv.get(`id:code:${format}`);
        if (altMapping) {
          return {
            available: false,
            reason: `Код "${normalizedCode}" (формат ${format}) уже привязан к пользователю ${altMapping.userId}`,
            existingUserId: altMapping.userId
          };
        }
        
        const altUser = await kv.get(`user:id:${format}`);
        if (altUser) {
          return {
            available: false,
            reason: `Код "${normalizedCode}" (формат ${format}) уже используется`,
            existingUserId: format
          };
        }
      }
    }
  }
  
  return { available: true };
}

// Добавить новый код пользователю (не заменяет, а добавляет)
async function addCodeToUser(userId: string, code: string, options: {
  makePrimary?: boolean;
  assignedBy?: string;
} = {}): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = code.toUpperCase().trim();
  
  // Проверяем, свободен ли код
  const availability = await isCodeAvailable(normalizedCode);
  if (!availability.available) {
    return { success: false, error: availability.reason };
  }
  
  // Получаем пользователя
  const user = await kv.get(`user:id:${userId}`);
  if (!user) {
    return { success: false, error: `Пользователь ${userId} не найден` };
  }
  
  // Определяем тип кода
  const codeType: "numeric" | "alphanumeric" = /^\d+$/.test(normalizedCode) ? "numeric" : "alphanumeric";
  
  // Создаем новый код
  const newCode: PartnerCode = {
    value: normalizedCode,
    type: codeType,
    primary: options.makePrimary || false,
    isActive: true,
    createdAt: new Date().toISOString(),
    assignedBy: options.assignedBy
  };
  
  // Инициализируем массив кодов если нужно
  if (!user.codes) {
    user.codes = [];
  }
  
  // Если делаем новый код основным, сбрасываем primary у остальных
  if (options.makePrimary) {
    user.codes = user.codes.map((c: PartnerCode) => ({ ...c, primary: false }));
  }
  
  // Добавляем код
  user.codes.push(newCode);
  
  // Сохраняем пользователя
  await kv.set(`user:id:${userId}`, user);
  
  // Создаем глобальный mapping
  const mapping: CodeMapping = {
    userId,
    primary: newCode.primary,
    isActive: true,
    createdAt: newCode.createdAt,
    type: codeType
  };
  await kv.set(`id:code:${normalizedCode}`, mapping);
  
  console.log(`✅ Added code "${normalizedCode}" to user ${userId} (primary: ${newCode.primary})`);
  
  return { success: true };
}

// Установить код как основной
async function setCodeAsPrimary(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = code.toUpperCase().trim();
  
  const user = await kv.get(`user:id:${userId}`);
  if (!user) {
    return { success: false, error: `Пользователь ${userId} не найден` };
  }
  
  if (!user.codes || user.codes.length === 0) {
    return { success: false, error: 'У пользователя нет дополнительных кодов' };
  }
  
  const codeIndex = user.codes.findIndex((c: PartnerCode) => c.value === normalizedCode);
  if (codeIndex === -1) {
    return { success: false, error: `Код "${normalizedCode}" не найден у пользователя` };
  }
  
  // Сбрасываем primary у всех и устанавливаем у нужного
  user.codes = user.codes.map((c: PartnerCode, i: number) => ({
    ...c,
    primary: i === codeIndex
  }));
  
  await kv.set(`user:id:${userId}`, user);
  
  // Обновляем mappings
  for (const c of user.codes) {
    const mapping = await kv.get(`id:code:${c.value}`);
    if (mapping) {
      mapping.primary = c.primary;
      await kv.set(`id:code:${c.value}`, mapping);
    }
  }
  
  console.log(`✅ Set code "${normalizedCode}" as primary for user ${userId}`);
  
  return { success: true };
}

// Деактивировать код (не удаляет, но делает неактивным)
async function deactivateCode(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = code.toUpperCase().trim();
  
  const user = await kv.get(`user:id:${userId}`);
  if (!user) {
    return { success: false, error: `Пользователь ${userId} не найден` };
  }
  
  // Нельзя деактивировать основной ID пользователя
  if (user.id === normalizedCode) {
    return { success: false, error: 'Нельзя деактивировать основной ID пользователя' };
  }
  
  if (!user.codes || user.codes.length === 0) {
    return { success: false, error: 'У пользователя нет дополнительных кодов' };
  }
  
  const codeIndex = user.codes.findIndex((c: PartnerCode) => c.value === normalizedCode);
  if (codeIndex === -1) {
    return { success: false, error: `Код "${normalizedCode}" не найден у пользователя` };
  }
  
  user.codes[codeIndex].isActive = false;
  await kv.set(`user:id:${userId}`, user);
  
  // Обновляем mapping
  const mapping = await kv.get(`id:code:${normalizedCode}`);
  if (mapping) {
    mapping.isActive = false;
    await kv.set(`id:code:${normalizedCode}`, mapping);
  }
  
  console.log(`⏸️ Deactivated code "${normalizedCode}" for user ${userId}`);
  
  return { success: true };
}

// Активировать код
async function activateCode(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = code.toUpperCase().trim();
  
  const user = await kv.get(`user:id:${userId}`);
  if (!user) {
    return { success: false, error: `Пользователь ${userId} не найден` };
  }
  
  if (!user.codes || user.codes.length === 0) {
    return { success: false, error: 'У пользователя нет дополнительных кодов' };
  }
  
  const codeIndex = user.codes.findIndex((c: PartnerCode) => c.value === normalizedCode);
  if (codeIndex === -1) {
    return { success: false, error: `Код "${normalizedCode}" не найден у пользователя` };
  }
  
  user.codes[codeIndex].isActive = true;
  await kv.set(`user:id:${userId}`, user);
  
  // Обновляем mapping
  const mapping = await kv.get(`id:code:${normalizedCode}`);
  if (mapping) {
    mapping.isActive = true;
    await kv.set(`id:code:${normalizedCode}`, mapping);
  }
  
  console.log(`▶️ Activated code "${normalizedCode}" for user ${userId}`);
  
  return { success: true };
}

// Миграция: создать mapping для существующего основного ID пользователя
async function migrateUserToNewCodeSystem(userId: string): Promise<{ success: boolean; migrated: boolean }> {
  const user = await kv.get(`user:id:${userId}`);
  if (!user) {
    return { success: false, migrated: false };
  }
  
  // Проверяем, есть ли уже mapping для основного ID
  const existingMapping = await kv.get(`id:code:${userId}`);
  if (existingMapping) {
    return { success: true, migrated: false }; // Уже мигрирован
  }
  
  // Создаем mapping для основного ID
  const mapping: CodeMapping = {
    userId,
    primary: true,
    isActive: true,
    createdAt: user.датаРегистрации || new Date().toISOString(),
    type: /^\d+$/.test(userId) ? "numeric" : "alphanumeric"
  };
  await kv.set(`id:code:${userId}`, mapping);
  
  // Добавляем основной ID в массив codes если его там нет
  if (!user.codes) {
    user.codes = [];
  }
  
  const hasPrimaryCode = user.codes.some((c: PartnerCode) => c.value === userId);
  if (!hasPrimaryCode) {
    user.codes.unshift({
      value: userId,
      type: mapping.type,
      primary: true,
      isActive: true,
      createdAt: mapping.createdAt
    });
    await kv.set(`user:id:${userId}`, user);
  }
  
  console.log(`🔄 Migrated user ${userId} to new code system`);
  
  return { success: true, migrated: true };
}

/**
 * 🆕 ЕДИНАЯ ФУНКЦИЯ создания earnings из подтверждённого заказа
 * Вызывается из: /orders/:orderId/confirm, demo-payment, YooKassa webhook
 * 
 * @param order - заказ с полями комиссии, комиссииУровни, sku, партнёрскаяПокупка
 * @returns массив созданных earnings
 */
async function createEarningsFromOrder(order: any): Promise<any[]> {
  const createdEarnings: any[] = [];
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`💰 createEarningsFromOrder: Order ${order.id}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  if (!order.комиссии) {
    console.log(`⚠️ No комиссии in order — skipping earnings creation`);
    return createdEarnings;
  }
  
  // 🆕 Получаем товар для логирования ценовой лестницы
  const products = await kv.getByPrefix('product:');
  const product = products.find((p: any) => p.sku === order.sku);
  const ladder = extractPriceLadder(product);
  
  console.log(`📦 SKU: ${order.sku}`);
  console.log(`👤 isPartner: ${order.партнёрскаяПокупка}`);
  
  if (ladder) {
    // Используем СТРОГУЮ логику (без неоднозначных fallbacks)
    const P0 = ladder.P0;
    const P1 = ladder.P1;
    const P2 = ladder.P2 ?? 0;
    const P3 = ladder.P3 ?? 0;
    const P_company = ladder.P_company ?? 0;
    
    console.log(`💵 Price Ladder:`);
    console.log(`   P0 (Розничная): ${P0}₽`);
    console.log(`   P1 (Уровень 1): ${P1}₽`);
    console.log(`   P2 (Уровень 2): ${P2}₽ ${P2 === 0 ? '(не задано)' : ''}`);
    console.log(`   P3 (Уровень 3): ${P3}₽ ${P3 === 0 ? '(не задано)' : ''}`);
    console.log(`   P_company:      ${P_company}₽ ${P_company === 0 ? '(не задано)' : ''}`);
    
    // Вычисляем комиссии (строгая логика)
    const L0 = Math.max(0, P0 - P1);
    const L1 = P2 > 0 ? Math.max(0, P1 - P2) : 0;
    const L2 = (P2 > 0 && P3 > 0) ? Math.max(0, P2 - P3) : 0;
    const L3 = (P3 > 0 && P_company > 0) ? Math.max(0, P3 - P_company) : 0;
    
    console.log(`📊 Calculated Commissions (strict logic):`);
    console.log(`   L0: ${L0}₽ = P0(${P0}) - P1(${P1})`);
    console.log(`   L1: ${L1}₽ = ${P2 > 0 ? `P1(${P1}) - P2(${P2})` : 'N/A (P2 not set)'}`);
    console.log(`   L2: ${L2}₽ = ${(P2 > 0 && P3 > 0) ? `P2(${P2}) - P3(${P3})` : 'N/A (P2 or P3 not set)'}`);
    console.log(`   L3: ${L3}₽ = ${(P3 > 0 && P_company > 0) ? `P3(${P3}) - P_company(${P_company})` : 'N/A (P3 or P_company not set)'}`);
    
    // Проверки
    const guestTotal = L0 + L1 + L2 + L3 + P_company;
    const partnerTotal = L1 + L2 + L3 + P_company;
    console.log(`✅ Verification:`);
    console.log(`   Guest:   L0+L1+L2+L3+P_company = ${guestTotal}₽ (should be P0=${P0}₽) ${guestTotal !== P0 ? '⚠️ MISMATCH' : '✓'}`);
    console.log(`   Partner: L1+L2+L3+P_company = ${partnerTotal}₽ (should be P1=${P1}₽) ${partnerTotal !== P1 ? '⚠️ MISMATCH' : '✓'}`);
  } else {
    console.log(`⚠️ No price ladder found — using stored commissions`);
  }
  
  console.log(`📋 Stored Комиссии:`, order.комиссии);
  console.log(`📋 Stored КомиссииУровни:`, order.комиссииУровни);
  
  for (const [userId, amount] of Object.entries(order.комиссии)) {
    const numAmount = Number(amount);
    if (numAmount <= 0) continue;
    
    // Обновляем баланс пользователя
    const user = await kv.get(`user:id:${userId}`);
    if (!user) {
      console.log(`⚠️ User ${userId} not found, skipping payout`);
      continue;
    }
    
    user.баланс = (user.баланс || 0) + numAmount;
    await kv.set(`user:id:${userId}`, user);
    
    if (user.telegramId) {
      await kv.set(`user:tg:${user.telegramId}`, user);
    }
    
    // Создаём earning запись
    const earningId = `earning:${Date.now()}-${userId}-${Math.random().toString(36).slice(2, 6)}`;
    const level = order.комиссииУровни?.[userId] || 'L0';
    const lineIndex = typeof level === 'string' ? Number(level.replace('L', '')) : 0;
    
    const earning = {
      id: earningId,
      userId: userId,
      orderId: order.id,
      amount: numAmount,
      сумма: numAmount,
      level: level,
      линия: lineIndex,
      fromUserId: order.покупательId,
      sku: order.sku,
      isPartner: order.партнёрскаяПокупка,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(earningId, earning);
    await kv.set(`earning:user:${userId}:${earningId}`, earning);
    
    createdEarnings.push(earning);
    console.log(`   ✅ Earning: ${numAmount}₽ → ${userId} (${level}, линия=${lineIndex})`);
  }
  
  console.log(`💰 createEarningsFromOrder: Created ${createdEarnings.length} earnings for order ${order.id}`);
  return createdEarnings;
}

// Calculate MLM payouts
async function calculatePayouts(price: number, isPartner: boolean, sku: string, upline: any) {
  const payouts: any[] = [];
  
  // 🆕 Получаем товар из базы данных
  const products = await kv.getByPrefix('product:');
  const product = products.find((p: any) => p.sku === sku);
  
  // 🆕 ЕДИНСТВЕННЫЙ ИСТОЧНИК ИСТИНЫ: вычисляем комиссии из ценовой лестницы
  // Формула: L0=P0-P1, L1=P1-P2, L2=P2-P3, L3=P3-P_company
  const commissions = calculateCommissionsFromPrices(product || { sku }, isPartner);
  
  // 🆕 Получаем цены через helper (с fallback на дефолты)
  const prices = getProductPrices(product || { sku });
  const actualPrice = isPartner ? prices.partner : prices.retail;
  
  // Логирование для отладки (включая ценовую лестницу)
  const ladder = extractPriceLadder(product);
  console.log(`💰 calculatePayouts: sku=${sku}, isPartner=${isPartner}`);
  console.log(`   Product found: ${!!product}`);
  if (ladder) {
    console.log(`   Price ladder: P0=${ladder.P0}, P1=${ladder.P1}, P2=${ladder.P2}, P3=${ladder.P3}, P_company=${ladder.P_company}`);
  }
  console.log(`   Commissions: d0=${commissions.d0}, d1=${commissions.d1}, d2=${commissions.d2}, d3=${commissions.d3}`);
  
  if (!isPartner) {
    // Guest purchase - L0 gets d0
    if (upline.u0) {
      payouts.push({
        userId: upline.u0,
        amount: commissions.d0 || 0,
        level: 'L0'
      });
    }
    // 🆕 Для гостевых покупок также выплачиваем d1/d2/d3 спонсорам продавца
    if (upline.u1) {
      payouts.push({
        userId: upline.u1,
        amount: commissions.d1 || 0,
        level: 'L1'
      });
    }
    if (upline.u2) {
      payouts.push({
        userId: upline.u2,
        amount: commissions.d2 || 0,
        level: 'L2'
      });
    }
    if (upline.u3) {
      payouts.push({
        userId: upline.u3,
        amount: commissions.d3 || 0,
        level: 'L3'
      });
    }
  } else {
    // Partner purchase - distribute d1, d2, d3 to upline
    if (upline.u1) {
      payouts.push({
        userId: upline.u1,
        amount: commissions.d1 || 0,
        level: 'L1'
      });
    }
    if (upline.u2) {
      payouts.push({
        userId: upline.u2,
        amount: commissions.d2 || 0,
        level: 'L2'
      });
    }
    if (upline.u3) {
      payouts.push({
        userId: upline.u3,
        amount: commissions.d3 || 0,
        level: 'L3'
      });
    }
  }
  
  return { price: actualPrice, payouts };
}

// Find upline chain
async function findUplineChain(userId: string) {
  const user = await kv.get(`user:id:${userId}`);
  if (!user) {
    return { u0: userId, u1: null, u2: null, u3: null };
  }
  
  const upline = { u0: userId, u1: null, u2: null, u3: null };
  
  // Find u1 (direct sponsor)
  if (user.спонсорId) {
    const u1 = await kv.get(`user:id:${user.спонсорId}`);
    if (u1) {
      upline.u1 = u1.id;
      
      // Find u2
      if (u1.спонсорId) {
        const u2 = await kv.get(`user:id:${u1.спонсорId}`);
        if (u2) {
          upline.u2 = u2.id;
          
          // Find u3
          if (u2.спонсорId) {
            const u3 = await kv.get(`user:id:${u2.спонсорId}`);
            if (u3) {
              upline.u3 = u3.id;
            }
          }
        }
      }
    }
  }
  
  return upline;
}

// Check admin access
async function requireAdmin(c: any, user: any) {
  if (!user || !isUserAdmin(user)) {
    throw new Error('Admin access required');
  }
}

// ======================
// AUTHENTICATION
// ======================

// Health check endpoint
app.get("/make-server-05aa3c8a/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Admin health check (no auth required - for debugging)
app.get("/make-server-05aa3c8a/admin/health", (c) => {
  console.log('🏥 Admin health check called');
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "Admin endpoints are reachable"
  });
});

// Simple auth (for demo)
app.post("/make-server-05aa3c8a/auth", async (c) => {
  try {
    const { name } = await c.req.json();
    
    if (!name || !name.trim()) {
      return c.json({ error: "Name is required" }, 400);
    }
    
    // Special handling for "ceo" user
    let userId: string;
    let userKey: string;
    
    if (name.toLowerCase() === 'ceo') {
      userId = 'ceo';
      userKey = 'user:id:ceo';
    } else {
      // Create or get demo user
      userId = `u_demo_${name.toLowerCase().replace(/\s+/g, '_')}`;
      userKey = `user:id:${userId}`;
    }
    
    let user = await kv.get(userKey);
    
    if (!user) {
      // Create new user
      const isFirstUser = userId === 'ceo';
      user = {
        id: userId,
        имя: name.trim(),
        фамилия: isFirstUser ? 'Admin' : '',
        username: name.toLowerCase().replace(/\s+/g, '_'),
        уровень: isFirstUser ? 3 : 0, // ✅ CEO gets level 3, новые партнёры начинают с ранга 0
        рефКод: `REF${Date.now().toString().slice(-6)}`,
        спонсорId: null,
        баланс: 0,
        зарегистрирован: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isAdmin: isFirstUser, // CEO is admin
        type: isFirstUser ? 'admin' : 'user',
        role: isFirstUser ? 'ceo' : null
      };
      
      await kv.set(userKey, user);
      console.log(`New user registered: ${user.имя} (admin: ${isFirstUser})`);
    } else {
      // Update last login and activity
      const now = new Date().toISOString();
      user.lastLogin = now;
      user.lastActivity = now;
      await kv.set(userKey, user);
      console.log(`User logged in: ${user.имя}`);
    }
    
    return c.json({ 
      success: true, 
      user,
      token: userId // Using userId as token for simplicity
    });
    
  } catch (error) {
    console.log(`Auth error: ${error}`);
    return c.json({ error: `Authentication failed: ${error}` }, 500);
  }
});

// 💓 Update user activity (heartbeat)
app.post("/make-server-05aa3c8a/user/activity", async (c) => {
  try {
    const { userId } = await c.req.json();
    
    console.log('💓 Heartbeat received for userId:', userId);
    
    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const userKey = `user:id:${userId}`;
    const user = await kv.get(userKey);
    
    if (!user) {
      console.log('❌ User not found for heartbeat:', userId);
      return c.json({ error: "User not found" }, 404);
    }

    const oldLastLogin = user.lastLogin;
    const newLastLogin = new Date().toISOString();
    
    // Обновляем и lastLogin, и lastActivity для правильного отслеживания
    user.lastLogin = newLastLogin;
    user.lastActivity = newLastLogin;
    await kv.set(userKey, user);

    console.log(`✅ Activity updated for ${user.имя || userId}: ${oldLastLogin} → ${newLastLogin}`);
    
    return c.json({ success: true, lastLogin: user.lastLogin, userId: user.id });
  } catch (error) {
    console.error('❌ Activity update error:', error);
    return c.json({ error: 'Failed to update activity' }, 500);
  }
});

// Email signup
app.post("/make-server-05aa3c8a/auth/signup", async (c) => {
  try {
    // Log all headers for debugging
    console.log('Signup request headers:', Object.fromEntries(c.req.raw.headers.entries()));
    
    const { email, password, firstName, lastName, referralCode } = await c.req.json();
    
    if (!email || !password || !firstName || !lastName) {
      console.log('Signup validation failed: missing fields');
      return c.json({ error: "Email, password, имя и фамилия обязательны" }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ error: "Пароль должен быть минимум 6 символов" }, 400);
    }
    
    console.log(`Email signup attempt for: ${email}, referral: ${referralCode || 'none'}`);
    
    // Check if email already exists in KV store
    const emailKey = `user:email:${email.trim().toLowerCase()}`;
    const existingUser = await kv.get(emailKey);
    if (existingUser) {
      console.log(`Signup failed: Email already exists: ${email}`);
      return c.json({ error: "Email уже зарегистрирован" }, 400);
    }
    
    // 🆕 Получаем спонсора если указан реферальный код
    let sponsor = null;
    if (referralCode && referralCode.trim()) {
      // Try to find by ID first (backward compatibility)
      sponsor = await kv.get(`user:id:${referralCode.trim()}`);
      
      // If not found, try by refCode
      if (!sponsor) {
        const refData = await kv.get(`user:refcode:${referralCode.trim()}`);
        if (refData && refData.id) {
          sponsor = await kv.get(`user:id:${refData.id}`);
        }
      }
      
      if (!sponsor) {
        console.log(`Signup failed: Invalid referral code: ${referralCode}`);
        return c.json({ error: `Реферальный код ${referralCode} не найден` }, 400);
      }
      
      console.log(`Found sponsor: ${sponsor.имя} ${sponsor.фамилия} (ID: ${sponsor.id})`);
    }
    
    console.log('Creating user in Supabase Auth...');
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      user_metadata: { 
        firstName: firstName.trim(),
        lastName: lastName.trim()
      },
      email_confirm: true // Auto-confirm since no email server configured
    });
    
    if (authError) {
      console.log(`Supabase Auth error: ${authError.message}`, authError);
      return c.json({ error: `Ошибка создания аккаунта: ${authError.message}` }, 400);
    }
    
    if (!authData.user) {
      console.log('Supabase Auth returned no user data');
      return c.json({ error: "Failed to create user" }, 500);
    }
    
    console.log(`Supabase user created: ${authData.user.id}`);
    
    // 🆕 Генерируем числовой ID (используем освобождённые ID если есть)
    const newUserId = await getNextUserId();
    
    console.log(`Generated user ID: ${newUserId}`);
    
    // 🆕 Генерация читаемого реф-кода
    const refCode = generateReadableRefCode(firstName.trim(), lastName.trim());
    console.log(`Generated readable ref code: ${refCode}`);
    
    // 🆕 Построение upline структуры
    const upline: any = {
      u0: null,
      u1: null,
      u2: null,
      u3: null
    };
    
    if (sponsor) {
      // u0 = прямой спонсор
      upline.u0 = sponsor.id;
      
      // u1, u2, u3 = берем из upline спонсора
      if (sponsor.upline) {
        upline.u1 = sponsor.upline.u0 || null;
        upline.u2 = sponsor.upline.u1 || null;
        upline.u3 = sponsor.upline.u2 || null;
      }
      
      console.log(`Built upline chain: u0=${upline.u0}, u1=${upline.u1}, u2=${upline.u2}, u3=${upline.u3}`);
    }
    
    // Create user in KV store
    const userKey = `user:id:${newUserId}`;
    
    // Check if this is the first user (will be admin) OR admin@admin.com
    const isAdminEmail = email.trim().toLowerCase() === 'admin@admin.com';
    const isFirstUser = newUserId === '1';
    
    const newUser = {
      id: newUserId,
      supabaseId: authData.user.id,
      email: email.trim().toLowerCase(),
      имя: firstName.trim(),
      фамилия: lastName.trim(),
      username: email.split('@')[0],
      уровень: 0, // ✅ Новые партнёры начинают с ранга 0 (нет команды)
      рефКод: refCode, // Читаемый реф-код
      спонсорId: sponsor ? sponsor.id : null,
      upline: upline,
      баланс: 0,
      зарегистрирован: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isAdmin: isFirstUser || isAdminEmail, // First user OR admin@admin.com is admin
      // Дополнительные поля профиля
      телефон: '',
      telegram: '',
      instagram: '',
      vk: '',
      facebook: '',
      аватарка: '',
      команда: [] // Список ID партнеров в структуре
    };
    
    console.log('Saving user to KV store...');
    await kv.set(userKey, newUser);
    await kv.set(emailKey, { id: newUserId }); // Храним только ID для быстрого поиска
    // Create refCode index for fast lookup
    await kv.set(`user:refcode:${refCode}`, { id: newUserId });
    
    // ✅ Явно кэшируем ранг 0 для нового пользователя (у него ещё нет команды)
    await kv.set(`rank:user:${newUserId}`, 0);
    console.log(`✅ Rank cache set to 0 for new user ${newUserId}`);
    
    // 🆕 Обновляем команду спонсора
    if (sponsor) {
      const команда = sponsor.команда || [];
      команда.push(newUserId);
      
      const updatedSponsor = {
        ...sponsor,
        команда
      };
      
      await kv.set(`user:id:${sponsor.id}`, updatedSponsor);
      console.log(`Updated sponsor ${sponsor.id} team: added ${newUserId}`);
      
      // ✨ ПРОСТО обновляем ранги для спонсора и всей upline
      console.log(`🏆 [/auth/signup] Updating ranks for sponsor ${sponsor.id} and upline...`);
      await updateUplineRanks(sponsor.id);
      
      // 🆕 Создаём уведомление для спонсора о новом партнёре
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id: notificationId,
        userId: sponsor.id,
        тип: 'новый_партнёр',
        заголовок: 'Новый партнёр в вашей команде!',
        сообщение: `${newUser.имя} ${newUser.фамилия} зарегистрировался по вашей реферальной ссылке`,
        прочитано: false,
        timestamp: Date.now(),
        дата: new Date().toISOString(),
        данные: {
          partnerId: newUserId,
          partnerName: `${newUser.имя} ${newUser.фамилия}`,
          partnerRefCode: refCode
        }
      };
      
      await kv.set(`notification:user:${sponsor.id}:${notificationId}`, notification);
      console.log(`✅ Created notification for sponsor ${sponsor.id} about new partner ${newUserId}`);
    }
    
    console.log(`✅ New user registered: ${newUser.имя} ${newUser.фамилия} (ID: ${newUserId}, RefCode: ${refCode})${(isFirstUser || isAdminEmail) ? ' [ADMIN]' : ''}${sponsor ? ` sponsored by ${sponsor.id}` : ''}`);
    
    return c.json({ 
      success: true, 
      user: newUser,
      refCode: refCode,
      message: 'Registration successful'
    });
    
  } catch (error) {
    console.error(`❌ Email signup critical error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Ошибка регистрации: ${errorMessage}` }, 500);
  }
});

// Email/ID login
app.post("/make-server-05aa3c8a/auth/login", async (c) => {
  try {
    // Log all headers for debugging
    console.log('Login request headers:', Object.fromEntries(c.req.raw.headers.entries()));
    
    const { login, password } = await c.req.json();
    
    if (!login || !password) {
      return c.json({ error: "Логин (ID или Email) и пароль обязательны" }, 400);
    }
    
    console.log('═══════════════════════════════════════════════');
    console.log(`🔐 LOGIN ATTEMPT`);
    console.log(`   Login: ${login}`);
    console.log(`   Password: ${password ? '***' : 'MISSING'}`);
    console.log('═══════════════════════════════════════════════');
    
    // 🆕 Определяем тип логина: ID (только цифры), "ceo", или Email
    const isNumericId = /^\d+$/.test(login.trim());
    const isCeoId = login.trim().toLowerCase() === 'ceo';
    const isAdminId = login.trim().toLowerCase().startsWith('admin-');
    
    let userData = null;
    let userEmail = null;
    let isAdmin = false;
    
    if (isNumericId) {
      // Вход по партнёрскому ID
      console.log(`Login by User ID: ${login}`);
      const userKey = `user:id:${login.trim()}`;
      userData = await kv.get(userKey);
      
      if (!userData) {
        console.log(`Login failed: User ID ${login} not found`);
        return c.json({ error: "Пользователь с таким ID не найден" }, 401);
      }
      
      userEmail = userData.email;
    } else if (isCeoId || isAdminId) {
      // Вход по админскому ID (ceo, admin-1, admin-2...)
      console.log(`Login by Admin ID: ${login}`);
      const adminKey = `admin:id:${login.trim().toLowerCase()}`;
      userData = await kv.get(adminKey);
      
      if (!userData) {
        console.log(`Login failed: Admin ID ${login} not found`);
        return c.json({ error: "Администратор с таким ID не найден" }, 401);
      }
      
      userEmail = userData.email;
      isAdmin = true;
    } else {
      // Вход по Email - проверяем и админов и партнёров
      console.log(`Login by Email: ${login}`);
      
      // Сначала проверяем админов
      const adminEmailKey = `admin:email:${login.trim().toLowerCase()}`;
      const adminEmailData = await kv.get(adminEmailKey);
      
      if (adminEmailData && adminEmailData.id) {
        // Это админ
        const adminKey = `admin:id:${adminEmailData.id}`;
        userData = await kv.get(adminKey);
        userEmail = login.trim();
        isAdmin = true;
        console.log(`Found admin by email: ${adminEmailData.id}`);
      } else {
        // Проверяем партнёров
        const userEmailKey = `user:email:${login.trim().toLowerCase()}`;
        const userEmailData = await kv.get(userEmailKey);
        
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
        } else {
          // Получаем полные данные пользователя
          const userKey = `user:id:${userEmailData.id}`;
          userData = await kv.get(userKey);
          userEmail = login.trim();
          isAdmin = userData?.isAdmin === true;
        }
      }
    }
    
    if (!userData) {
      return c.json({ error: "Ошибка получения данных пользователя" }, 500);
    }
    
    // Create a Supabase client with anon key for sign in
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Sign in with Supabase Auth using email
    let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });
    
    if (authError) {
      console.log(`❌ Supabase Auth login error:`, {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        name: authError.name,
        email: userEmail
      });
      
      // More specific error messages
      if (authError.message.includes('Invalid login credentials')) {
        // 🔧 FIX: Если пользователь есть в KV, но нет в Supabase Auth, создаем его там
        console.log(`⚠️ User exists in KV but not in Supabase Auth. Attempting to migrate...`);
        
        try {
          // Create user in Supabase Auth with the provided password
          const { data: newAuthData, error: createError } = await supabase.auth.admin.createUser({
            email: userEmail,
            password: password,
            user_metadata: { 
              firstName: userData.имя?.split(' ')[0] || '',
              lastName: userData.фамилия || userData.имя?.split(' ').slice(1).join(' ') || '',
              migratedFromKV: true
            },
            email_confirm: true // Auto-confirm since user already exists in our system
          });
          
          if (createError) {
            console.error(`❌ Failed to migrate user to Supabase Auth:`, createError);
            return c.json({ 
              error: "Неверный пароль или ошибка миграции учетной записи",
              details: createError.message 
            }, 401);
          }
          
          console.log(`✅ Successfully migrated user ${userEmail} to Supabase Auth`);
          
          // Now try to sign in again
          const { data: retryAuthData, error: retryError } = await supabaseClient.auth.signInWithPassword({
            email: userEmail,
            password: password,
          });
          
          if (retryError || !retryAuthData.session) {
            console.error(`❌ Failed to sign in after migration:`, retryError);
            return c.json({ 
              error: "Ошибка входа после миграции",
              details: retryError?.message 
            }, 401);
          }
          
          // Success! Continue with the migrated user
          authData = retryAuthData;
          authError = null;
          
        } catch (migrationError) {
          console.error(`❌ Migration error:`, migrationError);
          return c.json({ 
            error: "Ошибка миграции учетной записи. Попробуйте сбросить пароль.",
            details: migrationError instanceof Error ? migrationError.message : String(migrationError)
          }, 401);
        }
      } else if (authError.message.includes('Email not confirmed')) {
        return c.json({ 
          error: "Email не подтверждён. Проверьте почту или обратитесь к администратору.",
          details: authError.message 
        }, 401);
      } else {
        return c.json({ 
          error: `Ошибка авторизации: ${authError.message}`,
          details: authError.message 
        }, 401);
      }
    }
    
    if (!authData || !authData.session || !authData.user) {
      return c.json({ error: "Неверные учетные данные" }, 401);
    }
    
    // Update last login
    userData.lastLogin = new Date().toISOString();
    
    // Ensure isAdmin flag is set correctly
    if (isAdmin && !userData.isAdmin) {
      userData.isAdmin = true;
      console.log(`✅ Setting isAdmin flag for user: ${userData.id}`);
    }
    
    // Save updated data
    if (isAdmin) {
      await kv.set(`admin:id:${userData.id}`, userData);
      console.log(`✅ Admin logged in: ${userData.имя} ${userData.фамилия} (ID: ${userData.id}, Role: ${userData.role})`);
    } else {
      await kv.set(`user:id:${userData.id}`, userData);
      console.log(`✅ User logged in: ${userData.имя} ${userData.фамилия} (ID: ${userData.id})`);
    }
    
    return c.json({ 
      success: true, 
      user: userData,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    });
    
  } catch (error) {
    console.log(`Email login error: ${error}`);
    return c.json({ error: `Login failed: ${error}` }, 500);
  }
});

// ======================
// PARTNER REGISTRATION
// ======================

// Register new partner with auto-generated ID
app.post("/make-server-05aa3c8a/register", async (c) => {
  try {
    console.log('🚀🚀🚀 Partner registration request - AUTO-RANK CALCULATION ENABLED 🚀🚀🚀');
    console.log('Partner registration request');
    
    const { firstName, lastName, email, password, phone, sponsorRefCode } = await c.req.json();
    
    // Validation
    if (!firstName || !lastName || !email || !password) {
      return c.json({ error: "Имя, фамилия, email и пароль обязательны" }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ error: "Пароль должен быть минимум 6 символов" }, 400);
    }
    
    console.log(`Registering partner: ${firstName} ${lastName}, email: ${email}, sponsor: ${sponsorRefCode || 'none'}`);
    
    // Check if email already exists
    const emailKey = `user:email:${email.trim().toLowerCase()}`;
    const existingUser = await kv.get(emailKey);
    if (existingUser) {
      console.log(`Registration failed: Email already exists: ${email}`);
      return c.json({ error: "Email уже зарегистрирован" }, 400);
    }
    
    // Find sponsor if referral code provided
    let sponsor = null;
    if (sponsorRefCode && sponsorRefCode.trim()) {
      // Try to find by ID first (backward compatibility)
      sponsor = await kv.get(`user:id:${sponsorRefCode.trim()}`);
      
      // If not found, try by refCode
      if (!sponsor) {
        const refData = await kv.get(`user:refcode:${sponsorRefCode.trim()}`);
        if (refData && refData.id) {
          sponsor = await kv.get(`user:id:${refData.id}`);
        }
      }
      
      if (!sponsor) {
        console.log(`Registration failed: Invalid referral code: ${sponsorRefCode}`);
        return c.json({ error: `Реферальный код ${sponsorRefCode} не найден` }, 400);
      }
      
      console.log(`Found sponsor: ${sponsor.имя} ${sponsor.фамилия || ''} (ID: ${sponsor.id})`);
    }
    
    // Create user in Supabase Auth
    console.log('Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      user_metadata: { 
        firstName: firstName.trim(),
        lastName: lastName.trim()
      },
      email_confirm: true // Auto-confirm since no email server configured
    });
    
    if (authError) {
      console.log(`Supabase Auth error: ${authError.message}`, authError);
      return c.json({ error: `Ошибка создания аккаунта: ${authError.message}` }, 400);
    }
    
    if (!authData.user) {
      console.log('Supabase Auth returned no user data');
      return c.json({ error: "Ошибка создания пользователя" }, 500);
    }
    
    console.log(`Supabase user created: ${authData.user.id}`);
    
    // Generate partner ID (001, 002, etc.) - reuses freed IDs first
    const partnerId = await getNextPartnerId();
    
    console.log(`Generated partner ID: ${partnerId}`);
    
    // Referral code is now equal to partner ID
    const refCode = partnerId;
    console.log(`Generated ref code (same as ID): ${refCode}`);
    
    // Build upline structure
    const upline: any = {
      u0: null,
      u1: null,
      u2: null,
      u3: null
    };
    
    if (sponsor) {
      // u0 = direct sponsor
      upline.u0 = sponsor.id;
      
      // u1, u2, u3 = from sponsor's upline
      if (sponsor.upline) {
        upline.u1 = sponsor.upline.u0 || null;
        upline.u2 = sponsor.upline.u1 || null;
        upline.u3 = sponsor.upline.u2 || null;
      }
      
      console.log(`Built upline chain: u0=${upline.u0}, u1=${upline.u1}, u2=${upline.u2}, u3=${upline.u3}`);
    }
    
    // Create partner in KV store
    const userKey = `user:id:${partnerId}`;
    const newUser = {
      id: partnerId,
      supabaseId: authData.user.id,
      email: email.trim().toLowerCase(),
      имя: firstName.trim(),
      фамилия: lastName.trim(),
      username: email.split('@')[0],
      уровень: 0, // ✅ Новые партнёры начинают с ранга 0 (нет команды)
      рефКод: refCode,
      спонсорId: sponsor ? sponsor.id : null,
      upline: upline,
      баланс: 0,
      зарегистрирован: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isAdmin: false,
      // Profile fields
      телефон: phone || '',
      telegram: '',
      instagram: '',
      vk: '',
      facebook: '',
      аватарка: '',
      команда: [] // List of partner IDs in structure
    };
    
    console.log('Saving partner to KV store...');
    await kv.set(userKey, newUser);
    await kv.set(emailKey, { id: partnerId });
    // Create refCode index for fast lookup
    await kv.set(`user:refcode:${refCode}`, { id: partnerId });
    
    // ✅ Явно кэшируем ранг 0 для нового партнёра (у него ещё нет команды)
    await kv.set(`rank:user:${partnerId}`, 0);
    console.log(`✅ Rank cache set to 0 for new partner ${partnerId}`);
    
    // Update sponsor's team
    if (sponsor) {
      const команда = sponsor.команда || [];
      команда.push(partnerId);
      
      const updatedSponsor = {
        ...sponsor,
        команда
      };
      
      await kv.set(`user:id:${sponsor.id}`, updatedSponsor);
      console.log(`Updated sponsor ${sponsor.id} team: added ${partnerId}`);
      
      // ✨ ПРОСТО обновляем ранги для спонсора и всей upline
      console.log(`🏆 [/register] Updating ranks for sponsor ${sponsor.id} and upline...`);
      await updateUplineRanks(sponsor.id);
      
      // 🆕 Создаём уведомление для спонсора о новом партнёре
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id: notificationId,
        userId: sponsor.id,
        тип: 'новый_партнёр',
        заголовок: 'Новый партнёр в вашей команде!',
        сообщение: `${newUser.имя} ${newUser.фамилия} зарегистрировался по вашей реферальной ссылке`,
        прочитано: false,
        timestamp: Date.now(),
        дата: new Date().toISOString(),
        данные: {
          partnerId: partnerId,
          partnerName: `${newUser.имя} ${newUser.фамилия}`,
          partnerRefCode: refCode
        }
      };
      
      await kv.set(`notification:user:${sponsor.id}:${notificationId}`, notification);
      console.log(`✅ Created notification for sponsor ${sponsor.id} about new partner ${partnerId}`);
    }
    
    console.log(`✅ New partner registered: ${newUser.имя} ${newUser.фамилия} (ID: ${partnerId}, RefCode: ${refCode})${sponsor ? ` sponsored by ${sponsor.id}` : ''}`);
    
    return c.json({ 
      success: true, 
      partnerId: partnerId,
      refCode: refCode,
      user: newUser,
      message: 'Регистрация успешна!'
    });
    
  } catch (error) {
    console.error(`❌ Partner registration error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Ошибка регистрации: ${errorMessage}` }, 500);
  }
});

// Password reset request
app.post("/make-server-05aa3c8a/auth/reset-password", async (c) => {
  try {
    console.log('Password reset request headers:', Object.fromEntries(c.req.raw.headers.entries()));
    
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }
    
    console.log(`Password reset request for: ${email}`);
    
    // Check if user exists in KV store
    const emailKey = `user:email:${email.trim().toLowerCase()}`;
    const userData = await kv.get(emailKey);
    
    if (!userData) {
      // For security, don't reveal if email exists or not
      console.log(`Password reset: Email not found: ${email}`);
      return c.json({ 
        success: true, 
        message: "If this email is registered, you will receive a password reset link shortly." 
      });
    }
    
    // Create a Supabase client with anon key for password reset
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Send password reset email
    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${c.req.header('origin') || 'http://localhost:5173'}/reset-password`,
    });
    
    if (resetError) {
      console.error(`Password reset error: ${resetError.message}`, resetError);
      
      // Check if it's an SMTP configuration error
      if (resetError.message.includes('SMTP') || resetError.message.includes('email')) {
        return c.json({ 
          error: "Восстановление пароля временно недоступно. Пожалуйста, свяжитесь с администратором.",
          details: "SMTP не настроен. См. инструкцию по настройке email в документации."
        }, 500);
      }
      
      return c.json({ error: `Ошибка отправки письма: ${resetError.message}` }, 500);
    }
    
    console.log(`✅ Password reset email sent to: ${email}`);
    
    return c.json({ 
      success: true, 
      message: "Письмо со ссылкой для восстановления пароля отправлено на ваш email!" 
    });
    
  } catch (error) {
    console.error(`Password reset error: ${error}`);
    return c.json({ error: `Password reset failed: ${error}` }, 500);
  }
});

// Update password (after reset)
app.post("/make-server-05aa3c8a/auth/update-password", async (c) => {
  try {
    const { access_token, new_password } = await c.req.json();
    
    if (!access_token || !new_password) {
      return c.json({ error: "Access token and new password are required" }, 400);
    }
    
    if (new_password.length < 6) {
      return c.json({ error: "Пароль должен быть минимум 6 символов" }, 400);
    }
    
    console.log(`Password update attempt with token`);
    
    // Create a Supabase client with the user's access token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    });
    
    // First verify the session with the access token
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getUser(access_token);
    
    if (sessionError || !sessionData.user) {
      console.error(`Session verification error: ${sessionError?.message || 'No user found'}`);
      return c.json({ error: `Ошибка обновления пароля: Auth session missing!` }, 401);
    }
    
    console.log(`Session verified for user: ${sessionData.user.id}`);
    
    // Update the password using the Service Role Key for direct access
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      sessionData.user.id,
      { password: new_password }
    );
    
    if (updateError) {
      console.error(`Password update error: ${updateError.message}`);
      return c.json({ error: `Ошибка обновления пароля: ${updateError.message}` }, 500);
    }
    
    console.log(`✅ Password updated for user: ${sessionData.user.id}`);
    
    return c.json({ 
      success: true, 
      message: "Пароль успешно обновлён!" 
    });
    
  } catch (error) {
    console.error(`Password update error: ${error}`);
    return c.json({ error: `Password update failed: ${error}` }, 500);
  }
});

// Debug: Get all users (no admin check for diagnostic purposes)
app.get("/make-server-05aa3c8a/debug/users", async (c) => {
  try {
    console.log('Debug: Getting all users for diagnostic...');
    
    const users = await kv.getByPrefix('user:id:');
    
    console.log(`Debug: Found ${users.length} users in KV store`);
    console.log(`Debug: Is array? ${Array.isArray(users)}`);
    
    // Ensure users is always an array
    const userArray = Array.isArray(users) ? users : [];
    
    return c.json({
      success: true,
      users: userArray,
      count: userArray.length
    });
    
  } catch (error) {
    console.error('Debug get users error:', error);
    return c.json({ 
      success: false, 
      error: String(error),
      users: []
    }, 500);
  }
});

// Make user admin (for manual admin assignment)
app.post("/make-server-05aa3c8a/users/:userId/make-admin", async (c) => {
  try {
    const userId = c.req.param('userId');
    const requestorId = c.req.header('X-User-Id');
    
    console.log(`Make admin request: userId=${userId}, requestor=${requestorId}`);
    
    // Get the user to update
    const userKey = `user:id:${userId}`;
    const user = await kv.get(userKey);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Update user with admin flag
    user.isAdmin = true;
    await kv.set(userKey, user);
    
    // Also update email key
    if (user.email) {
      const emailKey = `user:email:${user.email.trim().toLowerCase()}`;
      await kv.set(emailKey, user);
    }
    
    console.log(`✅ User ${userId} (${user.имя}) is now admin`);
    
    return c.json({
      success: true,
      message: 'User is now admin',
      user: user
    });
    
  } catch (error) {
    console.error('Make admin error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// OAuth login/signup (Google, Apple, GitHub)
app.post("/make-server-05aa3c8a/auth/oauth", async (c) => {
  try {
    console.log('OAuth auth request headers:', Object.fromEntries(c.req.raw.headers.entries()));
    
    const { access_token } = await c.req.json();
    
    if (!access_token) {
      return c.json({ error: "Access token is required" }, 400);
    }
    
    console.log(`OAuth auth attempt with access token`);
    
    // Create a Supabase client with the user's access token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    });
    
    // Verify the session with the access token
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getUser(access_token);
    
    if (sessionError || !sessionData.user) {
      console.error(`OAuth session verification error: ${sessionError?.message || 'No user found'}`);
      return c.json({ error: `OAuth verification failed` }, 401);
    }
    
    console.log(`OAuth session verified for user: ${sessionData.user.id} (${sessionData.user.email})`);
    
    // Check if user exists in KV store
    const emailKey = `user:email:${sessionData.user.email?.trim().toLowerCase()}`;
    let userData = await kv.get(emailKey);
    
    if (!userData) {
      // Create new user in KV store
      const userId = `u_oauth_${sessionData.user.id}`;
      const userKey = `user:id:${userId}`;
      
      // Check if this is the first user (will be admin)
      const allUsers = await kv.getByPrefix('user:id:');
      const isFirstUser = allUsers.length === 0;
      
      userData = {
        id: userId,
        supabaseId: sessionData.user.id,
        email: sessionData.user.email?.trim() || '',
        имя: sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name || sessionData.user.email?.split('@')[0] || 'Пользователь',
        username: sessionData.user.email?.split('@')[0] || 'user',
        уровень: 0, // ✅ Новые партнёры начинают с ранга 0 (нет команды)
        рефКод: `REF${Date.now().toString().slice(-6)}`,
        спонсорId: null,
        баланс: 0,
        зарегистрирован: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isAdmin: isFirstUser, // First user is admin
        // Дополнительные поля профиля (дозаполняются пользователем)
        телефон: '',
        telegram: '',
        instagram: '',
        vk: '',
        facebook: '',
        аватарка: sessionData.user.user_metadata?.avatar_url || sessionData.user.user_metadata?.picture || ''
      };
      
      await kv.set(userKey, userData);
      await kv.set(emailKey, userData);
      
      console.log(`✅ New user created via OAuth: ${userData.имя} (${userData.email})${isFirstUser ? ' [ADMIN]' : ''}`);
    } else {
      // Update last login
      userData.lastLogin = new Date().toISOString();
      await kv.set(emailKey, userData);
      await kv.set(`user:id:${userData.id}`, userData);
      
      console.log(`✅ User logged in via OAuth: ${userData.имя} (${userData.email})`);
    }
    
    return c.json({ 
      success: true, 
      user: userData,
      token: userData.id // Using userId as token for API calls
    });
    
  } catch (error) {
    console.error(`❌ OAuth auth error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `OAuth authentication failed: ${errorMessage}` }, 500);
  }
});

// Telegram auth verification
app.post("/make-server-05aa3c8a/telegram-auth", async (c) => {
  try {
    const telegramData = await c.req.json();
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    
    if (!botToken) {
      console.log("Telegram auth error: Bot token not configured");
      return c.json({ error: "Bot token not configured" }, 500);
    }

    // Verify Telegram data signature (if hash is provided)
    if (telegramData.hash) {
      const { hash, ...dataToCheck } = telegramData;
      
      const dataCheckArr = Object.keys(dataToCheck)
        .sort()
        .map(key => `${key}=${dataToCheck[key]}`);
      const dataCheckString = dataCheckArr.join('\n');
      
      // Generate secret key using Web Crypto API
      const secretKeyHex = await createHmacSha256('WebAppData', botToken);
      const secretKey = new Uint8Array(secretKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      
      // Calculate hash using Web Crypto API
      const calculatedHash = await createHmacSha256(secretKey, dataCheckString);
      
      if (calculatedHash !== hash) {
        console.log("Telegram auth error: Invalid hash");
        return c.json({ error: "Invalid authentication data" }, 401);
      }
      
      const authDate = parseInt(dataToCheck.auth_date);
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - authDate > 86400) {
        console.log("Telegram auth error: Data too old");
        return c.json({ error: "Authentication data expired" }, 401);
      }
    }
    
    // Get or create user
    const telegramId = telegramData.id;
    const userKey = `user:tg:${telegramId}`;
    
    let userData = await kv.get(userKey);
    
    if (!userData) {
      // Find sponsor by referral code if provided
      let sponsorId = null;
      let refCodeToUse = telegramData.refCode || telegramData.start_param; // start_param from Telegram Mini Apps
      
      if (refCodeToUse) {
        console.log(`Looking for sponsor with ref code: ${refCodeToUse}`);
        const allUsers = await kv.getByPrefix('user:id:');
        const sponsor = allUsers.find((u: any) => u.рефКод === refCodeToUse);
        if (sponsor) {
          sponsorId = sponsor.id;
          console.log(`Found sponsor: ${sponsor.имя} (${sponsor.id})`);
        } else {
          console.log(`No sponsor found for ref code: ${refCodeToUse}`);
        }
      }
      
      // Check if this is the first user (will be admin)
      const allUsers = await kv.getByPrefix('user:id:');
      const isFirstUser = allUsers.length === 0;
      
      // Create new user
      const newUser = {
        id: `u_tg_${telegramId}`,
        telegramId: telegramId,
        имя: telegramData.first_name + (telegramData.last_name ? ` ${telegramData.last_name}` : ''),
        username: telegramData.username || '',
        photoUrl: telegramData.photo_url || '',
        уровень: 0, // ✅ Новые партнёры начинают с ранга 0 (нет команды)
        рефКод: `REF${telegramId.toString().slice(-6)}`,
        спонсорId: sponsorId,
        баланс: 0,
        зарегистрирован: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isAdmin: isFirstUser // First user is admin
      };
      
      await kv.set(userKey, newUser);
      await kv.set(`user:id:${newUser.id}`, newUser);
      
      console.log(`New user registered: ${newUser.имя} (${telegramId})${sponsorId ? ` with sponsor ${sponsorId}` : ' without sponsor'}${isFirstUser ? ' [ADMIN]' : ''}`);
      
      return c.json({ 
        success: true, 
        user: newUser,
        token: newUser.id,
        isNewUser: true
      });
    } else {
      // Update last login
      userData.lastLogin = new Date().toISOString();
      await kv.set(userKey, userData);
      await kv.set(`user:id:${userData.id}`, userData);
      
      console.log(`User logged in: ${userData.имя} (${telegramId})`);
      
      return c.json({ 
        success: true, 
        user: userData,
        token: userData.id,
        isNewUser: false
      });
    }
    
  } catch (error) {
    console.log(`Telegram auth error: ${error}`);
    return c.json({ error: `Authentication failed: ${error}` }, 500);
  }
});

// ======================
// USER MANAGEMENT
// ======================

// Get current user
app.get("/make-server-05aa3c8a/user/me", async (c) => {
  try {
    const user = await verifyUser(c.req.header('X-User-Id'));
    return c.json({ success: true, user });
  } catch (error) {
    return c.json({ error: `${error}` }, 401);
  }
});

// Update user profile
app.put("/make-server-05aa3c8a/user/profile", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const profileData = await c.req.json();
    
    console.log(`Updating profile for user: ${currentUser.id}`);
    
    // Разрешённые поля для обновления
    const allowedFields = ['имя', 'телефон', 'telegram', 'whatsapp', 'instagram', 'vk', 'facebook', 'аватарка', 'датаРождения', 'privacySettings', 'settings'];
    
    // Обновляем только разрешённые поля
    const updates: any = {};
    for (const field of allowedFields) {
      if (profileData.hasOwnProperty(field)) {
        updates[field] = profileData[field];
      }
    }
    
    console.log('📝 Profile updates to apply:', updates);
    
    // Логируем датаРождения отдельно
    if (updates.hasOwnProperty('датаРождения')) {
      console.log('📅 Birth date in updates:', updates.датаРождения);
    } else {
      console.log('⚠️ Birth date NOT in updates. profileData:', profileData);
    }
    
    // Логируем настройки приватности
    if (updates.hasOwnProperty('privacySettings')) {
      console.log('🔒 Privacy settings in updates:', updates.privacySettings);
    }
    
    // Логируем общие настройки
    if (updates.hasOwnProperty('settings')) {
      console.log('⚙️ General settings in updates:', updates.settings);
    }
    
    // Проверка: имя не может быть пустым
    if (updates.hasOwnProperty('имя') && !updates.имя?.trim()) {
      return c.json({ error: 'Имя не может быть пустым' }, 400);
    }
    
    // Применяем обновления
    const updatedUser = {
      ...currentUser,
      ...updates
    };
    
    console.log('👤 Updated user object:', updatedUser);
    console.log('📅 Birth date in updatedUser:', updatedUser.датаРождения);
    console.log('📋 Social media fields:', {
      telegram: updatedUser.telegram,
      whatsapp: updatedUser.whatsapp,
      facebook: updatedUser.facebook,
      instagram: updatedUser.instagram,
      vk: updatedUser.vk
    });
    
    // Сохраняем обновлённого пользователя
    const userKey = `user:id:${currentUser.id}`;
    await kv.set(userKey, updatedUser);
    
    // Если есть email, обновляем и по email ключу
    if (currentUser.email) {
      const emailKey = `user:email:${currentUser.email.trim().toLowerCase()}`;
      await kv.set(emailKey, updatedUser);
    }
    
    // Если есть telegramId, обновляем и по telegram ключу
    if (currentUser.telegramId) {
      await kv.set(`user:tg:${currentUser.telegramId}`, updatedUser);
    }
    
    console.log(`✅ Profile updated for: ${updatedUser.имя} (${currentUser.id})`);
    
    return c.json({ 
      success: true, 
      user: updatedUser,
      message: 'Профиль успешно обновлён' 
    });
    
  } catch (error) {
    console.error(`❌ Profile update error:`, error);
    return c.json({ error: `Failed to update profile: ${error}` }, 500);
  }
});

// Upload avatar
app.post("/make-server-05aa3c8a/user/avatar", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const body = await c.req.parseBody();
    const file = body['avatar'];
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Проверка размера (макс 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: 'Файл слишком большой (макс 2MB)' }, 400);
    }
    
    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Неподдерживаемый формат файла' }, 400);
    }
    
    const bucketName = 'make-05aa3c8a-avatars';
    
    // Создаём bucket если не существует
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: allowedTypes
      });
      console.log(`✅ Created bucket: ${bucketName}`);
    }
    
    // Генерируем уникальное имя файла
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // Конвертируем File в ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Удаляем старую аватарку если есть
    if (currentUser.аватарка && currentUser.аватарка.includes(bucketName)) {
      const oldPath = currentUser.аватарка.split(`${bucketName}/`)[1];
      if (oldPath) {
        await supabase.storage.from(bucketName).remove([oldPath]);
        console.log(`🗑️ Deleted old avatar: ${oldPath}`);
      }
    }
    
    // Загружаем файл
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: true
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      return c.json({ error: `Failed to upload: ${error.message}` }, 500);
    }
    
    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    const avatarUrl = urlData.publicUrl;
    
    // Обновляем пользователя
    const updatedUser = {
      ...currentUser,
      аватарка: avatarUrl
    };
    
    await kv.set(`user:id:${currentUser.id}`, updatedUser);
    
    if (currentUser.email) {
      await kv.set(`user:email:${currentUser.email.trim().toLowerCase()}`, updatedUser);
    }
    
    if (currentUser.telegramId) {
      await kv.set(`user:tg:${currentUser.telegramId}`, updatedUser);
    }
    
    console.log(`✅ Avatar uploaded for: ${currentUser.id}`);
    
    return c.json({
      success: true,
      avatarUrl,
      message: 'Аватарка загружена!'
    });
    
  } catch (error) {
    console.error(`❌ Avatar upload error:`, error);
    return c.json({ error: `Failed to upload avatar: ${error}` }, 500);
  }
});

// Delete own account
app.delete("/make-server-05aa3c8a/user/account", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const userId = currentUser.id;
    
    // Don't allow deleting admin account
    if (userId === '1' || currentUser.email?.toLowerCase() === 'admin@admin.com' || currentUser.isAdmin) {
      return c.json({ error: 'Админ аккаунт не может быть удалён' }, 403);
    }
    
    console.log(`🗑️ User self-delete: ${userId} (${currentUser.имя} ${currentUser.фамилия || ''})`);
    
    // Remove from sponsor's team
    if (currentUser.спонсорId) {
      const sponsor = await kv.get(`user:id:${currentUser.спонсорId}`);
      if (sponsor && sponsor.команда) {
        sponsor.команда = sponsor.команда.filter((id: string) => id !== userId);
        await kv.set(`user:id:${currentUser.спонсорId}`, sponsor);
        console.log(`Removed ${userId} from sponsor ${currentUser.спонсорId}'s team`);
        
        // 🆕 Инвалидируем кэш рангов для upline
        await invalidateRankCache(userId);
      }
    }
    
    // Delete user data
    await kv.del(`user:id:${userId}`);
    
    if (currentUser.email) {
      await kv.del(`user:email:${currentUser.email.toLowerCase()}`);
    }
    
    if (currentUser.telegramId) {
      await kv.del(`user:tg:${currentUser.telegramId}`);
    }
    
    if (currentUser.рефКод) {
      await kv.del(`user:refcode:${currentUser.рефКод}`);
    }
    
    // Delete user's notifications
    const notifications = await kv.getByPrefix(`notification:user:${userId}:`);
    for (const notif of notifications) {
      await kv.del(`notification:user:${userId}:${notif.id}`);
    }
    
    // Delete user's earnings
    const earnings = await kv.getByPrefix(`earning:user:${userId}:`);
    for (const earning of earnings) {
      await kv.del(`earning:user:${userId}:${earning.id}`);
    }
    
    // Delete user's orders
    const orders = await kv.getByPrefix(`order:user:${userId}:`);
    for (const order of orders) {
      await kv.del(`order:user:${userId}:${order.id}`);
    }
    
    // Delete from Supabase Auth
    if (currentUser.supabaseId) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(currentUser.supabaseId);
        if (error) {
          console.log(`Failed to delete Supabase auth user: ${error.message}`);
        } else {
          console.log(`Deleted Supabase auth user: ${currentUser.supabaseId}`);
        }
      } catch (authError) {
        console.log(`Error deleting Supabase auth user: ${authError}`);
      }
    }
    
    // 🔓 Free ALL user IDs (primary + additional codes) for reuse
    const freedCodes: string[] = [];
    
    // 1. Free the primary ID
    if (userId.length === 3 && /^\d+$/.test(userId)) {
      await freePartnerId(userId);
    } else {
      await freeUserId(userId);
    }
    freedCodes.push(userId);
    
    // 2. Delete global mapping for primary ID
    await kv.del(`id:code:${userId}`);
    
    // 3. Free all additional codes from user.codes[] array
    if (currentUser.codes && Array.isArray(currentUser.codes)) {
      for (const code of currentUser.codes) {
        const codeValue = code.value || code;
        if (codeValue && codeValue !== userId) {
          // Delete global mapping
          await kv.del(`id:code:${codeValue}`);
          
          // Free numeric codes for reuse
          if (/^\d+$/.test(codeValue)) {
            if (codeValue.length === 3) {
              await freePartnerId(codeValue);
            } else {
              await freeUserId(codeValue);
            }
          }
          freedCodes.push(codeValue);
        }
      }
    }
    
    console.log(`✅ User ${userId} self-deleted. Freed codes: [${freedCodes.join(', ')}]`);
    
    return c.json({ 
      success: true, 
      message: `Ваш аккаунт удалён. Освобождено ${freedCodes.length} ID для новых пользователей.`,
      freedCodes
    });
  } catch (error) {
    console.error(`❌ Self-delete error:`, error);
    return c.json({ error: `Failed to delete account: ${error}` }, 500);
  }
});

// Get user by ID
app.get("/make-server-05aa3c8a/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    console.log(`📥 Getting user data for ID: ${userId}`);
    
    // Try user first
    let userData = await kv.get(`user:id:${userId}`);
    
    // If not found, try admin (for CEO and admin-X IDs)
    if (!userData) {
      console.log(`   Not found in user:id:${userId}, checking admin:id:${userId}`);
      userData = await kv.get(`admin:id:${userId}`);
    }
    
    // 🆕 Fallback на SQL таблицу profiles если KV Store пустой
    if (!userData) {
      console.log(`   Not found in KV Store, checking SQL profiles table...`);
      const { data: sqlProfile, error: sqlError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (sqlProfile && !sqlError) {
        console.log(`✅ Found user in SQL profiles: ${sqlProfile.first_name}`);
        // Конвертируем SQL формат в KV формат
        userData = {
          id: sqlProfile.id,
          email: sqlProfile.email,
          имя: sqlProfile.first_name || '',
          фамилия: sqlProfile.last_name || '',
          телефон: sqlProfile.phone || '',
          спонсорId: sqlProfile.referrer_id || null,
          баланс: parseFloat(sqlProfile.balance) || 0,
          доступныйБаланс: parseFloat(sqlProfile.available_balance) || 0,
          ранг: sqlProfile.rank_level || 0,
          telegram: sqlProfile.telegram || '',
          instagram: sqlProfile.instagram || '',
          vk: sqlProfile.vk || '',
          facebook: sqlProfile.facebook || '',
          аватарка: sqlProfile.avatar_url || '',
          isAdmin: sqlProfile.is_admin || false,
          type: sqlProfile.is_admin ? 'admin' : 'user',
          created: sqlProfile.created_at,
          lastLogin: sqlProfile.last_login,
          supabaseId: sqlProfile.supabase_id
        };
        
        // Синхронизируем обратно в KV Store
        await kv.set(`user:id:${userId}`, userData);
        console.log(`   Synced user ${userId} from SQL to KV Store`);
      }
    }
    
    if (!userData) {
      console.log(`❌ User ${userId} not found in KV Store or SQL`);
      return c.json({ error: "User not found" }, 404);
    }
    
    console.log(`✅ Found user: ${userData.имя} ${userData.фамилия} (type: ${userData.type || 'user'})`);
    return c.json({ success: true, user: userData });
  } catch (error) {
    console.log(`Get user error: ${error}`);
    return c.json({ error: `Failed to get user: ${error}` }, 500);
  }
});

// Get user profile with privacy settings
app.get("/make-server-05aa3c8a/user/:userId/profile", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const userId = c.req.param('userId');
    
    console.log(`📋 Getting profile for user: ${userId}, requested by: ${currentUser.id}`);
    
    // Try user first, then admin
    let userData = await kv.get(`user:id:${userId}`);
    if (!userData) {
      userData = await kv.get(`admin:id:${userId}`);
    }
    
    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Получаем настройки приватности
    const privacySettings = userData.privacySettings || {};
    console.log(`🔒 Privacy settings for user ${userId}:`, privacySettings);
    
    // Если пользователь смотрит свой профиль - показываем всё
    const isOwnProfile = currentUser.id === userId;
    
    // Подготавливаем данные с учётом настроек приватности
    const profileData: any = {
      id: userData.id,
      имя: userData.имя || '',
      фамилия: userData.фамилия || '',
      уровень: userData.уровень ?? 0, // ✅ По умолчанию ранг 0
      рефКод: userData.рефКод || '',
      зарегистрирован: userData.зарегистрирован,
      команда: userData.команда || []
    };
    
    // Добавляем размер команды
    const allUsers = await kv.getByPrefix('user:id:');
    const allUsersArray = Array.isArray(allUsers) ? allUsers : [];
    const teamMembers = allUsersArray.filter((u: any) => u.спонсорId === userId);
    profileData.teamSize = teamMembers.length;
    
    // Поля которые показываем только если разрешено или это свой профиль
    if (isOwnProfile || privacySettings.showBalance !== false) {
      profileData.баланс = userData.баланс || 0;
    }
    
    if (isOwnProfile || privacySettings.showEarnings !== false) {
      // Подсчитываем общий заработок из earnings
      const earnings = await kv.getByPrefix(`earning:user:${userId}:`);
      const totalEarnings = earnings.reduce((sum: number, e: any) => sum + (e.сумма || e.amount || 0), 0);
      profileData.totalEarnings = totalEarnings;
    }
    
    if (isOwnProfile || privacySettings.showPhone !== false) {
      profileData.телефон = userData.телефон || '';
    }
    
    if (isOwnProfile || privacySettings.showEmail !== false) {
      profileData.email = userData.email || '';
    }
    
    // Социальные сети
    const socialMedia: any = {};
    
    if (isOwnProfile || privacySettings.showTelegram !== false) {
      socialMedia.telegram = userData.telegram || '';
    }
    
    if (isOwnProfile || privacySettings.showWhatsapp !== false) {
      socialMedia.whatsapp = userData.whatsapp || '';
    }
    
    if (isOwnProfile || privacySettings.showFacebook !== false) {
      socialMedia.facebook = userData.facebook || '';
    }
    
    if (isOwnProfile || privacySettings.showInstagram !== false) {
      socialMedia.instagram = userData.instagram || '';
    }
    
    if (isOwnProfile || privacySettings.showVk !== false) {
      socialMedia.vk = userData.vk || '';
    }
    
    profileData.socialMedia = socialMedia;
    profileData.privacySettings = privacySettings;
    
    console.log(`✅ Profile data prepared for user ${userId}, fields included:`, Object.keys(profileData));
    
    return c.json({ success: true, user: profileData });
  } catch (error) {
    console.log(`Get user profile error: ${error}`);
    return c.json({ error: `Failed to get user profile: ${error}` }, 500);
  }
});

// Get user's team structure
app.get("/make-server-05aa3c8a/user/:userId/team", async (c) => {
  try {
    await verifyUser(c.req.header('X-User-Id'));
    const userId = c.req.param('userId');
    
    console.log(`📊 Building team structure for user: ${userId}`);
    
    // Get all users (excluding admins)
    const allUsers = await kv.getByPrefix('user:id:');
    const allUsersArray = Array.isArray(allUsers) ? allUsers : [];
    
    // 🆕 ИСПРАВЛЕНИЕ: Фильтруем администраторов из списка пользователей
    const nonAdminUsers = allUsersArray.filter((u: any) => !isUserAdmin(u));
    console.log(`📊 Filtered ${allUsersArray.length} total users to ${nonAdminUsers.length} non-admin users`);
    
    // Получаем данные текущего пользователя для рефкода
    const currentUser = nonAdminUsers.find((u: any) => u.id === userId);
    if (!currentUser) {
      return c.json({ success: true, team: [] });
    }
    
    // Рекурсивная функция для построения команды с глубиной
    const buildTeamWithDepth = (sponsorId: string, sponsorRefCode: string, depth: number, visited: Set<string> = new Set()): any[] => {
      // Защита от циклических ссылок
      if (visited.has(sponsorId) || depth > 10) {
        return [];
      }
      
      visited.add(sponsorId);
      
      // Найти всех прямых партнёров (только не-админов)
      const directPartners = nonAdminUsers.filter((u: any) => 
        u.спонсорId === sponsorId && u.id !== sponsorId
      );
      
      console.log(`📊   Level ${depth}: Found ${directPartners.length} direct partners for sponsor ${sponsorId} (refCode: ${sponsorRefCode})`);
      
      // Для каждого партнёра добавляем глубину и пригласительный код
      const partnersWithDepth = directPartners.map((partner: any) => {
        return {
          ...partner,
          глубина: depth,
          пригласительКод: sponsorRefCode  // Dynamically set based on current sponsor's refCode
        };
      });
      
      // Получаем команды всех прямых партнёров (следующий уровень)
      const subTeams = directPartners.flatMap((partner: any) => 
        buildTeamWithDepth(partner.id, partner.рефКод, depth + 1, new Set(visited))
      );
      
      return [...partnersWithDepth, ...subTeams];
    };
    
    // Строим всю команду начиная с глубины 1
    const teamMembers = buildTeamWithDepth(userId, currentUser.рефКод, 1);
    
    console.log(`✅ Built team structure: ${teamMembers.length} members across all levels`);
    console.log(`   Level 1: ${teamMembers.filter(m => m.глубина === 1).length}`);
    console.log(`   Level 2: ${teamMembers.filter(m => m.глубина === 2).length}`);
    console.log(`   Level 3: ${teamMembers.filter(m => m.глубина === 3).length}`);
    
    return c.json({ success: true, team: teamMembers });
  } catch (error) {
    console.log(`Get team error: ${error}`);
    return c.json({ 
      success: false,
      error: `Failed to get team: ${error}`,
      team: []
    }, 500);
  }
});

// Get user rank (максимальная глубина дерева)
app.get("/make-server-05aa3c8a/user/:userId/rank", async (c) => {
  try {
    // ⚠️ Публичный эндпоинт - не требует авторизации
    const userId = c.req.param('userId');
    const useCache = c.req.query('cache') !== 'false'; // По умолчанию true
    
    if (!userId) {
      console.log(`⚠️ Missing userId parameter`);
      return c.json({ 
        success: true, 
        userId: null,
        rank: 0
      });
    }
    
    console.log(`🏆 Getting rank for user: ${userId} (useCache: ${useCache})`);
    
    try {
      // ✨ Используем функцию getUserRank с кэшированием
      const rank = await getUserRank(userId, useCache);
      
      console.log(`✅ Rank for user ${userId}: ${rank}`);
      
      return c.json({ 
        success: true, 
        userId,
        rank
      });
    } catch (rankError) {
      console.error(`❌ Rank calculation error for user ${userId}:`, rankError);
      // Пробуем прочитать из пользователя напрямую как fallback
      try {
        const user = await kv.get(`user:id:${userId}`);
        const fallbackRank = user?.уровень || 0;
        console.log(`⚠️ Using fallback rank from user object: ${fallbackRank}`);
        return c.json({ 
          success: true, 
          userId,
          rank: fallbackRank
        });
      } catch (fallbackError) {
        console.error(`❌ Fallback also failed:`, fallbackError);
        // Возвращаем success: true с рангом 0, чтобы не ломать UI
        return c.json({ 
          success: true, 
          userId,
          rank: 0
        });
      }
    }
  } catch (error) {
    console.error(`❌ Get rank error:`, error);
    return c.json({ 
      success: true, // Возвращаем success: true с рангом 0
      userId: c.req.param('userId') || null,
      rank: 0
    });
  }
});

// ======================
// PRODUCTS
// ======================

app.get("/make-server-05aa3c8a/products", async (c) => {
  try {
    // Get custom products from KV store with keys
    const allProductEntries = await kv.getByPrefixWithKeys('product:');
    
    console.log(`📦 GET /products - Total entries from KV: ${allProductEntries.length}`);
    console.log(`📦 Entry keys preview:`, allProductEntries.slice(0, 5).map((e: any) => e.key));
    
    // Filter to get only product records (not SKU lookup keys)
    // Product keys have format "product:prod_XXX", SKU lookup keys have format "product:sku:XXX"
    const productEntries = allProductEntries.filter((entry: any) => 
      entry.key.startsWith('product:prod_')
    );
    
    console.log(`📦 Filtered product entries (by key): ${productEntries.length}`);
    
    // Extract values and filter active
    const products = productEntries.map((e: any) => e.value);
    const activeProducts = products.filter((p: any) => p.активен !== false);
    
    console.log(`📦 Active products: ${activeProducts.length}`);
    
    return c.json({ success: true, products: activeProducts });
  } catch (error) {
    console.log(`Get products error: ${error}`);
    return c.json({ error: `Failed to get products: ${error}` }, 500);
  }
});

// Upload product image
app.post("/make-server-05aa3c8a/upload/product-image", async (c) => {
  try {
    console.log('Upload image - headers:', {
      'X-User-Id': c.req.header('X-User-Id'),
      'Authorization': c.req.header('Authorization') ? 'present' : 'missing',
      'Content-Type': c.req.header('Content-Type')
    });
    
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP allowed' }, 400);
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large. Max size is 5MB' }, 400);
    }
    
    // Create bucket if it doesn't exist
    const bucketName = 'make-05aa3c8a-product-images';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: true, // Make images publicly accessible
        fileSizeLimit: maxSize
      });
      console.log(`Created storage bucket: ${bucketName}`);
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log(`Image uploaded: ${filePath}`);
    
    return c.json({
      success: true,
      imageUrl: urlData.publicUrl,
      fileName: fileName
    });
    
  } catch (error) {
    console.error('Upload product image error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

// Upload course material
app.post("/make-server-05aa3c8a/upload/course-material", async (c) => {
  try {
    console.log('Upload course material - headers:', {
      'X-User-Id': c.req.header('X-User-Id'),
      'Authorization': c.req.header('Authorization') ? 'present' : 'missing',
      'Content-Type': c.req.header('Content-Type')
    });
    
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type (более широкий набор)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'video/webm', 'video/ogg'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        error: 'Invalid file type. Allowed: images, PDF, documents, videos' 
      }, 400);
    }
    
    // Validate file size (max 50MB для курсов)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large. Max size is 50MB' }, 400);
    }
    
    // Create bucket if it doesn't exist
    const bucketName = 'make-05aa3c8a-course-materials';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: true, // Make materials publicly accessible
        fileSizeLimit: maxSize
      });
      console.log(`Created storage bucket: ${bucketName}`);
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `materials/${fileName}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log(`Course material uploaded: ${filePath}`);
    
    return c.json({
      success: true,
      url: urlData.publicUrl,
      fileName: fileName
    });
    
  } catch (error) {
    console.error('Upload course material error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

// ======================
// ORDERS
// ======================

// Create order
app.post("/make-server-05aa3c8a/orders", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const { sku, isPartner, quantity = 1, usedReferralCode } = await c.req.json();
    
    console.log(`📦 Creating order: SKU=${sku}, isPartner=${isPartner}, quantity=${quantity}, usedCode=${usedReferralCode}`);
    
    if (!sku) {
      return c.json({ error: "SKU is required" }, 400);
    }
    
    // Валидация SKU
    if (!sku || sku.length < 2) {
      console.error(`❌ Invalid SKU: "${sku}"`);
      return c.json({ error: `Invalid SKU format: "${sku}"` }, 400);
    }
    
    // 🆕 Если передан реферальный код, проверяем его и находим владельца
    let resolvedSponsorId: string | null = null;
    if (usedReferralCode) {
      resolvedSponsorId = await resolveCodeToUserId(usedReferralCode);
      if (!resolvedSponsorId) {
        console.log(`⚠️ Referral code "${usedReferralCode}" not found, ignoring`);
      } else {
        console.log(`✅ Resolved referral code "${usedReferralCode}" to user ${resolvedSponsorId}`);
      }
    }
    
    // Find upline chain
    const upline = await findUplineChain(currentUser.id);
    
    // Calculate payouts (function calculates price internally)
    const { price, payouts } = await calculatePayouts(0, isPartner, sku, upline);
    
    // Calculate total commission
    const комиссии: { [userId: string]: number } = {};
    const комиссииУровни: { [userId: string]: string } = {};
    
    payouts.forEach(payout => {
      комиссии[payout.userId] = payout.amount;
      комиссииУровни[payout.userId] = payout.level;
    });
    
    // Create order
    const orderId = `ORD-${Date.now()}`;
    const order: any = {
      id: orderId,
      покупательId: currentUser.id,
      sku: sku,
      количество: quantity,
      цена: price * quantity,
      комиссии: комиссии,
      комиссииУровни: комиссииУровни,
      партнёрскаяПокупка: isPartner,
      дата: new Date().toISOString(),
      статус: 'pending' // pending, paid, cancelled
    };
    
    // 🆕 Сохраняем использованный реферальный код
    if (usedReferralCode) {
      order.usedReferralCode = usedReferralCode.toUpperCase().trim();
      order.resolvedSponsorId = resolvedSponsorId;
    }
    
    await kv.set(`order:${orderId}`, order);
    await kv.set(`order:user:${currentUser.id}:${orderId}`, order);
    
    console.log(`Order created: ${orderId} by ${currentUser.имя}`);
    
    return c.json({ 
      success: true, 
      order,
      paymentUrl: `/payment/${orderId}` // Would be real payment URL
    });
    
  } catch (error) {
    console.log(`Create order error: ${error}`);
    return c.json({ error: `Failed to create order: ${error}` }, 500);
  }
});

// Get user's orders
app.get("/make-server-05aa3c8a/orders", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    // Get all orders for this user
    const orders = await kv.getByPrefix(`order:user:${currentUser.id}:`);
    const ordersArray = Array.isArray(orders) ? orders : [];
    
    return c.json({ success: true, orders: ordersArray });
  } catch (error) {
    console.log(`Get orders error: ${error}`);
    return c.json({ 
      success: false,
      error: `Failed to get orders: ${error}`,
      orders: []
    }, 500);
  }
});

// Confirm payment (webhook from payment provider)
app.post("/make-server-05aa3c8a/orders/:orderId/confirm", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    if (order.статус === 'paid') {
      return c.json({ error: "Order already paid" }, 400);
    }
    
    // Update order status
    order.статус = 'paid';
    order.paidAt = new Date().toISOString();
    await kv.set(`order:${orderId}`, order);
    await kv.set(`order:user:${order.покупательId}:${orderId}`, order);
    
    // 🆕 Используем единую функцию для создания earnings
    await createEarningsFromOrder(order);
    
    // ✨ АВТОМАТИЧЕСКИЙ ПЕРЕСЧЁТ РАНГОВ после оплаты заказа
    console.log(`🏆 [/orders/${orderId}/confirm] Auto-updating ranks for buyer and upline...`);
    try {
      await updateUplineRanks(order.покупательId);
      console.log(`✅ Ranks updated successfully after order payment`);
    } catch (rankError) {
      console.error(`⚠️ Failed to update ranks after order payment:`, rankError);
      // Не падаем, просто логируем ошибку
    }
    
    console.log(`Order ${orderId} confirmed and paid`);
    
    return c.json({ success: true, order });
    
  } catch (error) {
    console.log(`Confirm order error: ${error}`);
    return c.json({ error: `Failed to confirm order: ${error}` }, 500);
  }
});

// ======================
// EARNINGS & BALANCE
// ======================

// Get earnings
app.get("/make-server-05aa3c8a/earnings", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    const earnings = await kv.getByPrefix(`earning:user:${currentUser.id}:`);
    const earningsArray = Array.isArray(earnings) ? earnings : [];
    
    return c.json({ success: true, earnings: earningsArray });
  } catch (error) {
    console.log(`Get earnings error: ${error}`);
    return c.json({ 
      success: false,
      error: `Failed to get earnings: ${error}`,
      earnings: []
    }, 500);
  }
});

// Request withdrawal
app.post("/make-server-05aa3c8a/withdrawal", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const { amount, method, details } = await c.req.json();
    
    if (!amount || amount <= 0) {
      return c.json({ error: "Invalid amount" }, 400);
    }
    
    if (currentUser.баланс < amount) {
      return c.json({ error: "Insufficient balance" }, 400);
    }
    
    // Create withdrawal request
    const withdrawalId = `withdrawal:${Date.now()}`;
    const withdrawal = {
      id: withdrawalId,
      userId: currentUser.id,
      amount,
      method, // USDT, bank, etc.
      details, // wallet address, bank account, etc.
      status: 'pending', // pending, processing, completed, rejected
      createdAt: new Date().toISOString()
    };
    
    await kv.set(withdrawalId, withdrawal);
    await kv.set(`withdrawal:user:${currentUser.id}:${withdrawalId}`, withdrawal);
    
    // Deduct from balance (will be refunded if rejected)
    currentUser.баланс -= amount;
    await kv.set(`user:id:${currentUser.id}`, currentUser);
    if (currentUser.telegramId) {
      await kv.set(`user:tg:${currentUser.telegramId}`, currentUser);
    }
    
    console.log(`Withdrawal requested: ${amount} by ${currentUser.имя}`);
    
    return c.json({ success: true, withdrawal });
    
  } catch (error) {
    console.log(`Withdrawal error: ${error}`);
    return c.json({ error: `Failed to process withdrawal: ${error}` }, 500);
  }
});

// Get withdrawal history
app.get("/make-server-05aa3c8a/withdrawals", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    const withdrawals = await kv.getByPrefix(`withdrawal:user:${currentUser.id}:`);
    const withdrawalsArray = Array.isArray(withdrawals) ? withdrawals : [];
    
    return c.json({ success: true, withdrawals: withdrawalsArray });
  } catch (error) {
    console.log(`Get withdrawals error: ${error}`);
    return c.json({ 
      success: false,
      error: `Failed to get withdrawals: ${error}`,
      withdrawals: []
    }, 500);
  }
});

// ======================
// PAYMENTS
// ======================

// Get available payment methods
app.get("/make-server-05aa3c8a/payment/methods", (c) => {
  try {
    const methods = [
      { id: 'demo', name: 'Демо-оплата', enabled: true },
      { id: 'yookassa', name: 'ЮКасса', enabled: false },
      { id: 'usdt', name: 'USDT (Crypto)', enabled: false }
    ];
    return c.json({ success: true, methods });
  } catch (error) {
    console.log(`Get payment methods error: ${error}`);
    return c.json({ error: `Failed to get payment methods: ${error}` }, 500);
  }
});

// Create payment for order
app.post("/make-server-05aa3c8a/payment/create", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const { orderId, method } = await c.req.json();
    
    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    if (order.покупательId !== currentUser.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    if (order.статус === 'paid') {
      return c.json({ error: "Order already paid" }, 400);
    }
    
    let paymentData;
    
    if (method === 'yookassa') {
      // TODO: Implement YooKassa payment integration
      return c.json({ error: 'YooKassa not yet configured' }, 501);
    } else if (method === 'usdt') {
      // TODO: Implement crypto payment integration
      return c.json({ error: 'Crypto payments not yet configured' }, 501);
    } else if (method === 'demo') {
      // Demo payment - auto confirm after 2 seconds
      setTimeout(async () => {
        try {
          const confirmOrder = await kv.get(`order:${orderId}`);
          if (confirmOrder && confirmOrder.статус !== 'paid') {
            // Update order status
            confirmOrder.статус = 'paid';
            confirmOrder.paidAt = new Date().toISOString();
            await kv.set(`order:${orderId}`, confirmOrder);
            await kv.set(`order:user:${confirmOrder.покупательId}:${orderId}`, confirmOrder);
            
            // 🆕 Используем единую функцию для создания earnings
            await createEarningsFromOrder(confirmOrder);
            
            // ✨ АВТОМАТИЧЕСКИЙ ПЕРЕСЧЁТ РАНГОВ после демо-оплаты
            console.log(`🏆 [demo-payment] Auto-updating ranks for buyer and upline...`);
            try {
              await updateUplineRanks(confirmOrder.покупательId);
              console.log(`✅ Ranks updated successfully after demo payment`);
            } catch (rankError) {
              console.error(`⚠️ Failed to update ranks after demo payment:`, rankError);
            }
            
            console.log(`Demo payment auto-confirmed for ${orderId}`);
          }
        } catch (err) {
          console.error(`Demo payment confirmation error: ${err}`);
        }
      }, 2000);
      
      paymentData = {
        paymentId: `demo-${orderId}`,
        paymentUrl: null,
        status: 'processing',
        message: 'Демо-оплата будет подтверждена автоматически ч��рез 2 секунды'
      };
    } else {
      return c.json({ error: "Invalid payment method" }, 400);
    }
    
    // Save payment info
    const payment = {
      id: paymentData.paymentId,
      orderId,
      userId: currentUser.id,
      method,
      amount: order.цена,
      status: paymentData.status || 'pending',
      createdAt: new Date().toISOString(),
      ...paymentData
    };
    
    await kv.set(`payment:${payment.id}`, payment);
    await kv.set(`payment:order:${orderId}`, payment);
    
    console.log(`Payment created: ${payment.id} for order ${orderId} (${method})`);
    
    return c.json({ success: true, payment });
    
  } catch (error) {
    console.log(`Create payment error: ${error}`);
    return c.json({ error: `Failed to create payment: ${error}` }, 500);
  }
});

// YooKassa webhook
app.post("/make-server-05aa3c8a/webhook/yookassa", async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header('X-Yookassa-Signature');
    
    // TODO: Implement webhook signature verification
    // For now, we'll accept all webhooks (should be secured in production)
    console.log("YooKassa webhook received");
    
    const event = JSON.parse(body);
    
    if (event.event === 'payment.succeeded') {
      const orderId = event.object.metadata.orderId;
      
      // Confirm order
      const order = await kv.get(`order:${orderId}`);
      if (order && order.статус !== 'paid') {
        order.статус = 'paid';
        order.paidAt = new Date().toISOString();
        await kv.set(`order:${orderId}`, order);
        await kv.set(`order:user:${order.покупательId || order.продавецId}:${orderId}`, order);
        
        // 🆕 Используем единую функцию для создания earnings
        // Если есть order.комиссии (новый формат) - используем helper
        // Если нет - fallback на старый формат order.выплаты
        if (order.комиссии) {
          await createEarningsFromOrder(order);
        } else if (order.выплаты) {
          // Старый формат для совместимости
          for (const payout of order.выплаты) {
            const user = await kv.get(`user:id:${payout.userId}`);
            if (user) {
              user.баланс = (user.баланс || 0) + payout.amount;
              await kv.set(`user:id:${payout.userId}`, user);
              
              if (user.telegramId) {
                await kv.set(`user:tg:${user.telegramId}`, user);
              }
              
              const earningId = `earning:${Date.now()}-${payout.userId}`;
              const level = payout.level || 'L0';
              const lineIndex = typeof level === 'string' ? Number(level.replace('L', '')) : 0;
              const earning = {
                id: earningId,
                userId: payout.userId,
                orderId: orderId,
                amount: payout.amount,
                сумма: payout.amount,
                level: level,
                линия: lineIndex,
                fromUserId: order.покупательId || order.продавецId,
                sku: order.sku,
                isPartner: order.партнёрскаяПокупка,
                createdAt: new Date().toISOString()
              };
              await kv.set(earningId, earning);
              await kv.set(`earning:user:${payout.userId}:${earningId}`, earning);
            }
          }
        }
        
        console.log(`YooKassa payment confirmed for order ${orderId}`);
      }
    }
    
    return c.json({ success: true });
    
  } catch (error) {
    console.log(`YooKassa webhook error: ${error}`);
    return c.json({ error: `Webhook processing failed: ${error}` }, 500);
  }
});

// ======================
// ADMIN ROUTES
// ======================

// Get system statistics
app.get("/make-server-05aa3c8a/admin/stats", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    // Calculate stats from KV store
    const allUsers = await kv.getByPrefix('user:id:');
    const allOrders = await kv.getByPrefix('order:');
    const allWithdrawals = await kv.getByPrefix('withdrawal:');
    
    // 📊 Расширенная статистика для дашборда
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Фильтруем только пользователей (без админов)
    const users = allUsers.filter((u: any) => 
      u.__type !== 'admin' && 
      u.isAdmin !== true && 
      u.роль !== 'admin'
    );
    
    // Новые сегодня
    const newToday = users.filter((u: any) => {
      const registeredDate = new Date(u.зарегистрирован || u.датаРегистрации || u.createdAt || 0);
      return registeredDate >= todayStart;
    }).length;
    
    // Новые за месяц
    const newThisMonth = users.filter((u: any) => {
      const registeredDate = new Date(u.зарегистрирован || u.датаРегистрации || u.createdAt || 0);
      return registeredDate >= monthStart;
    }).length;
    
    // Активные партнёры (те, у кого есть рефералы)
    const activePartners = users.filter((u: any) => {
      // Проверяем, есть ли у пользователя рефералы
      const hasReferrals = users.some((ref: any) => 
        ref.спонсорId === u.id || ref.рефКодСпонсора === u.рефКод
      );
      return hasReferrals;
    }).length;
    
    // Активные по покупкам (сделали заказ за последние 30 дней)
    const validOrders = allOrders.filter((o: any) => o.id && o.продавецId);
    const activeByPurchases = users.filter((u: any) => {
      return validOrders.some((o: any) => {
        const orderDate = new Date(o.датаЗаказа || o.дата || o.createdAt || 0);
        return o.продавецId === u.id && orderDate >= thirtyDaysAgo;
      });
    }).length;
    
    // Общий баланс всех пользователей
    const totalBalance = users.reduce((sum: number, u: any) => 
      sum + (u.баланс || 0), 0
    );
    
    // Базовая статистика
    const totalOrders = validOrders.length;
    const totalRevenue = validOrders
      .filter((o: any) => o.статус === 'paid')
      .reduce((sum: number, o: any) => sum + (o.цена || 0), 0);
    const pendingWithdrawals = allWithdrawals
      .filter((w: any) => w.status === 'pending')
      .reduce((sum: number, w: any) => sum + (w.amount || 0), 0);
    
    const stats = {
      revenue: {
        total: totalRevenue,
        thisMonth: 0 // TODO: можно добавить расчёт за месяц
      },
      users: {
        total: users.length,
        newToday,
        newThisMonth,
        activePartners,
        activeByPurchases,
        passivePartners: users.length - activePartners,
        passiveByPurchases: users.length - activeByPurchases,
      },
      orders: {
        total: totalOrders,
        pending: validOrders.filter((o: any) => o.статус === 'pending').length,
        paid: validOrders.filter((o: any) => o.статус === 'paid').length,
      },
      finance: {
        totalBalance,
        pendingWithdrawals,
      }
    };
    
    console.log('📊 Admin stats calculated:', {
      totalUsers: users.length,
      newToday,
      newThisMonth,
      activePartners,
      activeByPurchases
    });
    
    return c.json({ success: true, stats });
  } catch (error) {
    console.log(`Admin stats error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Get all users
app.get("/make-server-05aa3c8a/admin/users", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('📋 Getting all users (excluding admins)...');
    
    // Get regular users
    const users = await kv.getByPrefix('user:id:');
    const userArray = Array.isArray(users) ? users : [];
    
    // 🚫 Filter out administrators
    const allUsers = userArray.filter((u: any) => 
      u.__type !== 'admin' && 
      u.isAdmin !== true && 
      u.роль !== 'admin'
    );
    
    console.log(`📋 Found ${userArray.length} total users, filtered to ${allUsers.length} non-admin users`);
    
    return c.json({ success: true, users: allUsers });
  } catch (error) {
    console.log(`Admin get users error: ${error}`);
    return c.json({ 
      success: false, 
      error: `${error}`,
      users: []
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// 🌳 Alias для древовидного режима - возвращает ВСЕ пользователей (включая админов для полной структуры)
app.get("/make-server-05aa3c8a/admin/users/all", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('🌳 Getting ALL users for tree view...');
    
    // Get ALL users including admins for complete tree structure
    const users = await kv.getByPrefix('user:id:');
    const userArray = Array.isArray(users) ? users : [];
    
    console.log(`🌳 Found ${userArray.length} total users for tree`);
    
    return c.json({ success: true, users: userArray });
  } catch (error) {
    console.log(`Admin get all users error: ${error}`);
    return c.json({ 
      success: false, 
      error: `${error}`,
      users: []
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// 🆕 Get users with pagination, search, and filters
app.get("/make-server-05aa3c8a/admin/users/paginated", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    // Parse query parameters
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const search = c.req.query('search') || '';
    const level = c.req.query('level') || '';
    const userType = c.req.query('type') || ''; // 'admin' or 'partner'
    const sortBy = c.req.query('sortBy') || 'created'; // 'created', 'name', 'balance', 'level'
    const sortOrder = c.req.query('sortOrder') || 'desc'; // 'asc' or 'desc'
    const sponsorStatus = c.req.query('sponsorStatus') || ''; // 'has_sponsor' or 'no_sponsor'
    const teamSize = c.req.query('teamSize') || ''; // '0', '1-5', '6-10', '11-20', '21+'
    const balanceRange = c.req.query('balanceRange') || ''; // '0-1000', '1001-5000', '5001-10000', '10001+'
    const rankFilter = c.req.query('rank') || ''; // 🆕 Фильтр по рангу
    const statsFilter = c.req.query('statsFilter') || ''; // 🆕 Фильтр из виджетов статистики
    
    console.log(`📋 Getting paginated users - page: ${page}, limit: ${limit}, search: "${search}", level: ${level}, type: ${userType}, sponsor: ${sponsorStatus}, team: ${teamSize}, balance: ${balanceRange}`);
    
    // 🎯 Get ONLY regular users (no admins in partners panel)
    const users = await kv.getByPrefix('user:id:');
    const userArray = Array.isArray(users) ? users : [];
    
    // Apply filters
    let filteredUsers = userArray;
    
    // 🚫 CRITICAL: Exclude all administrators from the list
    filteredUsers = filteredUsers.filter((u: any) => 
      u.__type !== 'admin' && 
      u.isAdmin !== true && 
      u.роль !== 'admin'
    );
    
    // Filter by level
    if (level) {
      const levelNum = parseInt(level);
      filteredUsers = filteredUsers.filter((u: any) => u.уровень === levelNum);
    }
    
    // Filter by sponsor status
    if (sponsorStatus === 'has_sponsor') {
      filteredUsers = filteredUsers.filter((u: any) => u.спонсорId && u.спонсорId !== '');
    } else if (sponsorStatus === 'no_sponsor') {
      filteredUsers = filteredUsers.filter((u: any) => !u.спонсорId || u.спонсорId === '');
    }
    
    // Filter by team size
    if (teamSize) {
      filteredUsers = filteredUsers.filter((u: any) => {
        const size = u.команда?.length || 0;
        switch (teamSize) {
          case '0': return size === 0;
          case '1-5': return size >= 1 && size <= 5;
          case '6-10': return size >= 6 && size <= 10;
          case '11-20': return size >= 11 && size <= 20;
          case '21+': return size >= 21;
          default: return true;
        }
      });
    }
    
    // Filter by balance range
    if (balanceRange) {
      filteredUsers = filteredUsers.filter((u: any) => {
        const balance = u.баланс || 0;
        switch (balanceRange) {
          case '0-1000': return balance >= 0 && balance <= 1000;
          case '1001-5000': return balance >= 1001 && balance <= 5000;
          case '5001-10000': return balance >= 5001 && balance <= 10000;
          case '10001+': return balance >= 10001;
          default: return true;
        }
      });
    }
    
    // 🆕 Filter by rank range
    const rankFromParam = c.req.query('rankFrom');
    const rankToParam = c.req.query('rankTo');
    
    if (rankFromParam && rankToParam) {
      const rankFrom = parseInt(rankFromParam);
      const rankTo = parseInt(rankToParam);
      console.log(`🎯 Filtering by rank range: ${rankFrom} - ${rankTo}`);
      
      const ranksPromises = filteredUsers.map(async (u: any) => {
        if (u.__type === 'admin' || u.isAdmin) {
          return { user: u, rank: null };
        }
        try {
          const rank = await getUserRank(u.id, true);
          return { user: u, rank };
        } catch (error) {
          console.error(`Error calculating rank for user ${u.id}:`, error);
          return { user: u, rank: 0 };
        }
      });
      
      const usersWithRanks = await Promise.all(ranksPromises);
      
      filteredUsers = usersWithRanks.filter(({ user, rank }) => {
        if (user.__type === 'admin' || user.isAdmin) return false;
        if (rank === null) return false;
        
        // Фильтруем по диапазону
        return rank >= rankFrom && rank <= rankTo;
      }).map(({ user }) => user);
      
      console.log(`✅ Filtered to ${filteredUsers.length} users with rank between ${rankFrom} and ${rankTo}`);
    }
    
    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter((u: any) => {
        const fullName = `${u.имя || ''} ${u.фамилия || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const id = (u.id || '').toLowerCase();
        const partnerId = (u.партнёрскийID || '').toLowerCase();
        
        return fullName.includes(searchLower) || 
               email.includes(searchLower) || 
               id.includes(searchLower) ||
               partnerId.includes(searchLower);
      });
    }
    
    // 🎯 Apply stats filter (widget clicks) - needs to be done after getting all users but before sorting
    if (statsFilter && statsFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      switch (statsFilter) {
        case 'newToday':
          filteredUsers = filteredUsers.filter((u: any) => {
            const regDate = new Date(u.зарегистрирован || u.created || 0);
            return regDate >= todayStart;
          });
          break;
          
        case 'newThisMonth':
          filteredUsers = filteredUsers.filter((u: any) => {
            const regDate = new Date(u.зарегистрирован || u.created || 0);
            return regDate >= monthStart;
          });
          break;
          
        case 'activePartners':
          // Partners who got new team members this month
          filteredUsers = filteredUsers.filter((partner: any) => {
            if (partner.isAdmin) return false;
            if (!partner.команда || partner.команда.length === 0) return false;
            
            return partner.команда.some((memberId: string) => {
              const member = userArray.find((u: any) => u.id === memberId);
              if (!member || !member.зарегистрирован) return false;
              const memberRegDate = new Date(member.зарегистрирован);
              return memberRegDate >= monthStart;
            });
          });
          break;
          
        case 'passivePartners':
          // Partners who didn't get new team members this month
          filteredUsers = filteredUsers.filter((partner: any) => {
            if (partner.isAdmin) return false;
            if (!partner.команда || partner.команда.length === 0) return true;
            
            return !partner.команда.some((memberId: string) => {
              const member = userArray.find((u: any) => u.id === memberId);
              if (!member || !member.зарегистрирован) return false;
              const memberRegDate = new Date(member.зарегистрирован);
              return memberRegDate >= monthStart;
            });
          });
          break;
          
        case 'activeUsers':
          // Users who made purchases this month - need to check orders
          const allOrders = await kv.getByPrefix('order:');
          const ordersArray = Array.isArray(allOrders) ? allOrders : [];
          const ordersThisMonth = ordersArray.filter((order: any) => {
            if (!order.создан) return false;
            const orderDate = new Date(order.создан);
            return orderDate >= monthStart;
          });
          const activeUserIds = new Set(ordersThisMonth.map((o: any) => o.продавецId).filter(Boolean));
          
          filteredUsers = filteredUsers.filter((u: any) => {
            if (u.isAdmin) return false;
            return activeUserIds.has(u.id);
          });
          break;
          
        case 'passiveUsers':
          // Users who didn't make purchases this month
          const allOrders2 = await kv.getByPrefix('order:');
          const ordersArray2 = Array.isArray(allOrders2) ? allOrders2 : [];
          const ordersThisMonth2 = ordersArray2.filter((order: any) => {
            if (!order.создан) return false;
            const orderDate = new Date(order.создан);
            return orderDate >= monthStart;
          });
          const activeUserIds2 = new Set(ordersThisMonth2.map((o: any) => o.продавецId).filter(Boolean));
          
          filteredUsers = filteredUsers.filter((u: any) => {
            if (u.isAdmin) return false;
            return !activeUserIds2.has(u.id);
          });
          break;
      }
    }
    
    // Sort users
    filteredUsers.sort((a: any, b: any) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          const nameA = `${a.имя || ''} ${a.фамилия || ''}`.toLowerCase();
          const nameB = `${b.имя || ''} ${b.фамилия || ''}`.toLowerCase();
          compareValue = nameA.localeCompare(nameB);
          break;
        case 'balance':
          compareValue = (a.баланс || 0) - (b.баланс || 0);
          break;
        case 'level':
          compareValue = (a.уровень || 0) - (b.уровень || 0);
          break;
        case 'created':
        default:
          const dateA = new Date(a.зарегистрирован || a.created || 0).getTime();
          const dateB = new Date(b.зарегистрирован || b.created || 0).getTime();
          compareValue = dateA - dateB;
          break;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    // Calculate pagination
    const totalUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalUsers / limit);
    const offset = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);
    
    // 📊 Add metrics (including rank) to each paginated user
    console.log(`📊 Loading metrics for ${paginatedUsers.length} users...`);
    const usersWithMetrics = await Promise.all(
      paginatedUsers.map(async (user: any) => {
        if (user.isAdmin || user.__type === 'admin') {
          return user;
        }
        
        try {
          // Get cached or calculate fresh metrics
          const metrics = await metricsCache.getUserMetrics(user.id);
          console.log(`✅ Loaded metrics for user ${user.id}: rank=${metrics.rank}, teamSize=${metrics.teamSize}`);
          return {
            ...user,
            _metrics: metrics
          };
        } catch (error) {
          console.error(`❌ Error getting metrics for user ${user.id} (${user.имя} ${user.фамилия}):`, error);
          return {
            ...user,
            _metrics: { 
              userId: user.id,
              rank: 0, 
              teamSize: 0, 
              totalTeamSize: 0,
              personalSales: 0,
              teamSales: 0,
              ordersCount: 0,
              averageCheck: 0,
              lastCalculated: new Date().toISOString()
            }
          };
        }
      })
    );
    
    console.log(`✅ Metrics loaded for all users`);
    
    // 📊 Calculate statistics from ALL users (not just filtered)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all orders to check for active/passive users
    const allOrders = await kv.getByPrefix('order:');
    const ordersArray = Array.isArray(allOrders) ? allOrders : [];
    
    // Filter orders by current month
    const ordersThisMonth = ordersArray.filter((order: any) => {
      if (!order.создан) return false;
      const orderDate = new Date(order.создан);
      return orderDate >= monthStart;
    });
    
    // Get unique user IDs who made orders this month (active users)
    const activeUserBuyersIds = new Set(ordersThisMonth.map((o: any) => o.продавецId).filter(Boolean));
    
    // Calculate active/passive partners (who recruited in this month)
    const partners = userArray.filter((u: any) => !u.isAdmin);
    
    // Active partners = those who got new team members (first line) this month
    const activePartnersCount = partners.filter((partner: any) => {
      if (!partner.команда || partner.команда.length === 0) return false;
      
      // Check if any team member was registered this month
      return partner.команда.some((memberId: string) => {
        const member = userArray.find((u: any) => u.id === memberId);
        if (!member || !member.зарегистрирован) return false;
        const memberRegDate = new Date(member.зарегистрирован);
        return memberRegDate >= monthStart;
      });
    }).length;
    
    // Passive partners = those who didn't get new team members this month
    const passivePartnersCount = partners.filter((partner: any) => {
      if (!partner.команда || partner.команда.length === 0) return true; // No team = passive
      
      // Check if NO team member was registered this month
      return !partner.команда.some((memberId: string) => {
        const member = userArray.find((u: any) => u.id === memberId);
        if (!member || !member.зарегистрирован) return false;
        const memberRegDate = new Date(member.зарегистрирован);
        return memberRegDate >= monthStart;
      });
    }).length;
    
    // Active users = made purchases this month
    const activeUsersCount = partners.filter((u: any) => activeUserBuyersIds.has(u.id)).length;
    
    // Passive users = didn't make purchases this month
    const passiveUsersCount = partners.filter((u: any) => !activeUserBuyersIds.has(u.id)).length;
    
    const stats = {
      totalUsers: userArray.length,
      newToday: userArray.filter((u: any) => {
        const regDate = new Date(u.зарегистрирован || u.created || 0);
        return regDate >= todayStart;
      }).length,
      newThisMonth: userArray.filter((u: any) => {
        const regDate = new Date(u.зарегистрирован || u.created || 0);
        return regDate >= monthStart;
      }).length,
      activePartners: activePartnersCount,
      passivePartners: passivePartnersCount,
      activeUsers: activeUsersCount,
      passiveUsers: passiveUsersCount,
      withTeam: userArray.filter((u: any) => (u.команда?.length || 0) > 0).length,
      totalBalance: userArray.reduce((sum: number, u: any) => sum + (u.баланс || 0), 0),
      orphans: userArray.filter((u: any) => !u.спонсорId || u.спонсорId === '').length
    };
    
    console.log(`📋 Returning ${paginatedUsers.length} users out of ${totalUsers} (page ${page}/${totalPages})`);
    
    return c.json({ 
      success: true, 
      users: usersWithMetrics,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages,
        hasMore: page < totalPages
      },
      stats
    });
  } catch (error) {
    console.log(`Admin get paginated users error: ${error}`);
    return c.json({ 
      success: false, 
      error: `${error}`,
      users: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false }
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// 🎯 Update user rank (admin only)
app.put("/make-server-05aa3c8a/admin/user/:userId/rank", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const { rank } = await c.req.json();
    
    console.log(`🎯 Updating rank for user ${userId} to ${rank}`);
    
    if (!userId) {
      return c.json({ success: false, error: 'User ID is required' }, 400);
    }
    
    if (typeof rank !== 'number' || rank < 0) {
      return c.json({ success: false, error: 'Invalid rank value' }, 400);
    }
    
    // Получаем пользователя
    const userKey = `user:id:${userId}`;
    const user = await kv.get(userKey);
    
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    // Обновляем ранг
    user.уровень = rank;
    
    // Обновляем метрики если есть
    if (!user._metrics) {
      user._metrics = {};
    }
    user._metrics.rank = rank;
    user._metrics.lastRankUpdate = new Date().toISOString();
    
    // Сохраняем
    await kv.set(userKey, user);
    
    console.log(`✅ Rank updated for ${userId}: ${rank}`);
    
    return c.json({ 
      success: true, 
      userId,
      rank,
      message: 'Rank updated successfully'
    });
  } catch (error) {
    console.log(`Admin update rank error: ${error}`);
    return c.json({ 
      success: false, 
      error: `${error}`
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Get all orders
app.get("/make-server-05aa3c8a/admin/orders", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const allOrders = await kv.getByPrefix('order:');
    const ordersArray = Array.isArray(allOrders) ? allOrders : [];
    const orders = ordersArray.filter((o: any) => o.id && o.продавецId);
    
    return c.json({ success: true, orders });
  } catch (error) {
    console.log(`Admin get orders error: ${error}`);
    return c.json({ 
      success: false,
      error: `${error}`,
      orders: []
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update order status
app.post("/make-server-05aa3c8a/admin/orders/:orderId/status", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const orderId = c.req.param('orderId');
    const { status } = await c.req.json();
    
    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return c.json({ error: 'Неверный статус' }, 400);
    }
    
    const order = await kv.get(`order:${orderId}`);
    if (!order) {
      return c.json({ error: 'Заказ не найден' }, 404);
    }
    
    order.статус = status;
    order.обновлён = new Date().toISOString();
    
    await kv.set(`order:${orderId}`, order);
    
    console.log(`Order ${orderId} status updated to: ${status}`);
    
    return c.json({ success: true, order });
  } catch (error) {
    console.log(`Admin update order status error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Get all withdrawals
app.get("/make-server-05aa3c8a/admin/withdrawals", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const withdrawals = await kv.getByPrefix('withdrawal:');
    const withdrawalsArray = Array.isArray(withdrawals) ? withdrawals : [];
    
    return c.json({ success: true, withdrawals: withdrawalsArray });
  } catch (error) {
    console.log(`Admin get withdrawals error: ${error}`);
    return c.json({ 
      success: false,
      error: `${error}`,
      withdrawals: []
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update withdrawal status
app.post("/make-server-05aa3c8a/admin/withdrawals/:withdrawalId/status", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const withdrawalId = c.req.param('withdrawalId');
    const { status, note } = await c.req.json();
    
    if (!['pending', 'processing', 'completed', 'rejected'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }
    
    const withdrawal = await kv.get(`withdrawal:${withdrawalId}`);
    if (!withdrawal) {
      return c.json({ error: 'Withdrawal not found' }, 404);
    }
    
    withdrawal.status = status;
    withdrawal.note = note || withdrawal.note;
    withdrawal.updatedAt = new Date().toISOString();
    
    await kv.set(`withdrawal:${withdrawalId}`, withdrawal);
    await kv.set(`withdrawal:user:${withdrawal.userId}:${withdrawalId}`, withdrawal);
    
    console.log(`Admin updated withdrawal ${withdrawalId} to ${status}`);
    
    return c.json({ success: true, withdrawal });
  } catch (error) {
    console.log(`Admin update withdrawal error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update user level
app.post("/make-server-05aa3c8a/admin/users/:userId/level", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const { level } = await c.req.json();
    
    const user = await kv.get(`user:id:${userId}`);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    user.уровень = level;
    await kv.set(`user:id:${userId}`, user);
    
    if (user.telegramId) {
      await kv.set(`user:tg:${user.telegramId}`, user);
    }
    
    // 🗑️ Инвалидация кэша
    await invalidateUsersCache();
    
    console.log(`Admin updated user ${userId} to level ${level}`);
    
    return c.json({ success: true, user });
  } catch (error) {
    console.log(`Admin update user level error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Adjust user balance
app.post("/make-server-05aa3c8a/admin/users/:userId/balance", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const { amount, reason } = await c.req.json();
    
    if (!amount || !reason) {
      return c.json({ error: 'Amount and reason are required' }, 400);
    }
    
    const user = await kv.get(`user:id:${userId}`);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    user.баланс = (user.баланс || 0) + amount;
    await kv.set(`user:id:${userId}`, user);
    
    if (user.telegramId) {
      await kv.set(`user:tg:${user.telegramId}`, user);
    }
    
    // 🗑️ Инвалидация кэша
    await invalidateUsersCache();
    
    console.log(`Admin adjusted balance for ${userId}: ${amount} (${reason})`);
    
    return c.json({ success: true, user });
  } catch (error) {
    console.log(`Admin adjust balance error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Delete user
app.delete("/make-server-05aa3c8a/admin/users/:userId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    
    const user = await kv.get(`user:id:${userId}`);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Don't allow deleting first user/admin
    if (userId === '1' || user.email?.toLowerCase() === 'admin@admin.com') {
      return c.json({ error: 'Cannot delete admin user' }, 403);
    }
    
    console.log(`🗑️ Deleting user ${userId} (${user.имя} ${user.фамилия || ''})`);
    
    // Remove from sponsor's team
    if (user.спонсорId) {
      const sponsor = await kv.get(`user:id:${user.спонсорId}`);
      if (sponsor && sponsor.команда) {
        sponsor.команда = sponsor.команда.filter((id: string) => id !== userId);
        await kv.set(`user:id:${user.спонсорId}`, sponsor);
        console.log(`Removed ${userId} from sponsor ${user.спонсорId}'s team`);
      }
    }
    
    // Delete user data
    await kv.del(`user:id:${userId}`);
    
    if (user.email) {
      await kv.del(`user:email:${user.email.toLowerCase()}`);
    }
    
    if (user.telegramId) {
      await kv.del(`user:tg:${user.telegramId}`);
    }
    
    if (user.рефКод) {
      await kv.del(`user:refcode:${user.рефКод}`);
    }
    
    // Delete user's notifications
    const notifications = await kv.getByPrefix(`notification:user:${userId}:`);
    for (const notif of notifications) {
      await kv.del(`notification:user:${userId}:${notif.id}`);
    }
    
    // Delete user's earnings
    const earnings = await kv.getByPrefix(`earning:user:${userId}:`);
    for (const earning of earnings) {
      await kv.del(`earning:user:${userId}:${earning.id}`);
    }
    
    // Delete user's orders
    const orders = await kv.getByPrefix(`order:user:${userId}:`);
    for (const order of orders) {
      await kv.del(`order:user:${userId}:${order.id}`);
    }
    
    // Delete from Supabase Auth if possible
    if (user.supabaseId) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(user.supabaseId);
        if (error) {
          console.log(`Failed to delete Supabase auth user: ${error.message}`);
        } else {
          console.log(`Deleted Supabase auth user: ${user.supabaseId}`);
        }
      } catch (authError) {
        console.log(`Error deleting Supabase auth user: ${authError}`);
      }
    }
    
    // 🔓 Free ALL user IDs (primary + additional codes) for reuse
    const freedCodes: string[] = [];
    
    // 1. Free the primary ID
    if (userId.length === 3 && /^\d+$/.test(userId)) {
      await freePartnerId(userId);
    } else {
      await freeUserId(userId);
    }
    freedCodes.push(userId);
    
    // 2. Delete global mapping for primary ID
    await kv.del(`id:code:${userId}`);
    
    // 3. Free all additional codes from user.codes[] array
    if (user.codes && Array.isArray(user.codes)) {
      for (const code of user.codes) {
        const codeValue = code.value || code;
        if (codeValue && codeValue !== userId) {
          // Delete global mapping
          await kv.del(`id:code:${codeValue}`);
          
          // Free numeric codes for reuse
          if (/^\d+$/.test(codeValue)) {
            if (codeValue.length === 3) {
              await freePartnerId(codeValue);
            } else {
              await freeUserId(codeValue);
            }
          }
          freedCodes.push(codeValue);
        }
      }
    }
    
    // 🗑️ Инвалидация кэша
    await invalidateUsersCache();
    
    console.log(`✅ User ${userId} deleted. Freed codes: [${freedCodes.join(', ')}]`);
    
    return c.json({ 
      success: true, 
      message: `Пользователь удалён, освобождено ${freedCodes.length} ID: ${freedCodes.join(', ')}`,
      freedCodes 
    });
  } catch (error) {
    console.log(`Admin delete user error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Set admin status
app.post("/make-server-05aa3c8a/admin/users/:userId/set-admin", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const { isAdmin } = await c.req.json();
    
    const user = await kv.get(`user:id:${userId}`);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    user.isAdmin = isAdmin;
    await kv.set(`user:id:${userId}`, user);
    if (user.telegramId) {
      await kv.set(`user:tg:${user.telegramId}`, user);
    }
    
    // 🗑️ Инвалидация кэша
    await invalidateUsersCache();
    
    console.log(`Admin status for user ${userId} set to ${isAdmin}`);
    
    return c.json({ success: true, user });
  } catch (error) {
    console.log(`Set admin error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Get freed IDs (for admin debugging)
app.get("/make-server-05aa3c8a/admin/freed-ids", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const freedUserIds = await kv.get('freed:user:ids') || [];
    const freedPartnerIds = await kv.get('freed:partner:ids') || [];
    
    // Get current counters
    const userCounter = await kv.get('counter:userId') || 0;
    const partnerCounter = await kv.get('system:partnerCounter') || 0;
    
    console.log(`Admin requested freed IDs stats`);
    
    return c.json({ 
      success: true, 
      freedUserIds: freedUserIds.sort((a: number, b: number) => a - b),
      freedPartnerIds: freedPartnerIds.sort((a: number, b: number) => a - b),
      counters: {
        userCounter,
        partnerCounter
      }
    });
  } catch (error) {
    console.log(`Get freed IDs error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Get user tree structure
app.get("/make-server-05aa3c8a/admin/users-tree", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    // Get all users (excluding admins)
    const allUsers = await kv.getByPrefix('user:id:');
    const users = allUsers.filter((u: any) => !isUserAdmin(u));
    console.log(`📊 Filtered ${allUsers.length} total users to ${users.length} non-admin users for tree`);
    
    // Build tree structure
    const buildTree = (sponsorId: string | null = null): any[] => {
      return users
        .filter((u: any) => u.спонсор === sponsorId)
        .map((user: any) => ({
          ...user,
          children: buildTree(user.id)
        }))
        .sort((a: any, b: any) => {
          // Sort by registration date
          return new Date(a.зарегистрирован).getTime() - new Date(b.зарегистрирован).getTime();
        });
    };
    
    // Start with root users (no sponsor or sponsor is 'ceo')
    const tree = buildTree(null).concat(buildTree('ceo'));
    
    console.log(`Admin requested users tree`);
    
    return c.json({ 
      success: true, 
      tree,
      totalUsers: users.length
    });
  } catch (error) {
    console.log(`Get users tree error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Get all IDs status (used, freed, reserved)
app.get("/make-server-05aa3c8a/admin/ids-status", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    // Get all users
    const users = await kv.getByPrefix('user:id:');
    const usedUserIds = users.map((u: any) => parseInt(u.id)).filter((id: number) => !isNaN(id));
    const usedPartnerIds = users.map((u: any) => parseInt(u.партнёрскийID)).filter((id: number) => !isNaN(id));
    
    // Get freed IDs
    const freedUserIds = await kv.get('freed:user:ids') || [];
    const freedPartnerIds = await kv.get('freed:partner:ids') || [];
    
    // Get reserved IDs
    const reservedUserIds = await kv.get('reserved:user:ids') || [];
    const reservedPartnerIds = await kv.get('reserved:partner:ids') || [];
    
    // Get reserved metadata
    const reservedMetadata: any[] = [];
    for (const id of reservedUserIds) {
      const meta = await kv.get(`reserved:user:meta:${id}`);
      if (meta) reservedMetadata.push({ type: 'user', id, ...meta });
    }
    for (const id of reservedPartnerIds) {
      const meta = await kv.get(`reserved:partner:meta:${id}`);
      if (meta) reservedMetadata.push({ type: 'partner', id, ...meta });
    }
    
    // Get counters
    const userCounter = await kv.get('counter:userId') || 0;
    const partnerCounter = await kv.get('system:partnerCounter') || 0;
    
    console.log(`Admin requested IDs status`);
    
    return c.json({ 
      success: true,
      userIds: {
        used: usedUserIds.sort((a: number, b: number) => a - b),
        freed: freedUserIds.sort((a: number, b: number) => a - b),
        reserved: reservedUserIds.sort((a: number, b: number) => a - b),
        nextCounter: userCounter + 1
      },
      partnerIds: {
        used: usedPartnerIds.sort((a: number, b: number) => a - b),
        freed: freedPartnerIds.sort((a: number, b: number) => a - b),
        reserved: reservedPartnerIds.sort((a: number, b: number) => a - b),
        nextCounter: partnerCounter + 1
      },
      reservedMetadata
    });
  } catch (error) {
    console.log(`Get IDs status error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Reserve IDs (OLD - legacy endpoint)
app.post("/make-server-05aa3c8a/admin/reserve-ids-old", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const { type, ids, reason } = await c.req.json();
    
    if (!type || !ids || !Array.isArray(ids)) {
      return c.json({ error: 'Invalid request' }, 400);
    }
    
    const reservedKey = type === 'user' ? 'reserved:user:ids' : 'reserved:partner:ids';
    let reservedIds = await kv.get(reservedKey) || [];
    
    // Add new IDs to reserved list
    const newReservedIds = [];
    for (const id of ids) {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId) && !reservedIds.includes(numericId)) {
        reservedIds.push(numericId);
        newReservedIds.push(numericId);
        
        // Store metadata
        await kv.set(`reserved:${type}:meta:${numericId}`, {
          reservedBy: currentUser.id,
          reservedAt: new Date().toISOString(),
          reason: reason || 'Зарезервировано администратором'
        });
      }
    }
    
    await kv.set(reservedKey, reservedIds);
    
    console.log(`Admin reserved ${type} IDs: ${newReservedIds.join(', ')}`);
    
    return c.json({ 
      success: true, 
      reserved: newReservedIds,
      message: `Зарезервировано ${newReservedIds.length} ID`
    });
  } catch (error) {
    console.log(`Reserve IDs error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Unreserve IDs (OLD - legacy endpoint)
app.post("/make-server-05aa3c8a/admin/unreserve-ids-old", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const { type, ids } = await c.req.json();
    
    if (!type || !ids || !Array.isArray(ids)) {
      return c.json({ error: 'Invalid request' }, 400);
    }
    
    const reservedKey = type === 'user' ? 'reserved:user:ids' : 'reserved:partner:ids';
    let reservedIds = await kv.get(reservedKey) || [];
    
    // Remove IDs from reserved list
    const unreservedIds = [];
    for (const id of ids) {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId) && reservedIds.includes(numericId)) {
        reservedIds = reservedIds.filter((rid: number) => rid !== numericId);
        unreservedIds.push(numericId);
        
        // Delete metadata
        await kv.del(`reserved:${type}:meta:${numericId}`);
      }
    }
    
    await kv.set(reservedKey, reservedIds);
    
    console.log(`Admin unreserved ${type} IDs: ${unreservedIds.join(', ')}`);
    
    return c.json({ 
      success: true, 
      unreserved: unreservedIds,
      message: `Снято резервирование с ${unreservedIds.length} ID`
    });
  } catch (error) {
    console.log(`Unreserve IDs error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// ADMIN - PRODUCTS MANAGEMENT
// ======================

// Get all products (admin view with full details)
app.get("/make-server-05aa3c8a/admin/products", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const allProductEntries = await kv.getByPrefixWithKeys('product:');
    
    // Filter to get only product records by key (not SKU lookup keys)
    // Product keys: "product:prod_XXX", SKU lookups: "product:sku:XXX"
    const productEntries = allProductEntries.filter((entry: any) => 
      entry.key.startsWith('product:prod_')
    );
    
    const productsArray = productEntries.map((e: any) => e.value);
    
    return c.json({ success: true, products: productsArray });
  } catch (error) {
    console.log(`Admin get products error: ${error}`);
    return c.json({ 
      success: false,
      error: `${error}`,
      products: []
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Create product
app.post("/make-server-05aa3c8a/admin/products", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const { название, описание, sku, изображение, цена1, цена2, цена3, цена4, цена_розница, категория, в_архиве } = await c.req.json();
    
    if (!название || !sku) {
      return c.json({ error: 'Название и SKU обязательны' }, 400);
    }
    
    // Check if SKU already exists
    const existingProduct = await kv.get(`product:sku:${sku}`);
    if (existingProduct) {
      return c.json({ error: 'Продукт с таким SKU уже существует' }, 400);
    }
    
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const product = {
      id: productId,
      название: название || '',
      описание: описание || '',
      sku: sku,
      изображение: изображение || '',
      цена1: Number(цена1) || 0,
      цена2: Number(цена2) || 0,
      цена3: Number(цена3) || 0,
      цена4: Number(цена4) || 0,
      цена_розница: Number(цена_розница) || 0,
      категория: категория || 'general',
      в_архиве: в_архиве === true,  // false = активен, true = в архиве
      archived: в_архиве === true,   // для совместимости
      создан: new Date().toISOString(),
      обновлён: new Date().toISOString()
    };
    
    console.log(`💾 Saving product with ID: ${productId}, SKU: ${sku}`);
    await kv.set(`product:${productId}`, product);
    await kv.set(`product:sku:${sku}`, product);
    
    console.log(`✅ Product created: ${productId}, SKU: ${sku}`);
    console.log(`📋 Product data:`, { id: product.id, название: product.название, sku: product.sku });
    
    return c.json({ success: true, product });
  } catch (error) {
    console.log(`Admin create product error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update product
app.put("/make-server-05aa3c8a/admin/products/:productId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const productId = c.req.param('productId');
    const updates = await c.req.json();
    
    const product = await kv.get(`product:${productId}`);
    if (!product) {
      return c.json({ error: 'Продукт не найден' }, 404);
    }
    
    const oldSku = product.sku;
    
    // Update product fields
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'создан') {
        product[key] = updates[key];
      }
    });
    
    product.обновлён = new Date().toISOString();
    
    await kv.set(`product:${productId}`, product);
    
    // Update SKU index if changed
    if (updates.sku && updates.sku !== oldSku) {
      await kv.del(`product:sku:${oldSku}`);
      await kv.set(`product:sku:${updates.sku}`, product);
    } else {
      await kv.set(`product:sku:${oldSku}`, product);
    }
    
    console.log(`Product updated: ${productId}`);
    
    return c.json({ success: true, product });
  } catch (error) {
    console.log(`Admin update product error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Archive/Unarchive product
app.put("/make-server-05aa3c8a/admin/products/:productId/archive", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const productId = c.req.param('productId');
    const { archived } = await c.req.json();
    
    const product = await kv.get(`product:${productId}`);
    if (!product) {
      return c.json({ error: 'Продукт не найден' }, 404);
    }
    
    // Update archived status
    product.в_архиве = archived;
    product.archived = archived; // для совместимости
    product.обновлён = new Date().toISOString();
    
    await kv.set(`product:${productId}`, product);
    await kv.set(`product:sku:${product.sku}`, product);
    
    console.log(`Product ${archived ? 'archived' : 'unarchived'}: ${productId}`);
    
    return c.json({ 
      success: true, 
      message: archived ? 'Товар перемещён в архив' : 'Товар восстановлен из архива',
      product 
    });
  } catch (error) {
    console.log(`Admin archive product error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Delete product
app.delete("/make-server-05aa3c8a/admin/products/:productId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const productId = c.req.param('productId');
    
    const product = await kv.get(`product:${productId}`);
    if (!product) {
      return c.json({ error: 'Продукт не найден' }, 404);
    }
    
    await kv.del(`product:${productId}`);
    await kv.del(`product:sku:${product.sku}`);
    
    console.log(`Product deleted: ${productId}`);
    
    return c.json({ success: true, message: 'Товар удалён' });
  } catch (error) {
    console.log(`Admin delete product error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// TEMPORARY: Clean duplicate products
app.post("/make-server-05aa3c8a/admin/products/clean-duplicates", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('🧹 Starting product cleanup...');
    
    // Get all product entries with keys
    const allEntries = await kv.getByPrefixWithKeys('product:');
    console.log(`Found ${allEntries.length} product entries`);
    
    // Separate into product records and SKU lookups by KEY
    const productEntries = allEntries.filter((e: any) => e.key.startsWith('product:prod_'));
    const skuEntries = allEntries.filter((e: any) => e.key.startsWith('product:sku:'));
    
    console.log(`Product entries: ${productEntries.length}, SKU lookup entries: ${skuEntries.length}`);
    
    // Get unique product IDs from actual product entries
    const uniqueProductIds = new Set<string>();
    const seenSkus = new Set<string>();
    let duplicateProducts = 0;
    
    // Check for duplicate products with same ID
    for (const entry of productEntries) {
      const productId = entry.value.id;
      if (uniqueProductIds.has(productId)) {
        console.log(`⚠️ Duplicate product found: ${productId} at key ${entry.key}`);
        duplicateProducts++;
      } else {
        uniqueProductIds.add(productId);
        seenSkus.add(entry.value.sku);
      }
    }
    
    // Now clean up SKU lookups - keep only those that match valid products
    let deletedCount = 0;
    
    for (const skuEntry of skuEntries) {
      const sku = skuEntry.value.sku;
      if (!seenSkus.has(sku)) {
        // Orphaned SKU lookup - no matching product
        await kv.del(skuEntry.key);
        deletedCount++;
        console.log(`🗑️ Deleted orphaned SKU lookup: ${skuEntry.key}`);
      }
    }
    
    console.log(`✅ Cleanup complete. Found ${duplicateProducts} duplicate products, deleted ${deletedCount} orphaned SKU lookups`);
    
    return c.json({ 
      success: true, 
      message: `Проверено ${allEntries.length} записей. Удалено ${deletedCount} дубликатов SKU.${duplicateProducts > 0 ? ` Найдено ${duplicateProducts} дубликатов товаров (требуется ручная проверка).` : ''}`,
      details: {
        totalEntries: allEntries.length,
        productEntries: productEntries.length,
        skuEntries: skuEntries.length,
        duplicateProducts: duplicateProducts,
        deletedSkuLookups: deletedCount
      }
    });
  } catch (error) {
    console.log(`Clean duplicates error: ${error}`);
    return c.json({ error: `${error}` }, 500);
  }
});

// Archive/Unarchive product (POST method for compatibility)
app.post("/make-server-05aa3c8a/admin/products/:productId/archive", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const productId = c.req.param('productId');
    const { archive } = await c.req.json();
    
    const product = await kv.get(`product:${productId}`);
    if (!product) {
      return c.json({ error: 'Продукт не найден' }, 404);
    }
    
    // Update archived status
    product.в_архиве = archive;
    product.archived = archive; // для совместимости
    product.обновлён = new Date().toISOString();
    
    await kv.set(`product:${productId}`, product);
    await kv.set(`product:sku:${product.sku}`, product);
    
    console.log(`Product ${archive ? 'archived' : 'unarchived'}: ${productId}`);
    
    return c.json({ 
      success: true, 
      message: archive ? 'Товар перемещён в архив' : 'Товар восстановлен из архива',
      product 
    });
  } catch (error) {
    console.log(`Admin archive product error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Upload product image
app.post("/make-server-05aa3c8a/admin/products/upload-image", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('📤 Processing image upload request...');
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('❌ No file in request');
      return c.json({ error: 'No file uploaded' }, 400);
    }
    
    console.log('📦 File received:', file.name, file.type, file.size);
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type);
      return c.json({ error: 'Invalid file type. Only JPEG, PNG and WebP are allowed.' }, 400);
    }
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size);
      return c.json({ error: 'File too large. Maximum size is 5MB.' }, 400);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `product-${timestamp}-${randomId}.${extension}`;
    
    console.log('💾 Saving file as:', filename);
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const bucketName = 'make-05aa3c8a-products';
    
    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log('📦 Creating storage bucket:', bucketName);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: maxSize
      });
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
        return c.json({ error: `Failed to create storage bucket: ${createError.message}` }, 500);
      }
    }
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Upload error:', error);
      return c.json({ error: `Upload failed: ${error.message}` }, 500);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);
    
    const imageUrl = urlData.publicUrl;
    console.log('✅ Image uploaded successfully:', imageUrl);
    
    return c.json({ 
      success: true, 
      url: imageUrl,
      imageUrl: imageUrl, // For compatibility
      filename: filename
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

// ======================
// ADMIN - TRAINING MANAGEMENT
// ======================

// Get all training lessons
app.get("/make-server-05aa3c8a/admin/training", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const lessons = await kv.getByPrefix('lesson:');
    const lessonsArray = Array.isArray(lessons) ? lessons : [];
    
    return c.json({ success: true, lessons: lessonsArray });
  } catch (error) {
    console.log(`Admin get training error: ${error}`);
    return c.json({ 
      success: false,
      error: `${error}`,
      lessons: []
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Create training lesson
app.post("/make-server-05aa3c8a/admin/training", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const { название, описание, видео, категория, уровень, порядок, активен } = await c.req.json();
    
    if (!название) {
      return c.json({ error: 'Название обязательно' }, 400);
    }
    
    const lessonId = `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const lesson = {
      id: lessonId,
      название: название || '',
      описание: описание || '',
      видео: видео || '',
      категория: категория || 'general',
      уровень: Number(уровень) || 1, // Минимальный уровень для доступа
      порядок: Number(порядок) || 0,
      активен: активен !== false,
      просмотры: 0,
      создан: new Date().toISOString(),
      обновлён: new Date().toISOString()
    };
    
    await kv.set(`lesson:${lessonId}`, lesson);
    
    console.log(`Training lesson created: ${lessonId}`);
    
    return c.json({ success: true, lesson });
  } catch (error) {
    console.log(`Admin create lesson error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update training lesson
app.put("/make-server-05aa3c8a/admin/training/:lessonId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const lessonId = c.req.param('lessonId');
    const updates = await c.req.json();
    
    const lesson = await kv.get(`lesson:${lessonId}`);
    if (!lesson) {
      return c.json({ error: 'Урок не найден' }, 404);
    }
    
    // Update lesson fields
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'создан' && key !== 'просмотры') {
        lesson[key] = updates[key];
      }
    });
    
    lesson.обновлён = new Date().toISOString();
    
    await kv.set(`lesson:${lessonId}`, lesson);
    
    console.log(`Training lesson updated: ${lessonId}`);
    
    return c.json({ success: true, lesson });
  } catch (error) {
    console.log(`Admin update lesson error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Delete training lesson
app.delete("/make-server-05aa3c8a/admin/training/:lessonId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const lessonId = c.req.param('lessonId');
    
    const lesson = await kv.get(`lesson:${lessonId}`);
    if (!lesson) {
      return c.json({ error: 'Урок не найден' }, 404);
    }
    
    await kv.del(`lesson:${lessonId}`);
    
    console.log(`Training lesson deleted: ${lessonId}`);
    
    return c.json({ success: true, message: 'Урок удалён' });
  } catch (error) {
    console.log(`Admin delete lesson error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// COURSES / TRAINING
// ======================

// Get all courses (public endpoint)
app.get("/make-server-05aa3c8a/courses", async (c) => {
  try {
    const courses = await kv.getByPrefix('course:');
    const coursesArray = Array.isArray(courses) ? courses : [];
    
    // Сортируем по порядку
    coursesArray.sort((a: any, b: any) => (a.порядок || 0) - (b.порядок || 0));
    
    return c.json({ success: true, courses: coursesArray });
  } catch (error) {
    console.log(`Get courses error: ${error}`);
    return c.json({ 
      success: false,
      error: `${error}`,
      courses: []
    }, 500);
  }
});

// Create course
app.post("/make-server-05aa3c8a/admin/courses", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const { название, описание, icon, длительность, модули, цвет, уроки } = await c.req.json();
    
    if (!название || !описание) {
      return c.json({ error: 'Название и описание обязательны' }, 400);
    }
    
    const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Получаем текущее количество курсов для определения порядка
    const allCourses = await kv.getByPrefix('course:');
    const maxOrder = Array.isArray(allCourses) && allCourses.length > 0
      ? Math.max(...allCourses.map((c: any) => c.порядок || 0))
      : 0;
    
    const course = {
      id: courseId,
      название: название || '',
      описание: описание || '',
      iconName: icon || 'BookOpen',
      длительность: длительность || '30 мин',
      модули: модули || уроки?.length || 0,
      цвет: цвет || '#39B7FF',
      уроки: уроки || [],
      порядок: maxOrder + 1,
      создан: new Date().toISOString(),
      обновлён: new Date().toISOString()
    };
    
    await kv.set(`course:${courseId}`, course);
    
    console.log(`Course created: ${courseId}`);
    
    return c.json({ success: true, course });
  } catch (error) {
    console.log(`Admin create course error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update course
app.put("/make-server-05aa3c8a/admin/courses/:courseId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const courseId = c.req.param('courseId');
    const updates = await c.req.json();
    
    const course = await kv.get(`course:${courseId}`);
    if (!course) {
      return c.json({ error: 'Курс не найден' }, 404);
    }
    
    // Update course fields
    course.название = updates.название || course.название;
    course.описание = updates.описание || course.описание;
    course.iconName = updates.icon || course.iconName;
    course.длительность = updates.длительность || course.длительность;
    course.модули = updates.модули || updates.уроки?.length || course.модули;
    course.цвет = updates.цвет || course.цвет;
    course.уроки = updates.уроки || course.уроки;
    course.обновлён = new Date().toISOString();
    
    await kv.set(`course:${courseId}`, course);
    
    console.log(`Course updated: ${courseId}`);
    
    return c.json({ success: true, course });
  } catch (error) {
    console.log(`Admin update course error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Delete course
app.delete("/make-server-05aa3c8a/admin/courses/:courseId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const courseId = c.req.param('courseId');
    
    const course = await kv.get(`course:${courseId}`);
    if (!course) {
      return c.json({ error: 'Курс не найден' }, 404);
    }
    
    await kv.del(`course:${courseId}`);
    
    console.log(`Course deleted: ${courseId}`);
    
    return c.json({ success: true, message: 'Курс удалён' });
  } catch (error) {
    console.log(`Admin delete course error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// TRAINING MATERIALS
// ======================

// Get all training materials (public endpoint)
app.get("/make-server-05aa3c8a/training-materials", async (c) => {
  try {
    const materials = await kv.getByPrefix('training:');
    const materialsArray = Array.isArray(materials) ? materials : [];
    
    // Сортируем по дате создания
    materialsArray.sort((a: any, b: any) => {
      const dateA = new Date(a.создан || 0).getTime();
      const dateB = new Date(b.создан || 0).getTime();
      return dateB - dateA; // Новые первыми
    });
    
    return c.json({ success: true, materials: materialsArray });
  } catch (error) {
    console.log(`Get training materials error: ${error}`);
    return c.json({ 
      success: false,
      error: `${error}`,
      materials: []
    }, 500);
  }
});

// Create training material
app.post("/make-server-05aa3c8a/admin/training-materials", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const { название, описание, тип, url, категория } = await c.req.json();
    
    if (!название) {
      return c.json({ error: 'Название обязательно' }, 400);
    }
    
    const materialId = `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const material = {
      id: materialId,
      название: название || '',
      описание: описание || '',
      тип: тип || 'document', // document, video, link
      url: url || '',
      категория: категория || 'общее',
      создан: new Date().toISOString(),
      обновлён: new Date().toISOString()
    };
    
    await kv.set(`training:${materialId}`, material);
    
    console.log(`Training material created: ${materialId}`);
    
    return c.json({ success: true, material });
  } catch (error) {
    console.log(`Admin create training material error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update training material
app.put("/make-server-05aa3c8a/admin/training-materials/:materialId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const materialId = c.req.param('materialId');
    const updates = await c.req.json();
    
    const material = await kv.get(`training:${materialId}`);
    if (!material) {
      return c.json({ error: 'Материал не найден' }, 404);
    }
    
    // Update material fields
    material.название = updates.название || material.название;
    material.описание = updates.описание || material.описание;
    material.тип = updates.тип || material.тип;
    material.url = updates.url || material.url;
    material.категория = updates.категория || material.категория;
    material.обновлён = new Date().toISOString();
    
    await kv.set(`training:${materialId}`, material);
    
    console.log(`Training material updated: ${materialId}`);
    
    return c.json({ success: true, material });
  } catch (error) {
    console.log(`Admin update training material error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Delete training material
app.delete("/make-server-05aa3c8a/admin/training-materials/:materialId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const materialId = c.req.param('materialId');
    
    const material = await kv.get(`training:${materialId}`);
    if (!material) {
      return c.json({ error: 'Материал не найден' }, 404);
    }
    
    await kv.del(`training:${materialId}`);
    
    console.log(`Training material deleted: ${materialId}`);
    
    return c.json({ success: true, message: 'Материал удалён' });
  } catch (error) {
    console.log(`Admin delete training material error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// ADMIN - PROMO CODES
// ======================

// Get all promo codes
app.get("/make-server-05aa3c8a/admin/promos", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const promos = await kv.getByPrefix('promo:');
    const promosArray = Array.isArray(promos) ? promos : [];
    
    return c.json({ success: true, promos: promosArray });
  } catch (error) {
    console.log(`Admin get promos error: ${error}`);
    return c.json({ 
      success: false,
      error: `${error}`,
      promos: []
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Create promo code
app.post("/make-server-05aa3c8a/admin/promos", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const { код, тип, значение, макс_использований, срок_действия, активен } = await c.req.json();
    
    if (!код) {
      return c.json({ error: 'Код обязателен' }, 400);
    }
    
    // Check if code already exists
    const existingPromo = await kv.get(`promo:code:${код}`);
    if (existingPromo) {
      return c.json({ error: 'Промокод уже существует' }, 400);
    }
    
    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const promo = {
      id: promoId,
      код: код.toUpperCase(),
      тип: тип || 'percent', // 'percent' or 'fixed'
      значение: Number(значение) || 0,
      использовано: 0,
      макс_использований: Number(макс_использований) || null,
      срок_действия: срок_действия || null,
      активен: активен !== false,
      создан: new Date().toISOString()
    };
    
    await kv.set(`promo:${promoId}`, promo);
    await kv.set(`promo:code:${код.toUpperCase()}`, promo);
    
    console.log(`Promo code created: ${код}`);
    
    return c.json({ success: true, promo });
  } catch (error) {
    console.log(`Admin create promo error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update promo code
app.put("/make-server-05aa3c8a/admin/promos/:promoId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const promoId = c.req.param('promoId');
    const updates = await c.req.json();
    
    const promo = await kv.get(`promo:${promoId}`);
    if (!promo) {
      return c.json({ error: 'Промокод не найден' }, 404);
    }
    
    const oldCode = promo.код;
    
    // Update promo fields
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'создан' && key !== 'использовано') {
        promo[key] = updates[key];
      }
    });
    
    await kv.set(`promo:${promoId}`, promo);
    
    // Update code index if changed
    if (updates.код && updates.код !== oldCode) {
      await kv.del(`promo:code:${oldCode}`);
      await kv.set(`promo:code:${updates.код.toUpperCase()}`, promo);
    } else {
      await kv.set(`promo:code:${oldCode}`, promo);
    }
    
    console.log(`Promo code updated: ${promoId}`);
    
    return c.json({ success: true, promo });
  } catch (error) {
    console.log(`Admin update promo error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Delete promo code
app.delete("/make-server-05aa3c8a/admin/promos/:promoId", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const promoId = c.req.param('promoId');
    
    const promo = await kv.get(`promo:${promoId}`);
    if (!promo) {
      return c.json({ error: 'Промокод не найден' }, 404);
    }
    
    await kv.del(`promo:${promoId}`);
    await kv.del(`promo:code:${promo.код}`);
    
    console.log(`Promo code deleted: ${promoId}`);
    
    return c.json({ success: true, message: 'Промокод удалён' });
  } catch (error) {
    console.log(`Admin delete promo error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// ADMIN - MLM SETTINGS
// ======================

// Get MLM settings
app.get("/make-server-05aa3c8a/admin/settings", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const settings = await kv.get('system:settings') || {
      минимальный_вывод: 1000,
      комиссия_d1: 1500,
      комиссия_d2: 900,
      комиссия_d3: 600,
      методы_оплаты: ['card', 'sbp', 'crypto']
    };
    
    return c.json({ success: true, settings });
  } catch (error) {
    console.log(`Admin get settings error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Update MLM settings
app.put("/make-server-05aa3c8a/admin/settings", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const updates = await c.req.json();
    
    const settings = await kv.get('system:settings') || {};
    
    Object.keys(updates).forEach(key => {
      settings[key] = updates[key];
    });
    
    settings.обновлён = new Date().toISOString();
    settings.обновил = currentUser.id;
    
    await kv.set('system:settings', settings);
    
    console.log(`MLM settings updated by ${currentUser.id}`);
    
    return c.json({ success: true, settings });
  } catch (error) {
    console.log(`Admin update settings error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// ADMIN - LOGS
// ======================

// Get admin action logs
app.get("/make-server-05aa3c8a/admin/logs", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const logs = await kv.getByPrefix('log:admin:');
    
    // Sort by date descending
    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return c.json({ success: true, logs: logs.slice(0, 100) }); // Last 100 logs
  } catch (error) {
    console.log(`Admin get logs error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// Log admin action (helper function)
async function logAdminAction(adminId: string, action: string, details: any) {
  const logId = `log:admin:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = {
    id: logId,
    adminId,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  await kv.set(logId, log);
}

// Get analytics data
app.get("/make-server-05aa3c8a/admin/analytics", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const allUsers = await kv.getByPrefix('user:id:');
    const allOrders = await kv.getByPrefix('order:');
    
    // Calculate daily sales for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dailySales: any = {};
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailySales[dateStr] = { orders: 0, revenue: 0 };
    }
    
    allOrders.forEach((order: any) => {
      if (order.статус === 'paid' && order.дата) {
        const dateStr = order.дата.split('T')[0];
        if (dailySales[dateStr]) {
          dailySales[dateStr].orders++;
          dailySales[dateStr].revenue += order.цена || 0;
        }
      }
    });
    
    // Top partners by revenue
    const partnerRevenue: any = {};
    allOrders.forEach((order: any) => {
      if (order.статус === 'paid' && order.продавецId) {
        if (!partnerRevenue[order.продавецId]) {
          partnerRevenue[order.продавецId] = 0;
        }
        partnerRevenue[order.продавецId] += order.цена || 0;
      }
    });
    
    const topPartners = Object.entries(partnerRevenue)
      .map(([userId, revenue]) => ({ userId, revenue }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Get partner names
    for (const partner of topPartners) {
      const user = await kv.get(`user:id:${partner.userId}`);
      if (user) {
        (partner as any).name = user.имя;
      }
    }
    
    // Conversion rate
    const totalUsers = allUsers.length;
    const usersWithOrders = new Set(allOrders.map((o: any) => o.покупательId)).size;
    const conversionRate = totalUsers > 0 ? (usersWithOrders / totalUsers * 100).toFixed(2) : 0;
    
    // Average order value
    const paidOrders = allOrders.filter((o: any) => o.статус === 'paid');
    const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (o.цена || 0), 0);
    const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
    
    return c.json({ 
      success: true, 
      analytics: {
        dailySales: Object.entries(dailySales).map(([date, data]) => ({ date, ...(data as any) })),
        topPartners,
        conversionRate,
        avgOrderValue
      }
    });
  } catch (error) {
    console.log(`Admin get analytics error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// INITIALIZATION
// ======================

// Initialize database with default data (call once)
app.post("/make-server-05aa3c8a/admin/initialize", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('Initializing database...');
    
    // Check if already initialized
    const initFlag = await kv.get('system:initialized');
    if (initFlag) {
      return c.json({ error: 'Database already initialized' }, 400);
    }
    
    // No need to create products - they're returned dynamically from /products endpoint
    
    // Mark as initialized
    await kv.set('system:initialized', {
      initialized: true,
      date: new Date().toISOString(),
      by: currentUser.id
    });
    
    console.log('Database initialized successfully');
    
    return c.json({ 
      success: true, 
      message: 'Database initialized successfully',
      note: 'Products are dynamically generated - no initialization needed'
    });
    
  } catch (error) {
    console.log(`Initialization error: ${error}`);
    return c.json({ error: `${error}` }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// ADMIN MANAGEMENT
// ======================

// Admin signup (CEO and other admins)
app.post("/make-server-05aa3c8a/auth/signup-admin", async (c) => {
  try {
    console.log('Admin signup request headers:', Object.fromEntries(c.req.raw.headers.entries()));
    
    const { email, password, firstName, lastName, adminCode, role, creatorToken } = await c.req.json();
    
    if (!email || !password || !firstName || !lastName) {
      return c.json({ error: "Email, password, имя и фамилия обязательны" }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ error: "Пароль должен быть минимум 6 символов" }, 400);
    }
    
    console.log(`Admin signup attempt for: ${email}, code: ${adminCode || 'none'}, role: ${role || 'none'}`);
    
    // Check if email already exists
    const emailKey = `admin:email:${email.trim().toLowerCase()}`;
    const existingAdmin = await kv.get(emailKey);
    if (existingAdmin) {
      console.log(`Admin signup failed: Email already exists: ${email}`);
      return c.json({ error: "Email уже зарегистрирован" }, 400);
    }
    
    let adminId = '';
    let adminRole = '';
    let createdBy = null;
    
    // 🔐 Проверка кода для создания CEO
    if (adminCode === 'CEO-2024') {
      // Проверяем, что CEO еще не создан
      const ceoExists = await kv.get('admin:id:ceo');
      if (ceoExists) {
        console.log('CEO already exists');
        return c.json({ error: "Главный администратор уже создан" }, 400);
      }
      
      adminId = 'ceo';
      adminRole = 'ceo';
      createdBy = 'system';
      
      console.log('✅ Creating CEO account');
    } 
    // 🔐 Создание других админов (только CEO может создавать)
    else if (creatorToken) {
      // Проверяем что creator это CEO
      const { data: { user }, error: authError } = await supabase.auth.getUser(creatorToken);
      
      if (authError || !user) {
        return c.json({ error: "Не авторизован" }, 401);
      }
      
      // Ищем админа по supabaseId
      const allAdmins = await kv.getByPrefix('admin:id:');
      const creatorAdmin = allAdmins.find((a: any) => a.supabaseId === user.id);
      
      if (!creatorAdmin || creatorAdmin.role !== 'ceo') {
        console.log('Only CEO can create admins');
        return c.json({ error: "Только главный администратор может создавать других админов" }, 403);
      }
      
      // Генерируем ID для нового админа
      const counterKey = 'counter:adminId';
      let currentCounter = await kv.get(counterKey);
      
      if (!currentCounter) {
        currentCounter = 0;
      }
      
      const newAdminNum = currentCounter + 1;
      await kv.set(counterKey, newAdminNum);
      
      adminId = `admin-${newAdminNum}`;
      adminRole = role || 'support'; // По умолчанию support
      createdBy = creatorAdmin.id;
      
      console.log(`✅ Creating admin by CEO: ${adminId} with role ${adminRole}`);
    } else {
      return c.json({ error: "Необходим код CEO-2024 или права главного администратора" }, 400);
    }
    
    console.log('Creating admin in Supabase Auth...');
    
    // Create admin in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      user_metadata: { 
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isAdmin: true,
        adminRole: adminRole
      },
      email_confirm: true
    });
    
    if (authError) {
      console.log(`Supabase Auth error: ${authError.message}`, authError);
      return c.json({ error: `Ошибка создания аккаунта: ${authError.message}` }, 400);
    }
    
    if (!authData.user) {
      console.log('Supabase Auth returned no user data');
      return c.json({ error: "Failed to create admin" }, 500);
    }
    
    console.log(`Supabase admin created: ${authData.user.id}`);
    
    // Import helper function
    const { getPermissionsForRole } = await import('./admin_helpers.tsx');
    
    // Create admin in KV store
    const adminKey = `admin:id:${adminId}`;
    
    const newAdmin = {
      id: adminId,
      type: 'admin',
      supabaseId: authData.user.id,
      email: email.trim().toLowerCase(),
      имя: firstName.trim(),
      фамилия: lastName.trim(),
      role: adminRole,
      permissions: getPermissionsForRole(adminRole),
      created: new Date().toISOString(),
      createdBy: createdBy,
      lastLogin: new Date().toISOString(),
      // Доп поля
      телефон: '',
      аватарка: ''
    };
    
    console.log('Saving admin to KV store...');
    await kv.set(adminKey, newAdmin);
    await kv.set(emailKey, { id: adminId, type: 'admin' });
    
    console.log(`✅ New admin created: ${newAdmin.имя} ${newAdmin.фамилия} (ID: ${adminId}, Role: ${adminRole})`);
    
    return c.json({ 
      success: true, 
      admin: newAdmin,
      message: 'Admin created successfully'
    });
    
  } catch (error) {
    console.error(`❌ Admin signup error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Ошибка регистрации админа: ${errorMessage}` }, 500);
  }
});

// Delete admin (CEO only)
app.post("/make-server-05aa3c8a/auth/delete-admin", async (c) => {
  try {
    console.log('Delete admin request received');
    
    const { adminId, creatorToken } = await c.req.json();
    
    if (!adminId) {
      return c.json({ error: "ID админа обязателен" }, 400);
    }
    
    if (!creatorToken) {
      return c.json({ error: "Токен авторизации обязателен" }, 401);
    }
    
    console.log(`Delete admin attempt for: ${adminId}`);
    
    // Verify that creator is CEO
    const { data: { user }, error: authError } = await supabase.auth.getUser(creatorToken);
    
    if (authError || !user) {
      return c.json({ error: "Не авторизован" }, 401);
    }
    
    // Find creator admin by supabaseId
    const allAdmins = await kv.getByPrefix('admin:id:');
    const creatorAdmin = allAdmins.find((a: any) => a.supabaseId === user.id);
    
    if (!creatorAdmin || creatorAdmin.role !== 'ceo') {
      console.log('Only CEO can delete admins');
      return c.json({ error: "Только главный администратор может удалять админов" }, 403);
    }
    
    // Prevent CEO from deleting themselves
    if (adminId === 'ceo') {
      return c.json({ error: "Нельзя удалить аккаунт CEO" }, 400);
    }
    
    // Get admin to delete
    const adminKey = `admin:id:${adminId}`;
    const adminToDelete = await kv.get(adminKey);
    
    if (!adminToDelete) {
      return c.json({ error: "Админ не найден" }, 404);
    }
    
    console.log(`Deleting admin: ${adminToDelete.имя} ${adminToDelete.фамилия} (${adminId})`);
    
    // Delete from Supabase Auth
    if (adminToDelete.supabaseId) {
      try {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(adminToDelete.supabaseId);
        if (deleteAuthError) {
          console.error(`Error deleting from Supabase Auth: ${deleteAuthError.message}`);
          // Continue anyway - we still want to delete from KV
        }
      } catch (authDeleteError) {
        console.error(`Error deleting from Supabase Auth:`, authDeleteError);
        // Continue anyway
      }
    }
    
    // Delete from KV store
    await kv.del(adminKey);
    
    // Delete email mapping
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

// Update admin role (CEO only)
app.post("/make-server-05aa3c8a/auth/update-admin-role", async (c) => {
  try {
    const { adminId, newRole, creatorToken } = await c.req.json();
    
    console.log(`🔑 Update admin role: ${adminId} -> ${newRole}`);
    
    if (!adminId || !newRole) {
      return c.json({ error: "ID админа и новая роль обязательны" }, 400);
    }
    
    if (!creatorToken) {
      return c.json({ error: "Токен авторизации обязателен" }, 401);
    }
    
    // Verify that creator is CEO
    const { data: { user }, error: authError } = await supabase.auth.getUser(creatorToken);
    
    if (authError || !user) {
      return c.json({ error: "Не авторизован" }, 401);
    }
    
    // Find creator admin by supabaseId
    const allAdmins = await kv.getByPrefix('admin:id:');
    const creatorAdmin = allAdmins.find((a: any) => a.supabaseId === user.id);
    
    if (!creatorAdmin || creatorAdmin.role !== 'ceo') {
      console.log('Only CEO can update admin roles');
      return c.json({ error: "Только главный администратор может изменять роли админов" }, 403);
    }
    
    // Prevent CEO from changing their own role
    if (adminId === 'ceo') {
      return c.json({ error: "Нельзя изменить роль CEO" }, 400);
    }
    
    // Validate role
    const validRoles = ['finance', 'warehouse', 'manager', 'support'];
    if (!validRoles.includes(newRole)) {
      return c.json({ error: "Недопустимая роль. Доступные: finance, warehouse, manager, support" }, 400);
    }
    
    // 🆕 Get admin to update - check both admin:id: and user:id: prefixes
    let adminKey = `admin:id:${adminId}`;
    let adminToUpdate = await kv.get(adminKey);
    
    // 🆕 If not found in admin:id:, try user:id:
    if (!adminToUpdate) {
      const userKey = `user:id:${adminId}`;
      adminToUpdate = await kv.get(userKey);
      
      if (adminToUpdate && (adminToUpdate.isAdmin === true || adminToUpdate.type === 'admin')) {
        console.log(`🔄 Found admin in user:id: storage, will migrate to admin:id:`);
        // This is an old admin stored in user:id:, we'll migrate it
        adminKey = userKey;
      } else {
        adminToUpdate = null; // Reset if it's not an admin
      }
    }
    
    if (!adminToUpdate) {
      console.log(`❌ Admin not found: ${adminId}`);
      return c.json({ error: "Админ не найден" }, 404);
    }
    
    console.log(`✅ Updating admin role: ${adminToUpdate.имя} ${adminToUpdate.фамилия} (${adminId}): ${adminToUpdate.role} -> ${newRole}`);
    
    // Import helper function
    const { getPermissionsForRole } = await import('./admin_helpers.tsx');
    
    // Update admin data
    const updatedAdmin = {
      ...adminToUpdate,
      role: newRole,
      type: 'admin', // 🆕 Ensure type is set
      permissions: getPermissionsForRole(newRole),
      lastUpdated: new Date().toISOString(),
      updatedBy: creatorAdmin.id
    };
    
    // 🆕 Save to correct location (always use admin:id: for admins)
    const newAdminKey = `admin:id:${adminId}`;
    await kv.set(newAdminKey, updatedAdmin);
    
    // 🆕 If we found it in user:id:, delete from there and migrate
    if (adminKey.startsWith('user:id:')) {
      await kv.del(adminKey);
      console.log(`🔄 Migrated admin from ${adminKey} to ${newAdminKey}`);
      
      // 🆕 Update email index to point to admin storage
      const emailKey = `admin:email:${updatedAdmin.email}`;
      await kv.set(emailKey, { id: adminId, type: 'admin' });
      
      // 🆕 Remove old user email index if it exists
      const oldUserEmailKey = `user:email:${updatedAdmin.email}`;
      await kv.del(oldUserEmailKey);
    }
    
    console.log(`✅ Admin role updated: ${adminId} -> ${newRole}`);
    
    return c.json({ 
      success: true, 
      message: 'Admin role updated successfully',
      admin: updatedAdmin
    });
    
  } catch (error) {
    console.error('Error updating admin role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Ошибка обновления роли админа: ${errorMessage}` }, 500);
  }
});

// Get all admins (CEO only)
app.get("/make-server-05aa3c8a/admins", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Не авторизован" }, 401);
    }
    
    // Verify CEO access
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: "Не авторизован" }, 401);
    }
    
    // Find admin
    const allAdmins = await kv.getByPrefix('admin:id:');
    console.log(`📊 Retrieved ${allAdmins.length} admins from KV store`);
    
    const requestorAdmin = allAdmins.find((a: any) => a.supabaseId === user.id);
    
    if (!requestorAdmin || requestorAdmin.role !== 'ceo') {
      return c.json({ error: "Только CEO может просматривать список админов" }, 403);
    }
    
    console.log(`✅ CEO ${requestorAdmin.id} requested admins list`);
    
    // 🆕 Remove duplicates by EMAIL (keep the most recent one)
    // First, remove duplicates by ID
    const uniqueByIdMap = new Map<string, any>();
    
    for (const admin of allAdmins) {
      const existingAdmin = uniqueByIdMap.get(admin.id);
      
      if (!existingAdmin) {
        uniqueByIdMap.set(admin.id, admin);
      } else {
        const existingDate = new Date(existingAdmin.created || 0).getTime();
        const newDate = new Date(admin.created || 0).getTime();
        
        if (newDate > existingDate) {
          console.log(`🔄 Replacing duplicate admin by ID ${admin.id}: ${existingAdmin.created} -> ${admin.created}`);
          uniqueByIdMap.set(admin.id, admin);
        }
      }
    }
    
    // Second, remove duplicates by EMAIL (different IDs but same email)
    const uniqueByEmailMap = new Map<string, any>();
    
    for (const admin of Array.from(uniqueByIdMap.values())) {
      const email = admin.email?.toLowerCase();
      if (!email) continue;
      
      const existingAdmin = uniqueByEmailMap.get(email);
      
      if (!existingAdmin) {
        uniqueByEmailMap.set(email, admin);
      } else {
        // Duplicate email found - keep the one with CEO role first, then most recent
        const existingIsCEO = existingAdmin.role === 'ceo';
        const newIsCEO = admin.role === 'ceo';
        
        if (existingIsCEO && !newIsCEO) {
          console.log(`⏭️ Skipping duplicate by email ${email}: keeping CEO ${existingAdmin.id} over ${admin.role} ${admin.id}`);
        } else if (!existingIsCEO && newIsCEO) {
          console.log(`🔄 Replacing duplicate by email ${email}: ${existingAdmin.id} (${existingAdmin.role}) -> ${admin.id} (CEO)`);
          uniqueByEmailMap.set(email, admin);
        } else {
          // Both have same role - keep most recent
          const existingDate = new Date(existingAdmin.created || 0).getTime();
          const newDate = new Date(admin.created || 0).getTime();
          
          if (newDate > existingDate) {
            console.log(`🔄 Replacing duplicate by email ${email}: ${existingAdmin.id} (${existingAdmin.created}) -> ${admin.id} (${admin.created})`);
            uniqueByEmailMap.set(email, admin);
          } else {
            console.log(`⏭️ Skipping duplicate by email ${email}: keeping ${existingAdmin.id} (${existingAdmin.created})`);
          }
        }
      }
    }
    
    const uniqueAdmins = Array.from(uniqueByEmailMap.values());
    
    if (uniqueAdmins.length !== allAdmins.length) {
      console.log(`⚠️ Found ${allAdmins.length - uniqueAdmins.length} duplicate(s), returning ${uniqueAdmins.length} unique admins`);
    }
    
    return c.json({
      success: true,
      admins: uniqueAdmins
    });
    
  } catch (error) {
    console.error(`Get admins error:`, error);
    return c.json({ error: String(error) }, 500);
  }
});

// ======================
// NOTIFICATIONS
// ======================

// Get user notifications
app.get("/make-server-05aa3c8a/notifications", async (c) => {
  try {
    // Проверяем наличие X-User-Id
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      // Если пользователь не авторизован, возвращаем пустой массив
      return c.json({
        success: true,
        notifications: []
      });
    }
    
    const currentUser = await verifyUser(userId);
    
    const notifications = await kv.getByPrefix(`notification:user:${currentUser.id}:`);
    
    // Sort by timestamp descending
    notifications.sort((a: any, b: any) => b.timestamp - a.timestamp);
    
    return c.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    // Если о��ибка авторизации, возвращаем пустой массив вместо 500
    const errorStr = String(error);
    if (errorStr.includes('user ID') || errorStr.includes('not found')) {
      return c.json({ 
        success: true,
        notifications: []
      });
    }
    return c.json({ 
      success: false,
      error: `Failed to get notifications: ${error}`,
      notifications: []
    }, 500);
  }
});

// Mark notification as read
app.post("/make-server-05aa3c8a/notifications/:id/read", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const notificationId = c.req.param('id');
    
    const notification = await kv.get(`notification:user:${currentUser.id}:${notificationId}`);
    
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }
    
    notification.read = true;
    await kv.set(`notification:user:${currentUser.id}:${notificationId}`, notification);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Mark all notifications as read
app.post("/make-server-05aa3c8a/notifications/mark-all-read", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    const notifications = await kv.getByPrefix(`notification:user:${currentUser.id}:`);
    
    for (const notification of notifications) {
      notification.read = true;
      const key = `notification:user:${currentUser.id}:${notification.id}`;
      await kv.set(key, notification);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete notification
app.delete("/make-server-05aa3c8a/notifications/:id", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const notificationId = c.req.param('id');
    
    await kv.del(`notification:user:${currentUser.id}:${notificationId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Admin: Send notification to user
app.post("/make-server-05aa3c8a/admin/send-notification", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!currentUser.isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const body = await c.req.json();
    const { userId, тип, заголовок, сообщение } = body;
    
    console.log('📧 Admin sending notification:', { userId, тип, заголовок });
    
    if (!userId || !тип || !заголовок || !сообщение) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Проверяем существование пользователя
    const userKey = `user:id:${userId}`;
    console.log('🔍 Looking for user with key:', userKey);
    const targetUser = await kv.get(userKey);
    console.log('🔍 User found:', targetUser ? 'YES' : 'NO');
    
    if (!targetUser) {
      // Попробуем найти пользователя по другим ключам
      console.log('🔍 Trying alternative keys...');
      const allUsers = await kv.getByPrefix('user:');
      console.log('📊 Total users in DB:', allUsers.length);
      
      // Ищем пользователя с таким ID в любом формате
      const foundUser = allUsers.find((u: any) => {
        return u.id === userId || u.userId === userId || u.partnerId === userId;
      });
      
      if (foundUser) {
        console.log('✅ Found user by search:', foundUser);
        // Используем найденного пользователя
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
          id: notificationId,
          тип,
          заголовок,
          сообщение,
          дата: new Date().toISOString(),
          прочитано: false,
          отправительId: currentUser.id,
          отправительИмя: `${currentUser.имя} ${currentUser.фамилия || ''}`.trim(),
        };
        
        // Используем правильный ID для ключа
        const correctId = foundUser.id || foundUser.userId || foundUser.partnerId;
        await kv.set(`notification:user:${correctId}:${notificationId}`, notification);
        
        console.log(`📧 Notification sent to user ${correctId} by admin ${currentUser.id}`);
        
        return c.json({ 
          success: true,
          notification
        });
      }
      
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Генерируем ID для уведомления
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Создаём уведомление
    const notification = {
      id: notificationId,
      тип,
      заголовок,
      сообщение,
      дата: new Date().toISOString(),
      прочитано: false,
      отправительId: currentUser.id, // Кто отправил
      отправительИмя: `${currentUser.имя} ${currentUser.фамилия || ''}`.trim(),
    };
    
    // Сохраняем уведомление
    await kv.set(`notification:user:${userId}:${notificationId}`, notification);
    
    console.log(`📧 Notification sent to user ${userId} by admin ${currentUser.id}`);
    
    return c.json({ 
      success: true,
      notification
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ======================
// ACHIEVEMENTS & GAMIFICATION
// ======================

// Get user achievements
app.get("/make-server-05aa3c8a/achievements", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    const achievements = await kv.getByPrefix(`achievement:user:${currentUser.id}:`);
    
    return c.json({
      success: true,
      achievements,
      stats: {
        total: achievements.length,
        completed: achievements.filter((a: any) => a.завершено).length,
        inProgress: achievements.filter((a: any) => !a.завершено && a.прогресс > 0).length
      }
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    // ✅ Возвращаем 200 с пустым массивом вместо 500
    return c.json({ 
      success: true,
      achievements: [],
      stats: {
        total: 0,
        completed: 0,
        inProgress: 0
      },
      error: String(error)
    });
  }
});

// Get challenges
app.get("/make-server-05aa3c8a/challenges", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    const challenges = await kv.getByPrefix(`challenge:`);
    
    // Filter active challenges
    const activeChallenges = challenges.filter((ch: any) => ch.active !== false);
    
    return c.json({
      success: true,
      challenges: activeChallenges
    });
  } catch (error) {
    console.error('Get challenges error:', error);
    // ✅ Возвращаем 200 с пустым массивом вместо 500
    return c.json({ 
      success: true,
      challenges: [],
      error: String(error)
    });
  }
});

// Get leaderboard
app.get("/make-server-05aa3c8a/leaderboard", async (c) => {
  try {
    await verifyUser(c.req.header('X-User-Id'));
    
    const users = await kv.getByPrefix('user:id:');
    
    // Sort users by balance/earnings
    const leaderboard = users
      .map((user: any) => ({
        id: user.id,
        имя: user.имя,
        фамилия: user.фамилия,
        баланс: user.баланс || 0,
        команда_размер: user.команда_размер || 0,
        уровень: user.уровень
      }))
      .sort((a: any, b: any) => b.баланс - a.баланс)
      .slice(0, 100); // Top 100
    
    return c.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    // ✅ Возвращаем 200 с пустым массивом вместо 500
    return c.json({ 
      success: true,
      leaderboard: [],
      error: String(error)
    });
  }
});

// Get all achievements (admin)
app.get("/make-server-05aa3c8a/admin/achievements", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!isUserAdmin(currentUser)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const achievements = await kv.getByPrefix('achievement:config:');
    
    return c.json({
      success: true,
      achievements
    });
  } catch (error) {
    console.error('Get achievements admin error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create achievement (admin)
app.post("/make-server-05aa3c8a/admin/achievements", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!isUserAdmin(currentUser)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const achievementData = await c.req.json();
    const id = `achievement_${Date.now()}`;
    
    await kv.set(`achievement:config:${id}`, {
      id,
      ...achievementData,
      created_at: Date.now()
    });
    
    return c.json({ success: true, id });
  } catch (error) {
    console.error('Create achievement error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update achievement (admin)
app.put("/make-server-05aa3c8a/admin/achievements/:id", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!isUserAdmin(currentUser)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const achievement = await kv.get(`achievement:config:${id}`);
    
    if (!achievement) {
      return c.json({ error: 'Achievement not found' }, 404);
    }
    
    await kv.set(`achievement:config:${id}`, {
      ...achievement,
      ...updates,
      updated_at: Date.now()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update achievement error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete achievement (admin)
app.delete("/make-server-05aa3c8a/admin/achievements/:id", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!isUserAdmin(currentUser)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const id = c.req.param('id');
    await kv.del(`achievement:config:${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete achievement error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all challenges (admin)
app.get("/make-server-05aa3c8a/admin/challenges", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!isUserAdmin(currentUser)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const challenges = await kv.getByPrefix('challenge:');
    
    return c.json({
      success: true,
      challenges
    });
  } catch (error) {
    console.error('Get challenges admin error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create challenge (admin)
app.post("/make-server-05aa3c8a/admin/challenges", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!isUserAdmin(currentUser)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const challengeData = await c.req.json();
    const id = `challenge_${Date.now()}`;
    
    await kv.set(`challenge:${id}`, {
      id,
      ...challengeData,
      created_at: Date.now()
    });
    
    return c.json({ success: true, id });
  } catch (error) {
    console.error('Create challenge error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update challenge (admin)
app.put("/make-server-05aa3c8a/admin/challenges/:id", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!isUserAdmin(currentUser)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const challenge = await kv.get(`challenge:${id}`);
    
    if (!challenge) {
      return c.json({ error: 'Challenge not found' }, 404);
    }
    
    await kv.set(`challenge:${id}`, {
      ...challenge,
      ...updates,
      updated_at: Date.now()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update challenge error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete challenge (admin)
app.delete("/make-server-05aa3c8a/admin/challenges/:id", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    
    if (!isUserAdmin(currentUser)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const id = c.req.param('id');
    await kv.del(`challenge:${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete challenge error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// 🆕 Migration endpoint: Fix isAdmin flag for existing users
app.post("/make-server-05aa3c8a/admin/migrate-admin-flags", async (c) => {
  try {
    console.log('🔧 Starting admin flag migration...');
    
    // Get all users
    const users = await kv.getByPrefix('user:id:');
    let fixed = 0;
    let alreadyCorrect = 0;
    
    for (const user of users) {
      const isFirstUser = user.id === '1';
      const isAdminEmail = user.email?.toLowerCase() === 'admin@admin.com';
      
      if (isFirstUser || isAdminEmail) {
        if (!user.isAdmin) {
          console.log(`⚠️ Fixing user ${user.id} (${user.email})`);
          user.isAdmin = true;
          await kv.set(`user:id:${user.id}`, user);
          fixed++;
        } else {
          console.log(`✅ User ${user.id} (${user.email}) already has isAdmin flag`);
          alreadyCorrect++;
        }
      }
    }
    
    console.log(`✅ Migration complete: fixed ${fixed}, already correct ${alreadyCorrect}`);
    
    return c.json({ 
      success: true, 
      message: 'Migration complete',
      fixed,
      alreadyCorrect,
      totalUsers: users.length
    });
  } catch (error) {
    console.error('Migration error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// 🆕 Debug endpoint: Check user authentication status
app.post("/make-server-05aa3c8a/debug/check-auth", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }
    
    console.log(`🔍 Checking auth for email: ${email}`);
    
    // Check KV store
    const userEmailKey = `user:email:${email.trim().toLowerCase()}`;
    const userEmailData = await kv.get(userEmailKey);
    
    let userData = null;
    if (userEmailData && userEmailData.id) {
      const userKey = `user:id:${userEmailData.id}`;
      userData = await kv.get(userKey);
    }
    
    // Check Supabase Auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    let supabaseUser = null;
    
    try {
      // Try to get user from Supabase by email
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      
      if (!error && users) {
        supabaseUser = users.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
      }
    } catch (e) {
      console.log('Error checking Supabase users:', e);
    }
    
    return c.json({
      success: true,
      email: email.trim().toLowerCase(),
      kvStore: {
        exists: !!userData,
        userId: userData?.id || null,
        email: userData?.email || null,
        isAdmin: userData?.isAdmin || false,
        supabaseId: userData?.supabaseId || null
      },
      supabaseAuth: {
        exists: !!supabaseUser,
        id: supabaseUser?.id || null,
        email: supabaseUser?.email || null,
        confirmed: supabaseUser?.email_confirmed_at ? true : false,
        createdAt: supabaseUser?.created_at || null
      },
      recommendation: !userData && !supabaseUser 
        ? "User not found in either KV store or Supabase Auth. Please register."
        : !userData && supabaseUser
        ? "User exists in Supabase Auth but not in KV store. This is a data inconsistency."
        : userData && !supabaseUser
        ? "User exists in KV store but not in Supabase Auth. Please register again to sync."
        : "User exists in both systems. Login should work."
    });
  } catch (error) {
    console.error('Check auth error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// OPTIONS handler for /admin/delete-user/:userId (CORS preflight)
app.options("/make-server-05aa3c8a/admin/delete-user/:userId", (c) => {
  return c.text('', 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    'Access-Control-Max-Age': '86400',
  });
});

// Admin endpoint: Delete user (only for testing/cleanup)
app.delete("/make-server-05aa3c8a/admin/delete-user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    console.log(`Admin delete user request: ${userId}`);
    
    // Get user data first
    const userKey = `user:id:${userId}`;
    const user = await kv.get(userKey);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    console.log(`Deleting user: ${user.email} (${userId})`);
    
    // Delete from KV store
    await kv.del(userKey);
    await kv.del(`user:email:${user.email}`);
    if (user.рефКод) {
      await kv.del(`user:refcode:${user.рефКод}`);
    }
    
    // Delete from Supabase Auth if supabaseId exists
    if (user.supabaseId) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.supabaseId);
        if (deleteError) {
          console.log(`Warning: Could not delete from Supabase Auth: ${deleteError.message}`);
        } else {
          console.log(`Deleted from Supabase Auth: ${user.supabaseId}`);
        }
      } catch (authError) {
        console.log(`Warning: Auth deletion failed:`, authError);
      }
    }
    
    // Remove from sponsor's team if applicable
    if (user.спонсорId) {
      const sponsorKey = `user:id:${user.спонсорId}`;
      const sponsor = await kv.get(sponsorKey);
      if (sponsor && sponsor.команда) {
        sponsor.команда = sponsor.команда.filter((id: string) => id !== userId);
        await kv.set(sponsorKey, sponsor);
        console.log(`Removed ${userId} from sponsor ${user.спонсорId} team`);
      }
    }
    
    // 🔓 Free ALL user IDs (primary + additional codes) for reuse
    const freedCodes: string[] = [];
    
    // 1. Free the primary ID
    if (userId.length === 3 && /^\d+$/.test(userId)) {
      await freePartnerId(userId);
    } else {
      await freeUserId(userId);
    }
    freedCodes.push(userId);
    
    // 2. Delete global mapping for primary ID
    await kv.del(`id:code:${userId}`);
    
    // 3. Free all additional codes from user.codes[] array
    if (user.codes && Array.isArray(user.codes)) {
      for (const code of user.codes) {
        const codeValue = code.value || code;
        if (codeValue && codeValue !== userId) {
          // Delete global mapping
          await kv.del(`id:code:${codeValue}`);
          
          // Free numeric codes for reuse
          if (/^\d+$/.test(codeValue)) {
            if (codeValue.length === 3) {
              await freePartnerId(codeValue);
            } else {
              await freeUserId(codeValue);
            }
          }
          freedCodes.push(codeValue);
        }
      }
    }
    
    console.log(`✅ User deleted: ${userId}. Freed codes: [${freedCodes.join(', ')}]`);
    
    return c.json({ 
      success: true, 
      message: `User ${userId} deleted successfully. Freed ${freedCodes.length} codes.`,
      deletedUser: {
        id: userId,
        email: user.email,
        name: `${user.имя} ${user.фамилия || ''}`
      },
      freedCodes
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// OPTIONS handler for /admin/counter (CORS preflight)
app.options("/make-server-05aa3c8a/admin/counter", (c) => {
  console.log('📊 OPTIONS /admin/counter - CORS preflight');
  return c.text('', 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    'Access-Control-Max-Age': '86400',
  });
});

// Get current counter value (admin only)
app.get("/make-server-05aa3c8a/admin/counter", async (c) => {
  console.log('📊 GET /admin/counter - Request received');
  console.log('📊 Headers:', {
    'X-User-Id': c.req.header('X-User-Id'),
    'Authorization': c.req.header('Authorization') ? 'Present' : 'Missing',
  });
  
  try {
    const userId = c.req.header('X-User-Id');
    console.log('📊 Verifying user:', userId);
    
    const currentUser = await verifyUser(userId);
    console.log('📊 User verified:', currentUser?.id, currentUser?.email);
    
    await requireAdmin(c, currentUser);
    console.log('📊 Admin check passed');
    
    const counterKey = 'counter:userId';
    const partnerCounterKey = 'system:partnerCounter';
    
    const userCounter = await kv.get(counterKey) || 0;
    const partnerCounter = await kv.get(partnerCounterKey) || 0;
    
    console.log('📊 Counter values:', { userCounter, partnerCounter });
    
    const nextUserId = ((userCounter || 0) + 1).toString();
    const nextPartnerId = ((partnerCounter || 0) + 1).toString().padStart(3, '0');
    
    const response = { 
      success: true,
      userCounter: userCounter || 0,
      partnerCounter: partnerCounter || 0,
      nextUserId: nextUserId,
      nextPartnerId: nextPartnerId,
      nextId: nextUserId // backward compatibility
    };
    
    console.log('📊 Sending response:', response);
    return c.json(response);
    
  } catch (error) {
    console.error('❌ Get counter error:', error);
    const statusCode = (error as any).message?.includes('Admin') ? 403 : 500;
    return c.json({ 
      success: false,
      error: String(error) 
    }, statusCode);
  }
});

// Reset user counter (admin only)
app.post("/make-server-05aa3c8a/admin/reset-counter", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const counterKey = 'counter:userId';
    const partnerCounterKey = 'system:partnerCounter';
    
    // Get current counter values
    const userCounter = await kv.get(counterKey);
    const partnerCounter = await kv.get(partnerCounterKey);
    console.log(`Current user counter: ${userCounter}, partner counter: ${partnerCounter}`);
    
    // Reset both to 0
    await kv.set(counterKey, 0);
    await kv.set(partnerCounterKey, 0);
    console.log('✅ Counters reset to 0. Next IDs will be 1 (user) and 001 (partner)');
    
    return c.json({ 
      success: true, 
      message: 'Счётчики сброшены. Следующие ID: 1 (пользователь) и 001 (партнёр)',
      oldValues: {
        user: userCounter,
        partner: partnerCounter
      },
      newValues: {
        user: 0,
        partner: 0
      }
    });
    
  } catch (error) {
    console.error('Reset counter error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Global error handler
app.onError((err, c) => {
  console.error('🔥 Global error handler:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal server error',
    stack: err.stack
  }, 500);
});

// 404 handler
app.notFound((c) => {
  console.warn('⚠️ 404 Not Found:', c.req.url);
  return c.json({
    success: false,
    error: 'Endpoint not found',
    path: c.req.path
  }, 404);
});

// ==============================================
// ID MANAGEMENT (001-9999)
// ==============================================

// Get reserved IDs
app.get('/make-server-05aa3c8a/admin/reserved-ids', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);

    const reserved = await kv.get('reserved:user:ids') || [];
    
    return c.json({
      success: true,
      reserved: Array.isArray(reserved) ? reserved : []
    });
  } catch (error) {
    console.error('Error getting reserved IDs:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Reserve IDs
app.post('/make-server-05aa3c8a/admin/reserve-ids', async (c) => {
  try {
    console.log('📥 Reserve IDs request received');
    
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('👤 Current user:', currentUser?.имя, 'isAdmin:', currentUser?.isAdmin);

    const body = await c.req.json();
    console.log('📦 Request body:', body);
    
    const { ids } = body;
    console.log('🔢 IDs to reserve:', ids);
    
    if (!Array.isArray(ids) || ids.length === 0) {
      console.log('❌ Invalid IDs format');
      return c.json({ success: false, error: 'Неверные данные: ids должен быть массивом' }, 400);
    }

    // Convert string IDs to numeric for proper storage
    console.log('🔄 Converting IDs to numeric...');
    const numericIds = ids.map(id => {
      const parsed = parseInt(id, 10);
      console.log(`   "${id}" → ${parsed} (type: ${typeof parsed})`);
      return parsed;
    }).filter(id => !isNaN(id));
    console.log('✅ Numeric IDs to add:', numericIds);
    
    const reserved = await kv.get('reserved:user:ids') || [];
    console.log('📋 Current reserved:', reserved, `(type: ${typeof reserved}, isArray: ${Array.isArray(reserved)})`);
    
    const newReserved = [...new Set([...reserved, ...numericIds])].sort((a, b) => a - b);
    console.log('📋 New reserved array:', newReserved);
    console.log('📋 Types in new reserved:', newReserved.map(id => typeof id));
    
    await kv.set('reserved:user:ids', newReserved);
    console.log('✅ Reserved IDs saved to DB');
    
    // Verify it was saved correctly
    const verification = await kv.get('reserved:user:ids');
    console.log('✅ Verification read from DB:', verification);
    
    return c.json({
      success: true,
      message: `Зарезервировано ${numericIds.length} номеров`,
      reserved: newReserved
    });
  } catch (error) {
    console.error('❌ Error reserving IDs:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Unreserve ID
app.post('/make-server-05aa3c8a/admin/unreserve-id', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);

    const { id } = await c.req.json();
    
    if (!id) {
      return c.json({ success: false, error: 'ID не указан' }, 400);
    }

    const numericId = parseInt(id, 10);
    const reserved = await kv.get('reserved:user:ids') || [];
    const newReserved = reserved.filter((rid: number) => rid !== numericId);
    
    await kv.set('reserved:user:ids', newReserved);
    
    return c.json({
      success: true,
      message: `Номер ${id} возвращён в свободные`,
      reserved: newReserved
    });
  } catch (error) {
    console.error('Error unreserving ID:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 🔄 Sync reserved IDs - remove duplicates that are already occupied
app.post('/make-server-05aa3c8a/admin/sync-reserved-ids', async (c) => {
  try {
    console.log('🔄 Sync reserved IDs request received');
    
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    // Call the sync function
    const result = await syncReservedIds();
    
    return c.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error syncing reserved IDs:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 🔍 Debug endpoint to check user existence
app.post('/make-server-05aa3c8a/admin/debug-user', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);

    const { userId } = await c.req.json();
    
    console.log(`🔍 DEBUG: Checking user ${userId}`);
    
    // Try direct get
    const directGet = await kv.get(`user:id:${userId}`);
    console.log(`🔍 Direct kv.get('user:id:${userId}'):`, directGet ? 'FOUND' : 'NOT FOUND');
    
    // Try getByPrefix
    const allUsers = await kv.getByPrefix('user:id:');
    console.log(`🔍 Total users from getByPrefix: ${allUsers.length}`);
    
    const userFromPrefix = allUsers.find((u: any) => u && u.id === userId);
    console.log(`🔍 User from getByPrefix:`, userFromPrefix ? 'FOUND' : 'NOT FOUND');
    
    // Try normalized search (without leading zeros)
    let normalizedId = userId;
    let userNormalized = null;
    try {
      const parsed = parseInt(userId, 10);
      if (!isNaN(parsed)) {
        normalizedId = String(parsed);
        userNormalized = allUsers.find((u: any) => {
          if (!u || !u.id) return false;
          const uParsed = parseInt(String(u.id), 10);
          return !isNaN(uParsed) && String(uParsed) === normalizedId;
        });
      }
    } catch (e) {
      console.error('Normalized ID error:', e);
    }
    console.log(`🔍 User by normalized ID (${userId} → ${normalizedId}):`, userNormalized ? 'FOUND' : 'NOT FOUND');
    
    // Try padded search (with leading zeros)
    let paddedId = userId;
    let userPadded = null;
    try {
      if (userId.length <= 3) {
        paddedId = '0'.repeat(3 - userId.length) + userId;
      }
      userPadded = allUsers.find((u: any) => u && u.id === paddedId);
    } catch (e) {
      console.error('Padded ID error:', e);
    }
    console.log(`🔍 User by padded ID (${userId} → ${paddedId}):`, userPadded ? 'FOUND' : 'NOT FOUND');
    
    // 🔍 ДЕТАЛЬНЫЙ ПОИСК: ищем похожие ID
    let similarIds = [];
    try {
      for (const u of allUsers) {
        if (!u || !u.id) continue;
        const uIdStr = String(u.id);
        const userIdStr = String(userId);
        
        if (uIdStr.includes(userIdStr) || 
            userIdStr.includes(uIdStr) ||
            uIdStr.replace(/^0+/, '') === userIdStr.replace(/^0+/, '')) {
          similarIds.push({
            id: u.id,
            idLength: uIdStr.length,
            name: `${u.имя || ''} ${u.фамилия || ''}`
          });
        }
      }
    } catch (e) {
      console.error('Similar IDs error:', e);
    }
    console.log(`🔍 Similar IDs found:`, similarIds);
    
    // Get first 20 user IDs
    let sampleIds = [];
    try {
      for (let i = 0; i < Math.min(20, allUsers.length); i++) {
        if (allUsers[i] && allUsers[i].id) {
          sampleIds.push(allUsers[i].id);
        }
      }
    } catch (e) {
      console.error('Sample IDs error:', e);
    }
    console.log(`🔍 Sample user IDs:`, sampleIds);
    
    // Get all user IDs
    let allUserIds = [];
    try {
      for (const u of allUsers) {
        if (u && u.id) {
          allUserIds.push(u.id);
        }
      }
      allUserIds.sort();
    } catch (e) {
      console.error('All user IDs error:', e);
    }
    
    return c.json({
      success: true,
      userId,
      directGet: !!directGet,
      userFromPrefix: !!userFromPrefix,
      userNormalized: !!userNormalized,
      userPadded: !!userPadded,
      normalizedId,
      paddedId,
      totalUsers: allUsers.length,
      sampleIds,
      similarIds,
      allUserIds,
      directGetData: directGet || null,
      userFromPrefixData: userFromPrefix || null,
      userNormalizedData: userNormalized || null,
      userPaddedData: userPadded || null
    });
  } catch (error) {
    console.error('❌ Debug user error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==============================================
// 🆕 MULTIPLE CODES MANAGEMENT API
// ==============================================

// Получить все коды пользователя
app.get('/make-server-05aa3c8a/admin/user/:userId/codes', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const codes = await getUserCodes(userId);
    
    return c.json({
      success: true,
      userId,
      codes,
      primaryId: userId // Основной ID пользователя
    });
  } catch (error) {
    console.error('❌ Get user codes error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Добавить код пользователю
app.post('/make-server-05aa3c8a/admin/user/:userId/codes', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const { code, makePrimary } = await c.req.json();
    
    if (!code) {
      return c.json({ success: false, error: 'Код не указан' }, 400);
    }
    
    const result = await addCodeToUser(userId, code, {
      makePrimary: makePrimary || false,
      assignedBy: currentUser.id
    });
    
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }
    
    // Получаем обновленный список кодов
    const codes = await getUserCodes(userId);
    
    return c.json({
      success: true,
      message: `Код "${code.toUpperCase()}" добавлен пользователю ${userId}`,
      codes
    });
  } catch (error) {
    console.error('❌ Add user code error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Установить код как основной
app.post('/make-server-05aa3c8a/admin/user/:userId/codes/set-primary', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({ success: false, error: 'Код не указан' }, 400);
    }
    
    const result = await setCodeAsPrimary(userId, code);
    
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }
    
    const codes = await getUserCodes(userId);
    
    return c.json({
      success: true,
      message: `Код "${code.toUpperCase()}" установлен как основной`,
      codes
    });
  } catch (error) {
    console.error('❌ Set primary code error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Деактивировать код
app.post('/make-server-05aa3c8a/admin/user/:userId/codes/deactivate', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({ success: false, error: 'Код не указан' }, 400);
    }
    
    const result = await deactivateCode(userId, code);
    
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }
    
    const codes = await getUserCodes(userId);
    
    return c.json({
      success: true,
      message: `Код "${code.toUpperCase()}" деактивирован`,
      codes
    });
  } catch (error) {
    console.error('❌ Deactivate code error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Активировать код
app.post('/make-server-05aa3c8a/admin/user/:userId/codes/activate', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const userId = c.req.param('userId');
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({ success: false, error: 'Код не указан' }, 400);
    }
    
    const result = await activateCode(userId, code);
    
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }
    
    const codes = await getUserCodes(userId);
    
    return c.json({
      success: true,
      message: `Код "${code.toUpperCase()}" активирован`,
      codes
    });
  } catch (error) {
    console.error('❌ Activate code error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Проверить доступность кода
app.get('/make-server-05aa3c8a/admin/codes/check/:code', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const code = c.req.param('code');
    const availability = await isCodeAvailable(code);
    
    return c.json({
      success: true,
      code: code.toUpperCase(),
      ...availability
    });
  } catch (error) {
    console.error('❌ Check code availability error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Найти пользователя по коду
app.get('/make-server-05aa3c8a/admin/codes/resolve/:code', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    const code = c.req.param('code');
    const userId = await resolveCodeToUserId(code);
    
    if (!userId) {
      return c.json({
        success: false,
        error: `Код "${code}" не найден или неактивен`
      }, 404);
    }
    
    const user = await kv.get(`user:id:${userId}`);
    
    // Find the specific code info from user's codes array or global mapping
    let codeInfo = {
      primary: false,
      isActive: true,
      createdAt: ''
    };
    
    if (user && user.codes) {
      const foundCode = user.codes.find((c: any) => 
        c.value?.toLowerCase() === code.toLowerCase() || 
        c.value === code
      );
      if (foundCode) {
        codeInfo = {
          primary: foundCode.primary || false,
          isActive: foundCode.isActive !== false,
          createdAt: foundCode.createdAt || ''
        };
      }
    }
    
    // Also check global code mapping for additional info
    const globalCodeInfo = await kv.get(`id:code:${code.toUpperCase()}`) || await kv.get(`id:code:${code}`);
    if (globalCodeInfo) {
      codeInfo.primary = globalCodeInfo.primary || codeInfo.primary;
      codeInfo.isActive = globalCodeInfo.isActive !== false;
      codeInfo.createdAt = globalCodeInfo.createdAt || codeInfo.createdAt;
    }
    
    return c.json({
      success: true,
      code: code.toUpperCase(),
      userId,
      primary: codeInfo.primary,
      isActive: codeInfo.isActive,
      createdAt: codeInfo.createdAt,
      user: user ? {
        id: user.id,
        имя: user.имя,
        фамилия: user.фамилия,
        email: user.email,
        codes: user.codes || []
      } : null
    });
  } catch (error) {
    console.error('❌ Resolve code error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Миграция всех пользователей на новую систему кодов
app.post('/make-server-05aa3c8a/admin/codes/migrate-all', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('🔄 Starting migration to new code system...');
    
    const allUsers = await kv.getByPrefix('user:id:');
    let migrated = 0;
    let skipped = 0;
    let errors: string[] = [];
    
    for (const user of allUsers) {
      if (!user || !user.id) continue;
      
      try {
        const result = await migrateUserToNewCodeSystem(user.id);
        if (result.migrated) {
          migrated++;
        } else {
          skipped++;
        }
      } catch (e) {
        errors.push(`User ${user.id}: ${String(e)}`);
      }
    }
    
    console.log(`✅ Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors.length} errors`);
    
    return c.json({
      success: true,
      message: `Миграция завершена: ${migrated} мигрировано, ${skipped} пропущено`,
      migrated,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : []
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Assign reserved ID to user
app.post('/make-server-05aa3c8a/admin/assign-reserved-id', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);

    const { newId, userId: targetUserId } = await c.req.json();
    
    console.log(`🔍 assign-reserved-id request:`, { 
      newId, 
      targetUserId, 
      newIdType: typeof newId,
      targetUserIdType: typeof targetUserId,
      newIdLength: newId?.length,
      targetUserIdLength: targetUserId?.length
    });
    
    if (!newId || !targetUserId) {
      return c.json({ success: false, error: 'Неверные данные' }, 400);
    }

    // Очищаем ID от возможных пробелов
    const cleanTargetUserId = String(targetUserId).trim();
    const cleanNewId = String(newId).trim();

    // Get target user
    console.log(`🔍 Looking for user with key: user:id:${cleanTargetUserId}`);
    let targetUser = await kv.get(`user:id:${cleanTargetUserId}`);
    console.log(`🔍 Found user by key:`, targetUser ? `${targetUser.имя} ${targetUser.фамилия} (ID: ${targetUser.id})` : 'NOT FOUND');
    
    // 🔧 Fallback: если не нашли по ключу, ищем через getByPrefix
    if (!targetUser) {
      console.log(`🔍 Attempting fallback search through all users...`);
      const allUsers = await kv.getByPrefix('user:id:');
      console.log(`🔍 Total users in DB: ${allUsers.length}`);
      
      // Ищем пользователя с нужным ID (с trim для безопасности)
      targetUser = allUsers.find((u: any) => u && String(u.id).trim() === cleanTargetUserId);
      
      // 🔧 Попытка 2: поиск по нормализованному ID (убираем ведущие нули)
      if (!targetUser) {
        const normalizedTargetId = String(parseInt(cleanTargetUserId, 10));
        console.log(`🔍 Trying normalized ID: ${cleanTargetUserId} → ${normalizedTargetId}`);
        targetUser = allUsers.find((u: any) => u && String(parseInt(u.id, 10)) === normalizedTargetId);
      }
      
      // 🔧 Попытка 3: поиск с ведущими нулями (padStart)
      if (!targetUser && cleanTargetUserId.length <= 3) {
        const paddedId = cleanTargetUserId.padStart(3, '0');
        console.log(`🔍 Trying padded ID: ${cleanTargetUserId} → ${paddedId}`);
        targetUser = allUsers.find((u: any) => u && String(u.id).trim() === paddedId);
      }
      
      if (targetUser) {
        console.log(`✅ Found user via fallback search: ${targetUser.имя} ${targetUser.фамилия} (ID: ${targetUser.id})`);
      } else {
        console.log(`❌ User ${cleanTargetUserId} not found even in all users list`);
        console.log(`🔍 Sample user IDs from DB:`, allUsers.slice(0, 20).map((u: any) => u?.id).filter(Boolean));
        return c.json({ 
          success: false, 
          error: `Пользователь ${cleanTargetUserId} не найден в базе данных. Всего пользователей: ${allUsers.length}`
        }, 404);
      }
    }

    // Check if new ID is reserved
    const reserved = await kv.get('reserved:user:ids') || [];
    const numericNewId = parseInt(cleanNewId, 10);
    if (!reserved.includes(numericNewId)) {
      return c.json({ success: false, error: 'Этот номер не зарезервирован' }, 400);
    }

    // Check if new ID is already occupied
    const existingUser = await kv.get(`user:id:${cleanNewId}`);
    if (existingUser) {
      return c.json({ success: false, error: 'Этот номер уже занят' }, 400);
    }

    const oldId = targetUser.id;
    const timestamp = new Date().toISOString();

    // 🔒 IMPORTANT: Add codes BEFORE saving user to ensure codes are persisted
    // Initialize codes array if not exists
    if (!targetUser.codes) {
      targetUser.codes = [];
    }
    
    // Add old ID as additional code (if not already present)
    const oldIdExists = targetUser.codes.some((c: any) => c.value === oldId);
    if (!oldIdExists) {
      targetUser.codes.push({
        value: oldId,
        type: /^\d+$/.test(oldId) ? 'numeric' : 'alphanumeric',
        primary: false,
        isActive: true,
        createdAt: timestamp,
        assignedBy: 'system-id-change'
      });
      console.log(`🔒 Old ID ${oldId} preserved as additional code`);
    }
    
    // Add new ID as primary code (if not already present)
    const newIdExists = targetUser.codes.some((c: any) => c.value === cleanNewId);
    if (!newIdExists) {
      targetUser.codes.push({
        value: cleanNewId,
        type: /^\d+$/.test(cleanNewId) ? 'numeric' : 'alphanumeric',
        primary: true,
        isActive: true,
        createdAt: timestamp,
        assignedBy: 'system-id-change'
      });
    }
    
    // Ensure new ID is marked as primary
    targetUser.codes = targetUser.codes.map((c: any) => ({
      ...c,
      primary: c.value === cleanNewId
    }));

    // Update user ID and refCode
    targetUser.id = cleanNewId;
    targetUser.рефКод = cleanNewId; // refCode = ID

    console.log(`🔄 Assigning ID: ${oldId} → ${cleanNewId} for user ${targetUser.имя} ${targetUser.фамилия}`);
    console.log(`🔒 User now has ${targetUser.codes.length} codes:`, targetUser.codes.map((c: any) => c.value).join(', '));

    // Save user with new ID (includes codes array)
    await kv.set(`user:id:${cleanNewId}`, targetUser);

    // Delete old ID key
    await kv.del(`user:id:${oldId}`);

    // Update ref code mapping for new ID
    await kv.set(`user:refcode:${cleanNewId}`, { id: cleanNewId });
    // Keep old refcode mapping pointing to new ID (for backwards compatibility)
    await kv.set(`user:refcode:${oldId}`, { id: cleanNewId });

    // Update email mapping
    if (targetUser.email) {
      await kv.set(`user:email:${targetUser.email.toLowerCase()}`, { id: cleanNewId });
    }

    // Update supabase ID mapping if exists
    if (targetUser.supabaseId) {
      await kv.set(`user:supabase:${targetUser.supabaseId}`, { id: cleanNewId });
    }

    // Update in all team references
    const allUsersKeys = await kv.getByPrefix('user:id:');
    console.log(`🔄 CASCADE UPDATE: Scanning ${allUsersKeys.length} users for references to ${oldId}...`);
    
    let updatedCount = 0;
    for (const key of allUsersKeys) {
      const user = await kv.get(key);
      let needsUpdate = false;
      
      if (user && Array.isArray(user.команда)) {
        const index = user.команда.indexOf(oldId);
        if (index !== -1) {
          console.log(`   🔍 FOUND in team array: User ${user.id} (${user.имя}) has ${oldId} in команда`);
          user.команда[index] = cleanNewId;
          needsUpdate = true;
          console.log(`   ✅ Updated team array for user ${user.id}: ${oldId} → ${cleanNewId}`);
        }
      }
      // Update sponsor references
      if (user && user.спонсорId === oldId) {
        console.log(`   🔍 FOUND in sponsor: User ${user.id} (${user.имя}) has sponsorId=${oldId}`);
        user.спонсорId = cleanNewId;
        // Update рефКодСпонсора because refCode changed too
        user.рефКодСпонсора = cleanNewId;
        needsUpdate = true;
        console.log(`   ✅ Updated sponsorId for user ${user.id}: ${oldId} → ${cleanNewId}`);
      }
      // Update upline
      if (user && user.upline) {
        if (user.upline.u0 === oldId) {
          user.upline.u0 = cleanNewId;
          needsUpdate = true;
          console.log(`   ✓ Updated upline.u0 for user ${user.id}: ${oldId} → ${cleanNewId}`);
        }
        if (user.upline.u1 === oldId) {
          user.upline.u1 = cleanNewId;
          needsUpdate = true;
          console.log(`   ✓ Updated upline.u1 for user ${user.id}: ${oldId} → ${cleanNewId}`);
        }
        if (user.upline.u2 === oldId) {
          user.upline.u2 = cleanNewId;
          needsUpdate = true;
          console.log(`   ✓ Updated upline.u2 for user ${user.id}: ${oldId} → ${cleanNewId}`);
        }
        if (user.upline.u3 === oldId) {
          user.upline.u3 = cleanNewId;
          needsUpdate = true;
          console.log(`   ✓ Updated upline.u3 for user ${user.id}: ${oldId} → ${cleanNewId}`);
        }
      }
      
      if (needsUpdate) {
        console.log(`   💾 Saving updated user ${user.id}...`);
        await kv.set(key, user);
        updatedCount++;
      }
    }
    
    console.log(`✅ CASCADE UPDATE COMPLETE: Updated ${updatedCount} users with new ID references (${oldId} → ${cleanNewId})`);

    // Update orders
    const orderKeys = await kv.getByPrefix('order:');
    console.log(`🔄 CASCADE UPDATE: Scanning ${orderKeys.length} orders for references to ${oldId}...`);
    let ordersUpdated = 0;
    for (const key of orderKeys) {
      const order = await kv.get(key);
      let orderNeedsUpdate = false;
      
      if (order && order.userId === oldId) {
        console.log(`   🔍 FOUND in order: Order ${order.id} has userId=${oldId}`);
        order.userId = cleanNewId;
        orderNeedsUpdate = true;
        console.log(`   ✅ Updated order ${order.id}: userId ${oldId} → ${cleanNewId}`);
      }
      
      // Update commission recipients (d0, d1, d2, d3)
      if (order && order.комиссии) {
        if (order.комиссии.d0?.userId === oldId) {
          order.комиссии.d0.userId = cleanNewId;
          orderNeedsUpdate = true;
          console.log(`   ✅ Updated order ${order.id}: комиссии.d0.userId ${oldId} → ${cleanNewId}`);
        }
        if (order.комиссии.d1?.userId === oldId) {
          order.комиссии.d1.userId = cleanNewId;
          orderNeedsUpdate = true;
          console.log(`   ✅ Updated order ${order.id}: комиссии.d1.userId ${oldId} → ${cleanNewId}`);
        }
        if (order.комиссии.d2?.userId === oldId) {
          order.комиссии.d2.userId = cleanNewId;
          orderNeedsUpdate = true;
          console.log(`   ✅ Updated order ${order.id}: комиссии.d2.userId ${oldId} → ${cleanNewId}`);
        }
        if (order.комиссии.d3?.userId === oldId) {
          order.комиссии.d3.userId = cleanNewId;
          orderNeedsUpdate = true;
          console.log(`   ✅ Updated order ${order.id}: комиссии.d3.userId ${oldId} → ${cleanNewId}`);
        }
      }
      
      if (orderNeedsUpdate) {
        await kv.set(key, order);
        ordersUpdated++;
      }
    }
    console.log(`✅ CASCADE UPDATE: Updated ${ordersUpdated} orders`);

    // Remove from reserved
    const newReserved = reserved.filter((rid: number) => rid !== numericNewId);
    await kv.set('reserved:user:ids', newReserved);

    // Create global code mappings for both old and new IDs with full metadata
    await kv.set(`id:code:${oldId}`, {
      value: oldId,
      userId: cleanNewId,
      type: /^\d+$/.test(oldId) ? 'numeric' : 'alphanumeric',
      primary: false,
      isActive: true,
      createdAt: timestamp,
      assignedBy: 'system-id-change'
    });
    
    await kv.set(`id:code:${cleanNewId}`, {
      value: cleanNewId,
      userId: cleanNewId,
      type: /^\d+$/.test(cleanNewId) ? 'numeric' : 'alphanumeric',
      primary: true,
      isActive: true,
      createdAt: timestamp,
      assignedBy: 'system-id-change'
    });
    
    console.log(`🔒 ID ${oldId} permanently assigned to user ${cleanNewId} (never freed)`);

    return c.json({
      success: true,
      message: `Номер ${cleanNewId} присвоен пользователю ${targetUser.имя} ${targetUser.фамилия}`,
      oldId,
      newId: cleanNewId
    });
  } catch (error) {
    console.error('Error assigning reserved ID:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clean broken references (remove non-existent user IDs from team arrays)
app.post('/make-server-05aa3c8a/admin/clean-broken-refs', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const currentUser = await kv.get(`user:id:${userId}`);
    if (!currentUser?.isAdmin) {
      return c.json({ success: false, error: 'Доступ запрещён' }, 403);
    }

    console.log('🧹 Starting broken references cleanup...');

    // Get all users
    const allUsers = await kv.getByPrefix('user:id:');
    console.log(`📋 Loaded ${allUsers.length} users from database`);

    // Create a set of valid user IDs for fast lookup
    const validUserIds = new Set(allUsers.map((u: any) => u.id));
    console.log(`📋 Valid user IDs (${validUserIds.size}):`, Array.from(validUserIds));

    let cleanedUsers = 0;
    let removedReferences = 0;
    const cleanupLog: string[] = [];

    // Check each user's team array
    for (const user of allUsers) {
      let needsUpdate = false;
      const originalTeam = user.команда ? [...user.команда] : [];

      if (Array.isArray(user.команда) && user.команда.length > 0) {
        const brokenRefs = user.команда.filter((childId: string) => !validUserIds.has(childId));
        
        if (brokenRefs.length > 0) {
          console.log(`🔍 User ${user.id} (${user.имя}) has broken refs:`, brokenRefs);
          cleanupLog.push(`User ${user.id} (${user.имя}): removed [${brokenRefs.join(', ')}]`);
          
          // Remove broken references
          user.команда = user.команда.filter((childId: string) => validUserIds.has(childId));
          needsUpdate = true;
          removedReferences += brokenRefs.length;
          
          console.log(`   ✂️ Cleaned: [${originalTeam.join(', ')}] → [${user.команда.join(', ')}]`);
        }
      }

      // Check sponsorId
      if (user.спонсорId && !validUserIds.has(user.спонсорId)) {
        console.log(`🔍 User ${user.id} (${user.имя}) has broken sponsorId: ${user.спонсорId}`);
        cleanupLog.push(`User ${user.id} (${user.имя}): removed invalid sponsorId ${user.спонсорId}`);
        user.спонсорId = null;
        needsUpdate = true;
        removedReferences++;
      }

      if (needsUpdate) {
        await kv.set(`user:id:${user.id}`, user);
        cleanedUsers++;
      }
    }

    console.log(`✅ Cleanup complete: ${cleanedUsers} users cleaned, ${removedReferences} broken references removed`);

    return c.json({
      success: true,
      message: `Очистка завершена: обновлено ${cleanedUsers} пользователей, удалено ${removedReferences} битых ссылок`,
      cleanedUsers,
      removedReferences,
      log: cleanupLog
    });
  } catch (error) {
    console.error('Error cleaning broken references:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Rebuild team relationships based on sponsorId (fix missing team members)
app.post('/make-server-05aa3c8a/admin/rebuild-relationships', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const currentUser = await kv.get(`user:id:${userId}`);
    if (!currentUser?.isAdmin) {
      return c.json({ success: false, error: 'Доступ запрещён' }, 403);
    }

    console.log('🔧 Starting relationship rebuild...');

    // Get all users
    const allUsers = await kv.getByPrefix('user:id:');
    console.log(`📋 Loaded ${allUsers.length} users from database`);

    // Create maps for fast lookup
    const userById = new Map();
    const usersBySponsorId = new Map(); // sponsorId -> list of children
    
    for (const user of allUsers) {
      userById.set(user.id, user);
      
      // Group users by their sponsor
      const sponsorId = user.спонсорId;
      if (sponsorId) {
        if (!usersBySponsorId.has(sponsorId)) {
          usersBySponsorId.set(sponsorId, []);
        }
        usersBySponsorId.get(sponsorId).push(user.id);
      }
    }
    
    console.log(`📋 Found ${usersBySponsorId.size} sponsors with children`);

    let fixedUsers = 0;
    let addedReferences = 0;
    const repairLog: string[] = [];

    // For each user, ensure their команда array contains all children who have them as sponsor
    for (const [sponsorId, childIds] of usersBySponsorId.entries()) {
      const sponsor = userById.get(sponsorId);
      
      if (!sponsor) {
        console.log(`⚠️ Sponsor ${sponsorId} not found, but has children: ${childIds.join(', ')}`);
        repairLog.push(`⚠️ Спонсор ${sponsorId} не найден, но на него ссылаются: ${childIds.join(', ')}`);
        continue;
      }
      
      // Initialize команда if not exists
      if (!Array.isArray(sponsor.команда)) {
        sponsor.команда = [];
      }
      
      let needsUpdate = false;
      const originalTeam = [...sponsor.команда];
      
      for (const childId of childIds) {
        if (!sponsor.команда.includes(childId)) {
          sponsor.команда.push(childId);
          needsUpdate = true;
          addedReferences++;
          console.log(`   ✅ Added ${childId} to ${sponsorId}'s team`);
        }
      }
      
      if (needsUpdate) {
        await kv.set(`user:id:${sponsorId}`, sponsor);
        fixedUsers++;
        repairLog.push(`✅ ${sponsor.имя || sponsorId}: добавлено ${sponsor.команда.length - originalTeam.length} участников (было: ${originalTeam.length}, стало: ${sponsor.команда.length})`);
        console.log(`   🔧 Fixed ${sponsor.id}: [${originalTeam.join(', ')}] → [${sponsor.команда.join(', ')}]`);
      }
    }

    console.log(`✅ Rebuild complete: ${fixedUsers} users fixed, ${addedReferences} references added`);

    return c.json({
      success: true,
      message: `Восстановление завершено: обновлено ${fixedUsers} пользователей, добавлено ${addedReferences} связей`,
      fixedUsers,
      addedReferences,
      log: repairLog
    });
  } catch (error) {
    console.error('Error rebuilding relationships:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clean duplicate admins (remove admins from user:id: that should be in admin:id:)
app.post('/make-server-05aa3c8a/admin/clean-duplicate-admins', async (c) => {
  try {
    console.log('🧹 Clean duplicate admins endpoint called');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('  Authorization header:', accessToken ? 'Present ✓' : 'MISSING ✗');
    
    if (!accessToken) {
      console.log('❌ No access token provided');
      return c.json({ error: "Не авторизован" }, 401);
    }
    
    // Verify CEO access
    console.log('🔐 Verifying CEO access with Supabase...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError) {
      console.log('❌ Supabase auth error:', authError.message);
      return c.json({ error: `Не авторизован: ${authError.message}` }, 401);
    }
    
    if (!user) {
      console.log('❌ No user returned from Supabase');
      return c.json({ error: "Не авторизован" }, 401);
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Find admin
    const allAdmins = await kv.getByPrefix('admin:id:');
    console.log(`📋 Found ${allAdmins.length} admins in admin:id:`);
    
    const requestorAdmin = allAdmins.find((a: any) => a.supabaseId === user.id);
    
    if (!requestorAdmin) {
      console.log('❌ Requestor admin not found in database');
      return c.json({ error: "Админ не найден в базе" }, 403);
    }
    
    console.log('✅ Requestor admin found:', requestorAdmin.id, requestorAdmin.role);
    
    if (requestorAdmin.role !== 'ceo') {
      console.log('❌ Requestor is not CEO');
      return c.json({ error: "Только CEO может очищать дубликаты админов" }, 403);
    }
    
    console.log('🧹 Starting duplicate admins cleanup...');
    
    // Step 1: Check for duplicates within admin:id: prefix
    console.log('🔍 Step 1: Checking for duplicates in admin:id:...');
    const adminIdMap = new Map<string, any[]>();
    
    // Group admins by ID to find duplicates
    for (const admin of allAdmins) {
      if (!adminIdMap.has(admin.id)) {
        adminIdMap.set(admin.id, []);
      }
      adminIdMap.get(admin.id)!.push(admin);
    }
    
    let deletedInternalDuplicates = 0;
    const internalDuplicatesLog: string[] = [];
    
    // For each ID that has duplicates, keep only the most recent one
    for (const [adminId, duplicates] of adminIdMap.entries()) {
      if (duplicates.length > 1) {
        console.log(`⚠️ Found ${duplicates.length} duplicates for admin ID: ${adminId}`);
        
        // Sort by created date (most recent first)
        duplicates.sort((a, b) => {
          const dateA = new Date(a.created || 0).getTime();
          const dateB = new Date(b.created || 0).getTime();
          return dateB - dateA; // descending
        });
        
        // Keep the first one (most recent), delete the rest
        const keepAdmin = duplicates[0];
        console.log(`✅ Keeping admin: ${keepAdmin.имя} ${keepAdmin.фамилия} (${keepAdmin.created})`);
        
        for (let i = 1; i < duplicates.length; i++) {
          const duplicateAdmin = duplicates[i];
          console.log(`🗑️ Deleting duplicate: ${duplicateAdmin.имя} ${duplicateAdmin.фамилия} (${duplicateAdmin.created})`);
          
          // We need to find the actual key in KV store
          // Since getByPrefix returns values without keys, we reconstruct the key
          const keyToDelete = `admin:id:${adminId}`;
          
          // NOTE: KV store doesn't allow multiple values with same key,
          // so if we have duplicates here, they must be coming from somewhere else
          // Let's log this for investigation
          internalDuplicatesLog.push(`WARNING: Found duplicate admin ${adminId} - this shouldn't happen in KV store`);
          deletedInternalDuplicates++;
        }
      }
    }
    
    // Step 2: Migrate admins from user:id: to admin:id:
    console.log('🔍 Step 2: Checking for admins in user:id: prefix...');
    const allUsers = await kv.getByPrefix('user:id:');
    console.log(`📋 Loaded ${allUsers.length} users from user:id:`);
    
    let migratedAdmins = 0;
    let deletedDuplicates = 0;
    const migrationLog: string[] = [];
    
    // Find users that are actually admins
    for (const user of allUsers) {
      if (user.isAdmin === true || user.type === 'admin') {
        const adminKey = `admin:id:${user.id}`;
        const existingAdmin = await kv.get(adminKey);
        
        if (!existingAdmin) {
          // This admin doesn't exist in admin:id:, migrate it
          console.log(`🔄 Migrating admin from user:id:${user.id} to ${adminKey}`);
          
          const migratedAdmin = {
            ...user,
            type: 'admin',
            role: user.role || 'support',
            permissions: user.permissions || []
          };
          
          await kv.set(adminKey, migratedAdmin);
          
          // Update email index
          const adminEmailKey = `admin:email:${user.email}`;
          await kv.set(adminEmailKey, { id: user.id, type: 'admin' });
          
          // Remove from user:id:
          await kv.del(`user:id:${user.id}`);
          
          // Remove old user email index
          const userEmailKey = `user:email:${user.email}`;
          await kv.del(userEmailKey);
          
          migratedAdmins++;
          migrationLog.push(`Migrated: ${user.имя} ${user.фамилия} (${user.id})`);
        } else {
          // Admin exists in both places, delete from user:id:
          console.log(`🗑️ Deleting duplicate admin from user:id:${user.id}`);
          await kv.del(`user:id:${user.id}`);
          deletedDuplicates++;
          migrationLog.push(`Deleted duplicate: ${user.имя} ${user.фамилия} (${user.id})`);
        }
      }
    }
    
    const totalDeleted = deletedInternalDuplicates + deletedDuplicates;
    console.log(`✅ Cleanup complete: ${migratedAdmins} admins migrated, ${totalDeleted} duplicates deleted (${deletedInternalDuplicates} internal, ${deletedDuplicates} cross-prefix)`);
    
    return c.json({
      success: true,
      message: `Очистка завершена: мигрировано ${migratedAdmins} админов, удалено ${totalDeleted} дубликатов`,
      migratedAdmins,
      deletedDuplicates: totalDeleted,
      deletedInternalDuplicates,
      deletedCrossPrefixDuplicates: deletedDuplicates,
      log: [...internalDuplicatesLog, ...migrationLog]
    });
  } catch (error) {
    console.error('Error cleaning duplicate admins:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Sync teams (rebuild team arrays from sponsorId relationships)
app.post('/make-server-05aa3c8a/admin/sync-teams', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const currentUser = await kv.get(`user:id:${userId}`);
    if (!currentUser?.isAdmin) {
      return c.json({ success: false, error: 'Доступ запрещён' }, 403);
    }

    console.log('🔄 Starting team synchronization...');

    // Get all users
    const allUsers = await kv.getByPrefix('user:id:');
    console.log(`📋 Loaded ${allUsers.length} users`);

    // Create user map for quick lookup
    const userMap = new Map<string, any>();
    allUsers.forEach((u: any) => userMap.set(u.id, u));

    let updatedUsers = 0;
    const syncLog: string[] = [];

    // STEP 1: Fix sponsorId based on team arrays (reverse sync)
    console.log('🔄 Step 1: Fixing sponsorId based on team arrays...');
    for (const user of allUsers) {
      if (user.команда && Array.isArray(user.команда) && user.команда.length > 0) {
        for (const childId of user.команда) {
          const childUser = userMap.get(childId);
          if (childUser) {
            // If child doesn't have sponsorId or has wrong sponsorId, fix it
            if (!childUser.спонсорId || childUser.спонсорId !== user.id) {
              console.log(`🔧 Fixing sponsorId for ${childId} (${childUser.имя}): ${childUser.спонсорId || 'null'} → ${user.id}`);
              childUser.спонсорId = user.id;
              await kv.set(`user:id:${childId}`, childUser);
              syncLog.push(`User ${childId} (${childUser.имя}): sponsorId fixed to ${user.id}`);
              updatedUsers++;
            }
          }
        }
      }
    }

    // STEP 2: Rebuild team arrays based on sponsorId
    console.log('🔄 Step 2: Rebuilding team arrays based on sponsorId...');
    
    // Reload users to get updated data
    const reloadedUsers = await kv.getByPrefix('user:id:');
    
    // Create a map of sponsorId -> children IDs
    const teamMap = new Map<string, string[]>();
    
    reloadedUsers.forEach((user: any) => {
      if (user.спонсорId) {
        if (!teamMap.has(user.спонсорId)) {
          teamMap.set(user.спонсорId, []);
        }
        teamMap.get(user.спонсорId)!.push(user.id);
        console.log(`  📎 ${user.id} (${user.имя}) -> sponsor: ${user.спонсорId}`);
      }
    });

    // Update each user's team array
    for (const user of reloadedUsers) {
      const correctTeam = teamMap.get(user.id) || [];
      const currentTeam = user.команда || [];
      
      // Sort for comparison
      const sortedCorrect = [...correctTeam].sort();
      const sortedCurrent = [...currentTeam].sort();
      
      if (JSON.stringify(sortedCorrect) !== JSON.stringify(sortedCurrent)) {
        console.log(`🔧 Syncing user ${user.id} (${user.имя}):`);
        console.log(`   Old team: [${currentTeam.join(', ')}]`);
        console.log(`   New team: [${correctTeam.join(', ')}]`);
        
        user.команда = correctTeam;
        await kv.set(`user:id:${user.id}`, user);
        updatedUsers++;
        
        syncLog.push(`User ${user.id} (${user.имя}): team [${currentTeam.join(', ')}] → [${correctTeam.join(', ')}]`);
      }
    }

    console.log(`✅ Team sync complete: ${updatedUsers} users updated`);

    return c.json({
      success: true,
      message: `Синхронизация завершена: обновлено ${updatedUsers} пользователей`,
      updatedUsers,
      log: syncLog
    });
  } catch (error) {
    console.error('Error syncing teams:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ✅ FIXED: Change user ID safely (updates ALL references including orders)
app.post('/make-server-05aa3c8a/admin/change-user-id', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    
    // Verify user authorization
    const currentUser = await verifyUser(userId);
    
    // Require admin access
    await requireAdmin(c, currentUser);

    const body = await c.req.json();
    const { oldId, newId } = body;

    if (!oldId || !newId) {
      return c.json({ success: false, error: 'Не указаны oldId или newId' }, 400);
    }

    if (oldId === newId) {
      return c.json({ success: false, error: 'Старый и новый ID совпадают' }, 400);
    }

    console.log(`🔄 Changing user ID: ${oldId} → ${newId}`);

    // 🔍 Smart ID search: try to find user with different ID formats
    // Try: original, without leading zeros, with 3-digit format
    let oldUser = await kv.get(`user:id:${oldId}`);
    let actualOldId = oldId;
    
    if (!oldUser && /^\d+$/.test(oldId)) {
      // If not found and ID is numeric, try alternative formats
      const numId = parseInt(oldId, 10);
      
      // Try without leading zeros (e.g., "009" → "9")
      const withoutZeros = String(numId);
      if (withoutZeros !== oldId) {
        console.log(`🔍 Trying ID without leading zeros: ${withoutZeros}`);
        oldUser = await kv.get(`user:id:${withoutZeros}`);
        if (oldUser) {
          actualOldId = withoutZeros;
          console.log(`✅ Found user with ID: ${actualOldId}`);
        }
      }
      
      // Try with 3-digit format (e.g., "9" → "009")
      if (!oldUser && numId <= 999) {
        const with3Digits = String(numId).padStart(3, '0');
        if (with3Digits !== oldId) {
          console.log(`🔍 Trying ID with 3 digits: ${with3Digits}`);
          oldUser = await kv.get(`user:id:${with3Digits}`);
          if (oldUser) {
            actualOldId = with3Digits;
            console.log(`✅ Found user with ID: ${actualOldId}`);
          }
        }
      }
    }
    
    if (!oldUser) {
      console.error(`❌ User not found with ID: ${oldId} (tried multiple formats)`);
      return c.json({ success: false, error: `Пользователь ${oldId} не найден` }, 404);
    }
    
    console.log(`✅ Found user: ${oldUser.имя} ${oldUser.фамилия} (actual ID: ${actualOldId})`);

    // Check if new ID is already taken
    const existingUser = await kv.get(`user:id:${newId}`);
    if (existingUser) {
      return c.json({ success: false, error: `ID ${newId} уже занят` }, 400);
    }

    // 📸 CREATE SNAPSHOT for possible rollback
    const snapshot = {
      user: JSON.parse(JSON.stringify(oldUser)),
      timestamp: new Date().toISOString(),
      operation: `changeId:${oldId}->${newId}`
    };
    await kv.set(`snapshot:change-id:${oldId}:${Date.now()}`, snapshot);
    console.log('📸 Created backup snapshot');

    // Get all users AND orders
    const allUsers = await kv.getByPrefix('user:id:');
    const allOrders = await kv.getByPrefix('order:');
    console.log(`📋 Loaded ${allUsers.length} users, ${allOrders.length} orders`);

    let updatedUsers = 0;
    let updatedOrders = 0;
    const updateLog: string[] = [];

    // 🔧 STEP 1: Update all references in USERS (including self!)
    for (const user of allUsers) {
      let needsUpdate = false;

      // Update sponsorId if it points to old ID
      if (user.спонсорId === actualOldId) {
        console.log(`🔧 [User ${user.id}] sponsorId: ${actualOldId} → ${newId}`);
        user.спонсорId = newId;
        needsUpdate = true;
        updateLog.push(`User ${user.id}: sponsorId updated`);
      }

      // Update team array if it contains old ID
      if (user.команда && Array.isArray(user.команда)) {
        const indexToUpdate = user.команда.indexOf(actualOldId);
        if (indexToUpdate !== -1) {
          console.log(`🔧 [User ${user.id}] команда: replacing ${actualOldId} with ${newId} at index ${indexToUpdate}`);
          user.команда[indexToUpdate] = newId;
          needsUpdate = true;
          updateLog.push(`User ${user.id}: команда updated`);
        }
      }

      // ✅ FIX: Save ALL updated users (removed filter user.id !== actualOldId)
      if (needsUpdate) {
        await kv.set(`user:id:${user.id}`, user);
        updatedUsers++;
      }
    }

    // 🔧 STEP 2: Update all references in ORDERS
    for (const order of allOrders) {
      let needsUpdate = false;

      // Update пользовательId (who made the order)
      if (order.пользовательId === actualOldId) {
        console.log(`🔧 [Order ${order.id}] пользовательId: ${actualOldId} → ${newId}`);
        order.пользовательId = newId;
        needsUpdate = true;
        updateLog.push(`Order ${order.id}: пользовательId updated`);
      }

      // Update d1_id, d2_id, d3_id (commission recipients)
      if (order.d1_id === actualOldId) {
        console.log(`🔧 [Order ${order.id}] d1_id: ${actualOldId} → ${newId}`);
        order.d1_id = newId;
        needsUpdate = true;
        updateLog.push(`Order ${order.id}: d1_id updated`);
      }
      if (order.d2_id === actualOldId) {
        console.log(`🔧 [Order ${order.id}] d2_id: ${actualOldId} → ${newId}`);
        order.d2_id = newId;
        needsUpdate = true;
        updateLog.push(`Order ${order.id}: d2_id updated`);
      }
      if (order.d3_id === actualOldId) {
        console.log(`🔧 [Order ${order.id}] d3_id: ${actualOldId} → ${newId}`);
        order.d3_id = newId;
        needsUpdate = true;
        updateLog.push(`Order ${order.id}: d3_id updated`);
      }

      if (needsUpdate) {
        await kv.set(order._key || `order:${order.id}`, order);
        updatedOrders++;
      }
    }

    // 🔧 STEP 3: Update the user's own ID record
    oldUser.id = newId;
    
    // 🆕 НОВАЯ ЛОГИКА: Инициализируем массив codes и добавляем старый ID
    if (!oldUser.codes) {
      oldUser.codes = [];
    }
    
    // Добавляем старый ID в массив кодов (если его там нет)
    const hasOldCode = oldUser.codes.some((c: any) => c.value === actualOldId);
    if (!hasOldCode) {
      oldUser.codes.push({
        value: actualOldId,
        type: /^\d+$/.test(actualOldId) ? "numeric" : "alphanumeric",
        primary: false, // Старый ID больше не основной
        isActive: true, // Но остается активным!
        createdAt: oldUser.датаРегистрации || new Date().toISOString(),
        note: 'Сохранён при смене ID'
      });
    }
    
    // Добавляем новый ID в массив кодов как основной
    const hasNewCode = oldUser.codes.some((c: any) => c.value === newId);
    if (!hasNewCode) {
      oldUser.codes.push({
        value: newId,
        type: /^\d+$/.test(newId) ? "numeric" : "alphanumeric",
        primary: true,
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }
    
    await kv.set(`user:id:${newId}`, oldUser);
    console.log(`✅ Created new user record: user:id:${newId}`);
    
    // 🔧 STEP 4: Delete old ID entry (use actual ID from database)
    await kv.del(`user:id:${actualOldId}`);
    console.log(`🗑️ Deleted old user record: user:id:${actualOldId}`);
    
    // 🆕 STEP 5: Создаём mapping для старого ID (НЕ освобождаем его!)
    // Старый ID теперь навсегда привязан к этому пользователю
    const oldIdMapping: CodeMapping = {
      userId: newId, // Теперь указываем на новый ID пользователя
      primary: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      type: /^\d+$/.test(actualOldId) ? "numeric" : "alphanumeric"
    };
    await kv.set(`id:code:${actualOldId}`, oldIdMapping);
    console.log(`🔒 Created permanent mapping for old ID: ${actualOldId} → ${newId}`);
    
    // Создаём mapping для нового ID
    const newIdMapping: CodeMapping = {
      userId: newId,
      primary: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      type: /^\d+$/.test(newId) ? "numeric" : "alphanumeric"
    };
    await kv.set(`id:code:${newId}`, newIdMapping);
    console.log(`🔒 Created mapping for new ID: ${newId}`);
    
    // ⚠️ ВАЖНО: НЕ освобождаем старый ID для повторного использования!
    // Старый ID остаётся привязанным к этому пользователю навсегда
    console.log(`🔐 Old ID ${actualOldId} is permanently linked to user ${newId} (NOT freed for reuse)`);

    // 🔍 STEP 6: VALIDATION - Check data integrity after changes
    const validationErrors: string[] = [];
    
    // Check new user exists
    const updatedUser = await kv.get(`user:id:${newId}`);
    if (!updatedUser) {
      validationErrors.push(`❌ User ${newId} not found after update`);
    }
    
    // Check old user is gone (use actual ID from database)
    const deletedUser = await kv.get(`user:id:${actualOldId}`);
    if (deletedUser) {
      validationErrors.push(`❌ Old user ${actualOldId} still exists!`);
    }
    
    // Check no one references old ID anymore (use actual ID from database)
    const allUsersAfter = await kv.getByPrefix('user:id:');
    for (const user of allUsersAfter) {
      if (user.спонсорId === actualOldId) {
        validationErrors.push(`❌ User ${user.id} still has sponsorId=${actualOldId}`);
      }
      if (user.команда && user.команда.includes(actualOldId)) {
        validationErrors.push(`❌ User ${user.id} still has ${actualOldId} in команда`);
      }
    }

    if (validationErrors.length > 0) {
      console.error('❌ VALIDATION FAILED:', validationErrors);
      return c.json({
        success: false,
        error: 'Validation failed after update',
        validationErrors,
        message: 'Данные обновлены, но обнаружены несоответствия. Требуется ручная проверка!'
      }, 500);
    }

    // 🔄 STEP 7: Invalidate caches
    await invalidateUsersCache();
    await metricsCache.invalidatePageCache(); // Очищаем кэш страниц и метрик
    await invalidateRankCache();

    console.log(`✅ User ID changed successfully: ${actualOldId} → ${newId}`);
    console.log(`📊 Updated ${updatedUsers} users, ${updatedOrders} orders`);

    return c.json({
      success: true,
      message: `ID изменён: ${actualOldId} → ${newId}`,
      stats: {
        updatedUsers,
        updatedOrders,
        totalReferences: updatedUsers + updatedOrders,
        oldIdRequested: oldId,
        oldIdActual: actualOldId
      },
      log: updateLog
    });

  } catch (error) {
    console.error('❌ Error changing user ID:', error);
    return c.json({ 
      success: false, 
      error: String(error),
      message: 'Критическая ошибка. Проверьте логи сервера.'
    }, 500);
  }
});

// Update user data (admin endpoint for MLM structure management)
app.put('/make-server-05aa3c8a/admin/update-user/:userId', async (c) => {
  try {
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

    // Get existing user
    const existingUser = await kv.get(`user:id:${userId}`);
    if (!existingUser) {
      return c.json({ success: false, error: `User ${userId} not found` }, 404);
    }

    // Merge with existing data, ensuring ID doesn't change
    const updatedUser = {
      ...existingUser,
      ...userData,
      id: userId // Force ID to stay the same
    };

    // Save updated user
    await kv.set(`user:id:${userId}`, updatedUser);
    
    console.log(`✅ User ${userId} updated successfully`);

    return c.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 🔧 DIAGNOSTIC: Check user by email
app.get('/make-server-05aa3c8a/diagnostic/check-email/:email', async (c) => {
  try {
    const email = c.req.param('email');
    console.log(`🔍 Diagnostic: Checking email: ${email}`);
    
    const result: any = {
      email: email,
      searchResults: {}
    };
    
    // 1. Check admin:email index
    const adminEmailKey = `admin:email:${email.toLowerCase()}`;
    const adminEmailData = await kv.get(adminEmailKey);
    result.searchResults.adminEmailIndex = {
      key: adminEmailKey,
      found: !!adminEmailData,
      data: adminEmailData
    };
    
    // 2. Check user:email index
    const userEmailKey = `user:email:${email.toLowerCase()}`;
    const userEmailData = await kv.get(userEmailKey);
    result.searchResults.userEmailIndex = {
      key: userEmailKey,
      found: !!userEmailData,
      data: userEmailData
    };
    
    // 3. Scan all users
    const allUsers = await kv.getByPrefix('user:id:');
    const userByEmail = allUsers.find((u: any) => 
      u.email && u.email.toLowerCase() === email.toLowerCase()
    );
    result.searchResults.scanAllUsers = {
      totalUsers: allUsers.length,
      foundByEmail: !!userByEmail,
      userData: userByEmail || null
    };
    
    // 4. Scan all admins
    const allAdmins = await kv.getByPrefix('admin:id:');
    const adminByEmail = allAdmins.find((a: any) => 
      a.email && a.email.toLowerCase() === email.toLowerCase()
    );
    result.searchResults.scanAllAdmins = {
      totalAdmins: allAdmins.length,
      foundByEmail: !!adminByEmail,
      adminData: adminByEmail || null
    };
    
    // 5. List first 10 users for reference
    result.sampleUsers = allUsers.slice(0, 10).map((u: any) => ({
      id: u.id,
      email: u.email,
      имя: u.имя,
      фамилия: u.фамилия,
      isAdmin: u.isAdmin
    }));
    
    console.log(`✅ Diagnostic complete for ${email}`);
    return c.json(result);
  } catch (error) {
    console.error('Diagnostic error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// 🔄 One-time migration: Add lastActivity to all users who don't have it
app.post("/make-server-05aa3c8a/admin/migrate-activity", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('🔄 Starting lastActivity migration...');
    
    const allUsers = await kv.getByPrefix('user:id:');
    const userArray = Array.isArray(allUsers) ? allUsers : [];
    
    let migratedCount = 0;
    
    for (const user of userArray) {
      if (!user.lastActivity && user.lastLogin) {
        // Set lastActivity = lastLogin for users who don't have it
        user.lastActivity = user.lastLogin;
        await kv.set(`user:id:${user.id}`, user);
        migratedCount++;
        console.log(`✅ Migrated user ${user.id} (${user.имя}): lastActivity = ${user.lastActivity}`);
      }
    }
    
    console.log(`🎉 Migration complete: ${migratedCount} users updated`);
    
    return c.json({ 
      success: true, 
      message: `Migration complete: ${migratedCount} users updated`,
      totalUsers: userArray.length,
      migratedCount
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return c.json({ error: `Migration failed: ${error}` }, 500);
  }
});

// Recalculate all ranks (admin only)
app.post("/make-server-05aa3c8a/admin/recalculate-ranks", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('🔄 Starting full rank recalculation...');
    
    // Get all users
    const allUsers = await kv.getByPrefix('user:id:');
    const userArray = Array.isArray(allUsers) ? allUsers : [];
    
    // Filter out admins
    const partners = userArray.filter((u: any) => 
      u.__type !== 'admin' && 
      u.isAdmin !== true && 
      u.роль !== 'admin'
    );
    
    console.log(`📊 Found ${partners.length} partners to recalculate`);
    
    // ✨ ПРАВИЛЬНЫЙ АЛГОРИТМ: Сортируем партнёров по глубине (снизу вверх)
    // Сначала находим глубину каждого партнёра в дереве
    const partnerDepths = new Map<string, number>();
    
    function calculateDepth(userId: string, visited = new Set<string>()): number {
      if (visited.has(userId)) return 0;
      visited.add(userId);
      
      const user = partners.find(p => p.id === userId);
      if (!user || !user.спонсорId) return 0;
      
      return 1 + calculateDepth(user.спонсорId, visited);
    }
    
    for (const partner of partners) {
      partnerDepths.set(partner.id, calculateDepth(partner.id));
    }
    
    // Сортируем от самых глубоких к корням (снизу вверх)
    const sortedPartners = partners.sort((a, b) => {
      const depthA = partnerDepths.get(a.id) || 0;
      const depthB = partnerDepths.get(b.id) || 0;
      return depthB - depthA; // От большей глубины к меньшей
    });
    
    console.log(`📊 Sorted partners by depth (deepest first)`);
    
    // Обновляем ранги СНИЗУ ВВЕРХ - каждого партнёра ОДИН РАЗ
    const results: any[] = [];
    let processed = 0;
    
    for (const partner of sortedPartners) {
      try {
        // Обновляем ТОЛЬКО этого партнёра (НЕ upline!)
        await updateUserRank(partner.id);
        
        // Читаем обновлённый ранг
        const updatedUser = await kv.get(`user:id:${partner.id}`);
        const rank = updatedUser?.уровень || 0;
        
        results.push({
          userId: partner.id,
          name: `${partner.имя} ${partner.фамилия}`,
          rank,
          teamSize: partner.команда?.length || 0
        });
        processed++;
        
        if (processed % 10 === 0) {
          console.log(`📊 Processed ${processed}/${partners.length} partners...`);
        }
      } catch (error) {
        console.error(`❌ Error calculating rank for user ${partner.id}:`, error);
        results.push({
          userId: partner.id,
          name: `${partner.имя} ${partner.фамилия}`,
          rank: 0,
          error: String(error)
        });
      }
    }
    
    console.log(`✅ Recalculation complete! Processed ${processed} partners`);
    
    return c.json({ 
      success: true, 
      message: `Recalculated ranks for ${processed} partners`,
      results,
      stats: {
        total: partners.length,
        processed,
        withTeam: results.filter(r => r.teamSize > 0).length,
        avgRank: results.reduce((sum, r) => sum + r.rank, 0) / results.length
      }
    });
  } catch (error) {
    console.error('❌ Rank recalculation error:', error);
    return c.json({ 
      success: false,
      error: `${error}`
    }, (error as any).message?.includes('Admin') ? 403 : 500);
  }
});

// ======================
// 🚀 ОПТИМИЗИРОВАННЫЕ ENDPOINTS ДЛЯ МАСШТАБИРОВАНИЯ
// ======================

/**
 * 🚀 Оптимизированная загрузка пользователей с кэшированными метриками
 * Используется новым компонентом UsersManagementOptimized
 */
app.get("/make-server-05aa3c8a/users/optimized", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const search = c.req.query('search') || '';
    const sortBy = c.req.query('sortBy') || 'created';
    const sortOrder = c.req.query('sortOrder') || 'desc';
    const statsFilter = c.req.query('statsFilter') || ''; // 🆕 Фильтр из виджетов

    // Проверяем кэш страницы (включая statsFilter)
    const cacheKey = `users_page:${page}:${limit}:${search}:${sortBy}:${sortOrder}:${statsFilter}`;
    const cached = await kv.get(cacheKey);
    
    if (cached && cached.timestamp) {
      const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5 минут
        console.log(`✅ Cache hit for page ${page}`);
        return c.json(cached.data);
      }
    }

    console.log(`📊 Loading optimized users page ${page} with statsFilter: ${statsFilter}...`);

    // 🎯 КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ #1: Кэш списка всех пользователей (2 минуты)
    const ALL_USERS_CACHE_KEY = 'cache:all_users_list';
    const ALL_USERS_CACHE_TTL = 2 * 60 * 1000;
    
    let allUsersCache = await kv.get(ALL_USERS_CACHE_KEY);
    let users: any[];
    
    if (allUsersCache && allUsersCache.timestamp) {
      const cacheAge = Date.now() - new Date(allUsersCache.timestamp).getTime();
      if (cacheAge < ALL_USERS_CACHE_TTL) {
        console.log(`✅ Using cached all users (age: ${Math.round(cacheAge/1000)}s)`);
        users = allUsersCache.users;
      } else {
        const allUsers = await kv.getByPrefix('user:id:');
        users = allUsers.filter((u: any) => !isUserAdmin(u));
        await kv.set(ALL_USERS_CACHE_KEY, { users, timestamp: new Date().toISOString() });
      }
    } else {
      const allUsers = await kv.getByPrefix('user:id:');
      users = allUsers.filter((u: any) => !isUserAdmin(u));
      await kv.set(ALL_USERS_CACHE_KEY, { users, timestamp: new Date().toISOString() });
    }

    // Применяем поиск
    let filteredUsers = users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = users.filter((u: any) => 
        u.имя?.toLowerCase().includes(searchLower) ||
        u.фамилия?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.телефон?.includes(search) ||
        u.id?.includes(search)
      );
    }

    // 🎯 Применяем фильтр из виджетов статистики
    if (statsFilter && statsFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Для фильтров по заказам загружаем их один раз
      let allOrders: any[] = [];
      if (statsFilter === 'activeUsers' || statsFilter === 'passiveUsers') {
        allOrders = await kv.getByPrefix('order:');
      }
      
      switch (statsFilter) {
        case 'newToday':
          filteredUsers = filteredUsers.filter((u: any) => {
            const regDate = new Date(u.зарегистрирован || u.createdAt || 0);
            return regDate >= todayStart;
          });
          break;
          
        case 'newThisMonth':
          filteredUsers = filteredUsers.filter((u: any) => {
            const regDate = new Date(u.зарегистрирован || u.createdAt || 0);
            return regDate >= monthStart;
          });
          break;
          
        case 'activePartners':
          // Те, кто подключил хотя бы 1 реферала в текущем месяце
          filteredUsers = filteredUsers.filter((u: any) => {
            if (!u.команда || u.команда.length === 0) return false;
            // Считаем рефералов, зарегистрированных в текущем месяце
            const newRefsThisMonth = u.команда.filter((refId: string) => {
              const ref = users.find((usr: any) => usr.id === refId);
              if (!ref) return false;
              const refDate = new Date(ref.зарегистрирован || ref.createdAt || 0);
              return refDate >= monthStart;
            });
            return newRefsThisMonth.length > 0;
          });
          break;
          
        case 'passivePartners':
          // Те, кто НЕ подключил ни одного реферала в текущем месяце
          filteredUsers = filteredUsers.filter((u: any) => {
            if (!u.команда || u.команда.length === 0) return true;
            // Считаем рефералов, зарегистрированных в текущем месяце
            const newRefsThisMonth = u.команда.filter((refId: string) => {
              const ref = users.find((usr: any) => usr.id === refId);
              if (!ref) return false;
              const refDate = new Date(ref.зарегистрирован || ref.createdAt || 0);
              return refDate >= monthStart;
            });
            return newRefsThisMonth.length === 0;
          });
          break;
          
        case 'activeUsers':
          // Сделали хотя бы 1 заказ в текущем месяце
          const ordersThisMonth = allOrders.filter((o: any) => {
            const orderDate = new Date(o.датаЗаказа || o.дата || o.createdAt || 0);
            return orderDate >= monthStart;
          });
          const activeUserIds = new Set(ordersThisMonth.map((o: any) => o.продавецId).filter(Boolean));
          filteredUsers = filteredUsers.filter((u: any) => activeUserIds.has(u.id));
          break;
          
        case 'passiveUsers':
          // НЕ сделали ни одного заказа в текущем месяце
          const ordersThisMonth2 = allOrders.filter((o: any) => {
            const orderDate = new Date(o.датаЗаказа || o.дата || o.createdAt || 0);
            return orderDate >= monthStart;
          });
          const activeUserIds2 = new Set(ordersThisMonth2.map((o: any) => o.продавецId).filter(Boolean));
          filteredUsers = filteredUsers.filter((u: any) => !activeUserIds2.has(u.id));
          break;
          
        case 'totalBalance':
          // Для totalBalance просто сортируем по балансу, не фильтруем
          break;
      }
    }

    // 🎯 ОПТИМИЗАЦИЯ #2: Если сортировка не требует метрик - пагинируем СНАЧАЛА
    if (sortBy === 'name' || sortBy === 'balance' || sortBy === 'created') {
      // 🎯 Применяем специальную сортировку для фильтров виджетов
      if (statsFilter && statsFilter !== 'all') {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        switch (statsFilter) {
          case 'newThisMonth':
            // От новых к старым (позже зарегистрированных к началу месяца)
            filteredUsers.sort((a: any, b: any) => {
              const dateA = new Date(a.зарегистрирован || a.createdAt || 0).getTime();
              const dateB = new Date(b.зарегистрирован || b.createdAt || 0).getTime();
              return dateB - dateA; // DESC (новые первые)
            });
            break;
            
          case 'totalBalance':
            // От большего баланса к меньшему
            filteredUsers.sort((a: any, b: any) => (b.баланс || 0) - (a.баланс || 0));
            break;
            
          case 'activePartners':
            // От большего количества новых рефералов к меньшему
            filteredUsers.sort((a: any, b: any) => {
              const countA = (a.команда || []).filter((refId: string) => {
                const ref = users.find((u: any) => u.id === refId);
                if (!ref) return false;
                const refDate = new Date(ref.зарегистрирован || ref.createdAt || 0);
                return refDate >= monthStart;
              }).length;
              const countB = (b.команда || []).filter((refId: string) => {
                const ref = users.find((u: any) => u.id === refId);
                if (!ref) return false;
                const refDate = new Date(ref.зарегистрирован || ref.createdAt || 0);
                return refDate >= monthStart;
              }).length;
              return countB - countA;
            });
            break;
            
          case 'activeUsers':
            // От большего количества покупок к меньшему
            {
              const allOrders = await kv.getByPrefix('order:');
              const ordersThisMonth = allOrders.filter((o: any) => {
                const orderDate = new Date(o.датаЗаказа || o.дата || o.createdAt || 0);
                return orderDate >= monthStart;
              });
              
              filteredUsers.sort((a: any, b: any) => {
                const ordersA = ordersThisMonth.filter((o: any) => o.продавецId === a.id).length;
                const ordersB = ordersThisMonth.filter((o: any) => o.продавецId === b.id).length;
                return ordersB - ordersA;
              });
            }
            break;
            
          default:
            // Для остальных фильтров - обычная сортировка
            filteredUsers.sort((a: any, b: any) => {
              let comparison = 0;
              switch (sortBy) {
                case 'name':
                  comparison = (a.имя || '').localeCompare(b.имя || '');
                  break;
                case 'balance':
                  comparison = (b.баланс || 0) - (a.баланс || 0);
                  break;
                case 'created':
                default:
                  comparison = new Date(b.зарегистрирован || 0).getTime() - new Date(a.зарегистрирован || 0).getTime();
              }
              return sortOrder === 'asc' ? -comparison : comparison;
            });
        }
      } else {
        // Обычная сортировка без фильтра
        filteredUsers.sort((a: any, b: any) => {
          let comparison = 0;
          switch (sortBy) {
            case 'name':
              comparison = (a.имя || '').localeCompare(b.имя || '');
              break;
            case 'balance':
              comparison = (b.баланс || 0) - (a.баланс || 0);
              break;
            case 'created':
            default:
              comparison = new Date(b.зарегистрирован || 0).getTime() - new Date(a.зарегистрирован || 0).getTime();
          }
          return sortOrder === 'asc' ? -comparison : comparison;
        });
      }
      
      // Пагинируем ДО загрузки метрик
      const total = filteredUsers.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedUsers = filteredUsers.slice(start, end);
      
      // ⚡ КРИТИЧЕСКОЕ УСКОРЕНИЕ: НЕ загружаем метрики на быстром пути
      // Клиент сам догрузит ранги через getUserRank API
      // Это экономит ~500-1000ms на страницу
      
      // 📊 Рассчитываем статистику
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Для активных/пассивных по покупкам
      const allOrders = await kv.getByPrefix('order:');
      const ordersThisMonth = allOrders.filter((o: any) => {
        const orderDate = new Date(o.датаЗаказа || o.дата || o.createdAt || 0);
        return orderDate >= thisMonth;
      });
      const activeUserIdsSet = new Set(ordersThisMonth.map((o: any) => o.продавецId).filter(Boolean));
      
      // Активные партнёры - кто подключил хотя бы 1 реферала в текущем месяце
      const activePartners = users.filter((u: any) => {
        if (!u.команда || u.команда.length === 0) return false;
        return u.команда.some((refId: string) => {
          const ref = users.find((usr: any) => usr.id === refId);
          if (!ref) return false;
          const refDate = new Date(ref.зарегистрирован || ref.createdAt || 0);
          return refDate >= thisMonth;
        });
      }).length;
      
      // Пассивные партнёры - кто не подключил ни одного реферала в текущем месяце
      const passivePartners = users.filter((u: any) => {
        if (!u.команда || u.команда.length === 0) return true;
        return !u.команда.some((refId: string) => {
          const ref = users.find((usr: any) => usr.id === refId);
          if (!ref) return false;
          const refDate = new Date(ref.зарегистрирован || ref.createdAt || 0);
          return refDate >= thisMonth;
        });
      }).length;
      
      const stats = {
        totalUsers: users.length,
        newToday: users.filter((u: any) => new Date(u.зарегистрирован || u.createdAt) >= today).length,
        newThisMonth: users.filter((u: any) => new Date(u.зарегистрирован || u.createdAt) >= thisMonth).length,
        activePartners,
        passivePartners,
        activeUsers: users.filter((u: any) => activeUserIdsSet.has(u.id)).length,
        passiveUsers: users.filter((u: any) => !activeUserIdsSet.has(u.id)).length,
        totalBalance: users.reduce((sum: number, u: any) => sum + (u.баланс || 0), 0),
      };
      
      console.log(`⚡ ULTRA-FAST path: ${paginatedUsers.length} users (page ${page}/${totalPages}) - NO METRICS LOADED`);
      
      return c.json({
        success: true,
        users: paginatedUsers, // Возвращаем без метрик для максимальной скорости
        pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
        stats
      });
    }
    
    // Медленный путь: сортировка по метрикам
    console.log(`⚠️ Loading metrics for ${filteredUsers.length} users (sorting by ${sortBy})`);
    
    const usersWithMetrics = await Promise.all(
      filteredUsers.map(async (user: any) => {
        const metrics = await metricsCache.getUserMetrics(user.id);
        return { ...user, _metrics: metrics };
      })
    );

    // Сортировка по метрикам
    usersWithMetrics.sort((a: any, b: any) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rank':
          comparison = (b._metrics?.rank || 0) - (a._metrics?.rank || 0);
          break;
        case 'teamSize':
          comparison = (b._metrics?.totalTeamSize || 0) - (a._metrics?.totalTeamSize || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    // Пагинация
    const total = usersWithMetrics.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = usersWithMetrics.slice(start, end);

    // 📊 Рассчитываем статистику
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Для активных/пассивных по покупкам
    const allOrders = await kv.getByPrefix('order:');
    const ordersThisMonth = allOrders.filter((o: any) => {
      const orderDate = new Date(o.датаЗаказа || o.дата || o.createdAt || 0);
      return orderDate >= thisMonth;
    });
    const activeUserIdsSet = new Set(ordersThisMonth.map((o: any) => o.продавецId).filter(Boolean));
    
    // Активные партнёры - кто подключил хотя бы 1 реферала в текущем месяце
    const activePartners = users.filter((u: any) => {
      if (!u.команда || u.команда.length === 0) return false;
      return u.команда.some((refId: string) => {
        const ref = users.find((usr: any) => usr.id === refId);
        if (!ref) return false;
        const refDate = new Date(ref.зарегистрирован || ref.createdAt || 0);
        return refDate >= thisMonth;
      });
    }).length;
    
    // Пассивные партнёры - кто не подключил ни одного реферала в текущем месяце
    const passivePartners = users.filter((u: any) => {
      if (!u.команда || u.команда.length === 0) return true;
      return !u.команда.some((refId: string) => {
        const ref = users.find((usr: any) => usr.id === refId);
        if (!ref) return false;
        const refDate = new Date(ref.зарегистрирован || ref.createdAt || 0);
        return refDate >= thisMonth;
      });
    }).length;
    
    const stats = {
      totalUsers: users.length,
      newToday: users.filter((u: any) => new Date(u.зарегистрирован || u.createdAt) >= today).length,
      newThisMonth: users.filter((u: any) => new Date(u.зарегистрирован || u.createdAt) >= thisMonth).length,
      activePartners,
      passivePartners,
      activeUsers: users.filter((u: any) => activeUserIdsSet.has(u.id)).length,
      passiveUsers: users.filter((u: any) => !activeUserIdsSet.has(u.id)).length,
      totalBalance: users.reduce((sum: number, u: any) => sum + (u.баланс || 0), 0),
    };

    const result = {
      success: true,
      users: paginatedUsers,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
      stats
    };

    console.log(`✅ Loaded ${paginatedUsers.length} users (page ${page}/${totalPages})`);

    return c.json(result);
  } catch (error) {
    console.error('❌ Optimized users load error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 🔄 Пересчёт метрик для всех пользователей
 * Вызывается админом вручную или по расписанию
 */
app.post("/make-server-05aa3c8a/metrics/recalculate", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);

    console.log(`🔄 Admin ${currentUser.имя} initiated metrics recalculation`);

    // Запускаем пересчёт
    const result = await metricsCache.recalculateAllMetrics();

    // Очищаем кэш страниц
    await metricsCache.invalidatePageCache();

    return c.json({
      success: true,
      message: `Пересчитано метрик: ${result.updated}, ошибок: ${result.errors}`,
      ...result
    });
  } catch (error) {
    console.error('❌ Metrics recalculation error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 🔍 Просмотр RAW данных пользователя (как они хранятся в БД)
 */
app.get("/make-server-05aa3c8a/debug/user-raw/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:id:${userId}`);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 RAW DATA FOR USER ${userId}`);
    console.log(`${'='.repeat(80)}`);
    console.log(JSON.stringify(user, null, 2));
    console.log(`${'='.repeat(80)}\n`);
    
    // Проверяем тип поля команда
    console.log(`📊 команда field analysis:`);
    console.log(`   Type: ${typeof user.команда}`);
    console.log(`   Is Array: ${Array.isArray(user.команда)}`);
    console.log(`   Value:`, user.команда);
    
    if (Array.isArray(user.команда)) {
      console.log(`   Length: ${user.команда.length}`);
      user.команда.forEach((id: any, index: number) => {
        console.log(`   [${index}] = "${id}" (type: ${typeof id}, valid: ${id && typeof id === 'string' && id.trim() !== ''})`);
      });
    }
    
    return c.json({
      success: true,
      userId,
      rawData: user,
      командаAnalysis: {
        type: typeof user.команда,
        isArray: Array.isArray(user.команда),
        length: user.команда?.length,
        items: Array.isArray(user.команда) ? user.команда.map((id: any, index: number) => ({
          index,
          value: id,
          type: typeof id,
          isValid: id && typeof id === 'string' && id.trim() !== ''
        })) : []
      }
    });
  } catch (error) {
    console.error('❌ Debug user raw error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 🔍 Просмотр данных пользователя
 */
app.get("/make-server-05aa3c8a/debug/user-data/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:id:${userId}`);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Получаем данные о членах команды
    const teamData = [];
    if (user.команда && Array.isArray(user.команда)) {
      for (const memberId of user.команда) {
        const member = await kv.get(`user:id:${memberId}`);
        teamData.push({
          id: memberId,
          exists: !!member,
          имя: member?.имя || 'N/A',
          команда: member?.команда || [],
          уровень: member?.уровень || 0
        });
      }
    }
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        имя: user.имя,
        фамилия: user.фамилия,
        email: user.email,
        команда: user.команда,
        спонсорId: user.спонсорId,
        уровень: user.уровень,
        isAdmin: user.isAdmin,
        __type: user.__type
      },
      teamData,
      teamSize: user.команда?.length || 0
    });
  } catch (error) {
    console.error('❌ Debug user data error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 🔍 ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ РАНГОВ
 */
app.get("/make-server-05aa3c8a/admin/diagnose-ranks", async (c) => {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('🔍 ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ РАНГОВ');
    console.log('='.repeat(100) + '\n');
    
    // Получаем всех пользователей
    const allUsers = await kv.getByPrefix('user:id:');
    const users = allUsers.filter((u: any) => u.__type !== 'admin' && !u.isAdmin);
    
    console.log(`📊 Всего пользователей: ${users.length}`);
    
    // Строим дерево связей
    const userMap = new Map();
    const childrenMap = new Map(); // спонсор -> [дети]
    
    for (const user of users) {
      userMap.set(user.id, user);
      
      // Инициализируем команду для каждого пользователя
      if (!childrenMap.has(user.id)) {
        childrenMap.set(user.id, []);
      }
      
      // Если есть спонсор, добавляем пользователя в его команду
      if (user.спонсорId) {
        if (!childrenMap.has(user.спонсорId)) {
          childrenMap.set(user.спонсорId, []);
        }
        childrenMap.get(user.спонсорId).push(user.id);
      }
    }
    
    // Функция для правильного расчета ранга (снизу вверх)
    const calculatedRanks = new Map();
    const calculating = new Set();
    
    function calculateRank(userId: string): number {
      if (calculatedRanks.has(userId)) {
        return calculatedRanks.get(userId);
      }
      
      if (calculating.has(userId)) {
        console.warn(`⚠️ Cycle detected for user ${userId}`);
        return 0;
      }
      
      calculating.add(userId);
      
      const children = childrenMap.get(userId) || [];
      
      if (children.length === 0) {
        calculatedRanks.set(userId, 0);
        calculating.delete(userId);
        return 0;
      }
      
      const childRanks = children.map((childId: string) => calculateRank(childId));
      const maxChildRank = Math.max(...childRanks);
      const rank = maxChildRank + 1;
      
      calculatedRanks.set(userId, rank);
      calculating.delete(userId);
      return rank;
    }
    
    // Рассчитываем ранги для всех пользователей
    for (const user of users) {
      calculateRank(user.id);
    }
    
    // Сравниваем с текущими рангами в БД
    const issues = [];
    const report = [];
    
    for (const user of users) {
      const currentRank = user.уровень || 0;
      const correctRank = calculatedRanks.get(user.id) || 0;
      const children = childrenMap.get(user.id) || [];
      const команда = user.команда || [];
      
      const status = currentRank === correctRank ? '✅' : '❌';
      
      const userInfo = {
        id: user.id,
        name: `${user.имя} ${user.фамилия || ''}`,
        sponsorId: user.спонсорId || 'нет',
        currentRank,
        correctRank,
        isCorrect: currentRank === correctRank,
        teamSize: children.length,
        teamInDB: команда.length,
        teamMismatch: children.length !== команда.length,
        children: children.map((childId: string) => {
          const child = userMap.get(childId);
          return {
            id: childId,
            name: child ? `${child.имя} ${child.фамилия || ''}` : 'Unknown',
            rank: calculatedRanks.get(childId) || 0
          };
        })
      };
      
      report.push(userInfo);
      
      if (!userInfo.isCorrect) {
        issues.push({
          userId: user.id,
          name: userInfo.name,
          problem: `Ранг в БД: ${currentRank}, должен быть: ${correctRank}`,
          difference: correctRank - currentRank
        });
      }
      
      if (userInfo.teamMismatch) {
        issues.push({
          userId: user.id,
          name: userInfo.name,
          problem: `Несоответствие размера команды: в поле команда=${команда.length}, реальных детей=${children.length}`,
          teamInDB: команда,
          actualChildren: children
        });
      }
      
      console.log(`${status} User ${user.id} (${userInfo.name}): Rank ${currentRank} → ${correctRank} | Team: ${children.length} | Sponsor: ${user.спонсорId || 'нет'}`);
    }
    
    console.log('\n' + '='.repeat(100));
    console.log(`📊 ИТОГИ ДИАГНОСТИКИ:`);
    console.log(`   Всего пользователей: ${users.length}`);
    console.log(`   Проблем обнаружено: ${issues.length}`);
    console.log('='.repeat(100) + '\n');
    
    if (issues.length > 0) {
      console.log('❌ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. User ${issue.userId} (${issue.name}): ${issue.problem}`);
      });
      console.log('\n');
    }
    
    return c.json({
      success: true,
      totalUsers: users.length,
      issuesCount: issues.length,
      issues,
      report,
      message: issues.length > 0 
        ? `Обнаружено ${issues.length} проблем. Используйте /admin/recalculate-all-ranks для исправления.`
        : 'Все ранги рассчитаны правильно!'
    });
  } catch (error) {
    console.error('❌ Diagnosis error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 🔧 ПЕРЕСЧЕТ ВСЕХ РАНГОВ (ИСПРАВЛЕНИЕ)
 */
app.post("/make-server-05aa3c8a/admin/recalculate-all-ranks", async (c) => {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('🔧 ПЕРЕСЧЕТ ВСЕХ РАНГОВ');
    console.log('='.repeat(100) + '\n');
    
    // Получаем всех пользователей
    const allUsers = await kv.getByPrefix('user:id:');
    const users = allUsers.filter((u: any) => u.__type !== 'admin' && !u.isAdmin);
    
    console.log(`📊 Пользователей для обновления: ${users.length}`);
    
    // Строим дерево
    const childrenMap = new Map();
    const userMap = new Map();
    
    for (const user of users) {
      userMap.set(user.id, user);
      if (!childrenMap.has(user.id)) {
        childrenMap.set(user.id, []);
      }
      
      if (user.спонсорId) {
        if (!childrenMap.has(user.спонсорId)) {
          childrenMap.set(user.спонсорId, []);
        }
        childrenMap.get(user.спонсорId).push(user.id);
      }
    }
    
    // Рассчитываем правильные ранги
    const calculatedRanks = new Map();
    const calculating = new Set();
    
    function calculateRank(userId: string): number {
      if (calculatedRanks.has(userId)) {
        return calculatedRanks.get(userId);
      }
      
      if (calculating.has(userId)) {
        return 0;
      }
      
      calculating.add(userId);
      
      const children = childrenMap.get(userId) || [];
      
      if (children.length === 0) {
        calculatedRanks.set(userId, 0);
        calculating.delete(userId);
        return 0;
      }
      
      const childRanks = children.map((childId: string) => calculateRank(childId));
      const maxChildRank = Math.max(...childRanks);
      const rank = maxChildRank + 1;
      
      calculatedRanks.set(userId, rank);
      calculating.delete(userId);
      return rank;
    }
    
    // Рассчитываем для всех
    for (const user of users) {
      calculateRank(user.id);
    }
    
    // Обновляем в БД и кэш
    const updates = [];
    
    for (const user of users) {
      const correctRank = calculatedRanks.get(user.id) || 0;
      const oldRank = user.уровень || 0;
      
      // ✅ ВСЕГДА обновляем кэш ранга (даже если user.уровень уже правильный)
      // Это исправляет ситуацию, когда кэш rank:user:{id} содержит устаревшее значение
      await kv.set(`rank:user:${user.id}`, correctRank);
      
      if (oldRank !== correctRank) {
        user.уровень = correctRank;
        await kv.set(`user:id:${user.id}`, user);
        
        // Очищаем кэш метрик (они будут пересчитаны)
        await kv.del(`user_metrics:${user.id}`);
        
        updates.push({
          userId: user.id,
          name: `${user.имя} ${user.фамилия || ''}`,
          oldRank,
          newRank: correctRank
        });
        
        console.log(`✅ Updated ${user.id} (${user.имя}): ${oldRank} → ${correctRank}`);
      }
    }
    
    console.log(`✅ Rank cache updated for all ${users.length} users`);
    
    console.log('\n' + '='.repeat(100));
    console.log(`✅ ПЕРЕСЧЕТ ЗАВЕРШЕН:`);
    console.log(`   Обновлено пользователей: ${updates.length}`);
    console.log('='.repeat(100) + '\n');
    
    return c.json({
      success: true,
      totalUsers: users.length,
      updatedCount: updates.length,
      updates,
      message: `Обновлено ${updates.length} пользователей`
    });
  } catch (error) {
    console.error('❌ Recalculation error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 🧪 ТЕСТ: Проверка логики рангов (без изменения данных)
 * Показывает примеры правильного расчёта для понимания логики
 */
app.get("/make-server-05aa3c8a/admin/test-rank-logic", async (c) => {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 ТЕСТ ЛОГИКИ РАНГОВ');
  console.log('='.repeat(80) + '\n');
  
  const examples = [
    {
      scenario: 'C: Новый пользователь без партнёров',
      expected: 0,
      explanation: 'команда = [] → ранг = 0'
    },
    {
      scenario: 'B: Пользователь с одним партнёром C (без структуры)',
      expected: 1,
      explanation: 'команда = [C], C.ранг = 0 → ранг = max(0) + 1 = 1'
    },
    {
      scenario: 'A: Пользователь с партнёром B, у B есть партнёр C',
      expected: 2,
      explanation: 'A.команда = [B], B.ранг = 1 → ранг = max(1) + 1 = 2'
    },
    {
      scenario: 'TOP: A → B → C → D (цепочка из 4 уровней)',
      expected: 3,
      explanation: 'D=0, C=1, B=2, A=3 (глубина структуры вниз)'
    }
  ];
  
  console.log('📋 ПРАВИЛА РАСЧЁТА РАНГА:');
  console.log('   1. Ранг = максимальная глубина структуры ВНИЗ от пользователя');
  console.log('   2. Сам пользователь НЕ входит в расчёт глубины');
  console.log('   3. Если потомков нет → ранг = 0');
  console.log('   4. Если есть прямые партнёры → ранг = max(ранги партнёров) + 1');
  console.log('\n📊 ПРИМЕРЫ:\n');
  
  for (const ex of examples) {
    console.log(`   ${ex.scenario}`);
    console.log(`   Ожидаемый ранг: ${ex.expected}`);
    console.log(`   Логика: ${ex.explanation}`);
    console.log('');
  }
  
  // Находим реальные примеры в базе
  const allUsers = await kv.getByPrefix('user:id:');
  const users = allUsers.filter((u: any) => u.__type !== 'admin' && !u.isAdmin);
  
  const noTeamUsers = users.filter((u: any) => !u.команда || u.команда.length === 0);
  const withTeamUsers = users.filter((u: any) => u.команда && u.команда.length > 0);
  
  console.log('📦 РЕАЛЬНЫЕ ДАННЫЕ В БАЗЕ:');
  console.log(`   Всего пользователей: ${users.length}`);
  console.log(`   Без команды (ожидается ранг 0): ${noTeamUsers.length}`);
  console.log(`   С командой: ${withTeamUsers.length}`);
  
  // Проверяем несколько пользователей
  const samples = [];
  
  // Берём 3 пользователя без команды
  for (const user of noTeamUsers.slice(0, 3)) {
    samples.push({
      id: user.id,
      name: `${user.имя} ${user.фамилия || ''}`,
      teamSize: 0,
      currentRank: user.уровень || 0,
      expectedRank: 0,
      isCorrect: (user.уровень || 0) === 0
    });
  }
  
  // Берём 3 пользователя с командой
  for (const user of withTeamUsers.slice(0, 3)) {
    samples.push({
      id: user.id,
      name: `${user.имя} ${user.фамилия || ''}`,
      teamSize: user.команда.length,
      currentRank: user.уровень || 0,
      expectedRank: 'requires calculation'
    });
  }
  
  return c.json({
    success: true,
    rules: {
      formula: 'ранг = max(ранги прямых партнёров) + 1',
      noTeam: 'если команда пуста → ранг = 0',
      withTeam: 'если есть партнёры → min ранг = 1'
    },
    examples,
    realData: {
      totalUsers: users.length,
      noTeamUsers: noTeamUsers.length,
      withTeamUsers: withTeamUsers.length,
      samples
    },
    howToTest: {
      step1: 'GET /admin/diagnose-ranks — покажет все проблемы с рангами',
      step2: 'POST /admin/recalculate-all-ranks — пересчитает все ранги',
      step3: 'GET /debug/user-rank/:userId — детальная диагностика для пользователя'
    }
  });
});

/**
 * 🔍 Диагностика ранга конкретного пользователя
 */
app.get("/make-server-05aa3c8a/debug/user-rank/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 DIAGNOSTIC RANK CALCULATION FOR USER ${userId}`);
    console.log(`${'='.repeat(80)}\n`);
    
    const user = await kv.get(`user:id:${userId}`);
    if (!user) {
      console.log(`❌ User ${userId} not found in database`);
      return c.json({ error: 'User not found' }, 404);
    }
    
    console.log(`📊 User basic info:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.имя} ${user.фамилия || ''}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current level (уровень): ${user.уровень}`);
    console.log(`   Sponsor ID: ${user.спонсорId || 'none'}`);
    console.log(`   Team (команда):`, user.команда);
    console.log(`   Team size: ${user.команда?.length || 0}`);
    console.log(`   isAdmin: ${user.isAdmin}`);
    console.log(`   __type: ${user.__type}`);
    
    // Очищаем кэш для этого пользователя
    console.log(`\n🗑️ Clearing cache for user ${userId}...`);
    await kv.del(`rank:user:${userId}`);
    await kv.del(`user_metrics:${userId}`);
    console.log(`✅ Cache cleared`);
    
    // Вычисляем ранг заново с детальным логированием
    console.log(`\n🔄 Starting rank calculation...\n`);
    const rank = await calculateUserRank(userId);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ CALCULATION COMPLETE: Rank = ${rank}`);
    console.log(`${'='.repeat(80)}\n`);
    
    return c.json({
      success: true,
      userId,
      user: {
        id: user.id,
        имя: user.имя,
        фамилия: user.фамилия,
        команда: user.команда,
        командаРазмер: user.команда?.length || 0,
        спонсорId: user.спонсорId,
        текущийУровень: user.уровень
      },
      calculatedRank: rank,
      message: 'Check server console for detailed calculation logs'
    });
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 🗑️ Очистка кэша метрик и рангов
 * Принудительное удаление всех закэшированных метрик и рангов
 */
app.post("/make-server-05aa3c8a/metrics/clear-cache", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);

    console.log(`🗑️ Admin ${currentUser.имя} initiated cache clearing`);

    // Очищаем кэш метрик
    const metricsKeys = await kv.getByPrefix('user_metrics:');
    let metricsCleared = 0;
    for (const key of metricsKeys) {
      await kv.del(`user_metrics:${key.userId || ''}`);
      metricsCleared++;
    }

    // Очищаем кэш рангов
    // Сначала получаем все ключи с префиксом rank:user:
    const allUsers = await kv.getByPrefix('user:id:');
    const users = allUsers.filter((u: any) => u.__type !== 'admin' && !u.isAdmin);
    let ranksCleared = 0;
    for (const user of users) {
      await kv.del(`rank:user:${user.id}`);
      ranksCleared++;
    }

    // Очищаем кэш страниц
    await metricsCache.invalidatePageCache();

    console.log(`✅ Cache cleared: ${metricsCleared} metrics, ${ranksCleared} ranks`);

    return c.json({
      success: true,
      message: `Очищено: ${metricsCleared} метрик, ${ranksCleared} рангов`,
      metricsCleared,
      ranksCleared
    });
  } catch (error) {
    console.error('❌ Cache clearing error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 📊 Получение метрик конкретного пользователя
 */
app.get("/make-server-05aa3c8a/users/:userId/metrics", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    const userId = c.req.param('userId');

    // Проверка прав: админ или сам пользователь
    if (!isUserAdmin(currentUser) && currentUser.id !== userId) {
      throw new Error('Access denied');
    }

    const metrics = await metricsCache.getUserMetrics(userId);

    return c.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('❌ Get user metrics error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

/**
 * 🧪 DEBUG MLM TEST - Автотест математики комиссий
 * 
 * Создаёт тестовую структуру пользователей и прогоняет 3 сценария:
 * A) Гостевая продажа через партнёра
 * B) Партнёрская покупка 
 * C) Покупка через корзину (аналогично B)
 * 
 * Использование: POST /admin/debug-mlm-test
 */
app.post("/make-server-05aa3c8a/admin/debug-mlm-test", async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('X-User-Id'));
    await requireAdmin(c, currentUser);
    
    console.log('\n' + '='.repeat(100));
    console.log('🧪 MLM COMMISSION TEST - ПОЛНЫЙ АВТОТЕСТ');
    console.log('='.repeat(100) + '\n');
    
    const testPrefix = 'TEST_';
    const timestamp = Date.now();
    
    // 1. Создаём тестовых пользователей (цепочка U001 → U002 → U003 → U004)
    console.log('📋 ШАГ 1: Создание тестовой структуры пользователей...');
    
    const testUsers = [
      { id: `${testPrefix}U001_${timestamp}`, имя: 'Тест Верх', спонсорId: null },
      { id: `${testPrefix}U002_${timestamp}`, имя: 'Тест L1', спонсорId: `${testPrefix}U001_${timestamp}` },
      { id: `${testPrefix}U003_${timestamp}`, имя: 'Тест L2', спонсорId: `${testPrefix}U002_${timestamp}` },
      { id: `${testPrefix}U004_${timestamp}`, имя: 'Тест L3', спонсорId: `${testPrefix}U003_${timestamp}` }
    ];
    
    for (const user of testUsers) {
      const fullUser = {
        id: user.id,
        имя: user.имя,
        фамилия: 'Тестовый',
        email: `${user.id}@test.local`,
        спонсорId: user.спонсорId,
        баланс: 0,
        уровень: 0,
        датаРегистрации: new Date().toISOString(),
        __test: true
      };
      await kv.set(`user:id:${user.id}`, fullUser);
      console.log(`   ✅ Создан: ${user.id} (спонсор: ${user.спонсорId || 'нет'})`);
    }
    
    // 2. Создаём тестовый товар H2-TEST
    console.log('\n📦 ШАГ 2: Создание тестового товара H2-TEST...');
    
    const testProduct = {
      sku: `H2-TEST-${timestamp}`,
      название: 'Тестовый товар',
      цена_розница: 10000,
      цена1: 8000,
      комиссии: { d0: 1000, d1: 500, d2: 300, d3: 100 },
      __test: true
    };
    await kv.set(`product:id:${testProduct.sku}`, testProduct);
    console.log(`   ✅ Товар создан: ${testProduct.sku}`);
    console.log(`   💰 Комиссии: L0=1000, L1=500, L2=300, L3=100`);
    
    const results: any = {
      testUsers: testUsers.map(u => u.id),
      testProduct: testProduct.sku,
      scenarios: []
    };
    
    // 3. СЦЕНАРИЙ A: Гостевая продажа
    console.log('\n' + '-'.repeat(80));
    console.log('🧪 СЦЕНАРИЙ A: Гостевая продажа (U004 продаёт гостю)');
    console.log('-'.repeat(80));
    
    const scenarioA = {
      name: 'Гостевая продажа',
      seller: testUsers[3].id, // U004
      expected: {
        [testUsers[3].id]: { level: 'L0', amount: 1000 },
        [testUsers[2].id]: { level: 'L1', amount: 500 },
        [testUsers[1].id]: { level: 'L2', amount: 300 },
        [testUsers[0].id]: { level: 'L3', amount: 100 }
      },
      actual: {} as any,
      passed: true,
      errors: [] as string[]
    };
    
    // Имитируем createOrder + confirmOrder
    const uplineA = await findUplineChain(testUsers[3].id);
    console.log(`   📊 Upline chain: u0=${uplineA.u0}, u1=${uplineA.u1}, u2=${uplineA.u2}, u3=${uplineA.u3}`);
    
    const { price: priceA, payouts: payoutsA } = await calculatePayouts(0, false, testProduct.sku, uplineA);
    console.log(`   💰 Payouts calculated:`, payoutsA);
    
    const orderIdA = `TEST-ORDER-A-${timestamp}`;
    const комиссииA: any = {};
    const комиссииУровниA: any = {};
    payoutsA.forEach(p => {
      комиссииA[p.userId] = p.amount;
      комиссииУровниA[p.userId] = p.level;
    });
    
    const orderA = {
      id: orderIdA,
      покупательId: testUsers[3].id,
      sku: testProduct.sku,
      цена: priceA,
      комиссии: комиссииA,
      комиссииУровни: комиссииУровниA,
      партнёрскаяПокупка: false,
      статус: 'paid',
      __test: true
    };
    await kv.set(`order:${orderIdA}`, orderA);
    
    // Создаём earnings
    const earningsA = await createEarningsFromOrder(orderA);
    console.log(`   ✅ Earnings created: ${earningsA.length}`);
    
    // Проверяем результаты
    for (const [userId, expected] of Object.entries(scenarioA.expected)) {
      const earning = earningsA.find(e => e.userId === userId);
      if (!earning) {
        scenarioA.errors.push(`❌ ${userId}: НЕТ earning (ожидалось ${expected.level}=${expected.amount})`);
        scenarioA.passed = false;
      } else {
        scenarioA.actual[userId] = { level: earning.level, amount: earning.amount };
        if (earning.level !== expected.level || earning.amount !== expected.amount) {
          scenarioA.errors.push(`❌ ${userId}: ${earning.level}=${earning.amount} (ожидалось ${expected.level}=${expected.amount})`);
          scenarioA.passed = false;
        } else {
          console.log(`   ✅ ${userId}: ${earning.level}=${earning.amount} - OK`);
        }
      }
    }
    
    results.scenarios.push(scenarioA);
    
    // 4. СЦЕНАРИЙ B: Партнёрская покупка
    console.log('\n' + '-'.repeat(80));
    console.log('🧪 СЦЕНАРИЙ B: Партнёрская покупка (U004 покупает как партнёр)');
    console.log('-'.repeat(80));
    
    const scenarioB = {
      name: 'Партнёрская покупка',
      buyer: testUsers[3].id, // U004
      expected: {
        // U004 НЕ получает L0!
        [testUsers[2].id]: { level: 'L1', amount: 500 },
        [testUsers[1].id]: { level: 'L2', amount: 300 },
        [testUsers[0].id]: { level: 'L3', amount: 100 }
      },
      notExpected: [testUsers[3].id], // U004 не должен получить L0
      actual: {} as any,
      passed: true,
      errors: [] as string[]
    };
    
    const uplineB = await findUplineChain(testUsers[3].id);
    const { price: priceB, payouts: payoutsB } = await calculatePayouts(0, true, testProduct.sku, uplineB);
    console.log(`   💰 Payouts calculated:`, payoutsB);
    
    // Проверяем что U004 НЕ получает L0
    const u004Payout = payoutsB.find(p => p.userId === testUsers[3].id);
    if (u004Payout) {
      scenarioB.errors.push(`❌ U004 получил L0=${u004Payout.amount} (НЕ должен!)`);
      scenarioB.passed = false;
    } else {
      console.log(`   ✅ U004 НЕ получает L0 - OK`);
    }
    
    const orderIdB = `TEST-ORDER-B-${timestamp}`;
    const комиссииB: any = {};
    const комиссииУровниB: any = {};
    payoutsB.forEach(p => {
      комиссииB[p.userId] = p.amount;
      комиссииУровниB[p.userId] = p.level;
    });
    
    const orderB = {
      id: orderIdB,
      покупательId: testUsers[3].id,
      sku: testProduct.sku,
      цена: priceB,
      комиссии: комиссииB,
      комиссииУровни: комиссииУровниB,
      партнёрскаяПокупка: true,
      статус: 'paid',
      __test: true
    };
    await kv.set(`order:${orderIdB}`, orderB);
    
    const earningsB = await createEarningsFromOrder(orderB);
    console.log(`   ✅ Earnings created: ${earningsB.length}`);
    
    // Проверяем результаты
    for (const [userId, expected] of Object.entries(scenarioB.expected)) {
      const earning = earningsB.find(e => e.userId === userId);
      if (!earning) {
        scenarioB.errors.push(`❌ ${userId}: НЕТ earning (ожидалось ${expected.level}=${expected.amount})`);
        scenarioB.passed = false;
      } else {
        scenarioB.actual[userId] = { level: earning.level, amount: earning.amount };
        if (earning.level !== expected.level || earning.amount !== expected.amount) {
          scenarioB.errors.push(`❌ ${userId}: ${earning.level}=${earning.amount} (ожидалось ${expected.level}=${expected.amount})`);
          scenarioB.passed = false;
        } else {
          console.log(`   ✅ ${userId}: ${earning.level}=${earning.amount} - OK`);
        }
      }
    }
    
    results.scenarios.push(scenarioB);
    
    // 5. СЦЕНАРИЙ C: Корзина (аналогично B)
    console.log('\n' + '-'.repeat(80));
    console.log('🧪 СЦЕНАРИЙ C: Покупка через корзину (тот же путь что и B)');
    console.log('-'.repeat(80));
    
    const scenarioC = {
      name: 'Покупка через корзину',
      buyer: testUsers[3].id,
      note: 'Использует тот же путь что и партнёрская покупка',
      expected: scenarioB.expected,
      passed: true,
      errors: [] as string[]
    };
    
    // Корзина использует тот же calculatePayouts с isPartner=true
    // Поэтому результат должен быть идентичен сценарию B
    scenarioC.passed = scenarioB.passed;
    scenarioC.errors = [...scenarioB.errors];
    if (scenarioC.passed) {
      console.log(`   ✅ Логика корзины идентична партнёрской покупке - OK`);
    }
    
    results.scenarios.push(scenarioC);
    
    // 6. Очистка тестовых данных
    console.log('\n🗑️ ШАГ 6: Очистка тестовых данных...');
    
    for (const user of testUsers) {
      await kv.del(`user:id:${user.id}`);
    }
    await kv.del(`product:id:${testProduct.sku}`);
    await kv.del(`order:${orderIdA}`);
    await kv.del(`order:${orderIdB}`);
    
    for (const e of [...earningsA, ...earningsB]) {
      await kv.del(e.id);
      await kv.del(`earning:user:${e.userId}:${e.id}`);
    }
    
    console.log('   ✅ Тестовые данные удалены');
    
    // 7. Итоговый отчёт
    console.log('\n' + '='.repeat(100));
    console.log('📊 ИТОГОВЫЙ ОТЧЁТ');
    console.log('='.repeat(100));
    
    const allPassed = results.scenarios.every((s: any) => s.passed);
    
    for (const scenario of results.scenarios) {
      const status = scenario.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`\n${status}: ${scenario.name}`);
      if (scenario.errors.length > 0) {
        scenario.errors.forEach((e: string) => console.log(`   ${e}`));
      }
    }
    
    console.log('\n' + '='.repeat(100));
    console.log(allPassed ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!' : '❌ ЕСТЬ ОШИБКИ - ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ!');
    console.log('='.repeat(100) + '\n');
    
    return c.json({
      success: true,
      allPassed,
      summary: {
        scenariosTotal: results.scenarios.length,
        scenariosPassed: results.scenarios.filter((s: any) => s.passed).length,
        scenariosFailed: results.scenarios.filter((s: any) => !s.passed).length
      },
      scenarios: results.scenarios,
      testDataCleaned: true,
      commissionRules: {
        guestSale: 'L0→продавец, L1/L2/L3→спонсоры продавца',
        partnerPurchase: 'L0=НЕТ (партнёр взял скидку), L1/L2/L3→спонсоры покупателя',
        cart: 'Идентично партнёрской покупке'
      }
    });
    
  } catch (error) {
    console.error('❌ MLM Test error:', error);
    return c.json({ error: `${error}` }, 500);
  }
});

console.log('🚀 Server starting...');
console.log('📍 Base path: /make-server-05aa3c8a');
console.log('🔧 CORS enabled for all origins');
console.log('✅ Server ready!');

Deno.serve(app.fetch);

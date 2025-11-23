import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

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
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

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
    await kv.set(`user:id:${user.id}`, user);
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
         user?.id === '1';
}

// 🔄 ID Reuse Management
// Get next available user ID (reuses freed IDs first)
async function getNextUserId(): Promise<string> {
  const freedIdsKey = 'freed:user:ids';
  let freedIds = await kv.get(freedIdsKey) || [];
  
  // If there are freed IDs, use the smallest one
  if (freedIds.length > 0) {
    freedIds.sort((a: number, b: number) => a - b);
    const reuseId = freedIds.shift();
    await kv.set(freedIdsKey, freedIds);
    console.log(`♻️ Reusing freed user ID: ${reuseId}`);
    return reuseId.toString();
  }
  
  // Otherwise, increment counter
  const counterKey = 'counter:userId';
  let currentCounter = await kv.get(counterKey) || 0;
  const newUserId = (currentCounter + 1).toString();
  await kv.set(counterKey, currentCounter + 1);
  console.log(`🆕 Generated new user ID: ${newUserId}`);
  return newUserId;
}

// Get next available partner ID (reuses freed IDs first, 3-digit format)
async function getNextPartnerId(): Promise<string> {
  const freedIdsKey = 'freed:partner:ids';
  let freedIds = await kv.get(freedIdsKey) || [];
  
  // If there are freed IDs, use the smallest one
  if (freedIds.length > 0) {
    freedIds.sort((a: number, b: number) => a - b);
    const reuseId = freedIds.shift();
    await kv.set(freedIdsKey, freedIds);
    const partnerId = reuseId.toString().padStart(3, '0');
    console.log(`♻️ Reusing freed partner ID: ${partnerId}`);
    return partnerId;
  }
  
  // Otherwise, increment counter
  const counterKey = 'system:partnerCounter';
  let currentCounter = await kv.get(counterKey) || 0;
  const newPartnerNumber = currentCounter + 1;
  const partnerId = newPartnerNumber.toString().padStart(3, '0');
  await kv.set(counterKey, newPartnerNumber);
  console.log(`🆕 Generated new partner ID: ${partnerId}`);
  return partnerId;
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

// Calculate MLM payouts
async function calculatePayouts(price: number, isPartner: boolean, sku: string, upline: any) {
  const payouts: any[] = [];
  
  // 🆕 Получаем товар из базы данных
  const products = await kv.getByPrefix('product:');
  const product = products.find((p: any) => p.sku === sku);
  
  if (!product) {
    // Fallback to hardcoded products for backward compatibility
    const productConfig: any = {
      'H2-1': {
        retail: 6500,
        partner: 4900,
        d0: 1600,
        d1: 1500,
        d2: 900,
        d3: 600
      },
      'H2-3': {
        retail: 18000,
        partner: 13500,
        d0: 4500,
        d1: 4000,
        d2: 2500,
        d3: 1500
      }
    };
    
    const config = productConfig[sku];
    if (!config) {
      throw new Error(`Unknown product SKU: ${sku}`);
    }
    
    const actualPrice = isPartner ? config.partner : config.retail;
    
    if (!isPartner) {
      // Guest purchase - L0 gets d0
      if (upline.u0) {
        payouts.push({
          userId: upline.u0,
          amount: config.d0,
          level: 'L0'
        });
      }
    } else {
      // Partner purchase - distribute d1, d2, d3 to upline
      if (upline.u1) {
        payouts.push({
          userId: upline.u1,
          amount: config.d1,
          level: 'L1'
        });
      }
      if (upline.u2) {
        payouts.push({
          userId: upline.u2,
          amount: config.d2,
          level: 'L2'
        });
      }
      if (upline.u3) {
        payouts.push({
          userId: upline.u3,
          amount: config.d3,
          level: 'L3'
        });
      }
    }
    
    return { price: actualPrice, payouts };
  }
  
  // 🆕 Получаем цены и комиссии из товара
  const retailPrice = Number(product.цена_розница || product.розничнаяЦена || 0);
  const partnerPrice = Number(product.цена1 || product.партнёрскаяЦена || 0);
  
  // Получаем комиссии из товара или используем дефолтные
  const commissions = product.комиссии || {
    d0: 1600,
    d1: 1500,
    d2: 900,
    d3: 600
  };
  
  const actualPrice = isPartner ? partnerPrice : retailPrice;
  
  if (!isPartner) {
    // Guest purchase - L0 gets d0
    if (upline.u0) {
      payouts.push({
        userId: upline.u0,
        amount: commissions.d0 || 0,
        level: 'L0'
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
  return c.json({ status: "ok" });
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
        уровень: isFirstUser ? 3 : 1, // CEO gets level 3, others start at 1
        рефКод: `REF${Date.now().toString().slice(-6)}`,
        спонсорId: null,
        баланс: 0,
        зарегистрирован: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isAdmin: isFirstUser, // CEO is admin
        type: isFirstUser ? 'admin' : 'user',
        role: isFirstUser ? 'ceo' : null
      };
      
      await kv.set(userKey, user);
      console.log(`New user registered: ${user.имя} (admin: ${isFirstUser})`);
    } else {
      // Update last login
      user.lastLogin = new Date().toISOString();
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
      уровень: 1, // Новые партнёры начинают с уровня 1
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
    
    console.log(`Login attempt for: ${login}`);
    
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
          console.log(`Login failed: Email ${login} not found`);
          return c.json({ error: "Email не найден" }, 401);
        }
        
        // Получаем полные данные пользователя
        const userKey = `user:id:${userEmailData.id}`;
        userData = await kv.get(userKey);
        userEmail = login.trim();
      }
    }
    
    if (!userData) {
      return c.json({ error: "Ошибка получения данных пользователя" }, 500);
    }
    
    // Create a Supabase client with anon key for sign in
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Sign in with Supabase Auth using email
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
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
        return c.json({ 
          error: "Неверный пароль или пользователь не найден в Supabase Auth. Проверьте пароль или зарегистрируйтесь заново.",
          details: authError.message 
        }, 401);
      }
      
      if (authError.message.includes('Email not confirmed')) {
        return c.json({ 
          error: "Email не подтверждён. Проверьте почту или обратитесь к администратору.",
          details: authError.message 
        }, 401);
      }
      
      return c.json({ 
        error: `Ошибка авторизации: ${authError.message}`,
        details: authError.message 
      }, 401);
    }
    
    if (!authData.session || !authData.user) {
      return c.json({ error: "Неверные учетные данные" }, 401);
    }
    
    // Update last login
    userData.lastLogin = new Date().toISOString();
    
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
      access_token: authData.session.access_token
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
      уровень: 1, // New partners start at level 1
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
        уровень: 1, // Новые партнёры начинают с уровня 1
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
        уровень: 1, // Новые партнёры начинают с уровня 1
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
    const allowedFields = ['имя', 'телефон', 'telegram', 'instagram', 'vk', 'facebook', 'аватарка'];
    
    // Обновляем только разрешённые поля
    const updates: any = {};
    for (const field of allowedFields) {
      if (profileData.hasOwnProperty(field)) {
        updates[field] = profileData[field];
      }
    }
    
    console.log('📝 Profile updates to apply:', updates);
    
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
    console.log('📋 Social media fields:', {
      telegram: updatedUser.telegram,
      instagram: updatedUser.instagram,
      vk: updatedUser.vk,
      facebook: updatedUser.facebook
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
    
    // Free the ID for reuse
    if (userId.length === 3 && /^\d+$/.test(userId)) {
      await freePartnerId(userId);
    } else {
      await freeUserId(userId);
    }
    
    console.log(`✅ User ${userId} self-deleted and ID freed for reuse`);
    
    return c.json({ 
      success: true, 
      message: 'Ваш аккаунт удалён. Ваш ID будет доступен для новых пользователей.' 
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
    const userData = await kv.get(`user:id:${userId}`);
    
    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }
    
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
    
    const userData = await kv.get(`user:id:${userId}`);
    
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
      уровень: userData.уровень || 1,
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
      socialMedia.whatsapp = userData.телефон || ''; // используем телефон для WhatsApp
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
    
    // Get all users
    const allUsers = await kv.getByPrefix('user:id:');
    const allUsersArray = Array.isArray(allUsers) ? allUsers : [];
    
    // Получаем данные текущего пользователя для рефкода
    const currentUser = allUsersArray.find((u: any) => u.id === userId);
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
      
      // Найти всех прямых партнёров
      const directPartners = allUsersArray.filter((u: any) => 
        u.спонсорId === sponsorId && u.id !== sponsorId
      );
      
      // Для каждого партнёра добавляем глубину и пригласительный код
      const partnersWithDepth = directPartners.map((partner: any) => {
        return {
          ...partner,
          глубина: depth,
          пригласительКод: sponsorRefCode
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
    const { sku, isPartner, quantity = 1 } = await c.req.json();
    
    console.log(`📦 Creating order: SKU=${sku}, isPartner=${isPartner}, quantity=${quantity}`);
    
    if (!sku) {
      return c.json({ error: "SKU is required" }, 400);
    }
    
    // Валидация SKU
    if (!sku || sku.length < 2) {
      console.error(`❌ Invalid SKU: "${sku}"`);
      return c.json({ error: `Invalid SKU format: "${sku}"` }, 400);
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
    const order = {
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
    
    // Process payouts from комиссии
    if (order.комиссии) {
      for (const [userId, amount] of Object.entries(order.комиссии)) {
        if (amount > 0) {
          // Update user balance
          const user = await kv.get(`user:id:${userId}`);
          if (user) {
            user.баланс = (user.баланс || 0) + amount;
            await kv.set(`user:id:${userId}`, user);
            
            if (user.telegramId) {
              await kv.set(`user:tg:${user.telegramId}`, user);
            }
            
            // Create earning record
            const earningId = `earning:${Date.now()}-${userId}`;
            const earning = {
              id: earningId,
              userId: userId,
              orderId: orderId,
              amount: amount,
              level: order.комиссииУровни?.[userId] || 'L0',
              fromUserId: order.покупательId,
              createdAt: new Date().toISOString()
            };
            await kv.set(earningId, earning);
            await kv.set(`earning:user:${userId}:${earningId}`, earning);
            
            console.log(`Payout processed: ${amount} to ${user.имя} (${order.комиссииУровни?.[userId] || 'L0'})`);
          }
        }
      }
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
            
            // Process payouts from комиссии
            if (confirmOrder.комиссии) {
              for (const [userId, amount] of Object.entries(confirmOrder.комиссии)) {
                if (amount > 0) {
                  const user = await kv.get(`user:id:${userId}`);
                  if (user) {
                    user.баланс = (user.баланс || 0) + amount;
                    await kv.set(`user:id:${userId}`, user);
                    
                    if (user.telegramId) {
                      await kv.set(`user:tg:${user.telegramId}`, user);
                    }
                    
                    const earningId = `earning:${Date.now()}-${userId}`;
                    const earning = {
                      id: earningId,
                      userId: userId,
                      orderId: orderId,
                      amount: amount,
                      level: confirmOrder.комиссииУровни?.[userId] || 'L0',
                      fromUserId: confirmOrder.покупательId,
                      createdAt: new Date().toISOString()
                    };
                    await kv.set(earningId, earning);
                    await kv.set(`earning:user:${userId}:${earningId}`, earning);
                  }
                }
              }
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
        message: 'Демо-оплата будет подтверждена автоматически через 2 секунды'
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
        await kv.set(`order:user:${order.продавецId}:${orderId}`, order);
        
        // Process payouts
        for (const payout of order.выплаты) {
          const user = await kv.get(`user:id:${payout.userId}`);
          if (user) {
            user.баланс = (user.баланс || 0) + payout.amount;
            await kv.set(`user:id:${payout.userId}`, user);
            
            if (user.telegramId) {
              await kv.set(`user:tg:${user.telegramId}`, user);
            }
            
            const earningId = `earning:${Date.now()}-${payout.userId}`;
            const earning = {
              id: earningId,
              userId: payout.userId,
              orderId: orderId,
              amount: payout.amount,
              level: payout.level,
              fromUserId: order.продавецId,
              createdAt: new Date().toISOString()
            };
            await kv.set(earningId, earning);
            await kv.set(`earning:user:${payout.userId}:${earningId}`, earning);
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
    
    const stats = {
      totalUsers: allUsers.length,
      totalOrders: allOrders.filter((o: any) => o.id && o.продавецId).length,
      totalRevenue: allOrders.filter((o: any) => o.статус === 'paid').reduce((sum: number, o: any) => sum + (o.цена || 0), 0),
      pendingWithdrawals: allWithdrawals.filter((w: any) => w.status === 'pending').length
    };
    
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
    
    const users = await kv.getByPrefix('user:id:');
    const userArray = Array.isArray(users) ? users : [];
    
    return c.json({ success: true, users: userArray });
  } catch (error) {
    console.log(`Admin get users error: ${error}`);
    return c.json({ 
      success: false, 
      error: `${error}`,
      users: []
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
    
    // Free the ID for reuse
    // Determine if it's a 3-digit partner ID or regular ID
    if (userId.length === 3 && /^\d+$/.test(userId)) {
      await freePartnerId(userId);
    } else {
      await freeUserId(userId);
    }
    
    console.log(`✅ User ${userId} deleted and ID freed for reuse`);
    
    return c.json({ success: true, message: 'Пользователь удалён, ID освобождён для повторного использования' });
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
    const requestorAdmin = allAdmins.find((a: any) => a.supabaseId === user.id);
    
    if (!requestorAdmin || requestorAdmin.role !== 'ceo') {
      return c.json({ error: "Только CEO может просматривать список админов" }, 403);
    }
    
    console.log(`✅ CEO ${requestorAdmin.id} requested admins list`);
    
    return c.json({
      success: true,
      admins: allAdmins
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
    // Если ошибка авторизации, возвращаем пустой массив вместо 500
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
      achievements
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    return c.json({ 
      success: false,
      error: `Failed to get achievements: ${error}`,
      achievements: []
    }, 500);
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
    return c.json({ 
      success: false,
      error: `Failed to get challenges: ${error}`,
      challenges: []
    }, 500);
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
    return c.json({ 
      success: false,
      error: `Failed to get leaderboard: ${error}`,
      leaderboard: []
    }, 500);
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
    
    console.log(`✅ User deleted: ${userId}`);
    
    return c.json({ 
      success: true, 
      message: `User ${userId} deleted successfully`,
      deletedUser: {
        id: userId,
        email: user.email,
        name: `${user.имя} ${user.фамилия || ''}`
      }
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get current counter value (admin only)
app.get("/make-server-05aa3c8a/admin/counter", async (c) => {
  try {
    const currentUser = c.get('currentUser');
    
    if (!currentUser) {
      return c.json({ error: "Not authenticated" }, 401);
    }
    
    await requireAdmin(c, currentUser);
    
    const counterKey = 'system:partnerCounter';
    const currentCounter = await kv.get(counterKey);
    const nextId = ((currentCounter || 0) + 1).toString().padStart(3, '0');
    
    return c.json({ 
      success: true,
      currentValue: currentCounter || 0,
      nextId: nextId
    });
    
  } catch (error) {
    console.error('Get counter error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Reset user counter (admin only)
app.post("/make-server-05aa3c8a/admin/reset-counter", async (c) => {
  try {
    const currentUser = c.get('currentUser');
    
    if (!currentUser) {
      return c.json({ error: "Not authenticated" }, 401);
    }
    
    await requireAdmin(c, currentUser);
    
    const counterKey = 'system:partnerCounter';
    
    // Get current counter value
    const currentCounter = await kv.get(counterKey);
    console.log(`Current counter value: ${currentCounter}`);
    
    // Reset to 0
    await kv.set(counterKey, 0);
    console.log('✅ Counter reset to 0. Next user will be 001');
    
    return c.json({ 
      success: true, 
      message: 'Счётчик пользователей сброшен. Следующий ID будет 001',
      oldValue: currentCounter,
      newValue: 0
    });
    
  } catch (error) {
    console.error('Reset counter error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);

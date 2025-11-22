// 🎭 DEMO API - Эмуляция API для демо режима
import { loadDemoDataFromStorage, saveDemoDataToStorage } from './demoData';

// Имитация задержки сети
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Проверка демо режима
export function isDemoMode(): boolean {
  const demoData = loadDemoDataFromStorage();
  return demoData !== null;
}

// 🆕 Управление текущим демо-пользователем
const DEMO_CURRENT_USER_KEY = 'demo_view_as_user_id'; // 🆕 Синхронизировано с DemoUserContext

/**
 * Получить ID текущего демо-пользователя
 */
export function getCurrentDemoUserId(): string | null {
  return localStorage.getItem(DEMO_CURRENT_USER_KEY);
}

/**
 * Установить текущего демо-пользователя
 */
export function setCurrentDemoUser(userId: string): void {
  console.log('🎭 Switching demo user to:', userId);
  localStorage.setItem(DEMO_CURRENT_USER_KEY, userId);
}

/**
 * Получить объект текущего демо-пользователя
 */
export function getCurrentDemoUser(): any {
  const data = loadDemoDataFromStorage();
  if (!data) return null;
  
  const currentUserId = getCurrentDemoUserId();
  
  // Есл ID не становлен, используем DEMO_USER (админ)
  if (!currentUserId) {
    const mainUser = data.users.find((u: any) => u.id === 'DEMO_USER');
    if (mainUser) {
      setCurrentDemoUser(mainUser.id);
      return mainUser;
    }
  }
  
  // Ищем пользователя по ID
  const user = data.users.find((u: any) => u.id === currentUserId);
  
  // Если пользователь не найден, возвращаем админа
  if (!user) {
    const mainUser = data.users.find((u: any) => u.id === 'DEMO_USER');
    if (mainUser) {
      setCurrentDemoUser(mainUser.id);
      return mainUser;
    }
  }
  
  return user;
}

/**
 * Получить список всех демо-пользователей для селектора
 */
export function getDemoUsersList(): Array<{
  id: string;
  label: string;
  level: string;
  depth: number;
}> {
  const data = loadDemoDataFromStorage();
  if (!data) return [];
  
  // Строим иерархический список (сначала родитель, потом дети в порядке дерева)
  const result: Array<{
    id: string;
    label: string;
    level: string;
    depth: number;
  }> = [];
  
  // Рекурсивная функция для обхода дерева
  function addUserAndChildren(parentRefCode: string | null, depth: number) {
    // Нхим всех пользователей, чей родитель - parentRefCode
    const children = data.users.filter((u: any) => {
      if (depth === 0) {
        // Для корня (L0) ищем пользователя без родителя или с пригласительКод === null
        return u.глубина === 0 || u.id === 'DEMO_USER';
      } else {
        // Для остальных ищем тех, кто был приглашён по parentRefCode
        return u.пригласительКод === parentRefCode;
      }
    });
    
    // Добавляем каждого ребенка и рекурсивно его детей
    children.forEach((u: any) => {
      // Пропускаем если глубина больше 3
      if (u.глубина > 3) return;
      
      let levelLabel = '';
      if (u.id === 'DEMO_USER' || u.глубина === 0) {
        levelLabel = 'L0 (Вы)';
      } else if (u.глубина === 1) {
        levelLabel = 'L1 (1-я линия)';
      } else if (u.глубина === 2) {
        levelLabel = 'L2 (2-я линия)';
      } else if (u.глубина === 3) {
        levelLabel = 'L3 (3-я линия)';
      }
      
      const userName = u.имя || 'User';
      const userSurname = u.фамилия || '';
      
      result.push({
        id: u.id,
        label: `${userName} ${userSurname}`,
        level: levelLabel,
        depth: u.глубина
      });
      
      // Рекурсивно добавляем детей этого пользователя
      addUserAndChildren(u.рефКод, u.глубина + 1);
    });
  }
  
  // Начинаем с корня (L0)
  addUserAndChildren(null, 0);
  
  return result;
}

// Получение демо данных
function getDemoData() {
  const data = loadDemoDataFromStorage();
  if (!data) {
    throw new Error('Demo data not found. Please enter demo mode first.');
  }
  return data;
}

// ============= USERS =============

export async function demoGetCurrentUser() {
  await delay(300);
  // 🆕 Используем текущего выбранного демо-пользователя
  const currentUser = getCurrentDemoUser();
  
  if (!currentUser) {
    return {
      success: false,
      error: 'Demo user not found'
    };
  }
  
  return {
    success: true,
    user: currentUser
  };
}

export async function demoUpdateProfile(profileData: any) {
  await delay(400);
  const data = getDemoData();
  
  // Обновляем текущего пользователя
  const updatedUser = {
    ...data.currentUser,
    ...profileData
  };
  
  // Сохраняем в localStorage
  data.currentUser = updatedUser;
  saveDemoDataToStorage(data);
  
  return {
    success: true,
    user: updatedUser
  };
}

export async function demoGetAllUsers() {
  await delay(400);
  const data = getDemoData();
  return {
    success: true,
    users: data.users
  };
}

export async function demoGetUserTeam(userId: string) {
  await delay(350);
  const data = getDemoData();
  
  // Найти всех кто в команде этого пользователя (рекурсивно)
  const user = data.users.find((u: any) => u.id === userId);
  if (!user) {
    return { success: false, team: [] };
  }
  
  const team: any[] = [];
  
  // Функция для поиска всех партнёров в структуре (максимум 3 уровня глубины)
  function findTeamMembers(refCode: string, level: number = 1) {
    // Ограничиваем глубину до 3 уровней
    if (level > 3) return;
    
    const directPartners = data.users.filter((u: any) => u.пригласительКод === refCode);
    
    for (const partner of directPartners) {
      team.push({
        ...partner,
        глубина: level
      });
      
      // Рекурсивно ищем их команду (если ещё не достигли лимита)
      findTeamMembers(partner.рефКод, level + 1);
    }
  }
  
  findTeamMembers(user.рефКод);
  
  return {
    success: true,
    team
  };
}

export async function demoGetUserProfile(userId: string) {
  await delay(300);
  const data = getDemoData();
  
  // Найти пользователя
  const user = data.users.find((u: any) => u.id === userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  // Подсчитать статистику команды
  const team: any[] = [];
  function findTeamMembers(refCode: string, level: number = 1) {
    if (level > 3) return;
    const directPartners = data.users.filter((u: any) => u.пригласительКод === refCode);
    for (const partner of directPartners) {
      team.push(partner);
      findTeamMembers(partner.рефКод, level + 1);
    }
  }
  findTeamMembers(user.рефКод);
  
  // Подсчитать общий доход
  const userEarnings = data.earnings?.filter((e: any) => e.userId === userId) || [];
  const totalEarnings = userEarnings.reduce((sum: number, e: any) => sum + (e.сумма || e.amount || 0), 0);
  
  // Вернуть публичный профиль с учётом настроек приватности
  const privacy = user.privacySettings || {};
  const socialMedia = user.socialMedia || {};
  
  return {
    success: true,
    user: {
      id: user.id,
      имя: user.имя,
      фамилия: user.фамилия || '',
      уровень: user.уровень,
      рефКод: user.рефКод,
      телефон: privacy.showPhone !== false ? user.телефон : null,
      email: privacy.showEmail !== false ? user.email : null,
      баланс: privacy.showBalance !== false ? user.баланс : null,
      totalEarnings: privacy.showEarnings !== false ? totalEarnings : null,
      teamSize: team.length,
      socialMedia: {
        telegram: privacy.showTelegram !== false ? socialMedia.telegram : null,
        whatsapp: privacy.showWhatsapp !== false ? socialMedia.whatsapp : null,
        instagram: privacy.showInstagram !== false ? socialMedia.instagram : null,
        vk: privacy.showVk !== false ? socialMedia.vk : null,
      },
      privacySettings: privacy
    }
  };
}

export async function demoUpdateUserProfile(profileData: any) {
  await delay(300);
  const data = getDemoData();
  
  // Получаем текущего пользователя
  const currentUserId = getCurrentDemoUserId();
  if (!currentUserId) {
    return { success: false, error: 'Not authenticated' };
  }
  
  // Найти пользователя
  const userIndex = data.users.findIndex((u: any) => u.id === currentUserId);
  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }
  
  // Обновить данные пользователя
  data.users[userIndex] = {
    ...data.users[userIndex],
    ...profileData,
    socialMedia: {
      ...data.users[userIndex].socialMedia,
      ...profileData.socialMedia
    },
    privacySettings: {
      ...data.users[userIndex].privacySettings,
      ...profileData.privacySettings
    }
  };
  
  saveDemoDataToStorage(data);
  
  return {
    success: true,
    user: data.users[userIndex]
  };
}

// ============= ORDERS =============

export async function demoGetOrders() {
  await delay(400);
  const data = getDemoData();
  
  // 🆕 Получаем текущего демо-пользователя
  const currentUserId = getCurrentDemoUserId();
  
  // Если нет currentUserId, возвращаем пустой массив
  if (!currentUserId) {
    return {
      success: true,
      orders: []
    };
  }
  
  // 🆕 Фильтруем заказы только для текущего пользователя
  const userOrders = data.orders.filter((o: any) => o.userId === currentUserId);
  console.log(`📦 demoGetOrders: Filtered ${userOrders.length} orders for user ${currentUserId}`);
  
  return {
    success: true,
    orders: userOrders
  };
}

export async function demoGetUserOrders(userId: string) {
  await delay(350);
  const data = getDemoData();
  
  const userOrders = data.orders.filter((o: any) => o.userId === userId);
  
  return {
    success: true,
    orders: userOrders
  };
}

export async function demoCreateOrder(orderData: any) {
  await delay(500);
  
  // Валидация SKU
  const { sku } = orderData;
  if (!sku || sku.length < 2) {
    console.error('❌ Demo: Invalid SKU:', sku);
    throw new Error(`Некорректный SKU товара: \"${sku}\". Очистите корзину в настройках.`);
  }
  
  // Проверяем существоване товара в демо данных
  const data = getDemoData();
  const product = data.products.find((p: any) => p.sku === sku);
  
  if (!product) {
    console.error('❌ Demo: Product not found for SKU:', sku);
    throw new Error(`Товар с SKU \"${sku}\" не найден. Очистите корзину в настройках.`);
  }
  
  // 🆕 Получам текущего пользователя из контекста
  const currentUser = getCurrentDemoUser();
  if (!currentUser) {
    throw new Error('Пользователь не найден');
  }
  
  console.log('🛒 Creating demo order:', {
    product: product.название,
    sku: sku,
    buyer: `${currentUser.имя} ${currentUser.фамилия}`,
    buyerId: currentUser.id,
    isPartner: orderData.isPartner,
    quantity: orderData.quantity || 1
  });
  
  // 🆕 Импортируем функции MLM для расчета комиссий
  const { calcOrder, findUpline } = await import('./mlm');
  
  // 🆕 Находим цепочку спонсоров
  // ВАЖНО: для гостевых покупок (isPartner=false) берём upline продавца (currentUser),
  // для партнёрских покупок (isPartner=true) берём upline покупателя (currentUser)
  const upline = findUpline(currentUser.id, data.users);
  console.log('📊 Upline chain:', upline);
  console.log('📊 Order type:', orderData.isPartner ? 'Partner purchase' : 'Guest purchase (retail sale)');
  
  // 🆕 ВАЖНОЕ ЛОГИРОВАНИЕ: проверяем что передается в calcOrder
  console.log('🔍 ========== CHECKING PRODUCT COMMISSION ==========');
  console.log('🔍 Product object:', product);
  console.log('🔍 Product.commission:', product.commission);
  console.log('🔍 Product.retail_price:', product.retail_price);
  console.log('🔍 Product.partner_price:', product.partner_price);
  console.log('🔍 Product.sku:', product.sku);
  console.log('🔍 ==================================================');
  
  // 🆕 Рассчитываем цену и комиссии через правильную функцию
  const orderCalc = calcOrder({
    isPartner: orderData.isPartner,
    sku: product.sku,
    // Для гостей: referrerId = текущий поьзователь (продавец), upline = его спонсоры
    // Для партнёров: referrerId = undefined, upline = спонсоры покупателя
    referrerId: orderData.isPartner ? undefined : currentUser.id,
    u1: upline.u1,
    u2: upline.u2,
    u3: upline.u3,
    product // Передаем продукт с комиссиями
  });
  
  const цена = orderCalc.price;
  const количество = orderData.quantity || 1;
  const общаяСумма = цена * количество;
  
  console.log('💰 Order calculation:', {
    price: цена,
    quantity: количество,
    total: общаяСумма,
    payouts: orderCalc.payouts,
    payouts_sum: orderCalc.payouts.reduce((sum, p) => sum + p.amount, 0)
  });
  
  // 🆕 Агрегируем payouts по level и умножаем на количество
  const payoutsByLevel = orderCalc.payouts.reduce((acc: Record<string, number>, p) => {
    acc[p.level] = (acc[p.level] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);
  
  // 🆕 Считаем реальные суммы выпат с учётом количества
  const d0 = (payoutsByLevel['L0'] || 0) * количество;
  const d1 = (payoutsByLevel['L1'] || 0) * количество;
  const d2 = (payoutsByLevel['L2'] || 0) * количество;
  const d3 = (payoutsByLevel['L3'] || 0) * количество;
  const d4 = (payoutsByLevel['L4'] || 0) * количество;
  const d5 = (payoutsByLevel['L5'] || 0) * количество;
  
  console.log('💰 Commission totals (with quantity):', {
    quantity: количество,
    d0, d1, d2, d3, d4, d5,
    total_commission: d0 + d1 + d2 + d3 + d4 + d5
  });
  
  // 🆕 Создаём заказ с правильными данными
  const newOrder = {
    id: `order_demo_${Date.now()}`,
    userId: currentUser.id, // 🆕 buyerUserId - кто окупает
    buyerUserId: currentUser.id, // 🆕 Явно указываем покупателя
    имяПокупателя: `${currentUser.имя} ${currentUser.фамилия}`,
    товар: product.название,
    товарId: product.id,
    sku: sku,
    количество,
    цена,
    общаяСумма,
    суммаЗаказа: общаяСумма, // 🆕 Алиас для совместимости с UI
    типПокупателя: orderData.isPartner ? 'partner' : 'guest',
    статус: 'completed', // 🆕 Сразу completed для демо
    датаЗаказа: new Date().toISOString(),
    датаОбновления: new Date().toISOString(),
    // 🆕 Сохраняем расчитанные комиссии (оригинальные payouts за 1 единицу)
    payouts: orderCalc.payouts,
    // 🆕 d0-d5 теперь содержат РЕАЛЬНЫЕ суммы начислений с учётом количества
    d0,
    d1,
    d2,
    d3,
    d4,
    d5
  };
  
  // Добавляем заказ в массив
  data.orders.unshift(newOrder); // 🆕 Добавляем в начало (новые сначала)
  
  // ✅ НАЧИСЛЯЕМ КОМИССИИ через правильную функцию
  await processOrderCommissions(data, newOrder);
  
  // Сохраняем данные
  saveDemoDataToStorage(data);
  
  console.log('✅ Demo order created:', newOrder);
  console.log('✅ Balances and earnings updated');
  console.log('📊 Final summary:', {
    order_id: newOrder.id,
    total_price: общаяСумма,
    payouts_count: orderCalc.payouts.length,
    total_commission: orderCalc.payouts.reduce((sum, p) => sum + p.amount * количество, 0)
  });
  
  return {
    success: true,
    message: 'Заказ создан в демо-реие',
    order: newOrder
  };
}

// ============= EARNINGS =============

export async function demoGetEarnings() {
  await delay(400);
  const data = getDemoData();
  
  // 🆕 Получаем текущего демо-пользователя
  const currentUserId = getCurrentDemoUserId();
  
  // Если нет currentUserId, возвращаем пустой массив
  if (!currentUserId) {
    return {
      success: true,
      earnings: []
    };
  }
  
  // 🆕 Фильтруем earnings только для текщего пользователя
  const userEarnings = data.earnings.filter((e: any) => e.userId === currentUserId);
  console.log(`💰 demoGetEarnings: Filtered ${userEarnings.length} earnings for user ${currentUserId}`);
  
  return {
    success: true,
    earnings: userEarnings
  };
}

export async function demoGetUserEarnings(userId: string) {
  await delay(350);
  const data = getDemoData();
  
  const userEarnings = data.earnings.filter((e: any) => e.userId === userId);
  
  return {
    success: true,
    earnings: userEarnings
  };
}

// ============= PRODUCTS =============

export async function demoGetProducts() {
  await delay(300);
  const data = getDemoData();
  
  // Если products есть в демо-данных, используем их
  if (data.products && data.products.length > 0) {
    console.log('📦 Loading products from localStorage:', data.products.length, 'items');
    
    //  Фильтруе  исправляем некорректные SKU
    const validProducts = data.products.filter((p: any) => {
      if (!p.sku || p.sku.length < 2) {
        console.warn('⚠️ Skipping product with invalid SKU:', p.sku, 'Name:', p.название);
        return false;
      }
      return true;
    });
    
    if (validProducts.length !== data.products.length) {
      const removedCount = data.products.length - validProducts.length;
      console.log('🔧 Filtered out', removedCount, 'products with invalid SKU');
      console.log('💡 TIP: If you see errors with SKU, clear localStorage and refresh:');
      console.log('   localStorage.clear(); location.reload();');
      
      // Сохраняем очщенный список обратно
      data.products = validProducts;
      saveDemoDataToStorage(data);
    }
    
    return {
      success: true,
      products: validProducts
    };
  }
  
  // Иначе генерируе деолтные
  console.log('⚠️ No products in localStorage, generating defaults');
  const { generateCatalogProducts } = await import('./demoData');
  const catalogProducts = generateCatalogProducts();
  
  return {
    success: true,
    products: catalogProducts
  };
}

export async function demoCreateProduct(productData: any) {
  await delay(500);
  console.log('🎭 Demo: Creating product...', productData);
  const data = getDemoData();
  console.log('📦 Current products count:', data.products?.length || 0);
  
  // Инициализируем products если его нет
  if (!data.products) {
    console.log('⚠️ Products array not found, initializing...');
    data.products = [];
  }
  
  // 🆕 Логируем получение commission
  console.log('💰 Product commission received:', productData.commission);
  console.log('💰 Product retail_price:', productData.retail_price);
  console.log('💰 Product partner_price:', productData.partner_price);
  
  // Создаём новый товар
  const newProduct = {
    id: Date.now(),
    sku: productData.sku || `PROD-${Date.now()}`,
    название: productData.название,
    описание: productData.описание || '',
    полноеОписание: productData.полноеОписание || productData.описание || '',
    цена_розница: Number(productData.цена_розница) || 0,
    цена1: Number(productData.цена1) || 0,
    цена2: Number(productData.цена2) || 0,
    цена3: Number(productData.цена3) || 0,
    цена4: Number(productData.цена4) || 0,
    партнёрскаяЦена: Number(productData.цена1) || 0,
    розничнаяЦена: Number(productData.цена_розница) || 0,
    // 🆕 ВАЖНО! Сохраняем commission, retail_price, partner_price
    commission: productData.commission || null,
    retail_price: Number(productData.retail_price) || Number(productData.цена_розница) || 0,
    partner_price: Number(productData.partner_price) || Number(productData.цена1) || 0,
    категория: productData.категория || 'general',
    популярность: 0,
    вНаличии: productData.активен !== false,
    активен: productData.активен !== false,
    изображение: productData.изображение || 'https://images.unsplash.com/photo-1556229010-aa9e376e8b58?w=400&h=400&fit=crop',
    характеристики: productData.характеристики || []
  };
  
  console.log('✅ New product commission saved:', newProduct.commission);
  
  // Добавляем в начало списка
  data.products.unshift(newProduct);
  
  // Сохраняем обратно
  saveDemoDataToStorage(data);
  
  console.log('✅ Demo product created:', newProduct);
  console.log('📦 New products count:', data.products.length);
  
  return {
    success: true,
    message: 'Товар создан (демо)',
    product: newProduct
  };
}

export async function demoUpdateProduct(productId: number, productData: any) {
  await delay(400);
  console.log('🎭 Demo: Updating product...', productId, productData);
  const data = getDemoData();
  console.log('📦 Current products count:', data.products?.length || 0);
  
  // Проверяем что products есть
  if (!data.products || !Array.isArray(data.products)) {
    console.error('❌ Products array not found!');
    return {
      success: false,
      message: 'Ошибка: товары не найдены'
    };
  }
  
  // 🆕 Логируем получение commission
  console.log('💰 Product commission received:', productData.commission);
  console.log('💰 Product retail_price:', productData.retail_price);
  console.log('💰 Product partner_price:', productData.partner_price);
  
  // Находим товар в products (это каталог)
  const productIndex = data.products.findIndex((p: any) => p.id === productId);
  
  if (productIndex !== -1) {
    // Преобразуем строки в числа для цен
    const цена_розница = Number(productData.цена_розница) || data.products[productIndex].цена_розница;
    const цена1 = Number(productData.цена1) || data.products[productIndex].цена1;
    const цена2 = Number(productData.цена2) || data.products[productIndex].цена2;
    const цена3 = Number(productData.цена3) || data.products[productIndex].цена3;
    const цена4 = Number(productData.цена4) || data.products[productIndex].цена4 || 0;
    
    // Обновляем товар
    data.products[productIndex] = {
      ...data.products[productIndex],
      ...productData,
      цена_розница,
      цена1,
      цена2,
      цена3,
      цена4,
      партнёрскаяЦена: цена1,
      розничнаяЦена: цена_розница,
      // 🆕 ВАЖНО! Сохраняем commission, retail_price, partner_price
      commission: productData.commission || data.products[productIndex].commission || null,
      retail_price: Number(productData.retail_price) || цена_розница,
      partner_price: Number(productData.partner_price) || цена1,
    };
    
    console.log('✅ Updated product commission saved:', data.products[productIndex].commission);
    
    // Сохраняем обратно
    saveDemoDataToStorage(data);
    
    console.log('✅ Demo product updated:', data.products[productIndex]);
    
    return {
      success: true,
      message: 'Товар обновлён (демо)',
      product: data.products[productIndex]
    };
  }
  
  return {
    success: false,
    message: 'Товар не найден'
  };
}

export async function demoDeleteProduct(productId: number) {
  await delay(400);
  console.log('🎭 Demo: Deleting product...', productId);
  const data = getDemoData();
  console.log('📦 Current products count:', data.products?.length || 0);
  
  // Проверяем что products есть
  if (!data.products || !Array.isArray(data.products)) {
    console.error('❌ Products array not found!');
    return {
      success: false,
      message: 'Ошибка: товары не найдены'
    };
  }
  
  // Находим индес товара
  const productIndex = data.products.findIndex((p: any) => p.id === productId);
  
  if (productIndex !== -1) {
    const deletedProduct = data.products[productIndex];
    // Удаляем товар
    data.products.splice(productIndex, 1);
    
    // Сохраням обрато
    saveDemoDataToStorage(data);
    
    console.log(' Demo product deleted:', deletedProduct);
    
    return {
      success: true,
      message: 'Товар удалён (демо)'
    };
  }
  
  return {
    success: false,
    message: 'Товар не найден'
  };
}

export async function demoArchiveProduct(productId: number, archive: boolean = true) {
  await delay(400);
  console.log('🎭 Demo: Archiving product...', productId, archive);
  const data = getDemoData();
  
  // Провеяем что products есть
  if (!data.products || !Array.isArray(data.products)) {
    console.error('❌ Products array not found!');
    return {
      success: false,
      message: 'Ошибка: товары не найдены'
    };
  }
  
  // Находим индекс товара
  const productIndex = data.products.findIndex((p: any) => p.id === productId);
  
  if (productIndex !== -1) {
    // Обновляем статус архивации
    data.products[productIndex] = {
      ...data.products[productIndex],
      в_архиве: archive,
      archived: archive // для совместимсти
    };
    
    // Сохраняем обратно
    saveDemoDataToStorage(data);
    
    console.log('✅ Demo product archived:', data.products[productIndex]);
    
    return {
      success: true,
      message: archive ? 'Товар перемещён в архив (демо)' : 'Товар восстановлен из архива (демо)',
      product: data.products[productIndex]
    };
  }
  
  return {
    success: false,
    message: 'Товар не найден'
  };
}

// ============= ADMIN STATS =============

export async function demoGetAdminStats() {
  await delay(400);
  const data = getDemoData();
  
  // Подсчитываем статистику по пользователям
  const userStats = {
    total: data.users.length,
    active: data.users.filter((u: any) => u.баланс > 0).length,
    byLevel: {
      level1: data.users.filter((u: any) => u.уровень === 1).length,
      level2: data.users.filter((u: any) => u.уровень === 2).length,
      level3: data.users.filter((u: any) => u.уровень === 3).length,
    }
  };
  
  // Подсчитываем статистику по заказам
  const orderStats = {
    total: data.orders.length,
    completed: data.orders.filter((o: any) => o.статус === 'выполнен').length,
    pending: data.orders.filter((o: any) => o.статус === 'в обработке').length,
    totalRevenue: data.orders.reduce((sum: number, o: any) => sum + (o.суммаЗаказа || 0), 0)
  };
  
  // Подсчитываем выплаты
  const earningsTotal = data.earnings.reduce((sum: number, e: any) => sum + (e.сумма || 0), 0);
  
  return {
    success: true,
    stats: {
      users: userStats,
      orders: orderStats,
      revenue: orderStats.totalRevenue,
      earnings: earningsTotal,
      withdrawals: {
        pending: 0,
        completed: 0,
        total: 0
      }
    }
  };
}

// ============= PAYMENTS =============

export async function demoGetPaymentMethods() {
  await delay(200);
  
  return {
    success: true,
    methods: [
      { id: 'demo', name: 'Демо-оплата', enabled: true },
      { id: 'yookassa', name: 'ЮКасса', enabled: false },
      { id: 'usdt', name: 'USDT (Crypto)', enabled: false }
    ]
  };
}

export async function demoCreatePayment(orderId: string, method: string) {
  await delay(500);
  console.log('🎭 Creating demo payment for order:', orderId);
  
  const data = getDemoData();
  
  // Находим заказ
  const order = data.orders.find((o: any) => o.id === orderId);
  if (!order) {
    throw new Error(`Заказ ${orderId} не найден`);
  }
  
  const payment = {
    id: `demo_payment_${Date.now()}`,
    orderId,
    method,
    amount: order.цена,
    status: 'processing',
    createdAt: new Date().toISOString(),
    message: 'Демо-оплата обрабатывается... Заказ будет оплачен через 2 скды'
  };
  
  // 🆕 Автоматически подтверждаем платёж через 2 секунды
  setTimeout(async () => {
    console.log('💳 Auto-confirming demo payment:', payment.id);
    
    // Оновле сатус заказа
    const currentData = getDemoData();
    const orderIndex = currentData.orders.findIndex((o: any) => o.id === orderId);
    
    if (orderIndex !== -1) {
      // Меяем статус на "оплачен"
      currentData.orders[orderIndex].статус = 'paid';
      currentData.orders[orderIndex].датаОплаты = new Date().toISOString();
      
      console.log('✅ Order paid:', currentData.orders[orderIndex]);
      
      // ❌ УДАЛЕНО: Комиссии уже были начислены в demoCreateOrder!
      // await processOrderCommissions(currentData, currentData.orders[orderIndex]);
      
      // Сохраняем данные
      saveDemoDataToStorage(currentData);
      
      console.log('💰 Order status updated (commissions already processed):', orderId);
    }
  }, 2000);
  
  return {
    success: true,
    payment
  };
}

/**
 * Обработка комиссий по заказ (MLM логика)
 * 🆕 ИСПОЛЬЗУЕТ ГОТОВЫЕ PAYOUTS из calcOrder - не пересчитывает!
 */
async function processOrderCommissions(data: any, order: any) {
  console.log('💰 ========================================');
  console.log('💰 Processing commissions for order:', order.id);
  console.log('💰 Order quantity:', order.количество);
  console.log('💰 Order payouts:', order.payouts);
  console.log('💰 Order type:', order.типПокупателя); // 🆕 Логируем тип
  console.log('💰 Order price:', order.цена); // 🆕 Логируем цену
  
  // Находим покупателя
  const buyer = data.users.find((u: any) => u.id === order.userId);
  if (!buyer) {
    console.error('❌ Buyer not found for order:', order.id);
    return;
  }
  
  console.log(`   👤 Buyer: ${buyer.имя} ${buyer.фамилия}`);
  console.log(`      - User ID: ${buyer.id}`);
  console.log(`      - Order Type: ${order.типПокупателя}`);
  console.log(`      - Price: ${order.цена}₽ x ${order.количество}`);
  
  // Находим товар
  const product = data.products.find((p: any) => p.sku === order.sku);
  if (!product) {
    console.error('❌ Product not found for SKU:', order.sku);
    return;
  }
  
  console.log(`   📦 Product: ${product.название}`);
  
  // 🆕 ВАЖНО! Используем ГОТОВЫЕ payouts из заказа (уже рассчитанные в calcOrder)
  if (!order.payouts || order.payouts.length === 0) {
    console.log('   ⚠️ No payouts in order, skipping commission processing');
    return;
  }
  
  const orderQuantity = order.количество || 1;
  
  console.log(`   💰 Processing ${order.payouts.length} payouts:`);
  console.log(`   💰 Current earnings count BEFORE:`, data.earnings.length); // 🆕 Логируем количество до
  
  // Обрабатываем каждый payout
  for (const payout of order.payouts) {
    const { userId, level, amount } = payout;
    
    // Находим получателя
    const recipient = data.users.find((u: any) => u.id === userId);
    if (!recipient) {
      console.log(`   ⚠️ ${level}: Recipient not found (userId: ${userId})`);
      continue;
    }
    
    // Умножаем на количество
    const finalAmount = amount * orderQuantity;
    
    console.log(`   💵 Before payout - ${recipient.имя}: balance=${recipient.баланс}, available=${recipient.доступныйБаланс}`); // 🆕
    
    // Начисляем на баланс
    recipient.баланс = (recipient.баланс || 0) + finalAmount;
    recipient.доступныйБаланс = (recipient.доступныйБаланс || 0) + finalAmount;
    
    console.log(`   💵 After payout - ${recipient.имя}: balance=${recipient.баланс}, available=${recipient.доступныйБаланс}`); // 🆕
    
    // Создаем запись о начислении
    const levelNum = parseInt(level.replace('L', ''));
    let earnType = '';
    let earnDesc = '';
    
    if (level === 'L0') {
      earnType = 'розничная_скидка';
      earnDesc = `Розничная скидка за покупку: ${product.название} x${orderQuantity}`;
    } else {
      earnType = `комиссия_${level}`;
      earnDesc = `Комиссия ${level} за заказ ${buyer.имя} ${buyer.фамилия}: ${product.название} x${orderQuantity}`;
    }
    
    const newEarning = {
      id: `earning_${Date.now()}_${Math.random()}_${levelNum}`,
      userId: recipient.id,
      orderId: order.id,
      тип: earnType,
      сумма: finalAmount,
      линия: levelNum,
      дата: new Date().toISOString(),
      описание: earnDesc
    };
    
    data.earnings.push(newEarning);
    
    console.log(`   ✅ ${level}: ${finalAmount.toFixed(2)}₽ → ${recipient.имя} ${recipient.фамилия} (${recipient.id})`);
    console.log(`      - Earning ID: ${newEarning.id}`);
    console.log(`      - Type: ${earnType}`);
    console.log(`      - Line: ${levelNum}`); // 🆕 Логируем линию
    console.log(`      - Description: ${earnDesc}`); // 🆕 Логируем описание
  }
  
  console.log(`   💰 Current earnings count AFTER:`, data.earnings.length); // 🆕 Логируем количество после
  console.log(`   💰 Last 3 earnings:`, data.earnings.slice(-3).map((e: any) => ({ // 🆕 Показываем последние 3
    userId: e.userId,
    type: e.тип,
    amount: e.сумма,
    line: e.линия
  })));
  
  // Добавляем уведомление покупателю
  data.notifications.push({
    id: `notif_${Date.now()}`,
    тип: 'order',
    заголовок: '✅ Заказ оформлен!',
    сообщение: `Ваш заказ "${product.название}" успешно создан и обработан.`,
    дата: new Date().toISOString(),
    прочитано: false
  });
  
  console.log('💰 Commissions processing complete!');
  console.log('💰 ========================================');
}

// ============= COURSES / TRAINING =============

export async function demoGetCourses() {
  await delay(300);
  const data = getDemoData();
  
  // Инициализируем курсы если их не
  if (!data.courses) {
    data.courses = [
      {
        id: 'course_1',
        название: 'Что такое водород',
        описание: 'Узнайте о пользе молекулярного водорода и о том, как наши продукты могут улучшить здоровье. Поймите науку о водородной вде и её терапевтических эффектах.',
        iconName: 'Droplet',
        длительност: '45 мин',
        модулей: 6,
        цвет: '#39B7FF',
        уроки: [
          'ведение в молекулярный водород',
          'Польза водородной воды для здоровья',
          'Научные сследования',
          'Обзор технологии подуктов',
          'Рекомендации по применению',
          'Вопросы и ответы'
        ],
        порядок: 1
      },
      {
        id: 'course_2',
        название: 'Как строить сеть',
        описание: 'Овладейте исксством построения сети, стратегиями рекрутинга и управлением командой для устойчивого роста. Изучите эффектвны навыки коммуникации и лидерства.',
        iconName: 'Users',
        длительность: '60 мин',
        модулей: 8,
        цвет: '#12C9B6',
        уроки: [
          'Основы сетевого маркетинга',
          'Поиск правильных партнёров',
          'Эффективные техники коммуникации',
          'Стратегии построения команды',
          'Лиерство и мотивация',
          'Работа с возражениями',
          'Обучение и развитие команды',
          'Масштабирование вашей сети'
        ],
        порядок: 2
      },
      {
        id: 'course_3',
        название: 'План вознаграждения',
        описание: 'Глубокое погружение в нашу многоровневую структуру компенсации и изучение того, как максимизировать ваш доход. Понимание расчёта комиссий и бонусных возможносй.',
        iconName: 'Award',
        длительность: '30 мин',
        модулей: 4,
        цвет: '#F59E0B',
        уроки: [
          'Структура комиссионных',
          'Ценообразование и маржа по уровням',
          'онусные программы и стимулы',
          'Мксимизация вашего дохода'
        ],
        порядок: 3
      }
    ];
    saveDemoDataToStorage(data);
  }
  
  return {
    success: true,
    courses: data.courses
  };
}

export async function demoCreateCourse(courseData: any) {
  await delay(500);
  console.log(' Demo: Creating course...', courseData);
  const data = getDemoData();
  
  // Инициализируем courses если их нет
  if (!data.courses) {
    data.courses = [];
  }
  
  // Создаём новый курс
  const newCourse = {
    id: `course_${Date.now()}`,
    название: courseData.название,
    описание: courseData.описание || '',
    iconName: courseData.icon || 'BookOpen',
    длительность: courseData.длительность || '30 мин',
    модулей: courseData.модули || courseData.уроки?.length || 0,
    цвет: courseData.цвет || '#39B7FF',
    уроки: courseData.уроки || [],
    порядок: data.courses.length + 1
  };
  
  // Добавляем в список
  data.courses.push(newCourse);
  
  // Сохраняем обатно
  saveDemoDataToStorage(data);
  
  console.log('✅ Demo course created:', newCourse);
  
  return {
    success: true,
    message: 'Курс создан (демо)',
    course: newCourse
  };
}

export async function demoUpdateCourse(courseId: string, updates: any) {
  await delay(400);
  console.log('🎭 Demo: Updating course...', courseId, updates);
  const data = getDemoData();
  
  if (!data.courses || !Array.isArray(data.courses)) {
    return {
      success: false,
      message: 'Ошибка: курсы не найдены'
    };
  }
  
  // Нахдим курс
  const courseIndex = data.courses.findIndex((c: any) => c.id === courseId);
  
  if (courseIndex !== -1) {
    // Обновляем курс
    data.courses[courseIndex] = {
      ...data.courses[courseIndex],
      название: updates.название,
      описание: updates.описание,
      iconName: updates.icon,
      длительность: updates.длительность,
      модулей: updates.модули || updates.уроки?.length || 0,
      цвет: updates.цвет,
      уроки: updates.уроки || []
    };
    
    // Сохраняе обратно
    saveDemoDataToStorage(data);
    
    console.log('✅ Demo course updated:', data.courses[courseIndex]);
    
    return {
      success: true,
      message: 'Курс обновлён (део)',
      course: data.courses[courseIndex]
    };
  }
  
  return {
    success: false,
    message: 'Курс не найден'
  };
}

export async function demoDeleteCourse(courseId: string) {
  await delay(400);
  console.log('🎭 Demo: Deleting course...', courseId);
  const data = getDemoData();
  
  if (!data.courses || !Array.isArray(data.courses)) {
    return {
      success: false,
      message: 'Ошибка: кусы не найдены'
    };
  }
  
  // Находим индекс курса
  const courseIndex = data.courses.findIndex((c: any) => c.id === courseId);
  
  if (courseIndex !== -1) {
    const deletedCourse = data.courses[courseIndex];
    // Удаляем курс
    data.courses.splice(courseIndex, 1);
    
    // Схраняем обратно
    saveDemoDataToStorage(data);
    
    console.log('✅ Demo course deleted:', deletedCourse);
    
    return {
      success: true,
      message: 'Курс удалён (демо)'
    };
  }
  
  return {
    success: false,
    message: 'Курс не найден'
  };
}

// ============= UTILS =============

/**
 * Сброс всех заказов, балансов и начислений
 * Оставляет только пользователей и товары
 */
export async function demoClearAllTransactions() {
  await delay(500);
  console.log('🎭 Clearing all transactions...');
  
  try {
    // ✅ ЗАГРУЖАЕМ текущие данные
    const data = getDemoData();
    
    console.log('🔄 Clearing orders, earnings, and balances...');
    
    // ✅ ОЧИЩАЕМ заказы
    data.orders = [];
    
    // ✅ ОЧИЩАЕМ начисления
    data.earnings = [];
    
    // ✅ ОБНУЛЯЕМ балансы всех пользователей
    data.users.forEach((user: any) => {
      user.баланс = 0;
      user.доступныйБаланс = 0;
      user.зарезервированныйБаланс = 0;
    });
    
    // ✅ ОЧИЩАЕМ уведомления (опционально)
    data.notifications = [];
    
    // Сохраняем обратно в localStorage
    saveDemoDataToStorage(data);
    
    // ✅ ВАЖНО: Сбрасываем текущего пользователя на DEMO_USER
    setCurrentDemoUser('DEMO_USER');
    
    console.log(' All transactions cleared!');
    console.log(`   └─ Users: ${data.users?.length || 0} (balances reset to 0)`);
    console.log(`   └─ Products: ${data.products?.length || 0}`);
    console.log(`   └─ Orders: 0 (cleared)`);
    console.log(`   └─ Earnings: 0 (cleared)`);
    console.log(`   └─ Current user reset to: DEMO_USER`);
    
    return {
      success: true,
      message: 'Все транзакции успешно очищены'
    };
  } catch (error) {
    console.error('❌ Error clearing transactions:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка при очистке транзакций'
    };
  }
}

/**
 * Удалить пользователя
 */
export async function demoDeleteUser(userId: string) {
  await delay(400);
  console.log('🎭 Deleting user:', userId);
  const data = getDemoData();
  
  // Нельзя удалить главного админа
  if (userId === 'DEMO_USER') {
    throw new Error('Нельзя удалить главного администратора');
  }
  
  // Находим пользователя
  const userIndex = data.users.findIndex((u: any) => u.id === userId);
  if (userIndex === -1) {
    throw new Error('Пользователь не найден');
  }
  
  const user = data.users[userIndex];
  
  // Проверяем есть ли у него партнёры
  const hasDownline = data.users.some((u: any) => u.приглашённыйId === userId);
  if (hasDownline) {
    throw new Error(`Нельзя удалить ${user.имя} ${user.фамилия} - у него есть приглашённые партнёры. Сначала переместите их или удалите.`);
  }
  
  // Удаляем пользователя
  data.users.splice(userIndex, 1);
  
  // Удаляем его заказы
  data.orders = data.orders.filter((o: any) => o.userId !== userId);
  
  // Удаляем его ачисления
  data.earnings = data.earnings.filter((e: any) => e.userId !== userId && e.fromUserId !== userId);
  
  // Сохраняем
  saveDemoDataToStorage(data);
  
  console.log('✅ User deleted:', user.имя, user.фамилия);
  
  return {
    success: true,
    message: `Пользователь ${user.имя} ${user.фамилия} удалён`
  };
}

/**
 * Создать нового пользователя
 */
export async function demoCreateUser(userData: {
  имя: string;
  фамилия: string;
  уровень: number;
  sponsorId?: string; // ID спонсора (под кем создать)
}) {
  await delay(400);
  console.log('🎭 Creating user:', userData);
  const data = getDemoData();
  
  // Валидация
  if (!userData.имя || !userData.фамилия) {
    throw new Error('Укажите имя и фамилию');
  }
  
  if (userData.уровень < 1 || userData.уровень > 3) {
    throw new Error('Уровень должен быть от 1 до 3');
  }
  
  // Определяем спонсора
  let sponsor = null;
  if (userData.sponsorId) {
    sponsor = data.users.find((u: any) => u.id === userData.sponsorId);
    if (!sponsor) {
      throw new Error('Спонсор не найден');
    }
  } else {
    // По умолчанию спонсор - главны админ
    sponsor = data.users.find((u: any) => u.id === 'DEMO_USER');
  }
  
  // Генерирум данные
  const userId = `user_${Date.now()}`;
  const refCode = `REF_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const username = `${userData.имя.toLowerCase()}${Date.now()}`;
  
  // Определяем глубину
  const глубина = sponsor ? sponsor.глубина + 1 : 1;
  
  const newUser = {
    id: userId,
    telegramId: Math.floor(Math.random() * 1000000000),
    имя: userData.имя,
    фамилия: userData.фамилия,
    username,
    уровень: userData.уровень,
    рефКод: refCode,
    пригласительКод: sponsor?.рефКод || null,
    пригласившийId: sponsor?.id || null,
    баланс: 0,
    доступныйБаланс: 0,
    зарезервированныйБаланс: 0,
    датаРегистрации: new Date().toISOString(),
    isAdmin: false,
    глубина
  };
  
  // Добавляем пользователя
  data.users.push(newUser);
  
  // Сохраняем
  saveDemoDataToStorage(data);
  
  console.log('✅ User created:', newUser);
  
  return {
    success: true,
    message: `Пользователь ${newUser.имя} ${newUser.фамилия} создан`,
    user: newUser
  };
}

/**
 * Переместить ользователя к другому спонсору
 */
export async function demoMoveUser(userId: string, newSponsorId: string) {
  await delay(400);
  console.log(' Moving user:', userId, 'to sponsor:', newSponsorId);
  const data = getDemoData();
  
  // Нельзя переместить админа
  if (userId === 'DEMO_USER') {
    throw new Error('Нельзя переместить главного администратора');
  }
  
  // Находим пользователя
  const user = data.users.find((u: any) => u.id === userId);
  if (!user) {
    throw new Error('Пльзователь не найден');
  }
  
  // Находим нового спонсора
  const newSponsor = data.users.find((u: any) => u.id === newSponsorId);
  if (!newSponsor) {
    throw new Error('Новый спонсор не найден');
  }
  
  // Нельзя переместить под себя самго или под своих партнёров
  if (userId === newSponsorId) {
    throw new Error('Нельзя переместить пользователя под себя самого');
  }
  
  // Проверяем что новый спонсор не является партнёром этого пользователя
  let checkUser = newSponsor;
  while (checkUser.пригласившийId) {
    if (checkUser.пригласившийId === userId) {
      throw new Error('Нельзя переместить пользователя под своего партнёра');
    }
    checkUser = data.users.find((u: any) => u.id === checkUser.пригласившийId);
    if (!checkUser) break;
  }
  
  // Перемещаем пользователя
  user.пригласительКод = newSponsor.рефКод;
  user.пригласившийId = newSponsor.id;
  user.губина = newSponsor.глубина + 1;
  
  // Обновляем глубину всех партнёров того пользователя (рекурсивно)
  function updateDownlineDepth(parentId: string, newDepth: number) {
    const children = data.users.filter((u: any) => u.пригласившийId === parentId);
    children.forEach((child: any) => {
      child.глубина = newDepth;
      updateDownlineDepth(child.id, newDepth + 1);
    });
  }
  
  updateDownlineDepth(userId, user.глубина + 1);
  
  // Сохраняем
  saveDemoDataToStorage(data);
  
  console.log('✅ User moved:', user.имя, user.фамилия, '→', newSponsor.имя, newSponsor.фамилия);
  
  return {
    success: true,
    message: `${user.имя} ${user.фамилия} перемещён к ${newSponsor.имя} ${newSponsor.фамилия}`
  };
}

// ============= MLM HELPER FUNCTIONS =============

/**
 * Получить MLM-структуру относительно текущего пользователя
 * viewerUserId - ID пользователя, от лица которого мы смотрим
 * Возвращает: { L1: User[], L2: User[], L3: User[] }
 */
export function getMLMStructure(viewerUserId: string) {
  const data = getDemoData();
  
  const viewer = data.users.find((u: any) => u.id === viewerUserId);
  if (!viewer) {
    return { L1: [], L2: [], L3: [] };
  }
  
  // L1 - прямые рефералы viewerUserId
  const L1 = data.users.filter((u: any) => u.пригласившийId === viewerUserId);
  
  // L2 - рефералы L1
  const L1_ids = L1.map((u: any) => u.id);
  const L2 = data.users.filter((u: any) => L1_ids.includes(u.пргласившийId || ''));
  
  // L3 - рефералы L2
  const L2_ids = L2.map((u: any) => u.id);
  const L3 = data.users.filter((u: any) => L2_ids.includes(u.пригласившийId || ''));
  
  return { L1, L2, L3 };
}

/**
 * Получить статистику MLM для пользователя
 */
export function getMLMStats(viewerUserId: string) {
  const structure = getMLMStructure(viewerUserId);
  
  return {
    countL1: structure.L1.length,
    countL2: structure.L2.length,
    countL3: structure.L3.length,
    totalPartners: structure.L1.length + structure.L2.length + structure.L3.length
  };
}

/**
 * Получить цепочку спонсоров для пользователя (вверх по дереву)
 * Возвращает: [sponsor1, sponsor2, sponsor3, ...]
 */
export function getSponsorChain(userId: string): any[] {
  const data = getDemoData();
  const chain: any[] = [];
  
  let currentUser = data.users.find((u: any) => u.id === userId);
  
  // Ограничиваем 10 уровнями на сякий случай (защиа т циклов)
  for (let i = 0; i < 10; i++) {
    if (!currentUser || !currentUser.приглашённыйId) break;
    
    const sponsor = data.users.find((u: any) => u.id === currentUser.приглашённыйId);
    if (!sponsor) break;
    
    chain.push(sponsor);
    currentUser = sponsor;
  }
  
  return chain;
}

/**
 * Получить заказы пользователя
 */
export function getUserOrders(userId: string) {
  const data = getDemoData();
  return data.orders.filter((o: any) => o.userId === userId);
}

/**
 * Получить доходы пользователя
 */
export function getUserEarnings(userId: string) {
  const data = getDemoData();
  return data.earnings.filter((e: any) => e.userId === userId);
}

/**
 * Получть статистику доходов по уовням для пользователя
 */
export function getEarningsByLevel(userId: string) {
  const earnings = getUserEarnings(userId);
  
  return {
    L0: earnings.filter((e: any) => e.линия === 0).reduce((sum, e) => sum + (e.сумма || 0), 0),
    L1: earnings.filter((e: any) => e.линия === 1).reduce((sum, e) => sum + (e.сумма || 0), 0),
    L2: earnings.filter((e: any) => e.линия === 2).reduce((sum, e) => sum + (e.сумма || 0), 0),
    L3: earnings.filter((e: any) => e.линия === 3).reduce((sum, e) => sum + (e.сумма || 0), 0)
  };
}
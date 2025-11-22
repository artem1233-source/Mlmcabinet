// 🎭 DEMO DATA GENERATOR - Генератор реалистичных демо-данных

// Русские имена для демо пользователей
const RUSSIAN_FIRST_NAMES = [
  'Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артём', 'Илья', 'Кирилл', 'Михаил',
  'Иван', 'Егор', 'Роман', 'Павел', 'Владимир', 'Николай', 'Денис', 'Евгений', 'Игорь', 'Олег',
  'Елена', 'Ольга', 'Анна', 'Мария', 'Наталья', 'Ирина', 'Татьяна', 'Светлана', 'Екатерина', 'Юлия',
  'Марина', 'Людмила', 'Виктория', 'Дарья', 'Анастасия', 'Валентина', 'Галина', 'Надежда', 'София', 'Вера'
];

const RUSSIAN_LAST_NAMES = [
  'Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Фёдоров',
  'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев',
  'Орлов', 'Андреев', 'Макаров', 'Никитин', 'Захаров', 'Зайцев', 'Соловьёв', 'Борсов', 'Яковлев', 'Григорьев'
];

import { calcOrder, findUpline, calcIncome } from './mlm';
import type { ProductCommission } from './types/commission';

// 🆕 Основные товары с правильными SKU и комиссиями (используются в заказах и расчётах)
const PRODUCTS = [
  { 
    id: 1, 
    sku: 'H2-1', 
    название: 'Водородный порошок H₂-Touch (1 упаковка)', 
    описание: 'Базовый набор для начала', 
    розничнаяЦена: 6500, 
    партнёрскаяЦена: 4900,
    retail_price: 6500,
    partner_price: 4900,
    // 🆕 Комиссии продукта
    commission: {
      guest: { L0: 1600 },
      partner: { L1: 900, L2: 500, L3: 200 }
    } as ProductCommission
  },
  { 
    id: 2, 
    sku: 'H2-3', 
    название: 'Водородный порошок H₂-Touch (3 упаковки)', 
    описание: 'Выгодный набор на курс', 
    розничнаяЦена: 18000, 
    партнёрскаяЦена: 13500,
    retail_price: 18000,
    partner_price: 13500,
    // 🆕 Комиссии продукта
    commission: {
      guest: { L0: 4500 },
      partner: { L1: 1800, L2: 1200, L3: 600 }
    } as ProductCommission
  },
];

// Расширенный катлог для UI (с дополнительными товарами)
export function generateCatalogProducts() {
  const income1 = calcIncome('H2-1');
  const income3 = calcIncome('H2-3');
  
  return [
    {
      id: 1,
      sku: 'H2-1',
      название: 'Водородный порошок H₂-Touch',
      описание: 'Базовый набор для начала. 1 упаковка на месяц использования.',
      полноеОписание: 'Уникальная формула водородного порошка H₂-Touch обеспечивает организм молекулярным водородом - мощнейшим антиоксидантом. Улучшает энергетический обмен, замедляет процессы старения, повышает выносливость.',
      // Старые поля для совместимости
      розничнаяЦена: 6500,
      партнёрскаяЦена: 4900,
      // Новые поля (цена_розница, цена1, цена2, цена3, цена4)
      цена_розница: 6500, // Розничная цена для гостей
      цена1: 4900, // Цена для партнёров (партнёрская)
      цена2: 4000, // Цена 1 линии (L1 = 4900 - 4000 = 900)
      цена3: 3500, // Цена 2 линии (L2 = 4000 - 3500 = 500)
      цена4: 3300, // ✅ Цена 3 линии / База компании (L3 = 3500 - 3300 = 200)
      retail_price: 6500,
      partner_price: 4900,
      категория: 'Водородные комплексы',
      популярность: 95,
      вНаличии: true,
      активен: true,
      изображение: 'https://images.unsplash.com/photo-1556229010-aa9e376e8b58?w=400&h=400&fit=crop',
      доход: income1,
      isBaseProduct: true, // Маркер базового товара
      // 🆕 Комиссии продукта
      commission: {
        guest: { L0: 1600 },
        partner: { L1: 900, L2: 500, L3: 200 }
      } as ProductCommission,
      характеристики: [
        'Упаковка на 30 дней',
        'Натуральный состав',
        'Сертифицирован',
        'Производство: Япония'
      ]
    },
    {
      id: 2,
      sku: 'H2-3',
      название: 'Водородный порошок H₂-Touch (Курс 3 месяца)',
      описание: 'Выгодный набор на полный курс. 3 упаковки со скидкой.',
      полноеОписание: 'Набор из 3 упаковок водородного порошка H₂-Touch для полного трехмесячного курса. Максимальная эффективность достигается при регулярном применении. Выгодная цена при покупке курса.',
      // Старые поля для совместимости
      розничнаяЦена: 18000,
      партнёрскаяЦена: 13500,
      // Новые поля (цена_розница, цена1, цена2, цена3, цена4)
      цена_розница: 18000, // Розничная цена для гостей
      цена1: 13500, // Цена для партнёров (партнёрская)
      цена2: 11700, // Цена 1 линии (L1 = 13500 - 11700 = 1800)
      цена3: 10500, // Цена 2 линии (L2 = 11700 - 10500 = 1200)
      цена4: 9900,  // ✅ Цена 3 линии / База компании (L3 = 10500 - 9900 = 600)
      retail_price: 18000,
      partner_price: 13500,
      категория: 'Водородные комплексы',
      популярность: 98,
      вНаличии: true,
      активен: true,
      хит: true,
      изображение: 'https://images.unsplash.com/photo-1556229010-aa9e376e8b58?w=400&h=400&fit=crop',
      доход: income3,
      isBaseProduct: true, // Маркер базового товара
      // 🆕 Комиссии продукта
      commission: {
        guest: { L0: 4500 },
        partner: { L1: 1800, L2: 1200, L3: 600 }
      } as ProductCommission,
      характеристики: [
        '3 упаковки (курс 90 дней)',
        'Экономия 1500₽',
        'Натуральный состав',
        'Производство: Япония'
      ]
    }
  ];
}

// Генерация уникальных ID
let userIdCounter = 1000;
let orderIdCounter = 5000;

// Генерация случайного числа в диапазоне
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Генерация случайной даты за последние N месяцев
function randomDate(monthsAgo: number): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = now;
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Генерация имени по��ьзователя
function generateUserName(): { имя: string; фамилия: string } {
  const имя = RUSSIAN_FIRST_NAMES[randomInt(0, RUSSIAN_FIRST_NAMES.length - 1)];
  const фамилия = RUSSIAN_LAST_NAMES[randomInt(0, RUSSIAN_LAST_NAMES.length - 1)];
  return { имя, фамилия };
}

// Генерация реферальног кода
function generateRefCode(): string {
  return 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Генерация телеграм username
function generateUsername(имя: string, фамилия: string): string {
  const base = имя.toLowerCase() + фамилия.toLowerCase();
  const translitMap: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  const translit = base.split('').map(char => translitMap[char] || char).join('');
  return translit + randomInt(100, 999);
}

// Генерация структуры пользователей с точной моделью
export function generateDemoUsers() {
  const users: any[] = [];
  
  // Создаём главного пользователя (АДМИНИСТРАТОР)
  const mainUser = {
    id: 'DEMO_USER',
    telegramId: 999999999,
    email: 'admin@admin.com',
    имя: 'Иван',
    фамилия: 'Петров',
    username: 'admin',
    уровень: 3, // Максимальный уровень партнёра
    рефКод: 'ADMIN2024',
    пригласительКод: null,
    пригласившийId: null,
    баланс: 0,
    доступныйБаланс: 0,
    зарезервированныйБаланс: 0,
    датаРегистрации: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    isAdmin: true,
    глубина: 0
  };
  users.push(mainUser);
  
  // 1-я ЛИНИЯ: 3 партнёра (для простоты тестирования)
  const line1Users: any[] = [];
  const line1Names = [
    { имя: 'Алексей', фамилия: 'Смирнов', уровень: 3 },
    { имя: 'Мария', фамилия: 'Иванова', уровень: 2 },
    { имя: 'Дмитрий', фамилия: 'Кузнецов', уровень: 1 }
  ];
  
  for (let i = 0; i < 3; i++) {
    const userId = `user_L1_${i + 1}`;
    const user = {
      id: userId,
      telegramId: 100000000 + i,
      имя: line1Names[i].имя,
      фамилия: line1Names[i].фамилия,
      username: `${line1Names[i].имя.toLowerCase()}${i + 1}`,
      уровень: line1Names[i].уровень,
      рефКод: `REF_L1_${i + 1}`,
      пригласительКод: mainUser.рефКод,
      пригласившийId: mainUser.id,
      баланс: 0,
      доступныйБаланс: 0,
      зарезервированныйБаланс: 0,
      датаРегистрации: randomDate(5).toISOString(),
      isAdmin: false,
      глубина: 1
    };
    users.push(user);
    line1Users.push(user);
  }
  
  // 2-я ЛИНИЯ: По 2 партнёра под каждым из L1 = 6 партнёров
  const line2Names = [
    { имя: 'Елена', фамилия: 'Волкова' },
    { имя: 'Сергей', фамилия: 'Морозов' },
    { имя: 'Ольга', фамилия: 'Попова' },
    { имя: 'Андрей', фамилия: 'Лебедев' },
    { имя: 'Наталья', фамилия: 'Соколова' },
    { имя: 'Павел', фамилия: 'Новиков' }
  ];
  
  const line2Users: any[] = [];
  let nameIndex = 0;
  for (let i = 0; i < line1Users.length; i++) {
    const line1User = line1Users[i];
    for (let j = 0; j < 2; j++) {
      const userId = `user_L2_${nameIndex + 1}`;
      const user = {
        id: userId,
        telegramId: 200000000 + nameIndex,
        имя: line2Names[nameIndex].имя,
        фамилия: line2Names[nameIndex].фамилия,
        username: `${line2Names[nameIndex].имя.toLowerCase()}${nameIndex + 1}`,
        уровень: j === 0 ? 2 : 1,
        рефКод: `REF_L2_${nameIndex + 1}`,
        пригласительКод: line1User.рефКод,
        пригласившийId: line1User.id,
        баланс: 0,
        доступныйБаланс: 0,
        зарезервированныйБаланс: 0,
        датаРегистрации: randomDate(4).toISOString(),
        isAdmin: false,
        глубина: 2
      };
      users.push(user);
      line2Users.push(user);
      nameIndex++;
    }
  }
  
  // 3-я ЛИНИЯ: По 1 партнёру под каждым из первых 3-х L2 = 3 партнёра
  const line3Names = [
    { имя: 'Татьяна', фамилия: 'Васильева' },
    { имя: 'Роман', фамилия: 'Фёдоров' },
    { имя: 'Анна', фамилия: 'Михайлова' }
  ];
  
  for (let i = 0; i < 3; i++) {
    const line2User = line2Users[i];
    const userId = `user_L3_${i + 1}`;
    const user = {
      id: userId,
      telegramId: 300000000 + i,
      имя: line3Names[i].имя,
      фамилия: line3Names[i].фамилия,
      username: `${line3Names[i].имя.toLowerCase()}${i + 1}`,
      уровень: 1,
      рефКод: `REF_L3_${i + 1}`,
      пригласительКод: line2User.рефКод,
      пригласившийId: line2User.id,
      баланс: 0,
      доступныйБаланс: 0,
      зарезервированныйБаланс: 0,
      датаРегистрации: randomDate(3).toISOString(),
      isAdmin: false,
      глубина: 3
    };
    users.push(user);
  }
  
  console.log(`✅ Generated simple user structure:`);
  console.log(`   └─ L0 (You): 1 admin`);
  console.log(`   └─ L1: 3 partners`);
  console.log(`   └─ L2: 6 partners (2 under each L1)`);
  console.log(`   └─ L3: 3 partners (1 under first 3 of L2)`);
  console.log(`   └─ TOTAL: ${users.length} users`);
  
  return users;
}

// Генерация заказов - каждый покупает 1-5 продуктов H2-1 (4900₽) ежемесячно
export function generateDemoOrders(users: any[]) {
  const orders: any[] = [];
  const mainUser = users.find(u => u.id === 'DEMO_USER');
  if (!mainUser) return orders;
  
  const MONTHS_BACK = 3; // За последние 3 месяца
  
  // Статистика по линиям
  const ordersByLine = { L1: 0, L2: 0, L3: 0, L4: 0 };
  
  // Все пользователи покупают (кроме спонсора главного и самого главного)
  for (const user of users) {
    // Пропускаем спонсора главного и самого главного
    if (user.глубина === -1 || user.id === 'DEMO_USER') continue;
    
    // Каждый покупает каждый месяц
    for (let month = 0; month < MONTHS_BACK; month++) {
      // Покупает 1-5 продуктов в месяц
      const ordersPerMonth = randomInt(1, 5);
      
      for (let i = 0; i < ordersPerMonth; i++) {
        const product = PRODUCTS[0]; // Всегда H2-1 (4900₽)
        const количество = 1;
        
        // Рассчитываем цену и комиссии через правильную функцию
        const upline = findUpline(user.id, users);
        const orderCalc = calcOrder({
          isPartner: true,
          sku: product.sku, // 'H2-1'
          u1: upline.u1,
          u2: upline.u2,
          u3: upline.u3
        });
        
        const цена = orderCalc.price; // 4900₽
        const общаяСумма = цена * количество;
        
        // Извлекаем комиссии по уровням
        const payouts = {
          L0: 0,
          L1: 0,
          L2: 0,
          L3: 0
        };
        
        orderCalc.payouts.forEach(payout => {
          payouts[payout.level] = payout.amount;
        });
        
        // Генерируем дату в пределах месяца назад
        const daysAgo = month * 30 + randomInt(1, 28);
        const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        
        const order = {
          id: `order_${orderIdCounter++}`,
          userId: user.id,
          товар: product.название,
          товарId: product.id,
          sku: product.sku,
          количество,
          цена,
          общаяСумма,
          статус: 'completed',
          датаЗаказа: orderDate.toISOString(),
          датаОбновления: orderDate.toISOString(),
          // Комиссии по уровням (для совместимости)
          d0: payouts.L0,
          d1: payouts.L1,
          d2: payouts.L2,
          d3: payouts.L3,
          // Новый формат с указанием получателей
          payouts: orderCalc.payouts.map(p => ({
            userId: p.userId,
            level: p.level,
            amount: p.amount
          }))
        };
        
        orders.push(order);
        
        // Статистика
        if (user.глубина === 1) ordersByLine.L1++;
        else if (user.глубина === 2) ordersByLine.L2++;
        else if (user.глубина === 3) ordersByLine.L3++;
        else if (user.глубина === 4) ordersByLine.L4++;
      }
    }
  }
  
  // Сортируем по дате (новые сначала)
  orders.sort((a, b) => new Date(b.датаЗаказа).getTime() - new Date(a.датаЗаказа).getTime());
  
  console.log(`📦 Сгенерировано заказов:`);
  console.log(`   └─ От 1-й линии: ${ordersByLine.L1} заказов`);
  console.log(`   └─ От 2-й линии: ${ordersByLine.L2} заказов`);
  console.log(`   └─ От 3-й линии: ${ordersByLine.L3} заказов`);
  console.log(`   └─ От 4-й линии: ${ordersByLine.L4} заказов`);
  console.log(`   └─ ВСЕГО: ${orders.length} заказов`);
  
  return orders;
}

// Функция для расчёта балансов пользователей на основе заказов
export function calculateUserBalances(users: any[], orders: any[]) {
  // Обнуляем все балансы
  users.forEach(user => {
    user.баланс = 0;
    user.доступныйБаланс = 0;
  });
  
  // Считаем комиссии для каждого пользователя
  orders.forEach(order => {
    if (order.payouts) {
      order.payouts.forEach((payout: any) => {
        const user = users.find(u => u.id === payout.userId);
        if (user) {
          user.баланс += payout.amount;
          user.доступныйБаланс += payout.amount;
        }
      });
    }
  });
}

// Генерация выплат (earnings) на основе заказов
export function generateDemoEarnings(orders: any[], users: any[], mainUserId: string = 'DEMO_USER') {
  const earnings: any[] = [];
  let earningIdCounter = 1;
  
  // Создаём earnings для главного пользователя на основе реальных payouts
  for (const order of orders) {
    if (order.userId === mainUserId) continue; // Пропускаем собственные заказы
    
    if (order.payouts) {
      order.payouts.forEach((payout: any) => {
        // Если выплата предназначена главному пльзователю
        if (payout.userId === mainUserId) {
          // Определяем линию по level
          let линия = 1;
          if (payout.level === 'L1') линия = 1;
          else if (payout.level === 'L2') линия = 2;
          else if (payout.level === 'L3') линия = 3;
          
          earnings.push({
            id: `earning_${earningIdCounter++}`,
            userId: mainUserId,
            fromUserId: order.userId,
            orderId: order.id,
            товар: order.товар,
            sku: order.sku,
            сумма: payout.amount,
            линия,
            дата: order.датаЗаказа,
            статус: 'paid'
          });
        }
      });
    }
  }
  
  return earnings;
}

// Генерация уведомлений
export function generateDemoNotifications(users: any[], orders: any[]) {
  const notifications: any[] = [];
  let notifIdCounter = 1;
  
  // Последние 20 событий
  const recentOrders = orders.slice(0, 20);
  
  for (const order of recentOrders) {
    const user = users.find(u => u.id === order.userId);
    if (!user || user.id === 'DEMO_USER') continue;
    
    notifications.push({
      id: `notif_${notifIdCounter++}`,
      тип: 'order',
      заголовок: 'Новый заказ в команде',
      сообщение: `${user.имя} ${user.фамилия} оформил заказ на ${order.общаяСумма}₽`,
      дата: order.датаЗаказа,
      прочитано: Math.random() > 0.3 // 70% прочитаы
    });
    
    if (order.d0 > 0 || order.d1 > 0 || order.d2 > 0) {
      const комиссия = order.d0 + order.d1 + order.d2;
      notifications.push({
        id: `notif_${notifIdCounter++}`,
        тип: 'earnings',
        заголовок: 'Получена комиссия',
        сообщение: `+${комиссия}₽ от заказа ${user.имя} ${user.фамилия}`,
        дат: order.датаЗаказа,
        прочитано: Math.random() > 0.5
      });
    }
  }
  
  // Добавляем системные уведомления
  notifications.push({
    id: `notif_${notifIdCounter++}`,
    тип: 'system',
    заголовок: 'Добро пожаловать в демо-режим!',
    сообщение: 'Это демо-версия с сгенерированными данными. Для начала работы зарегистрируйтесь через Telegram.',
    дата: new Date().toISOString(),
    прочитано: false
  });
  
  // Сортируем по дате
  notifications.sort((a, b) => new Date(b.дата).getTime() - new Date(a.дата).getTime());
  
  return notifications;
}

// Главная функция - генерация всех демо данных
export function generateAllDemoData() {
  console.log('🎭 Generating demo data with realistic MLM structure...');
  
  const users = generateDemoUsers();
  const line1 = users.filter(u => u.глубина === 1).length;
  const line2 = users.filter(u => u.глубина === 2).length;
  const line3 = users.filter(u => u.глубина === 3).length;
  const line4 = users.filter(u => u.глубина === 4).length;
  console.log(`👥 Users: ${users.length} total | L1: ${line1}, L2: ${line2}, L3: ${line3}, L4: ${line4}`);
  
  const orders = generateDemoOrders(users);
  console.log(`📦 Orders: ${orders.length} total`);
  
  // ВАЖНО: Рассчитываем балансы на основе реальных комиссий из заказов
  calculateUserBalances(users, orders);
  console.log('💰 User balances calculated from real commissions');
  
  const earnings = generateDemoEarnings(orders, users);
  console.log(`💵 Earnings: ${earnings.length} transactions`);
  
  // Проверка корректности earnings
  const earningsSum = earnings.reduce((sum, e) => sum + (e.сумма || 0), 0);
  console.log(`   └─ Total earnings: ${earningsSum.toLocaleString('ru-RU')}₽`);
  
  const notifications = generateDemoNotifications(users, orders);
  console.log(`🔔 Notifications: ${notifications.length} items`);
  
  // Вычисляем статистику для главного пользователя
  const mainUser = users[0];
  const totalEarnings = earnings.reduce((sum, e) => sum + e.сумма, 0);
  mainUser.баланс = totalEarnings;
  mainUser.доступныйБаланс = totalEarnings;
  
  // Статистика по линиям для главного пользователя
  const earningsL1 = earnings.filter(e => e.линия === 1).reduce((sum, e) => sum + e.сумма, 0);
  const earningsL2 = earnings.filter(e => e.линия === 2).reduce((sum, e) => sum + e.сумма, 0);
  const earningsL3 = earnings.filter(e => e.линия === 3).reduce((sum, e) => sum + e.сумма, 0);
  
  // Расчёт средних значений балансов по линиям
  const line1Balances = users.filter(u => u.глубина === 1).map(u => u.баланс || 0);
  const line2Balances = users.filter(u => u.глубина === 2).map(u => u.баланс || 0);
  const line3Balances = users.filter(u => u.глубина === 3).map(u => u.баланс || 0);
  
  const avgL1 = line1Balances.length > 0 ? Math.round(line1Balances.reduce((a, b) => a + b, 0) / line1Balances.length) : 0;
  const avgL2 = line2Balances.length > 0 ? Math.round(line2Balances.reduce((a, b) => a + b, 0) / line2Balances.length) : 0;
  const avgL3 = line3Balances.length > 0 ? Math.round(line3Balances.reduce((a, b) => a + b, 0) / line3Balances.length) : 0;
  
  console.log('💼 Average partner balances:');
  console.log(`   Уровень 1: ${avgL1.toLocaleString('ru-RU')}₽ (средний заработок)`);
  console.log(`   Уровень 2: ${avgL2.toLocaleString('ru-RU')}₽ (средний заработок)`);
  console.log(`   Уровень 3: ${avgL3.toLocaleString('ru-RU')}₽ (средний заработок)`);
  console.log('');
  console.log('📊 Main user earnings breakdown:');
  console.log(`   L1 (900₽/order): ${earningsL1.toLocaleString('ru-RU')}₽`);
  console.log(`   L2 (500₽/order): ${earningsL2.toLocaleString('ru-RU')}₽`);
  console.log(`   L3 (200₽/order): ${earningsL3.toLocaleString('ru-RU')}₽`);
  console.log(`   TOTAL: ${totalEarnings.toLocaleString('ru-RU')}₽`);
  
  const totalRevenue = orders.reduce((sum, o) => sum + o.общаяСумма, 0);
  console.log(`💰 Total team revenue: ${totalRevenue.toLocaleString('ru-RU')}₽`);
  console.log(`ℹ️  Уровень 4 (${line4} партнёров) скрыт в интерфейсе, но генерирует доход для Уровня 3`);
  
  // 🆕 ВАЖНО: Проверяем существующие товары в localStorage
  const existingData = loadDemoDataFromStorage();
  const catalogProducts = existingData && existingData.products && existingData.products.length > 0
    ? existingData.products // Используем существующие товары
    : generateCatalogProducts(); // Генерируем базовые только если их нет
  
  console.log(`📦 Products: Using ${catalogProducts.length} products (${existingData?.products ? 'existing' : 'generated'})`);
  
  const demoData = {
    users,
    orders,
    earnings,
    notifications,
    products: catalogProducts, // ✅ Используем существующие или новые
    currentUser: users[0], // Главный демо пользователь
    isDemo: true,
    generatedAt: new Date().toISOString(),
    version: '5.2' // ВЕРСИЯ ДАННЫХ - Увеличена для совместимости с AdminToolbar
  };
  
  console.log('✅ Demo data generated successfully!');
  
  return demoData;
}

// Сохранение в localStorage
export function saveDemoDataToStorage(data: any) {
  try {
    localStorage.setItem('demo_mlm_data', JSON.stringify(data)); // 🆕 Исправлен ключ!
    console.log('✅ Demo data saved to localStorage');
  } catch (error) {
    console.error('❌ Failed to save demo data:', error);
  }
}

// Загрузка из localStorage
export function loadDemoDataFromStorage() {
  try {
    const data = localStorage.getItem('demo_mlm_data'); // 🆕 Исправлен ключ!
    if (data) {
      const parsed = JSON.parse(data);
      
      // ПРОВЕРКА ВЕРСИИ: если данные старые - пересоздаём!
      const currentVersion = '5.2'; // 🆕 Увеличиваем версию чтобы поддерживать существующие данные
      if (!parsed.version || parseFloat(parsed.version) < 3.0) { // Проверяем только major version
        console.log('⚠️ Very old demo data version detected! Regenerating...');
        console.log(`Old version: ${parsed.version || 'none'}, Current: ${currentVersion}`);
        return null; // Вернём null чтобы создать новые данны
      }
      
      console.log('✅ Demo data loaded from localStorage (version ' + (parsed.version || 'unknown') + ')');
      return parsed;
    }
  } catch (error) {
    console.error('❌ Failed to load demo data:', error);
  }
  return null;
}

// Очистка демо данных
export function clearDemoData() {
  localStorage.removeItem('demo_mlm_data'); // 🆕 Исправлен ключ!
  console.log('✅ Demo data cleared');
}

// Пересоздание демо данных (для обновления структуры)
export function regenerateDemoData() {
  console.log('🔄 Regenerating demo data...');
  clearDemoData();
  const newData = generateAllDemoData();
  saveDemoDataToStorage(newData);
  console.log('✅ Demo data regenerated!');
  return newData;
}
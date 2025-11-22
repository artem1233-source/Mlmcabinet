// MLM система расчета выплат

import { ProductWithCommission, DEFAULT_COMMISSIONS, getProductCommissions } from './types/commission';

// ⚠️ ВАЖНО: Константы цен и комиссий оставлены для обратной совместимости
// Они используются как fallback, если продукт не имеет собственной конфигурации комиссий
const RETAIL_1 = 6500;
const PARTNER_1 = 4900;
const RETAIL_3 = 18000;
const PARTNER_3 = 13500;

const COMM = {
  guest: { 
    'H2-1': { L0: 1600 }, 
    'H2-3': { L0: 4500 } 
  },
  partner: {
    'H2-1': { L1: 900, L2: 500, L3: 200 },
    'H2-3': { L1: 1800, L2: 1200, L3: 600 }
  }
};

export interface Payout {
  userId: string;
  amount: number;
  level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
}

export interface CalcOrderResult {
  price: number;
  payouts: Payout[];
}

export interface CalcOrderParams {
  isPartner: boolean;
  sku: string; // 'H2-1' или 'H2-3'
  referrerId?: string;
  u1?: string;
  u2?: string;
  u3?: string;
  u4?: string; // Новые уровни (опционально)
  u5?: string;
  product?: ProductWithCommission; // 🆕 Можно передать продукт с комиссиями
}

/**
 * Рассчитывает цену и выплаты для заказа
 * 
 * ⚠️ ВАЖНО: Сигнатура функции НЕ ИЗМЕНЕНА для обратной совместимости!
 * Добавлен опциональный параметр product для передачи кастомных комиссий.
 * 
 * @param isPartner - покупатель является партнером
 * @param sku - артикул товара ('H2-1' или 'H2-3')
 * @param referrerId - ID продавца (для гостей)
 * @param u1, u2, u3, u4, u5 - цепочка спонсоров (для партнеров)
 * @param product - объект продукта с комиссиями (опционально, новое!)
 */
export function calcOrder({ 
  isPartner, 
  sku, 
  referrerId, 
  u1, 
  u2, 
  u3,
  u4,
  u5,
  product
}: CalcOrderParams): CalcOrderResult {
  console.log('🔥🔥🔥 ======== calcOrder CALLED ======== 🔥🔥🔥');
  console.log('🔥 Input parameters:', {
    isPartner,
    sku,
    referrerId,
    u1,
    u2,
    u3,
    u4,
    u5,
    product: product ? { 
      sku: product.sku, 
      hasCommission: !!product.commission,
      commission: product.commission,
      retail_price: product.retail_price,
      partner_price: product.partner_price
    } : 'NO PRODUCT PASSED'
  });
  
  const payouts: Payout[] = [];
  let price = 0;

  // 🆕 Получаем комиссии продукта
  // Если передан product с комиссиями - используем их
  // Иначе - берём дефолтные по SKU (старое поведение)
  const commissions = product ? getProductCommissions(product) : DEFAULT_COMMISSIONS[sku] || DEFAULT_COMMISSIONS['H2-1'];

  console.log('💰💰💰 calcOrder - commissions loaded:', {
    sku,
    isPartner,
    commissions,
    product_passed: !!product,
    product_commission: product?.commission,
    result_commissions: commissions
  });

  if (!isPartner) {
    // Гость покупает по розничной цене
    // Приоритет: product.retail_price → product.розничнаяЦена → константа
    if (product) {
      price = product.retail_price || product.розничнаяЦена || ((sku === 'H2-1') ? RETAIL_1 : RETAIL_3);
    } else {
      price = (sku === 'H2-1') ? RETAIL_1 : RETAIL_3;
    }
    
    // ✅ НОВАЯ ЛОГИКА: Для гостевых покупок берём L0/L1/L2/L3 из commissions.guest
    const guestPlan = commissions.guest || COMM.guest[sku as keyof typeof COMM.guest] || {};
    
    console.log('🛒 Guest purchase calculation:', {
      price,
      guestPlan,
      referrerId,
      upline: { u1, u2, u3 }
    });
    
    // L0 - продавец (referrer)
    if (referrerId && guestPlan.L0) {
      payouts.push({ 
        userId: referrerId, 
        level: 'L0', 
        amount: guestPlan.L0 
      });
      console.log('✅ Added L0 payout:', { userId: referrerId, amount: guestPlan.L0 });
    }
    
    // L1/L2/L3 - спонсоры продавца (upline)
    if (u1 && guestPlan.L1) {
      payouts.push({ 
        userId: u1, 
        level: 'L1', 
        amount: guestPlan.L1 
      });
      console.log('✅ Added L1 payout:', { userId: u1, amount: guestPlan.L1 });
    }
    
    if (u2 && guestPlan.L2) {
      payouts.push({ 
        userId: u2, 
        level: 'L2', 
        amount: guestPlan.L2 
      });
      console.log('✅ Added L2 payout:', { userId: u2, amount: guestPlan.L2 });
    }
    
    if (u3 && guestPlan.L3) {
      payouts.push({ 
        userId: u3, 
        level: 'L3', 
        amount: guestPlan.L3 
      });
      console.log('✅ Added L3 payout:', { userId: u3, amount: guestPlan.L3 });
    }
  } else {
    // Партнер покупает по партнерской цене
    // Приоритет: product.partner_price → product.партнёрскаяЦена → константа
    if (product) {
      price = product.partner_price || product.партнёрскаяЦена || ((sku === 'H2-1') ? PARTNER_1 : PARTNER_3);
    } else {
      price = (sku === 'H2-1') ? PARTNER_1 : PARTNER_3;
    }
    
    const plan = commissions.partner || COMM.partner[sku as keyof typeof COMM.partner] || {};
    
    console.log('👥 Partner purchase calculation:', {
      price,
      plan,
      commissions_partner: commissions.partner,
      COMM_partner: COMM.partner[sku as keyof typeof COMM.partner],
      upline: { u1, u2, u3, u4, u5 }
    });
    
    if (u1 && plan.L1) {
      payouts.push({ 
        userId: u1, 
        level: 'L1', 
        amount: plan.L1 
      });
      console.log('✅ Added L1 payout:', { userId: u1, amount: plan.L1 });
    } else {
      console.log('⚠️ L1 skipped:', { u1_exists: !!u1, L1_amount: plan.L1 });
    }
    
    if (u2 && plan.L2) {
      payouts.push({ 
        userId: u2, 
        level: 'L2', 
        amount: plan.L2 
      });
      console.log('✅ Added L2 payout:', { userId: u2, amount: plan.L2 });
    } else {
      console.log('⚠️ L2 skipped:', { u2_exists: !!u2, L2_amount: plan.L2 });
    }
    
    if (u3 && plan.L3) {
      payouts.push({ 
        userId: u3, 
        level: 'L3', 
        amount: plan.L3 
      });
      console.log('✅ Added L3 payout:', { userId: u3, amount: plan.L3 });
    } else {
      console.log('⚠️ L3 skipped:', { u3_exists: !!u3, L3_amount: plan.L3 });
    }
    
    if (u4 && plan.L4) {
      payouts.push({ 
        userId: u4, 
        level: 'L4', 
        amount: plan.L4 
      });
      console.log('✅ Added L4 payout:', { userId: u4, amount: plan.L4 });
    }
    
    if (u5 && plan.L5) {
      payouts.push({ 
        userId: u5, 
        level: 'L5', 
        amount: plan.L5 
      });
      console.log('✅ Added L5 payout:', { userId: u5, amount: plan.L5 });
    }
  }

  console.log('🔥 ======== calcOrder RESULT ========');
  console.log('🔥 Final payouts:', payouts);
  console.log('🔥 Final price:', price);
  console.log('🔥 =====================================');

  return { price, payouts };
}

/**
 * Находит цепочку спонсоров вверх по структуре (u1, u2, u3)
 */
export function findUpline(buyerId: string, users: any[]): {
  u1?: string;
  u2?: string;
  u3?: string;
} {
  const buyer = users.find(u => u.id === buyerId);
  if (!buyer || !buyer.пригласившийId) {
    return {};
  }
  
  const u1 = buyer.пригласившийId;
  const u1User = users.find(u => u.id === u1);
  
  if (!u1User || !u1User.пригласившийId) {
    return { u1 };
  }
  
  const u2 = u1User.пригласившийId;
  const u2User = users.find(u => u.id === u2);
  
  if (!u2User || !u2User.пригласившийId) {
    return { u1, u2 };
  }
  
  const u3 = u2User.пригласившийId;
  
  return { u1, u2, u3 };
}

/**
 * Получить информацию о комиссиях для товара
 * 
 * 🆕 Теперь может принимать как SKU (string), так и продукт с комиссиями
 */
export function getCommissionInfo(skuOrProduct: string | ProductWithCommission): {
  retail: number;
  partner: number;
  commissions: { L0?: number; L1?: number; L2?: number; L3?: number; L4?: number; L5?: number };
} {
  let sku: string;
  let product: ProductWithCommission | undefined;
  
  // Определяем, что передано - SKU или продукт
  if (typeof skuOrProduct === 'string') {
    sku = skuOrProduct;
  } else {
    sku = skuOrProduct.sku;
    product = skuOrProduct;
  }
  
  // Цены
  const retail = product?.retail_price || product?.розничнаяЦена || ((sku === 'H2-1') ? RETAIL_1 : RETAIL_3);
  const partner = product?.partner_price || product?.партнёрскаяЦена || ((sku === 'H2-1') ? PARTNER_1 : PARTNER_3);
  
  // Комиссии
  const commissions = product ? getProductCommissions(product) : DEFAULT_COMMISSIONS[sku] || DEFAULT_COMMISSIONS['H2-1'];
  
  return {
    retail,
    partner,
    commissions: {
      ...commissions.guest,
      ...commissions.partner
    }
  };
}

/**
 * Функция для отображения потенциала дохода
 * 
 * 🆕 Теперь может принимать как SKU (string), так и продукт с комиссиями
 */
export function calcIncome(skuOrProduct: string | ProductWithCommission): {
  d0: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  итого: number;
} {
  let sku: string;
  let product: ProductWithCommission | undefined;
  
  // Определяем, что передано - SKU или продукт
  if (typeof skuOrProduct === 'string') {
    sku = skuOrProduct;
  } else {
    sku = skuOrProduct.sku;
    product = skuOrProduct;
  }
  
  // Получаем комиссии
  const commissions = product ? getProductCommissions(product) : DEFAULT_COMMISSIONS[sku] || DEFAULT_COMMISSIONS['H2-1'];
  
  const d0 = commissions.guest?.L0 || 0;
  const d1 = commissions.partner?.L1 || 0;
  const d2 = commissions.partner?.L2 || 0;
  const d3 = commissions.partner?.L3 || 0;
  const d4 = commissions.partner?.L4 || 0;
  const d5 = commissions.partner?.L5 || 0;
  
  return {
    d0,
    d1,
    d2,
    d3,
    d4,
    d5,
    итого: d0 + d1 + d2 + d3 + d4 + d5
  };
}
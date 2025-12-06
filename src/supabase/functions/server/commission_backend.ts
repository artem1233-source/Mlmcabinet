/**
 * Backend helper для конвертации комиссий из нового формата (product.commission)
 * в старый формат { d0, d1, d2, d3 } для обратной совместимости.
 * 
 * Этот файл НЕ меняет структуру БД и API — только адаптирует данные.
 */

export interface BackendCommissions {
  d0: number;
  d1: number;
  d2: number;
  d3: number;
}

export interface FrontendCommissionLevel {
  L0?: number;
  L1?: number;
  L2?: number;
  L3?: number;
  L4?: number;
  L5?: number;
}

export interface FrontendProductCommission {
  guest?: FrontendCommissionLevel;
  partner?: FrontendCommissionLevel;
}

export const BACKEND_DEFAULT_COMMISSIONS: Record<string, BackendCommissions> = {
  'H2-1': { d0: 1600, d1: 900, d2: 500, d3: 200 },
  'H2-3': { d0: 4500, d1: 1800, d2: 1200, d3: 600 }
};

export const BACKEND_DEFAULT_PRICES: Record<string, { retail: number; partner: number }> = {
  'H2-1': { retail: 6500, partner: 4900 },
  'H2-3': { retail: 18000, partner: 13500 }
};

/**
 * Конвертирует product.commission (новый формат) в { d0, d1, d2, d3 } (старый формат).
 * 
 * Логика конвертации для ГОСТЕВЫХ продаж:
 *   L0 → d0 (продавец/референт)
 *   L1 → d1 (спонсор продавца, 1-я линия)
 *   L2 → d2 (2-я линия)
 *   L3 → d3 (3-я линия)
 * 
 * Логика конвертации для ПАРТНЁРСКИХ продаж:
 *   d0 = 0 (партнёры не получают L0)
 *   L1 → d1
 *   L2 → d2
 *   L3 → d3
 * 
 * @param product - объект товара с возможным полем commission
 * @param isPartner - true если партнёрская покупка
 * @returns { d0, d1, d2, d3 }
 */
export function convertToBackendFormat(
  product: any,
  isPartner: boolean = false
): BackendCommissions {
  const sku = product?.sku || 'H2-1';
  const defaults = BACKEND_DEFAULT_COMMISSIONS[sku] || BACKEND_DEFAULT_COMMISSIONS['H2-1'];
  
  if (!product?.commission) {
    if (product?.комиссии) {
      return {
        d0: product.комиссии.d0 ?? defaults.d0,
        d1: product.комиссии.d1 ?? defaults.d1,
        d2: product.комиссии.d2 ?? defaults.d2,
        d3: product.комиссии.d3 ?? defaults.d3
      };
    }
    return defaults;
  }
  
  const commission: FrontendProductCommission = product.commission;
  
  if (isPartner) {
    const partner = commission.partner || {};
    return {
      d0: 0,
      d1: partner.L1 ?? defaults.d1,
      d2: partner.L2 ?? defaults.d2,
      d3: partner.L3 ?? defaults.d3
    };
  } else {
    const guest = commission.guest || {};
    return {
      d0: guest.L0 ?? defaults.d0,
      d1: guest.L1 ?? defaults.d1,
      d2: guest.L2 ?? defaults.d2,
      d3: guest.L3 ?? defaults.d3
    };
  }
}

/**
 * Получает цены товара с fallback на дефолтные значения
 */
export function getProductPrices(product: any): { retail: number; partner: number } {
  const sku = product?.sku || 'H2-1';
  const defaults = BACKEND_DEFAULT_PRICES[sku] || BACKEND_DEFAULT_PRICES['H2-1'];
  
  return {
    retail: Number(product?.цена_розница || product?.розничнаяЦена || product?.retail_price || defaults.retail),
    partner: Number(product?.цена1 || product?.партнёрскаяЦена || product?.partner_price || defaults.partner)
  };
}

/**
 * Интерфейс ценовой лестницы товара
 */
export interface PriceLadder {
  P0: number;  // Розничная цена (для гостей)
  P1: number;  // Цена Уровень 1 (партнёрская)
  P2: number;  // Цена Уровень 2
  P3: number;  // Цена Уровень 3
  P_company: number;  // Цена компании
}

/**
 * Извлекает ценовую лестницу из товара
 * Поля: цена_розница, цена1, цена2, цена3, цена4
 * 
 * @param product - объект товара
 * @returns PriceLadder или null если цены не заданы
 */
export function extractPriceLadder(product: any): PriceLadder | null {
  if (!product) return null;
  
  const P0 = Number(product.цена_розница || product.retail_price || 0);
  const P1 = Number(product.цена1 || product.partner_price || 0);
  const P2 = Number(product.цена2 || 0);
  const P3 = Number(product.цена3 || 0);
  const P_company = Number(product.цена4 || 0);
  
  // Проверяем что хотя бы P0 и P1 заданы
  if (P0 <= 0 || P1 <= 0) {
    return null;
  }
  
  return { P0, P1, P2, P3, P_company };
}

/**
 * 🆕 ЕДИНСТВЕННЫЙ ИСТОЧНИК ИСТИНЫ для расчёта комиссий
 * 
 * Вычисляет комиссии L0-L3 из ценовой лестницы:
 *   L0 = P0 - P1 (розничная - партнёрская)
 *   L1 = P1 - P2 (уровень 1 - уровень 2)
 *   L2 = P2 - P3 (уровень 2 - уровень 3)
 *   L3 = P3 - P_company (уровень 3 - цена компании)
 * 
 * Бизнес-правила:
 * - Гостевая продажа: L0 → продавец, L1/L2/L3 → спонсоры продавца
 * - Партнёрская покупка: L0=0 (партнёр взял скидку), L1/L2/L3 → спонсоры покупателя
 * - Проверка: L0 + L1 + L2 + L3 + P_company = P0 (для гостевой)
 * - Проверка: L1 + L2 + L3 + P_company = P1 (для партнёрской)
 * 
 * @param product - объект товара с ценами
 * @param isPartner - true для партнёрской покупки
 * @returns BackendCommissions { d0, d1, d2, d3 }
 */
export function calculateCommissionsFromPrices(
  product: any,
  isPartner: boolean = false
): BackendCommissions {
  const sku = product?.sku || 'H2-1';
  const defaults = BACKEND_DEFAULT_COMMISSIONS[sku] || BACKEND_DEFAULT_COMMISSIONS['H2-1'];
  
  // Извлекаем ценовую лестницу
  const ladder = extractPriceLadder(product);
  
  if (!ladder) {
    // Если цены не заданы — используем fallback на product.commission или дефолты
    console.log(`⚠️ calculateCommissionsFromPrices: No price ladder for ${sku}, using fallback`);
    
    // Пробуем product.commission
    if (product?.commission) {
      const comm = product.commission;
      if (isPartner) {
        return {
          d0: 0,
          d1: comm.partner?.L1 ?? comm.guest?.L1 ?? defaults.d1,
          d2: comm.partner?.L2 ?? comm.guest?.L2 ?? defaults.d2,
          d3: comm.partner?.L3 ?? comm.guest?.L3 ?? defaults.d3
        };
      } else {
        return {
          d0: comm.guest?.L0 ?? defaults.d0,
          d1: comm.guest?.L1 ?? defaults.d1,
          d2: comm.guest?.L2 ?? defaults.d2,
          d3: comm.guest?.L3 ?? defaults.d3
        };
      }
    }
    
    // Fallback на хардкодные дефолты (только для старых товаров без цен)
    if (isPartner) {
      return { d0: 0, d1: defaults.d1, d2: defaults.d2, d3: defaults.d3 };
    }
    return defaults;
  }
  
  // Вычисляем комиссии из ценовой лестницы
  // ВАЖНО: Используем СТРОГУЮ логику без неоднозначных fallbacks
  // Если какой-то уровень цены отсутствует — комиссия для этого уровня = 0
  const P0 = ladder.P0;
  const P1 = ladder.P1;
  const P2 = ladder.P2 ?? 0;  // Если P2 не задано — считаем 0
  const P3 = ladder.P3 ?? 0;  // Если P3 не задано — считаем 0
  const P_company = ladder.P_company ?? 0;
  
  // L0: разница между розничной и партнёрской ценой (всегда должна быть)
  const L0 = Math.max(0, P0 - P1);
  
  // L1: разница P1 - P2. Если P2=0 — L1=0 (нет второго уровня)
  const L1 = P2 > 0 ? Math.max(0, P1 - P2) : 0;
  
  // L2: разница P2 - P3. Если P3=0 — L2=0 (нет третьего уровня)
  const L2 = (P2 > 0 && P3 > 0) ? Math.max(0, P2 - P3) : 0;
  
  // L3: разница P3 - P_company. Если P_company=0 — L3=0
  const L3 = (P3 > 0 && P_company > 0) ? Math.max(0, P3 - P_company) : 0;
  
  // Остаток идёт компании: это валидация, что вся цена разобрана
  const remainder = P_company;
  
  console.log(`💰 calculateCommissionsFromPrices: sku=${sku}, isPartner=${isPartner}`);
  console.log(`   Price ladder: P0=${P0}, P1=${P1}, P2=${P2}, P3=${P3}, P_company=${P_company}`);
  console.log(`   Calculated: L0=${L0}, L1=${L1}, L2=${L2}, L3=${L3}`);
  
  // Проверка формулы
  const checkGuest = L0 + L1 + L2 + L3 + remainder;
  const checkPartner = L1 + L2 + L3 + remainder;
  
  // Предупреждение если проверка не сходится
  if (checkGuest !== P0) {
    console.warn(`⚠️ Commission verification failed: Guest total=${checkGuest}, expected P0=${P0}`);
  }
  if (checkPartner !== P1) {
    console.warn(`⚠️ Commission verification failed: Partner total=${checkPartner}, expected P1=${P1}`);
  }
  
  console.log(`   Verification: Guest total=${checkGuest} (should be ${P0}), Partner total=${checkPartner} (should be ${P1})`);
  
  if (isPartner) {
    return { d0: 0, d1: L1, d2: L2, d3: L3 };
  }
  
  return { d0: L0, d1: L1, d2: L2, d3: L3 };
}

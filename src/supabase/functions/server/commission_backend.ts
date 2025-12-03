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

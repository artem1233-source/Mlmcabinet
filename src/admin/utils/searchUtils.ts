/**
 * Утилиты для глобального поиска в админ-панели H2 Platform
 */

export type SearchScope = 'users' | 'orders' | 'payouts' | 'products';

export interface SearchResult {
  id: string;
  type: SearchScope;
  title: string;
  subtitle: string;
  meta?: string;
  url?: string;
}

// Поиск по пользователям
export function searchUsers(query: string, users: any[]): SearchResult[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return users
    .filter(user => {
      const name = (user.full_name || user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const phone = (user.phone || user.phone_number || '').toLowerCase();
      const id = (user.id || '').toLowerCase();
      
      return name.includes(lowerQuery) || 
             email.includes(lowerQuery) || 
             phone.includes(lowerQuery) ||
             id.includes(lowerQuery);
    })
    .slice(0, 10) // Ограничиваем 10 результатами
    .map(user => ({
      id: user.id,
      type: 'users' as SearchScope,
      title: user.full_name || user.name || user.email,
      subtitle: user.email,
      meta: `Уровень ${user.rank || 0} • Баланс ₽${(user.balance || 0).toLocaleString()}`,
      url: `/admin/users/${user.id}`
    }));
}

// Поиск по заказам
export function searchOrders(query: string, orders: any[]): SearchResult[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return orders
    .filter(order => {
      const id = (order.id || '').toLowerCase();
      const customer = (order.customer_name || order.customer || '').toLowerCase();
      const track = (order.track_number || order.track || '').toLowerCase();
      
      return id.includes(lowerQuery) || 
             customer.includes(lowerQuery) ||
             track.includes(lowerQuery);
    })
    .slice(0, 10)
    .map(order => ({
      id: order.id,
      type: 'orders' as SearchScope,
      title: `Заказ #${order.id}`,
      subtitle: order.customer_name || order.customer || 'Неизвестный клиент',
      meta: `₽${(order.total || 0).toLocaleString()} • ${order.status}`,
      url: `/admin/orders/${order.id}`
    }));
}

// Поиск по выплатам
export function searchPayouts(query: string, payouts: any[]): SearchResult[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return payouts
    .filter(payout => {
      const id = (payout.id || '').toLowerCase();
      const user = (payout.user || payout.user_name || '').toLowerCase();
      
      return id.includes(lowerQuery) || user.includes(lowerQuery);
    })
    .slice(0, 10)
    .map(payout => ({
      id: payout.id,
      type: 'payouts' as SearchScope,
      title: `Выплата ${payout.id}`,
      subtitle: payout.user || payout.user_name,
      meta: `₽${(payout.amount || 0).toLocaleString()} • ${payout.status}`,
      url: `/admin/payouts/${payout.id}`
    }));
}

// Поиск по товарам
export function searchProducts(query: string, products: any[]): SearchResult[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return products
    .filter(product => {
      const name = (product.name || '').toLowerCase();
      const sku = (product.sku || product.id || '').toLowerCase();
      
      return name.includes(lowerQuery) || sku.includes(lowerQuery);
    })
    .slice(0, 10)
    .map(product => ({
      id: product.id,
      type: 'products' as SearchScope,
      title: product.name,
      subtitle: `SKU: ${product.sku || product.id}`,
      meta: `₽${(product.price || 0).toLocaleString()} • Остаток: ${product.stock_quantity || 0}`,
      url: `/admin/products/${product.id}`
    }));
}

// Глобальный поиск по всем областям
export async function globalSearch(
  query: string, 
  scope: SearchScope | 'all',
  data: {
    users?: any[];
    orders?: any[];
    payouts?: any[];
    products?: any[];
  }
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  if (scope === 'all' || scope === 'users') {
    if (data.users) {
      results.push(...searchUsers(query, data.users));
    }
  }
  
  if (scope === 'all' || scope === 'orders') {
    if (data.orders) {
      results.push(...searchOrders(query, data.orders));
    }
  }
  
  if (scope === 'all' || scope === 'payouts') {
    if (data.payouts) {
      results.push(...searchPayouts(query, data.payouts));
    }
  }
  
  if (scope === 'all' || scope === 'products') {
    if (data.products) {
      results.push(...searchProducts(query, data.products));
    }
  }
  
  // Сортируем по релевантности (точное совпадение выше)
  const lowerQuery = query.toLowerCase();
  results.sort((a, b) => {
    const aExact = a.title.toLowerCase() === lowerQuery ? 1 : 0;
    const bExact = b.title.toLowerCase() === lowerQuery ? 1 : 0;
    return bExact - aExact;
  });
  
  return results.slice(0, 20); // Максимум 20 результатов
}

// Подсветка совпадений в тексте
export function highlightMatch(text: string, query: string): string {
  if (!query || !text) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

// Дебаунс для поиска (чтобы не искать при каждом нажатии клавиши)
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Форматирование результата поиска для отображения
export function formatSearchResult(result: SearchResult): {
  icon: string;
  iconColor: string;
  typeLabel: string;
} {
  const formats = {
    users: {
      icon: '👤',
      iconColor: 'bg-blue-100',
      typeLabel: 'Пользователь'
    },
    orders: {
      icon: '🛒',
      iconColor: 'bg-green-100',
      typeLabel: 'Заказ'
    },
    payouts: {
      icon: '💰',
      iconColor: 'bg-purple-100',
      typeLabel: 'Выплата'
    },
    products: {
      icon: '📦',
      iconColor: 'bg-orange-100',
      typeLabel: 'Товар'
    }
  };
  
  return formats[result.type] || formats.users;
}

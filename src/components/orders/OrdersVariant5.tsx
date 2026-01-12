import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingBag, Package, CheckCircle2, Clock, XCircle, Loader2, Search, X, Star, StarOff } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import * as api from '../../utils/api';
import { toast } from 'sonner';

interface OrdersVariant5Props {
  currentUser: any;
  refreshTrigger: number;
}

export function OrdersVariant5({ currentUser, refreshTrigger }: OrdersVariant5Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [pinnedOrders, setPinnedOrders] = useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastOrderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadOrders();
  }, [refreshTrigger]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      if (data.success && data.orders) {
        const validOrders = data.orders.filter((o: any) => {
          if (!o.дата) return true;
          const date = new Date(o.дата);
          return !isNaN(date.getTime()) && date <= new Date();
        });
        
        const sortedOrders = validOrders.sort((a: any, b: any) => 
          new Date(b.дата).getTime() - new Date(a.дата).getTime()
        );
        setOrders(sortedOrders);
        setHasMore(sortedOrders.length > displayCount);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setDisplayCount(prev => {
        const newCount = prev + 20;
        setHasMore(filteredOrders.length > newCount);
        return newCount;
      });
    }
  }, [hasMore, loading]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (lastOrderRef.current) {
      observerRef.current.observe(lastOrderRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const togglePin = (orderId: string) => {
    setPinnedOrders(prev => {
      const newPinned = new Set(prev);
      if (newPinned.has(orderId)) {
        newPinned.delete(orderId);
        toast.success('Заказ откреплён');
      } else {
        newPinned.add(orderId);
        toast.success('⭐ Заказ закреплён');
      }
      return newPinned;
    });
  };

  // Get unique products for filter chips
  const uniqueProducts = [...new Set(orders.map(o => o.товар))].slice(0, 10);

  // Get date groups
  const dateGroups = [
    { label: 'Сегодня', value: 'today' },
    { label: 'Вчера', value: 'yesterday' },
    { label: 'Эта неделя', value: 'week' },
    { label: 'Этот месяц', value: 'month' },
  ];

  const statusFilters = [
    { label: 'Оплачено', value: 'paid', color: 'bg-green-500' },
    { label: 'Ожидание', value: 'pending', color: 'bg-orange-500' },
    { label: 'Отменено', value: 'cancelled', color: 'bg-red-500' },
    { label: 'Партнёры', value: 'partner', color: 'bg-purple-500' },
    { label: 'Гости', value: 'guest', color: 'bg-blue-500' },
  ];

  const isInDateRange = (orderDate: string, range: string) => {
    const order = new Date(orderDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (range) {
      case 'today':
        return order >= today;
      case 'yesterday':
        return order >= yesterday && order < today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return order >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return order >= monthAgo;
      default:
        return true;
    }
  };

  const filteredOrders = orders.filter(order => {
    // Search
    const matchesSearch = searchQuery === '' || 
      order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.товар?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.покупательИмя?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Active filters
    if (activeFilters.length === 0) return true;
    
    return activeFilters.every(filter => {
      // Status filters
      if (filter === 'paid' || filter === 'pending' || filter === 'cancelled') {
        return order.статус === filter;
      }
      // Partner/Guest filters
      if (filter === 'partner') return order.покупательПартнер;
      if (filter === 'guest') return !order.покупательПартнер;
      // Date filters
      if (['today', 'yesterday', 'week', 'month'].includes(filter)) {
        return isInDateRange(order.дата, filter);
      }
      // Product filters
      return order.товар === filter;
    });
  });

  // Separate pinned and regular orders
  const pinnedOrdersList = filteredOrders.filter(o => pinnedOrders.has(o.id));
  const regularOrdersList = filteredOrders.filter(o => !pinnedOrders.has(o.id));
  const displayOrders = [...pinnedOrdersList, ...regularOrdersList].slice(0, displayCount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getAmountColor = (amount: number) => {
    if (amount >= 50000) return 'text-purple-600';
    if (amount >= 20000) return 'text-[#39B7FF]';
    if (amount >= 10000) return 'text-[#12C9B6]';
    return 'text-[#666]';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
          <p className="text-[#666]">Загрузка заказов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
        <Input
          placeholder="🔍 Живой поиск по заказам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-4 py-6 border-[#E6E9EE] rounded-2xl text-lg shadow-sm"
        />
      </div>

      {/* Filter Chips */}
      <div className="space-y-3">
        {/* Status & Type Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm text-[#666] font-medium whitespace-nowrap">Фильтры:</span>
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => toggleFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilters.includes(filter.value)
                  ? `${filter.color} text-white shadow-md scale-105`
                  : 'bg-white text-[#666] border border-[#E6E9EE] hover:border-[#39B7FF]'
              }`}
            >
              {filter.label}
              {activeFilters.includes(filter.value) && (
                <X className="w-3 h-3 inline ml-1" />
              )}
            </button>
          ))}
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm text-[#666] font-medium whitespace-nowrap">Период:</span>
          {dateGroups.map(date => (
            <button
              key={date.value}
              onClick={() => toggleFilter(date.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilters.includes(date.value)
                  ? 'bg-[#12C9B6] text-white shadow-md scale-105'
                  : 'bg-white text-[#666] border border-[#E6E9EE] hover:border-[#12C9B6]'
              }`}
            >
              {date.label}
              {activeFilters.includes(date.value) && (
                <X className="w-3 h-3 inline ml-1" />
              )}
            </button>
          ))}
        </div>

        {/* Product Filters */}
        {uniqueProducts.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-sm text-[#666] font-medium whitespace-nowrap">Товары:</span>
            {uniqueProducts.map(product => (
              <button
                key={product}
                onClick={() => toggleFilter(product)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeFilters.includes(product)
                    ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white shadow-md scale-105'
                    : 'bg-white text-[#666] border border-[#E6E9EE] hover:border-[#39B7FF]'
                }`}
              >
                {product}
                {activeFilters.includes(product) && (
                  <X className="w-3 h-3 inline ml-1" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Active Filters Count */}
        {activeFilters.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-[#39B7FF]/20">
            <span className="text-sm font-medium text-[#666]">
              Активных фильтров: {activeFilters.length} • Найдено: {filteredOrders.length}
            </span>
            <button
              onClick={() => setActiveFilters([])}
              className="text-sm font-medium text-[#39B7FF] hover:text-[#12C9B6] flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Сбросить все
            </button>
          </div>
        )}
      </div>

      {/* Compact Orders Grid */}
      {displayOrders.length === 0 ? (
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-[#666] mb-2 font-semibold">Заказы не найдены</p>
            <p className="text-[#666] text-sm">Попробуйте изменить фильтры</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayOrders.map((order, idx) => {
            const isPinned = pinnedOrders.has(order.id);
            const isLast = idx === displayOrders.length - 1;
            
            return (
              <Card
                key={order.id}
                ref={isLast ? lastOrderRef : null}
                className={`border-[#E6E9EE] rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group relative ${
                  isPinned ? 'ring-2 ring-yellow-400 shadow-md' : ''
                }`}
              >
                {isPinned && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400" />
                )}
                
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-[#1E1E1E] text-sm">#{order.id}</p>
                      <p className="text-xs text-[#666]">
                        {order.дата ? new Date(order.дата).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePin(order.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isPinned ? (
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="w-5 h-5 text-gray-400 hover:text-yellow-400" />
                      )}
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(order.статус)}`}>
                    {getStatusIcon(order.статус)}
                    <span className="text-xs font-medium">
                      {order.статус === 'paid' ? 'Оплачено' : 
                       order.статус === 'pending' ? 'Ожидание' : 'Отменено'}
                    </span>
                  </div>

                  {/* Product */}
                  <div className="p-3 bg-[#F7FAFC] rounded-lg">
                    <p className="text-xs text-[#666] mb-1">Товар</p>
                    <p className="font-semibold text-sm text-[#1E1E1E] truncate">{order.товар}</p>
                    <p className="text-xs text-[#666] mt-1">{order.количество} шт.</p>
                  </div>

                  {/* Customer */}
                  {order.покупательИмя && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {order.покупательИмя[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#666]">Покупатель</p>
                        <p className="text-sm font-medium text-[#1E1E1E] truncate">{order.покупательИмя}</p>
                      </div>
                      {order.покупательПартнер && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs border-purple-200">
                          👤
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-[#666] mb-1">Сумма заказа</p>
                    <p className={`text-2xl font-bold ${getAmountColor(order.суммаЗаказа || order.цена || 0)}`}>
                      ₽{(order.суммаЗаказа || order.цена)?.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Loading More Indicator */}
      {hasMore && displayOrders.length > 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-[#39B7FF] animate-spin" />
        </div>
      )}

      {/* Summary */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-r from-green-50 to-blue-50 sticky bottom-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-[#666] mb-1">Показано</p>
              <p className="text-lg font-bold text-[#1E1E1E]">{displayOrders.length}</p>
            </div>
            <div>
              <p className="text-xs text-[#666] mb-1">Всего найдено</p>
              <p className="text-lg font-bold text-[#1E1E1E]">{filteredOrders.length}</p>
            </div>
            <div>
              <p className="text-xs text-[#666] mb-1">Закреплено</p>
              <p className="text-lg font-bold text-yellow-600">{pinnedOrders.size}</p>
            </div>
            <div>
              <p className="text-xs text-[#666] mb-1">Общая сумма</p>
              <p className="text-lg font-bold text-[#39B7FF]">
                ₽{filteredOrders.reduce((sum, o) => sum + (o.суммаЗаказа || o.цена || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
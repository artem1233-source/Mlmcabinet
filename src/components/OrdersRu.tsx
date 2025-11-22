import { useState, useEffect } from 'react';
import { ShoppingBag, Package, CheckCircle2, Clock, XCircle, Loader2, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import * as api from '../utils/api';
import { toast } from 'sonner';

interface OrdersRuProps {
  currentUser: any;
  refreshTrigger: number;
}

export function OrdersRu({ currentUser, refreshTrigger }: OrdersRuProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');

  useEffect(() => {
    loadOrders();
  }, [refreshTrigger]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      if (data.success && data.orders) {
        // Sort by date (newest first)
        const sortedOrders = data.orders.sort((a: any, b: any) => 
          new Date(b.дата).getTime() - new Date(a.дата).getTime()
        );
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.статус === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Оплачено';
      case 'pending':
        return 'Ожидание оплаты';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
            <p className="text-[#666]">Загрузка заказов...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
          История заказов
        </h1>
        <p className="text-[#666]">Все ваши заказы и их статусы</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Filter className="w-5 h-5 text-[#666] flex-shrink-0" />
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-[#39B7FF] text-white'
              : 'bg-white text-[#666] hover:bg-gray-100'
          }`}
          style={{ fontWeight: '600', fontSize: '14px' }}
        >
          Все ({orders.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            filter === 'pending'
              ? 'bg-orange-500 text-white'
              : 'bg-white text-[#666] hover:bg-gray-100'
          }`}
          style={{ fontWeight: '600', fontSize: '14px' }}
        >
          Ожидание ({orders.filter(o => o.статус === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('paid')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            filter === 'paid'
              ? 'bg-green-500 text-white'
              : 'bg-white text-[#666] hover:bg-gray-100'
          }`}
          style={{ fontWeight: '600', fontSize: '14px' }}
        >
          Оплачено ({orders.filter(o => o.статус === 'paid').length})
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-[#666] mb-2" style={{ fontWeight: '600' }}>
              {filter === 'all' ? 'Пока нет заказов' : `Нет заказов со статусом "${getStatusText(filter)}"`}
            </p>
            <p className="text-[#666]" style={{ fontSize: '14px' }}>
              Создайте первый заказ в разделе Каталог
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      order.статус === 'paid' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {getStatusIcon(order.статус)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-[#1E1E1E]" style={{ fontWeight: '700' }}>
                          {order.id}
                        </h3>
                        <Badge className={`${getStatusColor(order.статус)} border`}>
                          {getStatusText(order.статус)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#666]" style={{ fontSize: '14px' }}>
                        <div>
                          <span className="opacity-70">Товар:</span> <span className="font-medium">{order.товар}</span>
                        </div>
                        <div>
                          <span className="opacity-70">Количество:</span> <span className="font-medium">{order.количество}</span>
                        </div>
                        <div>
                          <span className="opacity-70">Тип:</span>{' '}
                          <span className="font-medium">
                            {order.покупательПартнер ? 'Партнёр' : 'Гость'}
                          </span>
                        </div>
                        <div>
                          <span className="opacity-70">Дата:</span>{' '}
                          <span className="font-medium">
                            {new Date(order.дата).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Payouts */}
                      {order.выплаты && order.выплаты.length > 0 && order.статус === 'paid' && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-[#666] mb-2" style={{ fontSize: '13px', fontWeight: '600' }}>
                            Распределение комиссий:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {order.выплаты.map((payout: any, idx: number) => (
                              <div
                                key={idx}
                                className="px-3 py-1 bg-[#12C9B6]/10 rounded-lg border border-[#12C9B6]/20"
                              >
                                <span className="text-[#666]" style={{ fontSize: '12px' }}>
                                  {payout.level}:
                                </span>
                                <span className="text-[#12C9B6] ml-1" style={{ fontSize: '13px', fontWeight: '700' }}>
                                  ₽{payout.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[#666] mb-1" style={{ fontSize: '13px' }}>Сумма заказа</div>
                      <div className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
                        ₽{(order.суммаЗаказа || order.общаяСумма || order.цена)?.toLocaleString()}
                      </div>
                    </div>
                    {order.статус === 'paid' && (
                      <div className="text-right">
                        <div className="text-[#666] mb-1" style={{ fontSize: '12px' }}>Всего выплат</div>
                        <div className="text-[#12C9B6]" style={{ fontSize: '16px', fontWeight: '700' }}>
                          ₽{order.сумма?.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {orders.length > 0 && (
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mt-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[#F7FAFC] rounded-xl">
                <div className="text-[#666] mb-1" style={{ fontSize: '13px' }}>Всего заказов</div>
                <div className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
                  {orders.length}
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-green-600 mb-1" style={{ fontSize: '13px' }}>Оплачено</div>
                <div className="text-green-700" style={{ fontSize: '24px', fontWeight: '700' }}>
                  {orders.filter(o => o.статус === 'paid').length}
                </div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <div className="text-orange-600 mb-1" style={{ fontSize: '13px' }}>В ожидании</div>
                <div className="text-orange-700" style={{ fontSize: '24px', fontWeight: '700' }}>
                  {orders.filter(o => o.статус === 'pending').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
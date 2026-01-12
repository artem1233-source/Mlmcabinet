import { useState, useEffect } from 'react';
import { ShoppingBag, Package, CheckCircle2, Clock, XCircle, Loader2, Search, Download, Eye, Calendar, User, Phone, Mail, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import * as api from '../../utils/api';
import { toast } from 'sonner';

interface OrdersVariant1Props {
  currentUser: any;
  refreshTrigger: number;
}

export function OrdersVariant1({ currentUser, refreshTrigger }: OrdersVariant1Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  };

  const filterByDate = (order: any) => {
    if (dateFilter === 'all') return true;
    const orderDate = new Date(order.дата);
    const now = new Date();
    
    if (dateFilter === 'today') {
      return orderDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return orderDate >= monthAgo;
    }
    return true;
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filter === 'all' || order.статус === filter;
    const matchesSearch = searchQuery === '' || 
      order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.товар?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.покупательИмя?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = filterByDate(order);
    
    return matchesStatus && matchesSearch && matchesDate;
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
      case 'paid': return 'Оплачено';
      case 'pending': return 'Ожидание оплаты';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTimelineSteps = (status: string) => {
    const steps = [
      { label: 'Создан', key: 'created', active: true },
      { label: 'Обработка', key: 'processing', active: status !== 'cancelled' },
      { label: 'Оплачен', key: 'paid', active: status === 'paid' },
      { label: status === 'cancelled' ? 'Отменён' : 'Доставлен', key: 'delivered', active: status === 'paid' }
    ];
    return steps;
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
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
            <Input
              placeholder="Поиск по номеру, товару, покупателю..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#E6E9EE] rounded-xl"
            />
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Экспорт PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-[#39B7FF] hover:bg-[#2a9fee]' : ''}
          >
            Все ({orders.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            Ожидание ({orders.filter(o => o.статус === 'pending').length})
          </Button>
          <Button
            variant={filter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('paid')}
            className={filter === 'paid' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            Оплачено ({orders.filter(o => o.статус === 'paid').length})
          </Button>
        </div>

        {/* Date Filters */}
        <div className="flex gap-2 border-l border-gray-300 pl-3">
          <Button
            variant={dateFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('all')}
            className={dateFilter === 'all' ? 'bg-[#12C9B6] hover:bg-[#0fb8a5]' : ''}
          >
            Все время
          </Button>
          <Button
            variant={dateFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('today')}
            className={dateFilter === 'today' ? 'bg-[#12C9B6] hover:bg-[#0fb8a5]' : ''}
          >
            Сегодня
          </Button>
          <Button
            variant={dateFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('week')}
            className={dateFilter === 'week' ? 'bg-[#12C9B6] hover:bg-[#0fb8a5]' : ''}
          >
            Неделя
          </Button>
          <Button
            variant={dateFilter === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('month')}
            className={dateFilter === 'month' ? 'bg-[#12C9B6] hover:bg-[#0fb8a5]' : ''}
          >
            Месяц
          </Button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-[#666] mb-2 font-semibold">
              Заказы не найдены
            </p>
            <p className="text-[#666] text-sm">
              Попробуйте изменить фильтры или поисковый запрос
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card 
              key={order.id} 
              className="border-[#E6E9EE] rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Order Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          order.статус === 'paid' ? 'bg-gradient-to-br from-green-400 to-green-600' :
                          order.статус === 'pending' ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                          'bg-gradient-to-br from-gray-400 to-gray-600'
                        }`}>
                          <div className="text-white">
                            {getStatusIcon(order.статус)}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-[#1E1E1E] font-bold text-lg">
                            #{order.id}
                          </h3>
                          <p className="text-[#666] text-sm">
                            {order.дата ? new Date(order.дата).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '—'}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(order.статус)} border`}>
                        {getStatusText(order.статус)}
                      </Badge>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-2">
                      {getTimelineSteps(order.статус).map((step, idx) => (
                        <div key={step.key} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              step.active ? 'bg-[#39B7FF] text-white' : 'bg-gray-200 text-gray-400'
                            }`}>
                              {step.active ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <p className={`text-xs mt-1 ${step.active ? 'text-[#39B7FF]' : 'text-gray-400'}`}>
                              {step.label}
                            </p>
                          </div>
                          {idx < getTimelineSteps(order.статус).length - 1 && (
                            <div className={`h-0.5 flex-1 ${step.active ? 'bg-[#39B7FF]' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Product Info */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-[#F7FAFC] rounded-xl">
                      <div>
                        <p className="text-xs text-[#666] mb-1">Товар</p>
                        <p className="font-semibold text-[#1E1E1E]">{order.товар}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#666] mb-1">Количество</p>
                        <p className="font-semibold text-[#1E1E1E]">{order.количество} шт.</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#666] mb-1">Тип покупателя</p>
                        <p className="font-semibold text-[#1E1E1E]">
                          {order.покупательПартнер ? '👤 Партнёр' : '👥 Гость'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#666] mb-1">Покупатель</p>
                        <p className="font-semibold text-[#1E1E1E]">
                          {order.покупательИмя || 'Не указано'}
                        </p>
                      </div>
                    </div>

                    {/* Commissions */}
                    {order.выплаты && order.выплаты.length > 0 && order.статус === 'paid' && (
                      <div className="p-4 bg-gradient-to-r from-[#12C9B6]/10 to-[#39B7FF]/10 rounded-xl border border-[#12C9B6]/20">
                        <p className="text-sm font-semibold text-[#666] mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Распределение комиссий:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {order.выплаты.map((payout: any, idx: number) => (
                            <div
                              key={idx}
                              className="px-3 py-2 bg-white rounded-lg shadow-sm border border-[#12C9B6]/20"
                            >
                              <span className="text-xs text-[#666]">{payout.level}:</span>
                              <span className="text-[#12C9B6] ml-1 font-bold">
                                ₽{payout.amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Price & Actions */}
                  <div className="flex flex-col items-end gap-4 lg:w-48">
                    <div className="text-right">
                      <p className="text-xs text-[#666] mb-1">Сумма заказа</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] bg-clip-text text-transparent">
                        ₽{(order.суммаЗаказа || order.общаяСумма || order.цена)?.toLocaleString()}
                      </p>
                    </div>
                    
                    {order.статус === 'paid' && order.сумма && (
                      <div className="text-right">
                        <p className="text-xs text-[#666] mb-1">Выплачено</p>
                        <p className="text-xl font-bold text-[#12C9B6]">
                          ₽{order.сумма?.toLocaleString()}
                        </p>
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      Детали
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <Card 
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Заказ #{selectedOrder.id}</h2>
                  <p className="text-white/80">
                    {selectedOrder.дата ? new Date(selectedOrder.дата).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '—'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <Badge className={`${getStatusColor(selectedOrder.статус)} border-0`}>
                {getStatusText(selectedOrder.статус)}
              </Badge>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Product Details */}
              <div>
                <h3 className="font-bold text-[#1E1E1E] mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#39B7FF]" />
                  Информация о товаре
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-[#F7FAFC] rounded-xl">
                  <div>
                    <p className="text-xs text-[#666] mb-1">Товар</p>
                    <p className="font-semibold">{selectedOrder.товар}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#666] mb-1">Количество</p>
                    <p className="font-semibold">{selectedOrder.количество} шт.</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#666] mb-1">Цена за единицу</p>
                    <p className="font-semibold">
                      ₽{((selectedOrder.суммаЗаказа || selectedOrder.цена) / selectedOrder.количество).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#666] mb-1">Общая сумма</p>
                    <p className="font-bold text-[#39B7FF] text-lg">
                      ₽{(selectedOrder.суммаЗаказа || selectedOrder.цена)?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-bold text-[#1E1E1E] mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#39B7FF]" />
                  Информация о покупателе
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg">
                    <div className="w-10 h-10 bg-[#39B7FF]/10 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-[#39B7FF]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#666]">Имя</p>
                      <p className="font-semibold">{selectedOrder.покупательИмя || 'Не указано'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-[#666]">Тип</p>
                      <p className="font-semibold">
                        {selectedOrder.покупательПартнер ? 'Партнёр' : 'Гость'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commissions */}
              {selectedOrder.выплаты && selectedOrder.выплаты.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#1E1E1E] mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#12C9B6]" />
                    Комиссии
                  </h3>
                  <div className="grid gap-2">
                    {selectedOrder.выплаты.map((payout: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-lg">
                        <span className="text-[#666]">{payout.level}</span>
                        <span className="font-bold text-[#12C9B6]">
                          ₽{payout.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button className="flex-1 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6]">
                  <Download className="w-4 h-4 mr-2" />
                  Скачать чек
                </Button>
                {selectedOrder.статус === 'pending' && (
                  <Button variant="outline" className="flex-1">
                    Отправить напоминание
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

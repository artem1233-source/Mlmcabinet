import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle2, XCircle, Loader2, User, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import * as api from '../../utils/api';
import { toast } from 'sonner';

interface OrdersVariant3Props {
  currentUser: any;
  refreshTrigger: number;
}

type OrderStatus = 'new' | 'processing' | 'paid' | 'delivered' | 'cancelled';

interface KanbanColumn {
  id: OrderStatus;
  title: string;
  icon: any;
  color: string;
  bgColor: string;
}

export function OrdersVariant3({ currentUser, refreshTrigger }: OrdersVariant3Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedOrder, setDraggedOrder] = useState<any>(null);

  const columns: KanbanColumn[] = [
    { 
      id: 'new', 
      title: 'Новые', 
      icon: Package, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50 border-blue-200' 
    },
    { 
      id: 'processing', 
      title: 'В обработке', 
      icon: Clock, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50 border-purple-200' 
    },
    { 
      id: 'paid', 
      title: 'Оплачено', 
      icon: CheckCircle2, 
      color: 'text-green-600', 
      bgColor: 'bg-green-50 border-green-200' 
    },
    { 
      id: 'delivered', 
      title: 'Доставлено', 
      icon: CheckCircle2, 
      color: 'text-teal-600', 
      bgColor: 'bg-teal-50 border-teal-200' 
    },
    { 
      id: 'cancelled', 
      title: 'Отменено', 
      icon: XCircle, 
      color: 'text-red-600', 
      bgColor: 'bg-red-50 border-red-200' 
    },
  ];

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
        
        // Map statuses to kanban columns
        const mappedOrders = validOrders.map((o: any) => ({
          ...o,
          kanbanStatus: o.статус === 'pending' ? 'new' : 
                       o.статус === 'paid' ? 'paid' : 
                       o.статус === 'cancelled' ? 'cancelled' : 'new'
        }));
        
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (order: any) => {
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnId: OrderStatus) => {
    if (draggedOrder) {
      setOrders(orders.map(o => 
        o.id === draggedOrder.id 
          ? { ...o, kanbanStatus: columnId }
          : o
      ));
      toast.success(`Заказ #${draggedOrder.id} перемещён в "${columns.find(c => c.id === columnId)?.title}"`);
      setDraggedOrder(null);
    }
  };

  const getOrdersByColumn = (columnId: OrderStatus) => {
    return orders.filter(o => o.kanbanStatus === columnId);
  };

  const getTimeSince = (date: string) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diff = now.getTime() - orderDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} дн. назад`;
    if (hours > 0) return `${hours} ч. назад`;
    return 'только что';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
          <p className="text-[#666]">Загрузка канбан-доски...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1E1E1E]">Канбан-доска заказов</h2>
          <p className="text-sm text-[#666]">Перетаскивайте карточки для изменения статуса</p>
        </div>
        <div className="flex gap-2">
          {columns.map(col => (
            <div key={col.id} className="text-center">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${col.bgColor} border`}>
                <col.icon className={`w-5 h-5 ${col.color}`} />
              </div>
              <div className="text-xs text-[#666] mt-1">{getOrdersByColumn(col.id).length}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(column => {
          const columnOrders = getOrdersByColumn(column.id);
          
          return (
            <div 
              key={column.id} 
              className="flex-1 min-w-[280px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              {/* Column Header */}
              <div className={`${column.bgColor} border-2 rounded-t-xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <column.icon className={`w-5 h-5 ${column.color}`} />
                    <h3 className="font-bold text-[#1E1E1E]">{column.title}</h3>
                  </div>
                  <Badge className={`${column.bgColor} ${column.color} border-0`}>
                    {columnOrders.length}
                  </Badge>
                </div>
                {column.id === 'new' && columnOrders.length > 0 && (
                  <p className="text-xs text-[#666]">
                    ⚡ {columnOrders.length} новых заказов требуют внимания
                  </p>
                )}
              </div>

              {/* Column Cards */}
              <div 
                className="bg-gray-50 border-2 border-t-0 border-gray-200 rounded-b-xl p-3 min-h-[600px] space-y-3"
              >
                {columnOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <column.icon className={`w-12 h-12 ${column.color} opacity-30 mb-2`} />
                    <p className="text-sm text-[#666]">Пусто</p>
                  </div>
                ) : (
                  columnOrders.map((order) => (
                    <Card
                      key={order.id}
                      draggable
                      onDragStart={() => handleDragStart(order)}
                      className={`border-[#E6E9EE] rounded-xl shadow-sm hover:shadow-md transition-all cursor-move ${
                        draggedOrder?.id === order.id ? 'opacity-50 rotate-2 scale-95' : ''
                      }`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Order Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-[#1E1E1E] text-sm">#{order.id}</p>
                            <p className="text-xs text-[#666] flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {getTimeSince(order.дата)}
                            </p>
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${column.bgColor} border`}>
                            <column.icon className={`w-4 h-4 ${column.color}`} />
                          </div>
                        </div>

                        {/* Product */}
                        <div className="p-3 bg-[#F7FAFC] rounded-lg">
                          <p className="text-xs text-[#666] mb-1">Товар</p>
                          <p className="font-semibold text-sm text-[#1E1E1E]">{order.товар}</p>
                          <p className="text-xs text-[#666] mt-1">Количество: {order.количество} шт.</p>
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
                          </div>
                        )}

                        {/* Price */}
                        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-[#666]">Сумма</p>
                            <p className="text-lg font-bold bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] bg-clip-text text-transparent">
                              ₽{(order.суммаЗаказа || order.цена)?.toLocaleString()}
                            </p>
                          </div>
                          {order.покупательПартнер && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                              Партнёр
                            </Badge>
                          )}
                        </div>

                        {/* Commissions Indicator */}
                        {order.выплаты && order.выплаты.length > 0 && column.id === 'paid' && (
                          <div className="flex items-center gap-2 p-2 bg-[#12C9B6]/10 rounded-lg">
                            <DollarSign className="w-4 h-4 text-[#12C9B6]" />
                            <div>
                              <p className="text-xs text-[#666]">Комиссии</p>
                              <p className="text-sm font-bold text-[#12C9B6]">
                                ₽{order.сумма?.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Timer for pending orders */}
                        {column.id === 'new' && (() => {
                          const orderDate = new Date(order.дата);
                          const now = new Date();
                          const hoursPassed = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60));
                          
                          if (hoursPassed > 24) {
                            return (
                              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                <Clock className="w-4 h-4 text-red-600" />
                                <p className="text-xs text-red-600 font-medium">
                                  ⚠️ Просрочен ({Math.floor(hoursPassed / 24)} дн.)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {columns.map(col => {
              const count = getOrdersByColumn(col.id).length;
              const total = orders.filter(o => o.kanbanStatus === col.id && (o.суммаЗаказа || o.цена)).reduce((sum, o) => sum + (o.суммаЗаказа || o.цена || 0), 0);
              
              return (
                <div key={col.id} className="text-center p-4 bg-white rounded-xl">
                  <col.icon className={`w-8 h-8 ${col.color} mx-auto mb-2`} />
                  <p className="text-2xl font-bold text-[#1E1E1E]">{count}</p>
                  <p className="text-xs text-[#666] mb-2">{col.title}</p>
                  <p className="text-sm font-semibold text-[#39B7FF]">
                    ₽{total.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

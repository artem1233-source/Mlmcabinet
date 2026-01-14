import { useState } from 'react';
import { ShoppingBag, Package, Download, MessageCircle, RefreshCw, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ORDER_STATUSES } from '../../types';

export function PartnerOrders() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const myOrders = [
    { id: 'ORD-001', product: 'Водородный порошок x5', amount: 15000, status: 'delivered', date: '2025-01-01', canCancel: false },
    { id: 'ORD-002', product: 'Оздоровительный комплекс x2', amount: 8000, status: 'shipped', date: '2025-01-02', canCancel: false },
    { id: 'ORD-003', product: 'Набор Здоровье x1', amount: 5000, status: 'pending_payment', date: '2025-01-03', canCancel: true },
  ];

  const teamOrdersAggregate = {
    today: { count: 12, amount: 145000 },
    week: { count: 67, amount: 892000 },
    month: { count: 234, amount: 2450000 }
  };

  const filteredOrders = myOrders.filter(o => statusFilter === 'all' || o.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const config = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    if (!config) return null;
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return <Badge className={`${colorMap[config.color]} border`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Team Orders Aggregate (NO PII) */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Заказы команды (агрегированно)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-sm text-[#666] mb-1">Сегодня</p>
              <p className="text-2xl font-bold text-purple-600">{teamOrdersAggregate.today.count}</p>
              <p className="text-xs text-[#666] mt-1">₽{teamOrdersAggregate.today.amount.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-sm text-[#666] mb-1">За неделю</p>
              <p className="text-2xl font-bold text-blue-600">{teamOrdersAggregate.week.count}</p>
              <p className="text-xs text-[#666] mt-1">₽{teamOrdersAggregate.week.amount.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-sm text-[#666] mb-1">За месяц</p>
              <p className="text-2xl font-bold text-[#39B7FF]">{teamOrdersAggregate.month.count}</p>
              <p className="text-xs text-[#666] mt-1">₽{teamOrdersAggregate.month.amount.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending_payment', 'paid', 'shipped', 'delivered'].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status ? 'bg-[#39B7FF]' : ''}
          >
            {status === 'all' ? 'Все мои заказы' : ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]?.label}
          </Button>
        ))}
      </div>

      {/* My Orders */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#39B7FF]" />
            Мои заказы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <div key={order.id} className="p-4 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-bold text-[#1E1E1E]">{order.id}</p>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="font-semibold text-[#1E1E1E] mb-1">{order.product}</p>
                    <p className="text-sm text-[#666]">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#39B7FF]">₽{order.amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Повторить заказ
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Скачать чек
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Написать в поддержку
                  </Button>
                  {order.canCancel && (
                    <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                      <XCircle className="w-4 h-4" />
                      Отменить заказ
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-[#666]">Заказы не найдены</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

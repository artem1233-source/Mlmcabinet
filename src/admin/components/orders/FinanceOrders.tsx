import { useState } from 'react';
import { DollarSign, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ORDER_STATUSES } from '../../types';

export function FinanceOrders({ onOpenDetails }: { onOpenDetails?: (orderId: string) => void }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const orders = [
    { id: 'ORD-001', customer: 'Иван Петров', amount: 15000, cost: 10000, margin: 5000, commissions: 2250, status: 'delivered', refundRequested: false, frozen: 2250 },
    { id: 'ORD-002', customer: 'Анна Сидорова', amount: 8000, cost: 5500, margin: 2500, commissions: 1200, status: 'refund_requested', refundRequested: true, frozen: 1200 },
    { id: 'ORD-003', customer: 'Петр Иванов', amount: 5000, cost: 3200, margin: 1800, commissions: 750, status: 'paid', refundRequested: false, frozen: 750 },
  ];

  const filteredOrders = orders.filter(o => statusFilter === 'all' || o.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const config = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    if (!config) return null;
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700',
      orange: 'bg-orange-100 text-orange-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      yellow: 'bg-yellow-100 text-yellow-700'
    };
    return <Badge className={colorMap[config.color]}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {['all', 'paid', 'delivered', 'refund_requested', 'refund_processing', 'refunded'].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status ? 'bg-[#39B7FF]' : ''}
          >
            {status === 'all' ? 'Все' : ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]?.label}
          </Button>
        ))}
      </div>

      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#39B7FF]" />
            Заказы (финансовый взгляд)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <div key={order.id} className="p-4 bg-[#F7FAFC] rounded-xl cursor-pointer hover:bg-gray-100" onClick={() => onOpenDetails?.(order.id)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">{order.id}</p>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-[#666]">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#39B7FF]">₽{order.amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666]">Себестоимость</p>
                    <p className="font-semibold">₽{order.cost.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666]">Маржа</p>
                    <p className="font-semibold text-green-600">₽{order.margin.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666]">Комиссии (frozen)</p>
                    <p className="font-semibold text-orange-600">₽{order.frozen.toLocaleString()}</p>
                  </div>
                </div>

                {order.refundRequested && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-semibold text-red-900">Запрошен возврат • Frozen → Storno</p>
                    </div>
                  </div>
                )}

                {order.refundRequested && (
                  <Button size="sm" className="w-full bg-red-500 hover:bg-red-600">
                    <XCircle className="w-4 h-4 mr-2" />
                    Выполнить возврат
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

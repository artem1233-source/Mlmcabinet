import { useState } from 'react';
import { MessageCircle, AlertCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ORDER_STATUSES } from '../../types';

export function SupportOrders({ onOpenDetails }: { onOpenDetails?: (orderId: string) => void }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const orders = [
    { id: 'ORD-001', customer: 'Иван Петров', product: 'Водородный порошок x5', status: 'delivered', ticket: null, canInitiateRefund: true },
    { id: 'ORD-002', customer: 'Анна Сидорова', product: 'Набор x2', status: 'refund_requested', ticket: 'T-002', canInitiateRefund: false },
    { id: 'ORD-003', customer: 'Петр Иванов', product: 'Комплекс x3', status: 'address_issue', ticket: 'T-004', canInitiateRefund: false },
  ];

  const filteredOrders = orders.filter(o => statusFilter === 'all' || o.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const config = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    if (!config) return null;
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700',
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      red: 'bg-red-100 text-red-700'
    };
    return <Badge className={colorMap[config.color] || 'bg-gray-100'}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {['all', 'delivered', 'refund_requested', 'address_issue'].map(status => (
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
            <Package className="w-5 h-5 text-[#39B7FF]" />
            Заказы клиентов
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
                    <p className="font-semibold">{order.customer}</p>
                    <p className="text-sm text-[#666]">{order.product}</p>
                  </div>
                  {order.ticket && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      Тикет: {order.ticket}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {order.canInitiateRefund && (
                    <Button size="sm" className="flex-1 bg-orange-500" onClick={e => {e.stopPropagation();}}>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Инициировать возврат
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={e => {e.stopPropagation();}}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Создать тикет
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

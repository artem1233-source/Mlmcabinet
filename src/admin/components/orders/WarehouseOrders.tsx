import { useState } from 'react';
import { Package, Truck, CheckCircle, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ORDER_STATUSES } from '../../types';

export function WarehouseOrders({ onOpenDetails }: { onOpenDetails?: (orderId: string) => void }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const orders = [
    { id: 'ORD-001', customer: 'Иван Петров', phone: '+7 999 111-22-33', address: 'Москва, ул. Ленина, д. 10, кв. 5', product: 'Водородный порошок x5', status: 'picking', track: '' },
    { id: 'ORD-002', customer: 'Анна Сидорова', phone: '+7 999 222-33-44', address: 'СПб, Невский пр-т, д. 25', product: 'Набор x2', status: 'packed', track: '' },
    { id: 'ORD-003', customer: 'Петр Иванов', phone: '+7 999 333-44-55', address: 'Казань, ул. Баумана, д. 15', product: 'Комплекс x3', status: 'shipped', track: 'RU123456789' },
  ];

  const filteredOrders = orders.filter(o => statusFilter === 'all' || o.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const config = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    if (!config) return null;
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700',
      green: 'bg-green-100 text-green-700'
    };
    return <Badge className={colorMap[config.color] || 'bg-gray-100 text-gray-700'}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {['all', 'picking', 'packed', 'shipped'].map(status => (
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
            Заказы к обработке
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
                    <p className="font-semibold">{order.product}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2" onClick={e => {e.stopPropagation();}}>
                    <Printer className="w-4 h-4" />
                    Печать
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666]">Получатель</p>
                    <p className="font-medium">{order.customer}</p>
                    <p className="text-sm text-[#666]">{order.phone}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666]">Адрес</p>
                    <p className="text-sm">{order.address}</p>
                  </div>
                </div>

                {order.track && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
                    <p className="text-xs text-[#666]">Трек-номер</p>
                    <p className="font-mono font-semibold text-green-700">{order.track}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {order.status === 'picking' && (
                    <Button size="sm" className="flex-1 bg-purple-500" onClick={e => {e.stopPropagation();}}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Собран
                    </Button>
                  )}
                  {order.status === 'packed' && (
                    <Button size="sm" className="flex-1 bg-green-500" onClick={e => {e.stopPropagation();}}>
                      <Truck className="w-4 h-4 mr-2" />
                      Отправить
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

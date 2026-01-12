import { useState } from 'react';
import { ShoppingBag, Filter, Download as DownloadIcon, Edit, XCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';
import { ORDER_STATUSES } from '../../types';

export function OwnerOrders({ onOpenDetails }: { onOpenDetails?: (orderId: string) => void }) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const orders = [
    { id: 'ORD-001', customer: 'Иван Петров', product: 'Водородный порошок x5', amount: 15000, cost: 10000, margin: 5000, status: 'delivered', date: '2025-01-01', partner: 'Александр И.', country: 'RU' },
    { id: 'ORD-002', customer: 'Анна Сидорова', product: 'Оздоровительный комплекс x2', amount: 8000, cost: 5500, margin: 2500, status: 'shipped', date: '2025-01-02', partner: 'Мария П.', country: 'RU' },
    { id: 'ORD-003', customer: 'Петр Иванов', product: 'Набор Здоровье x1', amount: 5000, cost: 3200, margin: 1800, status: 'paid', date: '2025-01-03', partner: 'Дмитрий С.', country: 'KZ' },
    { id: 'ORD-004', customer: 'Мария Козлова', product: 'Водородный порошок x3', amount: 9000, cost: 6000, margin: 3000, status: 'payment_failed', date: '2025-01-03', partner: 'Елена К.', country: 'RU' },
  ];

  const filteredOrders = orders.filter(o => statusFilter === 'all' || o.status === statusFilter);

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
      {/* Расширенные фильтры (только для Владельца) */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input placeholder="Поиск по номеру..." />
            <select className="px-3 py-2 border border-[#E6E9EE] rounded-xl">
              <option>Все страны</option>
              <option>RU</option>
              <option>KZ</option>
              <option>BY</option>
            </select>
            <select className="px-3 py-2 border border-[#E6E9EE] rounded-xl">
              <option>Все партнёры</option>
            </select>
            <select className="px-3 py-2 border border-[#E6E9EE] rounded-xl">
              <option>Все склады</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'paid', 'shipped', 'delivered', 'payment_failed', 'address_issue'].map(status => (
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

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <Card className="border-[#39B7FF] border-2 rounded-2xl shadow-md bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Выбрано: {selectedOrders.size}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">Изменить статус</Button>
                <Button size="sm" variant="outline">Добавить трек</Button>
                <Button size="sm" variant="outline">Экспорт</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#39B7FF]" />
              Все заказы (расширенный доступ)
            </CardTitle>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              <DollarSign className="w-3 h-3 mr-1" />
              Видна себестоимость
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F7FAFC]">
                <tr>
                  <th className="p-3 text-left">
                    <Checkbox />
                  </th>
                  <th className="p-3 text-left font-semibold text-[#1E1E1E]">ID</th>
                  <th className="p-3 text-left font-semibold text-[#1E1E1E]">Клиент</th>
                  <th className="p-3 text-left font-semibold text-[#1E1E1E]">Товар</th>
                  <th className="p-3 text-left font-semibold text-[#1E1E1E]">Сумма</th>
                  <th className="p-3 text-left font-semibold text-[#1E1E1E]">Маржа</th>
                  <th className="p-3 text-left font-semibold text-[#1E1E1E]">Партнёр</th>
                  <th className="p-3 text-left font-semibold text-[#1E1E1E]">Статус</th>
                  <th className="p-3 text-left font-semibold text-[#1E1E1E]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id} className="border-t border-[#E6E9EE] hover:bg-[#F7FAFC] cursor-pointer" onClick={() => onOpenDetails?.(order.id)}>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={() => {
                          const newSelected = new Set(selectedOrders);
                          if (newSelected.has(order.id)) newSelected.delete(order.id);
                          else newSelected.add(order.id);
                          setSelectedOrders(newSelected);
                        }}
                      />
                    </td>
                    <td className="p-3 font-mono text-sm">{order.id}</td>
                    <td className="p-3 text-sm">{order.customer}</td>
                    <td className="p-3 text-sm">{order.product}</td>
                    <td className="p-3 font-bold text-[#39B7FF]">₽{order.amount.toLocaleString()}</td>
                    <td className="p-3">
                      <div className="text-xs text-[#666]">Себест: ₽{order.cost.toLocaleString()}</div>
                      <div className="font-semibold text-green-600">+₽{order.margin.toLocaleString()}</div>
                    </td>
                    <td className="p-3 text-sm">{order.partner}</td>
                    <td className="p-3">{getStatusBadge(order.status)}</td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost"><XCircle className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
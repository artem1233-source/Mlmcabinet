import { X, Package, User, MapPin, Truck, CreditCard, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ORDER_STATUSES } from '../../types';

interface OrderDetailsDrawerProps {
  orderId: string;
  onClose: () => void;
  userRole: string;
}

export function OrderDetailsDrawer({ orderId, onClose, userRole }: OrderDetailsDrawerProps) {
  // Mock order data
  const order = {
    id: orderId,
    status: 'shipped',
    date: '2025-01-02',
    customer: {
      name: 'Иван Петров',
      phone: '+7 999 111-22-33',
      email: 'ivan@example.com',
      address: 'Москва, ул. Ленина, д. 10, кв. 5'
    },
    items: [
      { name: 'Водородный порошок', qty: 5, price: 3000, total: 15000 }
    ],
    total: 15000,
    cost: 10000,
    margin: 5000,
    track: 'RU123456789',
    timeline: [
      { status: 'created', date: '2025-01-02 10:00', label: 'Создан' },
      { status: 'paid', date: '2025-01-02 10:15', label: 'Оплачен' },
      { status: 'picking', date: '2025-01-02 14:00', label: 'В сборке' },
      { status: 'packed', date: '2025-01-02 16:00', label: 'Собран' },
      { status: 'shipped', date: '2025-01-03 09:00', label: 'Отправлен' },
    ],
    commissions: [
      { level: 'D1', amount: 1500, partner: 'Александр И.', status: 'frozen' },
      { level: 'D2', amount: 600, partner: 'Мария П.', status: 'frozen' },
      { level: 'D3', amount: 150, partner: 'Дмитрий С.', status: 'frozen' },
    ]
  };

  const showCosts = ['SEO', 'Finance'].includes(userRole);
  const showCommissions = ['SEO', 'Finance', 'AdminOps'].includes(userRole);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
      <div className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Заказ #{order.id}</h2>
              <p className="text-white/80">{order.date}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
          <Badge className={`${ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]?.color === 'green' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
            {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]?.label}
          </Badge>
        </div>

        <div className="p-6 space-y-6">
          {/* Items */}
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-[#1E1E1E] mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#39B7FF]" />
                Состав заказа
              </h3>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-lg">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-[#666]">{item.qty} x ₽{item.price.toLocaleString()}</p>
                  </div>
                  <p className="font-bold text-[#39B7FF]">₽{item.total.toLocaleString()}</p>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-[#E6E9EE]">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-lg">Итого:</p>
                  <p className="text-2xl font-bold text-[#39B7FF]">₽{order.total.toLocaleString()}</p>
                </div>
                {showCosts && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-[#666]">Себестоимость</p>
                      <p className="font-semibold text-red-600">₽{order.cost.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-[#666]">Маржа</p>
                      <p className="font-semibold text-green-600">₽{order.margin.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-[#1E1E1E] mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#39B7FF]" />
                Получатель
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-bold">
                    ИП
                  </div>
                  <div>
                    <p className="font-semibold">{order.customer.name}</p>
                    <p className="text-sm text-[#666]">{order.customer.phone}</p>
                    <p className="text-sm text-[#666]">{order.customer.email}</p>
                  </div>
                </div>
                <div className="p-3 bg-[#F7FAFC] rounded-lg flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-[#666] mt-0.5" />
                  <p className="text-sm">{order.customer.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Track */}
          {order.track && (
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#1E1E1E] mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#39B7FF]" />
                  Трек-номер
                </h3>
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <p className="font-mono text-lg font-bold text-green-700">{order.track}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-[#1E1E1E] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#39B7FF]" />
                История статусов
              </h3>
              <div className="space-y-3">
                {order.timeline.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#39B7FF] rounded-full flex items-center justify-center text-white">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 p-3 bg-[#F7FAFC] rounded-lg">
                      <p className="font-semibold">{step.label}</p>
                      <p className="text-xs text-[#666]">{step.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Commissions */}
          {showCommissions && (
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#1E1E1E] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#12C9B6]" />
                  Комиссии (Frozen 30 дней)
                </h3>
                <div className="space-y-2">
                  {order.commissions.map((comm, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div>
                        <p className="font-semibold">{comm.level} • {comm.partner}</p>
                        <Badge className="bg-orange-100 text-orange-700 text-xs mt-1">Frozen</Badge>
                      </div>
                      <p className="font-bold text-orange-600">₽{comm.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 sticky bottom-0 bg-white p-4 border-t border-[#E6E9EE]">
            <Button className="flex-1 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6]">
              Скачать чек
            </Button>
            {userRole === 'SEO' && (
              <Button variant="outline" className="flex-1">
                Редактировать
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

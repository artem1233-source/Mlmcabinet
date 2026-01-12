import { useState } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';

export function FinanceDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const payoutRequests = [
    { id: 'P-001', user: 'Александр И.', amount: 45000, status: 'pending', date: '2025-01-02', frozen: 12000, available: 33000 },
    { id: 'P-002', user: 'Мария П.', amount: 38000, status: 'processing', date: '2025-01-02', frozen: 8000, available: 30000 },
    { id: 'P-003', user: 'Дмитрий С.', amount: 25000, status: 'pending', date: '2025-01-03', frozen: 5000, available: 20000 },
    { id: 'P-004', user: 'Елена К.', amount: 52000, status: 'completed', date: '2025-01-01', frozen: 0, available: 52000 },
    { id: 'P-005', user: 'Игорь Н.', amount: 18000, status: 'rejected', date: '2025-01-01', frozen: 3000, available: 15000 },
  ];

  const refundRequests = [
    { id: 'R-001', order: 'ORD-12345', customer: 'Иван Петров', amount: 15000, type: 'full', status: 'requested', daysLeft: 12, hasFrozenCommissions: true },
    { id: 'R-002', order: 'ORD-12346', customer: 'Анна Сидорова', amount: 8000, type: 'partial', status: 'processing', daysLeft: 8, hasFrozenCommissions: true },
    { id: 'R-003', order: 'ORD-12347', customer: 'Петр Иванов', amount: 22000, type: 'full', status: 'requested', daysLeft: 2, hasFrozenCommissions: false },
  ];

  const filteredPayouts = payoutRequests.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, label: 'Ожидает' },
      processing: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: TrendingUp, label: 'В обработке' },
      completed: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Выплачено' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Отклонено' }
    };
    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;
    return (
      <Badge className={`${variant.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {variant.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Выплаты pending"
          value="₽108,000"
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          size="M"
        />
        <KPICard
          label="В обработке"
          value="₽38,000"
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          size="M"
        />
        <KPICard
          label="Выплачено за период"
          value="₽520,000"
          delta={18.5}
          trend="up"
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          size="M"
        />
        <KPICard
          label="Возвратов за период"
          value="₽45,000"
          delta={-12.3}
          trend="down"
          icon={<XCircle className="w-5 h-5 text-red-600" />}
          size="M"
        />
      </div>

      {/* Filters */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                <Input
                  placeholder="Поиск по ID или пользователю..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#E6E9EE] rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'processing', 'completed', 'rejected'].map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={statusFilter === status ? 'bg-[#39B7FF]' : ''}
                >
                  {status === 'all' ? 'Все' : 
                   status === 'pending' ? 'Ожидают' :
                   status === 'processing' ? 'В работе' :
                   status === 'completed' ? 'Выплачено' : 'Отклонено'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Requests */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#39B7FF]" />
            Заявки на выплату
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPayouts.map(payout => (
              <div key={payout.id} className="p-4 bg-[#F7FAFC] rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-bold">
                      {payout.user.split(' ')[0][0]}{payout.user.split(' ')[1][0]}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1E1E1E]">{payout.user}</p>
                      <p className="text-sm text-[#666]">{payout.id} • {payout.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(payout.status)}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#39B7FF]">₽{payout.amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666] mb-1">Заморожено (30 дней)</p>
                    <p className="font-semibold text-orange-600">₽{payout.frozen.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666] mb-1">Доступно к выплате</p>
                    <p className="font-semibold text-green-600">₽{payout.available.toLocaleString()}</p>
                  </div>
                </div>

                {payout.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Одобрить
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <XCircle className="w-4 h-4 mr-2" />
                      Отклонить
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Refund Requests */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Запросы на возврат
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {refundRequests.map(refund => (
              <div key={refund.id} className="p-4 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[#1E1E1E]">Заказ: {refund.order}</p>
                    <p className="text-sm text-[#666]">{refund.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-600">₽{refund.amount.toLocaleString()}</p>
                    <Badge className="bg-red-100 text-red-700 border-red-200 mt-1">
                      {refund.type === 'full' ? 'Полный возврат' : 'Частичный'}
                    </Badge>
                  </div>
                </div>

                {refund.hasFrozenCommissions && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-900">Комиссии заморожены</p>
                        <p className="text-xs text-orange-700 mt-1">
                          При возврате будет выполнено автоматическое сторно комиссий партнёров. 
                          Осталось {refund.daysLeft} дней до окончания freeze window.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600">
                    Выполнить возврат
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Отклонить
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
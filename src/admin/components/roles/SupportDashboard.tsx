import { useState } from 'react';
import { MessageCircle, Clock, CheckCircle, AlertCircle, Search, Send } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';

export function SupportDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tickets = [
    { id: 'T-001', customer: 'Иван Петров', order: 'ORD-12345', subject: 'Вопрос о доставке', status: 'new', priority: 'high', createdAt: '2025-01-03 10:25' },
    { id: 'T-002', customer: 'Анна Сидорова', order: 'ORD-12346', subject: 'Хочу вернуть товар', status: 'in_progress', priority: 'urgent', createdAt: '2025-01-03 09:15' },
    { id: 'T-003', customer: 'Петр Иванов', order: null, subject: 'Вопрос о продукте', status: 'new', priority: 'normal', createdAt: '2025-01-03 08:30' },
    { id: 'T-004', customer: 'Мария Козлова', order: 'ORD-12348', subject: 'Не пришёл товар', status: 'in_progress', priority: 'high', createdAt: '2025-01-02 16:45' },
    { id: 'T-005', customer: 'Сергей Новиков', order: 'ORD-12349', subject: 'Благодарность', status: 'resolved', priority: 'low', createdAt: '2025-01-02 14:20' },
  ];

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      new: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Новый' },
      in_progress: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'В работе' },
      resolved: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Решено' }
    };
    return <Badge className={`${variants[status as keyof typeof variants].color} border`}>{variants[status as keyof typeof variants].label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: { color: 'bg-red-500 text-white', label: '🔥 Срочно' },
      high: { color: 'bg-orange-500 text-white', label: 'Высокий' },
      normal: { color: 'bg-blue-500 text-white', label: 'Средний' },
      low: { color: 'bg-gray-400 text-white', label: 'Низкий' }
    };
    return <Badge className={variants[priority as keyof typeof variants].color}>{variants[priority as keyof typeof variants].label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Новые тикеты"
          value="18"
          icon={<MessageCircle className="w-5 h-5 text-blue-600" />}
          size="M"
          clickable
        />
        <KPICard
          label="В работе"
          value="12"
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          size="M"
          clickable
        />
        <KPICard
          label="Решено за период"
          value="145"
          delta={12.3}
          trend="up"
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          size="M"
        />
        <KPICard
          label="Среднее время ответа"
          value="Нет данных"
          icon={<Clock className="w-5 h-5 text-purple-600" />}
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
                  placeholder="Поиск по тикету, клиенту, теме..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#E6E9EE] rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'new', 'in_progress', 'resolved'].map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={statusFilter === status ? 'bg-[#39B7FF]' : ''}
                >
                  {status === 'all' ? 'Все' : 
                   status === 'new' ? 'Новые' :
                   status === 'in_progress' ? 'В работе' : 'Решено'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#39B7FF]" />
            Тикеты
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="p-4 bg-[#F7FAFC] rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-bold text-[#1E1E1E]">{ticket.id}</p>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="font-semibold text-[#1E1E1E] mb-1">{ticket.subject}</p>
                    <p className="text-sm text-[#666]">{ticket.customer} • {ticket.createdAt}</p>
                  </div>
                </div>

                {ticket.order && (
                  <div className="p-3 bg-white rounded-lg mb-3">
                    <p className="text-xs text-[#666] mb-1">Связанный заказ</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-semibold text-[#39B7FF]">{ticket.order}</p>
                      <Button size="sm" variant="outline">
                        Просмотр заказа
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {ticket.status === 'new' && (
                    <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600">
                      <Send className="w-4 h-4 mr-2" />
                      Взять в работу
                    </Button>
                  )}
                  {ticket.status === 'in_progress' && ticket.subject.toLowerCase().includes('вернуть') && (
                    <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Инициировать возврат
                    </Button>
                  )}
                  {ticket.status === 'in_progress' && (
                    <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Закрыть тикет
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    Открыть
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
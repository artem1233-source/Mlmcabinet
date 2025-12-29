import { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { ActionItem } from './ActionItem';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar } from '../ui/avatar';
import {
  Headphones,
  Clock,
  CheckCircle,
  MessageCircle,
  Search,
  AlertCircle,
  ThumbsUp,
  TrendingDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

interface SupportDashboardProps {
  currentUser: any;
}

// Mock данные для демонстрации Support Dashboard
const MOCK_TICKETS_CHART = [
  { date: '20 дек', new: 12, resolved: 15, pending: 8 },
  { date: '21 дек', new: 15, resolved: 13, pending: 10 },
  { date: '22 дек', new: 18, resolved: 16, pending: 12 },
  { date: '23 дек', new: 14, resolved: 18, pending: 8 },
  { date: '24 дек', new: 16, resolved: 14, pending: 10 },
  { date: '25 дек', new: 19, resolved: 17, pending: 12 },
  { date: '26 дек', new: 13, resolved: 16, pending: 9 },
];

const MOCK_CATEGORY_DISTRIBUTION = [
  { category: 'Технические', count: 45, fill: '#39B7FF' },
  { category: 'Платежи', count: 32, fill: '#10B981' },
  { category: 'Доставка', count: 28, fill: '#F59E0B' },
  { category: 'Продукт', count: 18, fill: '#8B5CF6' },
  { category: 'Прочее', count: 12, fill: '#6B7280' },
];

const MOCK_OPEN_TICKETS = [
  {
    id: 'T-1234',
    subject: 'Не приходит водородный порошок',
    customer: 'Иван Петров',
    category: 'Доставка',
    priority: 'high',
    created: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    assignee: 'Мария',
  },
  {
    id: 'T-1235',
    subject: 'Не могу войти в личный кабинет',
    customer: 'Алёна Смирнова',
    category: 'Технические',
    priority: 'critical',
    created: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    assignee: null,
  },
  {
    id: 'T-1236',
    subject: 'Вопрос по партнёрской программе',
    customer: 'Дмитрий Козлов',
    category: 'Продукт',
    priority: 'medium',
    created: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    assignee: 'Андрей',
  },
  {
    id: 'T-1237',
    subject: 'Не прошёл платёж',
    customer: 'Ольга Васильева',
    category: 'Платежи',
    priority: 'high',
    created: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    assignee: 'Мария',
  },
  {
    id: 'T-1238',
    subject: 'Как использовать порошок?',
    customer: 'Сергей Новиков',
    category: 'Продукт',
    priority: 'low',
    created: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    assignee: 'Андрей',
  },
];

export function SupportDashboard({ currentUser }: SupportDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Имитация загрузки
    setTimeout(() => setLoading(false), 800);
  }, []);

  // Вычисляем статистику
  const openTickets = MOCK_OPEN_TICKETS.length;
  const totalResolved = MOCK_TICKETS_CHART.reduce((sum, day) => sum + day.resolved, 0);
  const totalNew = MOCK_TICKETS_CHART.reduce((sum, day) => sum + day.new, 0);
  const avgResponseTime = 2.5; // часов
  const satisfactionRate = 94; // %

  const criticalTickets = MOCK_OPEN_TICKETS.filter(t => t.priority === 'critical');
  const unassignedTickets = MOCK_OPEN_TICKETS.filter(t => !t.assignee);

  const filteredTickets = searchQuery
    ? MOCK_OPEN_TICKETS.filter(t =>
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MOCK_OPEN_TICKETS;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { bg: '#FEE2E2', text: '#EF4444', border: '#EF4444', label: 'Критический' };
      case 'high':
        return { bg: '#FEF3C7', text: '#F59E0B', border: '#F59E0B', label: 'Высокий' };
      case 'medium':
        return { bg: '#E5F4FF', text: '#39B7FF', border: '#39B7FF', label: 'Средний' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', border: '#6B7280', label: 'Низкий' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* BIG 4 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Открытые тикеты"
          value={openTickets}
          delta={-8}
          deltaLabel="vs неделю"
          icon={MessageCircle}
          iconColor="#39B7FF"
          iconBgColor="#E5F4FF"
          status={openTickets > 20 ? 'warning' : 'ok'}
          size="large"
          loading={loading}
        />

        <KPICard
          title="Решено за неделю"
          value={totalResolved}
          delta={12}
          deltaLabel="vs пред. неделю"
          icon={CheckCircle}
          iconColor="#10B981"
          iconBgColor="#ECFDF5"
          status="ok"
          size="large"
          loading={loading}
        />

        <KPICard
          title="Avg время ответа"
          value={avgResponseTime}
          suffix="ч"
          delta={-15}
          deltaLabel="vs неделю"
          icon={Clock}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          status={avgResponseTime < 4 ? 'ok' : 'warning'}
          size="large"
          loading={loading}
        />

        <KPICard
          title="Удовлетворённость"
          value={satisfactionRate}
          suffix="%"
          delta={3}
          deltaLabel="vs месяц"
          icon={ThumbsUp}
          iconColor="#8B5CF6"
          iconBgColor="#F3E8FF"
          status={satisfactionRate > 90 ? 'ok' : 'warning'}
          size="large"
          loading={loading}
        />
      </div>

      {/* Alert Banner */}
      {(criticalTickets.length > 0 || unassignedTickets.length > 0) && (
        <div className="space-y-3">
          {criticalTickets.length > 0 && (
            <ActionItem
              severity="critical"
              title={`${criticalTickets.length} критических тикета требуют немедленного внимания`}
              subtitle={`Тикеты: ${criticalTickets.map(t => t.id).join(', ')}`}
              ctaLabel="Обработать"
              onAction={() => {
                console.log('Process critical tickets');
              }}
              timestamp="Срочно"
            />
          )}
          {unassignedTickets.length > 0 && (
            <ActionItem
              severity="warning"
              title={`${unassignedTickets.length} тикетов без исполнителя`}
              subtitle="Назначьте ответственного сотрудника для обработки"
              ctaLabel="Назначить"
              onAction={() => {
                console.log('Assign tickets');
              }}
              timestamp="Требует внимания"
            />
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Tickets Timeline */}
        <ChartContainer
          title="Динамика тикетов"
          subtitle="Новые, решённые и в работе"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={MOCK_TICKETS_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="new"
                stroke="#39B7FF"
                strokeWidth={2}
                name="Новые"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                stroke="#10B981"
                strokeWidth={2}
                name="Решённые"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="pending"
                stroke="#F59E0B"
                strokeWidth={2}
                name="В работе"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Category Distribution */}
        <ChartContainer
          title="Распределение по категориям"
          subtitle="Типы обращений"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={MOCK_CATEGORY_DISTRIBUTION}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {MOCK_CATEGORY_DISTRIBUTION.map((entry, index) => (
                  <Bar key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Open Tickets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Headphones className="w-4 h-4 text-blue-500" />
              </div>
              Открытые тикеты
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Поиск по тикету, клиенту..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              Загрузка...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-sm text-[#6B7280]">
                {searchQuery ? 'Ничего не найдено' : '🎉 Все тикеты обработаны'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map((ticket) => {
                const priority = getPriorityColor(ticket.priority);
                return (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    {/* Priority Indicator */}
                    <div
                      className="w-1 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: priority.border }}
                    />

                    {/* Ticket Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-[#1E1E1E]">
                          {ticket.subject}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            backgroundColor: priority.bg,
                            color: priority.text,
                            borderColor: priority.border,
                          }}
                        >
                          {priority.label}
                        </Badge>
                        {!ticket.assignee && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Без исполнителя
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                        <span>#{ticket.id}</span>
                        <span>• {ticket.customer}</span>
                        <span>• {ticket.category}</span>
                        <span>• {formatDate(ticket.created)}</span>
                      </div>
                    </div>

                    {/* Assignee */}
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Avatar className="w-8 h-8">
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs">
                            {ticket.assignee[0].toUpperCase()}
                          </div>
                        </Avatar>
                        <div className="text-xs text-[#6B7280]">
                          {ticket.assignee}
                        </div>
                      </div>
                    ) : (
                      <div className="shrink-0 min-w-[100px]">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => {
                            console.log('Assign ticket:', ticket.id);
                          }}
                        >
                          Назначить
                        </Button>
                      </div>
                    )}

                    {/* Actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        console.log('Open ticket:', ticket.id);
                      }}
                    >
                      Открыть
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Новые за сегодня</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  {MOCK_TICKETS_CHART[MOCK_TICKETS_CHART.length - 1].new}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  тикетов
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Решено за сегодня</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  {MOCK_TICKETS_CHART[MOCK_TICKETS_CHART.length - 1].resolved}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  тикетов
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Первый ответ</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  1.2 ч
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  среднее время
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

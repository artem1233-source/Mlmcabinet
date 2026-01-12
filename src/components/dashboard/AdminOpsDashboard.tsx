import { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar } from '../ui/avatar';
import {
  Users,
  UserCheck,
  UserPlus,
  Shield,
  Search,
  Download as DownloadIcon,
  Calendar,
  UserX,
  TrendingUp,
  Activity,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { exportDashboard } from '../../utils/exportCSV';
import { dashboardExporters } from '../../utils/dashboardExport';
import { useDrilldown, createDrilldown } from './DrilldownProvider';
import { 
  parsePeriod, 
  filterByPeriod, 
  calculatePeriodSum,
  calculatePeriodMetrics,
  groupByDay,
  getPreviousPeriodRange,
  calculateDelta
} from '../../utils/periodCalculations';
import { toast } from 'sonner';

interface AdminOpsDashboardProps {
  currentUser: any;
  period?: string;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  admins: number;
  partners: number;
}

export function AdminOpsDashboard({ currentUser, period = '30' }: AdminOpsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); // Сохраняем все данные для фильтрации
  const [chartData, setChartData] = useState<any[]>([]);
  const [rankDistribution, setRankDistribution] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { navigateToPage } = useDrilldown();
  const periodDays = parsePeriod(period);

  useEffect(() => {
    loadAdminOpsData();
  }, []);

  // Пересчитываем статистику при изменении периода
  useEffect(() => {
    if (allUsers.length > 0) {
      recalculateStats(allUsers);
    }
  }, [period]);

  // Слушаем событие экспорта
  useEffect(() => {
    const handleExport = () => {
      handleExportData();
    };
    window.addEventListener('dashboard-export', handleExport);
    return () => window.removeEventListener('dashboard-export', handleExport);
  }, [allUsers, stats]);

  const recalculateStats = (users: any[]) => {
    console.log(`📊 Recalculating stats for period: ${periodDays} days`);
    
    // Фильтруем пользователей по периоду регистрации
    const currentPeriodUsers = filterByPeriod(users, 'дата_регистрации', periodDays);
    const previousPeriod = getPreviousPeriodRange(periodDays);
    
    const previousPeriodUsers = users.filter((u: any) => {
      if (!u.дата_регистрации) return false;
      const regDate = new Date(u.дата_регистрации);
      return regDate >= previousPeriod.start && regDate <= previousPeriod.end;
    });

    // Активность определяем по наличию заказов или баланса
    const activeUsers = currentPeriodUsers.filter((u: any) => {
      const hasBalance = (u.баланс || 0) > 0;
      const hasEarnings = (u.totalEarnings || 0) > 0;
      return hasBalance || hasEarnings;
    });

    const previousActiveUsers = previousPeriodUsers.filter((u: any) => {
      const hasBalance = (u.баланс || 0) > 0;
      const hasEarnings = (u.totalEarnings || 0) > 0;
      return hasBalance || hasEarnings;
    });

    const admins = users.filter((u: any) => u.isAdmin);
    const partners = users.filter((u: any) => !u.isAdmin);

    // Вычисляем дельты
    const totalDelta = calculateDelta(users.length, users.length);
    const activeDelta = calculateDelta(activeUsers.length, previousActiveUsers.length);
    const newUsersDelta = calculateDelta(currentPeriodUsers.length, previousPeriodUsers.length);

    setStats({
      total: users.length,
      active: activeUsers.length,
      inactive: users.length - activeUsers.length,
      newToday: currentPeriodUsers.filter((u: any) => {
        const regDate = new Date(u.дата_регистрации);
        const today = new Date();
        return regDate.toDateString() === today.toDateString();
      }).length,
      newThisWeek: currentPeriodUsers.length,
      newThisMonth: currentPeriodUsers.length,
      admins: admins.length,
      partners: partners.length,
    });

    // График регистраций
    const registrationChartData = groupByDay(
      users,
      'дата_регистрации',
      'id',
      periodDays
    );
    
    setChartData(registrationChartData.map(d => ({
      date: d.date,
      registrations: d.value,
    })));

    // Последние 10 зарегистрированных
    const sortedByDate = [...users]
      .filter((u: any) => u.дата_регистрации)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.дата_регистрации).getTime();
        const dateB = new Date(b.дата_регистрации).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);

    setRecentUsers(sortedByDate);

    // Распределение по уровням
    const rankCounts: { [key: string]: number } = {
      '1': 0,
      '2': 0,
      '3': 0,
    };

    users.forEach((u: any) => {
      const level = u.уровень || u.level || 1;
      rankCounts[level] = (rankCounts[level] || 0) + 1;
    });

    const rankDistrib = [
      { name: 'Уровень 1', value: rankCounts['1'], fill: '#39B7FF' },
      { name: 'Уровень 2', value: rankCounts['2'], fill: '#10B981' },
      { name: 'Уровень 3', value: rankCounts['3'], fill: '#8B5CF6' },
    ];

    setRankDistribution(rankDistrib);
  };

  const loadAdminOpsData = async () => {
    try {
      setLoading(true);

      // Загружаем всех пользователей
      const usersUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users`;
      const usersResponse = await fetch(usersUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
      });

      if (!usersResponse.ok) {
        throw new Error('Failed to load users');
      }

      const usersData = await usersResponse.json();
      const users = usersData.users || [];

      console.log('👥 Admin Ops loaded users:', users.length);

      setAllUsers(users);
      recalculateStats(users);

    } catch (error) {
      console.error('❌ Error loading Admin Ops data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    dashboardExporters.admin({
      kpis: [
        { title: 'Всего пользователей', value: stats?.total || 0, period },
        { title: 'Активные', value: stats?.active || 0, period },
        { title: 'Новые за период', value: stats?.newThisWeek || 0, period },
        { title: 'Админы', value: stats?.admins || 0, period },
      ],
      charts: [
        { name: 'Registrations', data: chartData },
        { name: 'RankDistribution', data: rankDistribution },
      ],
    });
    toast.success('Данные экспортированы в CSV');
  };

  const handleDrilldownToUsers = (filters?: any) => {
    navigateToPage('/admin/users', createDrilldown.users(filters, 'Управление пользователями'));
  };

  const filteredUsers = searchQuery
    ? recentUsers.filter((u) => {
        const query = searchQuery.toLowerCase();
        return (
          u.имя?.toLowerCase().includes(query) ||
          u.фамилия?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.id?.toLowerCase().includes(query)
        );
      })
    : recentUsers;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="space-y-6">
      {/* BIG 4 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Всего пользователей"
          value={stats?.total || 0}
          delta={stats?.newThisMonth ? ((stats.newThisMonth / stats.total) * 100) : 0}
          deltaLabel="новых за период"
          icon={Users}
          iconColor="#39B7FF"
          iconBgColor="#E5F4FF"
          status="ok"
          size="large"
          loading={loading}
          onClick={() => handleDrilldownToUsers()}
        />

        <KPICard
          title="Активные"
          value={stats?.active || 0}
          delta={stats?.active && stats?.total ? ((stats.active / stats.total) * 100) : 0}
          deltaLabel="от общего числа"
          icon={Activity}
          iconColor="#10B981"
          iconBgColor="#ECFDF5"
          status="ok"
          size="large"
          loading={loading}
          onClick={() => handleDrilldownToUsers({ status: 'active' })}
        />

        <KPICard
          title={`Новые за ${periodDays === 1 ? 'день' : periodDays === 7 ? 'неделю' : `${periodDays} дней`}`}
          value={stats?.newThisWeek || 0}
          delta={stats?.newToday || 0}
          deltaLabel="сегодня"
          icon={UserPlus}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          status={stats && stats.newThisWeek > 10 ? 'ok' : 'warning'}
          size="large"
          loading={loading}
          onClick={() => handleDrilldownToUsers({ period: periodDays })}
        />

        <KPICard
          title="Админы"
          value={stats?.admins || 0}
          icon={Shield}
          iconColor="#8B5CF6"
          iconBgColor="#F3E8FF"
          status="ok"
          size="large"
          loading={loading}
          onClick={() => handleDrilldownToUsers({ role: 'admin' })}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Registrations Chart */}
        <ChartContainer
          title="Регистрации по дням"
          subtitle="Последние 30 дней"
          loading={loading}
          empty={chartData.length === 0}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
                dataKey="registrations"
                stroke="#39B7FF"
                strokeWidth={3}
                name="Регистрации"
                dot={{ fill: '#39B7FF', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Rank Distribution */}
        <ChartContainer
          title="Распределение по уровням"
          subtitle="Партнёрская сеть"
          loading={loading}
          empty={rankDistribution.length === 0}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={rankDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {rankDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Recent Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              Последние регистрации
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Поиск по имени, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  exportDashboard(recentUsers);
                  toast.success('Данные экспортированы в CSV');
                }}
              >
                <DownloadIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              Загрузка...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 shrink-0">
                    {user.аватар ? (
                      <img src={user.аватар} alt={user.имя} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white">
                        {user.имя?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-[#1E1E1E] truncate">
                        {user.имя} {user.фамилия}
                      </div>
                      {user.isAdmin && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#6B7280] mt-0.5">
                      <span>ID: {user.id}</span>
                      {user.email && <span>• {user.email}</span>}
                    </div>
                  </div>

                  {/* Level Badge */}
                  <Badge
                    variant="outline"
                    className="shrink-0"
                    style={{
                      backgroundColor: user.уровень === 3 ? '#F3E8FF' : user.уровень === 2 ? '#ECFDF5' : '#E5F4FF',
                      color: user.уровень === 3 ? '#8B5CF6' : user.уровень === 2 ? '#10B981' : '#39B7FF',
                      borderColor: user.уровень === 3 ? '#8B5CF6' : user.уровень === 2 ? '#10B981' : '#39B7FF',
                    }}
                  >
                    Уровень {user.уровень || 1}
                  </Badge>

                  {/* Balance */}
                  <div className="text-right shrink-0 min-w-[100px]">
                    <div className="text-sm font-semibold text-[#10B981]">
                      {(user.баланс || 0).toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      баланс
                    </div>
                  </div>

                  {/* Registration Date */}
                  <div className="text-right shrink-0 min-w-[120px]">
                    <div className="text-xs text-[#6B7280]">
                      {user.дата_регистрации ? formatDate(user.дата_регистрации) : '—'}
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      console.log('View user:', user.id);
                      // TODO: navigate to user profile
                    }}
                  >
                    Просмотр
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Неактивные</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  {stats?.inactive || 0}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  {stats?.total ? Math.round((stats.inactive / stats.total) * 100) : 0}% от общего числа
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <UserX className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Партнёры</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  {stats?.partners || 0}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  активная сеть
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Сегодня</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  +{stats?.newToday || 0}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  новых регистраций
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
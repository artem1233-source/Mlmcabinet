import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Users, Wallet, ArrowUpRight, Loader2, RefreshCw, DollarSign, Package, TrendingDown, Calendar, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { AdminToolbar } from './AdminToolbar';
import { AchievementsWidget } from './AchievementsWidget';
import * as api from '../utils/api';
import { toast } from 'sonner';
import { isDemoMode } from '../utils/demoApi';
import { useDemoUser } from '../contexts/DemoUserContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AdvancedAnalytics } from './AdvancedAnalytics';

interface DashboardRuProps {
  currentUser: any;
  onRefresh: () => void;
  refreshTrigger: number;
}

export function DashboardRu({ currentUser, onRefresh, refreshTrigger }: DashboardRuProps) {
  const { isDemoMode: demoMode, currentUserId } = useDemoUser();
  const isAdmin = currentUser?.isAdmin === true || currentUser?.email === 'admin@admin.com';
  const showAdminToolbar = isAdmin || demoMode;
  
  const effectiveUserId = demoMode && currentUserId ? currentUserId : currentUser?.id;
  
  const [stats, setStats] = useState({
    totalEarnings: 0,
    monthEarnings: 0,
    activeOrders: 0,
    teamSize: 0
  });
  const [adminStats, setAdminStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 🆕 Состояние для команды (нужно для AdvancedAnalytics)
  const [team, setTeam] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  
  // 🆕 Новые состояния для расширенной аналитики
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [teamGrowthData, setTeamGrowthData] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any>({
    total: 0,
    active: 0,
    leaders: 0
  });
  const [periodComparison, setPeriodComparison] = useState<any>({
    currentRevenue: 0,
    previousRevenue: 0,
    currentTeam: 0,
    previousTeam: 0,
    currentOrders: 0,
    previousOrders: 0
  });
  const [showForecast, setShowForecast] = useState(false);
  const [forecastPartners, setForecastPartners] = useState(5);

  useEffect(() => {
    console.log('🔄 DashboardRu: effectiveUserId changed:', effectiveUserId);
    if (effectiveUserId) {
      loadDashboardData();
    }
  }, [refreshTrigger, effectiveUserId]);

  const loadDashboardData = async (showRefreshing = false) => {
    if (!effectiveUserId) {
      console.warn('Cannot load dashboard: effectiveUserId not available');
      setLoading(false);
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log('📊 DashboardRu: Loading data for user:', effectiveUserId);
      
      // Load admin stats if admin
      if (isAdmin) {
        const adminData = await api.getAdminStats().catch(() => ({ success: false }));
        if (adminData.success) {
          setAdminStats(adminData.stats);
        }
      }

      // Load all data in parallel
      const [ordersData, earningsData, teamData] = await Promise.all([
        api.getOrders().catch(() => ({ success: false, orders: [] })),
        api.getEarnings().catch(() => ({ success: false, earnings: [] })),
        api.getUserTeam(effectiveUserId).catch(() => ({ success: false, team: [] }))
      ]);

      // Process orders
      const orders = ordersData.success ? ordersData.orders : [];
      const activeOrders = orders.filter((o: any) => o.статус === 'pending').length;
      setRecentOrders(orders.slice(0, 5));
      setAllOrders(orders);

      // Process earnings
      const earningsArr = earningsData.success ? earningsData.earnings : [];
      setEarnings(earningsArr);

      const totalEarnings = earningsArr.reduce((sum: number, e: any) => sum + (e.сумма || e.amount || 0), 0);
      
      // Calculate month earnings
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEarnings = earningsArr
        .filter((e: any) => new Date(e.дата || e.createdAt) >= monthStart)
        .reduce((sum: number, e: any) => sum + (e.сумма || e.amount || 0), 0);

      // Process team
      const teamArr = teamData.success ? teamData.team : [];
      const teamSize = teamArr.length;
      setTeam(teamArr);

      setStats({
        totalEarnings,
        monthEarnings,
        activeOrders,
        teamSize
      });

      console.log('✅ DashboardRu: Stats loaded:', { totalEarnings, monthEarnings, activeOrders, teamSize });

      // Generate chart data (last 7 days)
      const chartDataArr = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayEarnings = earningsArr
          .filter((e: any) => {
            const eDate = new Date(e.дата || e.createdAt);
            return eDate >= date && eDate < nextDate;
          })
          .reduce((sum: number, e: any) => sum + (e.сумма || e.amount || 0), 0);
        
        chartDataArr.push({
          date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
          доход: dayEarnings
        });
      }
      setChartData(chartDataArr);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Не удалось загрузить данные дашборда');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
    onRefresh();
  };

  // Guard clause
  if (!currentUser || !currentUser.имя) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
            <p className="text-[#666]">Загрузка профиля...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
            <p className="text-[#666]">Загрузка дашборда...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      {/* Admin Toolbar */}
      {showAdminToolbar && <AdminToolbar userName={currentUser.имя} onUserChange={onRefresh} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-[#1E1E1E] mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
            {isAdmin ? '�� Панель администратора' : `Добро пожаловаь, ${currentUser.имя}! 👋`}
          </h1>
          <p className="text-[#666]">
            {isAdmin 
              ? 'Глобальная статистика и управление системой'
              : `Уровень ${currentUser.уровень} • Рефкод: ${currentUser.рефКод}`
            }
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-white transition-colors"
          title="Обновить данные"
        >
          <RefreshCw className={`w-5 h-5 text-[#666] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Admin Global Stats */}
      {isAdmin && adminStats && (
        <>
          <div className="mb-4">
            <h2 className="text-[#1E1E1E] mb-4" style={{ fontSize: '18px', fontWeight: '700' }}>
              🌍 Глобальная статистика системы
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                  ₽{(adminStats.revenue?.total || 0).toLocaleString()}
                </div>
                <div className="text-[#666]" style={{ fontSize: '13px' }}>Общая выручка</div>
              </CardContent>
            </Card>

            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                  {adminStats.users?.total || 0}
                </div>
                <div className="text-[#666]" style={{ fontSize: '13px' }}>Всего партнёров</div>
              </CardContent>
            </Card>

            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                  {adminStats.orders?.total || 0}
                </div>
                <div className="text-[#666]" style={{ fontSize: '13px' }}>Всего заказов</div>
              </CardContent>
            </Card>

            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-orange-50 to-amber-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                  ₽{(adminStats.finance?.pendingWithdrawals || 0).toLocaleString()}
                </div>
                <div className="text-[#666]" style={{ fontSize: '13px' }}>Ожидают выплаты</div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4">
            <h2 className="text-[#1E1E1E] mb-4" style={{ fontSize: '18px', fontWeight: '700' }}>
              👤 Личная статистика
            </h2>
          </div>
        </>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[#666]" style={{ fontSize: '14px', fontWeight: '500' }}>Текущий баланс</div>
              <div className="w-8 h-8 bg-[#39B7FF]/10 rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#39B7FF]" />
              </div>
            </div>
            <div className="text-[#39B7FF] mb-2" style={{ fontSize: '32px', fontWeight: '700', lineHeight: '1' }}>
              {(currentUser.баланс || 0).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[#666]" style={{ fontSize: '13px' }}>Доступно для вывода</div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[#666]" style={{ fontSize: '14px', fontWeight: '500' }}>Доход за месяц</div>
              <div className="w-8 h-8 bg-[#12C9B6]/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#12C9B6]" />
              </div>
            </div>
            <div className="text-[#12C9B6] mb-2" style={{ fontSize: '32px', fontWeight: '700', lineHeight: '1' }}>
              {(stats.monthEarnings || 0).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[#12C9B6]" style={{ fontSize: '13px' }}>
              ↑ +{stats.monthEarnings > 0 ? '100' : '0'}% от прошлого месяца
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[#666]" style={{ fontSize: '14px', fontWeight: '500' }}>Всего заработано</div>
              <div className="w-8 h-8 bg-[#39B7FF]/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#39B7FF]" />
              </div>
            </div>
            <div className="text-[#39B7FF] mb-2" style={{ fontSize: '32px', fontWeight: '700', lineHeight: '1' }}>
              {(stats.totalEarnings || 0).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[#666]" style={{ fontSize: '13px' }}>За всё время</div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[#666]" style={{ fontSize: '14px', fontWeight: '500' }}>Команда</div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="text-purple-600 mb-2" style={{ fontSize: '32px', fontWeight: '700', lineHeight: '1' }}>
              {stats.teamSize}
            </div>
            <div className="text-[#666]" style={{ fontSize: '13px' }}>Активных партнёров</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-6 lg:mb-8">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E]">График доходов (7 дней)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#666"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₽${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E6E9EE',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => [`₽${value.toLocaleString()}`, 'Доход']}
              />
              <Line 
                type="monotone" 
                dataKey="доход" 
                stroke="#39B7FF" 
                strokeWidth={3}
                dot={{ fill: '#39B7FF', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-6 lg:mb-8">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E]">Последние заказы</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-[#666]">Пока нет заказов</p>
              <p className="text-[#666] mt-1" style={{ fontSize: '13px' }}>
                Создайте первый заказ в разделе Каталог
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      order.статус === 'completed' || order.статус === 'paid' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      <ShoppingBag className={`w-5 h-5 ${
                        order.статус === 'completed' || order.статус === 'paid' ? 'text-green-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                        {order.товар}
                      </p>
                      <p className="text-[#666]" style={{ fontSize: '13px' }}>
                        {new Date(order.датаЗаказа || order.дата).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                      {(order.суммаЗаказа || order.общаяСумма || order.цена || 0).toLocaleString('ru-RU')}₽
                    </p>
                    <p className={`text-${order.статус === 'completed' || order.статус === 'paid' ? 'green' : 'orange'}-600`} style={{ fontSize: '12px' }}>
                      {order.статус === 'completed' || order.статус === 'paid' ? 'Завершён' : order.статус === 'pending' ? 'Ожидание' : 'Обработка'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 🎮 Achievements Widget */}
      <div className="mb-6 lg:mb-8">
        <AchievementsWidget onNavigate={() => {
          // This will be handled by parent component
          window.dispatchEvent(new CustomEvent('navigate-to-achievements'));
        }} />
      </div>
      
      {/* 🆕 Advanced Analytics Section */}
      <div className="mt-6 lg:mt-8">
        <AdvancedAnalytics 
          earnings={earnings} 
          orders={allOrders} 
          team={team} 
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
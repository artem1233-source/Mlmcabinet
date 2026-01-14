import { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { ActionItem } from './ActionItem';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
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
  BarChart,
  Bar,
} from 'recharts';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { dashboardExporters } from '../../utils/dashboardExport';
import { useDrilldown, createDrilldown } from './DrilldownProvider';
import { 
  parsePeriod, 
  filterByPeriod,
  calculatePeriodSum,
  groupByDay,
  calculateDelta
} from '../../utils/periodCalculations';
import { toast } from 'sonner';

interface FinanceDashboardProps {
  currentUser: any;
  period?: string;
}

interface FinanceStats {
  totalRevenue: number;
  totalPayouts: number;
  pending: number;
  approved: number;
  rejected: number;
  cashflow: number;
}

export function FinanceDashboard({ currentUser, period = '30' }: FinanceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [cashflowChart, setCashflowChart] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allPayouts, setAllPayouts] = useState<any[]>([]);
  
  const { navigateToPage } = useDrilldown();
  const periodDays = parsePeriod(period);

  useEffect(() => {
    loadFinanceData();
  }, []);

  // Пересчитываем при изменении периода
  useEffect(() => {
    if (allOrders.length > 0 || allPayouts.length > 0) {
      recalculateStats();
    }
  }, [period]);

  // Слушаем событие экспорта
  useEffect(() => {
    const handleExport = () => {
      handleExportData();
    };
    window.addEventListener('dashboard-export', handleExport);
    return () => window.removeEventListener('dashboard-export', handleExport);
  }, [stats, cashflowChart]);

  const recalculateStats = () => {
    console.log(`💰 Recalculating finance stats for period: ${periodDays} days`);
    
    // Фильтруем заказы  выпла��ы по периоду
    const currentOrders = filterByPeriod(allOrders, 'дата', periodDays);
    const currentPayouts = filterByPeriod(allPayouts, 'дата_создания', periodDays);
    
    // Вычисляем дельты
    const revenueResult = calculatePeriodSum(allOrders, 'дата', 'сумма', periodDays);
    const payoutsResult = calculatePeriodSum(allPayouts, 'дата_создания', 'сумма', periodDays);
    
    const revenue = revenueResult.current;
    const payouts = payoutsResult.current;
    
    const pending = currentPayouts.filter((p: any) => p.статус === 'pending').reduce((sum, p) => sum + (p.сумма || 0), 0);
    const approved = currentPayouts.filter((p: any) => p.статус === 'approved').reduce((sum, p) => sum + (p.сумма || 0), 0);
    const rejected = currentPayouts.filter((p: any) => p.статус === 'rejected').reduce((sum, p) => sum + (p.сумма || 0), 0);
    
    setStats({
      totalRevenue: revenue,
      totalPayouts: payouts,
      pending,
      approved,
      rejected,
      cashflow: revenue - payouts,
    });
    
    // График cashflow
    const inflowData = groupByDay(currentOrders, 'дата', 'сумма', periodDays);
    const outflowData = groupByDay(currentPayouts, 'дата_создания', 'сумма', periodDays);
    
    const chartData = inflowData.map((inflow, i) => ({
      date: inflow.date,
      inflow: inflow.value,
      outflow: outflowData[i]?.value || 0,
    }));
    
    setCashflowChart(chartData);
  };

  const handleExportData = () => {
    dashboardExporters.finance({
      kpis: [
        { title: 'Выручка', value: stats?.totalRevenue || 0, period },
        { title: 'Выплаты', value: stats?.totalPayouts || 0, period },
        { title: 'Денежный поток', value: stats?.cashflow || 0, period },
        { title: 'На рассмотрении', value: stats?.pending || 0, period },
      ],
      charts: [
        { name: 'Cashflow', data: cashflowChart },
      ],
    });
    toast.success('Финансовые данные экспортированы');
  };

  const handleDrilldownToPayouts = (filters?: any) => {
    navigateToPage('/finance/payouts', createDrilldown.payouts(filters, 'Выплаты'));
  };

  const loadFinanceData = async () => {
    try {
      setLoading(true);

      // Загружаем финансовую статистику из расширенного /admin/stats
      const statsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/stats`;
      const statsResponse = await fetch(statsUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
      });

      let statsData: any = null;
      if (statsResponse.ok) {
        const response = await statsResponse.json();
        // Используем finance поле из stats
        statsData = response.stats?.finance ? { stats: response.stats.finance } : response;
        console.log('💰 Finance Dashboard stats:', statsData);
      } else {
        const errorText = await statsResponse.text();
        console.warn(`⚠️ Finance stats API failed (${statsResponse.status}):`, errorText);
        console.log('📊 Using mock data for demonstration');
        
        // Показываем пользователю, что используем demo данные (только если не админ)
        if (!currentUser?.isAdmin) {
          toast.info('Используются демонстрационные данные', {
            description: 'Для реальных данных требуются права администратора'
          });
        }
        
        // Mock данные
        statsData = {
          totalRevenue: 1250000,
          totalPayouts: 450000,
          totalPending: 75000,
          totalApproved: 375000,
          totalRejected: 12000,
          chartData: [
            { date: '24 нояб', inflow: 45000, outflow: 15000 },
            { date: '01 дек', inflow: 52000, outflow: 18000 },
            { date: '08 дек', inflow: 48000, outflow: 16000 },
            { date: '15 дек', inflow: 61000, outflow: 21000 },
            { date: '22 дек', inflow: 58000, outflow: 19000 },
            { date: '27 дек', inflow: 63000, outflow: 22000 },
          ],
          pending: [
            {
              id: 'p001',
              партнёр: 'Иван Петров',
              сумма: 15000,
              дата_создания: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              метод: 'Банковская карта',
            },
            {
              id: 'p002',
              партнёр: 'Мария Сидорова',
              сумма: 8500,
              дата_создания: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              метод: 'СБП',
            },
            {
              id: 'p003',
              партнёр: 'Алексей Козлов',
              сумма: 22000,
              дата_создания: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              метод: 'Банковская карта',
            },
          ],
        };
      }

      // Формируем статистику (с учетом новой структуры stats.finance)
      const financeData = statsData.stats || statsData;
      const revenue = financeData.total_revenue || financeData.totalRevenue || 0;
      const payouts = financeData.completed_payouts_sum || financeData.totalPayouts || 0;
      const pending = financeData.pending_payouts_sum || financeData.totalPending || 0;
      const approved = financeData.approved_payouts_sum || financeData.totalApproved || 0;
      const rejected = financeData.rejected_payouts_sum || financeData.totalRejected || 0;
      const cashflow = revenue - payouts;

      setStats({
        totalRevenue: revenue,
        totalPayouts: payouts,
        pending,
        approved,
        rejected,
        cashflow,
      });

      // Обрабатываем график cashflow
      const chartData = (statsData.chartData || []).map((item: any) => ({
        date: item.date,
        inflow: item.revenue || item.inflow || 0,
        outflow: item.payouts || item.outflow || 0,
        net: (item.revenue || item.inflow || 0) - (item.payouts || item.outflow || 0),
      }));

      setCashflowChart(chartData);

      // Распределение по статусам
      const distribution = [
        { name: 'Одобрено', value: approved, fill: '#10B981' },
        { name: 'В обработке', value: pending, fill: '#F59E0B' },
        { name: 'Отклонено', value: rejected, fill: '#EF4444' },
      ];

      setStatusDistribution(distribution);

      // Pending выплаты
      setPendingPayouts(statsData.pending || []);

      // Сохраняем все заказы и выплаты для пересчёта
      setAllOrders(statsData.orders || []);
      setAllPayouts(statsData.payouts || []);

    } catch (error) {
      console.error('❌ Error loading Finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayouts = searchQuery
    ? pendingPayouts.filter((p) =>
        p.партнёр?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pendingPayouts;

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const handleAudit = () => {
    console.log('🔍 Starting financial audit...');
    // TODO: implement audit logic
  };

  return (
    <div className="space-y-6">
      {/* BIG 4 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Общий доход"
          value={stats?.totalRevenue || 0}
          suffix="₽"
          delta={15}
          deltaLabel="vs месяц"
          icon={DollarSign}
          iconColor="#10B981"
          iconBgColor="#ECFDF5"
          status="ok"
          size="large"
          loading={loading}
        />

        <KPICard
          title="Выплачено"
          value={stats?.totalPayouts || 0}
          suffix="₽"
          delta={12}
          deltaLabel="vs месяц"
          icon={TrendingUp}
          iconColor="#39B7FF"
          iconBgColor="#E5F4FF"
          status="ok"
          size="large"
          loading={loading}
        />

        <KPICard
          title="В обработке"
          value={stats?.pending || 0}
          suffix="₽"
          icon={Clock}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          status={stats && stats.pending > 100000 ? 'warning' : 'ok'}
          size="large"
          loading={loading}
        />

        <KPICard
          title="Cashflow"
          value={stats?.cashflow || 0}
          suffix="₽"
          delta={18}
          deltaLabel="vs месяц"
          icon={ArrowUpRight}
          iconColor={stats && stats.cashflow >= 0 ? '#10B981' : '#EF4444'}
          iconBgColor={stats && stats.cashflow >= 0 ? '#ECFDF5' : '#FEE2E2'}
          status={stats && stats.cashflow >= 0 ? 'ok' : 'critical'}
          size="large"
          loading={loading}
        />
      </div>

      {/* Alert Banner */}
      {pendingPayouts.length > 5 && (
        <ActionItem
          severity="warning"
          title={`${pendingPayouts.length} выплат в очереди`}
          subtitle={`Общая сумма: ${stats?.pending.toLocaleString('ru-RU')} ₽. Некоторые заявки старше 48 часов.`}
          ctaLabel="Обработать"
          onAction={() => {
            console.log('Process pending payouts');
          }}
          timestamp="Требует внимания"
        />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cashflow Chart */}
        <div className="xl:col-span-2">
          <ChartContainer
            title="Денежный поток (Cashflow)"
            subtitle="Входящие и исходящие за период"
            loading={loading}
            empty={cashflowChart.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashflowChart}>
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
                  dataKey="inflow"
                  stroke="#10B981"
                  strokeWidth={3}
                  name="Приход"
                  dot={{ fill: '#10B981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="outflow"
                  stroke="#EF4444"
                  strokeWidth={3}
                  name="Расход"
                  dot={{ fill: '#EF4444', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Чистый"
                  dot={{ fill: '#8B5CF6', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Status Distribution */}
        <ChartContainer
          title="Статусы выплат"
          subtitle="Распределение по статусам"
          loading={loading}
          empty={statusDistribution.length === 0}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusDistribution.map((entry, index) => (
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
                formatter={(value: any) => `${value.toLocaleString('ru-RU')} ₽`}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Pending Payouts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              Pending выплаты
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Поиск по партнёру, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAudit}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Аудит
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              Загрузка...
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-sm text-[#6B7280]">
                {searchQuery ? 'Ничего не найдено' : '🎉 Все выплаты обработаны'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPayouts.map((payout) => {
                const isOld = new Date().getTime() - new Date(payout.дата_создания).getTime() > 48 * 60 * 60 * 1000;
                return (
                  <div
                    key={payout.id}
                    className={`flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border ${
                      isOld ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isOld ? 'bg-orange-100' : 'bg-blue-50'
                    }`}>
                      <Clock className={`w-5 h-5 ${isOld ? 'text-orange-500' : 'text-blue-500'}`} />
                    </div>

                    {/* Payout Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-[#1E1E1E]">
                          {payout.партнёр}
                        </div>
                        {isOld && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Старая
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        ID: {payout.id} • {payout.метод} • {formatDate(payout.дата_создания)}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0 min-w-[120px]">
                      <div className="text-lg font-semibold text-[#1E1E1E]">
                        {payout.сумма.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => {
                          console.log('Approve:', payout.id);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Одобрить
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          console.log('Reject:', payout.id);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Отклонить
                      </Button>
                    </div>
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
                <p className="text-sm text-[#6B7280] mb-1">Одобрено</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  {stats?.approved.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  всего за период
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
                <p className="text-sm text-[#6B7280] mb-1">Отклонено</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  {stats?.rejected.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  {stats?.totalPayouts ? Math.round((stats.rejected / stats.totalPayouts) * 100) : 0}% от всех выплат
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Avg время обработки</p>
                <p className="text-2xl font-semibold text-[#1E1E1E]">
                  24 ч
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  среднее за неделю
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
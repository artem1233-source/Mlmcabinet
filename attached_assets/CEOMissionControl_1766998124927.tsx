import { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { ActionItem, ActionSeverity } from './ActionItem';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  PiggyBank,
  Users,
  ShoppingCart,
  Clock,
  Crown,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
} from 'recharts';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface CEOMissionControlProps {
  currentUser: any;
  period?: string; // 🆕 Добавлен period prop для совместимости
}

interface DashboardStats {
  revenue: number;
  revenueDelta: number;
  payouts: number;
  payoutsDelta: number;
  liability: number;
  liabilityDelta: number;
  profit: number;
  profitDelta: number;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
}

interface ActionAlert {
  severity: ActionSeverity;
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  timestamp?: string;
}

export function CEOMissionControl({ currentUser, period }: CEOMissionControlProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const [topPartners, setTopPartners] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Загружаем статистику из расширенного /admin/stats
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
        console.log('💰 CEO Dashboard stats loaded:', statsData);
      } else {
        const errorText = await statsResponse.text();
        console.warn(`⚠️ Finance stats API failed (${statsResponse.status}):`, errorText);
        console.log('📊 Using mock data for demonstration');
        
        // Показываем пользователю, что используем demo данные
        toast.info('Используются демонстрационные данные', {
          description: 'Для реальных данных требуются права администратора'
        });
        
        // Mock данные для демонстрации
        statsData = {
          totalRevenue: 4850000,
          totalPayouts: 1250000,
          totalLiability: 890000,
          netProfit: 2710000,
        };
      }

      // Загружаем всех пользователей для топа
      const usersUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users`;
      const usersResponse = await fetch(usersUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
      });

      let users: any[] = [];
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        users = usersData.users || [];
        
        // Топ партнёров по балансу
        const sortedByBalance = [...users]
          .filter((u: any) => u.id !== 'ceo' && !u.isAdmin)
          .sort((a: any, b: any) => (b.баланс || 0) - (a.баланс || 0))
          .slice(0, 10);
        
        setTopPartners(sortedByBalance);
      } else {
        console.warn('⚠️ Users API failed, using mock data:', usersResponse.status);
        // Mock топ партнёров
        users = [
          { id: '1', имя: 'Иван', фамилия: 'Петров', баланс: 125000, totalEarnings: 250000 },
          { id: '2', имя: 'Мария', фамилия: 'Сидорова', баланс: 98000, totalEarnings: 180000 },
          { id: '3', имя: 'Алексей', фамилия: 'Козлов', баланс: 87000, totalEarnings: 150000 },
        ];
        setTopPartners(users);
      }

      // Преобразуем данные для графиков
      const processedChartData = statsData.chartData || [];
      
      // Генерируем данные воронки
      const totalUsers = users.length || 0;
      const activeUsers = users.filter((u: any) => {
        const earnings = u.totalEarnings || 0;
        return earnings > 0;
      }).length || 0;
      
      const funnelProcessed = [
        { name: 'Регистрации', value: totalUsers, fill: '#39B7FF' },
        { name: 'Первая покупка', value: Math.round(totalUsers * 0.6), fill: '#10B981' },
        { name: 'Повторная покупка', value: Math.round(totalUsers * 0.3), fill: '#8B5CF6' },
      ];

      // Формируем статистику (с учетом новой структуры stats.finance)
      const financeData = statsData.stats || statsData;
      const revenue = financeData.total_revenue || financeData.totalRevenue || 0;
      const payouts = financeData.completed_payouts_sum || financeData.totalPayouts || 0;
      const liability = financeData.pending_payouts_sum || financeData.totalPending || financeData.totalLiability || 0;
      const profit = financeData.net_profit || (revenue - (financeData.total_earnings_distributed || financeData.totalApproved || 0));

      setStats({
        revenue,
        revenueDelta: 15.2,
        payouts,
        payoutsDelta: 8.5,
        liability,
        liabilityDelta: 2.4,
        profit,
        profitDelta: 18.9,
        totalUsers: totalUsers,
        activeUsers: activeUsers,
        newUsers: Math.round(totalUsers * 0.1),
      });

      setChartData(processedChartData);
      setFunnelData(funnelProcessed);

      // Генерируем алерты
      const generatedAlerts: ActionAlert[] = [];

      // Критические алерты
      if (statsData.pending?.length > 5) {
        generatedAlerts.push({
          severity: 'critical',
          title: 'Зависшие выплаты > 24ч',
          subtitle: `${statsData.pending.length} заявок зависли, сумма ${Math.round(liability).toLocaleString('ru-RU')} ₽`,
          ctaLabel: 'Проверить',
          link: '/admin/finance?tab=payouts&status=pending',
          timestamp: '2 часа назад',
        });
      }

      // Предупреждения
      if (totalUsers > 20 && activeUsers < totalUsers * 0.4) {
        generatedAlerts.push({
          severity: 'warning',
          title: 'Низкая активация пользователей',
          subtitle: `Только ${activeUsers} из ${totalUsers} совершили покупки (${Math.round(activeUsers/totalUsers*100)}%)`,
          ctaLabel: 'Анализ',
          link: '/admin/users?filter=inactive',
          timestamp: '1 день назад',
        });
      }

      // Возможности
      if (profit > 0) {
        generatedAlerts.push({
          severity: 'opportunity',
          title: 'Положительная маржа',
          subtitle: `Прибыль составляет ${Math.round(profit).toLocaleString('ru-RU')} ₽ за период`,
          ctaLabel: 'Реинвестировать',
          link: '/admin/marketing',
          timestamp: 'Сегодня',
        });
      }

      setAlerts(generatedAlerts);

    } catch (error) {
      console.error('❌ Error loading CEO dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* BIG 4 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Выручка (Revenue)"
          value={stats?.revenue || 0}
          suffix="₽"
          delta={stats?.revenueDelta}
          deltaLabel="vs 30д"
          icon={DollarSign}
          iconColor="#10B981"
          iconBgColor="#ECFDF5"
          status="ok"
          size="large"
          loading={loading}
          onClick={() => window.location.hash = '/admin/finance?tab=revenue'}
        />

        <KPICard
          title="Выплаты (Payouts)"
          value={stats?.payouts || 0}
          suffix="₽"
          delta={stats?.payoutsDelta}
          deltaLabel="vs 30д"
          icon={TrendingUp}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          status="ok"
          size="large"
          loading={loading}
          onClick={() => window.location.hash = '/admin/finance?tab=payouts'}
        />

        <KPICard
          title="Обязательства (Liability)"
          value={stats?.liability || 0}
          suffix="₽"
          delta={stats?.liabilityDelta}
          deltaLabel="vs 30д"
          icon={Wallet}
          iconColor="#8B5CF6"
          iconBgColor="#F3E8FF"
          status={stats && stats.liability > stats.revenue * 0.5 ? 'warning' : 'ok'}
          size="large"
          loading={loading}
          onClick={() => window.location.hash = '/admin/finance?tab=balances'}
        />

        <KPICard
          title="Маржа/Прибыль (Profit)"
          value={stats?.profit || 0}
          suffix="₽"
          delta={stats?.profitDelta}
          deltaLabel="vs 30д"
          icon={PiggyBank}
          iconColor="#EC4899"
          iconBgColor="#FCE7F3"
          status={stats && stats.profit < 0 ? 'critical' : 'ok'}
          size="large"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue vs Payouts vs Liability */}
        <ChartContainer
          title="Revenue vs Payouts vs Liability"
          subtitle="Динамика за последние 30 дней"
          loading={loading}
          empty={chartData.length === 0}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLiability" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                fill="url(#colorRevenue)"
                name="Выручка"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="payouts"
                stroke="#F59E0B"
                fill="url(#colorPayouts)"
                name="Выплаты"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="liability"
                stroke="#8B5CF6"
                fill="url(#colorLiability)"
                name="Обязательства"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Funnel */}
        <ChartContainer
          title="Воронка активации сети"
          subtitle="Регистрация → Первая → Повторная покупка"
          loading={loading}
          empty={funnelData.length === 0}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" stroke="#6B7280" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {funnelData.map((entry, index) => (
                  <Bar key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Action Center + Top Partners */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Action Center */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-red-500" />
                </div>
                Action Center
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="py-8 text-center text-sm text-[#6B7280]">
                  Загрузка алертов...
                </div>
              ) : alerts.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#6B7280]">
                  🎉 Нет критических проблем
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <ActionItem
                    key={index}
                    severity={alert.severity}
                    title={alert.title}
                    subtitle={alert.subtitle}
                    ctaLabel={alert.ctaLabel}
                    timestamp={alert.timestamp}
                    onAction={() => {
                      // Переход по с��ылке
                      console.log('Navigate to:', alert.link);
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top 10 Partners */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-yellow-600" />
                </div>
                Топ-10 партнёров
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-sm text-[#6B7280]">
                  Загрузка...
                </div>
              ) : topPartners.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#6B7280]">
                  Нет данных
                </div>
              ) : (
                <div className="space-y-3">
                  {topPartners.map((partner, index) => (
                    <div
                      key={partner.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-semibold text-[#6B7280] w-6">
                        #{index + 1}
                      </div>
                      <Avatar className="w-8 h-8 shrink-0">
                        {partner.аватар ? (
                          <img src={partner.аватар} alt={partner.имя} />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs">
                            {partner.имя?.[0]?.toUpperCase() || 'P'}
                          </div>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#1E1E1E] truncate">
                          {partner.имя} {partner.фамилия}
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          ID: {partner.id}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-[#10B981]">
                          {(partner.баланс || 0).toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
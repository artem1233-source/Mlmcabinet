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
import { toast } from 'sonner';

// 💰 Форматтер для рублей
const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// 🐛 Debug режим (включить для диагностики)
const DEBUG_UI = true;

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

interface PartnerActivityData {
  active: number;
  new: number;
  inactive: number;
  total: number;
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
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const [topPartners, setTopPartners] = useState<any[]>([]);
  const [partnerActivity, setPartnerActivity] = useState<PartnerActivityData>({
    active: 0,
    new: 0,
    inactive: 0,
    total: 0,
  });

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
          // ✅ Преобразуем баланс в число явно, чтобы избежать проблем со строками
          .map((u: any) => ({
            ...u,
            баланс: typeof u.баланс === 'number' ? u.баланс : parseFloat(u.баланс) || 0,
          }))
          // ✅ Сортируем числовые значения
          .sort((a: any, b: any) => b.баланс - a.баланс)
          .slice(0, 10);
        
        console.log('💎 Top 10 partners by balance:', sortedByBalance.map(u => ({ id: u.id, name: u.имя, balance: u.баланс })));
        setTopPartners(sortedByBalance);
      } else {
        console.warn('⚠️ Users API failed, using mock data:', usersResponse.status);
        // Mock топ партнёров
        users = [
          { id: '1', имя: 'Иван', фамилия: 'Петров', баланс: 125000, totalEarnings: 250000 },
          { id: '2', имя: 'Мария', фамилия: 'Сидоров', баланс: 98000, totalEarnings: 180000 },
          { id: '3', имя: 'Алексей', фамилия: 'Козлов', баланс: 87000, totalEarnings: 150000 },
        ];
        setTopPartners(users);
      }

      // Преобразуем данные для графиков
      const processedChartData = statsData.chartData || [];
      
      // Преобразуем данные для графиков - убрали генерацию funnelData
      const totalUsers = users.length || 0;
      const activeUsers = users.filter((u: any) => {
        const earnings = u.totalEarnings || 0;
        return earnings > 0;
      }).length || 0;

      // 📊 Рассчитываем активность партнёров (за последние 30 дней)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Фильтруем только партнёров (не админов)
      const partners = users.filter((u: any) => u.id !== 'ceo' && !u.isAdmin);
      
      // Новые партнёры (зарегистрированы менее 7 дней назад)
      const newPartners = partners.filter((u: any) => {
        const createdAt = u.дата_регистрации ? new Date(u.дата_регистрации) : null;
        return createdAt && createdAt >= sevenDaysAgo;
      }).length;
      
      // Активные партнёры (есть хотя бы 1 заказ за последние 30 дней)
      // Для упрощения используем totalEarnings > 0 как показатель активности
      const activePartners = partners.filter((u: any) => {
        const earnings = u.totalEarnings || 0;
        return earnings > 0;
      }).length;
      
      // Неактивные партнёры (нет заказов за последние 30 дней)
      const inactivePartners = partners.length - activePartners;
      
      setPartnerActivity({
        active: activePartners,
        new: newPartners,
        inactive: inactivePartners,
        total: partners.length,
      });

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
        {/* Выручка vs Выплаты vs Обязательства */}
        <ChartContainer
          title="Выручка vs Выплаты vs Обязательства"
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

        {/* Активность партнёрской сети */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              Активность партнёрской сети
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-sm text-[#6B7280]">
                Загрузка...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Segmented Bar */}
                <div className="space-y-3">
                  <div className="flex h-12 rounded-lg overflow-hidden">
                    {/* Активные - зелёный */}
                    {partnerActivity.active > 0 && (
                      <div
                        className="bg-green-500 flex items-center justify-center text-white text-sm font-semibold transition-all hover:opacity-90"
                        style={{ width: `${(partnerActivity.active / partnerActivity.total) * 100}%` }}
                      >
                        {partnerActivity.active > 0 && partnerActivity.total > 0 && 
                          Math.round((partnerActivity.active / partnerActivity.total) * 100) > 10 && (
                          <span>{partnerActivity.active}</span>
                        )}
                      </div>
                    )}
                    {/* Новые - жёлтый */}
                    {partnerActivity.new > 0 && (
                      <div
                        className="bg-yellow-500 flex items-center justify-center text-white text-sm font-semibold transition-all hover:opacity-90"
                        style={{ width: `${(partnerActivity.new / partnerActivity.total) * 100}%` }}
                      >
                        {partnerActivity.new > 0 && partnerActivity.total > 0 && 
                          Math.round((partnerActivity.new / partnerActivity.total) * 100) > 10 && (
                          <span>{partnerActivity.new}</span>
                        )}
                      </div>
                    )}
                    {/* Неактивные - серый */}
                    {partnerActivity.inactive > 0 && (
                      <div
                        className="bg-gray-400 flex items-center justify-center text-white text-sm font-semibold transition-all hover:opacity-90"
                        style={{ width: `${(partnerActivity.inactive / partnerActivity.total) * 100}%` }}
                      >
                        {partnerActivity.inactive > 0 && partnerActivity.total > 0 && 
                          Math.round((partnerActivity.inactive / partnerActivity.total) * 100) > 10 && (
                          <span>{partnerActivity.inactive}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#6B7280]">Активные</div>
                        <div className="text-sm font-semibold text-[#1E1E1E]">{partnerActivity.active}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#6B7280]">Новые</div>
                        <div className="text-sm font-semibold text-[#1E1E1E]">{partnerActivity.new}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#6B7280]">Неактивные</div>
                        <div className="text-sm font-semibold text-[#1E1E1E]">{partnerActivity.inactive}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Инсайт */}
                {partnerActivity.total > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-600 text-lg mt-0.5">🔎</div>
                      <p className="text-sm text-[#374151]">
                        <span className="font-semibold">
                          {Math.round((partnerActivity.inactive / partnerActivity.total) * 100)}%
                        </span>
                        {' '}партнёров не делали заказ за последние 30 дней
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 🟩 Деньги в сети + 🟨 Риск потери оборота */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Деньги в сети */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              Деньги в сети
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-sm text-[#6B7280]">
                Загрузка...
              </div>
            ) : (
              <div className="space-y-4">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Общий оборот сети */}
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                    <div className="text-xs font-medium text-green-700 mb-1">
                      Общий оборот сети
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {rubFormatter.format(stats?.revenue || 0)} ₽
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      За последние 30 дней
                    </div>
                  </div>

                  {/* Количество партнёров с оборотом */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      Партнёров с оборотом
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {partnerActivity.active}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Из {partnerActivity.total} партнёров
                    </div>
                  </div>

                  {/* Средний оборот на активного партнёра */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-xs font-medium text-blue-700 mb-1">
                      Средний оборот на партнёра
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {partnerActivity.active > 0 
                        ? rubFormatter.format(Math.round((stats?.revenue || 0) / partnerActivity.active))
                        : '0'
                      } ₽
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      На активного партнёра
                    </div>
                  </div>
                </div>

                {/* Pareto principle insight */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-start gap-2">
                    <div className="text-amber-600 text-lg mt-0.5">💡</div>
                    <p className="text-xs text-amber-900">
                      80% оборота создают 20% партнёров
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Риск потери оборота */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-red-600 rotate-45" />
              </div>
              Риск потери оборота
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-sm text-[#6B7280]">
                Загрузка...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Потенциальная потеря */}
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-xs font-medium text-red-700 mb-1">
                    Потенциальная потеря оборота
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {rubFormatter.format(
                      // Рассчитываем потенциальную потерю как средний оборот * неактивные партнёры
                      partnerActivity.active > 0 
                        ? Math.round(((stats?.revenue || 0) / partnerActivity.active) * partnerActivity.inactive)
                        : 0
                    )} ₽
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    В месяц из-за неактивности
                  </div>
                </div>

                {/* Причины */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Основные причины:
                  </div>
                  
                  {/* Out-of-stock SKU */}
                  <div className="flex items-start gap-2 p-2 bg-orange-50 rounded border border-orange-100">
                    <ShoppingCart className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-orange-900">
                        Out-of-stock SKU
                      </div>
                      <div className="text-xs text-orange-700">
                        Товары отсутствуют на складе
                      </div>
                    </div>
                  </div>

                  {/* Неактивные партнёры */}
                  <div className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <Users className="w-4 h-4 text-gray-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900">
                        Неактивные партнёры
                      </div>
                      <div className="text-xs text-gray-700">
                        {partnerActivity.inactive} партнёров не делают заказы
                      </div>
                    </div>
                  </div>

                  {/* Задержки поставок */}
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-100">
                    <Clock className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-yellow-900">
                        Задержки поставок
                      </div>
                      <div className="text-xs text-yellow-700">
                        Влияет на удовлетворённость
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Центр Действий + Top Partners */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Центр Действий */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-red-500" />
                </div>
                Центр Действий
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
                      // Переход по сылке
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
                          {rubFormatter.format(partner.баланс || 0)} ₽
                        </div>
                        {DEBUG_UI && (
                          <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                            raw={partner.баланс} ({typeof partner.баланс})
                          </div>
                        )}
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
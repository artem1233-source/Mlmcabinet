/**
 * 📊 CEO MISSION CONTROL - UI VIEW
 * 
 * ✅ Чистый UI компонент (только отображение)
 * ❌ БЕЗ логики, API запросов, useEffect
 * 
 * Логика в: /src/containers/dashboard/CEOMissionControlContainer.tsx (Replit)
 */

import { KPICard } from '../shared/KPICard';
import { ChartContainer } from '../shared/ChartContainer';
import { ActionItem, ActionSeverity } from '../shared/ActionItem';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
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

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardStats {
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

export interface ActionAlert {
  severity: ActionSeverity;
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  timestamp?: string;
}

export interface TopPartner {
  id: string;
  имя: string;
  фамилия: string;
  баланс: number;
  totalEarnings?: number;
}

export interface CEOMissionControlViewProps {
  loading: boolean;
  stats: DashboardStats | null;
  chartData: any[];
  funnelData: any[];
  alerts: ActionAlert[];
  topPartners: TopPartner[];
  onKPIClick?: (kpi: 'revenue' | 'payouts' | 'liability' | 'profit') => void;
  onAlertClick?: (link: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CEOMissionControlView({
  loading,
  stats,
  chartData,
  funnelData,
  alerts,
  topPartners,
  onKPIClick,
  onAlertClick,
}: CEOMissionControlViewProps) {
  
  // Обработчики кликов (UI логика)
  const handleKPIClick = (kpi: 'revenue' | 'payouts' | 'liability' | 'profit') => {
    if (onKPIClick) {
      onKPIClick(kpi);
    }
  };

  const handleAlertClick = (link: string) => {
    if (onAlertClick) {
      onAlertClick(link);
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
          onClick={() => handleKPIClick('revenue')}
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
          onClick={() => handleKPIClick('payouts')}
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
          onClick={() => handleKPIClick('liability')}
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
          onClick={() => handleKPIClick('profit')}
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

        {/* Conversion Funnel */}
        <ChartContainer
          title="Воронка конверсии"
          subtitle="От регистрации до повторных покупок"
          loading={loading}
          empty={funnelData.length === 0}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" stroke="#6B7280" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="#39B7FF" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Bottom Row: Alerts + Top Partners */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#39B7FF]" />
              Требуют внимания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-gray-500">Загрузка...</div>
              ) : alerts.length === 0 ? (
                <div className="text-sm text-gray-500">Нет активных алертов</div>
              ) : (
                alerts.map((alert, idx) => (
                  <ActionItem
                    key={idx}
                    severity={alert.severity}
                    title={alert.title}
                    subtitle={alert.subtitle}
                    ctaLabel={alert.ctaLabel}
                    timestamp={alert.timestamp}
                    onClick={() => handleAlertClick(alert.link)}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Partners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#F59E0B]" />
              Топ партнёры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-gray-500">Загрузка...</div>
              ) : topPartners.length === 0 ? (
                <div className="text-sm text-gray-500">Нет данных</div>
              ) : (
                topPartners.slice(0, 5).map((partner, idx) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#39B7FF] text-white">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {partner.имя} {partner.фамилия}
                        </div>
                        <div className="text-sm text-gray-500">ID: {partner.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {partner.баланс.toLocaleString('ru-RU')} ₽
                      </div>
                      {partner.totalEarnings && (
                        <div className="text-sm text-gray-500">
                          +{partner.totalEarnings.toLocaleString('ru-RU')} ₽
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="Всего пользователей"
          value={stats?.totalUsers || 0}
          icon={Users}
          iconColor="#39B7FF"
          iconBgColor="#EBF8FF"
          status="ok"
          loading={loading}
        />
        <KPICard
          title="Активные пользователи"
          value={stats?.activeUsers || 0}
          icon={ShoppingCart}
          iconColor="#10B981"
          iconBgColor="#ECFDF5"
          status="ok"
          loading={loading}
        />
        <KPICard
          title="Новые пользователи (30д)"
          value={stats?.newUsers || 0}
          delta={12.5}
          deltaLabel="vs пред. период"
          icon={ArrowUpRight}
          iconColor="#8B5CF6"
          iconBgColor="#F3E8FF"
          status="ok"
          loading={loading}
        />
      </div>
    </div>
  );
}
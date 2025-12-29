import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DollarSign, TrendingUp, AlertCircle, Users, Target, Wallet, CheckCircle, Search, Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { DashboardData, KPI } from './types';

interface CEOMissionControlProps {
  data: DashboardData;
  period: number;
}

const KPI_ICONS: Record<string, any> = {
  revenue: DollarSign,
  payouts: Wallet,
  liability: Target,
  profit: TrendingUp,
};

const KPI_COLORS: Record<string, { icon: string; bg: string }> = {
  revenue: { icon: '#10B981', bg: '#D1FAE5' },
  payouts: { icon: '#8B5CF6', bg: '#EDE9FE' },
  liability: { icon: '#EC4899', bg: '#FCE7F3' },
  profit: { icon: '#06B6D4', bg: '#CFFAFE' },
};

function CEOKPICard({ kpi, iconKey }: { kpi: KPI; iconKey: string }) {
  const Icon = KPI_ICONS[iconKey] || DollarSign;
  const colors = KPI_COLORS[iconKey] || KPI_COLORS.revenue;
  const delta = kpi.delta ?? 0;
  const isPositive = delta >= 0;

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return Math.round(val / 1000) + 'K';
    return val.toLocaleString('ru-RU');
  };

  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#6B7280] mb-1">{kpi.title}</p>
            <p className="text-[36px] font-bold text-[#1E1E1E] leading-none mb-1.5">
              {formatValue(kpi.value)}
            </p>
            <p className="text-[12px] text-[#9CA3AF]">
              {isPositive ? '+' : ''}{delta}% за период
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: colors.bg }}
          >
            <Icon className="w-5 h-5" style={{ color: colors.icon }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyRevenueChart({ data }: { data: any[] }) {
  const isEmpty = !data || data.length === 0;

  const chartData = isEmpty ? [
    { date: '1 дек.', value: 0 },
    { date: '4 дек.', value: 0 },
    { date: '7 дек.', value: 1 },
    { date: '10 дек.', value: 0 },
    { date: '13 дек.', value: 0 },
    { date: '16 дек.', value: 0 },
    { date: '19 дек.', value: 0 },
    { date: '22 дек.', value: 0 },
    { date: '25 дек.', value: 0 },
    { date: '29 дек.', value: 0 },
  ] : data.map(d => ({
    date: d.date?.replace('-', ' ').slice(5) + '.',
    value: d.revenue || 0,
  }));

  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full">
      <CardHeader className="px-6 pt-5 pb-2">
        <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">
          Выручка по дням
        </CardTitle>
        <p className="text-[13px] text-[#9CA3AF]">Последние 30 дней</p>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="value" fill="#39B7FF" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-2 text-xs text-[#39B7FF]">
            <div className="w-2 h-2 rounded-full bg-[#39B7FF]" />
            <span>Выручка</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionPieChart({ data }: { data: any[] }) {
  const pieData = data.length > 0 ? data : [
    { name: 'Уровень 1', value: 71, color: '#39B7FF' },
    { name: 'Уровень 2', value: 14, color: '#10B981' },
    { name: 'Уровень 3', value: 14, color: '#F59E0B' },
  ];

  const COLORS = ['#39B7FF', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={pieData.find(d => d.name === name)?.color || '#6B7280'}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full">
      <CardHeader className="px-6 pt-5 pb-2">
        <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">
          Распределение комиссий
        </CardTitle>
        <p className="text-[13px] text-[#9CA3AF]">По уровням партнёров</p>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={85}
              innerRadius={50}
              fill="#8884d8"
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RecentTransactionsTable() {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <CardHeader className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-gray-500" />
            </div>
            <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">
              Последние транзакции
            </CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени, email, ID..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-[220px] focus:outline-none focus:ring-2 focus:ring-[#39B7FF]/20 focus:border-[#39B7FF]"
              />
            </div>
            <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-12">
        <p className="text-center text-[14px] text-[#9CA3AF]">Нет данных</p>
      </CardContent>
    </Card>
  );
}

function ActionCenter({ alerts }: { alerts: any[] }) {
  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const isEmpty = criticalAlerts.length === 0;

  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full">
      <CardHeader className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">Action Center</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        {isEmpty ? (
          <div className="flex items-center justify-center py-14 rounded-xl bg-[#F0FDF4]">
            <div className="flex items-center gap-2.5 text-[#10B981]">
              <CheckCircle className="w-5 h-5" />
              <span className="text-[14px] font-medium">Нет критических проблем</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[220px] overflow-y-auto">
            {criticalAlerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-[#1E1E1E]">{alert.title}</p>
                  {alert.description && (
                    <p className="text-[12px] text-[#6B7280] mt-1">{alert.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopPartnersLeaderboard({ partners }: { partners: any[] }) {
  const defaultPartners = [
    { rank: 1, name: '1 1', id: '003', revenue: 111900, color: '#FFD700' },
    { rank: 2, name: '2 2', id: '004', revenue: 102300, color: '#C0C0C0' },
    { rank: 3, name: 'Artem Khachatrian', id: '001', revenue: 50000, color: '#CD7F32' },
    { rank: 4, name: '3 3', id: '007', revenue: 500, color: '#10B981' },
    { rank: 5, name: 'Эльза Форсова', id: '005', revenue: 0, color: '#10B981' },
    { rank: 6, name: '4 4', id: '008', revenue: 0, color: '#F59E0B' },
    { rank: 7, name: 'Елизавета Хачатрян Хачатрян', id: '002', revenue: 0, color: '#EC4899' },
    { rank: 8, name: '5 5', id: '010', revenue: 0, color: '#6366F1' },
    { rank: 9, name: 'Дмитрий Кумейко', id: '009', revenue: 0, color: '#8B5CF6' },
  ];

  const displayPartners = partners.length > 0 ? partners : defaultPartners;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatRevenue = (val: number) => {
    if (val === 0) return '0 ₽';
    return val.toLocaleString('ru-RU') + ' ₽';
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return null;
  };

  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full">
      <CardHeader className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">Топ-10 партнёров</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        <div className="space-y-0.5 max-h-[220px] overflow-y-auto">
          {displayPartners.slice(0, 10).map((partner, idx) => {
            const rank = partner.rank || idx + 1;
            const medalColor = getMedalColor(rank);
            return (
              <div key={idx} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-[13px] font-medium text-[#9CA3AF] w-6">#{rank}</span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                  style={{ backgroundColor: medalColor || partner.color || '#39B7FF' }}
                >
                  {getInitials(partner.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1E1E1E] truncate">{partner.name}</p>
                  <p className="text-[11px] text-[#9CA3AF]">ID: {partner.id}</p>
                </div>
                <span className={`text-[13px] font-semibold tabular-nums ${partner.revenue > 0 ? 'text-[#10B981]' : 'text-[#9CA3AF]'}`}>
                  {formatRevenue(partner.revenue)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SmallStatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-[#6B7280] mb-1">{title}</p>
            <p className="text-[28px] font-bold text-[#1E1E1E] leading-none mb-1">{value}</p>
            <p className="text-[12px] text-[#9CA3AF]">{subtitle}</p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CEOMissionControl({ data, period: _period }: CEOMissionControlProps) {
  const kpiKeys = ['revenue', 'payouts', 'liability', 'profit'];

  const defaultKPIs: KPI[] = [
    { id: 'revenue', title: 'Выручка (Revenue)', value: 0, delta: 0 },
    { id: 'payouts', title: 'Выплаты (Payouts)', value: 0, delta: 0 },
    { id: 'liability', title: 'Обязательства', value: 0, delta: 0 },
    { id: 'profit', title: 'Маржа/Прибыль', value: 0, delta: 0 },
  ];

  const kpis = data.kpis.length >= 4 ? data.kpis : defaultKPIs;

  const revenueChartData = (data.dailySales || []).map((d: any) => ({
    date: d.date?.slice(5).replace('-', '.') || '',
    revenue: d.revenue || 0,
  }));

  const topPartners = (data.topPartners || []).map((p, idx) => ({
    rank: idx + 1,
    name: p.name || 'Партнёр',
    id: p.id,
    revenue: p.revenue || 0,
    color: p.color || '#39B7FF',
  }));

  const totalRevenue = typeof kpis[0]?.value === 'number' ? kpis[0].value : 0;
  const totalPayouts = typeof kpis[1]?.value === 'number' ? kpis[1].value : 0;
  const profit = totalRevenue - totalPayouts;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.slice(0, 4).map((kpi, index) => (
          <CEOKPICard key={kpi.id || index} kpi={kpi} iconKey={kpiKeys[index] || 'revenue'} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyRevenueChart data={revenueChartData} />
        <DistributionPieChart data={[]} />
      </div>

      <RecentTransactionsTable />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionCenter alerts={data.alerts || []} />
        <TopPartnersLeaderboard partners={topPartners} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SmallStatCard
          title="Ожидает выплат"
          value={totalPayouts.toLocaleString('ru-RU')}
          subtitle="сумма к выплате"
          icon={Wallet}
          iconColor="#F59E0B"
          iconBg="#FEF3C7"
        />
        <SmallStatCard
          title="Партнёров в сети"
          value={topPartners.length || 9}
          subtitle="активная сеть"
          icon={Users}
          iconColor="#10B981"
          iconBg="#D1FAE5"
        />
        <SmallStatCard
          title="Прибыль"
          value={profit > 0 ? `+${profit.toLocaleString('ru-RU')}` : profit.toLocaleString('ru-RU')}
          subtitle="за период"
          icon={TrendingUp}
          iconColor="#39B7FF"
          iconBg="#E0F2FE"
        />
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, BarChart3, Users, Target, Wallet, CheckCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell,
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
  revenue: { icon: '#10B981', bg: '#ECFDF5' },
  payouts: { icon: '#F59E0B', bg: '#FEF3C7' },
  liability: { icon: '#EC4899', bg: '#FCE7F3' },
  profit: { icon: '#39B7FF', bg: '#E0F2FE' },
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
    <Card className="bg-white rounded-2xl border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#6B7280] font-medium mb-1 truncate">{kpi.title}</p>
            <p className="text-[32px] font-bold text-[#1E1E1E] leading-tight mb-1">
              {kpi.prefix || ''}{formatValue(kpi.value)}{kpi.suffix || ''}
            </p>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="w-3 h-3 text-[#10B981]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[#EF4444]" />
              )}
              <span className={`text-xs ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {isPositive ? '+' : ''}{delta}% за период
              </span>
            </div>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: colors.bg }}
          >
            <Icon className="w-5 h-5" style={{ color: colors.icon }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueChart({ data }: { data: any[] }) {
  const isEmpty = !data || data.length === 0;

  return (
    <Card className="bg-white rounded-2xl border-0 shadow-sm h-full">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-semibold text-[#1E1E1E]">
          Revenue vs Payouts vs Liability
        </CardTitle>
        <p className="text-sm text-[#9CA3AF] mt-0.5">Динамика за последние 30 дней</p>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {isEmpty ? (
          <div className="h-[260px] flex flex-col items-center justify-center rounded-xl bg-[#F9FAFB]">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
              <BarChart3 className="w-8 h-8 text-[#D1D5DB]" />
            </div>
            <p className="text-sm font-medium text-[#374151] mb-1">Нет данных для отображения</p>
            <p className="text-xs text-[#9CA3AF]">Данные появятся после первых транзакций</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLiability" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
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
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '16px' }}
                iconType="circle"
                iconSize={8}
              />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#colorRevenue)" strokeWidth={2} />
              <Area type="monotone" dataKey="payouts" name="Payouts" stroke="#F59E0B" fill="url(#colorPayouts)" strokeWidth={2} />
              <Area type="monotone" dataKey="liability" name="Liability" stroke="#8B5CF6" fill="url(#colorLiability)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelChart({ data }: { data: any[] }) {
  const funnelData = data.length > 0 ? data : [
    { name: 'Регистрация', value: 12, color: '#10B981' },
    { name: 'Первая покупка', value: 6, color: '#F59E0B' },
    { name: 'Повторная покупка', value: 3, color: '#8B5CF6' },
  ];

  return (
    <Card className="bg-white rounded-2xl border-0 shadow-sm h-full">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-semibold text-[#1E1E1E]">
          Воронка активации сети
        </CardTitle>
        <p className="text-sm text-[#9CA3AF] mt-0.5">Регистрация → Первая → Повторная покупка</p>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnelData} layout="vertical" barSize={28} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
            <XAxis 
              type="number" 
              stroke="#9CA3AF" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="#6B7280" 
              fontSize={12} 
              width={120}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ActionCenter({ alerts }: { alerts: any[] }) {
  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const isEmpty = criticalAlerts.length === 0;

  return (
    <Card className="bg-white rounded-2xl border-0 shadow-sm h-full">
      <CardHeader className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <CardTitle className="text-base font-semibold text-[#1E1E1E]">Action Center</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {isEmpty ? (
          <div className="flex items-center justify-center py-16 rounded-xl bg-[#F0FDF4]">
            <div className="flex items-center gap-2.5 text-[#10B981]">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Нет критических проблем</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {criticalAlerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#1E1E1E]">{alert.title}</p>
                  {alert.description && (
                    <p className="text-xs text-[#6B7280] mt-1">{alert.description}</p>
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
    <Card className="bg-white rounded-2xl border-0 shadow-sm h-full">
      <CardHeader className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <CardTitle className="text-base font-semibold text-[#1E1E1E]">Топ-10 партнёров</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {displayPartners.slice(0, 10).map((partner, idx) => {
            const rank = partner.rank || idx + 1;
            const medalColor = getMedalColor(rank);
            return (
              <div key={idx} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium text-[#9CA3AF] w-7">#{rank}</span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-sm"
                  style={{ backgroundColor: medalColor || partner.color || '#39B7FF' }}
                >
                  {getInitials(partner.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1E1E1E] truncate">{partner.name}</p>
                  <p className="text-xs text-[#9CA3AF]">ID: {partner.id}</p>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${partner.revenue > 0 ? 'text-[#10B981]' : 'text-[#9CA3AF]'}`}>
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

export function CEOMissionControl({ data, period: _period }: CEOMissionControlProps) {
  const kpiKeys = ['revenue', 'payouts', 'liability', 'profit'];
  
  const defaultKPIs: KPI[] = [
    { id: 'revenue', title: 'Выручка (Revenue)', value: 0, prefix: '', suffix: '₽', delta: 15.2 },
    { id: 'payouts', title: 'Выплаты (Payouts)', value: 0, prefix: '', suffix: '₽', delta: 8.5 },
    { id: 'liability', title: 'Обязательства (Liability)', value: 0, prefix: '', suffix: '₽', delta: 2.4 },
    { id: 'profit', title: 'Маржа/Прибыль (Profit)', value: 0, prefix: '', suffix: '₽', delta: 18.9 },
  ];

  const kpis = data.kpis.length >= 4 ? data.kpis : defaultKPIs;
  
  const revenueChartData = (data.dailySales || []).map((d: any) => ({
    date: d.date?.slice(5) || '',
    revenue: d.revenue || 0,
    payouts: 0,
    liability: 0,
  }));

  const funnelData = data.charts.find(c => c.id === 'funnel')?.series?.[0]?.data?.map(d => ({
    name: String(d.x),
    value: d.y,
    color: '#10B981',
  })) || [];

  const topPartners = (data.topPartners || []).map((p, idx) => ({
    rank: idx + 1,
    name: p.name || 'Партнёр',
    id: p.id,
    revenue: p.revenue || 0,
    color: p.color || '#39B7FF',
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((kpi, index) => (
          <CEOKPICard key={kpi.id || index} kpi={kpi} iconKey={kpiKeys[index] || 'revenue'} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChart data={revenueChartData} />
        <FunnelChart data={funnelData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ActionCenter alerts={data.alerts || []} />
        <TopPartnersLeaderboard partners={topPartners} />
      </div>
    </div>
  );
}

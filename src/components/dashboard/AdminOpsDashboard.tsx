import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, Activity, UserPlus, Shield, Calendar, Search, Download, UserX, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { DashboardData } from './types';

interface AdminOpsDashboardProps {
  data: DashboardData;
  period: number;
}

function AdminKPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  iconBg 
}: { 
  title: string; 
  value: number | string; 
  subtitle?: string; 
  icon: any; 
  iconColor: string; 
  iconBg: string;
}) {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#6B7280] mb-1">{title}</p>
            <p className="text-[36px] font-bold text-[#1E1E1E] leading-none mb-1.5">
              {value}
            </p>
            {subtitle && (
              <p className="text-[12px] text-[#9CA3AF]">{subtitle}</p>
            )}
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RegistrationChart({ data }: { data: any[] }) {
  const chartData = data.length > 0 ? data : [
    { date: '1 дек.', value: 0 },
    { date: '4 дек.', value: 0 },
    { date: '7 дек.', value: 4 },
    { date: '10 дек.', value: 0 },
    { date: '13 дек.', value: 0 },
    { date: '16 дек.', value: 0 },
    { date: '19 дек.', value: 0 },
    { date: '22 дек.', value: 0 },
    { date: '25 дек.', value: 0 },
    { date: '29 дек.', value: 0 },
  ];

  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full">
      <CardHeader className="px-6 pt-5 pb-2">
        <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">
          Регистрации по дням
        </CardTitle>
        <p className="text-[13px] text-[#9CA3AF]">Последние 30 дней</p>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#39B7FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#39B7FF" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#39B7FF"
              strokeWidth={2}
              fill="url(#colorReg)"
              dot={{ r: 3, fill: '#39B7FF', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-2 text-xs text-[#39B7FF]">
            <div className="w-2 h-2 rounded-full bg-[#39B7FF]" />
            <span>Регистрации</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LevelDistributionChart() {
  const pieData = [
    { name: 'Уровень 1', value: 71, color: '#39B7FF' },
    { name: 'Уровень 2', value: 14, color: '#10B981' },
    { name: 'Уровень 3', value: 14, color: '#F59E0B' },
  ];

  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.3;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const color = pieData.find(d => d.name === name)?.color || '#6B7280';

    return (
      <text
        x={x}
        y={y}
        fill={color}
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
          Распределение по уровням
        </CardTitle>
        <p className="text-[13px] text-[#9CA3AF]">Партнёрская сеть</p>
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
                <Cell key={`cell-${index}`} fill={entry.color} />
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

function RecentRegistrationsTable({ users }: { users: any[] }) {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <CardHeader className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-gray-500" />
            </div>
            <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">
              Последние регистрации
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
      <CardContent className="p-0">
        {users.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[14px] text-[#9CA3AF]">Нет данных</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">Имя</th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">Email</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 10).map((user, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-[13px] text-[#6B7280]">{user.id || user.partnerId}</td>
                    <td className="px-6 py-3 text-[13px] text-[#1E1E1E]">{user.name || user.имя || '-'}</td>
                    <td className="px-6 py-3 text-[13px] text-[#6B7280]">{user.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SmallStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  iconBg 
}: { 
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

export function AdminOpsDashboard({ data, period: _period }: AdminOpsDashboardProps) {
  const totalUsers = data.kpis.find(k => k.id === 'total_users')?.value || 9;
  const activeUsers = data.kpis.find(k => k.id === 'active_users')?.value || 0;
  const newUsers30 = data.kpis.find(k => k.id === 'new_users_30d')?.value || 0;
  const admins = data.kpis.find(k => k.id === 'admins')?.value || 0;

  const totalNum = typeof totalUsers === 'number' ? totalUsers : parseInt(totalUsers as string) || 9;
  const activeNum = typeof activeUsers === 'number' ? activeUsers : parseInt(activeUsers as string) || 0;
  const newNum = typeof newUsers30 === 'number' ? newUsers30 : parseInt(newUsers30 as string) || 0;

  const activePct = totalNum > 0 ? Math.round((activeNum / totalNum) * 100) : 0;
  const inactiveNum = totalNum - activeNum;
  const inactivePct = totalNum > 0 ? Math.round((inactiveNum / totalNum) * 100) : 100;

  const recentUsers = data.tables?.[0]?.rows || [];

  const registrationData = data.charts?.[0]?.data || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AdminKPICard
          title="Всего пользователей"
          value={totalNum}
          subtitle="0% новых за период"
          icon={Users}
          iconColor="#39B7FF"
          iconBg="#E0F2FE"
        />
        <AdminKPICard
          title="Активные"
          value={activeNum}
          subtitle={`${activePct}% от общего числа`}
          icon={Activity}
          iconColor="#8B5CF6"
          iconBg="#EDE9FE"
        />
        <AdminKPICard
          title="Новые за 30 дней"
          value={newNum}
          subtitle="0% сегодня"
          icon={UserPlus}
          iconColor="#EC4899"
          iconBg="#FCE7F3"
        />
        <AdminKPICard
          title="Админы"
          value={admins}
          subtitle=""
          icon={Shield}
          iconColor="#06B6D4"
          iconBg="#CFFAFE"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegistrationChart data={registrationData} />
        <LevelDistributionChart />
      </div>

      <RecentRegistrationsTable users={recentUsers} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SmallStatCard
          title="Неактивные"
          value={inactiveNum}
          subtitle={`${inactivePct}% от общего числа`}
          icon={UserX}
          iconColor="#F59E0B"
          iconBg="#FEF3C7"
        />
        <SmallStatCard
          title="Партнёры"
          value={totalNum}
          subtitle="активная сеть"
          icon={Users}
          iconColor="#10B981"
          iconBg="#D1FAE5"
        />
        <SmallStatCard
          title="Сегодня"
          value="+0"
          subtitle="новых регистраций"
          icon={TrendingUp}
          iconColor="#39B7FF"
          iconBg="#E0F2FE"
        />
      </div>
    </div>
  );
}

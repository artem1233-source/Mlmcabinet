import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, DollarSign, Wallet, CheckCircle2, XCircle, Search, Download,
  ArrowUpRight, ArrowDownRight, Clock, CheckCheck, Landmark, CreditCard, PartyPopper,
  Calendar, ChevronDown, Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../utils/api';

interface FinanceStats {
  totalRevenue: number;
  netProfit: number;
  usersBalanceTotal: number;
  pendingPayoutsSum: number;
  totalPaidOut: number;
  pendingWithdrawals: any[];
  recentOperations: any[];
  chartData?: { date: string; revenue: number; payouts: number }[];
}

interface AdminFinanceRuProps {
  currentUser: any;
}

export function AdminFinanceRu({ currentUser: _currentUser }: AdminFinanceRuProps) {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState('365d');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dateRangeOptions = [
    { value: '7d', label: 'Последние 7 дней' },
    { value: '30d', label: 'Последние 30 дней' },
    { value: '90d', label: 'Последние 90 дней' },
    { value: '365d', label: 'Последний год' },
    { value: 'all', label: 'Всё время' },
  ];

  const selectedLabel = dateRangeOptions.find(o => o.value === dateRange)?.label || 'Последний год';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminFinanceStats();
      
      // Unpack response: stats are nested, pendingWithdrawals and recentOperations are at top level
      const data = {
        totalRevenue: response.stats?.totalRevenue || 0,
        netProfit: response.stats?.netProfit || 0,
        usersBalanceTotal: response.stats?.usersBalanceTotal || 0,
        pendingPayoutsSum: response.stats?.pendingPayoutsSum || 0,
        totalPaidOut: response.stats?.totalPaidOut || 0,
        pendingWithdrawals: response.pendingWithdrawals || [],
        recentOperations: response.recentOperations || []
      };
      
      console.log('📊 Finance API raw response:', JSON.stringify(response));
      console.log('📊 Finance data loaded:', {
        totalRevenue: data.totalRevenue,
        netProfit: data.netProfit,
        usersBalanceTotal: data.usersBalanceTotal,
        pendingPayoutsSum: data.pendingPayoutsSum,
        totalPaidOut: data.totalPaidOut,
        pendingWithdrawalsCount: data.pendingWithdrawals.length,
        recentOperationsCount: data.recentOperations.length
      });
      
      const last30Days = generateLast30Days();
      const chartData = last30Days.map(date => {
        const dayRevenue = (data.recentOperations || [])
          .filter((op: any) => op.type === 'order' && op.date?.startsWith(date))
          .reduce((sum: number, op: any) => sum + (op.amount || 0), 0);
        const dayPayouts = (data.recentOperations || [])
          .filter((op: any) => (op.type === 'earning' || op.type === 'withdrawal') && op.date?.startsWith(date))
          .reduce((sum: number, op: any) => sum + (op.amount || 0), 0);
        return { date: formatDateShort(date), revenue: dayRevenue, payouts: dayPayouts };
      });
      
      setStats({ ...data, chartData });
    } catch (error) {
      console.error('Failed to load finance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${day} ${months[d.getMonth()]}`;
  };

  const handleApprove = async (withdrawalId: string) => {
    if (processingId) return;
    setProcessingId(withdrawalId);
    try {
      await api.updateWithdrawalStatus(withdrawalId, 'approved');
      await loadStats();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    if (processingId) return;
    setProcessingId(withdrawalId);
    try {
      await api.updateWithdrawalStatus(withdrawalId, 'rejected');
      await loadStats();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (!stats?.pendingWithdrawals?.length || processingId) return;
    setProcessingId('bulk');
    try {
      for (const w of stats.pendingWithdrawals) {
        await api.updateWithdrawalStatus(w.id, 'approved');
      }
      await loadStats();
    } catch (error) {
      console.error('Bulk approve failed:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOperations = useMemo(() => {
    if (!stats?.recentOperations) return [];
    let ops = [...stats.recentOperations];
    
    if (activeTab === 'sales') ops = ops.filter(o => o.type === 'order');
    else if (activeTab === 'payouts') ops = ops.filter(o => o.type === 'withdrawal');
    else if (activeTab === 'commissions') ops = ops.filter(o => o.type === 'earning');
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      ops = ops.filter(o => 
        o.user?.toLowerCase().includes(term) || 
        o.description?.toLowerCase().includes(term)
      );
    }
    
    return ops.slice(0, 50);
  }, [stats?.recentOperations, activeTab, searchTerm]);

  const exportCSV = () => {
    if (!filteredOperations.length) return;
    const headers = ['Дата', 'Тип', 'Партнёр', 'Сумма', 'Описание'];
    const rows = filteredOperations.map(op => [
      op.date || '',
      op.type === 'order' ? 'Продажа' : op.type === 'earning' ? 'Комиссия' : 'Вывод',
      op.user || '',
      op.amount || 0,
      op.description || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Загрузка...</div>
      </div>
    );
  }

  const pendingCount = stats?.pendingWithdrawals?.length || 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Финансовая панель</h1>
            <p className="text-slate-500 text-sm">Управление денежными потоками компании</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-slate-300 transition-colors shadow-sm"
              >
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{selectedLabel}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-100 shadow-lg z-50 py-2">
                    {dateRangeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setDateRange(option.value);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${
                          dateRange === option.value ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                        }`}
                      >
                        <span>{option.label}</span>
                        {dateRange === option.value && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button onClick={exportCSV} variant="outline" className="gap-2 rounded-full px-4">
              <Download className="w-4 h-4" />
              Экспорт
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Общий оборот"
            value={stats?.totalRevenue || 0}
            subtitle={`${(stats?.recentOperations?.filter(o => o.type === 'order').length || 0)} завершённых заказов`}
            trend={15}
            trendUp={true}
            icon={<TrendingUp className="w-5 h-5" />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
          />
          <KPICard
            title="Чистая прибыль"
            value={stats?.netProfit || 0}
            subtitle="Оборот минус выплаты"
            trend={-8}
            trendUp={false}
            icon={<Landmark className="w-5 h-5" />}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
          />
          <KPICard
            title="Выплаты"
            value={stats?.pendingPayoutsSum || 0}
            valueColor={(stats?.pendingPayoutsSum || 0) > 0 ? "text-orange-600" : "text-slate-900"}
            secondaryValue={stats?.totalPaidOut || 0}
            secondaryLabel="Выплачено"
            subtitle={`${pendingCount} заявок ожидают`}
            icon={<CreditCard className="w-5 h-5" />}
            iconBg={pendingCount > 0 ? "bg-orange-50" : "bg-slate-50"}
            iconColor={pendingCount > 0 ? "text-orange-500" : "text-slate-400"}
            highlight={pendingCount > 0}
            highlightColor="amber"
          />
          <KPICard
            title="Баланс партнёров"
            value={stats?.usersBalanceTotal || 0}
            subtitle="Накоплено на счетах пользователей"
            icon={<Wallet className="w-5 h-5" />}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
            badge={<span className="w-2 h-2 bg-blue-500 rounded-full" />}
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              Выручка и выплаты (последние 30 дней)
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-400" />
                <span className="text-slate-500">Выплаты</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-slate-500">Выручка</span>
              </div>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickLine={false} 
                  axisLine={false}
                  interval={2}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => v > 0 ? `₽${(v/1000).toFixed(0)}k` : '₽0'}
                  width={50}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '8px 12px'
                  }}
                  formatter={(value: number, name: string) => [
                    `₽${value.toLocaleString()}`, 
                    name === 'revenue' ? 'Выручка' : 'Выплаты'
                  ]}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="payouts" 
                  stroke="#fb923c" 
                  strokeWidth={2} 
                  fill="url(#colorPayouts)" 
                  name="payouts"
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  fill="url(#colorRevenue)" 
                  name="revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {pendingCount > 0 ? (
            <>
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-800">Заявки на вывод</h2>
                  <p className="text-sm text-slate-500">{pendingCount} заявок ожидают обработки</p>
                </div>
                <Button 
                  onClick={handleBulkApprove}
                  disabled={processingId === 'bulk'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  Оплатить все ({pendingCount})
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <th className="text-left py-3 px-5 font-medium">Партнёр</th>
                      <th className="text-left py-3 px-5 font-medium">Реквизиты</th>
                      <th className="text-right py-3 px-5 font-medium">Сумма</th>
                      <th className="text-left py-3 px-5 font-medium">Дата</th>
                      <th className="text-right py-3 px-5 font-medium min-w-[200px]">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats?.pendingWithdrawals?.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                              {(w.userName || w.userId || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800 text-sm">{w.userName || w.userId}</div>
                              <div className="text-xs text-slate-400">{w.method || 'bank'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-sm text-slate-600 max-w-[200px] truncate">
                          {typeof w.details === 'object' ? JSON.stringify(w.details) : w.details || 'Не указаны'}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className="font-bold text-slate-900 tabular-nums">
                            ₽{(w.amount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-sm text-slate-500">
                          {w.createdAt?.split('T')[0] || '-'}
                        </td>
                        <td className="py-4 px-5 min-w-[200px]">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(w.id)}
                              disabled={!!processingId}
                              type="button"
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-50"
                              style={{ backgroundColor: '#10b981', minWidth: '90px' }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Выплатить
                            </button>
                            <button
                              onClick={() => handleReject(w.id)}
                              disabled={!!processingId}
                              type="button"
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md disabled:opacity-50"
                              style={{ backgroundColor: 'white', color: '#dc2626', border: '1px solid #fecaca', minWidth: '90px' }}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Отказать
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                <PartyPopper className="w-5 h-5 inline mr-1" />
                Все заявки обработаны!
              </h3>
              <p className="text-slate-500 text-sm">Вы великолепны! Нет ожидающих заявок на вывод.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-semibold text-slate-800">История транзакций</h2>
              <div className="flex items-center gap-3">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-slate-100 h-9">
                    <TabsTrigger value="all" className="text-xs px-3">Все</TabsTrigger>
                    <TabsTrigger value="sales" className="text-xs px-3">Продажи</TabsTrigger>
                    <TabsTrigger value="payouts" className="text-xs px-3">Выплаты</TabsTrigger>
                    <TabsTrigger value="commissions" className="text-xs px-3">Комиссии</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-[180px] h-9 text-sm bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredOperations.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                Нет операций
              </div>
            ) : (
              filteredOperations.map((op, idx) => (
                <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      op.type === 'order' ? 'bg-emerald-50' :
                      op.type === 'earning' ? 'bg-blue-50' : 'bg-orange-50'
                    }`}>
                      {op.type === 'order' ? (
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                      ) : op.type === 'earning' ? (
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{op.user || 'Не указан'}</div>
                      <div className="text-xs text-slate-400">{op.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold tabular-nums ${
                      op.type === 'order' ? 'text-emerald-600' : 
                      op.type === 'earning' ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      ₽{(op.amount || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center justify-end gap-2">
                      {op.date?.split('T')[0] || '-'}
                      {op.status && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          op.status === 'completed' || op.status === 'approved' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : op.status === 'pending' 
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {op.status === 'approved' || op.status === 'completed' ? 'Выплачено' : 
                           op.status === 'pending' ? 'Ожидает' : 'Отклонено'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ 
  title, 
  value, 
  subtitle,
  secondaryValue,
  secondaryLabel,
  trend, 
  trendUp, 
  icon, 
  iconBg,
  iconColor,
  highlight,
  highlightColor,
  badge,
  valueColor
}: { 
  title: string;
  value: number;
  subtitle?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
  trend?: number;
  trendUp?: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
  highlightColor?: 'amber' | 'red';
  badge?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border ${highlight ? (highlightColor === 'red' ? 'border-red-200' : 'border-amber-200') : 'border-slate-100'} shadow-sm p-5 relative`}>
      {badge && <div className="absolute top-4 right-4">{badge}</div>}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trendUp ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <div className="text-xs text-slate-500 mb-1">{title}</div>
      <div className={`text-2xl font-bold tabular-nums mb-1 ${valueColor || 'text-slate-900'}`}>
        ₽{value.toLocaleString()}
      </div>
      {secondaryValue !== undefined && secondaryLabel && (
        <div className="text-sm text-slate-500 mb-1">
          ✅ {secondaryLabel}: ₽{secondaryValue.toLocaleString()}
        </div>
      )}
      {subtitle && (
        <div className="text-xs text-slate-400">{subtitle}</div>
      )}
    </div>
  );
}

export default AdminFinanceRu;

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, DollarSign, Wallet, CheckCircle2, XCircle, Search, Download,
  ArrowUpRight, ArrowDownRight, Clock, CheckCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../utils/api';

interface FinanceStats {
  totalRevenue: number;
  netProfit: number;
  usersBalanceTotal: number;
  pendingPayoutsSum: number;
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

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminFinanceStats();
      
      const last30Days = generateLast30Days();
      const chartData = last30Days.map(date => {
        const dayRevenue = (data.recentOperations || [])
          .filter((op: any) => op.type === 'order' && op.date?.startsWith(date))
          .reduce((sum: number, op: any) => sum + (op.amount || 0), 0);
        const dayPayouts = (data.recentOperations || [])
          .filter((op: any) => op.type === 'earning' && op.date?.startsWith(date))
          .reduce((sum: number, op: any) => sum + (op.amount || 0), 0);
        return { date: date.slice(5), revenue: dayRevenue, payouts: dayPayouts };
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
    let ops = stats.recentOperations;
    
    if (activeTab === 'sales') ops = ops.filter(o => o.type === 'order');
    else if (activeTab === 'payouts') ops = ops.filter(o => o.type === 'withdrawal');
    else if (activeTab === 'commissions') ops = ops.filter(o => o.type === 'earning');
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      ops = ops.filter(o => 
        o.userName?.toLowerCase().includes(term) || 
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
      op.userName || '',
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Загрузка...</div>
      </div>
    );
  }

  const pendingCount = stats?.pendingWithdrawals?.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Финансы</h1>
            <p className="text-slate-500 text-sm">Neobank Business Dashboard</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Экспорт CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard
                title="Оборот"
                value={stats?.totalRevenue || 0}
                trend={15.2}
                trendUp={true}
                icon={<DollarSign className="w-5 h-5" />}
                color="emerald"
              />
              <KPICard
                title="Чистая прибыль"
                value={stats?.netProfit || 0}
                trend={8.7}
                trendUp={true}
                icon={<TrendingUp className="w-5 h-5" />}
                color="blue"
              />
              <KPICard
                title="К выплате"
                value={stats?.pendingPayoutsSum || 0}
                count={pendingCount}
                icon={<Clock className="w-5 h-5" />}
                color={pendingCount > 0 ? "amber" : "slate"}
                highlight={pendingCount > 0}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Cashflow: Выручка vs Выплаты</h2>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Выручка</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-400" />
                    <span className="text-slate-600">Выплаты</span>
                  </div>
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()}₽`, '']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenue)" name="Выручка" />
                    <Area type="monotone" dataKey="payouts" stroke="#fb923c" strokeWidth={2} fill="url(#colorPayouts)" name="Выплаты" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-slate-100">
                      <TabsTrigger value="all" className="text-xs">Все</TabsTrigger>
                      <TabsTrigger value="sales" className="text-xs">Продажи</TabsTrigger>
                      <TabsTrigger value="payouts" className="text-xs">Выплаты</TabsTrigger>
                      <TabsTrigger value="commissions" className="text-xs">Комиссии</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Поиск..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:w-[200px] h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <th className="text-left py-3 px-4 font-medium">Дата</th>
                      <th className="text-left py-3 px-4 font-medium">Тип</th>
                      <th className="text-left py-3 px-4 font-medium">Партнёр</th>
                      <th className="text-right py-3 px-4 font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOperations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Нет операций
                        </td>
                      </tr>
                    ) : (
                      filteredOperations.map((op, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 text-slate-600 tabular-nums">
                            {op.date?.split('T')[0] || '-'}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              op.type === 'order' ? 'bg-emerald-50 text-emerald-700' :
                              op.type === 'earning' ? 'bg-blue-50 text-blue-700' :
                              'bg-orange-50 text-orange-700'
                            }`}>
                              {op.type === 'order' ? 'Продажа' : op.type === 'earning' ? 'Комиссия' : 'Вывод'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700">{op.userName || '-'}</td>
                          <td className={`py-2.5 px-4 text-right font-medium tabular-nums ${
                            op.type === 'order' ? 'text-emerald-600' : 
                            op.type === 'earning' ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            {op.type === 'order' ? '+' : '-'}{(op.amount || 0).toLocaleString()}₽
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className={`bg-white rounded-xl shadow-sm sticky top-6 ${pendingCount > 0 ? 'ring-2 ring-amber-200' : ''}`}>
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-500" />
                    Заявки на вывод
                  </h2>
                  {pendingCount > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </div>
                {pendingCount > 1 && (
                  <Button 
                    onClick={handleBulkApprove}
                    disabled={processingId === 'bulk'}
                    size="sm"
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Оплатить все ({pendingCount})
                  </Button>
                )}
              </div>
              
              <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
                <div className="p-3 space-y-3">
                  {!stats?.pendingWithdrawals?.length ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm">Нет заявок</p>
                    </div>
                  ) : (
                    stats.pendingWithdrawals.map((w) => (
                      <div 
                        key={w.id} 
                        className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {(w.userName || w.userId || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-sm truncate">
                              {w.userName || w.userId}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {typeof w.details === 'object' ? JSON.stringify(w.details) : w.details || w.method}
                            </div>
                            <div className="font-bold text-slate-900 mt-1 tabular-nums">
                              {(w.amount || 0).toLocaleString()}₽
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => handleApprove(w.id)}
                            disabled={!!processingId}
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Оплатить
                          </Button>
                          <Button
                            onClick={() => handleReject(w.id)}
                            disabled={!!processingId}
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-8"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ 
  title, 
  value, 
  trend, 
  trendUp, 
  count, 
  icon, 
  color,
  highlight 
}: { 
  title: string;
  value: number;
  trend?: number;
  trendUp?: boolean;
  count?: number;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'amber' | 'slate';
  highlight?: boolean;
}) {
  const colorClasses = {
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-200' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-200' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600', ring: 'ring-slate-200' },
  };
  
  const c = colorClasses[color];
  
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 ${highlight ? `ring-2 ${c.ring}` : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend}%
          </div>
        )}
        {count !== undefined && count > 0 && (
          <div className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {count} заявок
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tabular-nums">
          {value.toLocaleString()}₽
        </div>
        <div className="text-sm text-slate-500 mt-0.5">{title}</div>
      </div>
    </div>
  );
}

export default AdminFinanceRu;

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  CreditCard,
  CheckCheck,
  Ban,
  ChevronDown,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AdminFinancePageProps {
  currentUser: any;
}

export function AdminFinancePage({ currentUser }: AdminFinancePageProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // UI State
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'sales' | 'payouts' | 'commissions'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('30'); // 7, 30, 90, 365, all
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    withdrawal: any;
    action: 'approve' | 'reject' | null;
  }>({ open: false, withdrawal: null, action: null });
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      console.log('💰 AdminFinancePage: Loading finance data');
      console.log('💰 Current user:', currentUser?.id, 'isAdmin:', currentUser?.isAdmin);

      // Загружаем финансовую статистику из расширенного /admin/stats
      const statsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/stats`;
      console.log('💰 Requesting:', statsUrl);
      
      const statsResponse = await fetch(statsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
      });

      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        console.error('❌ Stats response error:', statsResponse.status, errorText);
        throw new Error(`Failed to load finance stats: ${statsResponse.status} - ${errorText}`);
      }

      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        // Извлекаем finance данные из stats.finance
        const financeStats = statsData.stats?.finance || statsData.stats;
        setStats(financeStats);
        console.log('✅ Stats loaded:', financeStats);
      } else {
        console.error('❌ Stats response not successful:', statsData);
        throw new Error(statsData.error || 'Failed to load stats');
      }

      // Загружаем все заявки на вывод
      const withdrawalsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/withdrawals`;
      console.log('💰 Requesting withdrawals:', withdrawalsUrl);
      
      const withdrawalsResponse = await fetch(withdrawalsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
      });

      if (withdrawalsResponse.ok) {
        const withdrawalsData = await withdrawalsResponse.json();
        if (withdrawalsData.success) {
          const sorted = (withdrawalsData.withdrawals || []).sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          const pending = sorted.filter((w: any) => w.status === 'pending');
          setPendingPayouts(pending);
          
          setAllTransactions(sorted);
          console.log('✅ Withdrawals loaded:', sorted.length, 'total,', pending.length, 'pending');
        }
      } else {
        console.warn('⚠️ Failed to load withdrawals:', withdrawalsResponse.status);
      }

      // Генерируем данные для графика (последние 30 дней)
      generateChartData();

    } catch (error) {
      console.error('❌ Failed to load finance data:', error);
      toast.error('Ошибка загрузки финансовых данных');
      
      // Устанавливаем пустые данные вместо null, чтобы избежать ошибок рендера
      setStats({
        total_revenue: 0,
        users_balance_total: 0,
        pending_payouts_sum: 0,
        pending_payouts_count: 0,
        net_profit: 0,
        total_earnings_distributed: 0,
        completed_payouts_sum: 0,
        completed_orders: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = () => {
    // Генер��руем данные за последние 30 дней
    const days = 30;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Симуляция данных (в продакшене это должны быть реальные данные из заказов)
      const dayRevenue = Math.floor(Math.random() * 50000) + 10000;
      const dayPayouts = Math.floor(Math.random() * 30000) + 5000;
      
      data.push({
        date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
        revenue: dayRevenue,
        payouts: dayPayouts,
      });
    }
    
    setChartData(data);
  };

  const handlePayoutAction = async (withdrawal: any, action: 'approve' | 'reject') => {
    setActionDialog({ open: true, withdrawal, action });
    setActionNote('');
  };

  const confirmPayoutAction = async () => {
    if (!actionDialog.withdrawal || !actionDialog.action) return;

    try {
      setProcessing(true);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/payout-action`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({
          withdrawalId: actionDialog.withdrawal.id,
          action: actionDialog.action,
          note: actionNote || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Операция выполнена');
        setActionDialog({ open: false, withdrawal: null, action: null });
        setActionNote('');
        loadFinanceData();
      } else {
        throw new Error(data.error || 'Failed to process action');
      }
    } catch (error) {
      console.error('❌ Payout action error:', error);
      toast.error('Ошибка обработки заявки');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (pendingPayouts.length === 0) return;
    
    if (!confirm(`⚠️ Вы уверены, что хотите одобрить все ${pendingPayouts.length} заявок на выплату?`)) {
      return;
    }

    try {
      setBulkProcessing(true);
      toast.loading('Обработка заявок...');

      for (const withdrawal of pendingPayouts) {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/payout-action`;
        
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
            'X-User-Id': currentUser.id,
          },
          body: JSON.stringify({
            withdrawalId: withdrawal.id,
            action: 'approve',
            note: 'Массовая выплата',
          }),
        });
      }

      toast.dismiss();
      toast.success(`✅ Одобрено ${pendingPayouts.length} заявок`);
      loadFinanceData();
    } catch (error) {
      toast.dismiss();
      console.error('Bulk approve error:', error);
      toast.error('Ошибка массовой обработки');
    } finally {
      setBulkProcessing(false);
    }
  };

  const filteredTransactions = allTransactions.filter(t => {
    // Фильтр по типу
    if (transactionFilter === 'sales') return t.type === 'sale';
    if (transactionFilter === 'payouts') return t.status === 'completed' || t.status === 'rejected';
    if (transactionFilter === 'commissions') return t.type === 'commission';
    
    // Фильтр по поиску
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.userEmail?.toLowerCase().includes(query) ||
        t.userName?.toLowerCase().includes(query) ||
        t.userId?.toLowerCase().includes(query) ||
        t.details?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#39B7FF]" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-gray-200 rounded-xl shadow-sm bg-white">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Ошибка загрузки данных</h2>
              <p className="text-gray-600 mb-6">
                Не далось загрузить финансовые данные. Проверьте права доступа.
              </p>
              <Button onClick={loadFinanceData} className="bg-[#39B7FF] hover:bg-[#2A9EE8] text-white">
                Попробовать снова
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Расчёт трендов
  const revenueTrend = 15; // +15% vs last month (в продакшене считать из реальных данных)
  const profitTrend = stats.net_profit > 0 ? 12 : -8;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Финансовая панель</h1>
            <p className="text-gray-600">Управление денежными потоками компании</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 📅 Date Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {dateFilter === '7' ? 'Последние 7 дней' :
                   dateFilter === '30' ? 'Последние 30 дней' :
                   dateFilter === '90' ? 'Последние 90 дней' :
                   dateFilter === '365' ? 'Последний год' :
                   'Всё время'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${dateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dateDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    {[
                      { value: '7', label: 'Последние 7 дней' },
                      { value: '30', label: 'Последние 30 дней' },
                      { value: '90', label: 'Последние 90 дней' },
                      { value: '365', label: 'Последний год' },
                      { value: 'all', label: 'Всё время' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setDateFilter(option.value);
                          setDateDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                          dateFilter === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                        {dateFilter === option.value && (
                          <CheckCircle2 className="w-4 h-4 inline ml-2 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export Button */}
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Экспорт</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout: Full Width */}
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* KPI Cards - 4 in a row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <Card className="border-gray-200 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <ArrowUpRight className="w-4 h-4" />
                  +{revenueTrend}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Общий оборот</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                ₽{stats.total_revenue?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.completed_orders || 0} завершённых заказов
              </p>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className="border-gray-200 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  profitTrend > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {profitTrend > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {profitTrend > 0 ? '+' : ''}{profitTrend}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Чистая прибыль</p>
              <p className={`text-3xl font-bold tabular-nums ${
                stats.net_profit < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                ₽{stats.net_profit?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Оборот минус выплаты
              </p>
            </CardContent>
          </Card>

          {/* Pending Payouts */}
          <Card className={`border-gray-200 rounded-xl shadow-sm transition-all ${
            (stats.pending_payouts_sum || 0) > 0 
              ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200 shadow-md' 
              : 'bg-white'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  (stats.pending_payouts_sum || 0) > 0 ? 'bg-orange-100' : 'bg-gray-50'
                }`}>
                  <AlertCircle className={`w-6 h-6 ${
                    (stats.pending_payouts_sum || 0) > 0 ? 'text-orange-600' : 'text-gray-400'
                  }`} />
                </div>
                {(stats.pending_payouts_sum || 0) > 0 && (
                  <Badge className="bg-orange-600 text-white text-xs">
                    Требует действий
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">К выплате</p>
              <p className={`text-3xl font-bold tabular-nums ${
                (stats.pending_payouts_sum || 0) > 0 ? 'text-orange-600' : 'text-gray-900'
              }`}>
                ₽{stats.pending_payouts_sum?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.pending_payouts_count || 0} заявок ожидают
              </p>
            </CardContent>
          </Card>

          {/* 💼 NEW: Partners Balance / Deposits */}
          <Card className="border-gray-200 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex items-center gap-1 text-purple-600 text-sm font-medium">
                  💎
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Баланс партнёров</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                ₽{stats.users_balance_total?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Накоплено на счетах пользователей
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart: Revenue vs Payouts - Full Width */}
        <Card className="border-gray-200 rounded-xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              Выручка и выплаты (последние 30 дней)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₽${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => `₽${value.toLocaleString()}`}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '14px' }}
                  iconType="circle"
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  name="Выручка"
                />
                <Area 
                  type="monotone" 
                  dataKey="payouts" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPayouts)" 
                  name="Выплаты"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 💰 ЗАЯВКИ НА ВЫВОД (NEW SECTION) */}
        {pendingPayouts.length > 0 ? (
          <Card className="border-orange-200 rounded-xl shadow-md bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Заявки на вывод
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {pendingPayouts.length} {pendingPayouts.length === 1 ? 'заявка ожидает' : 'заявок ожидают'} обработки
                    </p>
                  </div>
                </div>
                {pendingPayouts.length > 1 && (
                  <Button
                    onClick={handleBulkApprove}
                    disabled={bulkProcessing}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    size="sm"
                  >
                    {bulkProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCheck className="w-4 h-4" />
                    )}
                    Оплатить все ({pendingPayouts.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPayouts.map((withdrawal, index) => {
                  // Функция для форматирования времени "2 часа назад"
                  const getTimeAgo = (date: string) => {
                    const now = new Date();
                    const past = new Date(date);
                    const diffMs = now.getTime() - past.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 60) return `${diffMins} мин назад`;
                    if (diffHours < 24) return `${diffHours} ч назад`;
                    return `${diffDays} дн назад`;
                  };

                  // Генерация инициалов и цвета
                  const getInitials = (email: string) => {
                    const parts = email.split('@')[0].split('.');
                    if (parts.length >= 2) {
                      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                    }
                    return email.substring(0, 2).toUpperCase();
                  };

                  const getColorClass = (index: number) => {
                    const colors = [
                      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
                      'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
                    ];
                    return colors[index % colors.length];
                  };

                  return (
                    <div
                      key={`payout-${index}-${withdrawal.id}`}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-all"
                    >
                      {/* КТО: Аватар + Имя */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[250px]">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${
                          getColorClass(index)
                        }`}>
                          {getInitials(withdrawal.userEmail || withdrawal.userId || 'US')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {withdrawal.userName || withdrawal.userEmail?.split('@')[0] || withdrawal.userId}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {withdrawal.userEmail || 'Не указан'}
                          </p>
                        </div>
                      </div>

                      {/* КУДА: Банк/Карта */}
                      <div className="flex-1 min-w-0 max-w-[300px] px-4">
                        <p className="text-xs text-gray-500 mb-1">Реквизиты:</p>
                        <p className="text-sm font-medium text-gray-900 truncate font-mono">
                          {withdrawal.details || 'Не указаны'}
                        </p>
                        <Badge className="bg-gray-100 text-gray-700 text-xs mt-1">
                          {withdrawal.method || 'USDT'}
                        </Badge>
                      </div>

                      {/* СУММА */}
                      <div className="text-center px-4">
                        <p className="text-xl font-bold text-gray-900 tabular-nums">
                          ₽{withdrawal.amount?.toLocaleString()}
                        </p>
                      </div>

                      {/* ДАТА */}
                      <div className="text-center px-4 min-w-[120px]">
                        <p className="text-sm text-gray-600">
                          {getTimeAgo(withdrawal.createdAt)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(withdrawal.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>

                      {/* ДЕЙСТВИЯ: Две кнопки */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1 px-4"
                          onClick={() => handlePayoutAction(withdrawal, 'approve')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Оплатить
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 gap-1 px-4"
                          onClick={() => handlePayoutAction(withdrawal, 'reject')}
                        >
                          <XCircle className="w-4 h-4" />
                          Отказать
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Состояние "Всё чисто"
          <Card className="border-green-200 rounded-xl shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                🎉 Все заявки обработаны!
              </h3>
              <p className="text-gray-600">
                Вы великолепны! Нет ожидающих заявок на вывод.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        <Card className="border-gray-200 rounded-xl shadow-sm bg-white">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg font-semibold text-gray-900">
                История транзакций
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Tabs */}
            <Tabs value={transactionFilter} onValueChange={(v: any) => setTransactionFilter(v)} className="mb-4">
              <TabsList className="bg-gray-100">
                <TabsTrigger value="all" className="text-sm">Все</TabsTrigger>
                <TabsTrigger value="sales" className="text-sm">Продажи</TabsTrigger>
                <TabsTrigger value="payouts" className="text-sm">Выплаты</TabsTrigger>
                <TabsTrigger value="commissions" className="text-sm">Комиссии</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Table */}
            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Нет транзакций</p>
                </div>
              ) : (
                filteredTransactions.slice(0, 10).map((transaction, index) => {
                  // Генерация инициалов для аватара
                  const getInitials = (email: string) => {
                    const parts = email.split('@')[0].split('.');
                    if (parts.length >= 2) {
                      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                    }
                    return email.substring(0, 2).toUpperCase();
                  };

                  const getRandomColor = (email: string) => {
                    const colors = [
                      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
                      'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
                    ];
                    const index = email.charCodeAt(0) % colors.length;
                    return colors[index];
                  };

                  return (
                    <div
                      key={`transaction-${index}-${transaction.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* User Avatar Cell */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          getRandomColor(transaction.userEmail || transaction.userId || 'user')
                        }`}>
                          {getInitials(transaction.userEmail || transaction.userId || 'US')}
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {transaction.userName || transaction.userEmail?.split('@')[0] || transaction.userId}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {transaction.userEmail || 'Не указан'}
                          </p>
                        </div>

                        {/* Date & Method */}
                        <div className="hidden sm:block text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString('ru-RU')} • {transaction.method || 'USDT'}
                        </div>
                      </div>

                      {/* Amount & Status */}
                      <div className="text-right ml-4">
                        <p className="text-sm font-semibold text-gray-900 tabular-nums">
                          ₽{transaction.amount?.toLocaleString()}
                        </p>
                        <Badge className={`text-xs mt-1 ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                          transaction.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {transaction.status === 'completed' ? 'Выплачено' :
                           transaction.status === 'rejected' ? 'Отклонено' : 'Ожидание'}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!processing) {
          setActionDialog({ open, withdrawal: null, action: null });
          setActionNote('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.action === 'approve' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Подтвердить выплату
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Отклонить заявку
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {actionDialog.withdrawal && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Пользователь:</span>
                  <span className="font-medium text-gray-900">
                    {actionDialog.withdrawal.userEmail || actionDialog.withdrawal.userId}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Сумма:</span>
                  <span className="font-bold text-gray-900 tabular-nums">
                    ₽{actionDialog.withdrawal.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Метод:</span>
                  <span className="font-medium text-gray-900">
                    {actionDialog.withdrawal.method || 'USDT'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Реквизиты:</span>
                  <p className="font-mono text-xs text-gray-900 mt-1 break-all">
                    {actionDialog.withdrawal.details || 'Не указаны'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-2 block font-medium">
                  Комментарий (опционально):
                </label>
                <Textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={
                    actionDialog.action === 'approve' 
                      ? 'Например: Выплачено на кошелёк 15.12.2024'
                      : 'Например: Неверные реквизиты'
                  }
                  rows={3}
                  className="text-sm"
                />
              </div>

              {actionDialog.action === 'reject' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Средства будут возвращены на баланс пользователя
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, withdrawal: null, action: null });
                setActionNote('');
              }}
              disabled={processing}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              className={`flex-1 ${
                actionDialog.action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              onClick={confirmPayoutAction}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionDialog.action === 'approve' ? 'Подтвердить' : 'Отклонить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
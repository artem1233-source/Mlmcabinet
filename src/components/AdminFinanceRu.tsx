import { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  AlertCircle,
  Check,
  X,
  Loader2,
  RefreshCw,
  Download,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import * as api from '../utils/api';

interface AdminFinanceRuProps {
  currentUser: any;
}

interface FinanceStats {
  totalRevenue: number;
  usersBalanceTotal: number;
  pendingPayoutsSum: number;
  pendingPayoutsCount: number;
  totalEarnings: number;
  netProfit: number;
  totalPaidOut: number;
  totalOrders: number;
  totalUsers: number;
}

interface PendingWithdrawal {
  id: string;
  oderId: string;
  userId: string;
  userName: string;
  amount: number;
  details: string;
  method: string;
  createdAt: string;
}

interface RecentOperation {
  type: 'order' | 'earning' | 'withdrawal';
  date: string;
  amount: number;
  description: string;
  user: string;
  status?: string;
}

export function AdminFinanceRu({ currentUser: _currentUser }: AdminFinanceRuProps) {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [recentOperations, setRecentOperations] = useState<RecentOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminFinanceStats();
      if (data.success) {
        setStats(data.stats);
        setPendingWithdrawals(data.pendingWithdrawals || []);
        setRecentOperations(data.recentOperations || []);
      } else {
        toast.error('Не удалось загрузить финансовые данные');
      }
    } catch (error) {
      console.error('Load finance data error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawal: PendingWithdrawal) => {
    setProcessing(withdrawal.id);
    try {
      const data = await api.approvePayout(withdrawal.id);
      if (data.success) {
        toast.success(`Выплата ${withdrawal.amount.toLocaleString()}₽ подтверждена`);
        loadFinanceData();
      } else {
        toast.error(data.error || 'Ошибка подтверждения');
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Ошибка при подтверждении выплаты');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (withdrawal: PendingWithdrawal) => {
    setProcessing(withdrawal.id);
    try {
      const data = await api.rejectPayout(withdrawal.id, 'Отклонено администратором');
      if (data.success) {
        toast.success(`Заявка отклонена. ${withdrawal.amount.toLocaleString()}₽ возвращены на баланс`);
        loadFinanceData();
      } else {
        toast.error(data.error || 'Ошибка отклонения');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Ошибка при отклонении заявки');
    } finally {
      setProcessing(null);
    }
  };

  const exportToCSV = () => {
    if (!recentOperations.length) {
      toast.info('Нет данных для экспорта');
      return;
    }
    
    const headers = ['Тип', 'Дата', 'Пользователь', 'Сумма', 'Описание'];
    const typeMap: Record<string, string> = {
      order: 'Заказ',
      earning: 'Начисление',
      withdrawal: 'Вывод'
    };
    
    const rows = recentOperations.map(op => [
      typeMap[op.type] || op.type,
      new Date(op.date).toLocaleString('ru-RU'),
      op.user || '-',
      op.amount.toString(),
      op.description
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `финансы_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Экспорт завершён');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-gray-500">Загрузка финансовых данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6" style={{ backgroundColor: '#F7FAFC' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Финансы компании</h1>
          <p className="text-gray-600 mt-1">Управление выплатами и статистика</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button variant="outline" onClick={loadFinanceData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Оборот компании */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-500 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-blue-700 font-medium">Оборот</span>
            </div>
            <div className="text-3xl font-bold text-blue-800">
              {(stats?.totalRevenue || 0).toLocaleString()}₽
            </div>
            <div className="text-sm text-blue-600 mt-1">
              {stats?.totalOrders || 0} заказов
            </div>
          </CardContent>
        </Card>

        {/* Чистая прибыль */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-500 rounded-xl">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-700 font-medium">Чистая прибыль</span>
            </div>
            <div className="text-3xl font-bold text-green-800">
              {(stats?.netProfit || 0).toLocaleString()}₽
            </div>
            <div className="text-sm text-green-600 mt-1">
              После комиссий партнёрам
            </div>
          </CardContent>
        </Card>

        {/* Баланс партнёров */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-amber-500 rounded-xl">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="text-amber-700 font-medium">Баланс партнёров</span>
            </div>
            <div className="text-3xl font-bold text-amber-800">
              {(stats?.usersBalanceTotal || 0).toLocaleString()}₽
            </div>
            <div className="text-sm text-amber-600 mt-1">
              <Users className="w-3 h-3 inline mr-1" />
              {stats?.totalUsers || 0} партнёров
            </div>
          </CardContent>
        </Card>

        {/* К выплате */}
        <Card className={`${
          (stats?.pendingPayoutsSum || 0) > 0 
            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-3 rounded-xl ${
                (stats?.pendingPayoutsSum || 0) > 0 ? 'bg-red-500' : 'bg-gray-400'
              }`}>
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <span className={`font-medium ${
                (stats?.pendingPayoutsSum || 0) > 0 ? 'text-red-700' : 'text-gray-600'
              }`}>
                К выплате
              </span>
            </div>
            <div className={`text-3xl font-bold ${
              (stats?.pendingPayoutsSum || 0) > 0 ? 'text-red-700' : 'text-gray-600'
            }`}>
              {(stats?.pendingPayoutsSum || 0).toLocaleString()}₽
            </div>
            <div className={`text-sm mt-1 ${
              (stats?.pendingPayoutsSum || 0) > 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {stats?.pendingPayoutsCount || 0} заявок ожидают
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Withdrawals Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Заявки на выплату
            {pendingWithdrawals.length > 0 && (
              <Badge className="bg-red-500 text-white ml-2">
                {pendingWithdrawals.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingWithdrawals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p>Нет заявок на выплату</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Дата</th>
                    <th className="pb-3 font-medium">Партнёр</th>
                    <th className="pb-3 font-medium">Реквизиты</th>
                    <th className="pb-3 font-medium text-right">Сумма</th>
                    <th className="pb-3 font-medium text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingWithdrawals.map((w) => (
                    <tr key={w.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 text-sm text-gray-600">
                        {formatDate(w.createdAt)}
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-gray-800">{w.userName || w.userId}</div>
                        <div className="text-xs text-gray-500">{w.method}</div>
                      </td>
                      <td className="py-4 text-sm text-gray-600 max-w-[200px] truncate">
                        {w.details}
                      </td>
                      <td className="py-4 text-right font-bold text-gray-800">
                        {w.amount.toLocaleString()}₽
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(w)}
                            disabled={processing === w.id}
                          >
                            {processing === w.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Выплатить
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleReject(w)}
                            disabled={processing === w.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Operations History */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-500" />
            История операций
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOperations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Нет операций для отображения</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOperations.map((op, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    op.type === 'order' ? 'bg-blue-50 border-blue-200' :
                    op.type === 'earning' ? 'bg-green-50 border-green-200' :
                    'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      op.type === 'order' ? 'bg-blue-100' :
                      op.type === 'earning' ? 'bg-green-100' :
                      'bg-amber-100'
                    }`}>
                      {op.type === 'order' ? (
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                      ) : op.type === 'earning' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{op.description}</div>
                      <div className="text-xs text-gray-500">
                        {op.user} &bull; {formatDate(op.date)}
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold ${
                    op.type === 'order' ? 'text-blue-700' :
                    op.type === 'earning' ? 'text-green-700' :
                    'text-amber-700'
                  }`}>
                    {op.type === 'withdrawal' ? '-' : '+'}
                    {op.amount.toLocaleString()}₽
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

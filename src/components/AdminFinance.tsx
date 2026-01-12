import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// 🔧 Функция для безопасного отображения method и details
const formatPaymentField = (field: any): string => {
  if (!field) return 'Не указано';
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    // Если объект, попробуем извлечь важные поля
    if (field.type) {
      if (field.card_last4) {
        return `${field.type} (**** ${field.card_last4})`;
      }
      return field.type;
    }
    // Если не удалось извлечь, вернем JSON строку
    try {
      return JSON.stringify(field);
    } catch {
      return 'Формат не поддерживается';
    }
  }
  return String(field);
};

interface AdminFinanceProps {
  currentUser: any;
}

export function AdminFinance({ currentUser }: AdminFinanceProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    withdrawal: any;
    action: 'approve' | 'reject' | null;
  }>({ open: false, withdrawal: null, action: null });
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cleaningOrders, setCleaningOrders] = useState(false);

  useEffect(() => {
    console.log('💰 AdminFinance mounted');
    console.log('   Current user:', currentUser);
    console.log('   Is admin:', currentUser?.isAdmin);
    console.log('   User ID:', currentUser?.id);
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      console.log('📊 AdminFinance: Loading finance data for user:', currentUser.id);

      // Загружаем финансовую статистику из расширенного /admin/stats
      const statsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/stats`;
      console.log('📊 Request URL:', statsUrl);
      console.log('📊 Headers:', {
        'X-User-Id': currentUser.id,
        'Authorization': `Bearer ${publicAnonKey.substring(0, 20)}...`,
      });
      
      const statsResponse = await fetch(statsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
      });

      console.log('📊 Response status:', statsResponse.status);

      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        console.error('❌ Stats response error:', errorText);
        throw new Error(`Failed to load finance stats: ${statsResponse.status} - ${errorText}`);
      }

      const statsData = await statsResponse.json();
      console.log('📊 Stats data received:', statsData);
      
      if (statsData.success) {
        // Извлекаем finance данные из stats.finance
        const financeStats = statsData.stats?.finance || statsData.stats;
        setStats(financeStats);
        console.log('✅ Stats loaded successfully:', financeStats);
      } else {
        throw new Error(statsData.error || 'Unknown error');
      }

      // Загружаем все заявки на вывод
      const withdrawalsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/withdrawals`;
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
          // Сортируем по дате
          const sorted = (withdrawalsData.withdrawals || []).sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          // Фильтруем pending
          const pending = sorted.filter((w: any) => w.status === 'pending');
          setPendingPayouts(pending);
          
          // Последние 10 транзакций (любой статус кроме pending)
          const recent = sorted
            .filter((w: any) => w.status !== 'pending')
            .slice(0, 10);
          setRecentTransactions(recent);
        }
      }

    } catch (error) {
      console.error('❌ Failed to load finance data:', error);
      toast.error('Ошибка загрузки финансовых данных: ' + String(error));
      
      // Set empty stats to show the UI even on error
      setStats({
        total_revenue: 0,
        users_balance_total: 0,
        pending_payouts_sum: 0,
        pending_payouts_count: 0,
        net_profit: 0,
        total_earnings_distributed: 0,
        completed_payouts_sum: 0,
        total_orders: 0,
        completed_orders: 0,
        total_users: 0,
      });
    } finally {
      setLoading(false);
    }
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
      
      console.log('💸 Sending payout action:', {
        withdrawalId: actionDialog.withdrawal.id,
        action: actionDialog.action,
        note: actionNote
      });
      
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
      console.log('💸 Payout action response:', data);

      if (data.success) {
        toast.success(data.message || 'Операция выполнена');
        setActionDialog({ open: false, withdrawal: null, action: null });
        setActionNote('');
        loadFinanceData(); // Перезагружаем данные
      } else {
        throw new Error(data.error || 'Failed to process action');
      }
    } catch (error) {
      console.error('❌ Payout action error:', error);
      toast.error('Ошибка обработки заявки: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProcessing(false);
    }
  };

  const handleCleanInvalidOrders = async () => {
    if (!confirm('⚠️ Это действие удалит все заказы с некорректными датами (в будущем). Проолжить?')) {
      return;
    }

    try {
      setCleaningOrders(true);
      toast.loading('Очистка невалидных заказов...');

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/clean-invalid-orders`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.dismiss();
        toast.success(`✅ Удалено ${data.deletedCount} невалидных заказов`);
        console.log('Deleted orders:', data.deletedOrders);
        loadFinanceData(); // Перезагружаем данные
      } else {
        throw new Error(data.error || 'Failed to clean orders');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Clean orders error:', error);
      toast.error('Ошибка очистки заказов');
    } finally {
      setCleaningOrders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#39B7FF]" />
      </div>
    );
  }

  // If stats is still null after loading, show error state
  if (!stats) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#1E1E1E] mb-2">
                Ошибка загрузки данных
              </h2>
              <p className="text-[#666] mb-6">
                Не удалось загрузить финансовые данные. Проверьте права доступа.
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

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1E1E1E]">Финансы компании</h1>
                <p className="text-[#666]">
                  Управление денежными потоками и выплатами
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 gap-2"
              onClick={handleCleanInvalidOrders}
              disabled={cleaningOrders}
            >
              {cleaningOrders ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Очистить невалидные</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#F0F9FF] rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#39B7FF]" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>
                Оборот компании
              </p>
              <p className="text-[#1E1E1E]" style={{ fontSize: '28px', fontWeight: '700' }}>
                ₽{stats?.total_revenue?.toLocaleString() || '0'}
              </p>
              <p className="text-[#999]" style={{ fontSize: '12px', marginTop: '4px' }}>
                {stats?.completed_orders || 0} завершённых заказов
              </p>
            </CardContent>
          </Card>

          {/* Users Balance */}
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#FFF7ED] rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#FB923C]" />
                </div>
              </div>
              <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>
                Баланс партнёров
              </p>
              <p className="text-[#1E1E1E]" style={{ fontSize: '28px', fontWeight: '700' }}>
                ₽{stats?.users_balance_total?.toLocaleString() || '0'}
              </p>
              <p className="text-[#999]" style={{ fontSize: '12px', marginTop: '4px' }}>
                Долг системы перед партнёрами
              </p>
            </CardContent>
          </Card>

          {/* Pending Payouts */}
          <Card className={`border-[#E6E9EE] rounded-2xl shadow-sm ${
            (stats?.pending_payouts_sum || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-white'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  (stats?.pending_payouts_sum || 0) > 0 ? 'bg-red-100' : 'bg-[#FEF2F2]'
                }`}>
                  <AlertCircle className={`w-6 h-6 ${
                    (stats?.pending_payouts_sum || 0) > 0 ? 'text-red-600' : 'text-[#EF4444]'
                  }`} />
                </div>
                {(stats?.pending_payouts_sum || 0) > 0 && (
                  <Badge className="bg-red-600 text-white">Требует действий</Badge>
                )}
              </div>
              <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>
                К выплате
              </p>
              <p className={`${
                (stats?.pending_payouts_sum || 0) > 0 ? 'text-red-600' : 'text-[#1E1E1E]'
              }`} style={{ fontSize: '28px', fontWeight: '700' }}>
                ₽{stats?.pending_payouts_sum?.toLocaleString() || '0'}
              </p>
              <p className="text-[#999]" style={{ fontSize: '12px', marginTop: '4px' }}>
                {stats?.pending_payouts_count || 0} заявок ожидают
              </p>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-[#12C9B6]" />
                </div>
                {(stats?.net_profit || 0) > 0 && (
                  <ArrowUpRight className="w-5 h-5 text-green-500" />
                )}
                {(stats?.net_profit || 0) < 0 && (
                  <ArrowDownRight className="w-5 h-5 text-red-500" />
                )}
              </div>
              <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>
                Чистая прибыль
              </p>
              <p className={`${
                (stats?.net_profit || 0) < 0 ? 'text-red-600' : 'text-[#1E1E1E]'
              }`} style={{ fontSize: '28px', fontWeight: '700' }}>
                ₽{stats?.net_profit?.toLocaleString() || '0'}
              </p>
              <p className="text-[#999]" style={{ fontSize: '12px', marginTop: '4px' }}>
                Оборот минус начисления
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Payouts Management */}
        {pendingPayouts.length > 0 && (
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-8">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Заявки на выплату ({pendingPayouts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPayouts.map((withdrawal, index) => (
                  <div
                    key={`pending-${index}-${withdrawal.id || ''}-${withdrawal.createdAt || ''}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#F7FAFC] rounded-xl border border-red-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                          {withdrawal.userEmail || withdrawal.userId}
                        </p>
                        <Badge className="bg-yellow-100 text-yellow-700">
                          {withdrawal.method || 'USDT'}
                        </Badge>
                      </div>
                      <p className="text-[#666]" style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600' }}>Сумма:</span> ₽{withdrawal.amount?.toLocaleString()}
                      </p>
                      <p className="text-[#666]" style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600' }}>Реквизиты:</span> {formatPaymentField(withdrawal.details) || 'Не указаны'}
                      </p>
                      <p className="text-[#999]" style={{ fontSize: '12px' }}>
                        {new Date(withdrawal.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handlePayoutAction(withdrawal, 'approve')}
                      >
                        <CheckCircle2 className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Выплачено</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handlePayoutAction(withdrawal, 'reject')}
                      >
                        <XCircle className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Вернуть</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions History */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E]">История операций</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-[#666] text-center py-8">Нет завершённых операций</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction, index) => (
                  <div
                    key={`history-${index}-${transaction.id || ''}-${transaction.createdAt || ''}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F7FAFC] rounded-xl"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                          {transaction.userEmail || transaction.userId}
                        </p>
                        <Badge className={
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }>
                          {transaction.status === 'completed' ? 'Выплачено' : 'Отклонено'}
                        </Badge>
                      </div>
                      <p className="text-[#666]" style={{ fontSize: '13px' }}>
                        ₽{transaction.amount?.toLocaleString()} • {transaction.method || 'USDT'}
                      </p>
                      <p className="text-[#999]" style={{ fontSize: '12px' }}>
                        {new Date(transaction.updatedAt || transaction.createdAt).toLocaleString('ru-RU')}
                      </p>
                      {transaction.note && (
                        <p className="text-[#999] italic mt-1" style={{ fontSize: '12px' }}>
                          {transaction.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' ? ' Подтвердить выплату' : '❌ Отклонить заявку'}
            </DialogTitle>
          </DialogHeader>
          
          {actionDialog.withdrawal && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-[#666]" style={{ fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Пользователь:</span> {actionDialog.withdrawal.userEmail || actionDialog.withdrawal.userId}
                </p>
                <p className="text-[#666]" style={{ fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Сумма:</span> ₽{actionDialog.withdrawal.amount?.toLocaleString()}
                </p>
                <p className="text-[#666]" style={{ fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Метод:</span> {actionDialog.withdrawal.method || 'USDT'}
                </p>
                <p className="text-[#666]" style={{ fontSize: '13px' }}>
                  <span style={{ fontWeight: '600' }}>Реквизиты:</span> {formatPaymentField(actionDialog.withdrawal.details) || 'Не указаны'}
                </p>
              </div>

              <div>
                <label className="text-[#666] mb-2 block" style={{ fontSize: '14px' }}>
                  Комментарий (опционально):
                </label>
                <Textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={
                    actionDialog.action === 'approve' 
                      ? 'Например: Выплачено на кошелёк 15.12.2024'
                      : 'Например: Неверные реквизиты, свяжитесь с поддержкой'
                  }
                  rows={3}
                />
              </div>

              {actionDialog.action === 'reject' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-[#666]" style={{ fontSize: '13px' }}>
                    ⚠️ Средства будут возвращены на баланс пользователя
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, withdrawal: null, action: null });
                setActionNote('');
              }}
              disabled={processing}
            >
              Отмена
            </Button>
            <Button
              className={
                actionDialog.action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
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
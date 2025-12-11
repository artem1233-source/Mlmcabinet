import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, ArrowDownToLine, Loader2, CheckCircle2, Clock, CheckCircle, XCircle, Edit3, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { exportEarningsToCSV } from '../utils/exportToCSV';

interface BalanceRuProps {
  currentUser: any;
  onRefresh: () => void;
  refreshTrigger: number;
}

export function BalanceRu({ currentUser, onRefresh, refreshTrigger }: BalanceRuProps) {
  // 🔐 Проверка прав администратора: CEO, admin email, или флаг isAdmin
  const isAdmin = currentUser?.isAdmin === true || 
                  currentUser?.email === 'admin@admin.com' || 
                  currentUser?.id === 'ceo' || 
                  currentUser?.id === '1';
  
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  
  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('USDT');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  
  // Admin states
  const [editingWithdrawal, setEditingWithdrawal] = useState<string | null>(null);
  const [withdrawalStatus, setWithdrawalStatus] = useState('');
  const [withdrawalNote, setWithdrawalNote] = useState('');

  useEffect(() => {
    loadBalanceData();
  }, [refreshTrigger]);

  const loadBalanceData = async () => {
    setLoading(true);
    try {
      // Load admin data if admin
      if (isAdmin) {
        const adminWithdrawals = await api.getAllWithdrawals().catch(() => ({ success: false, withdrawals: [] }));
        if (adminWithdrawals.success) {
          setAllWithdrawals(adminWithdrawals.withdrawals.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        }
      }

      const [withdrawalsData, earningsData] = await Promise.all([
        api.getWithdrawals().catch(() => ({ success: false, withdrawals: [] })),
        api.getEarnings().catch(() => ({ success: false, earnings: [] }))
      ]);

      if (withdrawalsData.success) {
        setWithdrawals(withdrawalsData.withdrawals.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }

      if (earningsData.success) {
        setEarnings(earningsData.earnings);
      }
    } catch (error) {
      console.error('Failed to load balance data:', error);
      toast.error('Не удалось загрузить данные баланса');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWithdrawalStatus = async (withdrawalId: string) => {
    try {
      const data = await api.updateWithdrawalStatus(withdrawalId, withdrawalStatus, withdrawalNote);
      if (data.success) {
        toast.success('Статус выплаты обновлен');
        setEditingWithdrawal(null);
        setWithdrawalStatus('');
        setWithdrawalNote('');
        loadBalanceData();
        onRefresh();
      }
    } catch (error) {
      console.error('Update withdrawal error:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    if (amount > currentUser.баланс) {
      toast.error('Недостаточно средств');
      return;
    }

    if (amount < 1000) {
      toast.error('Минимальная сумма вывода: ₽1,000');
      return;
    }

    if (!withdrawDetails.trim()) {
      toast.error(
        withdrawMethod === 'USDT' 
          ? 'Введите адрес USDT кошелька'
          : 'Введите банковские реквизиты'
      );
      return;
    }

    setWithdrawing(true);
    try {
      const data = await api.requestWithdrawal(amount, withdrawMethod, {
        details: withdrawDetails
      });

      if (data.success) {
        toast.success('Заявка на вывод создана!', {
          description: `₽${amount.toLocaleString('ru-RU')} будет обработано в течение 1-3 рабочих дней`
        });
        
        setShowWithdrawForm(false);
        setWithdrawAmount('');
        setWithdrawDetails('');
        
        // Refresh data
        await loadBalanceData();
        onRefresh();
      } else {
        throw new Error('Failed to create withdrawal');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка создания заявки');
    } finally {
      setWithdrawing(false);
    }
  };

  const totalEarned = earnings.reduce((sum, e) => sum + (e.amount || e.сумма || 0), 0);
  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + (w.amount || w.сумма || 0), 0);

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
            <p className="text-[#666]">Загрузка баланса...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
          {isAdmin ? '💰 Управление выплатами' : 'Баланс и выплаты'}
        </h1>
        <p className="text-[#666]">
          {isAdmin ? 'Все запросы на выплату в системе' : 'Управление вашими финансами'}
        </p>
      </div>

      {/* Admin: All Withdrawals Section */}
      {isAdmin && allWithdrawals.length > 0 && (
        <Card className="border-amber-200 rounded-2xl shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 mb-6 lg:mb-8">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-600" />
              Все заявки на выплату ({allWithdrawals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allWithdrawals.slice(0, 20).map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="bg-white p-4 rounded-xl border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                          {withdrawal.userName || withdrawal.userId}
                        </p>
                        <Badge className={
                          withdrawal.status === 'completed' ? 'bg-green-100 text-green-700' :
                          withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {withdrawal.status === 'completed' ? 'Выплачено' :
                           withdrawal.status === 'pending' ? 'Ожидает' :
                           'Отклонено'}
                        </Badge>
                      </div>
                      <div className="text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
                        ₽{(withdrawal.amount || withdrawal.сумма || 0).toLocaleString()}
                      </div>
                      <p className="text-[#666]" style={{ fontSize: '13px' }}>
                        {withdrawal.method || withdrawal.метод} • {new Date(withdrawal.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                      <p className="text-[#666] mt-1" style={{ fontSize: '12px' }}>
                        Реквизиты: {typeof (withdrawal.details || withdrawal.реквизиты) === 'object' 
                          ? JSON.stringify(withdrawal.details || withdrawal.реквизиты) 
                          : (withdrawal.details || withdrawal.реквизиты)}
                      </p>
                      {withdrawal.adminNote && (
                        <p className="text-amber-600 mt-2" style={{ fontSize: '12px', fontWeight: '600' }}>
                          💬 {withdrawal.adminNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {withdrawal.status === 'pending' && (
                    <>
                      {editingWithdrawal === withdrawal.id ? (
                        <div className="space-y-3 mt-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Label>Статус</Label>
                            <select
                              value={withdrawalStatus}
                              onChange={(e) => setWithdrawalStatus(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                              <option value="">Выберите статус</option>
                              <option value="completed">Выплачено</option>
                              <option value="rejected">Отклонено</option>
                            </select>
                          </div>
                          <div>
                            <Label>Заметка (опционально)</Label>
                            <Textarea
                              value={withdrawalNote}
                              onChange={(e) => setWithdrawalNote(e.target.value)}
                              placeholder="Комментарий для пользователя..."
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUpdateWithdrawalStatus(withdrawal.id)}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={!withdrawalStatus}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Сохранить
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingWithdrawal(null);
                                setWithdrawalStatus('');
                                setWithdrawalNote('');
                              }}
                              variant="outline"
                            >
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => {
                              setEditingWithdrawal(withdrawal.id);
                              setWithdrawalStatus('');
                              setWithdrawalNote('');
                            }}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600"
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Обработать
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && <div className="mb-4">
        <h2 className="text-[#1E1E1E] mb-4" style={{ fontSize: '18px', fontWeight: '700' }}>
          👤 Личный баланс администратора
        </h2>
      </div>}

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div className="text-[#666]" style={{ fontSize: '14px', fontWeight: '600' }}>
                Текущий баланс
              </div>
            </div>
            <div className="text-[#1E1E1E]" style={{ fontSize: '32px', fontWeight: '700' }}>
              ₽{(currentUser.баланс || 0).toLocaleString('ru-RU')}
            </div>
            <div className="text-[#666] mt-2" style={{ fontSize: '13px' }}>
              Доступно к выводу
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#12C9B6]/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#12C9B6]" />
              </div>
              <div className="text-[#666]" style={{ fontSize: '14px', fontWeight: '600' }}>
                Всего заработано
              </div>
            </div>
            <div className="text-[#1E1E1E]" style={{ fontSize: '32px', fontWeight: '700' }}>
              ₽{(totalEarned || 0).toLocaleString('ru-RU')}
            </div>
            <div className="text-[#666] mt-2" style={{ fontSize: '13px' }}>
              За всё время
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#39B7FF]/10 rounded-xl flex items-center justify-center">
                <ArrowDownToLine className="w-6 h-6 text-[#39B7FF]" />
              </div>
              <div className="text-[#666]" style={{ fontSize: '14px', fontWeight: '600' }}>
                Выведено
              </div>
            </div>
            <div className="text-[#1E1E1E]" style={{ fontSize: '32px', fontWeight: '700' }}>
              ₽{(totalWithdrawn || 0).toLocaleString('ru-RU')}
            </div>
            <div className="text-[#666] mt-2" style={{ fontSize: '13px' }}>
              Успешно выплачено
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Form */}
      {!showWithdrawForm ? (
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-6">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-[#1E1E1E] mb-2" style={{ fontSize: '20px', fontWeight: '700' }}>
              Вывести средства
            </h3>
            <p className="text-[#666] mb-6" style={{ fontSize: '14px' }}>
              Минимальная сумма: ₽1,000
            </p>
            <Button
              onClick={() => setShowWithdrawForm(true)}
              disabled={currentUser.баланс < 1000}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white px-8"
            >
              <ArrowDownToLine size={18} className="mr-2" />
              Создать заявку на вывод
            </Button>
            {currentUser.баланс < 1000 && (
              <p className="text-orange-600 mt-3" style={{ fontSize: '13px' }}>
                Недостаточно средств для вывода
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E]">Заявка на вывод средств</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Method Selection */}
            <div>
              <Label className="text-[#1E1E1E] mb-2">Способ вывода</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => setWithdrawMethod('USDT')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    withdrawMethod === 'USDT'
                      ? 'border-[#39B7FF] bg-[#39B7FF]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-[#1E1E1E] mb-1" style={{ fontWeight: '600' }}>USDT (TRC-20)</div>
                  <div className="text-[#666]" style={{ fontSize: '12px' }}>Криптовалюта</div>
                </button>
                <button
                  onClick={() => setWithdrawMethod('bank')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    withdrawMethod === 'bank'
                      ? 'border-[#39B7FF] bg-[#39B7FF]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-[#1E1E1E] mb-1" style={{ fontWeight: '600' }}>Банковская карта</div>
                  <div className="text-[#666]" style={{ fontSize: '12px' }}>Перевод на карту</div>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount" className="text-[#1E1E1E]">Сумма вывода (₽)</Label>
              <Input
                id="amount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Например: 5000"
                className="mt-2"
                min="1000"
                max={currentUser.баланс}
              />
              <div className="flex justify-between mt-2">
                <span className="text-[#666]" style={{ fontSize: '12px' }}>
                  Минимум: ₽1,000
                </span>
                <span className="text-[#666]" style={{ fontSize: '12px' }}>
                  Доступно: ₽{(currentUser.баланс || 0).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>

            {/* Details */}
            <div>
              <Label htmlFor="details" className="text-[#1E1E1E]">
                {withdrawMethod === 'USDT' ? 'Адрес USDT кошелька (TRC-20)' : 'Номер карты'}
              </Label>
              <Input
                id="details"
                value={withdrawDetails}
                onChange={(e) => setWithdrawDetails(e.target.value)}
                placeholder={
                  withdrawMethod === 'USDT' 
                    ? 'TExample123456789USDT...'
                    : '1234 5678 9012 3456'
                }
                className="mt-2"
              />
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-blue-800" style={{ fontSize: '13px' }}>
                ℹ️ Заявка будет обработана в течение 1-3 рабочих дней. 
                Комиссия платежной системы может быть удержана при выплате.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex-1 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white"
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="mr-2" />
                    Подтвердить вывод
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowWithdrawForm(false);
                  setWithdrawAmount('');
                  setWithdrawDetails('');
                }}
                disabled={withdrawing}
                variant="outline"
                className="border-gray-300"
              >
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawals History */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#1E1E1E]">История выплат</CardTitle>
            {withdrawals.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Используем earnings для экспорта (если они есть)
                  if (earnings.length > 0) {
                    exportEarningsToCSV(earnings);
                    toast.success(`📊 Экспортировано ${earnings.length} начислений`);
                  } else {
                    toast.info('Нет данных для экспорта');
                  }
                }}
              >
                <Download size={14} className="mr-1" />
                Экспорт CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ArrowDownToLine className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-[#666]">Пока нет заявок на вывод</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      withdrawal.status === 'completed' ? 'bg-green-100' :
                      withdrawal.status === 'processing' ? 'bg-blue-100' :
                      withdrawal.status === 'rejected' ? 'bg-red-100' :
                      'bg-orange-100'
                    }`}>
                      {withdrawal.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                        {withdrawal.method === 'USDT' ? 'USDT (TRC-20)' : 'Банковская карта'}
                      </p>
                      <p className="text-[#666]" style={{ fontSize: '13px' }}>
                        {new Date(withdrawal.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                      ₽{(withdrawal.amount || withdrawal.сумма || 0).toLocaleString('ru-RU')}
                    </p>
                    <p className={`${
                      withdrawal.status === 'completed' ? 'text-green-600' :
                      withdrawal.status === 'rejected' ? 'text-red-600' :
                      'text-orange-600'
                    }`} style={{ fontSize: '12px' }}>
                      {withdrawal.status === 'completed' ? 'Выплачено' :
                       withdrawal.status === 'processing' ? 'В обработке' :
                       withdrawal.status === 'rejected' ? 'Отклонено' :
                       'Ожидание'}
                    </p>
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
import { DollarSign, TrendingUp, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useState, useEffect } from 'react';
import { getEarningsByLevel, getEarningsStats, getUserTransactions, type Earning, type Transaction } from '../utils/transactions';
import * as api from '../utils/api';

interface EarningsProps {
  currentUser: any;
  refreshTrigger?: number;
}

export function EarningsRu({ currentUser, refreshTrigger }: EarningsProps) {
  const [периодФильтра, setПериодФильтра] = useState('30');
  const [типФильтра, setТипФильтра] = useState('все');
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, [refreshTrigger]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load earnings directly from API
      const earningsData = await api.getEarnings();
      if (earningsData.success && earningsData.earnings) {
        // Convert to our format
        const newEarnings: Earning[] = earningsData.earnings.map((e: any) => ({
          id: e.id,
          userId: e.userId,
          orderId: e.orderId,
          amount: e.сумма || e.amount,
          level: `L${e.линия}` as any, // линия 0 = L0, линия 1 = L1, линия 2 = L2, линия 3 = L3
          timestamp: new Date(e.дата || e.createdAt),
          fromUserId: e.fromUserId
        }));
        
        const newTransactions: Transaction[] = earningsData.earnings.map((e: any) => ({
          id: `txn-${e.id}`,
          userId: e.userId,
          type: 'earning',
          amount: e.сумма || e.amount,
          description: e.описание || e.description || `Комиссия с заказа ${e.sku || e.товар || ''}`,
          timestamp: new Date(e.дата || e.createdAt),
          level: `L${e.линия}` as any,
          orderId: e.orderId
        }));
        
        setEarnings(newEarnings);
        setTransactions(newTransactions);
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!currentUser) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="text-center py-20">
          <p className="text-[#666]">Загрузка...</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="text-center py-20">
          <p className="text-[#666]">Загрузка доходов...</p>
        </div>
      </div>
    );
  }
  
  const текущийПользовательId = currentUser.id;
  const byLevel = getEarningsByLevel(earnings || [], текущийПользовательId);
  const stats = getEarningsStats(earnings || [], текущийПользовательId, parseInt(периодФильтра));
  const userTransactions = getUserTransactions(transactions || [], текущийПользовательId);
  
  const отфильтрованныеТранзакции = типФильтра === 'все' 
    ? userTransactions 
    : userTransactions.filter(t => t.type === типФильтра);
  
  const цветУровня = {
    'L0': '#39B7FF',
    'L1': '#93C5FD', // Пастельный синий для 1-й линии
    'L2': '#FCA5A5', // Пастельный красный для 2-й линии
    'L3': '#FDE047', // Пастельный жёлтый для 3-й линии
    'N/A': '#666'
  };
  
  const типИконка = {
    'earning': '↑',
    'withdrawal': '↓',
    'refund': '↺'
  };
  
  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
        <h1 className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
          Доходы и транзакции
        </h1>
        
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-[#666] flex-shrink-0" />
          <Select value={периодФильтра} onValueChange={setПериодФильтра}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="30">30 дней</SelectItem>
              <SelectItem value="90">90 дней</SelectItem>
              <SelectItem value="365">Год</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Статистика по уровням */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 lg:mb-8">
        {/* 🆕 Уровень 0 - Розничные продажи */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="text-[#666] text-sm">Уровень 0</div>
            <div className="text-[#10B981] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
              {(byLevel.L0 || 0).toLocaleString('ru-RU')}₽
            </div>
            <div className="text-[#999] text-xs mt-1">Розничные продажи</div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="text-[#666] text-sm">Уровень 1</div>
            <div className="text-[#39B7FF] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
              {(byLevel.L1 || 0).toLocaleString('ru-RU')}₽
            </div>
            <div className="text-[#999] text-xs mt-1">Прямые партнёры</div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="text-[#666] text-sm">Уровень 2</div>
            <div className="text-[#F59E0B] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
              {(byLevel.L2 || 0).toLocaleString('ru-RU')}₽
            </div>
            <div className="text-[#999] text-xs mt-1">2-я линия</div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="text-[#666] text-sm">Уровень 3</div>
            <div className="text-[#EF4444] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
              {(byLevel.L3 || 0).toLocaleString('ru-RU')}₽
            </div>
            <div className="text-[#999] text-xs mt-1">3-я линия</div>
          </CardContent>
        </Card>
        
        {/* Всего - теперь в конце */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] md:col-span-1 col-span-2">
          <CardContent className="pt-6">
            <div className="text-white opacity-90 text-sm">Всего</div>
            <div className="text-white mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
              {((byLevel.L0 || 0) + (byLevel.L1 || 0) + (byLevel.L2 || 0) + (byLevel.L3 || 0)).toLocaleString('ru-RU')}₽
            </div>
            <div className="text-white opacity-75 text-xs mt-1">Общий доход</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Статистика за период */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <TrendingUp size={20} className="text-[#12C9B6]" />
              Доход за период
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#39B7FF]" style={{ fontSize: '32px', fontWeight: '700' }}>
              ₽{stats.total.toLocaleString()}
            </div>
            <div className="text-[#666] mt-1">{периодФильтра} дней</div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <DollarSign size={20} className="text-[#12C9B6]" />
              Транзакций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#39B7FF]" style={{ fontSize: '32px', fontWeight: '700' }}>
              {stats.count}
            </div>
            <div className="text-[#666] mt-1">За {периодФильтра} дней</div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <TrendingUp size={20} className="text-[#12C9B6]" />
              Средний доход
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#39B7FF]" style={{ fontSize: '32px', fontWeight: '700' }}>
              ₽{Math.round(stats.average).toLocaleString()}
            </div>
            <div className="text-[#666] mt-1">На транзакцию</div>
          </CardContent>
        </Card>
      </div>
      
      {/* История транзакций */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-[#1E1E1E]">История транзакций</CardTitle>
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-[#666] flex-shrink-0" />
              <Select value={типФильтра} onValueChange={setТипФильтра}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="все">Все типы</SelectItem>
                  <SelectItem value="earning">Доходы</SelectItem>
                  <SelectItem value="withdrawal">Выплаты</SelectItem>
                  <SelectItem value="refund">Возвраты</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E6E9EE]">
                  <TableHead className="whitespace-nowrap" style={{ fontWeight: '600', color: '#1E1E1E' }}>ID</TableHead>
                  <TableHead className="whitespace-nowrap" style={{ fontWeight: '600', color: '#1E1E1E' }}>Дата</TableHead>
                  <TableHead className="whitespace-nowrap" style={{ fontWeight: '600', color: '#1E1E1E' }}>Описание</TableHead>
                  <TableHead className="whitespace-nowrap" style={{ fontWeight: '600', color: '#1E1E1E' }}>Тип</TableHead>
                  <TableHead className="whitespace-nowrap" style={{ fontWeight: '600', color: '#1E1E1E' }}>Уровень</TableHead>
                  <TableHead className="text-right whitespace-nowrap" style={{ fontWeight: '600', color: '#1E1E1E' }}>Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {отфильтрованныеТранзакции.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[#666] py-8">
                      Нет транзакций
                    </TableCell>
                  </TableRow>
                ) : (
                  отфильтрованныеТранзакции.map((txn) => (
                    <TableRow key={txn.id} className="border-[#E6E9EE]">
                      <TableCell className="text-[#666] whitespace-nowrap" style={{ fontWeight: '600', fontSize: '12px' }}>
                        {txn.id.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="text-[#666] whitespace-nowrap">
                        {new Date(txn.timestamp).toLocaleDateString('ru-RU', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-[#1E1E1E] whitespace-nowrap" style={{ fontWeight: '500' }}>
                        {txn.description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge 
                          className={`border-0 ${
                            txn.type === 'earning' 
                              ? 'bg-[#12C9B6]/10 text-[#12C9B6]'
                              : txn.type === 'withdrawal'
                              ? 'bg-[#EF4444]/10 text-[#EF4444]'
                              : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                          }`}
                        >
                          <span className="mr-1">{типИконка[txn.type]}</span>
                          {txn.type === 'earning' ? 'Доход' : txn.type === 'withdrawal' ? 'Выплата' : 'Возврат'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {txn.level !== 'N/A' && (
                          <Badge 
                            className="border-0 text-white"
                            style={{ 
                              backgroundColor: цветУровня[txn.level as keyof typeof цветУровня],
                              fontSize: '10px'
                            }}
                          >
                            {txn.level}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right whitespace-nowrap ${txn.amount > 0 ? 'text-[#12C9B6]' : 'text-[#EF4444]'}`} style={{ fontWeight: '700', fontSize: '16px' }}>
                        {txn.amount > 0 ? '+' : ''}₽{txn.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
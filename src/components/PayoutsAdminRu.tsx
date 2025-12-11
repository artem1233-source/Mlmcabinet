import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { 
  CreditCard, 
  Check, 
  X, 
  Clock, 
  User, 
  Calendar,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../utils/api';

interface PayoutsAdminRuProps {
  currentUser: any;
}

interface Payout {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  method: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export function PayoutsAdminRu({ currentUser: _currentUser }: PayoutsAdminRuProps) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const result = await api.getPayouts();
      console.log('📋 Payouts API result:', result);
      
      if (result.success && Array.isArray(result.withdrawals)) {
        const seenIds = new Set<string>();
        const mapped: Payout[] = result.withdrawals
          .filter((w: any) => {
            if (!w || !w.id) return false;
            if (seenIds.has(w.id)) return false;
            seenIds.add(w.id);
            return true;
          })
          .map((w: any) => ({
            id: w.id,
            userId: w.userId || '',
            userName: w.userName || w.userИмя || w.userId,
            amount: w.amount || 0,
            method: w.method || 'card',
            details: typeof w.details === 'object' ? (w.details?.details || JSON.stringify(w.details)) : (w.details || ''),
            status: w.status || 'pending',
            createdAt: w.createdAt || w.requestedAt || new Date().toISOString(),
            processedAt: w.processedAt,
            processedBy: w.processedBy,
            rejectionReason: w.adminComment || w.rejectionReason,
          }));
        setPayouts(mapped);
      } else {
        setPayouts([]);
      }
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast.error('Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payout: Payout) => {
    setProcessing(payout.id);
    try {
      const result = await api.approvePayout(payout.id);
      if (result.success) {
        toast.success('Выплата одобрена!');
        loadPayouts();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Ошибка одобрения выплаты');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedPayout) return;
    
    setProcessing(selectedPayout.id);
    try {
      const result = await api.rejectPayout(selectedPayout.id, rejectionReason);
      if (result.success) {
        toast.success('Заявка отклонена, средства возвращены на баланс');
        setShowRejectModal(false);
        setSelectedPayout(null);
        setRejectionReason('');
        loadPayouts();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Ошибка отклонения заявки');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectModal = (payout: Payout) => {
    setSelectedPayout(payout);
    setRejectionReason('');
    setShowRejectModal(true);
  };
  
  const exportToCSV = () => {
    const headers = ['ID', 'Партнёр', 'Сумма', 'Реквизиты', 'Статус', 'Дата создания', 'Дата обработки'];
    const statusMap: Record<string, string> = {
      pending: 'Ожидает',
      processing: 'В обработке',
      completed: 'Выплачено',
      approved: 'Выплачено',
      rejected: 'Отклонено'
    };
    
    const rows = filteredPayouts.map(p => [
      p.id,
      p.userName || p.userId,
      p.amount.toString(),
      p.details,
      statusMap[p.status] || p.status,
      new Date(p.createdAt).toLocaleString('ru-RU'),
      p.processedAt ? new Date(p.processedAt).toLocaleString('ru-RU') : ''
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `выплаты_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Экспорт завершён');
  };

  const filteredPayouts = payouts
    .filter(p => {
      if (filter === 'all') return true;
      if (filter === 'completed') return p.status === 'completed' || p.status === 'approved';
      return p.status === filter;
    })
    .filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.userName?.toLowerCase().includes(query) ||
        p.userId.toLowerCase().includes(query) ||
        p.details.toLowerCase().includes(query)
      );
    });

  const pendingCount = payouts.filter(p => p.status === 'pending').length;
  const totalPending = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" /> Ожидает</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><Clock className="w-3 h-3 mr-1" /> В обработке</Badge>;
      case 'approved':
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Выплачено</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" /> Отклонено</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            Управление выплатами
          </h1>
          <p className="text-gray-600 mt-1">Обработка заявок на вывод средств</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={payouts.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт CSV
          </Button>
          <Button variant="outline" onClick={loadPayouts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-700">{pendingCount}</div>
              <div className="text-sm text-yellow-600">Ожидают обработки</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-700">{totalPending.toLocaleString()}₽</div>
              <div className="text-sm text-purple-600">К выплате</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">
                {payouts.filter(p => p.status === 'approved' || p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}₽
              </div>
              <div className="text-sm text-green-600">Выплачено всего</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Поиск по имени или реквизитам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
                className={filter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              >
                Ожидают ({pendingCount})
              </Button>
              <Button 
                size="sm" 
                variant={filter === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilter('completed')}
                className={filter === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                Выплачено
              </Button>
              <Button 
                size="sm" 
                variant={filter === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilter('rejected')}
                className={filter === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
              >
                Отклонено
              </Button>
              <Button 
                size="sm" 
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                Все
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Нет заявок для отображения</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayouts.map((payout) => (
                <div 
                  key={payout.id}
                  className={`border rounded-lg p-4 transition-all ${
                    payout.status === 'pending' 
                      ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' 
                      : payout.status === 'approved'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {payout.userName || payout.userId}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(payout.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-2xl font-bold text-gray-800">
                        {payout.amount.toLocaleString()}₽
                      </div>
                      
                      <div className="text-sm text-gray-600 bg-white rounded p-2 border">
                        <span className="font-medium">Реквизиты:</span> {typeof payout.details === 'object' ? JSON.stringify(payout.details) : payout.details}
                      </div>
                      
                      {payout.rejectionReason && (
                        <div className="text-sm text-red-600 bg-red-100 rounded p-2 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span><span className="font-medium">Причина отказа:</span> {payout.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      {getStatusBadge(payout.status)}
                      
                      {payout.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(payout)}
                            disabled={processing === payout.id}
                          >
                            {processing === payout.id ? (
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
                            onClick={() => openRejectModal(payout)}
                            disabled={processing === payout.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      )}
                      
                      {payout.processedAt && (
                        <div className="text-xs text-gray-500">
                          Обработано: {formatDate(payout.processedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Отклонить заявку
            </DialogTitle>
            <DialogDescription>
              Сумма {selectedPayout?.amount.toLocaleString()}₽ будет возвращена на баланс партнёра
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Причина отклонения (необязательно)</Label>
              <Textarea
                placeholder="Укажите причину отклонения..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRejectModal(false)}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleReject}
              disabled={processing === selectedPayout?.id}
            >
              {processing === selectedPayout?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Отклонить'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

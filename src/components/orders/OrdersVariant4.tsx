import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, Loader2, Download as DownloadIcon, Filter, ChevronUp, ChevronDown, Search, Trash2, Check } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import * as api from '../../utils/api';
import { toast } from 'sonner';

interface OrdersVariant4Props {
  currentUser: any;
  refreshTrigger: number;
}

type SortField = 'id' | 'дата' | 'товар' | 'суммаЗаказа' | 'статус';
type SortDirection = 'asc' | 'desc';

export function OrdersVariant4({ currentUser, refreshTrigger }: OrdersVariant4Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('дата');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadOrders();
  }, [refreshTrigger]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      if (data.success && data.orders) {
        const validOrders = data.orders.filter((o: any) => {
          if (!o.дата) return true;
          const date = new Date(o.дата);
          return !isNaN(date.getTime()) && date <= new Date();
        });
        setOrders(validOrders);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBulkAction = (action: 'paid' | 'cancelled' | 'export' | 'delete') => {
    const selectedCount = selectedOrders.size;
    
    switch (action) {
      case 'paid':
        toast.success(`✅ Отмечено как оплаченные: ${selectedCount} заказов`);
        setSelectedOrders(new Set());
        break;
      case 'cancelled':
        toast.success(`❌ Отменено: ${selectedCount} заказов`);
        setSelectedOrders(new Set());
        break;
      case 'export':
        toast.success(`📊 Экспортировано: ${selectedCount} заказов`);
        break;
      case 'delete':
        toast.success(`🗑️ Удалено: ${selectedCount} заказов`);
        setSelectedOrders(new Set());
        break;
    }
  };

  // Filter and sort
  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = searchQuery === '' || 
        order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.товар?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.покупательИмя?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.статус === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'дата') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (sortField === 'суммаЗаказа') {
        aVal = a.суммаЗаказа || a.цена || 0;
        bVal = b.суммаЗаказа || b.цена || 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, text: 'Оплачено' },
      pending: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, text: 'Ожидание' },
      cancelled: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, text: 'Отменено' },
    };
    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {variant.text}
      </Badge>
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-4 h-4 text-gray-300" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-[#39B7FF]" />
      : <ChevronDown className="w-4 h-4 text-[#39B7FF]" />;
  };

  const selectedTotal = Array.from(selectedOrders)
    .map(id => orders.find(o => o.id === id))
    .filter(Boolean)
    .reduce((sum, o) => sum + (o.суммаЗаказа || o.цена || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
          <p className="text-[#666]">Загрузка таблицы...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#E6E9EE] rounded-xl"
            />
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className={statusFilter === 'all' ? 'bg-[#39B7FF]' : ''}
          >
            Все
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
            className={statusFilter === 'pending' ? 'bg-orange-500' : ''}
          >
            Ожидание
          </Button>
          <Button
            variant={statusFilter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('paid')}
            className={statusFilter === 'paid' ? 'bg-green-500' : ''}
          >
            Оплачено
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <Card className="border-[#39B7FF] border-2 rounded-2xl shadow-md bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#39B7FF] text-white rounded-full flex items-center justify-center font-bold">
                  {selectedOrders.size}
                </div>
                <div>
                  <p className="font-semibold text-[#1E1E1E]">Выбрано заказов: {selectedOrders.size}</p>
                  <p className="text-sm text-[#666]">Общая сумма: ₽{selectedTotal.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('paid')}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  Оплачено
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('cancelled')}
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Отменить
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('export')}
                  className="gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Экспорт
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#39B7FF]/10 to-[#12C9B6]/10">
              <tr>
                <th className="p-4 text-left">
                  <Checkbox
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-[#39B7FF]/20 transition-colors"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1E1E1E]">№ Заказа</span>
                    <SortIcon field="id" />
                  </div>
                </th>
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-[#39B7FF]/20 transition-colors"
                  onClick={() => handleSort('дата')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1E1E1E]">Дата</span>
                    <SortIcon field="дата" />
                  </div>
                </th>
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-[#39B7FF]/20 transition-colors"
                  onClick={() => handleSort('товар')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1E1E1E]">Товар</span>
                    <SortIcon field="товар" />
                  </div>
                </th>
                <th className="p-4 text-left">
                  <span className="font-semibold text-[#1E1E1E]">Покупатель</span>
                </th>
                <th className="p-4 text-left">
                  <span className="font-semibold text-[#1E1E1E]">Кол-во</span>
                </th>
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-[#39B7FF]/20 transition-colors"
                  onClick={() => handleSort('суммаЗаказа')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1E1E1E]">Сумма</span>
                    <SortIcon field="суммаЗаказа" />
                  </div>
                </th>
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-[#39B7FF]/20 transition-colors"
                  onClick={() => handleSort('статус')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1E1E1E]">Статус</span>
                    <SortIcon field="статус" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[#666]">
                    Заказы не найдены
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, idx) => (
                  <tr 
                    key={order.id}
                    className={`border-t border-[#E6E9EE] hover:bg-[#F7FAFC] transition-colors ${
                      selectedOrders.has(order.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={() => handleSelectOrder(order.id)}
                      />
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-[#1E1E1E]">#{order.id}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-[#666]">
                        {order.дата ? new Date(order.дата).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }) : '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-[#1E1E1E]">{order.товар}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {order.покупательИмя && (
                          <>
                            <div className="w-8 h-8 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {order.покупательИмя[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm text-[#666]">{order.покупательИмя}</span>
                          </>
                        )}
                        {!order.покупательИмя && (
                          <span className="text-sm text-[#666]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-[#666]">{order.количество} шт.</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-[#1E1E1E]">
                        ₽{(order.суммаЗаказа || order.цена)?.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(order.статус)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Page Size */}
        <div className="p-4 border-t border-[#E6E9EE] flex items-center justify-between flex-wrap gap-4 bg-[#F7FAFC]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#666]">Показывать:</span>
            <select 
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-[#E6E9EE] rounded-lg bg-white text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-[#666]">
              Показано {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredOrders.length)} из {filteredOrders.length}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Назад
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={currentPage === pageNum ? 'bg-[#39B7FF]' : ''}
                >
                  {pageNum}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="px-2 py-1">...</span>}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Вперёд
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Footer */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-[#666] mb-1">Всего заказов</p>
              <p className="text-2xl font-bold text-[#1E1E1E]">{filteredOrders.length}</p>
            </div>
            <div>
              <p className="text-sm text-[#666] mb-1">Оплачено</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredOrders.filter(o => o.статус === 'paid').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#666] mb-1">Общая сумма</p>
              <p className="text-2xl font-bold text-[#39B7FF]">
                ₽{filteredOrders.reduce((sum, o) => sum + (o.суммаЗаказа || o.цена || 0), 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#666] mb-1">Оплачено на сумму</p>
              <p className="text-2xl font-bold text-[#12C9B6]">
                ₽{filteredOrders.filter(o => o.статус === 'paid').reduce((sum, o) => sum + (o.суммаЗаказа || o.цена || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Package, Clock, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as api from '../../utils/api';
import { toast } from 'sonner';

interface OrdersVariant2Props {
  currentUser: any;
  refreshTrigger: number;
}

export function OrdersVariant2({ currentUser, refreshTrigger }: OrdersVariant2Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

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

  // Calculate statistics
  const stats = {
    total: orders.length,
    paid: orders.filter(o => o.статус === 'paid').length,
    pending: orders.filter(o => o.статус === 'pending').length,
    cancelled: orders.filter(o => o.статус === 'cancelled').length,
    revenue: orders.filter(o => o.статус === 'paid').reduce((sum, o) => sum + (o.суммаЗаказа || o.цена || 0), 0),
    avgCheck: orders.filter(o => o.статус === 'paid').length > 0 
      ? orders.filter(o => o.статус === 'paid').reduce((sum, o) => sum + (o.суммаЗаказа || o.цена || 0), 0) / orders.filter(o => o.статус === 'paid').length 
      : 0,
    conversionRate: orders.length > 0 ? (orders.filter(o => o.статус === 'paid').length / orders.length * 100) : 0,
    totalCommissions: orders.filter(o => o.статус === 'paid').reduce((sum, o) => sum + (o.сумма || 0), 0),
  };

  // Pie chart data
  const statusData = [
    { name: 'Оплачено', value: stats.paid, color: '#10b981' },
    { name: 'Ожидание', value: stats.pending, color: '#f59e0b' },
    { name: 'Отменено', value: stats.cancelled, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Daily sales chart data
  const getDailyData = () => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const data: any[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.дата);
        return orderDate.toDateString() === date.toDateString() && o.статус === 'paid';
      });

      data.push({
        date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        revenue: dayOrders.reduce((sum, o) => sum + (o.суммаЗаказа || o.цена || 0), 0),
        orders: dayOrders.length,
      });
    }

    return data;
  };

  // Top products
  const getTopProducts = () => {
    const productMap = new Map();
    
    orders.forEach(order => {
      if (order.статус === 'paid') {
        const current = productMap.get(order.товар) || { count: 0, revenue: 0 };
        productMap.set(order.товар, {
          count: current.count + order.количество,
          revenue: current.revenue + (order.суммаЗаказа || order.цена || 0),
        });
      }
    });

    return Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
          <p className="text-[#666]">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod('week')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            period === 'week' ? 'bg-[#39B7FF] text-white' : 'bg-white text-[#666] hover:bg-gray-100'
          }`}
        >
          Неделя
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            period === 'month' ? 'bg-[#39B7FF] text-white' : 'bg-white text-[#666] hover:bg-gray-100'
          }`}
        >
          Месяц
        </button>
        <button
          onClick={() => setPeriod('year')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            period === 'year' ? 'bg-[#39B7FF] text-white' : 'bg-white text-[#666] hover:bg-gray-100'
          }`}
        >
          Год
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-[#666] mb-1">Общая выручка</p>
            <p className="text-2xl font-bold text-[#1E1E1E]">
              ₽{stats.revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-700 border-0">
                {stats.paid} из {stats.total}
              </Badge>
            </div>
            <p className="text-sm text-[#666] mb-1">Оплаченных заказов</p>
            <p className="text-2xl font-bold text-[#1E1E1E]">
              {stats.paid}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-0">
                {stats.conversionRate.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-sm text-[#666] mb-1">Конверсия</p>
            <p className="text-2xl font-bold text-[#1E1E1E]">
              {stats.conversionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-[#666] mb-1">Средний чек</p>
            <p className="text-2xl font-bold text-[#1E1E1E]">
              ₽{stats.avgCheck.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#39B7FF]" />
              Динамика продаж
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getDailyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
                <XAxis dataKey="date" stroke="#666" style={{ fontSize: '12px' }} />
                <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E6E9EE', 
                    borderRadius: '8px' 
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#39B7FF" 
                  strokeWidth={3}
                  name="Выручка (₽)"
                  dot={{ fill: '#39B7FF', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#12C9B6" 
                  strokeWidth={3}
                  name="Заказов"
                  dot={{ fill: '#12C9B6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#39B7FF]" />
              Распределение по статусам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
                <div className="text-xs text-[#666]">Оплачено</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                <div className="text-xs text-[#666]">Ожидание</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                <div className="text-xs text-[#666]">Отменено</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#39B7FF]" />
            ТОП-5 самых продаваемых товаров
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-[#666]">
              Нет данных о продажах
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                    idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                    idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                    'bg-gradient-to-br from-blue-400 to-blue-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1E1E1E]">{product.name}</p>
                    <p className="text-sm text-[#666]">{product.count} шт. продано</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#39B7FF]">₽{product.revenue.toLocaleString()}</p>
                    <p className="text-xs text-[#666]">выручка</p>
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] h-2 rounded-full"
                      style={{ width: `${(product.revenue / topProducts[0].revenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#12C9B6]/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#12C9B6]" />
              </div>
              <div>
                <p className="text-sm text-[#666]">Общие комиссии</p>
                <p className="text-xl font-bold text-[#1E1E1E]">
                  ₽{stats.totalCommissions.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-[#666]">Ожидают оплаты</p>
                <p className="text-xl font-bold text-[#1E1E1E]">
                  {stats.pending} заказов
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-[#666]">Успешных заказов</p>
                <p className="text-xl font-bold text-[#1E1E1E]">
                  {stats.paid}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

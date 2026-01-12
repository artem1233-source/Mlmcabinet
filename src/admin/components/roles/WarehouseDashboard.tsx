import { useState } from 'react';
import { Package, Clock, CheckCircle, Truck, AlertTriangle, Search, Printer, TrendingDown, TrendingUp, ArrowUpRight, ChevronDown, Timer, Zap, GitCompare } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

type RiskLevel = 'critical' | 'warning' | 'normal';
type Priority = 'P1' | 'P2' | 'P3';
type BurnRateView = 'rate' | 'trend' | 'anomalies';

interface StockItem {
  sku: string;
  name: string;
  currentStock: number;
  minStock: number;
  avgBurnRate: number; // units per day
  runwayDays: number;
  inTransit: number;
  riskLevel: RiskLevel;
  lastOrderDate: string;
  recommendedOrder: number;
}

interface ActionItem {
  id: string;
  sku: string;
  name: string;
  daysUntilOutOfStock: number;
  riskLevel: RiskLevel;
  priority: Priority;
  currentStock: number;
  action: 'create_supply' | 'review_supply' | 'urgent_order';
}

interface Alert {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  daysLeft: number;
  businessRisk: string;
  timestamp: string;
}

export function WarehouseDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [burnRateView, setBurnRateView] = useState<BurnRateView>('rate');
  const [sortBy, setSortBy] = useState<'runway' | 'burnRate' | 'stock'>('runway');
  const [showV2Comparison, setShowV2Comparison] = useState(false);

  // Mock data for stock items
  const stockItems: StockItem[] = [
    { sku: 'H2-POWDER-500', name: 'Водородный порошок 500г', currentStock: 45, minStock: 100, avgBurnRate: 15, runwayDays: 3, inTransit: 0, riskLevel: 'critical', lastOrderDate: '2026-01-05', recommendedOrder: 300 },
    { sku: 'WELLNESS-KIT', name: 'Оздоровительный комплекс', currentStock: 8, minStock: 50, avgBurnRate: 4, runwayDays: 2, inTransit: 0, riskLevel: 'critical', lastOrderDate: '2026-01-03', recommendedOrder: 150 },
    { sku: 'H2-POWDER-250', name: 'Водородный порошок 250г', currentStock: 120, minStock: 80, avgBurnRate: 12, runwayDays: 10, inTransit: 100, riskLevel: 'warning', lastOrderDate: '2026-01-08', recommendedOrder: 200 },
    { sku: 'VITAMINS-PREMIUM', name: 'Витамины Premium', currentStock: 67, minStock: 40, avgBurnRate: 5, runwayDays: 13, inTransit: 50, riskLevel: 'warning', lastOrderDate: '2026-01-07', recommendedOrder: 100 },
    { sku: 'HEALTH-SET-PRO', name: 'Набор Здоровье Pro', currentStock: 245, minStock: 100, avgBurnRate: 8, runwayDays: 30, inTransit: 0, riskLevel: 'normal', lastOrderDate: '2026-01-09', recommendedOrder: 0 },
    { sku: 'DETOX-BLEND', name: 'Детокс микс', currentStock: 189, minStock: 80, avgBurnRate: 6, runwayDays: 31, inTransit: 0, riskLevel: 'normal', lastOrderDate: '2026-01-08', recommendedOrder: 0 },
  ];

  // Action items requiring immediate attention
  const actionItems: ActionItem[] = [
    { id: 'ACT-001', sku: 'WELLNESS-KIT', name: 'Оздоровительный комплекс', daysUntilOutOfStock: 2, riskLevel: 'critical', priority: 'P1', currentStock: 8, action: 'urgent_order' },
    { id: 'ACT-002', sku: 'H2-POWDER-500', name: 'Водородный порошок 500г', daysUntilOutOfStock: 3, riskLevel: 'critical', priority: 'P1', currentStock: 45, action: 'urgent_order' },
    { id: 'ACT-003', sku: 'H2-POWDER-250', name: 'Водородный порошок 250г', daysUntilOutOfStock: 10, riskLevel: 'warning', priority: 'P2', currentStock: 120, action: 'create_supply' },
    { id: 'ACT-004', sku: 'VITAMINS-PREMIUM', name: 'Витамины Premium', daysUntilOutOfStock: 13, riskLevel: 'warning', priority: 'P2', currentStock: 67, action: 'review_supply' },
  ];

  // Warehouse alerts
  const alerts: Alert[] = [
    { id: 'AL-001', title: 'Крит��ческий остаток: Оздоровительный комплекс', description: 'Остаток 8 ед. при расходе 4 ед/день', priority: 'P1', daysLeft: 2, businessRisk: 'Потеря продаж ~45,000₽/день', timestamp: '2026-01-10 09:15' },
    { id: 'AL-002', title: 'Низкий запас: Водородный порошок 500г', description: 'Остаток 45 ед. при расходе 15 ед/день', priority: 'P1', daysLeft: 3, businessRisk: 'Потеря продаж ~67,500₽/день', timestamp: '2026-01-10 08:30' },
    { id: 'AL-003', title: 'Ожидается исчерпание: Водородный порошок 250г', description: 'Поступление в пути (+100 ед.), но недостаточно', priority: 'P2', daysLeft: 10, businessRisk: 'Средний риск', timestamp: '2026-01-10 07:20' },
  ];

  // Burn rate chart data
  const burnRateChartData = [
    { date: '05.01', 'H2-500': 14, 'Wellness': 3, 'H2-250': 11, 'Vitamins': 5, isAnomaly: false },
    { date: '06.01', 'H2-500': 16, 'Wellness': 4, 'H2-250': 13, 'Vitamins': 6, isAnomaly: true },
    { date: '07.01', 'H2-500': 15, 'Wellness': 5, 'H2-250': 12, 'Vitamins': 5, isAnomaly: false },
    { date: '08.01', 'H2-500': 17, 'Wellness': 4, 'H2-250': 11, 'Vitamins': 4, isAnomaly: true },
    { date: '09.01', 'H2-500': 14, 'Wellness': 3, 'H2-250': 13, 'Vitamins': 5, isAnomaly: false },
    { date: '10.01', 'H2-500': 15, 'Wellness': 4, 'H2-250': 12, 'Vitamins': 5, isAnomaly: false },
  ];

  // Stock forecast data (next 30 days)
  const forecastData = [
    { day: 'Сег', 'H2-500': 45, 'Wellness': 8, 'H2-250': 120, outOfStock: null, isOutOfStock: false },
    { day: '+3', 'H2-500': 0, 'Wellness': 0, 'H2-250': 84, outOfStock: 'H2-500,Wellness', isOutOfStock: true },
    { day: '+7', 'H2-500': 0, 'Wellness': 0, 'H2-250': 36, outOfStock: 'H2-500,Wellness', isOutOfStock: true },
    { day: '+10', 'H2-500': 0, 'Wellness': 0, 'H2-250': 0, outOfStock: 'All', isOutOfStock: true },
    { day: '+15', 'H2-500': 0, 'Wellness': 0, 'H2-250': 0, outOfStock: 'All', isOutOfStock: true },
    { day: '+20', 'H2-500': 0, 'Wellness': 0, 'H2-250': 0, outOfStock: 'All', isOutOfStock: true },
    { day: '+30', 'H2-500': 0, 'Wellness': 0, 'H2-250': 0, outOfStock: 'All', isOutOfStock: true },
  ];

  // Calculate KPIs
  const totalStock = stockItems.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockCount = stockItems.filter(item => item.riskLevel === 'critical' || item.riskLevel === 'warning').length;
  const avgBurnRate = (stockItems.reduce((sum, item) => sum + item.avgBurnRate, 0) / stockItems.length).toFixed(1);
  const avgRunway = (stockItems.reduce((sum, item) => sum + item.runwayDays, 0) / stockItems.length).toFixed(0);
  const inTransitTotal = stockItems.reduce((sum, item) => sum + item.inTransit, 0);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'P1': return 'bg-red-100 text-red-700 border-red-300';
      case 'P2': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'P3': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-orange-50 border-orange-200';
      case 'normal': return 'bg-green-50 border-green-200';
    }
  };

  const getRunwayColor = (days: number) => {
    if (days <= 5) return 'text-red-600';
    if (days <= 14) return 'text-orange-600';
    return 'text-green-600';
  };

  const getRunwayBgColor = (days: number) => {
    if (days <= 5) return 'bg-red-100 border-red-300';
    if (days <= 14) return 'bg-orange-100 border-orange-300';
    return 'bg-green-100 border-green-300';
  };

  const getRunwayBarWidth = (days: number) => {
    const maxDays = 30;
    const percentage = Math.min((days / maxDays) * 100, 100);
    return `${percentage}%`;
  };

  const getRunwayBarColor = (days: number) => {
    if (days <= 5) return 'bg-red-500';
    if (days <= 14) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const sortedItems = [...stockItems].sort((a, b) => {
    switch (sortBy) {
      case 'runway': return a.runwayDays - b.runwayDays;
      case 'burnRate': return b.avgBurnRate - a.avgBurnRate;
      case 'stock': return a.currentStock - b.currentStock;
      default: return 0;
    }
  });

  const filteredItems = sortedItems.filter(item =>
    searchQuery === '' ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ========================================
          НОВЫЙ БЛОК: ТРЕБУЕТ ДЕЙСТВИЙ СЕГОДНЯ
          Самый верх экрана, максимальная видимость
      ======================================== */}
      <Card className="border-3 border-red-400 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-2xl">
        <CardHeader className="pb-4 border-b-2 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-xl">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-red-900 flex items-center gap-2">
                  Требует действий сегодня
                </CardTitle>
                <p className="text-sm text-red-700 mt-1">Критические товары на исходе</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-red-600">{actionItems.length}</div>
              <div className="text-xs text-red-700 uppercase tracking-wide">Срочных задач</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4">
            {actionItems.map(item => (
              <div
                key={item.id}
                className="p-5 rounded-xl border-2 border-red-300 bg-white shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Product Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <Badge className={`${getPriorityColor(item.priority)} border-2 font-bold text-base px-3 py-1.5`}>
                      {item.priority}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-[#1E1E1E] mb-1">{item.name}</p>
                      <div className="flex items-center gap-3 text-sm text-[#666]">
                        <Badge variant="outline" className="font-mono">
                          {item.sku}
                        </Badge>
                        <span>•</span>
                        <span>Остаток: <strong className="text-[#1E1E1E]">{item.currentStock} ед.</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Countdown Timer */}
                  <div className="flex items-center gap-3 px-6 py-3 bg-red-100 rounded-xl border-2 border-red-300">
                    <Timer className="w-6 h-6 text-red-600" />
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 leading-none">
                        {item.daysUntilOutOfStock}
                      </div>
                      <div className="text-xs text-red-700 uppercase tracking-wide mt-1">
                        {item.daysUntilOutOfStock === 1 ? 'день' : 'дня'}
                      </div>
                    </div>
                    <div className="text-xs text-red-700 max-w-[120px]">
                      до полного исчерпания
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div>
                    {item.action === 'urgent_order' && (
                      <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">
                        <ArrowUpRight className="w-5 h-5 mr-2" />
                        Срочный заказ
                      </Button>
                    )}
                    {item.action === 'create_supply' && (
                      <Button size="lg" className="bg-[#39B7FF] hover:bg-[#2a9de8] text-white font-bold">
                        Создать поставку
                      </Button>
                    )}
                    {item.action === 'review_supply' && (
                      <Button size="lg" variant="outline" className="border-2 font-bold">
                        Проверить поставку
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          ПЕРВИЧНЫЕ KPI (КРУПНЫЕ)
          Главные метрики для быстрой оценки
      ======================================== */}
      <div>
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wide mb-3">Основные показатели</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="w-6 h-6 text-[#39B7FF]" />
              </div>
            </div>
            <div className="text-4xl font-bold text-[#1E1E1E] mb-1">{totalStock}</div>
            <div className="text-sm text-[#666] font-medium">Остатки на складе</div>
            <div className="text-xs text-[#999] mt-1">Всего единиц товара</div>
          </Card>

          <Card className="border-[#E6E9EE] rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="text-4xl font-bold text-red-600 mb-1">{lowStockCount}</div>
            <div className="text-sm text-[#666] font-medium">Критический запас</div>
            <div className="text-xs text-[#999] mt-1">SKU требуют внимания</div>
          </Card>

          <Card className="border-[#E6E9EE] rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="text-4xl font-bold text-[#1E1E1E] mb-1">{avgBurnRate}</div>
            <div className="text-sm text-[#666] font-medium">Средний burn rate</div>
            <div className="text-xs text-[#999] mt-1">Единиц в день</div>
          </Card>

          <Card className="border-[#E6E9EE] rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Clock className="w-6 h-6 text-[#12C9B6]" />
              </div>
            </div>
            <div className="text-4xl font-bold text-[#12C9B6] mb-1">{avgRunway}</div>
            <div className="text-sm text-[#666] font-medium">Средний runway</div>
            <div className="text-xs text-[#999] mt-1">Дней запаса</div>
          </Card>
        </div>
      </div>

      {/* ========================================
          ВТОРИЧНЫЕ KPI (КОМПАКТНЫЕ)
          Дополнительная информация
      ======================================== */}
      <div>
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wide mb-3">Дополнительно</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-[#E6E9EE] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-[#1E1E1E]">{inTransitTotal}</div>
                <div className="text-xs text-[#666]">Товары в пути</div>
              </div>
            </div>
          </Card>

          <Card className="border-[#E6E9EE] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-red-600">-12.5%</div>
                <div className="text-xs text-[#666]">Недельные изменения</div>
              </div>
            </div>
          </Card>

          <Card className="border-[#E6E9EE] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Package className="w-5 h-5 text-[#666]" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-[#1E1E1E]">{stockItems.length}</div>
                <div className="text-xs text-[#666]">Товарных позиций</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================
          ТРЕБУЕТСЯ ВНИМАНИЕ (ПЕРЕРАБОТАННЫЙ)
          С приоритетами, таймерами и описанием рисков
      ======================================== */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Складские риски и предупреждения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-5 rounded-xl border-2 ${
                  alert.priority === 'P1' ? 'bg-red-50 border-red-300' : 
                  alert.priority === 'P2' ? 'bg-orange-50 border-orange-300' : 
                  'bg-yellow-50 border-yellow-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority Badge & Title */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className={`${getPriorityColor(alert.priority)} border-2 font-bold text-sm px-3 py-1`}>
                        {alert.priority}
                      </Badge>
                      <p className="font-bold text-base text-[#1E1E1E]">{alert.title}</p>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-[#666] mb-3 ml-1">{alert.description}</p>
                    
                    {/* Risk Info Row */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Countdown */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <div>
                          <span className="font-bold text-orange-600 text-lg">{alert.daysLeft}</span>
                          <span className="text-xs text-[#666] ml-1">
                            {alert.daysLeft === 1 ? 'день' : 'дня'} до out-of-stock
                          </span>
                        </div>
                      </div>
                      
                      {/* Business Risk */}
                      <div className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm">
                        💰 {alert.businessRisk}
                      </div>
                      
                      {/* Timestamp */}
                      <div className="text-xs text-[#999] ml-auto">
                        {alert.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BURN RATE BY SKU */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#39B7FF]" />
              Расход товаров (Burn Rate)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={burnRateView === 'rate' ? 'default' : 'outline'}
                onClick={() => setBurnRateView('rate')}
                className={burnRateView === 'rate' ? 'bg-[#39B7FF]' : ''}
              >
                Расход
              </Button>
              <Button
                size="sm"
                variant={burnRateView === 'trend' ? 'default' : 'outline'}
                onClick={() => setBurnRateView('trend')}
                className={burnRateView === 'trend' ? 'bg-[#39B7FF]' : ''}
              >
                Тренд
              </Button>
              <Button
                size="sm"
                variant={burnRateView === 'anomalies' ? 'default' : 'outline'}
                onClick={() => setBurnRateView('anomalies')}
                className={burnRateView === 'anomalies' ? 'bg-[#39B7FF]' : ''}
              >
                Аномалии
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burnRateChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" label={{ value: 'Ед/день', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = burnRateChartData.find(d => d.date === label);
                      return (
                        <div className="bg-white p-3 border border-[#E6E9EE] rounded-lg shadow-lg">
                          <p className="font-semibold mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {entry.name}: <strong>{entry.value}</strong> ед/день
                            </p>
                          ))}
                          {dataPoint?.isAnomaly && (
                            <p className="text-xs text-orange-600 mt-2 font-semibold">⚠️ Аномалия</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                {burnRateView === 'anomalies' && (
                  <>
                    {burnRateChartData.map((point, idx) => 
                      point.isAnomaly ? (
                        <ReferenceLine 
                          key={idx}
                          x={point.date} 
                          stroke="#f97316" 
                          strokeWidth={2} 
                          strokeDasharray="3 3"
                          label={{ value: '⚠️', position: 'top', fill: '#f97316' }}
                        />
                      ) : null
                    )}
                  </>
                )}
                <Line 
                  type="monotone" 
                  dataKey="H2-500" 
                  stroke="#ef4444" 
                  strokeWidth={burnRateView === 'anomalies' ? 3 : 2} 
                  name="H2 Порошок 500г"
                  dot={burnRateView === 'anomalies' ? (props: any) => {
                    const dataPoint = burnRateChartData[props.index];
                    return dataPoint?.isAnomaly ? (
                      <circle cx={props.cx} cy={props.cy} r={6} fill="#f97316" stroke="#fff" strokeWidth={2} />
                    ) : (
                      <circle cx={props.cx} cy={props.cy} r={3} fill="#ef4444" />
                    );
                  } : true}
                />
                <Line type="monotone" dataKey="Wellness" stroke="#f97316" strokeWidth={2} name="Wellness Kit" />
                <Line type="monotone" dataKey="H2-250" stroke="#39B7FF" strokeWidth={2} name="H2 Порошок 250г" />
                <Line type="monotone" dataKey="Vitamins" stroke="#12C9B6" strokeWidth={2} name="Витамины" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {burnRateView === 'anomalies' && (
            <div className="mt-4 space-y-2">
              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-xl">
                <p className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Обнаружены аномалии расхода
                </p>
                <div className="space-y-1 ml-6">
                  <p className="text-sm text-orange-800">
                    • <strong>06.01</strong>: Водородный порошок 500г — расход выше на <strong>+13%</strong> (возможный всплеск спроса)
                  </p>
                  <p className="text-sm text-orange-800">
                    • <strong>08.01</strong>: Водородный порошок 500г — расход выше на <strong>+14%</strong> (проверить маркетинговые активности)
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STOCK FORECAST */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#39B7FF]" />
            Прогноз остатков (следующие 30 дней)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
            <p className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Критический прогноз при текущем расходе
            </p>
            <p className="text-sm text-blue-800 ml-6">
              Если не принять меры: критичные товары закончатся через <span className="font-bold text-red-600">2-3 дня</span>. 
              Рекомендуется срочная поставка на сумму ~<strong>250,000₽</strong>.
            </p>
          </div>
          
          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
                <XAxis dataKey="day" stroke="#666" />
                <YAxis stroke="#666" label={{ value: 'Остаток, ед.', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = forecastData.find(d => d.day === label);
                      return (
                        <div className="bg-white p-3 border border-[#E6E9EE] rounded-lg shadow-lg">
                          <p className="font-semibold mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {entry.name}: <strong>{entry.value}</strong> ед.
                            </p>
                          ))}
                          {dataPoint?.isOutOfStock && (
                            <p className="text-xs text-red-600 mt-2 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Точка исчерпания
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" label={{ value: '🚨 Исчерпание', position: 'insideTopLeft', fill: '#ef4444', fontWeight: 'bold' }} />
                {forecastData.map((point, idx) => 
                  point.isOutOfStock ? (
                    <ReferenceLine 
                      key={idx}
                      x={point.day} 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      strokeDasharray="3 3"
                    />
                  ) : null
                )}
                <Bar dataKey="H2-500" fill="#ef4444" name="H2 Порошок 500г" />
                <Bar dataKey="Wellness" fill="#f97316" name="Wellness Kit" />
                <Bar dataKey="H2-250" fill="#39B7FF" name="H2 Порошок 250г" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Out of Stock Points Legend */}
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs font-semibold text-red-900 mb-2">🚨 Критические точки исчерпания:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span className="text-red-800"><strong>+3 дня</strong>: H2-500, Wellness</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                <span className="text-orange-800"><strong>+10 дней</strong>: H2-250</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                <span className="text-gray-800"><strong>+15+ дней</strong>: Все позиции</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Создать срочную заявку
            </Button>
            <Button className="bg-[#39B7FF] hover:bg-[#2a9de8]">
              Запланировать поставку
            </Button>
            <Button variant="outline">
              Скачать прогноз (Excel)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* INVENTORY LIST */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#39B7FF]" />
              Управление запасами
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={sortBy === 'runway' ? 'default' : 'outline'}
                onClick={() => setSortBy('runway')}
                className={sortBy === 'runway' ? 'bg-[#39B7FF]' : ''}
              >
                По запасу (дни)
              </Button>
              <Button
                size="sm"
                variant={sortBy === 'burnRate' ? 'default' : 'outline'}
                onClick={() => setSortBy('burnRate')}
                className={sortBy === 'burnRate' ? 'bg-[#39B7FF]' : ''}
              >
                По расходу
              </Button>
              <Button
                size="sm"
                variant={sortBy === 'stock' ? 'default' : 'outline'}
                onClick={() => setSortBy('stock')}
                className={sortBy === 'stock' ? 'bg-[#39B7FF]' : ''}
              >
                По остатку
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
              <Input
                placeholder="Поиск по SKU или названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E6E9EE] rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredItems.map(item => (
              <div
                key={item.sku}
                className={`p-5 rounded-xl border-2 ${getRiskColor(item.riskLevel)} transition-all hover:shadow-md`}
              >
                {/* Header: Product Info & Runway Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-bold text-lg text-[#1E1E1E]">{item.name}</p>
                      <Badge variant="outline" className="text-xs font-mono">
                        {item.sku}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Runway Indicator Badge */}
                  <div className={`px-4 py-2 rounded-xl border-2 ${getRunwayBgColor(item.runwayDays)}`}>
                    <div className="text-center">
                      <div className={`text-2xl font-bold leading-none ${getRunwayColor(item.runwayDays)}`}>
                        {item.runwayDays}
                      </div>
                      <div className="text-xs text-[#666] mt-1 uppercase tracking-wide">
                        {item.runwayDays === 1 ? 'день' : 'дней'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Runway Visual Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[#666] font-semibold">Запас (Runway)</p>
                    <p className="text-xs font-bold text-[#1E1E1E]">
                      {item.runwayDays} из 30 дней
                    </p>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getRunwayBarColor(item.runwayDays)} transition-all duration-300`}
                      style={{ width: getRunwayBarWidth(item.runwayDays) }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-xs text-[#666] mb-1">Остаток</p>
                    <p className="font-bold text-[#1E1E1E] text-lg">{item.currentStock} ед.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-xs text-[#666] mb-1">Мин. запас</p>
                    <p className="font-semibold text-[#666] text-lg">{item.minStock} ед.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-xs text-[#666] mb-1">Расход (burn)</p>
                    <p className="font-bold text-orange-600 text-lg">{item.avgBurnRate} ед/день</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-xs text-[#666] mb-1">В пути</p>
                    <p className={`font-bold text-lg ${item.inTransit > 0 ? 'text-blue-600' : 'text-[#999]'}`}>
                      {item.inTransit > 0 ? `+${item.inTransit} ед.` : '—'}
                    </p>
                  </div>
                </div>

                {/* Recommended Order Section */}
                {item.recommendedOrder > 0 ? (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-[#39B7FF]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-[#39B7FF]" />
                          <p className="text-sm font-bold text-[#39B7FF]">Рекомендуется заказать</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-[#39B7FF]">+{item.recommendedOrder}</p>
                          <p className="text-sm text-[#666]">единиц</p>
                        </div>
                        <p className="text-xs text-[#666] mt-1">
                          Обеспечит запас на {Math.ceil((item.currentStock + item.recommendedOrder) / item.avgBurnRate)} дней
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button className="bg-[#39B7FF] hover:bg-[#2a9de8] text-white font-bold">
                          <ArrowUpRight className="w-4 h-4 mr-2" />
                          Заказать
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-semibold">Запас в норме</span>
                      <span className="text-xs text-green-600">— заказ не требуется</span>
                    </p>
                  </div>
                )}

                {/* Footer: Last Order Date */}
                <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-[#666]">
                  <span>Последний заказ: <strong>{item.lastOrderDate}</strong></span>
                  {item.riskLevel === 'critical' && (
                    <Badge className="bg-red-600 text-white text-xs">
                      Требует срочных действий
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from 'react';
import { Package, Clock, CheckCircle, Truck, AlertTriangle, Search, Printer, TrendingDown, TrendingUp, ArrowUpRight, ChevronDown, Timer, Zap, Bell, Flame, X, Info, Filter, Eye, LayoutGrid, List, Download as DownloadIcon } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';

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
  category?: string;
  supplier?: string;
  targetDays?: number;
  safetyStockPercent?: number;
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

interface InboundShipment {
  id: string;
  eta: string;
  etaDays: number;
  status: 'in_transit' | 'delayed' | 'arrived' | 'received';
  topSKUs: Array<{ sku: string; quantity: number }>;
  totalItems: number;
}

export function WarehouseDashboardV2() {
  const [searchQuery, setSearchQuery] = useState('');
  const [burnRateView, setBurnRateView] = useState<BurnRateView>('rate');
  const [sortBy, setSortBy] = useState<'runway' | 'burnRate' | 'stock'>('runway');
  
  // Новые состояния для модального окна заявки поставки
  const [purchaseOrderModal, setPurchaseOrderModal] = useState(false);
  const [selectedSKUForOrder, setSelectedSKUForOrder] = useState<StockItem | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(0);
  
  // Состояния для фильтров
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);
  const [showInTransit, setShowInTransit] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Состояние для компактного режима
  const [viewMode, setViewMode] = useState<'mixed' | 'compact' | 'detailed'>('mixed');

  // Mock data for stock items
  const stockItems: StockItem[] = [
    { sku: 'H2-POWDER-500', name: 'Водородный порошок 500г', currentStock: 45, minStock: 100, avgBurnRate: 15, runwayDays: 3, inTransit: 0, riskLevel: 'critical', lastOrderDate: '2026-01-05', recommendedOrder: 300, category: 'Порошки', supplier: 'H2 Pharma', targetDays: 30, safetyStockPercent: 20 },
    { sku: 'WELLNESS-KIT', name: 'Оздоровительный комплекс', currentStock: 8, minStock: 50, avgBurnRate: 4, runwayDays: 2, inTransit: 0, riskLevel: 'critical', lastOrderDate: '2026-01-03', recommendedOrder: 150, category: 'Комплексы', supplier: 'WellCo', targetDays: 30, safetyStockPercent: 20 },
    { sku: 'H2-POWDER-250', name: 'Водородный порошок 250г', currentStock: 120, minStock: 80, avgBurnRate: 12, runwayDays: 10, inTransit: 100, riskLevel: 'warning', lastOrderDate: '2026-01-08', recommendedOrder: 200, category: 'Порошки', supplier: 'H2 Pharma', targetDays: 30, safetyStockPercent: 20 },
    { sku: 'VITAMINS-PREMIUM', name: 'Витамины Premium', currentStock: 67, minStock: 40, avgBurnRate: 5, runwayDays: 13, inTransit: 50, riskLevel: 'warning', lastOrderDate: '2026-01-07', recommendedOrder: 100, category: 'Витамины', supplier: 'VitaLife', targetDays: 30, safetyStockPercent: 15 },
    { sku: 'HEALTH-SET-PRO', name: 'Набор Здоровье Pro', currentStock: 245, minStock: 100, avgBurnRate: 8, runwayDays: 30, inTransit: 0, riskLevel: 'normal', lastOrderDate: '2026-01-09', recommendedOrder: 0, category: 'Комплексы', supplier: 'HealthGroup', targetDays: 30, safetyStockPercent: 10 },
    { sku: 'DETOX-BLEND', name: 'Детокс микс', currentStock: 189, minStock: 80, avgBurnRate: 6, runwayDays: 31, inTransit: 0, riskLevel: 'normal', lastOrderDate: '2026-01-08', recommendedOrder: 0, category: 'Детокс', supplier: 'NaturalLab', targetDays: 30, safetyStockPercent: 10 },
  ];

  // Входящие поставки
  const inboundShipments: InboundShipment[] = [
    { id: 'IB-2401-001', eta: '2026-01-12', etaDays: 2, status: 'in_transit', topSKUs: [{ sku: 'H2-POWDER-500', quantity: 200 }, { sku: 'WELLNESS-KIT', quantity: 100 }], totalItems: 300 },
    { id: 'IB-2401-002', eta: '2026-01-15', etaDays: 5, status: 'in_transit', topSKUs: [{ sku: 'H2-POWDER-250', quantity: 150 }, { sku: 'VITAMINS-PREMIUM', quantity: 75 }], totalItems: 225 },
    { id: 'IB-2401-003', eta: '2026-01-11', etaDays: 1, status: 'delayed', topSKUs: [{ sku: 'DETOX-BLEND', quantity: 120 }], totalItems: 120 },
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
    { id: 'AL-001', title: 'Критический остаток: Оздоровительный комплекс', description: 'Остаток 8 ед. при расходе 4 ед/день', priority: 'P1', daysLeft: 2, businessRisk: 'Потеря продаж ~45,000₽/день', timestamp: '2026-01-10 09:15' },
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

  const filteredItems = sortedItems.filter(item => {
    // Поиск
    const matchesSearch = searchQuery === '' ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Фильтр приоритета
    const priority = getPriority(item.runwayDays);
    const matchesPriority = filterPriority === 'all' || 
      (filterPriority === 'P1' && priority === 'P1') ||
      (filterPriority === 'P2' && priority === 'P2') ||
      (filterPriority === 'P3' && priority === 'P3') ||
      (filterPriority === 'OK' && item.riskLevel === 'normal');
    
    // Фильтр категории
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    
    // Фильтр поставщика
    const matchesSupplier = filterSupplier === 'all' || item.supplier === filterSupplier;
    
    // Только проблемные
    const matchesProblems = !showOnlyProblems || (item.riskLevel === 'critical' || item.riskLevel === 'warning');
    
    // В пути
    const matchesInTransit = !showInTransit || item.inTransit > 0;
    
    return matchesSearch && matchesPriority && matchesCategory && matchesSupplier && matchesProblems && matchesInTransit;
  });

  // Получить список категорий и поставщиков
  const categories = Array.from(new Set(stockItems.map(item => item.category).filter(Boolean))) as string[];
  const suppliers = Array.from(new Set(stockItems.map(item => item.supplier).filter(Boolean))) as string[];

  // Вычисление Runway по критичным SKU (P1-P2)
  const criticalItems = stockItems.filter(item => {
    const priority = getPriority(item.runwayDays);
    return priority === 'P1' || priority === 'P2';
  });
  const avgCriticalRunway = criticalItems.length > 0
    ? (criticalItems.reduce((sum, item) => sum + item.runwayDays, 0) / criticalItems.length).toFixed(1)
    : '0';

  // Функция открытия модального окна заказа
  const openPurchaseOrder = (item: StockItem, prefillQuantity?: number) => {
    setSelectedSKUForOrder(item);
    setOrderQuantity(prefillQuantity || item.recommendedOrder || 0);
    setPurchaseOrderModal(true);
  };

  // Функция создания заявки поставки
  const handleCreatePurchaseOrder = () => {
    console.log('Создание заявки поставки:', {
      sku: selectedSKUForOrder?.sku,
      quantity: orderQuantity,
      timestamp: new Date().toISOString()
    });
    setPurchaseOrderModal(false);
    setSelectedSKUForOrder(null);
    setOrderQuantity(0);
  };

  // Получение приоритета для фильтрации
  const getPriority = (runwayDays: number): Priority => {
    if (runwayDays <= 3) return 'P1';
    if (runwayDays <= 14) return 'P2';
    if (runwayDays <= 30) return 'P3';
    return 'P3'; // для normal
  };

  return (
    <div className="space-y-6">
      {/* ========================================
          БЛОК №1 — «ТРЕБУЕТ ДЕЙСТВИЙ СЕГОДНЯ» (САМЫЙ ВЕРХ ЭКРАНА)
          Визуально спокойный, нейтральный фон с акцентами
      ======================================== */}
      <Card className="border-2 border-gray-200 bg-white rounded-3xl shadow-lg relative overflow-hidden">
        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
        
        <CardHeader className="pb-4 border-b border-gray-200 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border-2 border-gray-200">
                <Zap className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-gray-900">
                  Требует действий сегодня
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1 font-medium">⚡ Критические товары на исходе — немедленная реакция!</p>
              </div>
            </div>
            <div className="text-right bg-gray-50 p-6 rounded-2xl border-2 border-gray-200">
              <div className="text-5xl font-bold text-red-600">{actionItems.length}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold mt-1">СРОЧНЫХ ЗАДАЧ</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 relative z-10">
          <div className="grid grid-cols-1 gap-5">
            {actionItems.map(item => {
              // P1 карточки крупнее P2
              const isP1 = item.priority === 'P1';
              
              return (
                <div
                  key={item.id}
                  className={`p-6 rounded-2xl bg-white border-l-4 ${isP1 ? 'border-l-red-500' : 'border-l-orange-500'} border border-gray-200 shadow-md hover:shadow-lg transition-all relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between gap-8">
                    {/* Left: Product Info */}
                    <div className="flex items-center gap-6 flex-1">
                      <Badge className={`${getPriorityColor(item.priority)} border-2 font-bold text-lg px-4 py-2`}>
                        {item.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-bold text-xl text-gray-900 mb-2">{item.name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <Badge variant="outline" className="font-mono font-semibold border px-3 py-1">
                            {item.sku}
                          </Badge>
                          <span>•</span>
                          <span>Остаток: <strong className={`${isP1 ? 'text-red-600' : 'text-orange-600'} text-base`}>{item.currentStock} ед.</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Center: БОЛЬШОЙ ТАЙМЕР */}
                    <div className={`flex items-center gap-4 px-8 py-6 ${isP1 ? 'bg-red-50' : 'bg-orange-50'} rounded-2xl border-2 ${isP1 ? 'border-red-200' : 'border-orange-200'}`}>
                      <Timer className={`w-10 h-10 ${isP1 ? 'text-red-600' : 'text-orange-600'}`} />
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${isP1 ? 'text-red-600' : 'text-orange-600'} leading-none`}>
                          {item.daysUntilOutOfStock}
                        </div>
                        <div className={`text-xs ${isP1 ? 'text-red-700' : 'text-orange-700'} uppercase tracking-wider mt-2 font-semibold`}>
                          {item.daysUntilOutOfStock === 1 ? 'ДЕНЬ' : item.daysUntilOutOfStock < 5 ? 'ДНЯ' : 'ДНЕЙ'}
                        </div>
                      </div>
                      <div className={`text-xs ${isP1 ? 'text-red-700' : 'text-orange-700'} max-w-[140px] font-semibold`}>
                        до полного исчерпания
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <div>
                      <Button 
                        size="lg" 
                        className={`${isP1 ? 'bg-red-600 hover:bg-red-700' : 'bg-[#39B7FF] hover:bg-[#2a9de8]'} text-white font-bold text-base px-8 py-6 whitespace-nowrap`}
                        onClick={() => {
                          const stockItem = stockItems.find(si => si.sku === item.sku);
                          if (stockItem) openPurchaseOrder(stockItem);
                        }}
                      >
                        <Flame className="w-6 h-6 mr-2" />
                        {isP1 ? 'Срочный заказ' : 'Создать поставку'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          БЛОК №2 — ОСНОВНЫЕ KPI (ПОСЛЕ БЛОКА СРОЧНЫХ ДЕЙСТВИЙ)
          4 крупные KPI-карточки
      ======================================== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-[#39B7FF]"></div>
          <h2 className="text-xl font-bold text-gray-900">Ключевые метрики</h2>
          <div className="flex-1 h-0.5 bg-gray-200 rounded"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 border-gray-200 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="text-5xl font-bold text-gray-900 mb-3">{totalStock}</div>
            <div className="text-base text-[#39B7FF] font-semibold mb-1">ОСТАТКИ НА СКЛАДЕ</div>
            <div className="text-xs text-gray-500 font-medium">единиц товара</div>
          </Card>

          <Card className="border-2 border-gray-200 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="text-5xl font-bold text-red-600 mb-3">{lowStockCount}</div>
            <div className="text-base text-red-600 font-semibold mb-1">КРИТИЧЕСКИЙ ЗАПАС</div>
            <div className="text-xs text-gray-500 font-medium">SKU требуют внимания</div>
          </Card>

          <Card className="border-2 border-gray-200 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <TrendingDown className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="text-5xl font-bold text-gray-900 mb-3">{avgBurnRate}</div>
            <div className="text-base text-orange-600 font-semibold mb-1">СРЕДНИЙ BURN RATE</div>
            <div className="text-xs text-gray-500 font-medium">единиц в день</div>
          </Card>

          <Card className="border-2 border-gray-200 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="text-5xl font-bold text-[#12C9B6] mb-3">{avgRunway}</div>
            <div className="text-base text-[#12C9B6] font-semibold mb-1">СРЕДНИЙ RUNWAY</div>
            <div className="text-xs text-gray-500 font-medium">дней запаса</div>
          </Card>
        </div>
      </div>

      {/* ========================================
          БЛОК №3 — СКЛАДСКИЕ РИСКИ И ПРЕДУПРЕЖДЕНИЯ
          Карточки с приоритетами P1/P2, бизнес-ущербом, таймерами
      ======================================== */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Складские риски и предупреждения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-6 rounded-2xl bg-white border-l-4 ${
                  alert.priority === 'P1' ? 'border-l-red-500' : 
                  alert.priority === 'P2' ? 'border-l-orange-500' : 
                  'border-l-yellow-500'
                } border border-gray-200 shadow-md hover:shadow-lg transition-all`}
              >
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <Badge className={`${getPriorityColor(alert.priority)} border-2 font-bold text-base px-4 py-2`}>
                        {alert.priority}
                      </Badge>
                      <p className="font-bold text-lg text-gray-900">{alert.title}</p>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 ml-1">{alert.description}</p>
                    
                    <div className="flex items-center gap-5 flex-wrap">
                      <div className={`flex items-center gap-3 px-4 py-3 ${alert.priority === 'P1' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} rounded-xl border-2`}>
                        <Clock className={`w-5 h-5 ${alert.priority === 'P1' ? 'text-red-600' : 'text-orange-600'}`} />
                        <div>
                          <span className={`font-bold ${alert.priority === 'P1' ? 'text-red-600' : 'text-orange-600'} text-2xl`}>{alert.daysLeft}</span>
                          <span className="text-xs text-gray-600 ml-2">
                            {alert.daysLeft === 1 ? 'день' : 'дня'} до out-of-stock
                          </span>
                        </div>
                      </div>
                      
                      <div className={`px-5 py-3 ${alert.priority === 'P1' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'} rounded-xl font-bold text-sm border-2`}>
                        💰 {alert.businessRisk}
                      </div>
                      
                      <div className="text-xs text-gray-500 ml-auto font-medium">
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

      {/* ========================================
          БЛОК №4 — ГРАФИК «РАСХОД ТОВАРОВ (BURN RATE)»
          С переключателем режимов: Расход | Тренд | Аномалии
      ======================================== */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <TrendingDown className="w-6 h-6 text-[#39B7FF]" />
              Расход товаров (Burn Rate)
            </CardTitle>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl border-2 border-gray-200">
              <Button
                size="sm"
                variant={burnRateView === 'rate' ? 'default' : 'ghost'}
                onClick={() => setBurnRateView('rate')}
                className={`${burnRateView === 'rate' ? 'bg-[#39B7FF] text-white shadow-md' : 'text-[#666]'} font-bold transition-all`}
              >
                📊 Расход
              </Button>
              <Button
                size="sm"
                variant={burnRateView === 'trend' ? 'default' : 'ghost'}
                onClick={() => setBurnRateView('trend')}
                className={`${burnRateView === 'trend' ? 'bg-[#39B7FF] text-white shadow-md' : 'text-[#666]'} font-bold transition-all`}
              >
                📈 Тренд
              </Button>
              <Button
                size="sm"
                variant={burnRateView === 'anomalies' ? 'default' : 'ghost'}
                onClick={() => setBurnRateView('anomalies')}
                className={`${burnRateView === 'anomalies' ? 'bg-[#39B7FF] text-white shadow-md' : 'text-[#666]'} font-bold transition-all`}
              >
                ⚠️ Аномалии
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
          
          {/* Легенда с SKU снизу */}
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border">
            <p className="text-xs font-semibold text-[#666] mb-2">Легенда:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-[#ef4444] rounded"></div>
                <span>H2 Порошок 500г</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-[#f97316] rounded"></div>
                <span>Wellness Kit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-[#39B7FF] rounded"></div>
                <span>H2 Порошок 250г</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-[#12C9B6] rounded"></div>
                <span>Витамины</span>
              </div>
            </div>
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

      {/* ========================================
          БЛОК №5 — ПРОГНОЗ ОСТАТКОВ (30 ДНЕЙ)
          С предупреждением, вертикальными красными линиями, кнопками действий
      ======================================== */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <TrendingUp className="w-6 h-6 text-[#39B7FF]" />
            Прогноз остатков (следующие 30 дней)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-5 bg-white border-l-4 border-l-red-500 border border-gray-200 rounded-xl shadow-sm">
            <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              ⚠️ Критический прогноз при текущем расходе
            </p>
            <p className="text-sm text-gray-700 ml-7">
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
                      strokeWidth={3} 
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
          
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-sm font-bold text-gray-900 mb-3">🚨 Критические точки исчерпания:</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
                <span className="text-gray-700 font-medium"><strong className="text-red-600">+3 дня</strong>: H2-500, Wellness</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded-full bg-orange-600"></div>
                <span className="text-gray-700 font-medium"><strong className="text-orange-600">+10 дней</strong>: H2-250</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded-full bg-gray-600"></div>
                <span className="text-gray-700 font-medium"><strong>+15+ дней</strong>: Все позиции</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-3">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-5 shadow-md">
              <Flame className="w-5 h-5 mr-2" />
              Создать срочную заявку
            </Button>
            <Button className="bg-[#39B7FF] hover:bg-[#2a9de8] text-white font-semibold px-6 py-5">
              <Truck className="w-5 h-5 mr-2" />
              Запланировать поставку
            </Button>
            <Button variant="outline" className="border-2 px-6 py-5 font-semibold">
              <DownloadIcon className="w-5 h-5 mr-2" />
              Скачать прогноз (Excel)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          БЛОК №6 — УПРАВЛЕНИЕ ЗАПАСАМИ (СПИСОК SKU)
          Каждый SKU — КАРТОЧКА с большим бейджем runway, прогресс-баром, 
          4 метриками, блоком рекомендации и кнопкой "Заказать"
      ======================================== */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Package className="w-6 h-6 text-[#39B7FF]" />
              Управление запасами
            </CardTitle>
            <div className="flex gap-4">
              {/* Кнопки сортировки */}
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
          </div>
        </CardHeader>
        <CardContent>
          {/* Поиск */}
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

          <div className="space-y-4">
            {filteredItems.map(item => {
              // SKU в норме - компактный режим с нейтральным фоном
              if (item.riskLevel === 'normal') {
                return (
                  <div
                    key={item.sku}
                    className="p-5 rounded-xl border-2 bg-white border-l-4 border-l-green-500 hover:shadow-sm transition-all border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-bold text-base text-gray-900">{item.name}</p>
                          <Badge variant="outline" className="text-xs font-mono mt-1">
                            {item.sku}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-gray-600 text-xs">Остаток</p>
                          <p className="font-bold text-gray-900 text-base">{item.currentStock} ед.</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600 text-xs">Расход</p>
                          <p className="font-bold text-orange-600 text-base">{item.avgBurnRate} ед/день</p>
                        </div>
                        <div className="text-center px-4 py-2 rounded-xl bg-green-50 border-2 border-green-200">
                          <p className="text-gray-600 text-xs">Runway</p>
                          <p className="font-bold text-green-700 text-xl">{item.runwayDays}</p>
                          <p className="text-green-600 text-xs">дней</p>
                        </div>
                        <Badge className="bg-green-600 text-white font-semibold px-3 py-2 text-xs">
                          ✓ Запас в норме
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              }

              // Полный режим для критичных/предупреждающих SKU
              return (
                <div
                  key={item.sku}
                  className={`p-6 rounded-2xl bg-white border-l-4 ${item.riskLevel === 'critical' ? 'border-l-red-500' : 'border-l-orange-500'} border border-gray-200 transition-all hover:shadow-lg`}
                >
                  {/* Header: Product Info & Runway Badge */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-xl text-gray-900">{item.name}</p>
                        <Badge variant="outline" className="text-xs font-mono px-2 py-1">
                          {item.sku}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Runway Indicator Badge - БОЛЬШОЙ */}
                    <div className={`px-6 py-4 rounded-2xl border-2 ${item.runwayDays <= 5 ? 'bg-red-50 border-red-200' : item.runwayDays <= 14 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="text-center">
                        <div className={`text-5xl font-bold leading-none ${getRunwayColor(item.runwayDays)}`}>
                          {item.runwayDays}
                        </div>
                        <div className="text-xs text-gray-600 mt-2 uppercase tracking-wide font-semibold">
                          {item.runwayDays === 1 ? 'день' : 'дней'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Runway Visual Progress Bar */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600 font-medium">Запас (Runway)</p>
                      <p className="text-sm font-semibold text-gray-900">
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

                  {/* Metrics Grid - 4 МЕТРИКИ */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Остаток</p>
                      <p className="font-bold text-gray-900 text-xl">{item.currentStock} <span className="text-sm text-gray-500">ед.</span></p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Мин. запас</p>
                      <p className="font-semibold text-gray-700 text-xl">{item.minStock} <span className="text-sm text-gray-500">ед.</span></p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Расход (burn)</p>
                      <p className="font-bold text-orange-600 text-xl">{item.avgBurnRate} <span className="text-sm text-orange-500">ед/день</span></p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">В пути</p>
                      <p className={`font-bold text-xl ${item.inTransit > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {item.inTransit > 0 ? `+${item.inTransit}` : '—'} <span className="text-sm">{item.inTransit > 0 ? 'ед.' : ''}</span>
                      </p>
                    </div>
                  </div>

                  {/* БЛОК РЕКОМЕНДАЦИИ */}
                  {item.recommendedOrder > 0 ? (
                    <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">\n
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[#39B7FF] rounded-xl">
                              <Info className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#39B7FF] uppercase tracking-wide">Рекомендация системы</p>
                              <p className="text-xs text-gray-600 mt-1">
                                На основе burn rate и минимального запаса
                              </p>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-3 mb-4">
                            <p className="text-5xl font-bold text-[#39B7FF]">+{item.recommendedOrder}</p>
                            <div>
                              <p className="text-lg font-semibold text-gray-700">единиц</p>
                              <p className="text-sm text-gray-600">
                                Обеспечит запас на {Math.ceil((item.currentStock + item.recommendedOrder) / item.avgBurnRate)} дней
                              </p>
                            </div>
                          </div>

                          {/* Детальная формула расчёта */}
                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Info className="w-4 h-4 text-[#39B7FF]" />
                              <p className="text-sm font-bold text-[#39B7FF]">Расчёт рекомендации:</p>
                            </div>
                            <div className="space-y-2 text-sm text-[#666]">
                              <div className="flex items-center justify-between">
                                <span>• Цель запаса:</span>
                                <strong className="text-[#1E1E1E]">{item.targetDays || 30} дней</strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>• Расход:</span>
                                <strong className="text-orange-600">{item.avgBurnRate} ед/день</strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>• В пути:</span>
                                <strong className={item.inTransit > 0 ? 'text-blue-600' : 'text-[#999]'}>
                                  {item.inTransit > 0 ? `+${item.inTransit} ед.` : '0 ед.'}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>• Safety stock:</span>
                                <strong className="text-[#1E1E1E]">+{item.safetyStockPercent || 0}%</strong>
                              </div>
                              <div className="pt-2 mt-2 border-t border-[#E6E9EE] flex items-center justify-between">
                                <span className="font-semibold text-[#1E1E1E]">Итого к заказу:</span>
                                <strong className="text-[#39B7FF] text-lg">+{item.recommendedOrder} ед.</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* КНОПКА ДЕЙСТВИЯ */}
                          <Button 
                            size="lg" 
                            className="bg-[#39B7FF] hover:bg-[#2a9de8] text-white font-bold text-base px-8 py-6 whitespace-nowrap"
                            onClick={() => openPurchaseOrder(item)}
                          >
                            <ArrowUpRight className="w-5 h-5 mr-2" />
                            Заказать +{item.recommendedOrder}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                      <p className="text-base text-green-700 flex items-center gap-2 font-semibold">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-bold">Запас в норме</span>
                        <span className="text-sm text-green-600">— заказ не требуется</span>
                      </p>
                    </div>
                  )}

                  {/* Footer: Last Order Date */}
                  <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm text-gray-600">
                    <span>Последний заказ: <strong>{item.lastOrderDate}</strong></span>
                    {item.riskLevel === 'critical' && (
                      <Badge className="bg-red-600 text-white text-xs font-bold px-3 py-1">
                        Требует срочных действий
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* МОДАЛЬНОЕ ОКНО ЗАКАЗА ПОСТАВКИ */}
      <Dialog open={purchaseOrderModal} onOpenChange={setPurchaseOrderModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Создание заявки поставки</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Введите количество для заказа и подтвердите заявку.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">SKU</Label>
                <Input
                  value={selectedSKUForOrder?.sku || ''}
                  readOnly
                  className="border-[#E6E9EE] rounded-xl bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Название товара</Label>
                <Input
                  value={selectedSKUForOrder?.name || ''}
                  readOnly
                  className="border-[#E6E9EE] rounded-xl bg-gray-50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Количество для заказа</Label>
              <Input
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(Number(e.target.value))}
                className="border-[#E6E9EE] rounded-xl text-lg"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPurchaseOrderModal(false)}
            >
              Отмена
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#39B7FF] to-[#2a9de8] hover:from-[#2a9de8] hover:to-[#1a8dd8] text-white font-extrabold shadow-xl text-base px-8 py-6"
              onClick={handleCreatePurchaseOrder}
            >
              <Truck className="w-5 h-5 mr-2" />
              Создать заявку
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

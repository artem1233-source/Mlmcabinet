import { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { ActionItem } from './ActionItem';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Package,
  TrendingDown,
  Truck,
  AlertTriangle,
  Search,
  Calendar,
  BarChart3,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { dashboardExporters } from '../../utils/dashboardExport';
import { useDrilldown, createDrilldown } from './DrilldownProvider';
import { parsePeriod } from '../../utils/periodCalculations';
import { toast } from 'sonner';

interface WarehouseDashboardProps {
  currentUser: any;
  period?: string;
}

// Mock данные для склада
const MOCK_INVENTORY = [
  {
    sku: 'H2-POWDER-001',
    name: 'Водородный порошок Classic',
    quantity: 245,
    minStock: 100,
    inTransit: 50,
    avgBurnRate: 15, // шт/день
    runwayDays: 16,
  },
  {
    sku: 'H2-POWDER-002',
    name: 'Водородный порошок Premium',
    quantity: 87,
    minStock: 50,
    inTransit: 30,
    avgBurnRate: 8,
    runwayDays: 11,
  },
  {
    sku: 'H2-TABS-001',
    name: 'Водородные таблетки',
    quantity: 423,
    minStock: 200,
    inTransit: 0,
    avgBurnRate: 12,
    runwayDays: 35,
  },
  {
    sku: 'WELLNESS-001',
    name: 'Комплекс витаминов',
    quantity: 156,
    minStock: 100,
    inTransit: 100,
    avgBurnRate: 10,
    runwayDays: 16,
  },
  {
    sku: 'WELLNESS-002',
    name: 'Энергетический комплекс',
    quantity: 42,
    minStock: 80,
    inTransit: 120,
    avgBurnRate: 6,
    runwayDays: 7,
  },
];

const MOCK_BURN_RATE_CHART = [
  { date: '20 дек', 'H2 Classic': 18, 'H2 Premium': 9, 'H2 Tabs': 14 },
  { date: '21 дек', 'H2 Classic': 15, 'H2 Premium': 7, 'H2 Tabs': 11 },
  { date: '22 дек', 'H2 Classic': 12, 'H2 Premium': 10, 'H2 Tabs': 15 },
  { date: '23 дек', 'H2 Classic': 20, 'H2 Premium': 8, 'H2 Tabs': 10 },
  { date: '24 дек', 'H2 Classic': 14, 'H2 Premium': 6, 'H2 Tabs': 13 },
  { date: '25 дек', 'H2 Classic': 16, 'H2 Premium': 9, 'H2 Tabs': 12 },
  { date: '26 дек', 'H2 Classic': 13, 'H2 Premium': 7, 'H2 Tabs': 11 },
];

const MOCK_FORECAST_CHART = [
  { date: 'Сегодня', 'H2 Classic': 245, 'H2 Premium': 87 },
  { date: '+7д', 'H2 Classic': 140, 'H2 Premium': 31 },
  { date: '+14д', 'H2 Classic': 35, 'H2 Premium': 0 },
  { date: '+21д', 'H2 Classic': 0, 'H2 Premium': 0 },
];

export function WarehouseDashboard({ currentUser, period = '30' }: WarehouseDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [burnRateChart] = useState(MOCK_BURN_RATE_CHART);
  const [forecastChart] = useState(MOCK_FORECAST_CHART);
  
  const { navigateToPage } = useDrilldown();
  const periodDays = parsePeriod(period);

  // Слушаем событие экспорта
  useEffect(() => {
    const handleExport = () => {
      handleExportData();
    };
    window.addEventListener('dashboard-export', handleExport);
    return () => window.removeEventListener('dashboard-export', handleExport);
  }, [inventory]);

  const handleExportData = () => {
    dashboardExporters.warehouse({
      kpis: [
        { title: 'SKU в наличии', value: inventory.length, period },
        { title: 'Критический уровень', value: criticalItems.length, period },
        { title: 'В пути', value: inTransitTotal, period },
      ],
      charts: [
        { name: 'BurnRate', data: burnRateChart },
        { name: 'Forecast', data: forecastChart },
      ],
    });
    toast.success('Данные склада экспортированы');
  };

  const handleDrilldownToInventory = (filters?: any) => {
    navigateToPage('/warehouse/inventory', createDrilldown.inventory(filters, 'Инвентарь'));
  };

  // Вычисляем статистику
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const inTransitTotal = inventory.reduce((sum, item) => sum + item.inTransit, 0);
  const lowStockItems = inventory.filter(item => item.quantity < item.minStock);
  const criticalItems = inventory.filter(item => item.runwayDays < 14);
  const avgBurnRate = inventory.reduce((sum, item) => sum + item.avgBurnRate, 0);

  // Фильтрация
  const filteredInventory = searchQuery
    ? inventory.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : inventory;

  const getStockStatus = (item: typeof MOCK_INVENTORY[0]) => {
    if (item.quantity < item.minStock) {
      return { label: 'Низкий запас', color: '#EF4444', bg: '#FEE2E2' };
    }
    if (item.runwayDays < 14) {
      return { label: 'Скоро закончится', color: '#F59E0B', bg: '#FEF3C7' };
    }
    return { label: 'В наличии', color: '#10B981', bg: '#ECFDF5' };
  };

  return (
    <div className="space-y-6">
      {/* BIG 4 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Остатки на складе"
          value={totalItems}
          suffix="шт"
          delta={-12}
          deltaLabel="vs неделю"
          icon={Package}
          iconColor="#39B7FF"
          iconBgColor="#E5F4FF"
          status="ok"
          size="large"
          loading={loading}
        />

        <KPICard
          title="Товары в пути"
          value={inTransitTotal}
          suffix="шт"
          icon={Truck}
          iconColor="#10B981"
          iconBgColor="#ECFDF5"
          status="ok"
          size="large"
          loading={loading}
        />

        <KPICard
          title="Низкий запас"
          value={lowStockItems.length}
          suffix="SKU"
          icon={AlertTriangle}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          status={lowStockItems.length > 2 ? 'warning' : 'ok'}
          size="large"
          loading={loading}
        />

        <KPICard
          title="Avg Burn Rate"
          value={avgBurnRate}
          suffix="шт/день"
          delta={-5}
          deltaLabel="vs неделю"
          icon={TrendingDown}
          iconColor="#8B5CF6"
          iconBgColor="#F3E8FF"
          status="ok"
          size="large"
          loading={loading}
        />
      </div>

      {/* Alert Banner */}
      {criticalItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[#1E1E1E]">⚠️ Требуется внимание</h3>
          {criticalItems.map(item => (
            <ActionItem
              key={item.sku}
              severity="critical"
              title={`${item.name} — осталось ${item.runwayDays} дней`}
              subtitle={`Запас: ${item.quantity} шт, burn rate: ${item.avgBurnRate} шт/день. ${
                item.inTransit > 0 
                  ? `В пути: ${item.inTransit} шт` 
                  : 'Нет товаров в пути!'
              }`}
              ctaLabel="Заказать поставку"
              onAction={() => {
                console.log('Order supply for:', item.sku);
              }}
              timestamp={`Закончится ${new Date(Date.now() + item.runwayDays * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}`}
            />
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Burn Rate by SKU */}
        <ChartContainer
          title="Burn Rate по SKU"
          subtitle="Последние 7 дней"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={burnRateChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="H2 Classic"
                stroke="#39B7FF"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="H2 Premium"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="H2 Tabs"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Forecast */}
        <ChartContainer
          title="П��огноз остатков"
          subtitle="Топ-2 SKU на следующие 21 день"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={forecastChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend />
              <Bar dataKey="H2 Classic" fill="#39B7FF" radius={[8, 8, 0, 0]} />
              <Bar dataKey="H2 Premium" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
              Inventory List
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Поиск по SKU, названию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              Загрузка...
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              Ничего не найдено
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInventory.map((item) => {
                const status = getStockStatus(item);
                return (
                  <div
                    key={item.sku}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-white" />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-[#1E1E1E]">
                          {item.name}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            backgroundColor: status.bg,
                            color: status.color,
                            borderColor: status.color,
                          }}
                        >
                          {status.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        SKU: {item.sku} • Burn rate: {item.avgBurnRate} шт/день
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="text-center shrink-0 min-w-[100px]">
                      <div className="text-lg font-semibold text-[#1E1E1E]">
                        {item.quantity}
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        на складе
                      </div>
                    </div>

                    {/* In Transit */}
                    <div className="text-center shrink-0 min-w-[100px]">
                      <div className="text-lg font-semibold text-[#10B981]">
                        {item.inTransit > 0 ? `+${item.inTransit}` : '—'}
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        в пути
                      </div>
                    </div>

                    {/* Runway */}
                    <div className="text-center shrink-0 min-w-[100px]">
                      <div
                        className="text-lg font-semibold"
                        style={{
                          color: item.runwayDays < 14 ? '#F59E0B' : '#1E1E1E',
                        }}
                      >
                        {item.runwayDays} дней
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        runway
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        console.log('Order for:', item.sku);
                      }}
                    >
                      Заказать
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
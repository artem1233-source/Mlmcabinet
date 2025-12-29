import { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  TrendingUp,
  Users,
  MousePointerClick,
  Target,
  ExternalLink,
  Globe,
  Hash,
  ArrowUpRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { dashboardExporters } from '../../utils/dashboardExport';
import { parsePeriod } from '../../utils/periodCalculations';
import { toast } from 'sonner';

interface SEODashboardProps {
  currentUser: any;
  period?: string;
}

// Mock данные для демонстрации концепции SEO/Marketing
const MOCK_TRAFFIC_DATA = [
  { date: '20 дек', organic: 145, paid: 68, referral: 32, direct: 89 },
  { date: '21 дек', organic: 158, paid: 72, referral: 28, direct: 95 },
  { date: '22 дек', organic: 162, paid: 85, referral: 45, direct: 102 },
  { date: '23 дек', organic: 178, paid: 91, referral: 38, direct: 108 },
  { date: '24 дек', organic: 185, paid: 88, referral: 52, direct: 115 },
  { date: '25 дек', organic: 192, paid: 95, referral: 48, direct: 122 },
  { date: '26 дек', organic: 205, paid: 102, referral: 55, direct: 128 },
];

const MOCK_CONVERSION_FUNNEL = [
  { stage: 'Посетители', value: 4850, rate: 100 },
  { stage: 'Регистрации', value: 485, rate: 10 },
  { stage: 'Активация', value: 145, rate: 3 },
  { stage: 'Покупки', value: 73, rate: 1.5 },
];

const MOCK_TOP_SOURCES = [
  { source: 'Google Organic', visits: 1456, conversions: 87, ctr: 5.97, fill: '#4285F4' },
  { source: 'Yandex Organic', visits: 892, conversions: 52, ctr: 5.83, fill: '#FF0000' },
  { source: 'Instagram Ads', visits: 645, conversions: 48, ctr: 7.44, fill: '#E4405F' },
  { source: 'VK Organic', visits: 521, conversions: 31, ctr: 5.95, fill: '#0077FF' },
  { source: 'Telegram Ads', visits: 387, conversions: 28, ctr: 7.24, fill: '#0088CC' },
  { source: 'Direct', visits: 756, conversions: 18, ctr: 2.38, fill: '#6B7280' },
];

const MOCK_TOP_PAGES = [
  { page: '/каталог', views: 3245, avgTime: '03:24', bounceRate: 32 },
  { page: '/о-водороде', views: 2156, avgTime: '04:12', bounceRate: 28 },
  { page: '/регистрация', views: 1845, avgTime: '02:15', bounceRate: 45 },
  { page: '/партнёрство', views: 1432, avgTime: '05:08', bounceRate: 25 },
  { page: '/', views: 4856, avgTime: '01:45', bounceRate: 58 },
];

export function SEODashboard({ currentUser, period = '30' }: SEODashboardProps) {
  const [loading, setLoading] = useState(true);
  const periodDays = parsePeriod(period);

  useEffect(() => {
    // Имитация загрузки
    setTimeout(() => setLoading(false), 800);
  }, []);

  // Слушаем событие экспорта
  useEffect(() => {
    const handleExport = () => {
      handleExportData();
    };
    window.addEventListener('dashboard-export', handleExport);
    return () => window.removeEventListener('dashboard-export', handleExport);
  }, []);

  const handleExportData = () => {
    dashboardExporters.seo({
      kpis: [
        { title: 'Посещения сегодня', value: totalToday, period },
        { title: 'Конверсия', value: conversionRate, period },
        { title: 'Органический трафик', value: totalVisits.organic, period },
      ],
      charts: [
        { name: 'Traffic', data: MOCK_TRAFFIC_DATA },
        { name: 'TopSources', data: MOCK_TOP_SOURCES },
      ],
    });
    toast.success('SEO данные экспортированы');
  };

  // Вычисляем общую статистику
  const totalVisits = MOCK_TRAFFIC_DATA[MOCK_TRAFFIC_DATA.length - 1];
  const previousVisits = MOCK_TRAFFIC_DATA[0];
  const totalToday = totalVisits.organic + totalVisits.paid + totalVisits.referral + totalVisits.direct;
  const totalPrevious = previousVisits.organic + previousVisits.paid + previousVisits.referral + previousVisits.direct;
  const growthRate = ((totalToday - totalPrevious) / totalPrevious) * 100;

  const totalConversions = MOCK_TOP_SOURCES.reduce((sum, s) => sum + s.conversions, 0);
  const totalTraffic = MOCK_TOP_SOURCES.reduce((sum, s) => sum + s.visits, 0);
  const avgCTR = (totalConversions / totalTraffic) * 100;
  const conversionRate = (totalConversions / totalToday) * 100;

  return (
    <div className="space-y-6">
      {/* BIG 4 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Всего посещений"
          value={totalTraffic}
          delta={growthRate}
          deltaLabel="vs неделю"
          icon={Users}
          iconColor="#39B7FF"
          iconBgColor="#E5F4FF"
          status="ok"
          size="large"
          loading={loading}
        />

        <KPICard
          title="Organic трафик"
          value={totalVisits.organic}
          delta={12.5}
          deltaLabel="vs неделю"
          icon={TrendingUp}
          iconColor="#10B981"
          iconBgColor="#ECFDF5"
          status="ok"
          size="large"
          loading={loading}
        />

        <KPICard
          title="Конверсии"
          value={totalConversions}
          delta={8.2}
          deltaLabel="vs неделю"
          icon={Target}
          iconColor="#8B5CF6"
          iconBgColor="#F3E8FF"
          status="ok"
          size="large"
          loading={loading}
        />

        <KPICard
          title="Avg CTR"
          value={avgCTR}
          suffix="%"
          delta={1.5}
          deltaLabel="vs неделю"
          icon={MousePointerClick}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          status="ok"
          size="large"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <ChartContainer
          title="Источники трафика"
          subtitle="По каналам за последние 7 дней"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={MOCK_TRAFFIC_DATA}>
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
                dataKey="organic"
                stroke="#10B981"
                strokeWidth={2}
                name="Organic"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="paid"
                stroke="#F59E0B"
                strokeWidth={2}
                name="Paid"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="referral"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Referral"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="direct"
                stroke="#6B7280"
                strokeWidth={2}
                name="Direct"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Conversion Funnel */}
        <ChartContainer
          title="Воронка конверсии"
          subtitle="От посещения до покупки"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={MOCK_CONVERSION_FUNNEL} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="stage" stroke="#6B7280" style={{ fontSize: 12 }} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                formatter={(value: any, name: string, props: any) => [
                  `${value} (${props.payload.rate}%)`,
                  'Значение'
                ]}
              />
              <Bar dataKey="value" fill="#39B7FF" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Top Sources Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-500" />
            </div>
            Топ источников трафика
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              Загрузка...
            </div>
          ) : (
            <div className="space-y-2">
              {MOCK_TOP_SOURCES.map((source, index) => (
                <div
                  key={source.source}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  {/* Rank */}
                  <div className="text-sm font-semibold text-[#6B7280] w-8">
                    #{index + 1}
                  </div>

                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: source.fill }}
                  />

                  {/* Source Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1E1E1E]">
                      {source.source}
                    </div>
                  </div>

                  {/* Visits */}
                  <div className="text-center shrink-0 min-w-[80px]">
                    <div className="text-sm font-semibold text-[#1E1E1E]">
                      {source.visits.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      визитов
                    </div>
                  </div>

                  {/* Conversions */}
                  <div className="text-center shrink-0 min-w-[80px]">
                    <div className="text-sm font-semibold text-[#10B981]">
                      {source.conversions}
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      конверсий
                    </div>
                  </div>

                  {/* CTR */}
                  <div className="text-center shrink-0 min-w-[80px]">
                    <div className="text-sm font-semibold text-[#8B5CF6]">
                      {source.ctr.toFixed(2)}%
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      CTR
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      console.log('Analyze source:', source.source);
                    }}
                  >
                    Детали
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Hash className="w-4 h-4 text-purple-500" />
            </div>
            Топ страниц
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              Загрузка...
            </div>
          ) : (
            <div className="space-y-2">
              {MOCK_TOP_PAGES.map((page, index) => (
                <div
                  key={page.page}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  {/* Rank */}
                  <div className="text-sm font-semibold text-[#6B7280] w-8">
                    #{index + 1}
                  </div>

                  {/* Page Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-[#1E1E1E] font-mono">
                        {page.page}
                      </div>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>

                  {/* Views */}
                  <div className="text-center shrink-0 min-w-[100px]">
                    <div className="text-sm font-semibold text-[#1E1E1E]">
                      {page.views.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      просмотров
                    </div>
                  </div>

                  {/* Avg Time */}
                  <div className="text-center shrink-0 min-w-[80px]">
                    <div className="text-sm font-semibold text-[#39B7FF]">
                      {page.avgTime}
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      среднее время
                    </div>
                  </div>

                  {/* Bounce Rate */}
                  <div className="text-center shrink-0 min-w-[80px]">
                    <Badge
                      variant="outline"
                      className={
                        page.bounceRate < 40
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : page.bounceRate < 50
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {page.bounceRate}% отказов
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#10B981]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#10B981]" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-[#10B981]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1E1E1E] mb-1">
              SEO Аудит
            </h3>
            <p className="text-sm text-[#6B7280]">
              Проверить технические показатели сайта
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#F59E0B]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <Target className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1E1E1E] mb-1">
              Рекламные кампании
            </h3>
            <p className="text-sm text-[#6B7280]">
              Управление платной рекламой
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#8B5CF6]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Globe className="w-6 h-6 text-[#8B5CF6]" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1E1E1E] mb-1">
              Контент-план
            </h3>
            <p className="text-sm text-[#6B7280]">
              Планирование публикаций
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
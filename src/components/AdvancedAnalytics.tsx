import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingBag, Target, Award, Calendar, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface AdvancedAnalyticsProps {
  earnings: any[];
  orders: any[];
  team: any[];
  currentUser: any;
}

export function AdvancedAnalytics({ earnings, orders, team, currentUser }: AdvancedAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([]);
  const [teamGrowthData, setTeamGrowthData] = useState<any[]>([]);
  const [periodComparison, setPeriodComparison] = useState<any>({});
  const [forecastPartners, setForecastPartners] = useState(5);
  const [forecastData, setForecastData] = useState<any>(null);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);

  useEffect(() => {
    generateAnalyticsData();
  }, [selectedPeriod, earnings, orders, team]);

  const generateAnalyticsData = () => {
    const now = new Date();
    
    // 1. Генерация данных по месяцам (для графика динамики продаж)
    const monthsCount = selectedPeriod === '7d' ? 1 : selectedPeriod === '30d' ? 3 : selectedPeriod === '90d' ? 6 : 12;
    const monthlyData: any[] = [];
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthEarnings = earnings.filter(e => {
        const eDate = new Date(e.дата || e.createdAt);
        return eDate >= date && eDate < nextMonth;
      }).reduce((sum, e) => sum + (e.сумма || e.amount || 0), 0);
      
      const monthOrders = orders.filter(o => {
        const oDate = new Date(o.датаЗаказа || o.дата || o.createdAt);
        return oDate >= date && oDate < nextMonth;
      }).length;
      
      monthlyData.push({
        месяц: date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        доход: monthEarnings,
        заказы: monthOrders,
      });
    }
    setMonthlyRevenueData(monthlyData);
    
    // 2. Рост команды по месяцам
    const teamData: any[] = [];
    let cumulativeTeam = 0;
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const newMembers = team.filter(member => {
        const joinDate = new Date(member.зарегистрирован || member.датаРегистрации || member.createdAt);
        return joinDate >= date && joinDate < nextMonth;
      }).length;
      
      cumulativeTeam += newMembers;
      
      teamData.push({
        месяц: date.toLocaleDateString('ru-RU', { month: 'short' }),
        команда: cumulativeTeam,
        новые: newMembers,
      });
    }
    setTeamGrowthData(teamData);
    
    // 3. Сравнение периодов (текущий vs предыдущий)
    const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365;
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    const currentRevenue = earnings.filter(e => new Date(e.дата || e.createdAt) >= currentPeriodStart)
      .reduce((sum, e) => sum + (e.сумма || e.amount || 0), 0);
    const previousRevenue = earnings.filter(e => {
      const date = new Date(e.дата || e.createdAt);
      return date >= previousPeriodStart && date < currentPeriodStart;
    }).reduce((sum, e) => sum + (e.сумма || e.amount || 0), 0);
    
    const currentOrders = orders.filter(o => new Date(o.датаЗаказа || o.дата || o.createdAt) >= currentPeriodStart).length;
    const previousOrders = orders.filter(o => {
      const date = new Date(o.датаЗаказа || o.дата || o.createdAt);
      return date >= previousPeriodStart && date < currentPeriodStart;
    }).length;
    
    const currentTeam = team.filter(m => new Date(m.зарегистрирован || m.датаРегистрации || m.createdAt) >= currentPeriodStart).length;
    const previousTeam = team.filter(m => {
      const date = new Date(m.зарегистрирован || m.датаРегистрации || m.createdAt);
      return date >= previousPeriodStart && date < currentPeriodStart;
    }).length;
    
    setPeriodComparison({
      currentRevenue,
      previousRevenue,
      revenueChange: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100) : 100,
      currentOrders,
      previousOrders,
      ordersChange: previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders * 100) : 100,
      currentTeam,
      previousTeam,
      teamChange: previousTeam > 0 ? ((currentTeam - previousTeam) / previousTeam * 100) : 100,
    });
    
    // 4. Воронка конверсии (все → активные → лидеры)
    const totalPartners = team.length;
    const activePartners = team.filter(m => {
      // Активные = те, кто сделал хотя бы 1 заказ за последние 30 дней
      const hasRecentOrders = orders.some(o => {
        const orderDate = new Date(o.датаЗаказа || o.дата || o.createdAt);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return o.партнёрId === m.id && orderDate >= thirtyDaysAgo;
      });
      return hasRecentOrders;
    }).length;
    
    const leaders = team.filter(m => m.уровень >= 2).length; // Лидеры = уровень 2-3
    
    setConversionFunnel([
      { name: 'Всего партнёров', value: totalPartners, percentage: 100, color: '#39B7FF' },
      { name: 'Активные', value: activePartners, percentage: totalPartners > 0 ? (activePartners / totalPartners * 100) : 0, color: '#12C9B6' },
      { name: 'Лидеры', value: leaders, percentage: totalPartners > 0 ? (leaders / totalPartners * 100) : 0, color: '#F59E0B' },
    ]);
  };

  const calculateForecast = () => {
    // Средний доход с одного партнёра в месяц
    const avgEarningsPerPartner = team.length > 0 
      ? (earnings.reduce((sum, e) => sum + (e.сумма || e.amount || 0), 0) / team.length / 12) 
      : 500; // Дефолтное значение
    
    const currentMonthEarnings = periodComparison.currentRevenue || 0;
    const projectedEarnings = currentMonthEarnings + (forecastPartners * avgEarningsPerPartner);
    const increase = projectedEarnings - currentMonthEarnings;
    const increasePercent = currentMonthEarnings > 0 ? (increase / currentMonthEarnings * 100) : 100;
    
    setForecastData({
      currentEarnings: currentMonthEarnings,
      projectedEarnings,
      increase,
      increasePercent,
      avgPerPartner: avgEarningsPerPartner,
    });
  };

  const getPeriodLabel = () => {
    switch(selectedPeriod) {
      case '7d': return 'за 7 дней';
      case '30d': return 'за 30 дней';
      case '90d': return 'за 90 дней';
      case '1y': return 'за год';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Выбор периода */}
      <div className="flex items-center justify-between">
        <h2 className="text-[#1E1E1E]" style={{ fontSize: '20px', fontWeight: '700' }}>
          📊 Расширенная аналитика
        </h2>
        <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Выберите период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 дней</SelectItem>
            <SelectItem value="30d">30 дней</SelectItem>
            <SelectItem value="90d">90 дней</SelectItem>
            <SelectItem value="1y">1 год</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Сравнение периодов */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Сравнение с предыдущим периодом
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Доход */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#666] text-sm">Доход</span>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-[#1E1E1E] mb-1">
                ₽{(periodComparison.currentRevenue || 0).toLocaleString()}
              </div>
              <div className={`flex items-center gap-1 text-sm ${periodComparison.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {periodComparison.revenueChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(periodComparison.revenueChange || 0).toFixed(1)}% vs предыдущий период
              </div>
            </div>

            {/* Заказы */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#666] text-sm">Заказы</span>
                <ShoppingBag className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-[#1E1E1E] mb-1">
                {periodComparison.currentOrders || 0}
              </div>
              <div className={`flex items-center gap-1 text-sm ${periodComparison.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {periodComparison.ordersChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(periodComparison.ordersChange || 0).toFixed(1)}% vs предыдущий период
              </div>
            </div>

            {/* Новые партнёры */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#666] text-sm">Новые партнёры</span>
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-[#1E1E1E] mb-1">
                {periodComparison.currentTeam || 0}
              </div>
              <div className={`flex items-center gap-1 text-sm ${periodComparison.teamChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {periodComparison.teamChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(periodComparison.teamChange || 0).toFixed(1)}% vs предыдущий период
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Графики в табах */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="revenue">Динамика продаж</TabsTrigger>
          <TabsTrigger value="team">Рост команды</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">График продаж {getPeriodLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39B7FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#39B7FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
                  <XAxis dataKey="месяц" stroke="#666" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#666" style={{ fontSize: '12px' }} tickFormatter={(value) => `₽${value}`} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any, name: string) => [
                      name === 'доход' ? `₽${value.toLocaleString()}` : value,
                      name === 'доход' ? 'Доход' : 'Заказы'
                    ]}
                  />
                  <Area type="monotone" dataKey="доход" stroke="#39B7FF" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">Рост команды {getPeriodLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={teamGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
                  <XAxis dataKey="месяц" stroke="#666" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any, name: string) => [
                      value,
                      name === 'новые' ? 'Новые партнёры' : 'Всего в команде'
                    ]}
                  />
                  <Bar dataKey="новые" fill="#12C9B6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Воронка конверсии */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
            <Target className="w-5 h-5" />
            Воронка конверсии партнёров
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionFunnel.map((stage, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }}></div>
                    <span className="text-[#1E1E1E] font-semibold">{stage.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#1E1E1E] font-bold text-lg">{stage.value}</span>
                    <span className="text-[#666] text-sm ml-2">({stage.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${stage.percentage}%`,
                      backgroundColor: stage.color
                    }}
                  ></div>
                </div>
                {index < conversionFunnel.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-semibold mb-1">Советы по улучшению конверсии:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Регулярно поддерживайте связь с новыми партнёрами</li>
                  <li>• Проводите обучение и делитесь опытом</li>
                  <li>• Мотивируйте активных к росту до уровня лидеров</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Прогноз доходов */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" />
            Калькулятор прогноза доходов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#666] mb-4 text-sm">
            Узнайте, как изменится ваш доход при привлечении новых партнёров
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <label className="text-sm text-[#666] mb-2 block">
                Сколько партнёров вы планируете привлечь?
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={forecastPartners}
                onChange={(e) => setForecastPartners(parseInt(e.target.value) || 1)}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={calculateForecast}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Рассчитать
              </Button>
            </div>
          </div>
          
          {forecastData && (
            <div className="mt-6 p-5 bg-white rounded-xl border-2 border-orange-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#666] mb-1">Текущий доход за период:</p>
                  <p className="text-2xl font-bold text-[#1E1E1E]">
                    ₽{forecastData.currentEarnings.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#666] mb-1">Прогнозируемый доход:</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₽{forecastData.projectedEarnings.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#666]">Потенциальный прирост:</p>
                    <p className="text-xl font-bold text-green-600">
                      +₽{forecastData.increase.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#666]">Рост:</p>
                    <div className="flex items-center gap-1 text-xl font-bold text-green-600">
                      <TrendingUp className="w-5 h-5" />
                      +{forecastData.increasePercent.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-800">
                  💡 Расчёт основан на среднем доходе ₽{forecastData.avgPerPartner.toFixed(0)} с партнёра за период
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

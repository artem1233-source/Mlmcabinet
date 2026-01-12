import { DollarSign, TrendingUp, Users, Package, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { AlertBanner } from '../ui/AlertBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

export function OwnerDashboard() {
  // Mock data
  const salesData = [
    { date: '1 янв', revenue: 125000, commissions: 18750, payouts: 15000 },
    { date: '8 янв', revenue: 145000, commissions: 21750, payouts: 17000 },
    { date: '15 янв', revenue: 168000, commissions: 25200, payouts: 20000 },
    { date: '22 янв', revenue: 192000, commissions: 28800, payouts: 23000 },
    { date: '29 янв', revenue: 215000, commissions: 32250, payouts: 27000 },
  ];

  const topBranches = [
    { name: 'Александр К.', revenue: 450000, partners: 45, level: 3 },
    { name: 'Мария С.', revenue: 380000, partners: 38, level: 3 },
    { name: 'Дмитрий П.', revenue: 320000, partners: 32, level: 2 },
    { name: 'Елена В.', revenue: 280000, partners: 28, level: 2 },
    { name: 'Иван М.', revenue: 245000, partners: 24, level: 2 },
  ];

  const activityData = [
    { period: 'Пн', active: 145, new: 12 },
    { period: 'Вт', active: 152, new: 15 },
    { period: 'Ср', active: 148, new: 8 },
    { period: 'Чт', active: 165, new: 18 },
    { period: 'Пт', active: 178, new: 22 },
    { period: 'Сб', active: 192, new: 28 },
    { period: 'Вс', active: 156, new: 14 },
  ];

  const alerts = [
    {
      type: 'critical' as const,
      title: 'Низкий остаток на складе',
      message: 'У 3 товаров остаток менее 10 единиц. Требуется пополнение.',
      action: { label: 'Открыть склад', onClick: () => {} }
    },
    {
      type: 'warning' as const,
      title: 'Всплеск возвратов',
      message: 'За последние 7 дней возвратов на 35% больше обычного.',
      action: { label: 'Просмотр деталей', onClick: () => {} }
    },
    {
      type: 'info' as const,
      title: 'Зависшие выплаты',
      message: '12 заявок на выплату ожидают обработки более 24 часов.',
      action: { label: 'Обработать', onClick: () => {} }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Центр Действий - Алерты */}
      <div>
        <h2 className="text-lg font-bold text-[#1E1E1E] mb-4">⚡ Центр действий</h2>
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <AlertBanner key={idx} {...alert} />
          ))}
        </div>
      </div>

      {/* Big KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Выручка за период"
          value="₽845,000"
          delta={12.5}
          trend="up"
          icon={<DollarSign className="w-5 h-5 text-[#39B7FF]" />}
          size="L"
          clickable
        />
        <KPICard
          label="Начислено комиссий (заморожено)"
          value="₽126,750"
          delta={8.3}
          trend="up"
          icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
          size="M"
        />
        <KPICard
          label="Обязательства (available)"
          value="₽92,000"
          delta={-3.2}
          trend="down"
          icon={<Clock className="w-5 h-5 text-purple-600" />}
          size="M"
        />
        <KPICard
          label="Выплачено"
          value="₽102,000"
          delta={15.7}
          trend="up"
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          size="M"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#39B7FF]" />
              Выручка vs Комиссии vs Выплаты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
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
                  name="Выручка"
                  dot={{ fill: '#39B7FF', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="commissions" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  name="Комиссии"
                  dot={{ fill: '#F59E0B', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="payouts" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Выплаты"
                  dot={{ fill: '#10B981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Chart */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#39B7FF]" />
              Активность партнёров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
                <XAxis dataKey="period" stroke="#666" style={{ fontSize: '12px' }} />
                <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E6E9EE', 
                    borderRadius: '8px' 
                  }}
                />
                <Legend />
                <Bar dataKey="active" fill="#39B7FF" name="Активные" radius={[8, 8, 0, 0]} />
                <Bar dataKey="new" fill="#12C9B6" name="Новые" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Branches */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#39B7FF]" />
              ТОП-5 веток по выручке
            </CardTitle>
            <Button variant="outline" size="sm">Подроб��ее</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topBranches.map((branch, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-[#F7FAFC] rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                  idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                  idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                  'bg-gradient-to-br from-blue-400 to-blue-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1E1E1E]">{branch.name}</p>
                  <p className="text-sm text-[#666]">{branch.partners} партнёров в команде</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-2">
                    Уровень {branch.level}
                  </Badge>
                  <p className="font-bold text-[#39B7FF] text-lg">₽{branch.revenue.toLocaleString()}</p>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] h-2 rounded-full"
                    style={{ width: `${(branch.revenue / topBranches[0].revenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle>Быстрые ссылки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="w-6 h-6" />
              Пользователи
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Package className="w-6 h-6" />
              Заказы
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <DollarSign className="w-6 h-6" />
              Выплаты
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <TrendingUp className="w-6 h-6" />
              Настройки комиссий
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
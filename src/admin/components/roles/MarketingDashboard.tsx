import { TrendingUp, Users, MousePointerClick, Share2, Lock } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function MarketingDashboard() {
  const sourceData = [
    { source: 'Органика', registrations: 45, conversion: 12.5 },
    { source: 'Реклама', registrations: 28, conversion: 8.2 },
    { source: 'Рефералы', registrations: 67, conversion: 18.9 },
    { source: 'Email', registrations: 15, conversion: 4.1 },
    { source: 'Соцсети', registrations: 38, conversion: 10.3 },
  ];

  const campaigns = [
    { name: 'Летняя акция', status: 'active', clicks: 1245, conversions: 67, budget: 50000 },
    { name: 'Промо набор', status: 'active', clicks: 892, conversions: 45, budget: 30000 },
    { name: 'Зимняя распродажа', status: 'completed', clicks: 2340, conversions: 156, budget: 80000 },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Регистрации за период"
          value="193"
          delta={15.3}
          trend="up"
          icon={<Users className="w-5 h-5 text-[#39B7FF]" />}
          size="M"
        />
        <KPICard
          label="Конверсия"
          value="12.8%"
          delta={2.1}
          trend="up"
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          size="M"
        />
        <KPICard
          label="CAC"
          value="Нет данных"
          icon={<Share2 className="w-5 h-5 text-orange-600" />}
          size="M"
        />
        <KPICard
          label="Кликов по UTM"
          value="4,477"
          delta={8.7}
          trend="up"
          icon={<MousePointerClick className="w-5 h-5 text-purple-600" />}
          size="M"
        />
      </div>

      {/* Note about PII */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Ограничение доступа к PII</h3>
            <p className="text-sm text-blue-700">
              Персональные данные (телефоны, адреса, email) доступны только в агрегированном виде. 
              Для полного доступа обратитесь к Администратору или Владельцу.
            </p>
          </div>
        </div>
      </div>

      {/* Sources Chart */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#39B7FF]" />
            Регистрации по источникам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
              <XAxis dataKey="source" stroke="#666" style={{ fontSize: '12px' }} />
              <YAxis stroke="#666" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E6E9EE', 
                  borderRadius: '8px' 
                }}
              />
              <Bar dataKey="registrations" fill="#39B7FF" radius={[8, 8, 0, 0]} name="Регистрации" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaigns */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-[#39B7FF]" />
              Активные кампании
            </CardTitle>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              Трекинг в разработке
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.map((campaign, idx) => (
              <div key={idx} className="p-4 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[#1E1E1E] mb-1">{campaign.name}</p>
                    <Badge className={campaign.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}>
                      {campaign.status === 'active' ? 'Активна' : 'Завершена'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#666]">Бюджет</p>
                    <p className="text-lg font-bold text-[#39B7FF]">₽{campaign.budget.toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666] mb-1">Клики</p>
                    <p className="font-bold text-[#1E1E1E]">{campaign.clicks}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666] mb-1">Конверсии</p>
                    <p className="font-bold text-green-600">{campaign.conversions}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-[#666] mb-1">CR</p>
                    <p className="font-bold text-purple-600">{((campaign.conversions / campaign.clicks) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#666]" />
              UTM трекинг
              <Badge className="bg-gray-100 text-gray-600">Скоро</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#666]">Функционал в разработке</p>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#666]" />
              Промокоды
              <Badge className="bg-gray-100 text-gray-600">Скоро</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#666]">Функционал в разработке</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
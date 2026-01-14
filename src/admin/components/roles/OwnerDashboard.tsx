import { DollarSign, TrendingUp, Users, Package, AlertCircle, Clock, CheckCircle, UserCog, Search } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { AlertBanner } from '../ui/AlertBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export function OwnerDashboard() {
  // State для ручного назначения спонсора
  const [userSearch, setUserSearch] = useState('');
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [sponsorSearchResults, setSponsorSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isSearchingSponsors, setIsSearchingSponsors] = useState(false);

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

  // Функция для поиска пользователей
  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/user001/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search users error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Ошибка поиска пользователей');
      return [];
    }
  };

  // Функция для назначения спонсора
  const assignSponsor = async () => {
    if (!selectedUser || !selectedSponsor) {
      toast.error('Выберите пользователя и спонсора');
      return;
    }

    if (selectedUser.id === selectedSponsor.id) {
      toast.error('Пользователь не может быть своим спонсором');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/user001/assign-sponsor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            sponsorId: selectedSponsor.id
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Assign sponsor error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      toast.success(`Спонсор успешно назначен: ${selectedUser.имя} → ${selectedSponsor.имя}`);
      
      // Сброс формы
      setSelectedUser(null);
      setSelectedSponsor(null);
      setUserSearch('');
      setSponsorSearch('');
    } catch (error) {
      console.error('Error assigning sponsor:', error);
      toast.error('Ошибка при назначении спонсора');
    } finally {
      setIsAssigning(false);
    }
  };

  // Обработчики поиска пользователей и спонсоров
  useEffect(() => {
    if (userSearch.trim()) {
      setIsSearchingUsers(true);
      searchUsers(userSearch).then(results => {
        setUserSearchResults(results);
        setIsSearchingUsers(false);
      });
    } else {
      setUserSearchResults([]);
    }
  }, [userSearch]);

  useEffect(() => {
    if (sponsorSearch.trim()) {
      setIsSearchingSponsors(true);
      searchUsers(sponsorSearch).then(results => {
        setSponsorSearchResults(results);
        setIsSearchingSponsors(false);
      });
    } else {
      setSponsorSearchResults([]);
    }
  }, [sponsorSearch]);

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

      {/* Ручное назначение спонсора - только для SEO/Owner */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#39B7FF]" />
            🔧 Ручное назначение спонсора (SEO Mode)
          </CardTitle>
          <p className="text-sm text-[#666] mt-2">
            Только для супер-администратора: назначение или смена спонсора пользователю вручную
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Выбор пользователя */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-[#1E1E1E]">
                1. Выберите пользователя
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                <Input
                  placeholder="Поиск по имени, email, ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10 border-[#E6E9EE] rounded-xl"
                />
              </div>
              {isSearchingUsers && (
                <div className="p-4 bg-white rounded-xl border-2 border-[#39B7FF]">
                  <p className="text-sm text-[#666]">Ищем...</p>
                </div>
              )}
              {userSearchResults.length > 0 && !isSearchingUsers && (
                <div className="p-4 bg-white rounded-xl border-2 border-[#39B7FF] max-h-40 overflow-y-auto">
                  {userSearchResults.map(user => (
                    <div key={user.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2" onClick={() => setSelectedUser(user)}>
                      <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.имя?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#1E1E1E]">{user.имя} {user.фамилия}</p>
                        <p className="text-sm text-[#666]">{user.email}</p>
                        <p className="text-xs text-[#666]">ID: {user.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div className="p-4 bg-white rounded-xl border-2 border-[#39B7FF]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {selectedUser.имя?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#1E1E1E]">{selectedUser.имя} {selectedUser.фамилия}</p>
                      <p className="text-sm text-[#666]">{selectedUser.email}</p>
                      <p className="text-xs text-[#666]">ID: {selectedUser.id}</p>
                    </div>
                  </div>
                  {selectedUser.спонсорId && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Текущий спонсор: {selectedUser.спонсорId}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Выбор спонсора */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-[#1E1E1E]">
                2. Назначьте нового спонсора
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                <Input
                  placeholder="Поиск спонсора по имени, email, ID..."
                  value={sponsorSearch}
                  onChange={(e) => setSponsorSearch(e.target.value)}
                  className="pl-10 border-[#E6E9EE] rounded-xl"
                />
              </div>
              {isSearchingSponsors && (
                <div className="p-4 bg-white rounded-xl border-2 border-green-500">
                  <p className="text-sm text-[#666]">Ищем...</p>
                </div>
              )}
              {sponsorSearchResults.length > 0 && !isSearchingSponsors && (
                <div className="p-4 bg-white rounded-xl border-2 border-green-500 max-h-40 overflow-y-auto">
                  {sponsorSearchResults.map(user => (
                    <div key={user.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2" onClick={() => setSelectedSponsor(user)}>
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.имя?.[0] || 'S'}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#1E1E1E]">{user.имя} {user.фамилия}</p>
                        <p className="text-sm text-[#666]">{user.email}</p>
                        <p className="text-xs text-[#666]">ID: {user.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedSponsor && (
                <div className="p-4 bg-white rounded-xl border-2 border-green-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {selectedSponsor.имя?.[0] || 'S'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#1E1E1E]">{selectedSponsor.имя} {selectedSponsor.фамилия}</p>
                      <p className="text-sm text-[#666]">{selectedSponsor.email}</p>
                      <p className="text-xs text-[#666]">ID: {selectedSponsor.id}</p>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-800">
                      ✓ Уровень {selectedSponsor.уровень || 1} • Команда: {selectedSponsor.команда?.length || 0} чел.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Кнопка назначения */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-[#666]">
              {selectedUser && selectedSponsor ? (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1E1E1E]">{selectedUser.имя}</span>
                  <span>→</span>
                  <span className="font-semibold text-green-600">{selectedSponsor.имя}</span>
                </div>
              ) : (
                <span>Выберите пользователя и спонсора</span>
              )}
            </div>
            <Button
              onClick={assignSponsor}
              disabled={!selectedUser || !selectedSponsor || isAssigning}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white gap-2"
            >
              {isAssigning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Назначение...
                </>
              ) : (
                <>
                  <UserCog className="w-4 h-4" />
                  Назначить спонсора
                </>
              )}
            </Button>
          </div>

          {/* Предупреждение */}
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">⚠️ Критическая операция</p>
                <p>
                  Изменение спонсора влияет на всю структуру команды и расчёт комиссий. 
                  Убедитесь, что действие выполнено корректно. Все изменения логируются.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Branches */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#39B7FF]" />
              ТОП-5 веток по выручке
            </CardTitle>
            <Button variant="outline" size="sm">Подробее</Button>
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
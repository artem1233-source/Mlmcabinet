import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Users, TrendingUp, TrendingDown, Search, Filter, Download,
  ChevronRight, ChevronDown, Circle, Award, Star, Zap, Clock,
  ArrowUpRight, ArrowDownRight, Mail, ExternalLink, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { TreeVisualization } from '../TreeVisualization';

interface Partner {
  id: string;
  name: string;
  level: number;
  referralCode: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'warning'; // 🟢 🟡 🔴
  earnings: number;
  teamSize: number;
  orders: number;
  lastActivity: string;
  avatar?: string;
}

interface TeamStructureProps {
  stats: {
    team: {
      direct: number;
      total: number;
      level1: number;
      level2: number;
      level3: number;
      depth: number;
    };
    earnings: {
      d1: number;
      d2: number;
      d3: number;
    };
  };
  currentUser?: any;
}

export function TeamStructureAdvanced({ stats, currentUser }: TeamStructureProps) {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'overview' | 'partners' | 'tree'>('analytics');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [showTreeFullscreen, setShowTreeFullscreen] = useState(false);

  // Моковые данные партнёров (в реальности из API)
  const mockPartners: Partner[] = [
    {
      id: '1',
      name: 'Анна Петрова',
      level: 1,
      referralCode: 'ANNA2024',
      joinDate: '2024-01-15',
      status: 'active',
      earnings: 45000,
      teamSize: 12,
      orders: 23,
      lastActivity: '2 часа назад',
    },
    {
      id: '2',
      name: 'Иван Сидоров',
      level: 1,
      referralCode: 'IVAN777',
      joinDate: '2024-02-20',
      status: 'active',
      earnings: 32000,
      teamSize: 8,
      orders: 18,
      lastActivity: '1 день назад',
    },
    {
      id: '3',
      name: 'Мария Иванова',
      level: 1,
      referralCode: 'MARIA_TOP',
      joinDate: '2023-12-10',
      status: 'warning',
      earnings: 18000,
      teamSize: 3,
      orders: 9,
      lastActivity: '5 дней назад',
    },
    {
      id: '4',
      name: 'Дмитрий Козлов',
      level: 2,
      referralCode: 'DIMA_PRO',
      joinDate: '2024-03-01',
      status: 'active',
      earnings: 25000,
      teamSize: 5,
      orders: 15,
      lastActivity: '3 часа назад',
    },
    {
      id: '5',
      name: 'Елена Смирнова',
      level: 2,
      referralCode: 'ELENA_STAR',
      joinDate: '2024-01-25',
      status: 'inactive',
      earnings: 5000,
      teamSize: 0,
      orders: 2,
      lastActivity: '21 день назад',
    },
    {
      id: '6',
      name: 'Алексей Новиков',
      level: 3,
      referralCode: 'ALEX_NEW',
      joinDate: '2024-03-10',
      status: 'active',
      earnings: 12000,
      teamSize: 2,
      orders: 8,
      lastActivity: 'Вчера',
    },
  ];

  // Фильтрация партнёров
  const getFilteredPartners = (line?: number) => {
    let filtered = mockPartners;
    
    if (line) {
      filtered = filtered.filter(p => p.level === line);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.referralCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => b.earnings - a.earnings);
  };

  // Статус индикатор
  const getStatusBadge = (status: Partner['status']) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700', icon: '🟢', label: 'Активен' },
      warning: { color: 'bg-yellow-100 text-yellow-700', icon: '🟡', label: 'Неактивен 7+ днй' },
      inactive: { color: 'bg-red-100 text-red-700', icon: '🔴', label: 'Неативен 30+ дней' },
    };
    return badges[status];
  };

  // Конверси по линиям
  const getConversion = (fromLevel: number, toLevel: number) => {
    const from = mockPartners.filter(p => p.level === fromLevel).length;
    const to = mockPartners.filter(p => p.level === toLevel).length;
    return from > 0 ? Math.round((to / from) * 100) : 0;
  };

  // Копирование реферальной ссылки
  const copyReferralLink = () => {
    const link = `https://partner.h2oxygen.ru/join?ref=USER123`;
    navigator.clipboard.writeText(link);
    toast.success('📋 Реферальная ссылка скопирована!');
  };

  return (
    <div className="space-y-6">
      {/* Подвкладки */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeSubTab === 'analytics' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('analytics')}
            className={activeSubTab === 'analytics' ? 'bg-[#39B7FF] text-white' : ''}
          >
            📈 Аналитика
          </Button>
          <Button
            variant={activeSubTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('overview')}
            className={activeSubTab === 'overview' ? 'bg-[#39B7FF] text-white' : ''}
          >
            📊 Обзор
          </Button>
          <Button
            variant={activeSubTab === 'partners' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('partners')}
            className={activeSubTab === 'partners' ? 'bg-[#39B7FF] text-white' : ''}
          >
            👥 Партнёры
          </Button>
          <Button
            variant={activeSubTab === 'tree' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('tree')}
            className={activeSubTab === 'tree' ? 'bg-[#39B7FF] text-white' : ''}
          >
            🌳 Дерево
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={copyReferralLink}>
            <Copy className="w-4 h-4 mr-2" />
            Пригласить
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Контент вкладок */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Заголовок */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              ���� Аналитика команды
            </h2>
            <p className="text-gray-500 mt-1">Визуализация роста и активности вашей структуры</p>
          </div>

          {/* Кольца активности */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6">⚡ Кольца активности</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Кольцо 1: Партнёры */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-3">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#E5E7EB"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#39B7FF"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(stats.team.total / 50) * 351.86} 351.86`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">{stats.team.total}</div>
                      <div className="text-xs text-gray-500">партнёров</div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Цель: 50</div>
              </div>

              {/* Кольцо 2: Доход */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-3">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#E5E7EB"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#12C9B6"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${((stats.earnings.d1 + stats.earnings.d2 + stats.earnings.d3) / 100000) * 351.86} 351.86`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round((stats.earnings.d1 + stats.earnings.d2 + stats.earnings.d3) / 1000)}K
                      </div>
                      <div className="text-xs text-gray-500">рублей</div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Цель: 100K₽</div>
              </div>

              {/* Кольцо 3: Активность */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-3">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#E5E7EB"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#F59E0B"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(mockPartners.filter(p => p.status === 'active').length / stats.team.total) * 351.86} 351.86`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {mockPartners.filter(p => p.status === 'active').length}
                      </div>
                      <div className="text-xs text-gray-500">активных</div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">За неделю</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <span className="font-medium">Продолжайте работу, чтобы закрыть все кольца!</span>
              </p>
            </div>
          </Card>

          {/* Графики роста */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Рост команды */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📈 Рост команды (6 месяцев)</h3>
              <div className="h-48 flex items-end gap-3">
                {[1, 2, 3, 5, 6, stats.team.total].map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-medium text-gray-700">{count}</div>
                    <div 
                      className="w-full bg-gradient-to-t from-[#39B7FF] to-[#12C9B6] rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${(count / Math.max(...[1, 2, 3, 5, 6, stats.team.total])) * 100}%` }}
                    ></div>
                    <div className="text-xs text-gray-500">
                      {['июль', 'авг', 'сент', 'окт', 'нояб', 'дек'][i]}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Динамика дохода */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📊 Динамика дохода</h3>
              <div className="h-48 flex items-end gap-3">
                {[500, 1200, 2100, 3500, 5200, stats.earnings.d1 + stats.earnings.d2 + stats.earnings.d3].map((amount, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-medium text-gray-700">{Math.round(amount / 1000)}K</div>
                    <div 
                      className="w-full bg-gradient-to-t from-[#10B981] to-[#34D399] rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${(amount / Math.max(...[500, 1200, 2100, 3500, 5200, stats.earnings.d1 + stats.earnings.d2 + stats.earnings.d3])) * 100}%` }}
                    ></div>
                    <div className="text-xs text-gray-500">
                      {['июль', 'авг', 'сент', 'окт', 'нояб', 'дек'][i]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                <p className="text-sm text-green-700">
                  💡 <span className="font-medium">Доход будет расти, если вы сохраните первое кольцо заказом каждый день</span>
                </p>
              </div>
            </Card>
          </div>

          {/* Путь к успеху */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6">🎯 Путь к успеху</h3>
            
            <div className="space-y-4">
              {/* Милестоун 1: Первый партнёр */}
              <div className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center text-white text-xl">
                  👤
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Первый партнёр</div>
                  <div className="text-sm text-gray-500">1 партнёр</div>
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Милестоун 2: 5 партнёров */}
              <div className={`flex items-center gap-4 p-4 ${stats.team.direct >= 5 ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50 border-2 border-dashed border-gray-300'} rounded-lg`}>
                <div className={`w-12 h-12 bg-gradient-to-br ${stats.team.direct >= 5 ? 'from-blue-500 to-blue-400' : 'from-gray-400 to-gray-300'} rounded-full flex items-center justify-center text-white text-xl`}>
                  ⭐
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">5 партнёров</div>
                  <div className="text-sm text-gray-500">Развивайте команду</div>
                </div>
                {stats.team.direct >= 5 ? (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">{stats.team.direct}/5</div>
                )}
              </div>

              {/* Милестоун 3: 10 партнёров */}
              <div className={`flex items-center gap-4 p-4 ${stats.team.direct >= 10 ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50 border-2 border-dashed border-gray-300'} rounded-lg`}>
                <div className={`w-12 h-12 bg-gradient-to-br ${stats.team.direct >= 10 ? 'from-yellow-500 to-yellow-400' : 'from-gray-400 to-gray-300'} rounded-full flex items-center justify-center text-white text-xl`}>
                  🏆
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">10 партнёров</div>
                  <div className="text-sm text-gray-500">Лидер команды</div>
                </div>
                {stats.team.direct >= 10 ? (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">{stats.team.direct}/10</div>
                )}
              </div>

              {/* Милестоун 4: 25 партнёров */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-300 rounded-full flex items-center justify-center text-white text-xl">
                  🎖️
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">25 партнёров</div>
                  <div className="text-sm text-gray-500">Менеджер сети</div>
                </div>
                <div className="text-sm text-gray-500">{stats.team.direct}/25</div>
              </div>

              {/* Милестоун 5: 50 партнёров */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-300 rounded-full flex items-center justify-center text-white text-xl">
                  💎
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">50 партнёров</div>
                  <div className="text-sm text-gray-500">Топ-директор</div>
                </div>
                <div className="text-sm text-gray-500">{stats.team.direct}/50</div>
              </div>
            </div>
          </Card>

          {/* Карта активности */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">️ Карта активности</h3>
            <p className="text-sm text-gray-500 mb-4">Активность команды за последние 12 недель</p>
            
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, row) => (
                <div key={row} className="flex gap-1">
                  {Array.from({ length: 12 }, (_, col) => {
                    const activity = Math.random();
                    return (
                      <div
                        key={col}
                        className={`w-8 h-8 rounded-sm transition-colors cursor-pointer hover:ring-2 hover:ring-[#39B7FF] ${
                          activity > 0.7 ? 'bg-[#12C9B6]' :
                          activity > 0.4 ? 'bg-[#12C9B6]/60' :
                          activity > 0.2 ? 'bg-[#12C9B6]/30' :
                          'bg-gray-200'
                        }`}
                        title={`День ${row * 12 + col + 1}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <span>Меньше</span>
              <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-[#12C9B6]/30 rounded-sm"></div>
              <div className="w-3 h-3 bg-[#12C9B6]/60 rounded-sm"></div>
              <div className="w-3 h-3 bg-[#12C9B6] rounded-sm"></div>
              <span>Больше</span>
            </div>
          </Card>

          {/* Распределение по линиям */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-400 rounded-xl flex items-center justify-center text-white text-xl mb-3 mx-auto">
                👥
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.team.total}</div>
                <div className="text-sm text-gray-500 mt-1">Всего партнёров</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-400 rounded-xl flex items-center justify-center text-white text-xl mb-3 mx-auto">
                📊
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.team.level1}</div>
                <div className="text-sm text-gray-500 mt-1">1-я линия</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-400 rounded-xl flex items-center justify-center text-white text-xl mb-3 mx-auto">
                📈
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.team.level2}</div>
                <div className="text-sm text-gray-500 mt-1">2-я линия</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-400 rounded-xl flex items-center justify-center text-white text-xl mb-3 mx-auto">
                🚀
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.team.level3}</div>
                <div className="text-sm text-gray-500 mt-1">3-я линия</div>
              </div>
            </Card>
          </div>

          {/* Кнопка приглашения */}
          <Card className="p-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] border-0">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  🎁
                </div>
                <div>
                  <div className="font-semibold">Пригласите партнёров</div>
                  <div className="text-sm text-white/80">Ваш реферальный код: <span className="font-mono font-bold">USER123</span></div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="bg-white text-[#39B7FF] hover:bg-white/90 border-white/20"
                  onClick={copyReferralLink}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Пригласить
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white/20 text-white hover:bg-white/30 border-white/20"
                >
                  Поделиться
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Воронка структуры */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Визуализация структуры</h3>
            
            <div className="space-y-4">
              {/* D1 */}
              <div className="relative">
                <div 
                  className="h-20 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg flex items-center justify-between px-6 text-white cursor-pointer hover:shadow-lg transition-all"
                  style={{ width: '100%' }}
                  onClick={() => setSelectedLine(selectedLine === 1 ? null : 1)}
                >
                  <div>
                    <div className="text-sm opacity-90">D1 · Первая линия</div>
                    <div className="text-2xl font-bold">{stats.team.level1} партнёров</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{stats.earnings.d1.toLocaleString('ru-RU')} ₽</div>
                    <div className="text-sm opacity-90">35% от дохода</div>
                  </div>
                  <ChevronRight className={`w-6 h-6 transition-transform ${selectedLine === 1 ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* D2 */}
              <div className="relative pl-12">
                <div 
                  className="h-20 bg-gradient-to-r from-purple-500 to-purple-400 rounded-lg flex items-center justify-between px-6 text-white cursor-pointer hover:shadow-lg transition-all"
                  style={{ width: '85%' }}
                  onClick={() => setSelectedLine(selectedLine === 2 ? null : 2)}
                >
                  <div>
                    <div className="text-sm opacity-90">D2 · Вторая линия</div>
                    <div className="text-2xl font-bold">{stats.team.level2} партнёров</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{stats.earnings.d2.toLocaleString('ru-RU')} ₽</div>
                    <div className="text-sm opacity-90">42% от дохода</div>
                  </div>
                  <ChevronRight className={`w-6 h-6 transition-transform ${selectedLine === 2 ? 'rotate-90' : ''}`} />
                </div>
                {/* Конверсия */}
                <div className="absolute -top-2 left-0 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                  ↓ {getConversion(1, 2)}% конверсия
                </div>
              </div>

              {/* D3 */}
              <div className="relative pl-24">
                <div 
                  className="h-20 bg-gradient-to-r from-pink-500 to-pink-400 rounded-lg flex items-center justify-between px-6 text-white cursor-pointer hover:shadow-lg transition-all"
                  style={{ width: '70%' }}
                  onClick={() => setSelectedLine(selectedLine === 3 ? null : 3)}
                >
                  <div>
                    <div className="text-sm opacity-90">D3 · Третья линия</div>
                    <div className="text-2xl font-bold">{stats.team.level3} партнёров</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{stats.earnings.d3.toLocaleString('ru-RU')} ₽</div>
                    <div className="text-sm opacity-90">23% от дохода</div>
                  </div>
                  <ChevronRight className={`w-6 h-6 transition-transform ${selectedLine === 3 ? 'rotate-90' : ''}`} />
                </div>
                {/* Конверсия */}
                <div className="absolute -top-2 left-12 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                  ↓ {getConversion(2, 3)}% конверсия
                </div>
              </div>
            </div>

            {/* Глубина структуры */}
            <div className="mt-6 pt-6 border-t flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-lg flex items-center justify-center text-white font-bold">
                  {stats.team.depth}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Максимальная глубина</div>
                  <div className="text-sm text-gray-500">уровней в вашей структуре</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{stats.team.total}</div>
                <div className="text-sm text-gray-500">всего партнёров</div>
              </div>
            </div>
          </Card>

          {/* Метрики и динамика */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Средние показатели */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Средние показатели</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Средний доход на партнёра D1</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(stats.earnings.d1 / stats.team.level1).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Средний доход на партнёра D2</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(stats.earnings.d2 / stats.team.level2).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Средний доход на партнёра D3</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(stats.earnings.d3 / stats.team.level3).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Размер команды на D1 партнёра</span>
                    <span className="font-bold text-gray-900">
                      {Math.round(stats.team.total / stats.team.level1)} чел
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Динамика роста */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Динамика роста структуры</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">D1 за месяц</span>
                  </div>
                  <span className="font-bold text-green-600">+3 партнёра</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">D2 за месяц</span>
                  </div>
                  <span className="font-bold text-green-600">+5 партнёров</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-gray-700">D3 за месяц</span>
                  </div>
                  <span className="font-bold text-yellow-600">-1 партнёр</span>
                </div>
                <div className="pt-3 border-t text-center">
                  <div className="text-2xl font-bold text-gray-900">+7</div>
                  <div className="text-sm text-gray-500">новых партнёров за месяц</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Топ-5 партнёров */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">🏆 Топ-5 партнёров по доходу</h3>
            <div className="space-y-3">
              {getFilteredPartners().slice(0, 5).map((partner, index) => (
                <div 
                  key={partner.id}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-200 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-bold">
                      {partner.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {partner.name}
                        {index < 3 && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                      </div>
                      <div className="text-sm text-gray-500">
                        D{partner.level} · {partner.teamSize} в команде · {partner.orders} заказов
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getStatusBadge(partner.status).icon}
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {partner.earnings.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="text-xs text-gray-500">{partner.lastActivity}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeSubTab === 'partners' && (
        <div className="space-y-6">
          {/* Поиск и фильтры */}
          <Card className="p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по имени и реферальному коду..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Фильтры
              </Button>
            </div>

            {/* Фильтры по линиям */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant={selectedLine === null ? 'default' : 'outline'}
                onClick={() => setSelectedLine(null)}
                className={selectedLine === null ? 'bg-[#39B7FF] text-white' : ''}
              >
                Все ({mockPartners.length})
              </Button>
              <Button
                size="sm"
                variant={selectedLine === 1 ? 'default' : 'outline'}
                onClick={() => setSelectedLine(1)}
                className={selectedLine === 1 ? 'bg-blue-500 text-white' : ''}
              >
                D1 ({stats.team.level1})
              </Button>
              <Button
                size="sm"
                variant={selectedLine === 2 ? 'default' : 'outline'}
                onClick={() => setSelectedLine(2)}
                className={selectedLine === 2 ? 'bg-purple-500 text-white' : ''}
              >
                D2 ({stats.team.level2})
              </Button>
              <Button
                size="sm"
                variant={selectedLine === 3 ? 'default' : 'outline'}
                onClick={() => setSelectedLine(3)}
                className={selectedLine === 3 ? 'bg-pink-500 text-white' : ''}
              >
                D3 ({stats.team.level3})
              </Button>
            </div>
          </Card>

          {/* Список партнёров */}
          <div className="space-y-3">
            {getFilteredPartners(selectedLine || undefined).map((partner) => (
              <Card key={partner.id} className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Аватар */}
                    <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {partner.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    {/* Инфо */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{partner.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(partner.status).color}`}>
                          {getStatusBadge(partner.status).label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          partner.level === 1 ? 'bg-blue-100 text-blue-700' :
                          partner.level === 2 ? 'bg-purple-100 text-purple-700' :
                          'bg-pink-100 text-pink-700'
                        }`}>
                          D{partner.level}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Реф. код</div>
                          <div className="font-medium text-gray-900">{partner.referralCode}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">В команде</div>
                          <div className="font-medium text-gray-900">{partner.teamSize} чел</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Заказов</div>
                          <div className="font-medium text-gray-900">{partner.orders}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Доход для вас</div>
                          <div className="font-bold text-[#39B7FF]">{partner.earnings.toLocaleString('ru-RU')} ₽</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Зарегистрирован: {new Date(partner.joinDate).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Активность: {partner.lastActivity}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Раскрываемая секция с командой */}
                {partner.teamSize > 0 && (
                  <button
                    onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)}
                    className="mt-3 text-sm text-[#39B7FF] hover:underline flex items-center gap-1"
                  >
                    {expandedPartner === partner.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    Показать команду ({partner.teamSize})
                  </button>
                )}

                {expandedPartner === partner.id && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-gray-500 italic">
                      🚧 Здесь будет отображаться команда этого партнёра
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {getFilteredPartners(selectedLine || undefined).length === 0 && (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Партнёры не найдены</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'tree' && (
        <TreeVisualization 
          currentUser={currentUser} 
        />
      )}
    </div>
  );
}
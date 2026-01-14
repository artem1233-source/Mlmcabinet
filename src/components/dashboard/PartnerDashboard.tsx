import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { 
  Users, ShoppingBag, Wallet, TrendingUp, Trophy, Sparkles, 
  Copy, ExternalLink, Target, Calendar, Clock, Award,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Circle,
  Flame, Star, Gift, ChevronRight, Edit3, X, Save, Plus, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import * as api from '../../utils/api';
import { toast } from 'sonner';
import { AddGoalModal } from './AddGoalModal';
import { GoalsWidget } from './GoalsWidget';
import { TeamStructureAdvanced } from './TeamStructureAdvanced';
import { 
  loadGoals, 
  saveGoals, 
  addGoal, 
  toggleGoalCompletion, 
  deleteGoal, 
  getActiveGoals, 
  getCompletedGoals, 
  getGoalsStats,
  Goal,
  GoalsStats
} from '../../utils/goalsHelper';

interface PartnerDashboardProps {
  currentUser: any;
  period?: string;
}

export function PartnerDashboard({ currentUser, period }: PartnerDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(7); // TODO: Рассчитывать из активности
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [userGoals, setUserGoals] = useState<Goal[]>([]);
  const [goalsStats, setGoalsStats] = useState<GoalsStats>({
    totalCompleted: 0,
    weekCompleted: 0,
    monthCompleted: 0,
    streak: 0,
    completionRate: 0,
  });
  const [activeTab, setActiveTab] = useState<'income' | 'structure' | 'products'>('income');
  const [structureVersion, setStructureVersion] = useState<'current' | 'v2'>('current');

  useEffect(() => {
    loadPartnerStats();
    loadUserGoals();
  }, []);

  const loadUserGoals = () => {
    const goals = loadGoals();
    setUserGoals(goals);
    const stats = getGoalsStats();
    setGoalsStats(stats);
    setStreak(stats.streak);
  };

  const handleToggleGoal = (goalId: string) => {
    toggleGoalCompletion(goalId);
    loadUserGoals();
    toast.success('✅ Цель обновлена!');
  };

  const handleDeleteGoal = (goalId: string) => {
    deleteGoal(goalId);
    loadUserGoals();
    toast.success('🗑️ Цель удалена');
  };

  const handleAddGoal = (title: string, deadline?: string) => {
    addGoal(title, deadline);
    loadUserGoals();
  };

  const loadPartnerStats = async () => {
    setLoading(true);
    try {
      const [teamResponse, ordersResponse, earningsResponse] = await Promise.all([
        api.getUserTeam().catch(() => ({ success: false, team: [] })),
        api.getOrders().catch(() => ({ success: false, orders: [] })),
        api.getEarnings().catch(() => ({ success: false, earnings: [] })),
      ]);

      const team = teamResponse.team || [];
      const directPartners = team.filter((u: any) => u.sponsor_id === 'current_user_id');
      const totalTeam = team.length;
      
      // 🆕 Рассчитываем глубину структуры
      const calculateDepth = (userId: string, teamData: any[], currentDepth: number = 0): number => {
        const children = teamData.filter((u: any) => u.sponsor_id === userId);
        if (children.length === 0) return currentDepth;
        
        const childDepths = children.map((child: any) => 
          calculateDepth(child.id, teamData, currentDepth + 1)
        );
        return Math.max(...childDepths);
      };
      
      const structureDepth = calculateDepth('current_user_id', team);
      
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const activeToday = team.filter((u: any) => {
        const lastActive = new Date(u.last_active).getTime();
        return lastActive > oneDayAgo;
      }).length;

      const orders = ordersResponse.orders || [];
      const totalOrders = orders.length;
      const totalAmount = orders.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
      const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

      const earnings = earningsResponse.earnings || [];
      const totalEarnings = earnings.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      
      const now2 = new Date();
      const startOfMonth = new Date(now2.getFullYear(), now2.getMonth(), 1).getTime();
      const startOfLastMonth = new Date(now2.getFullYear(), now2.getMonth() - 1, 1).getTime();
      const endOfLastMonth = new Date(now2.getFullYear(), now2.getMonth(), 0, 23, 59, 59).getTime();
      
      const thisMonthEarnings = earnings
        .filter((e: any) => new Date(e.created_at).getTime() >= startOfMonth)
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      
      const lastMonthEarnings = earnings
        .filter((e: any) => {
          const time = new Date(e.created_at).getTime();
          return time >= startOfLastMonth && time <= endOfLastMonth;
        })
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // Структура доходов по линиям (мок-данные для примера)
      const d1Earnings = thisMonthEarnings * 0.35;
      const d2Earnings = thisMonthEarnings * 0.42;
      const d3Earnings = thisMonthEarnings * 0.23;

      const balance = typeof currentUser?.balance === 'number' ? currentUser.balance : 0;

      // Мок-данные для топ партнёров
      const topPartners = directPartners
        .slice(0, 3)
        .map((p: any, i: number) => ({
          name: p.full_name || p.email?.split('@')[0] || `Партнёр ${i + 1}`,
          earnings: Math.floor(Math.random() * 10000 + 2000),
        }))
        .sort((a, b) => b.earnings - a.earnings);

      // Мок-данные для последних комиссий
      const recentCommissions = earnings
        .slice(0, 3)
        .map((e: any) => ({
          type: ['D1', 'D2', 'D1'][Math.floor(Math.random() * 3)],
          from: 'Партнёр',
          amount: e.amount || 0,
          time: formatRelativeTime(e.created_at),
        }));

      // Мок-данные для активности команды
      const teamActivity = [
        { name: 'Иван С.', action: 'сделал заказ', time: '2ч назад', icon: 'order' },
        { name: 'Мария К.', action: 'пригласила партнёра', time: '5ч назад', icon: 'invite' },
        { name: 'Петр Д.', action: 'вышел на уровень 2', time: '1д назад', icon: 'level' },
      ];

      setStats({
        team: {
          direct: directPartners.length,
          total: totalTeam,
          activeToday,
          level1: directPartners.length,
          level2: Math.floor(totalTeam * 0.3),
          level3: Math.floor(totalTeam * 0.6),
          depth: structureDepth, // 🆕 Реальная глубина структуры
        },
        orders: {
          total: totalOrders,
          amount: totalAmount,
          pending: pendingOrders,
        },
        earnings: {
          total: totalEarnings,
          thisMonth: thisMonthEarnings,
          lastMonth: lastMonthEarnings,
          available: balance,
          d1: d1Earnings,
          d2: d2Earnings,
          d3: d3Earnings,
        },
        rank: {
          current: currentUser?.rank || 1,
          nextRank: Math.min((currentUser?.rank || 1) + 1, 3),
          progress: 65,
          requirements: 'Пригласите ещё 3 партнёра',
        },
        goals: {
          weeklyInvites: { done: 0, total: 2 },
          weeklyOrders: { done: 1, total: 1 },
          weeklyConsultations: { done: 1, total: 3 },
        },
        topPartners,
        recentCommissions,
        teamActivity,
      });
    } catch (error) {
      console.error('❌ Error loading partner stats:', error);
      setStats({
        team: { direct: 0, total: 0, activeToday: 0, level1: 0, level2: 0, level3: 0, depth: 0 }, // 🆕 Глубина структуры
        orders: { total: 0, amount: 0, pending: 0 },
        earnings: { total: 0, thisMonth: 0, lastMonth: 0, available: 0, d1: 0, d2: 0, d3: 0 },
        rank: { current: 1, nextRank: 2, progress: 0, requirements: '' },
        goals: {
          weeklyInvites: { done: 0, total: 2 },
          weeklyOrders: { done: 0, total: 1 },
          weeklyConsultations: { done: 0, total: 3 },
        },
        topPartners: [],
        recentCommissions: [],
        teamActivity: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 24) return `${hours}ч назад`;
    if (days === 1) return 'вчера';
    return `${days}д назад`;
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const calculateChange = () => {
    if (!stats || stats.earnings.lastMonth === 0) return { percent: 0, isPositive: true };
    const change = ((stats.earnings.thisMonth - stats.earnings.lastMonth) / stats.earnings.lastMonth) * 100;
    return { percent: Math.abs(Math.round(change)), isPositive: change >= 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const change = calculateChange();
  const shopUrl = `https://h2.shop/r/${'current_user_ref_code'}`;
  const partnerUrl = `https://h2.platform/register?ref=${'current_user_ref_code'}`;

  return (
    <div className="space-y-6">
      {/* Приветствие + Реферальные ссылки */}
      <div className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              👋 Привет, {currentUser.full_name || currentUser.email?.split('@')[0]}!
            </h2>
            <p className="text-white/90 flex items-center gap-3">
              <span className="font-mono font-bold text-lg">
                {stats.team.direct}/{stats.team.depth}/{stats.team.total}
              </span>
              <span className="opacity-60">•</span>
              <span>Реферальный код: <span className="font-mono font-bold">{currentUser.ref_code}</span></span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="bg-white text-[#39B7FF] hover:bg-white/90 border-white/20"
              onClick={() => copyToClipboard(shopUrl, '🛍️ Ссылка на магазин скопирована!')}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Ссылка на магазин
              <Copy className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              className="bg-white text-[#12C9B6] hover:bg-white/90 border-white/20"
              onClick={() => copyToClipboard(partnerUrl, '👥 Ссылка для партнёров скопирована!')}
            >
              <Users className="w-4 h-4 mr-2" />
              Пригласить партнёра
              <Copy className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Дход за месяц */}
        <Card className="p-6 relative overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#F59E0B]/20 to-[#F59E0B]/5 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div className={`flex items-center gap-1 text-sm ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {change.isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {change.percent}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Доход за месяц</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.earnings.thisMonth.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#F59E0B]/5 rounded-tl-full"></div>
        </Card>

        {/* Команда */}
        <Card className="p-6 relative overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF]/20 to-[#39B7FF]/5 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[#39B7FF]" />
            </div>
            <div className="text-sm text-green-600">
              +{stats.team.activeToday} сегодя
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Парнёров в команде</div>
            <div className="text-3xl font-bold text-gray-900">{stats.team.total}</div>
            <div className="text-xs text-gray-400">Прямых: {stats.team.direct}</div>
          </div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#39B7FF]/5 rounded-tl-full"></div>
        </Card>

        {/* Баланс */}
        <Card className="p-6 relative overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#12C9B6]/20 to-[#12C9B6]/5 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-[#12C9B6]" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-gray-500">Доступно к выводу</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.earnings.available.toLocaleString('ru-RU')} ₽
            </div>
            <Button 
              size="sm" 
              className="w-full bg-[#12C9B6] hover:bg-[#0FA896] text-white"
              onClick={() => {
                const event = new CustomEvent('navigate', { detail: 'баланс' });
                window.dispatchEvent(event);
              }}
            >
              Вывести
            </Button>
          </div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#12C9B6]/5 rounded-tl-full"></div>
        </Card>

        {/* Заказы */}
        <Card className="p-6 relative overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-[#10B981]" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-gray-500">Активных заказов</div>
            <div className="text-3xl font-bold text-gray-900">{stats.orders.pending}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                const event = new CustomEvent('navigate', { detail: 'заказы' });
                window.dispatchEvent(event);
              }}
            >
              Посмотреть
            </Button>
          </div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#10B981]/5 rounded-tl-full"></div>
        </Card>
      </div>

      {/* Цели + Прогресс */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* овый виджет целей */}
        <GoalsWidget
          userId={'current_user_id'}
          activeGoals={getActiveGoals()}
          completedGoals={getCompletedGoals(10)}
          stats={goalsStats}
          onToggleGoal={handleToggleGoal}
          onDeleteGoal={handleDeleteGoal}
          onAddGoal={() => setIsAddingGoal(true)}
        />

        {/* Прогресс о следующего уровня */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Прогресс до уровня {stats.rank.nextRank}</h3>
              <p className="text-sm text-gray-500">Продолжайте развивать команду</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] flex items-center justify-center text-white text-xl font-bold">
                  {stats.rank.current}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xl font-bold">
                  {stats.rank.nextRank}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{stats.rank.progress}%</div>
                <div className="text-xs text-gray-500">завершено</div>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] h-3 rounded-full transition-all relative"
                style={{ width: `${stats.rank.progress}%` }}
              >
                <div className="absolute -right-1 -top-1 w-5 h-5 bg-white rounded-full border-2 border-[#12C9B6] shadow"></div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-xs text-blue-600 font-medium mb-1">Что нужно сделать:</div>
              <div className="text-sm text-blue-900">{stats.rank.requirements}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Вкладки с графикаи */}
      {activeTab !== 'structure' && (
        <Card className="p-6">
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-6">
              <button
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'income'
                    ? 'border-[#39B7FF] text-[#39B7FF]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('income')}
              >
                📈 Динамика дохода
              </button>
              <button
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'structure'
                    ? 'border-[#39B7FF] text-[#39B7FF]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('structure')}
              >
                📊 Структура команды
              </button>
              <button
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'products'
                    ? 'border-[#39B7FF] text-[#39B7FF]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('products')}
              >
                🏆 Топ товары
              </button>
            </div>
          </div>

          <div className="min-h-[200px]">
            {activeTab === 'income' && (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">Доходы за последние 6 месяцев</div>
                <div className="flex items-end gap-2 h-40">
                  {[4200, 5100, 6800, 7200, 8900, stats.earnings.thisMonth].map((amount, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-to-t from-[#39B7FF] to-[#12C9B6] rounded-t-lg transition-all hover:opacity-80"
                        style={{ height: `${(amount / 15000) * 100}%` }}
                      ></div>
                      <div className="text-xs text-gray-500">
                        {['Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Янв'][i]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-3">
                <div className="text-sm text-gray-500 mb-4">Ваши учшие товары по продажам</div>
                
                {['H2 Водородный порошок', 'Витамин C Premium', 'Omega-3 Complex'].map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-200 text-gray-600' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{product}</div>
                        <div className="text-sm text-gray-500">{25 - i * 6} продаж в месяц</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{(3500 - i * 800).toLocaleString('ru-RU')} ₽</div>
                      <div className="text-xs text-gray-500">ваш доход</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Расширенная структура команды */}
      {activeTab === 'structure' && (
        <div>
          <Card className="p-6 mb-6">
            {/* Переключатель версий - заметный */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">📊 Структура команды</h3>
                  <p className="text-sm text-gray-600">Выберите вариант отображения</p>
                </div>
                
                {/* Переключатель версий */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={structureVersion === 'current' ? 'default' : 'outline'}
                    onClick={() => setStructureVersion('current')}
                    className={structureVersion === 'current' ? 'bg-[#39B7FF] hover:bg-[#2997E0] text-white' : 'hover:bg-white'}
                  >
                    📋 Текущий
                  </Button>
                  <Button
                    size="sm"
                    variant={structureVersion === 'v2' ? 'default' : 'outline'}
                    onClick={() => setStructureVersion('v2')}
                    className={structureVersion === 'v2' ? 'bg-[#12C9B6] hover:bg-[#0FA896] text-white' : 'hover:bg-white'}
                  >
                    ✨ Вариант 2
                  </Button>
                </div>
              </div>
            </div>

            {/* Вкладки навигации */}
            <div className="border-b border-gray-200">
              <div className="flex gap-6">
                <button
                  className="pb-3 px-1 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                  onClick={() => setActiveTab('income')}
                >
                  📈 Динамика дохода
                </button>
                <button
                  className="pb-3 px-1 text-sm font-medium border-b-2 border-[#39B7FF] text-[#39B7FF]"
                  onClick={() => setActiveTab('structure')}
                >
                  📊 Структура команды
                </button>
                <button
                  className="pb-3 px-1 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                  onClick={() => setActiveTab('products')}
                >
                  🏆 Топ товары
                </button>
              </div>
            </div>
          </Card>

          {/* Текущая версия - старые 3 карточки */}
          {structureVersion === 'current' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* D1 */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-400 rounded-xl flex items-center justify-center text-white">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">D1</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Первая линия</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.team.level1}</div>
                  <div className="text-sm text-gray-600">партнёров</div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Доход</span>
                    <span className="font-bold text-blue-600">{stats.earnings.d1.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </Card>

              {/* D2 */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-400 rounded-xl flex items-center justify-center text-white">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">D2</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Вторая линия</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.team.level2}</div>
                  <div className="text-sm text-gray-600">партнёров</div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Доход</span>
                    <span className="font-bold text-purple-600">{stats.earnings.d2.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </Card>

              {/* D3 */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-400 rounded-xl flex items-center justify-center text-white">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-1 rounded">D3</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Третья линия</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.team.level3}</div>
                  <div className="text-sm text-gray-600">партнёров</div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Доход</span>
                    <span className="font-bold text-pink-600">{stats.earnings.d3.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Вариант 2 - новые улучшения */}
          {structureVersion === 'v2' && (
            <TeamStructureAdvanced stats={stats} currentUser={currentUser} />
          )}
        </div>
      )}

      {/* Календарь активности */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Календарь активности</h3>
              <p className="text-sm text-gray-500">Ваша активность за последние 12 едель</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-gray-900">{streak} дней подряд</span>
            </div>
            <div className="text-gray-500">Лучший: 24 дня</div>
          </div>
        </div>

        {/* GitHub-style activity heatmap */}
        <div className="space-y-2">
          <div className="flex gap-1">
            {Array.from({ length: 84 }, (_, i) => {
              const activity = Math.random();
              return (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm ${
                    activity > 0.7 ? 'bg-[#12C9B6]' :
                    activity > 0.4 ? 'bg-[#12C9B6]/60' :
                    activity > 0.2 ? 'bg-[#12C9B6]/30' :
                    'bg-gray-200'
                  }`}
                  title={`День ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Меньше</span>
            <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-[#12C9B6]/30 rounded-sm"></div>
            <div className="w-3 h-3 bg-[#12C9B6]/60 rounded-sm"></div>
            <div className="w-3 h-3 bg-[#12C9B6] rounded-sm"></div>
            <span>Больше</span>
          </div>
        </div>
      </Card>

      {/* Активность команды + Топ партнёры + Комиссии */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Активность команды */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Активность команды</h3>
          </div>

          <div className="space-y-3">
            {stats.teamActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  activity.icon === 'order' ? 'bg-blue-100' :
                  activity.icon === 'invite' ? 'bg-green-100' :
                  'bg-purple-100'
                }`}>
                  {activity.icon === 'order' ? '🛍️' : activity.icon === 'invite' ? '🎉' : '🚀'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                  <div className="text-xs text-gray-500">{activity.action}</div>
                </div>
                <div className="text-xs text-gray-400">{activity.time}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Топ-3 партнёра */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Топ-3 партнёра</h3>
          </div>

          <div className="space-y-3">
            {stats.topPartners.length > 0 ? (
              stats.topPartners.map((partner, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-lg">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                      <div className="text-xs text-gray-500">За месяц</div>
                    </div>
                  </div>
                  <div className="font-bold text-gray-900">{partner.earnings.toLocaleString('ru-RU')} ₽</div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                Пригласите партнёов, чтобы увидеть статистику
              </div>
            )}
          </div>
        </Card>

        {/* Поседние комиссии */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Последние комиссии</h3>
          </div>

          <div className="space-y-3">
            {stats.recentCommissions.length > 0 ? (
              stats.recentCommissions.map((commission, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      commission.type === 'D1' ? 'bg-blue-100 text-blue-600' :
                      commission.type === 'D2' ? 'bg-purple-100 text-purple-600' :
                      'bg-pink-100 text-pink-600'
                    }`}>
                      {commission.type}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-600">+{commission.amount.toLocaleString('ru-RU')} ₽</div>
                      <div className="text-xs text-gray-500">{commission.time}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                Комиссй пока нет
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Быстры действия */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Быстрые действия</h3>
            <p className="text-sm text-gray-500">Развивайте свой бизнес</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 hover:border-[#39B7FF] hover:bg-[#39B7FF]/5"
            onClick={() => copyToClipboard(partnerUrl, '👥 Ссылка для партнёров скопирована!')}
          >
            <Users className="w-6 h-6 text-[#39B7FF]" />
            <span className="text-sm">Пригласить</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 hover:border-[#10B981] hover:bg-[#10B981]/5"
            onClick={() => {
              const event = new CustomEvent('navigate', { detail: 'заказы' });
              window.dispatchEvent(event);
            }}
          >
            <ShoppingBag className="w-6 h-6 text-[#10B981]" />
            <span className="text-sm">Создать заказ</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 hover:border-[#F59E0B] hover:bg-[#F59E0B]/5"
            onClick={() => {
              const event = new CustomEvent('navigate', { detail: 'маркетинг' });
              window.dispatchEvent(event);
            }}
          >
            <Gift className="w-6 h-6 text-[#F59E0B]" />
            <span className="text-sm">Материалы</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/5"
            onClick={() => {
              const event = new CustomEvent('navigate', { detail: 'обучение' });
              window.dispatchEvent(event);
            }}
          >
            <Star className="w-6 h-6 text-[#8B5CF6]" />
            <span className="text-sm">Обучение</span>
          </Button>
        </div>
      </Card>

      {/* Модальное окно редактирования целей */}
      <AddGoalModal
        isOpen={isAddingGoal}
        onClose={() => setIsAddingGoal(false)}
        onAddGoal={handleAddGoal}
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Wallet, ShoppingBag, Award, Target, Zap, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, Activity, Crown, Rocket, Star, Gift, CheckCircle2, Clock, Package, UserPlus, DollarSign, BarChart3, Share2, Plus, CreditCard, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../utils/api';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

interface DashboardRuProps {
  currentUser: any;
  onNavigate?: (section: string) => void;
  onRefresh?: () => void;
  refreshTrigger?: number;
}

// Компонент кольца активности (как в Apple Watch)
const ActivityRing = ({ radius, stroke, progress, color, label, value }: any) => {
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative">
      <svg width={radius * 2 + stroke * 2} height={radius * 2 + stroke * 2} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress circle */}
        <motion.circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center"
        >
          <div className="text-2xl font-bold text-gray-800">{value}</div>
          <div className="text-xs text-gray-500 mt-1">{label}</div>
        </motion.div>
      </div>
    </div>
  );
};

// Компонент анимированного счетчика
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startValue = 0;
    const duration = 1500;
    const increment = value / (duration / 16);
    
    const timer = setInterval(() => {
      startValue += increment;
      if (startValue >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(startValue));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString('ru-RU')}{suffix}</span>;
};

// Компонент heatmap календаря активности
const ActivityHeatmap = ({ orders }: { orders: any[] }) => {
  const weeks = 12;
  const days = 7;
  
  const getActivityForDate = (date: Date) => {
    const dayActivity = orders.filter(order => {
      const orderDate = new Date(order.датаСоздания || order.created_at);
      return orderDate.toDateString() === date.toDateString();
    }).length;
    
    if (dayActivity === 0) return 'bg-gray-100';
    if (dayActivity <= 1) return 'bg-green-200';
    if (dayActivity <= 3) return 'bg-green-400';
    return 'bg-green-600';
  };

  const generateCalendar = () => {
    const calendar = [];
    const today = new Date();
    
    for (let week = weeks - 1; week >= 0; week--) {
      const weekData = [];
      for (let day = 0; day < days; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7 + (6 - day)));
        weekData.push({
          date,
          activity: getActivityForDate(date)
        });
      }
      calendar.push(weekData);
    }
    
    return calendar;
  };

  const calendar = generateCalendar();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <CalendarIcon className="w-4 h-4" />
        <span>Моя активность за последние {weeks} недель</span>
      </div>
      <div className="flex gap-1">
        {calendar.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <TooltipProvider key={dayIndex}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-3 h-3 rounded-sm ${day.activity} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 transition-all`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{day.date.toLocaleDateString('ru-RU')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Меньше</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-green-200" />
          <div className="w-3 h-3 rounded-sm bg-green-400" />
          <div className="w-3 h-3 rounded-sm bg-green-600" />
        </div>
        <span>Больше</span>
      </div>
    </div>
  );
};

export function DashboardRu({ currentUser, onNavigate, onRefresh, refreshTrigger }: DashboardRuProps) {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // 💸 Модальное окно вывода средств
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser, refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 DashboardRu: Loading data from SQL...');
      
      // 🔥 SINGLE SOURCE OF TRUTH: Загружаем НАПРЯМУЮ из SQL
      
      // Загружаем команду из SQL profiles (где referrer_id = currentUser.id)
      const { data: teamProfiles, error: teamError } = await supabase
        .from('profiles')
        .select('*')
        .eq('referrer_id', currentUser.id);
      
      if (teamError) console.error('Team SQL error:', teamError);
      
      const teamArray = (teamProfiles || []).map((p: any) => ({
        id: p.user_id || p.id,
        имя: p.name || p.first_name || '',
        баланс: p.balance || 0,
        датаРегистрации: p.created_at,
        зарегистрирован: p.created_at,
      }));
      setTeam(teamArray);
      console.log(`✅ Loaded ${teamArray.length} team members from SQL`);
      
      // Загружаем заказы из SQL
      const { data: sqlOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (ordersError) console.error('Orders SQL error:', ordersError);
      
      const ordersArray = (sqlOrders || []).map((o: any) => ({
        id: o.id,
        партнерId: o.user_id || o.partner_id,
        итого: o.total || 0,
        датаСоздания: o.created_at,
        created_at: o.created_at,
        товары: o.items || [],
        d1: o.d1,
        d2: o.d2,
        d3: o.d3,
        комиссияD1: o.commission_d1 || 0,
        комиссияD2: o.commission_d2 || 0,
        комиссияD3: o.commission_d3 || 0,
      }));
      setOrders(ordersArray);
      console.log(`✅ Loaded ${ordersArray.length} orders from SQL`);
      
      // Мои заказы
      const myOrdersData = ordersArray.filter((o: any) => o.партнерId === currentUser.id);
      setMyOrders(myOrdersData);
      
      // Формируем недавнюю активность
      const activity: any[] = [];
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newPartners = teamArray.filter((m: any) => {
        const regDate = new Date(m.датаРегистрации || m.зарегистрирован);
        return regDate >= weekAgo;
      });
      
      newPartners.forEach((partner: any) => {
        activity.push({
          type: 'partner',
          icon: UserPlus,
          color: 'text-blue-500',
          bg: 'bg-blue-50',
          title: 'Новый партнёр',
          description: `${partner.имя} присоединился к вашей команде`,
          time: new Date(partner.датаРегистрации || partner.зарегистрирован),
        });
      });
      
      const recentOrders = [...ordersArray]
        .filter((o: any) => o.партнерId === currentUser.id || teamArray.some((m: any) => m.id === o.партнерId))
        .sort((a: any, b: any) => new Date(b.датаСоздания || b.created_at).getTime() - new Date(a.датаСоздания || a.created_at).getTime())
        .slice(0, 10);
      
      recentOrders.forEach((order: any) => {
        const isMine = order.партнерId === currentUser.id;
        activity.push({
          type: 'order',
          icon: Package,
          color: isMine ? 'text-green-500' : 'text-purple-500',
          bg: isMine ? 'bg-green-50' : 'bg-purple-50',
          title: isMine ? 'Ваш заказ' : 'Заказ команды',
          description: `${order.товары?.length || 0} товаров на ${(order.итого || 0).toLocaleString('ru-RU')}₽`,
          time: new Date(order.датаСоздания || order.created_at),
        });
      });
      
      activity.sort((a, b) => b.time.getTime() - a.time.getTime());
      setRecentActivity(activity.slice(0, 10));
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Расчёт дохода за текущий месяц
  const getMonthlyIncome = () => {
    if (!Array.isArray(orders)) return 0;
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let totalIncome = 0;
    
    orders.forEach((order: any) => {
      const orderDate = new Date(order.датаСоздания || order.created_at);
      if (orderDate >= monthStart && orderDate <= now) {
        // Считаем комиссии
        if (order.d1 === currentUser.id) totalIncome += order.комиссияD1 || 0;
        if (order.d2 === currentUser.id) totalIncome += order.комиссияD2 || 0;
        if (order.d3 === currentUser.id) totalIncome += order.комиссияD3 || 0;
      }
    });
    
    return totalIncome;
  };

  // Расчёт дохода за прошлый месяц для сравнения
  const getLastMonthIncome = () => {
    if (!Array.isArray(orders)) return 0;
    
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    let totalIncome = 0;
    
    orders.forEach((order: any) => {
      const orderDate = new Date(order.датаСоздания || order.created_at);
      if (orderDate >= lastMonthStart && orderDate <= lastMonthEnd) {
        if (order.d1 === currentUser.id) totalIncome += order.комиссияD1 || 0;
        if (order.d2 === currentUser.id) totalIncome += order.комиссияD2 || 0;
        if (order.d3 === currentUser.id) totalIncome += order.комиссияD3 || 0;
      }
    });
    
    return totalIncome;
  };

  // Генерация данных для графика дохода
  const getIncomeChartData = () => {
    if (!Array.isArray(orders)) return [];
    
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = date.toLocaleDateString('ru-RU', { month: 'short' });
      
      let income = 0;
      orders.forEach((order: any) => {
        const orderDate = new Date(order.датаСоздания || order.created_at);
        if (orderDate >= date && orderDate <= monthEnd) {
          if (order.d1 === currentUser.id) income += order.комиссияD1 || 0;
          if (order.d2 === currentUser.id) income += order.комиссияD2 || 0;
          if (order.d3 === currentUser.id) income += order.комиссияD3 || 0;
        }
      });
      
      months.push({
        month: monthName,
        доход: Math.floor(income),
      });
    }
    
    return months;
  };
  
  // 💸 Функция отправки заявки на вывод средств
  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    const balance = currentUser?.баланс || 0;
    
    if (!amount || amount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }
    
    if (amount > balance) {
      toast.error(`Недостаточно средств. Доступно: ${balance.toLocaleString()}₽`);
      return;
    }
    
    if (!withdrawDetails.trim()) {
      toast.error('Введите реквизиты для вывода');
      return;
    }
    
    setWithdrawing(true);
    try {
      const result = await api.requestWithdrawal(amount, 'card', withdrawDetails);
      
      if (result.success) {
        toast.success('Заявка на вывод отправлена!', {
          description: 'Ожидайте подтверждения от администратора'
        });
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawDetails('');
        onRefresh?.();
      } else {
        throw new Error(result.error || 'Ошибка отправки заявки');
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка отправки заявки');
    } finally {
      setWithdrawing(false);
    }
  };

  // Генерация данных для графика роста команды
  const getTeamGrowthData = () => {
    if (!Array.isArray(team)) return [];
    
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ru-RU', { month: 'short' });
      
      const count = team.filter(member => {
        if (!member.датаРегистрации && !member.зарегистрирован) return false;
        const regDate = new Date(member.датаРегистрации || member.зарегистрирован);
        return regDate <= date;
      }).length;
      
      months.push({
        month: monthName,
        партнеров: count,
      });
    }
    
    return months;
  };

  // Топ товары
  const getTopProducts = () => {
    if (!Array.isArray(orders) || !Array.isArray(team)) return [];
    
    const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
    
    orders.forEach((order: any) => {
      // Только мои заказы и заказы команды
      if (order.партнерId !== currentUser.id && !team.some(m => m.id === order.партнерId)) {
        return;
      }
      
      (order.товары || []).forEach((item: any) => {
        const key = item.товарId || item.название;
        if (!productSales[key]) {
          productSales[key] = {
            name: item.название || 'Товар',
            count: 0,
            revenue: 0,
          };
        }
        productSales[key].count += item.количество || 1;
        productSales[key].revenue += (item.цена || 0) * (item.количество || 1);
      });
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({
        название: p.name,
        продаж: p.count,
        выручка: p.revenue,
      }));
  };

  // Активные заказы (в обработке)
  const getActiveOrders = () => {
    if (!Array.isArray(orders) || !Array.isArray(team)) return 0;
    
    return orders.filter((o: any) => {
      const status = o.статус || o.status;
      return (o.партнерId === currentUser.id || team.some(m => m.id === o.партнерId)) &&
             (status === 'в обработке' || status === 'pending' || !status);
    }).length;
  };

  // Новые партнёры за неделю
  const getNewPartnersThisWeek = () => {
    if (!Array.isArray(team)) return 0;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return team.filter(m => {
      const regDate = new Date(m.датаРегистрации || m.зарегистрирован);
      return regDate >= weekAgo;
    }).length;
  };

  // Данные для колец активности
  const getActivityRingsData = () => {
    if (!Array.isArray(orders) || !Array.isArray(team)) {
      return {
        income: { value: 0, progress: 0, goal: 100000 },
        team: { value: 0, progress: 0, goal: 50 },
        activity: { value: 0, progress: 0, goal: 0 },
      };
    }
    
    const monthlyIncome = getMonthlyIncome();
    const incomeGoal = 100000; // Цель 100K₽
    
    const teamSize = team.length;
    const teamGoal = 50; // Цель 50 партнёров
    
    // Активность - партнёры с заказами за последние 7 дней
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const activePartners = team.filter(member => {
      return orders.some(order => {
        const orderDate = new Date(order.датаСоздания || order.created_at);
        return order.партнерId === member.id && orderDate >= weekAgo;
      });
    }).length;
    const activityPercent = teamSize > 0 ? (activePartners / teamSize) * 100 : 0;
    
    return {
      income: {
        value: monthlyIncome,
        progress: Math.min(100, (monthlyIncome / incomeGoal) * 100),
        goal: incomeGoal,
      },
      team: {
        value: teamSize,
        progress: Math.min(100, (teamSize / teamGoal) * 100),
        goal: teamGoal,
      },
      activity: {
        value: activePartners,
        progress: activityPercent,
        goal: teamSize,
      },
    };
  };

  // Прогресс к следующему уровню
  const getLevelProgress = () => {
    if (!Array.isArray(orders) || !Array.isArray(team)) {
      return { 
        current: currentUser.уровень ?? 0, 
        next: (currentUser.уровень ?? 0) + 1, 
        teamProgress: 0, 
        revenueProgress: 0, 
        requirements: null,
        currentTeam: 0,
        currentRevenue: 0,
      };
    }
    
    const currentLevel = currentUser.уровень ?? 0;
    const nextLevel = currentLevel + 1;
    
    // Требования для уровней (пример)
    const requirements: Record<number, { team: number; revenue: number }> = {
      1: { team: 5, revenue: 100000 },
      2: { team: 15, revenue: 500000 },
      3: { team: 50, revenue: 2000000 },
    };
    
    if (nextLevel > 3) {
      return { current: 3, next: 3, teamProgress: 100, revenueProgress: 100, requirements: null, currentTeam: team.length, currentRevenue: 0 };
    }
    
    const req = requirements[nextLevel];
    
    // Защита от undefined (если нет требований для уровня)
    if (!req) {
      return { 
        current: currentLevel, 
        next: nextLevel, 
        teamProgress: 0, 
        revenueProgress: 0, 
        requirements: null, 
        currentTeam: team.length, 
        currentRevenue: 0 
      };
    }
    
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.партнерId === currentUser.id || team.some(m => m.id === order.партнерId)) {
        return sum + (order.итого || 0);
      }
      return sum;
    }, 0);
    
    return {
      current: currentLevel,
      next: nextLevel,
      teamProgress: Math.min(100, (team.length / req.team) * 100),
      revenueProgress: Math.min(100, (totalRevenue / req.revenue) * 100),
      requirements: req,
      currentTeam: team.length,
      currentRevenue: totalRevenue,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39B7FF] mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  const monthlyIncome = getMonthlyIncome();
  const lastMonthIncome = getLastMonthIncome();
  const incomeChange = lastMonthIncome > 0 
    ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100 
    : monthlyIncome > 0 ? 100 : 0;
  
  const incomeChartData = getIncomeChartData();
  const teamGrowthData = getTeamGrowthData();
  const topProducts = getTopProducts();
  const ringsData = getActivityRingsData();
  const levelProgress = getLevelProgress();
  const activeOrders = getActiveOrders();
  const newPartnersThisWeek = getNewPartnersThisWeek();

  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-6 md:mb-8"
      >
        <h1 className="text-[#1E1E1E] mb-2" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '700' }}>
          🏠 Дашборд
        </h1>
        <p className="text-[#666] text-sm md:text-base">
          Добро пожаловать, {currentUser.имя}! Вот ваша статистика
        </p>
      </motion.div>

      {/* Activity Rings - Hero Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="border-[#E6E9EE] rounded-2xl md:rounded-3xl shadow-lg bg-gradient-to-br from-white to-blue-50 mb-6 md:mb-8">
          <CardContent className="p-4 md:p-8">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-[#39B7FF]" />
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Кольца активности</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              {/* Blue Ring - Income */}
              <div className="flex flex-col items-center">
                <ActivityRing
                  radius={50}
                  stroke={10}
                  progress={ringsData.income.progress}
                  color="#39B7FF"
                  label="Доход"
                  value={`${Math.floor(ringsData.income.value / 1000)}K`}
                />
                <div className="mt-2 md:mt-4 text-center">
                  <div className="text-xs md:text-sm text-gray-600">
                    Цель: {(ringsData.income.goal / 1000).toLocaleString('ru-RU')}K₽
                  </div>
                </div>
              </div>

              {/* Green Ring - Team */}
              <div className="flex flex-col items-center">
                <ActivityRing
                  radius={50}
                  stroke={10}
                  progress={ringsData.team.progress}
                  color="#12C9B6"
                  label="Команда"
                  value={ringsData.team.value}
                />
                <div className="mt-2 md:mt-4 text-center">
                  <div className="text-xs md:text-sm text-gray-600">
                    Цель: {ringsData.team.goal}
                  </div>
                </div>
              </div>

              {/* Red Ring - Activity */}
              <div className="flex flex-col items-center">
                <ActivityRing
                  radius={50}
                  stroke={10}
                  progress={ringsData.activity.progress}
                  color="#EF4444"
                  label="Активных"
                  value={ringsData.activity.value}
                />
                <div className="mt-2 md:mt-4 text-center">
                  <div className="text-xs md:text-sm text-gray-600">
                    За неделю
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 md:mt-8 p-3 md:p-4 bg-blue-50 rounded-xl md:rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-800 text-sm md:text-base">
                <Zap className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="font-semibold">
                  {ringsData.income.progress >= 100 && ringsData.team.progress >= 100 && ringsData.activity.progress >= 80
                    ? '🔥 Все кольца закрыты! Отличная работа!'
                    : 'Продолжайте работу, чтобы закрыть все кольца!'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics - 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Monthly Income */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-50 rounded-xl">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                {incomeChange !== 0 && (
                  <Badge className={`${incomeChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-0`}>
                    {incomeChange > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(incomeChange).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                <AnimatedCounter value={monthlyIncome} suffix="₽" />
              </div>
              <div className="text-sm text-gray-600">Доход за месяц</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Size */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                {newPartnersThisWeek > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    +{newPartnersThisWeek} за неделю
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                <AnimatedCounter value={team.length} />
              </div>
              <div className="text-sm text-gray-600">Партнёров в команде</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-xl">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                <AnimatedCounter value={currentUser.баланс || 0} suffix="₽" />
              </div>
              <div className="text-sm text-gray-600 mb-3">Доступно к выводу</div>
              <Button 
                size="sm" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => setShowWithdrawModal(true)}
                disabled={(currentUser?.баланс || 0) <= 0}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Вывести
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-50 rounded-xl">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                <AnimatedCounter value={activeOrders} />
              </div>
              <div className="text-sm text-gray-600 mb-3">Активных заказов</div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate?.('заказы')}
              >
                Посмотреть
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts in Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="mb-6 md:mb-8"
      >
        <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-white">
          <CardContent className="p-4 md:p-6">
            <Tabs defaultValue="income" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="income">Динамика дохода</TabsTrigger>
                <TabsTrigger value="team">Рост команды</TabsTrigger>
                <TabsTrigger value="products">Топ товары</TabsTrigger>
              </TabsList>
              
              {/* Income Chart */}
              <TabsContent value="income">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Динамика дохода (6 месяцев)
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={incomeChartData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#12C9B6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#12C9B6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                      formatter={(value: any) => [`${value.toLocaleString('ru-RU')}₽`, 'Доход']}
                    />
                    <Area
                      type="monotone"
                      dataKey="доход"
                      stroke="#12C9B6"
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      strokeWidth={2}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                {incomeChartData.every(d => d.доход === 0) && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <Zap size={16} className="text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                      Доход будет отображаться после совершения первых заказов
                    </p>
                  </div>
                )}
              </TabsContent>
              
              {/* Team Growth Chart */}
              <TabsContent value="team">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Рост команды (6 месяцев)
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                      formatter={(value: any) => [value, 'Партнёров']}
                    />
                    <Bar
                      dataKey="партнеров"
                      fill="#39B7FF"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              
              {/* Top Products Chart */}
              <TabsContent value="products">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Топ товары по продажам
                  </h3>
                </div>
                {topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" stroke="#6B7280" style={{ fontSize: '12px' }} />
                      <YAxis type="category" dataKey="название" stroke="#6B7280" style={{ fontSize: '12px' }} width={120} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        formatter={(value: any) => [`${value.toLocaleString('ru-RU')}₽`, 'Выручка']}
                      />
                      <Bar
                        dataKey="выручка"
                        fill="#F59E0B"
                        radius={[0, 8, 8, 0]}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
                    <Package className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-2">Пока нет данных о продажах</p>
                    <p className="text-sm text-gray-400">Создайте первый заказ, чтобы увидеть статистику</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Heatmap & Level Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        {/* Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-white h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <CalendarIcon className="w-5 h-5 text-purple-500" />
                Календарь активности
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityHeatmap orders={orders.filter(o => o.партнерId === currentUser.id)} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Level Progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-gradient-to-br from-white to-amber-50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Crown className="w-5 h-5 text-amber-500" />
                Прогресс к следующему уровню
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800">Уровень {levelProgress.current}</div>
                  <div className="text-sm text-gray-600 mt-1">Текущий</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-amber-500 rounded-full"></div>
                  <Rocket className="w-6 h-6 text-amber-500" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">Уровень {levelProgress.next}</div>
                  <div className="text-sm text-gray-600 mt-1">Следующий</div>
                </div>
              </div>

              {levelProgress.requirements ? (
                <div className="space-y-4">
                  {/* Team Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Партнёров
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {levelProgress.currentTeam} / {levelProgress.requirements.team}
                      </span>
                    </div>
                    <Progress value={levelProgress.teamProgress} className="h-2" />
                  </div>

                  {/* Revenue Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Оборот
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {Math.floor(levelProgress.currentRevenue / 1000)}K / {levelProgress.requirements.revenue / 1000}K₽
                      </span>
                    </div>
                    <Progress value={levelProgress.revenueProgress} className="h-2" />
                  </div>

                  <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-start gap-2 text-amber-800 text-sm">
                      <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold mb-1">Осталось совсем немного!</div>
                        <div className="text-xs">
                          Достигните целей, чтобы получить доступ к более высоким комиссиям
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Star className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-lg font-bold text-gray-800 mb-2">Максимальный уровень!</p>
                  <p className="text-sm text-gray-600">Вы достигли наивысшего уровня партнёра</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity Timeline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }}
        className="mb-6 md:mb-8"
      >
        <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Clock className="w-5 h-5 text-gray-600" />
              Недавняя активность
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 ${item.bg} rounded-lg`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                      <p className="text-sm text-gray-600 truncate">{item.description}</p>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {item.time.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Пока нет активности</p>
                <p className="text-sm text-gray-400">Начните работу, чтобы увидеть недавние события</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.1 }}
      >
        <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Быстрые действия</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                className="bg-white text-[#39B7FF] hover:bg-gray-50 h-auto py-4 px-6 justify-start"
                onClick={() => onNavigate?.('структура')}
              >
                <Share2 className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-bold">Пригласить партнёра</div>
                  <div className="text-xs opacity-80">Поделиться реф. ссылкой</div>
                </div>
              </Button>

              <Button
                className="bg-white text-[#12C9B6] hover:bg-gray-50 h-auto py-4 px-6 justify-start"
                onClick={() => onNavigate?.('каталог')}
              >
                <Plus className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-bold">Создать заказ</div>
                  <div className="text-xs opacity-80">Оформить новый заказ</div>
                </div>
              </Button>

              <Button
                className="bg-white text-purple-600 hover:bg-gray-50 h-auto py-4 px-6 justify-start"
                onClick={() => onNavigate?.('обучение')}
              >
                <Gift className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-bold">Материалы</div>
                  <div className="text-xs opacity-80">Обучение и презентации</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* 💸 Модальное окно вывода средств */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Вывод средств
            </DialogTitle>
            <DialogDescription>
              Доступно к выводу: <span className="font-bold text-purple-600">{(currentUser?.баланс || 0).toLocaleString()}₽</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Сумма вывода (₽)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Введите сумму"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                max={currentUser?.баланс || 0}
                min={1}
              />
              {withdrawAmount && Number(withdrawAmount) > (currentUser?.баланс || 0) && (
                <p className="text-xs text-red-500">Сумма превышает доступный баланс</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="withdraw-details">Реквизиты для перевода</Label>
              <Textarea
                id="withdraw-details"
                placeholder="Номер карты или банковские реквизиты&#10;Например: 4276 **** **** 1234 (Сбербанк)"
                value={withdrawDetails}
                onChange={(e) => setWithdrawDetails(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⏳ Заявка будет рассмотрена администратором в течение 1-3 рабочих дней. 
                Средства будут заблокированы до обработки заявки.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowWithdrawModal(false)}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (currentUser?.баланс || 0) || !withdrawDetails.trim()}
            >
              {withdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                'Отправить заявку'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
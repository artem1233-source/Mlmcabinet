import { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, TrendingUp, Award, Loader2, Share2, Copy, CheckCircle2, Network, BarChart3, Trophy, ChevronDown, ChevronRight, Minimize2, Maximize2, Phone, MessageCircle, Send, Star, Target, Zap, Crown, Rocket, Activity, Calendar as CalendarIcon, Clock, Flame, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserProfileView } from './UserProfileView';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../utils/api';
import { toast } from 'sonner';

interface StructureDataVizProps {
  currentUser: any;
  refreshTrigger: number;
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
const ActivityHeatmap = ({ team }: { team: any[] }) => {
  const weeks = 12; // Последние 12 недель
  const days = 7;
  
  const getActivityForDate = (date: Date) => {
    const dayActivity = team.filter(member => {
      if (!member.последнийВход) return false;
      const lastActive = new Date(member.последнийВход);
      return lastActive.toDateString() === date.toDateString();
    }).length;
    
    if (dayActivity === 0) return 'bg-gray-100';
    if (dayActivity <= 2) return 'bg-green-200';
    if (dayActivity <= 5) return 'bg-green-400';
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
        <span>Активность команды за последние {weeks} недель</span>
      </div>
      <div className="flex gap-1">
        {calendar.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <TooltipProvider key={dayIndex}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-3 h-3 rounded-sm ${day.activity} cursor-pointer hover:ring-2 hover:ring-gray-400 transition-all`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{day.date.toLocaleDateString('ru-RU')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Меньше</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-gray-100 rounded-sm" />
          <div className="w-3 h-3 bg-green-200 rounded-sm" />
          <div className="w-3 h-3 bg-green-400 rounded-sm" />
          <div className="w-3 h-3 bg-green-600 rounded-sm" />
        </div>
        <span>Больше</span>
      </div>
    </div>
  );
};

// Компонент Timeline истории роста
const GrowthTimeline = ({ team }: { team: any[] }) => {
  const milestones = [
    { count: 1, label: 'Первый партнер', icon: '🎯', achieved: team.length >= 1 },
    { count: 5, label: '5 партнеров', icon: '⭐', achieved: team.length >= 5 },
    { count: 10, label: '10 партнеров', icon: '🏆', achieved: team.length >= 10 },
    { count: 25, label: '25 партнеров', icon: '👑', achieved: team.length >= 25 },
    { count: 50, label: '50 партнеров', icon: '🚀', achieved: team.length >= 50 },
  ];

  return (
    <div className="relative">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-400 to-blue-600" />
      <div className="space-y-6">
        {milestones.map((milestone, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-4"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl z-10 ${
              milestone.achieved 
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg ring-4 ring-blue-200' 
                : 'bg-gray-200'
            }`}>
              {milestone.icon}
            </div>
            <div className={`flex-1 ${milestone.achieved ? 'opacity-100' : 'opacity-50'}`}>
              <div className="font-semibold text-gray-800">{milestone.label}</div>
              <div className="text-sm text-gray-500">{milestone.count} партнеров</div>
            </div>
            {milestone.achieved && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
              >
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export function StructureDataViz({ currentUser, refreshTrigger }: StructureDataVizProps) {
  const [team, setTeam] = useState<any[]>([]);
  const [sponsor, setSponsor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'tree' | 'top'>('cards');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([1, 2, 3]));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [viewHeight, setViewHeight] = useState<'10' | '15' | '20'>('15');
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveUserId = currentUser?.id;

  // Вычисление высоты контейнера на основе выбранного количества линий
  const getContainerHeight = () => {
    const heights = {
      '10': 'h-[800px]',
      '15': 'h-[1100px]',
      '20': 'h-[1400px]'
    };
    return heights[viewHeight];
  };

  useEffect(() => {
    if (viewMode === 'tree' && expandedNodes.size === 0 && team.length > 0) {
      const firstLevelIds = team
        .filter(m => m.пригласительКод === currentUser.рефКод)
        .map(m => m.id);
      setExpandedNodes(new Set(firstLevelIds));
    }
  }, [viewMode, team, currentUser.рефКод]);

  // Сброс скролла контейнера при смене режима для предотвращения прыжков
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [viewMode]);

  useEffect(() => {
    loadTeam();
    loadSponsor();
  }, [refreshTrigger, effectiveUserId]);

  const loadTeam = async () => {
    if (!effectiveUserId) return;
    
    setLoading(true);
    try {
      const data = await api.getUserTeam(effectiveUserId);
      
      if (data.success && data.team) {
        const filteredTeam = data.team.filter((m: any) => m.id !== effectiveUserId);
        console.log('📊 FULL TEAM:', filteredTeam.map((m: any) => ({ id: m.id, имя: m.имя, рефКод: m.рефКод, глубина: m.глубина, пригласительКод: m.пригласительКод })));
        setTeam(filteredTeam);
        
        if (viewMode === 'tree' && filteredTeam.length > 0) {
          const firstLevelMembers = filteredTeam.filter((m: any) => m.пригласительКод === currentUser.рефКод);
          const firstLevelIds = firstLevelMembers.map((m: any) => m.id);
          setExpandedNodes(new Set(firstLevelIds));
        }
      } else {
        setTeam([]);
      }
    } catch (error) {
      console.error('Failed to load team:', error);
      toast.error('Не удалось загрузить структуру команды');
    } finally {
      setLoading(false);
    }
  };

  const loadSponsor = async () => {
    if (!currentUser?.спонсорId) return;
    
    try {
      const response = await api.getUser(currentUser.спонсорId);
      if (response.success && response.user) {
        setSponsor(response.user);
      }
    } catch (error) {
      console.error('Failed to load sponsor:', error);
    }
  };

  const getActivityStatus = (lastActive: string | null) => {
    if (!lastActive) return { color: 'bg-gray-400', label: 'Неизвестно', dot: '⚪' };
    
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffHours = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return { color: 'bg-green-500', label: 'Онлайн', dot: '🟢' };
    if (diffHours < 24) return { color: 'bg-yellow-500', label: 'Сегодня', dot: '🟡' };
    if (diffHours < 168) return { color: 'bg-orange-500', label: 'На этой неделе', dot: '🟠' };
    return { color: 'bg-gray-400', label: 'Неактивен', dot: '⚪' };
  };

  // Генерация данных для графика роста команды
  const getTeamGrowthData = () => {
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
        доход: Math.floor(count * 15000 * (0.8 + Math.random() * 0.4)) // Примерный доход
      });
    }
    
    return months;
  };

  // Расчет метрик для колец активности
  const getActivityRingsData = () => {
    const totalPartners = team.length;
    const totalIncome = team.reduce((sum, m) => sum + (m.баланс || 0), 0);
    const activeLastWeek = team.filter(m => {
      if (!m.последнийВход) return false;
      const diff = (new Date().getTime() - new Date(m.последнийВход).getTime()) / (1000 * 60 * 60);
      return diff < 168;
    }).length;

    return {
      partners: { value: totalPartners, progress: Math.min(100, (totalPartners / 50) * 100), goal: 50 },
      income: { value: totalIncome, progress: Math.min(100, (totalIncome / 1000000) * 100), goal: 1000000 },
      activity: { value: activeLastWeek, progress: totalPartners > 0 ? (activeLastWeek / totalPartners) * 100 : 0, goal: totalPartners }
    };
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 2:
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 3:
        return 'bg-amber-50 text-amber-600 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAvatarColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-gradient-to-br from-blue-200 to-blue-300';
      case 2:
        return 'bg-gradient-to-br from-rose-200 to-rose-300';
      case 3:
        return 'bg-gradient-to-br from-amber-200 to-amber-300';
      default:
        return 'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]';
    }
  };

  const getAvatarTextColor = (level: number) => {
    switch (level) {
      case 1:
        return 'text-blue-700';
      case 2:
        return 'text-rose-700';
      case 3:
        return 'text-amber-700';
      default:
        return 'text-white';
    }
  };

  const handleCopyReferralLink = async () => {
    try {
      const link = `${window.location.origin}?ref=${currentUser.рефКод}`;
      
      // Попытка использовать современный Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(link);
          setCopiedLink(true);
          toast.success('Реферальная ссылка скопирована!');
          setTimeout(() => setCopiedLink(false), 2000);
          return;
        } catch (clipboardError) {
          console.log('Clipboard API недоступен, используем fallback метод');
        }
      }
      
      // Fallback метод для iframe и ограниченных контекстов
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopiedLink(true);
        toast.success('Реферальная ссылка скопирована!');
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        throw new Error('execCommand failed');
      }
    } catch (error) {
      console.error('Ошибка при копировании:', error);
      toast.error('Не удалось скопировать ссылку');
    }
  };

  const handleShare = () => {
    const link = `${window.location.origin}?ref=${currentUser.рефКод}`;
    const defaultText = `Присоединяйтесь к H₂ Partner Platform!\n\nПриглашаю вас стать партнером по продаже водородного порошка H₂-Touch.\n\nРеферальная ссылка: ${link}`;
    
    setInviteMessage(defaultText);
    setShowInviteDialog(true);
  };

  const handleSendInvite = () => {
    if (navigator.share) {
      navigator.share({
        title: 'H₂ Partner Platform',
        text: inviteMessage,
      }).catch(() => {
        navigator.clipboard.writeText(inviteMessage);
        toast.success('Сообщение скопировано в буфер обмена!');
      });
    } else {
      navigator.clipboard.writeText(inviteMessage);
      toast.success('Сообщение скопировано в буфер обмена!');
    }
    setShowInviteDialog(false);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = team.map(m => m.id);
    setExpandedNodes(new Set(allIds));
    toast.success('Все узлы развернуты');
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
    toast.success('Все узлы свернуты');
  };

  const expandAllLines = () => {
    const allLines = Array.from(new Set(team.map(m => m.глубина))).filter(line => line);
    setExpandedLines(new Set(allLines));
    toast.success('Все линии развернуты');
  };

  const collapseAllLines = () => {
    setExpandedLines(new Set());
    toast.success('Все линии свернуты');
  };

  const buildTree = (parentRefCode: string, depth = 0): any[] => {
    const children = team.filter(member => member.пригласительКод === parentRefCode);
    
    return children.map(member => ({
      ...member,
      children: buildTree(member.рефКод, depth + 1),
      depth
    }));
  };

  const renderTreeNode = (node: any) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const activityStatus = getActivityStatus(node.последнийВход || null);
    const showPhone = node.privacySettings?.showPhone !== false;
    const showTelegram = node.privacySettings?.showTelegram !== false;
    const showWhatsapp = node.privacySettings?.showWhatsapp !== false;

    return (
      <div
        key={node.id}
        className="ml-0"
      >
        <div className="flex items-center gap-2 p-3 bg-white rounded-xl mb-2 hover:shadow-md transition-all duration-200 group relative border border-gray-100">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`absolute top-2 left-2 w-2.5 h-2.5 ${activityStatus.color} rounded-full animate-pulse`} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{activityStatus.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors ml-3"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-[#666]" />
              ) : (
                <ChevronRight size={16} className="text-[#666]" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6 ml-3" />}
          
          <div 
            onClick={() => setSelectedUserId(node.id)}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <div className={`w-10 h-10 ${getAvatarColor(node.глубина || 1)} rounded-lg flex items-center justify-center ${getAvatarTextColor(node.глубина || 1)} flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
              <span style={{ fontWeight: '700', fontSize: '14px' }}>
                {node.имя.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[#1E1E1E] truncate group-hover:text-[#39B7FF] transition-colors" style={{ fontWeight: '600', fontSize: '14px' }}>
                  {node.имя} {node.фамилия}
                </span>
                <Badge className={`${getLevelColor(node.глубина || 1)} border text-xs`}>
                  Уровень {node.глубина || 1}
                </Badge>
              </div>
              <div className="text-[#666]" style={{ fontSize: '12px' }}>
                {node.рефКод} • {(node.баланс || 0).toLocaleString('ru-RU')}₽
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {showTelegram && node.telegram && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`https://t.me/${node.telegram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Send size={16} className="text-[#0088cc]" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Telegram</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {showWhatsapp && node.whatsapp && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`https://wa.me/${node.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <MessageCircle size={16} className="text-[#25D366]" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>WhatsApp</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {showPhone && node.телефон && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`tel:${node.телефон}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <Phone size={16} className="text-[#8B5CF6]" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Позвонить</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {hasChildren && (
            <Badge variant="outline" className="text-xs">
              {node.children.length} чел.
            </Badge>
          )}
        </div>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait">
            {hasChildren && isExpanded && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ originY: 0, willChange: 'transform', transform: 'translateZ(0)' }}
                className="ml-8 border-l-2 border-gray-200 pl-4 mt-2"
              >
                {node.children.map((child: any) => renderTreeNode(child))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const getTopPartners = () => {
    return [...team]
      .sort((a, b) => (b.баланс || 0) - (a.баланс || 0))
      .slice(0, 10);
  };

  const toggleLine = (line: number) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(line)) {
      newExpanded.delete(line);
    } else {
      newExpanded.add(line);
    }
    setExpandedLines(newExpanded);
  };

  // Функция для получения всех потомков партнера
  const getDescendants = (partnerId: string): string[] => {
    const partner = team.find(m => m.id === partnerId);
    if (!partner) return [];
    
    const descendants: string[] = [];
    const queue = [partner.рефКод];
    
    while (queue.length > 0) {
      const refCode = queue.shift()!;
      const children = team.filter(m => m.пригласительКод === refCode);
      children.forEach(child => {
        descendants.push(child.id);
        queue.push(child.рефКод);
      });
    }
    
    return descendants;
  };

  // Функция для получения всех вышестоящих (спонсоров) партнера
  const getAncestors = (partnerId: string): string[] => {
    const partner = team.find(m => m.id === partnerId);
    if (!partner) return [];
    
    const ancestors: string[] = [];
    let currentInviteCode = partner.пригласительКод;
    
    while (currentInviteCode) {
      const sponsor = team.find(m => m.рефКод === currentInviteCode);
      if (sponsor) {
        ancestors.push(sponsor.id);
        currentInviteCode = sponsor.пригласительКод;
      } else {
        break;
      }
    }
    
    return ancestors;
  };

  // Получить всех связанных партнеров для выбранных (предки + только потомки отмеченных)
  const getRelatedPartners = (): string[] => {
    if (selectedPartnerIds.length === 0) return [];
    
    const relatedIds = new Set<string>();
    const ancestorIds = new Set<string>(); // Предки - только для показа цепочки вверх
    
    selectedPartnerIds.forEach(partnerId => {
      const partner = team.find(m => m.id === partnerId);
      if (!partner) return;
      
      // Добавляем самого партнера
      relatedIds.add(partnerId);
      
      // Добавляем всех вышестоящих (предков) - только для показа, но не для расширения
      const ancestors = getAncestors(partnerId);
      ancestors.forEach(id => {
        relatedIds.add(id);
        ancestorIds.add(id); // Запоминаем, что это предок
      });
    });
    
    // ВАЖНО: Для следующих линий добавляем ТОЛЬКО потомков ОТМЕЧЕННЫХ партнеров
    // Предки НЕ должны раскрывать своих детей, если они сами не отмечены!
    const maxDepth = Math.max(...team.map(m => m.глубина || 1));
    
    for (let depth = 1; depth <= maxDepth; depth++) {
      const partnersOnCurrentLine = team.filter(m => m.глубина === depth);
      
      partnersOnCurrentLine.forEach(partner => {
        // Добавляем детей ТОЛЬКО если партнер:
        // 1) В списке relatedIds (то есть уже показывается)
        // 2) И либо ОТМЕЧЕН пользователем, либо был добавлен как ребенок другого отмеченного
        // 3) НО НЕ является просто предком (добавлен только для показа цепочки вверх)
        const isSelected = selectedPartnerIds.includes(partner.id);
        const isAncestorOnly = ancestorIds.has(partner.id) && !isSelected;
        
        if (relatedIds.has(partner.id) && !isAncestorOnly) {
          const directChildren = team.filter(m => m.пригласительКод === partner.рефКод);
          directChildren.forEach(child => {
            relatedIds.add(child.id);
            // Дети не являются "только предками", они могут дальше расширяться
          });
        }
      });
    }
    
    return Array.from(relatedIds);
  };

  const getPartnersByLine = () => {
    const byLine: Record<number, any[]> = {};
    team.forEach(member => {
      const line = member.глубина || 1;
      if (!byLine[line]) byLine[line] = [];
      byLine[line].push(member);
    });
    return byLine;
  };

  // Получить всех партнеров под выбранными
  const getPartnersUnderSelected = () => {
    if (selectedPartnerIds.length === 0) return [];
    
    const allDescendants: string[] = [];
    selectedPartnerIds.forEach(partnerId => {
      const descendants = getDescendants(partnerId);
      descendants.forEach(id => {
        if (!allDescendants.includes(id)) {
          allDescendants.push(id);
        }
      });
    });
    
    return team.filter(m => allDescendants.includes(m.id));
  };

  const renderPartnerCard = (member: any, index: number) => {
    const activityStatus = getActivityStatus(member.последнийВход || null);
    const showPhone = member.privacySettings?.showPhone !== false;
    const showTelegram = member.privacySettings?.showTelegram !== false;
    const showWhatsapp = member.privacySettings?.showWhatsapp !== false;
    
    // Найти спонсора
    const sponsor = team.find(m => m.рефКод === member.пригласительКод) || 
                    (member.пригласительКод === currentUser.рефКод ? currentUser : null);
    
    // Посчитать детей (прямых рефералов)
    const childrenCount = team.filter(m => m.пригласительКод === member.рефКод).length;
    
    const lineGradients = {
      1: 'from-blue-400 to-blue-600',
      2: 'from-rose-400 to-rose-600',
      3: 'from-amber-400 to-amber-600',
    };

    return (
      <motion.div
        key={member.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={() => {
          console.log('🖱️ CLICK on partner:', {
            id: member.id,
            имя: member.имя,
            рефКод: member.рефКод,
            глубина: member.глубина,
            пригласительКод: member.пригласительКод
          });
          if (selectedPartnerIds.includes(member.id)) {
            console.log('➖ Removing from selection');
            setSelectedPartnerIds(selectedPartnerIds.filter(id => id !== member.id));
          } else {
            console.log('➕ Adding to selection');
            setSelectedPartnerIds([...selectedPartnerIds, member.id]);
          }
        }}
        className="group cursor-pointer"
      >
        <Card className={`border transition-all duration-200 overflow-hidden ${
          selectedPartnerIds.includes(member.id) 
            ? 'border-[#39B7FF] bg-blue-50 shadow-md ring-2 ring-[#39B7FF]/20' 
            : 'border-gray-200/60 hover:border-[#39B7FF]/30 hover:shadow-sm bg-white'
        }`}>
          <CardContent className="!p-0">
            <div className="flex items-center gap-2.5 p-2.5">
              {/* Avatar with status - mini */}
              <div className="relative flex-shrink-0">
                <div className={`w-9 h-9 ${getAvatarColor(member.глубина || 1)} rounded-lg flex items-center justify-center ${getAvatarTextColor(member.глубина || 1)} font-bold text-sm`}>
                  {member.имя.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${activityStatus.color} rounded-full border border-white`} />
              </div>

              {/* Info - ultra compact, vertically centered */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-gray-800 truncate group-hover:text-[#39B7FF] transition-colors text-xs leading-none">
                    {member.имя} {member.фамилия}
                  </h3>
                  <div className={`w-1 h-1 rounded-full ${lineGradients[member.глубина as keyof typeof lineGradients] ? 'bg-gradient-to-r ' + lineGradients[member.глубина as keyof typeof lineGradients] : 'bg-gray-400'}`} />
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-gray-500 leading-none mt-1">
                  <code className="text-xs bg-gray-50 px-1 py-0 rounded font-mono">
                    {member.рефКод}
                  </code>
                  <span>•</span>
                  <span className="font-semibold text-gray-700">
                    {(member.баланс || 0).toLocaleString('ru-RU')}₽
                  </span>
                  {sponsor && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-gray-400">
                        <UserPlus size={9} className="text-[#39B7FF]" />
                        <span className="text-xs">{sponsor.имя}</span>
                      </span>
                    </>
                  )}
                  {childrenCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-gray-400">
                        <Users size={9} className="text-[#12C9B6]" />
                        <span className="text-xs">{childrenCount}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Actions - always visible */}
              <div className="flex items-center gap-0.5">
                {/* View Profile Button - prominent */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUserId(member.id);
                  }}
                  className="p-1.5 bg-[#39B7FF]/10 hover:bg-[#39B7FF]/20 rounded-lg transition-colors"
                  title="Открыть профиль"
                >
                  <Eye size={14} className="text-[#39B7FF]" />
                </button>
                
                {/* Contact icons - on hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {showTelegram && member.telegram && (
                    <a
                      href={`https://t.me/${member.telegram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Send size={11} className="text-[#0088cc]" />
                    </a>
                  )}
                  {showWhatsapp && member.whatsapp && (
                    <a
                      href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-green-50 rounded transition-colors"
                    >
                      <MessageCircle size={11} className="text-[#25D366]" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
            <p className="text-[#666]">Загрузка аналитики...</p>
          </div>
        </div>
      </div>
    );
  }

  const teamByLine = team.reduce((acc, member) => {
    const line = member.глубина || 1;
    acc[line] = (acc[line] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const growthData = getTeamGrowthData();
  const ringsData = getActivityRingsData();

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
          📈 Аналитика команды
        </h1>
        <p className="text-[#666] text-sm md:text-base">Визуализация роста и активности вашей структуры</p>
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
              {/* Blue Ring - Partners */}
              <div className="flex flex-col items-center">
                <ActivityRing
                  radius={50}
                  stroke={10}
                  progress={ringsData.partners.progress}
                  color="#39B7FF"
                  label="Партнеров"
                  value={ringsData.partners.value}
                />
                <div className="mt-2 md:mt-4 text-center">
                  <div className="text-xs md:text-sm text-gray-600">
                    Цель: {ringsData.partners.goal}
                  </div>
                </div>
              </div>

              {/* Green Ring - Income */}
              <div className="flex flex-col items-center">
                <ActivityRing
                  radius={50}
                  stroke={10}
                  progress={ringsData.income.progress}
                  color="#12C9B6"
                  label="Доход"
                  value={`${Math.floor(ringsData.income.value / 1000)}K`}
                />
                <div className="mt-2 md:mt-4 text-center">
                  <div className="text-xs md:text-sm text-gray-600">
                    Цель: {(ringsData.income.goal / 1000).toLocaleString('ru-RU')}K₽
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
                <Flame className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="font-semibold">
                  {ringsData.partners.progress >= 100 && ringsData.income.progress >= 100 && ringsData.activity.progress >= 80
                    ? '🔥 Все кольца закрыты! Отличная работа!'
                    : 'Продолжайте работу, чтобы закрыть все кольца!'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Growth Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-white h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Рост команды (6 месяцев)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39B7FF" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#39B7FF" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="партнеров"
                    stroke="#39B7FF"
                    strokeWidth={3}
                    fill="url(#colorGrowth)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Income Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-white h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Динамика дохода
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Bar
                    dataKey="доход"
                    fill="#12C9B6"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Timeline and Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Growth Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Target className="w-5 h-5 text-purple-500" />
                Путь к успеху
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GrowthTimeline team={team} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <CalendarIcon className="w-5 h-5 text-green-500" />
                Карта активности
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityHeatmap team={team} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, value: team.length, label: 'Всего партнеров', color: 'bg-blue-500', gradient: 'from-blue-400 to-blue-600' },
            { icon: TrendingUp, value: teamByLine[1] || 0, label: '1-я линия', color: 'bg-purple-500', gradient: 'from-purple-400 to-purple-600' },
            { icon: TrendingUp, value: teamByLine[2] || 0, label: '2-я линия', color: 'bg-pink-500', gradient: 'from-pink-400 to-pink-600' },
            { icon: TrendingUp, value: teamByLine[3] || 0, label: '3-я линия', color: 'bg-amber-500', gradient: 'from-amber-400 to-amber-600' }
          ].map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
            >
              <Card className="border-[#E6E9EE] rounded-2xl shadow-lg bg-white hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 bg-gradient-to-br ${metric.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                    <metric.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-[#1E1E1E] mb-2" style={{ fontSize: '36px', fontWeight: '700' }}>
                    <AnimatedCounter value={metric.value} />
                  </div>
                  <div className="text-[#666] font-medium">{metric.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Referral Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-[#E6E9EE] rounded-2xl shadow-lg bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg mb-1">
                    Пригласите партнеров
                  </h3>
                  <p className="opacity-90 text-sm">
                    Ваш реферальный код: <code className="bg-white/20 px-2 py-1 rounded font-mono font-bold ml-1">{currentUser.рефКод}</code>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Button
                  onClick={handleShare}
                  className="bg-white text-[#39B7FF] hover:bg-white/90 font-semibold shadow-md"
                  size="sm"
                >
                  <Share2 size={16} className="mr-2" />
                  Поделиться
                </Button>
                <Button
                  onClick={handleCopyReferralLink}
                  className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 font-semibold border border-white/40 shadow-md"
                  size="sm"
                >
                  {copiedLink ? (
                    <CheckCircle2 size={16} className="mr-2" />
                  ) : (
                    <Copy size={16} className="mr-2" />
                  )}
                  {copiedLink ? 'Скопировано!' : 'Копировать'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team Members */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-[#E6E9EE] rounded-3xl shadow-lg bg-white">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-[#1E1E1E]">Партнеры</CardTitle>
              <div className="flex items-center gap-4">
                <div className={`flex gap-2 ${viewMode === 'tree' && team.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAll}
                    className="text-xs"
                  >
                    <Maximize2 size={14} className="mr-1" />
                    Развернуть узлы
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="text-xs"
                  >
                    <Minimize2 size={14} className="mr-1" />
                    Свернуть узлы
                  </Button>
                </div>
                <div className={`flex gap-2 ${viewMode === 'cards' && team.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAllLines}
                    className="text-xs"
                  >
                    <Maximize2 size={14} className="mr-1" />
                    Развернуть линии
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAllLines}
                    className="text-xs"
                  >
                    <Minimize2 size={14} className="mr-1" />
                    Свернуть линии
                  </Button>
                </div>
                <Select value={viewHeight} onValueChange={(value: '10' | '15' | '20') => setViewHeight(value)}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <Eye size={14} />
                        <span className="text-xs">{viewHeight} линий</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 линий</SelectItem>
                    <SelectItem value="15">15 линий</SelectItem>
                    <SelectItem value="20">20 линий</SelectItem>
                  </SelectContent>
                </Select>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                  <TabsList className="grid grid-cols-4 w-auto">
                    <TabsTrigger value="cards" className="px-3">
                      <Users size={16} />
                    </TabsTrigger>
                    <TabsTrigger value="list" className="px-3">
                      <BarChart3 size={16} />
                    </TabsTrigger>
                    <TabsTrigger value="tree" className="px-3">
                      <Network size={16} />
                    </TabsTrigger>
                    <TabsTrigger value="top" className="px-3">
                      <Trophy size={16} />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-[#1E1E1E] mb-3 font-bold text-xl">
                  Пока нет партнеров
                </h3>
                <p className="text-[#666] mb-8">
                  Пригласите первого партнера, используя вашу реферальную ссылку
                </p>
                <Button
                  onClick={handleShare}
                  className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white font-semibold"
                  size="lg"
                >
                  <UserPlus size={20} className="mr-2" />
                  Пригласить партнера
                </Button>
              </div>
            ) : (
              <>
                {/* Selection indicator */}
                {false && selectedPartnerIds.length > 0 && (
                  <div className={`mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl transition-opacity duration-200 ${viewMode === 'cards' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden mb-0'}`}>
                    <Target size={16} className="text-[#39B7FF]" />
                    <span className="text-sm text-gray-700 flex-1">
                      Выбрано партнеров: <span className="font-semibold">{selectedPartnerIds.length}</span>
                      {selectedPartnerIds.length === 1 && (
                        <span> - {team.find(m => m.id === selectedPartnerIds[0])?.имя} {team.find(m => m.id === selectedPartnerIds[0])?.фамилия}</span>
                      )}
                    </span>
                    <Button
                      onClick={() => setSelectedPartnerIds([])}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 hover:bg-blue-100"
                    >
                      <X size={14} className="mr-1" />
                      Снять отметку
                    </Button>
                  </div>
                )}
                
                <div ref={containerRef} className={`${getContainerHeight()} overflow-auto transition-opacity duration-200`} style={{ contain: 'layout', willChange: 'transform', transform: 'translateZ(0)' }}>
                  {viewMode === 'cards' && (
                    <div className="space-y-6">
                      {Object.entries(getPartnersByLine())
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([line, members]) => {
                        const lineNum = Number(line);
                        const isExpanded = expandedLines.has(lineNum);
                        
                        // Фильтруем партнеров если есть выбранные
                        const relatedPartnerIds = getRelatedPartners();
                        console.log('Selected IDs:', selectedPartnerIds);
                        console.log('Related IDs:', relatedPartnerIds);
                        console.log('Line:', line, 'All members:', members.map(m => m.id));
                        const filteredMembers = relatedPartnerIds.length > 0 
                          ? members.filter(m => relatedPartnerIds.includes(m.id))
                          : members;
                        console.log('Line:', line, 'Filtered members:', filteredMembers.map(m => m.id));
                        
                        // Если после фильтрации не осталось партнеров, скрываем линию
                        if (filteredMembers.length === 0) return null;
                        
                        // Проверяем, есть ли на этой линии выбранный партнер
                        const hasSelectedPartner = filteredMembers.some(m => selectedPartnerIds.includes(m.id));
                        
                        const lineColors = {
                          1: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-400 to-blue-600' },
                          2: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', gradient: 'from-rose-400 to-rose-600' },
                          3: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-400 to-amber-600' },
                        };
                        const colors = lineColors[lineNum as keyof typeof lineColors] || lineColors[1];

                        return (
                          <div
                            key={line}
                            className="mb-2.5"
                            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
                          >
                            {/* Line Header - slim */}
                            <div className={`w-full flex items-center justify-between p-2.5 rounded-xl ${colors.bg} border ${colors.border} mb-2.5`}>
                              <button
                                onClick={() => toggleLine(lineNum)}
                                className="flex-1 flex items-center justify-between hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 bg-gradient-to-br ${colors.gradient} rounded-lg flex items-center justify-center text-white shadow-sm`}>
                                    <span className="text-sm font-bold">{line}</span>
                                  </div>
                                  <div>
                                    <h3 className={`font-semibold ${colors.text} text-sm`}>
                                      {lineNum}-я линия
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      {filteredMembers.length} {filteredMembers.length === 1 ? 'партнер' : filteredMembers.length < 5 ? 'партнера' : 'партнеров'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right hidden sm:block">
                                    <div className="font-semibold text-gray-800 text-sm">
                                      {members.reduce((sum, m) => sum + (m.баланс || 0), 0).toLocaleString('ru-RU')}₽
                                    </div>
                                  </div>
                                  <ChevronDown
                                    className={`w-4 h-4 ${colors.text} transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                                  />
                                </div>
                              </button>
                              
                              {/* Кнопка снятия отметки */}
                              {selectedPartnerIds.length > 0 && (lineNum === 1 || hasSelectedPartner) && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPartnerIds([]);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 ml-2 hover:bg-white/50"
                                >
                                  <X size={14} className="mr-1" />
                                  {lineNum === 1 ? 'Снять все' : 'Снять отметку'}
                                </Button>
                              )}
                            </div>

                            {/* Cards Grid - compact */}
                            <div className="overflow-hidden">
                              <AnimatePresence mode="wait">
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, scaleY: 0 }}
                                    animate={{ opacity: 1, scaleY: 1 }}
                                    exit={{ opacity: 0, scaleY: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    style={{ originY: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5"
                                  >
                                    {filteredMembers.map((member, index) => renderPartnerCard(member, index))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                  {/* Партнеры под выбранными */}
                  {viewMode === 'cards' && selectedPartnerIds.length > 0 && getPartnersUnderSelected().length > 0 && (
                    <div className="mt-6 mb-4">
                      <div className="mb-4">
                        <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Users size={16} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-purple-700 text-sm">
                              Партнеры под выбранными
                            </h3>
                            <p className="text-xs text-gray-500">
                              {getPartnersUnderSelected().length} {getPartnersUnderSelected().length === 1 ? 'партнер' : getPartnersUnderSelected().length < 5 ? 'партнера' : 'партнеров'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {getPartnersUnderSelected().map((member, index) => renderPartnerCard(member, index))}
                      </div>
                    </div>
                  )}

                  {viewMode === 'tree' && (
                    <div className="mt-6 mb-4">
                      <div className="mb-4">
                        <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Users size={16} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-purple-700 text-sm">
                              Партнеры под выбранными
                            </h3>
                            <p className="text-xs text-gray-500">
                              {getPartnersUnderSelected().length} {getPartnersUnderSelected().length === 1 ? 'партнер' : getPartnersUnderSelected().length < 5 ? 'партнера' : 'партнеров'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {getPartnersUnderSelected().map((member, index) => renderPartnerCard(member, index))}
                      </div>
                    </div>
                  )}

                  {viewMode === 'tree' && (
                    <div className="space-y-2">
                      {buildTree(currentUser.рефКод).map((node) => renderTreeNode(node))}
                    </div>
                  )}

                  {viewMode === 'list' && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-4 text-[#666] font-semibold">Партнер</th>
                          <th className="text-left p-4 text-[#666] font-semibold">Уровень</th>
                          <th className="text-left p-4 text-[#666] font-semibold">Код</th>
                          <th className="text-right p-4 text-[#666] font-semibold">Баланс</th>
                          <th className="text-left p-4 text-[#666] font-semibold">Активность</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.map((member, index) => {
                          const activityStatus = getActivityStatus(member.последнийВход || null);
                          return (
                            <tr
                              key={member.id}
                              className="border-b border-gray-100 hover:bg-[#F7FAFC] transition-colors cursor-pointer"
                              onClick={() => setSelectedUserId(member.id)}
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className={`w-10 h-10 ${getAvatarColor(member.глубина || 1)} rounded-lg flex items-center justify-center ${getAvatarTextColor(member.глубина || 1)} shadow-sm`}>
                                      <span className="font-bold text-sm">
                                        {member.имя.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className={`absolute -top-1 -right-1 w-3 h-3 ${activityStatus.color} rounded-full border-2 border-white animate-pulse`} />
                                  </div>
                                  <span className="text-[#1E1E1E] font-semibold">
                                    {member.имя} {member.фамилия}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge className={`${getLevelColor(member.глубина || 1)} border`}>
                                  Уровень {member.глубина || 1}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <code className="text-[#666] bg-gray-100 px-3 py-1 rounded-lg text-xs">
                                  {member.рефКод}
                                </code>
                              </td>
                              <td className="p-4 text-right">
                                <span className="text-[#1E1E1E] font-bold">
                                  {(member.баланс || 0).toLocaleString('ru-RU')}₽
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm text-[#666]">
                                  {activityStatus.dot} {activityStatus.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      </table>
                    </div>
                  )}

                  {viewMode === 'top' && (
                    <div className="space-y-4">
                      {getTopPartners().map((member, index) => {
                      const activityStatus = getActivityStatus(member.последнийВход || null);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-4 p-5 bg-[#F7FAFC] rounded-2xl hover:shadow-md transition-all cursor-pointer"
                          onClick={() => setSelectedUserId(member.id)}
                        >
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                            'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]'
                          }`}>
                            {index + 1}
                          </div>

                          <div className="relative">
                            <div className={`w-12 h-12 ${getAvatarColor(member.глубина || 1)} rounded-lg flex items-center justify-center ${getAvatarTextColor(member.глубина || 1)} shadow-sm`}>
                              <span className="font-bold">
                                {member.имя.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 ${activityStatus.color} rounded-full border-2 border-white`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[#1E1E1E] font-bold truncate">
                                {member.имя} {member.фамилия}
                              </p>
                              <Badge className={`${getLevelColor(member.глубина || 1)} border text-xs`}>
                                Уровень {member.глубина || 1}
                              </Badge>
                            </div>
                            <div className="text-[#666] text-sm">
                              {member.рефКод} • {activityStatus.dot} {activityStatus.label}
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="text-[#1E1E1E] font-bold text-xl mb-1">
                              {(member.баланс || 0).toLocaleString('ru-RU')}₽
                            </div>
                            <div className="flex items-center justify-end gap-1 text-[#12C9B6] text-sm">
                              <TrendingUp size={14} />
                              <span className="font-semibold">ТОП-{index + 1}</span>
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileView
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Отправить приглашение</DialogTitle>
            <DialogDescription>
              Редактируйте и отправьте сообщение с реферальной ссылкой
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="message">Сообщение</Label>
            <Textarea
              id="message"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="h-40"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleSendInvite} className="bg-[#39B7FF] hover:bg-[#2A9FE8]">
                <Share2 size={16} className="mr-2" />
                Отправить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
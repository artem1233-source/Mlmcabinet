import { UserCog, UserPlus, TrendingUp, UserCheck, UserX, ShoppingCart, UserMinus, Wallet } from 'lucide-react';

interface Stats {
  totalUsers: number;
  newToday: number;
  newThisMonth: number;
  activePartners: number;
  passivePartners: number;
  activeUsers: number;
  passiveUsers: number;
  totalBalance: number;
}

interface StatsWidgetsProps {
  stats: Stats;
  activeFilter: string;
  onFilterClick: (filter: string) => void;
}

export function StatsWidgets({ stats, activeFilter, onFilterClick }: StatsWidgetsProps) {
  const widgets = [
    {
      id: 'all',
      label: 'Всего',
      value: stats.totalUsers,
      icon: UserCog,
      gradient: 'from-[#39B7FF] to-[#12C9B6]',
    },
    {
      id: 'newToday',
      label: 'Новые сегодня',
      value: stats.newToday,
      icon: UserPlus,
      gradient: 'from-green-400 to-emerald-500',
      prefix: '+',
    },
    {
      id: 'activePartners',
      label: 'Активные партнёры',
      value: stats.activePartners,
      icon: UserCheck,
      gradient: 'from-orange-400 to-amber-500',
    },
    {
      id: 'activeUsers',
      label: 'Активные по покупкам',
      value: stats.activeUsers,
      icon: ShoppingCart,
      gradient: 'from-purple-400 to-violet-500',
    },
    {
      id: 'totalBalance',
      label: 'Общий баланс',
      value: stats.totalBalance,
      icon: Wallet,
      gradient: 'from-emerald-400 to-green-500',
      prefix: '₽',
      isCurrency: true,
    },
    {
      id: 'newThisMonth',
      label: 'Новые за месяц',
      value: stats.newThisMonth,
      icon: TrendingUp,
      gradient: 'from-blue-400 to-cyan-500',
      prefix: '+',
    },
    {
      id: 'passivePartners',
      label: 'Пассивные партнёры',
      value: stats.passivePartners,
      icon: UserX,
      gradient: 'from-gray-400 to-slate-500',
    },
    {
      id: 'passiveUsers',
      label: 'Пассивные по покупкам',
      value: stats.passiveUsers,
      icon: UserMinus,
      gradient: 'from-red-400 to-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {widgets.map((widget) => {
        const Icon = widget.icon;
        const isActive = activeFilter === widget.id;
        const isClickable = widget.id !== 'totalBalance'; // Баланс не кликабельный
        
        return (
          <button
            key={widget.id}
            onClick={() => isClickable && onFilterClick(widget.id)}
            disabled={!isClickable}
            className={`
              bg-white rounded-lg p-3 border transition-all duration-200
              ${isActive 
                ? 'border-[#39B7FF] shadow-lg ring-2 ring-[#39B7FF]/30 scale-[1.02]' 
                : 'border-[#E6E9EE] shadow-sm'
              }
              ${isClickable ? 'hover:shadow-md hover:border-[#39B7FF]/40 cursor-pointer' : 'cursor-default'}
            `}
          >
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 bg-gradient-to-br ${widget.gradient} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] text-[#666] mb-1 truncate leading-tight">{widget.label}</p>
                <p className="text-xl font-bold text-[#1E1E1E] leading-none">
                  {widget.isCurrency && widget.prefix}
                  {widget.value.toLocaleString('ru-RU')}
                  {!widget.isCurrency && widget.prefix ? ` ${widget.prefix}` : ''}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
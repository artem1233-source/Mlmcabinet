import { LayoutDashboard, Users, ShoppingBag, Wallet, Package, GraduationCap, UserCircle, Settings, Droplet, TrendingUp, Bell, Shield, Trophy, Sparkles, Crown } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';

interface SidebarProps {
  текущаяВкладка: string;
  изменитьВкладку: (tab: string) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  currentUser?: any;
}

export function SidebarRu({ текущаяВкладка, изменитьВкладку, mobileMenuOpen, setMobileMenuOpen, currentUser }: SidebarProps) {
  const isAdmin = currentUser?.isAdmin || false;
  const isCEO = currentUser?.type === 'admin' && currentUser?.role === 'ceo';
  
  const navItems = [
    // 🆕 "Дашборд" только для обычных пользователей (у CEO есть Mission Control)
    ...(!isAdmin ? [{ id: 'дашборд', label: 'Дашборд', icon: LayoutDashboard }] : []),
    // 👑 Mission Control (только для CEO)
    ...(isCEO ? [{ id: 'mission-control', label: 'Mission Control', icon: Crown }] : []),
    // 🆕 Админ видит "Пользователи", обычные партнёры - "Структура"
    ...(isAdmin 
      ? [{ id: 'пользователи', label: 'Пользователи', icon: Users }] 
      : [{ id: 'структура', label: 'Структура', icon: Users }]
    ),
    { id: 'заказы', label: 'Заказы', icon: ShoppingBag },
    // 💰 Админ видит "Финансы", обычные партнёры - "Доходы" и "Баланс"
    ...(isAdmin 
      ? [{ id: 'финансы', label: 'Финансы', icon: Wallet }]
      : [
          { id: 'доходы', label: 'Доходы', icon: TrendingUp },
          { id: 'баланс', label: 'Баланс', icon: Wallet }
        ]
    ),
    { id: 'каталог', label: 'Каталог', icon: Package },
    { id: 'маркетинг', label: 'Маркетинг', icon: Sparkles },
    { id: 'обучение', label: 'Обучение', icon: GraduationCap },
    { id: 'достижения', label: 'Достижения', icon: Trophy },
    { id: 'уведомления', label: 'Уведомления', icon: Bell },
    { id: 'профиль', label: 'Профиль', icon: UserCircle },
    { id: 'настройки', label: 'Настройки', icon: Settings },
    // 🆕 Админ-панель (только для админов)
    ...(isAdmin ? [{ id: 'админ', label: 'Админ-панель', icon: Shield }] : []),
    // 👑 Управление админами (только для CEO)
    ...(isCEO ? [{ id: 'управление-админами', label: 'Управление админами', icon: Shield }] : []),
  ];

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-[#E6E9EE]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
            <Droplet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[#39B7FF]" style={{ fontSize: '16px', fontWeight: '700' }}>
              H₂ Платформа
            </h1>
            <p className="text-[#666]" style={{ fontSize: '11px' }}>Партнёрская</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = текущаяВкладка === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => изменитьВкладку(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                isActive
                  ? 'bg-[#39B7FF] text-white shadow-lg shadow-[#39B7FF]/30'
                  : 'text-[#666] hover:bg-gray-50'
              }`}
              style={{ fontWeight: isActive ? '600' : '500' }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex min-h-screen bg-white border-r border-[#E6E9EE] flex-col" style={{ width: '220px' }}>
        {sidebarContent}
      </div>
      
      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <SheetTitle className="sr-only">Меню навигации</SheetTitle>
          <SheetDescription className="sr-only">
            Навигационное меню для доступа ко всем разделам приложения
          </SheetDescription>
          <div className="flex flex-col h-full bg-white">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
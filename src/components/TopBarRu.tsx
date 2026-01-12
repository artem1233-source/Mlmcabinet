import { Bell, Wallet, Droplet, Menu, ShoppingCart, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { NotificationBell } from './NotificationBell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Switch } from './ui/switch';
import { useRole, getRoleLabel, RoleType } from '../contexts/RoleContext';

interface TopBarProps {
  имяПользователя: string;
  балансПользователя: number;
  cartItemsCount?: number;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  onBalanceClick?: () => void;
  onNotificationsClick?: () => void;
  onLogoClick?: () => void;
  onCartClick?: () => void;
}

export function TopBarRu({ имяПользователя, балансПользователя, cartItemsCount = 0, onMenuClick, onProfileClick, onBalanceClick, onNotificationsClick, onLogoClick, onCartClick }: TopBarProps) {
  const initials = имяПользователя.split(' ').map(n => n[0]).join('').toUpperCase();
  const { currentRole, setCurrentRole, inspectionMode, setInspectionMode } = useRole();
  
  console.log('SMOKE_TEST_ROLE_SWITCH_v7', { file: '/components/TopBarRu.tsx', currentRole });
  
  const roles: Array<{ value: RoleType; label: string }> = [
    { value: 'owner', label: getRoleLabel('owner') },
    { value: 'adminops', label: getRoleLabel('adminops') },
    { value: 'finance', label: getRoleLabel('finance') },
    { value: 'warehouse', label: getRoleLabel('warehouse') },
    { value: 'marketing', label: getRoleLabel('marketing') },
    { value: 'support', label: getRoleLabel('support') },
    { value: 'partner', label: getRoleLabel('partner') },
  ];
  
  return (
    <div className="fixed top-0 left-0 lg:left-[220px] right-0 z-50 h-16 lg:h-20 bg-white border-b border-[#E6E9EE] flex items-center justify-between px-4 lg:px-8 shadow-sm" style={{ boxSizing: 'border-box' }}>
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-50 rounded-xl transition-all"
        >
          <Menu size={24} className="text-[#666]" />
        </button>
        
        <button 
          onClick={onLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
            <Droplet size={20} className="text-white lg:w-6 lg:h-6" />
          </div>
          <div className="hidden md:block text-left">
            <h2 className="text-[#1E1E1E] flex items-center gap-2" style={{ fontSize: '18px', fontWeight: '700' }}>
              Партнёрская платформа H₂
              {/* Временный debug-текст для визуальной проверки переключения режима */}
              <span className="text-xs text-[#666] font-normal">mode: {currentRole}</span>
            </h2>
            <p className="text-[#666]">
              Личный кабинет партнёра
            </p>
          </div>
        </button>
      </div>
      
      <div className="flex items-center gap-2 lg:gap-6">
        {/* Dropdown "Режим" */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-[#F7FAFC] rounded-xl hover:bg-[#E6E9EE] transition-all cursor-pointer">
              <div className="hidden sm:block text-left">
                <div className="text-[#666]" style={{ fontSize: '11px' }}>Режим</div>
                <div className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '13px' }}>{getRoleLabel(currentRole)}</div>
              </div>
              <ChevronDown size={16} className="text-[#666]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Выбор роли</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {roles.map((role) => (
              <DropdownMenuItem
                key={role.value}
                onClick={() => setCurrentRole(role.value)}
                className={currentRole === role.value ? 'bg-[#F7FAFC]' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{role.label}</span>
                  {currentRole === role.value && (
                    <div className="w-2 h-2 bg-[#39B7FF] rounded-full" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            
            {/* Инспекция доступов только для Owner */}
            {currentRole === 'owner' && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Инспекция доступов</div>
                    <Switch
                      checked={inspectionMode}
                      onCheckedChange={setInspectionMode}
                    />
                  </div>
                  <p className="text-xs text-[#666] mt-1">
                    Показать все пункты меню с пометкой недоступных
                  </p>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <button 
          onClick={onBalanceClick}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-[#F7FAFC] rounded-xl hover:bg-[#E6E9EE] transition-all cursor-pointer"
        >
          <Wallet size={16} className="text-[#39B7FF] lg:w-[18px] lg:h-[18px]" />
          <div>
            <div className="text-[#666]" style={{ fontSize: '11px' }}>Баланс</div>
            <div className="text-[#1E1E1E]" style={{ fontWeight: '700', fontSize: '13px' }}>₽{балансПользователя.toLocaleString()}</div>
          </div>
        </button>
        
        <button 
          onClick={onCartClick}
          className="flex relative p-2 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
        >
          <ShoppingCart size={18} className="text-[#666] lg:w-5 lg:h-5" />
          {cartItemsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-full flex items-center justify-center text-[10px] font-bold px-1">
              {cartItemsCount > 99 ? '99+' : cartItemsCount}
            </span>
          )}
        </button>
        
        <NotificationBell onViewAll={onNotificationsClick} />
        
        <button 
          onClick={onProfileClick}
          className="hover:opacity-80 transition-all cursor-pointer"
        >
          <Avatar className="w-9 h-9 lg:w-10 lg:h-10">
            <AvatarFallback className="bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] text-white" style={{ fontWeight: '700' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </div>
  );
}
import { Home, Users, ShoppingCart, DollarSign, Package, TrendingUp, MessageCircle, Settings, BarChart3, UserCheck, Lock, Beaker } from 'lucide-react';
import { Role } from '../../types';
import { Section } from '../../utils/roleAccess';
import { tokens } from '../../tokens';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';

interface AdminSidebarProps {
  currentRole: Role;
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  showAccessInspection?: boolean;
}

export function AdminSidebar({ currentRole, activeSection, onSectionChange, showAccessInspection = false }: AdminSidebarProps) {
  const getAllSections = () => {
    return [
      { id: 'dashboard' as Section, label: 'Центр управления', icon: Home, roles: ['SEO'] },
      { id: 'admin' as Section, label: 'Администрирование', icon: Users, roles: ['SEO', 'AdminOps'] },
      { id: 'finance' as Section, label: 'Финансы', icon: DollarSign, roles: ['SEO', 'Finance'] },
      { id: 'warehouse' as Section, label: 'Склад', icon: Package, roles: ['SEO', 'Warehouse'] },
      { id: 'marketing' as Section, label: 'Маркетинг', icon: TrendingUp, roles: ['SEO', 'Marketing'] },
      { id: 'support' as Section, label: 'Поддержка', icon: MessageCircle, roles: ['SEO', 'Support'] },
      { id: 'partner' as Section, label: 'Партнёр', icon: UserCheck, roles: ['SEO', 'Partner'] },
      { id: 'orders' as Section, label: 'Заказы', icon: ShoppingCart, roles: ['SEO', 'Finance', 'Warehouse', 'Support', 'Partner'] },
      { id: 'analytics' as Section, label: 'Аналитика', icon: BarChart3, roles: ['SEO', 'Finance', 'Marketing'] },
      { id: 'testing' as Section, label: 'Тестирование', icon: Beaker, roles: ['SEO'] }, // Новый раздел
    ];
  };

  const allSections = getAllSections();
  
  // Фильтруем разделы в зависимости от режима инспекции
  const visibleSections = showAccessInspection 
    ? allSections 
    : allSections.filter(section => section.roles.includes(currentRole));

  return (
    <div className="w-64 bg-white border-r border-[#E6E9EE] h-screen sticky top-0 flex flex-col">
      {/* Logo - выровнено по высоте с AdminTopbar через tokens.layout.headerHeight */}
      <div 
        className="px-6 border-b border-[#E6E9EE] flex items-center"
        style={{ height: tokens.layout.headerHeight }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">H2</span>
          </div>
          <div>
            <h2 className="font-bold text-[#1E1E1E] leading-tight">H₂ Платформа</h2>
            <p className="text-xs text-[#666] leading-tight">Партнёрская</p>
          </div>
        </div>
      </div>

      {/* Баннер режима инспекции */}
      {showAccessInspection && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-900">Режим инспекции</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Показаны все разделы. Заблокированные недоступны для текущей роли.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <TooltipProvider>
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const hasAccess = section.roles.includes(currentRole);
              const isLocked = showAccessInspection && !hasAccess;
              
              const button = (
                <button
                  key={section.id}
                  onClick={() => hasAccess ? onSectionChange(section.id) : null}
                  disabled={isLocked}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                    isActive
                      ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white shadow-md'
                      : isLocked
                      ? 'text-[#999] bg-gray-50 opacity-60 cursor-not-allowed'
                      : 'text-[#666] hover:bg-[#F7FAFC] hover:text-[#1E1E1E]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium flex-1 text-left">{section.label}</span>
                  {isLocked && (
                    <Lock className="w-4 h-4 text-red-400" />
                  )}
                </button>
              );

              // Если элемент заблокирован, оборачиваем в Tooltip
              if (isLocked) {
                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      {button}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-gray-900 text-white">
                      <p>Недоступно для роли {currentRole}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}
          </div>
        </nav>
      </TooltipProvider>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-[#E6E9EE]">
        <button
          onClick={() => onSectionChange('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            activeSection === 'settings'
              ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white shadow-md'
              : 'text-[#666] hover:bg-[#F7FAFC] hover:text-[#1E1E1E]'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Настройки</span>
        </button>
      </div>
    </div>
  );
}
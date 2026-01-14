import { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Download, Settings, ChevronDown } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { PeriodSelector } from '../ui/PeriodSelector';
import { GlobalSearch } from '../ui/GlobalSearch';
import { Role, Period, ROLE_CONFIGS } from '../../types';
import { Switch } from '../../../components/ui/switch';
import { toast } from 'sonner';
import type { SearchResult } from '../../utils/searchUtils';
import { ModuleTabs } from '../ui/ModuleTabs';
import type { Section } from '../../utils/roleAccess';
import { tokens } from '../../tokens';

/**
 * Debug UI flag - set to true to show debug information in the UI
 * When false, "debug: mode=..." text is hidden from production
 */
const DEBUG_UI = false; // 🎨 Выключен для clean production UI

interface AdminTopbarProps {
  currentRole: Role;
  title: string;
  period: Period;
  onPeriodChange: (period: Period) => void;
  onRoleChange: (role: Role) => void;
  onRefresh: () => void;
  onExport: () => void;
  onSettings?: () => void;
  canSwitchRoles: boolean;
  showAccessInspection?: boolean;
  onAccessInspectionChange?: (show: boolean) => void;
  searchData?: { // Новый проп для данных поиска
    users?: any[];
    orders?: any[];
    payouts?: any[];
    products?: any[];
  };
  activeSection: Section; // Добавляем для ModuleTabs
  onSectionChange: (section: Section) => void; // Добавляем для ModuleTabs
}

export function AdminTopbar({
  currentRole,
  title,
  period,
  onPeriodChange,
  onRoleChange,
  onRefresh,
  onExport,
  onSettings,
  canSwitchRoles,
  showAccessInspection = false,
  onAccessInspectionChange,
  searchData,
  activeSection,
  onSectionChange
}: AdminTopbarProps) {
  const [searchScope, setSearchScope] = useState<'users' | 'orders' | 'payouts' | 'products'>('orders');
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const searchScopes = [
    { value: 'users', label: 'Пользователи' },
    { value: 'orders', label: 'Заказы' },
    { value: 'payouts', label: 'Выплаты' },
    { value: 'products', label: 'Товары' }
  ];

  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white border-b border-[#E6E9EE] sticky top-0 z-40">
      {/* Main Topbar - выровнено по высоте с AdminSidebar через tokens.layout.headerHeight */}
      <div 
        className="px-6 flex items-center"
        style={{ height: tokens.layout.headerHeight }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap w-full">
          {/* Left: Title */}
          <div>
            <h1 className="text-xl font-bold text-[#1E1E1E] flex items-center gap-2">
              {title}
              {/* Debug-текст для визуальной проверки режима */}
              {DEBUG_UI && (
                <span className="text-xs text-[#666] font-normal">
                  debug: mode={currentRole} | inspection={showAccessInspection ? 'on' : 'off'}
                </span>
              )}
            </h1>
            <p className="text-sm text-[#999] mt-0.5">
              {ROLE_CONFIGS[currentRole].name}
            </p>
          </div>

          {/* Center: Period Selector */}
          <div className="flex-1 flex justify-center max-w-md">
            <PeriodSelector value={period} onChange={onPeriodChange} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <Input
                placeholder={`Поиск по ${searchScopes.find(s => s.value === searchScope)?.label.toLowerCase()}...`}
                className="pl-10 pr-32 w-80 border-[#E6E9EE] rounded-xl h-9"
              />
              <select
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value as any)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#666] bg-transparent border-none outline-none cursor-pointer"
              >
                {searchScopes.map(scope => (
                  <option key={scope.value} value={scope.value}>{scope.label}</option>
                ))}
              </select>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 h-9">
              <RefreshCw className="w-4 h-4" />
              Обновить
            </Button>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={onExport} className="gap-2 h-9">
              <Download className="w-4 h-4" />
              CSV
            </Button>

            {/* Настройки (только для Владельца) */}
            {canSwitchRoles && onSettings && (
              <Button variant="outline" size="sm" onClick={onSettings} className="gap-2 h-9">
                <Settings className="w-4 h-4" />
              </Button>
            )}

            {/* Переключатель ролей (только для Владельца) */}
            {canSwitchRoles && (
              <div className="relative" ref={roleMenuRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="gap-2 min-w-[180px] justify-between bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 h-9"
                >
                  <span className="flex items-center gap-2">
                    <span>{ROLE_CONFIGS[currentRole].icon}</span>
                    <span className="font-semibold">{ROLE_CONFIGS[currentRole].name}</span>
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {showRoleMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E6E9EE] rounded-xl shadow-xl p-2 z-50">
                    {/* Заголовок */}
                    <div className="px-3 py-2 border-b border-[#E6E9EE]">
                      <p className="text-xs font-semibold text-[#666]">ВЫБОР РОЛИ</p>
                    </div>
                    
                    {/* Список ролей */}
                    {Object.values(ROLE_CONFIGS).map((role) => (
                      <button
                        key={role.id}
                        onClick={() => {
                          onRoleChange(role.id);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#F7FAFC] transition-colors flex items-center gap-3 ${
                          currentRole === role.id ? 'bg-[#39B7FF]/10' : ''
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${role.color}20` }}
                        >
                          {role.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[#1E1E1E]">{role.name}</p>
                          <p className="text-xs text-[#666]">{role.description}</p>
                        </div>
                        {currentRole === role.id && (
                          <div className="w-2 h-2 bg-[#39B7FF] rounded-full" />
                        )}
                      </button>
                    ))}

                    {/* Разделитель */}
                    <div className="border-t border-[#E6E9EE] my-2" />

                    {/* Инспекция доступов */}
                    <div className="px-3 py-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-[#1E1E1E] text-sm mb-1 flex items-center gap-2">
                            🔍 Инспекция доступов
                            {DEBUG_UI && (
                              <span className="text-xs font-mono text-amber-600">
                                {showAccessInspection ? 'ON' : 'OFF'}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[#666] leading-tight">
                            {showAccessInspection 
                              ? 'Показаны все элементы, недоступные заблокированы ' 
                              : 'Скрыты недоступные элементы для роли'
                            }
                          </p>
                        </div>
                        <Switch
                          checked={showAccessInspection}
                          onCheckedChange={onAccessInspectionChange}
                          disabled={false}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Module Tabs */}
      <ModuleTabs 
        currentRole={currentRole}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        inspectionEnabled={showAccessInspection}
      />
    </div>
  );
}
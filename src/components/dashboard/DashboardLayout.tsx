import { ReactNode, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Download as DownloadIcon, Crown, Users, Wallet, Package, TrendingUp, Headphones } from 'lucide-react';

/**
 * Debug UI flag - set to true to show debug information in the UI
 * When false, all debug text (MODULE_TABS_RENDERED, mode/module info) is hidden from production
 */
const DEBUG_UI = false;

export type DashboardMode =
  | 'ceo'
  | 'admin'
  | 'finance'
  | 'warehouse'
  | 'seo'
  | 'support'
  | 'partner'; // 🆕 Режим для обычных партнёров

interface DashboardLayoutProps {
  mode: DashboardMode;
  onModeChange?: (mode: DashboardMode) => void;
  availableModes?: DashboardMode[];
  children: ReactNode;
  period?: string;
  onPeriodChange?: (period: string) => void;
  onExport?: () => void; // Export handler
  showExport?: boolean;
  currentUser?: any; // Для определения прав доступа
  // 🆕 Для управления activeModule в CEO режиме
  activeModule?: DashboardMode;
  onActiveModuleChange?: (module: DashboardMode) => void;
}

const MODES_CONFIG = {
  ceo: { label: 'Центр управления', icon: Crown, color: '#8B5CF6' },
  admin: { label: 'Администрирование', icon: Users, color: '#39B7FF' },
  finance: { label: 'Финансы', icon: Wallet, color: '#10B981' },
  warehouse: { label: 'Склад', icon: Package, color: '#F59E0B' },
  seo: { label: 'SEO / Маркетинг', icon: TrendingUp, color: '#EC4899' },
  support: { label: 'Поддержка', icon: Headphones, color: '#6366F1' },
  partner: { label: 'Партнёр', icon: Users, color: '#39B7FF' }, // 🆕 Конфигурация для партнёров
};

const PERIOD_OPTIONS = [
  { value: '1', label: 'Сегодня' },
  { value: '7', label: '7 дней' },
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
  { value: '365', label: 'Год' },
];

export function DashboardLayout({
  mode,
  onModeChange,
  availableModes,
  children,
  period = '30',
  onPeriodChange,
  onExport,
  showExport = true,
  currentUser,
  activeModule: externalActiveModule,
  onActiveModuleChange,
}: DashboardLayoutProps) {
  // 🆕 Состояние для инспекции доступов (только для CEO)
  const [inspectionMode, setInspectionMode] = useState(false);
  
  // 🆕 Локальное состояние для activeModule (если не управляется извне)
  const [internalActiveModule, setInternalActiveModule] = useState<DashboardMode>('ceo');
  
  // Используем внешний activeModule или внутренний
  const activeModule = externalActiveModule ?? internalActiveModule;
  
  // 🆕 URL Sync: При старте читаем ?module= из URL (только для CEO режима)
  useEffect(() => {
    if (mode !== 'ceo') return;
    
    const params = new URLSearchParams(window.location.search);
    const moduleFromUrl = params.get('module') as DashboardMode | null;
    
    // Валидные модули
    const validModules: DashboardMode[] = ['ceo', 'admin', 'finance', 'warehouse', 'seo', 'support', 'partner'];
    
    if (moduleFromUrl && validModules.includes(moduleFromUrl)) {
      console.log('🔗 Loading module from URL:', moduleFromUrl);
      if (onActiveModuleChange) {
        onActiveModuleChange(moduleFromUrl);
      } else {
        setInternalActiveModule(moduleFromUrl);
      }
    }
  }, []); // Запускаем только при монтировании
  
  // Обработчик изменения activeModule
  const handleActiveModuleChange = (newModule: DashboardMode) => {
    // 🆕 URL Sync: Обновляем URL при изменении модуля (только для CEO режима)
    if (mode === 'ceo') {
      const params = new URLSearchParams(window.location.search);
      params.set('module', newModule);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
      console.log('🔗 Updated URL:', newUrl);
    }
    
    if (onActiveModuleChange) {
      onActiveModuleChange(newModule);
    } else {
      setInternalActiveModule(newModule);
    }
  };

  // Определяем доступные режимы на основе роли пользователя
  const getAvailableModes = (): DashboardMode[] => {
    if (availableModes) return availableModes;

    // CEO/Owner видит ВСЕ режимы (multiple ways to identify CEO)
    if (
      currentUser?.id === 'ceo' || 
      currentUser?.role === 'ceo' ||
      (currentUser?.type === 'admin' && currentUser?.role === 'ceo')
    ) {
      return ['ceo', 'admin', 'finance', 'warehouse', 'seo', 'support', 'partner'];
    }

    // Каждая роль видит только свой режим
    if (currentUser?.role === 'admin') {
      return ['admin'];
    }

    if (currentUser?.role === 'finance') {
      return ['finance'];
    }

    if (currentUser?.role === 'warehouse') {
      return ['warehouse'];
    }

    if (currentUser?.role === 'seo') {
      return ['seo'];
    }

    if (currentUser?.role === 'support') {
      return ['support'];
    }

    // Обычные партнёры
    return ['partner'];
  };

  const visibleModes = getAvailableModes();
  const currentModeConfig = MODES_CONFIG[mode];
  const Icon = currentModeConfig.icon;

  // Если только один режим доступен, не показываем переключатель
  const showModeSwitcher = visibleModes.length > 1 && onModeChange;
  
  // "Инспекция доступов" показываем только в режиме CEO
  const isCeoMode = mode === 'ceo';

  // 🔹 PATCH v1: Показываем верхние вкладки модулей только для CEO
  const currentMode = mode;

  return (
    <div className="min-h-screen bg-[#F7FAFC] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 pt-4 pb-px sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto">
          {/* Top Row: Title + Actions */}
          <div className="flex items-center justify-between mb-4">
            {/* Title with Icon */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${currentModeConfig.color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: currentModeConfig.color }} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#1E1E1E]">
                  {currentModeConfig.label}
                </h1>
                {/* Debug: показываем текущий ржм */}
                {DEBUG_UI && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    debug: mode=<span className="font-mono font-semibold">{mode}</span>
                    {mode === 'ceo' && (
                      <>, module=<span className="font-mono font-semibold">{activeModule}</span></>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* 🆕 Инспекция доступов (только для CEO) */}
              {isCeoMode && (
                <Button
                  variant={inspectionMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInspectionMode(!inspectionMode)}
                  className="h-9"
                  style={inspectionMode ? { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' } : {}}
                >
                  {inspectionMode ? '🔒 нспекция включена' : '🔓 Инспекция доступов'}
                </Button>
              )}

              {/* Period Selector */}
              {onPeriodChange && (
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {PERIOD_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={period === option.value ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onPeriodChange(option.value)}
                      className="h-7 text-xs"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Export */}
              {onExport && showExport && (
                <Button variant="outline" size="sm" onClick={onExport} className="h-9">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
              )}
            </div>
          </div>

          {/* 🆕 MODULE TABS - Показываем только для CEO (V2) */}
          {mode === 'ceo' && (
            <div className="mb-4">
              {/* Debug маркер */}
              {DEBUG_UI && (
                <p className="text-xs font-mono text-gray-400 mb-2">MODULE_TABS_RENDERED_V2</p>
              )}
              
              {/* Модульные вкладки (pills) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button 
                  onClick={() => handleActiveModuleChange('ceo')}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeModule === 'ceo'
                      ? 'bg-[#8B5CF6] text-white'
                      : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Центр управления
                </button>
                <button 
                  onClick={() => handleActiveModuleChange('admin')}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeModule === 'admin'
                      ? 'bg-[#39B7FF] text-white'
                      : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Администрирование
                </button>
                <button 
                  onClick={() => handleActiveModuleChange('finance')}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeModule === 'finance'
                      ? 'bg-[#10B981] text-white'
                      : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Финансы
                </button>
                <button 
                  onClick={() => handleActiveModuleChange('warehouse')}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeModule === 'warehouse'
                      ? 'bg-[#F59E0B] text-white'
                      : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Склад
                </button>
                <button 
                  onClick={() => handleActiveModuleChange('seo')}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeModule === 'seo'
                      ? 'bg-[#EC4899] text-white'
                      : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  SEO / Маретинг
                </button>
                <button 
                  onClick={() => handleActiveModuleChange('support')}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeModule === 'support'
                      ? 'bg-[#6366F1] text-white'
                      : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Пддержка
                </button>
                <button 
                  onClick={() => handleActiveModuleChange('partner')}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeModule === 'partner'
                      ? 'bg-[#39B7FF] text-white'
                      : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Партнёр
                </button>
              </div>
            </div>
          )}

          {/* Mode Switcher (если доступно больше одного режима) */}
          {/* Показываем верхние вкладки модулей ТОЛЬКО для CEO */}
          {showModeSwitcher && currentMode === 'ceo' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {visibleModes.map((modeKey) => {
                const config = MODES_CONFIG[modeKey];
                const ModeIcon = config.icon;
                const isActive = mode === modeKey;
                return (
                  <Button
                    key={modeKey}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onModeChange?.(modeKey)}
                    className="flex items-center gap-2 shrink-0"
                    style={
                      isActive
                        ? { backgroundColor: config.color, borderColor: config.color }
                        : {}
                    }
                  >
                    <ModeIcon className="w-4 h-4" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}
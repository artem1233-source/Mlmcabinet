import { ReactNode } from 'react';
import { Button } from '../ui/button';
import { Download, Crown, Users, Wallet, Package, TrendingUp, Headphones } from 'lucide-react';

export type DashboardMode =
  | 'ceo'
  | 'admin'
  | 'finance'
  | 'warehouse'
  | 'seo'
  | 'support';

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
}

const MODES_CONFIG = {
  ceo: { label: 'Центр управления', icon: Crown, color: '#8B5CF6' },
  admin: { label: 'Администрирование', icon: Users, color: '#39B7FF' },
  finance: { label: 'Финансы', icon: Wallet, color: '#10B981' },
  warehouse: { label: 'Склад', icon: Package, color: '#F59E0B' },
  seo: { label: 'SEO / Маркетинг', icon: TrendingUp, color: '#EC4899' },
  support: { label: 'Поддержка', icon: Headphones, color: '#6366F1' },
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
}: DashboardLayoutProps) {
  // Определяем доступные режимы на основе роли пользователя
  const getAvailableModes = (): DashboardMode[] => {
    if (availableModes) return availableModes;

    // CEO видит всё
    if (currentUser?.id === 'ceo' || currentUser?.role === 'ceo') {
      return ['ceo', 'admin', 'finance', 'warehouse', 'seo', 'support'];
    }

    // Admin/Manager видит основные разделы
    if (currentUser?.isAdmin || currentUser?.role === 'admin' || currentUser?.role === 'manager') {
      return ['admin', 'finance'];
    }

    // SEO видит только свой раздел
    if (currentUser?.role === 'seo') {
      return ['seo'];
    }

    // Обычные партнёры не используют Unified Dashboard
    return [];
  };

  const visibleModes = getAvailableModes();
  const currentModeConfig = MODES_CONFIG[mode];
  const Icon = currentModeConfig.icon;

  // Если только один режим доступен, не показываем переключатель
  const showModeSwitcher = visibleModes.length > 1 && onModeChange;

  return (
    <div className="min-h-screen bg-[#F7FAFC] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
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
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
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
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
              )}
            </div>
          </div>

          {/* Mode Switcher (если доступно больше одного режима) */}
          {showModeSwitcher && (
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
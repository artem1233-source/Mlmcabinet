import { Crown, Settings, DollarSign, Package, TrendingUp, Headphones, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DashboardMode, DashboardModeConfig, PeriodOption, PERIOD_OPTIONS, DashboardState } from './types';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  currentMode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  allowedModes: DashboardModeConfig[];
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  state: DashboardState;
  isDemo?: boolean;
  children: ReactNode;
}

const ICONS: Record<string, any> = {
  Crown,
  Settings,
  DollarSign,
  Package,
  TrendingUp,
  Headphones
};

export function DashboardLayout({
  currentMode,
  onModeChange,
  allowedModes,
  period,
  onPeriodChange,
  state,
  isDemo = false,
  children
}: DashboardLayoutProps) {
  const renderState = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin mb-4" />
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-gray-700 font-medium mb-2">Ошибка загрузки данных</p>
            <p className="text-gray-500 text-sm">Пожалуйста, попробуйте обновить страницу</p>
          </div>
        );
      case 'empty':
        return (
          <div className="flex flex-col items-center justify-center py-20">
            <Inbox className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-700 font-medium mb-2">Нет данных</p>
            <p className="text-gray-500 text-sm">За выбранный период данные отсутствуют</p>
          </div>
        );
      case 'success':
      default:
        return children;
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Панель управления</h1>
          {isDemo && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
              <AlertCircle className="w-3 h-3" />
              Демо-данные
            </div>
          )}
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Период:</span>
          <Select value={String(period)} onValueChange={(v) => onPeriodChange(Number(v) as PeriodOption)}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mode Tabs */}
      {allowedModes.length > 1 && (
        <div className="mb-6 overflow-x-auto">
          <Tabs value={currentMode} onValueChange={(v) => onModeChange(v as DashboardMode)}>
            <TabsList className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 inline-flex">
              {allowedModes.map(mode => {
                const Icon = ICONS[mode.icon] || Crown;
                return (
                  <TabsTrigger
                    key={mode.id}
                    value={mode.id}
                    className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-[#39B7FF] data-[state=active]:text-white rounded-md transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{mode.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px]">
        {renderState()}
      </div>
    </div>
  );
}

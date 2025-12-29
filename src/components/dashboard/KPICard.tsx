import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { StatusType } from './StatusLight';

export type KPISize = 'small' | 'medium' | 'large';

interface KPICardProps {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  status?: StatusType;
  size?: KPISize;
  loading?: boolean;
  onClick?: () => void; // Drilldown handler
  clickable?: boolean; // Показать hover эффект
}

export function KPICard({
  title,
  value,
  suffix = '',
  prefix = '',
  delta,
  deltaLabel,
  icon: Icon,
  iconColor = '#39B7FF',
  iconBgColor = '#E5F4FF',
  status = 'ok',
  size = 'medium',
  loading = false,
  onClick,
  clickable = false,
}: KPICardProps) {
  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };

  const valueSizeClasses = {
    small: 'text-xl',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  const iconSizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-12 h-12',
  };

  const iconInnerSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toLocaleString('ru-RU');
  };

  const isClickable = onClick || clickable;

  return (
    <Card
      className={`relative transition-all ${
        isClickable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-[#39B7FF]' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className={sizeClasses[size]}>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[#6B7280] mb-2">{title}</p>
              <p className={`${valueSizeClasses[size]} font-semibold text-[#1E1E1E] mb-1`}>
                {prefix}
                {formatValue(value)}
                {suffix}
              </p>
              {delta !== undefined && (
                <div className="flex items-center gap-1 text-xs">
                  {delta > 0 ? (
                    <TrendingUp className="w-3 h-3 text-[#10B981]" />
                  ) : delta < 0 ? (
                    <TrendingDown className="w-3 h-3 text-[#EF4444]" />
                  ) : null}
                  <span className={delta > 0 ? 'text-[#10B981]' : delta < 0 ? 'text-[#EF4444]' : 'text-[#6B7280]'}>
                    {delta > 0 ? '+' : ''}
                    {delta}%
                  </span>
                  {deltaLabel && <span className="text-[#6B7280]">{deltaLabel}</span>}
                </div>
              )}
            </div>

            {Icon && (
              <div
                className={`${iconSizeClasses[size]} rounded-lg flex items-center justify-center shrink-0`}
                style={{ backgroundColor: iconBgColor }}
              >
                <Icon className={iconInnerSizeClasses[size]} style={{ color: iconColor }} />
              </div>
            )}
          </div>
        )}

        {/* Clickable indicator */}
        {isClickable && !loading && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#39B7FF] opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </CardContent>
    </Card>
  );
}
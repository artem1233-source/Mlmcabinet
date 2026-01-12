import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  clickable?: boolean;
  size?: 'S' | 'M' | 'L';
  onClick?: () => void;
  suffix?: string;
  loading?: boolean;
}

export function KPICard({ 
  label, 
  value, 
  delta, 
  trend = 'neutral', 
  icon, 
  clickable = false,
  size = 'M',
  onClick,
  suffix = '',
  loading = false
}: KPICardProps) {
  const sizeStyles = {
    S: 'p-4',
    M: 'p-6',
    L: 'p-8'
  };

  const valueStyles = {
    S: 'text-xl',
    M: 'text-2xl',
    L: 'text-4xl'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card 
      className={`border-[#E6E9EE] rounded-2xl shadow-sm transition-all ${
        clickable ? 'cursor-pointer hover:shadow-md hover:border-[#39B7FF]' : ''
      }`}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className={sizeStyles[size]}>
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-[#666] font-medium">{label}</p>
          {icon && (
            <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF]/10 to-[#12C9B6]/10 rounded-xl flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <p className={`${valueStyles[size]} font-bold text-[#1E1E1E]`}>
              {value}{suffix}
            </p>
          </div>
        )}
        
        {delta !== undefined && !loading && (
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {delta > 0 ? '+' : ''}{delta}%
            </span>
            <span className="text-xs text-[#666] ml-1">vs предыдущий период</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

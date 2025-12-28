import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { KPI } from './types';

interface KPICardProps {
  kpi: KPI;
}

export function KPICard({ kpi }: KPICardProps) {
  const { title, value, delta, trend, prefix = '', suffix = '' } = kpi;

  const getTrendIcon = () => {
    if (!trend || trend === 'flat') return <Minus className="w-4 h-4 text-gray-400" />;
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (!trend || trend === 'flat') return 'text-gray-500';
    if (trend === 'up') return 'text-green-600';
    return 'text-red-600';
  };

  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      return val.toLocaleString('ru-RU');
    }
    return val;
  };

  return (
    <Card className="border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {prefix}{formatValue(value)}{suffix}
            </p>
          </div>
          {delta !== undefined && (
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {delta > 0 ? '+' : ''}{delta}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

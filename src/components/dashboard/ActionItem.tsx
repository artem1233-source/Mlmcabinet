import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertCircle, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

export type ActionSeverity = 'critical' | 'warning' | 'opportunity';

interface ActionItemProps {
  severity: ActionSeverity;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onAction: () => void;
  timestamp?: string;
}

export function ActionItem({
  severity,
  title,
  subtitle,
  ctaLabel,
  onAction,
  timestamp,
}: ActionItemProps) {
  const config = {
    critical: {
      icon: AlertCircle,
      color: '#EF4444',
      bgColor: '#FEE2E2',
      borderColor: '#FCA5A5',
      label: 'Критично',
    },
    warning: {
      icon: AlertTriangle,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      borderColor: '#FCD34D',
      label: 'Внимание',
    },
    opportunity: {
      icon: TrendingUp,
      color: '#10B981',
      bgColor: '#D1FAE5',
      borderColor: '#6EE7B7',
      label: 'Возможность',
    },
  };

  const { icon: Icon, color, bgColor, borderColor, label } = config[severity];

  return (
    <Card
      className="p-4 transition-all hover:shadow-md"
      style={{
        backgroundColor: bgColor,
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'white' }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                color,
                borderColor: color,
                backgroundColor: 'white',
              }}
            >
              {label}
            </Badge>
            {timestamp && (
              <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                <Clock className="w-3 h-3" />
                {timestamp}
              </div>
            )}
          </div>

          <h4 className="text-sm font-medium text-[#1E1E1E] mb-1">
            {title}
          </h4>

          <p className="text-xs text-[#6B7280] mb-3">
            {subtitle}
          </p>

          <Button
            size="sm"
            variant="outline"
            onClick={onAction}
            className="text-xs h-7"
            style={{
              borderColor: color,
              color: color,
            }}
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}

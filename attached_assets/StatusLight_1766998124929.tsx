import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export type StatusType = 'ok' | 'warning' | 'critical';

interface StatusLightProps {
  status: StatusType;
  message?: string;
  compact?: boolean;
}

export function StatusLight({ status, message, compact = false }: StatusLightProps) {
  const config = {
    ok: {
      icon: CheckCircle2,
      color: '#10B981',
      bgColor: '#ECFDF5',
      label: 'Система работает нормально',
    },
    warning: {
      icon: AlertTriangle,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      label: 'Требуется внимание',
    },
    critical: {
      icon: AlertCircle,
      color: '#EF4444',
      bgColor: '#FEE2E2',
      label: 'Критические проблемы',
    },
  };

  const { icon: Icon, color, bgColor, label } = config[status];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm" style={{ color }}>
          {message || label}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{ backgroundColor: bgColor }}
    >
      <Icon className="w-5 h-5" style={{ color }} />
      <div className="flex-1">
        <div className="text-sm" style={{ color }}>
          {message || label}
        </div>
      </div>
    </div>
  );
}

import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface AlertBannerProps {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

export function AlertBanner({ type, title, message, action, onClose }: AlertBannerProps) {
  const config = {
    critical: {
      bg: 'bg-red-50 border-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      titleColor: 'text-red-900',
      textColor: 'text-red-700'
    },
    warning: {
      bg: 'bg-orange-50 border-orange-200',
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      titleColor: 'text-orange-900',
      textColor: 'text-orange-700'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      titleColor: 'text-blue-900',
      textColor: 'text-blue-700'
    }
  };

  const { bg, icon, titleColor, textColor } = config[type];

  return (
    <div className={`${bg} border-2 rounded-xl p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${titleColor} mb-1`}>{title}</h3>
          <p className={`text-sm ${textColor}`}>{message}</p>
          {action && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

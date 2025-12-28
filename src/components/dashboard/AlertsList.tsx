import { AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { Alert } from './types';

interface AlertsListProps {
  alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  if (!alerts || alerts.length === 0) return null;

  const getAlertStyles = (level: Alert['level']) => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          titleColor: 'text-red-800',
          descColor: 'text-red-600',
          btnClass: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
          titleColor: 'text-amber-800',
          descColor: 'text-amber-600',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: <Info className="w-5 h-5 text-blue-600" />,
          titleColor: 'text-blue-800',
          descColor: 'text-blue-600',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Уведомления</h3>
      {alerts.map(alert => {
        const styles = getAlertStyles(alert.level);
        return (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${styles.bg} flex items-start gap-3`}
          >
            <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${styles.titleColor}`}>{alert.title}</p>
              {alert.description && (
                <p className={`text-sm mt-1 ${styles.descColor}`}>{alert.description}</p>
              )}
            </div>
            {alert.actionLabel && (
              <button
                onClick={() => alert.actionHref && (window.location.href = alert.actionHref)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${styles.btnClass}`}
              >
                {alert.actionLabel}
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

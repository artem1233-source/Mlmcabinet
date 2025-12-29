import { useState, useEffect } from 'react';
import { DashboardLayout, DashboardMode } from './DashboardLayout';
import { CEOMissionControl } from './CEOMissionControl';
import { AdminOpsDashboard } from './AdminOpsDashboard';
import { WarehouseDashboard } from './WarehouseDashboard';
import { FinanceDashboard } from './FinanceDashboard';
import { SEODashboard } from './SEODashboard';
import { SupportDashboard } from './SupportDashboard';
import { StatusType } from './StatusLight';
import { toast } from 'sonner';
import { dashboardExporters } from '../../utils/dashboardExport';

interface UnifiedDashboardProps {
  currentUser: any;
}

export function UnifiedDashboard({ currentUser }: UnifiedDashboardProps) {
  const [mode, setMode] = useState<DashboardMode>('ceo');
  const [status, setStatus] = useState<StatusType>('ok');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    // Определяем начальный режим на основе роли
    const initialMode = getInitialMode();
    setMode(initialMode);
  }, [currentUser]);

  const getInitialMode = (): DashboardMode => {
    if (currentUser?.id === 'ceo' || currentUser?.role === 'ceo') {
      return 'ceo';
    }
    if (currentUser?.isAdmin || currentUser?.role === 'admin') {
      return 'admin';
    }
    if (currentUser?.role === 'seo') {
      return 'seo';
    }
    // По умолчанию admin для всех остальных (на случай если попали сюда)
    return 'admin';
  };

  const handleModeChange = (newMode: DashboardMode) => {
    console.log('🔄 Switching mode:', mode, '→', newMode);
    setMode(newMode);
  };

  const handleRefresh = async () => {
    console.log('🔄 Refreshing dashboard...');
    toast.info('Обновление данных...');
    // Перезагрузка будет в дочернем компоненте
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Данные обновлены');
  };

  const handleExport = () => {
    console.log('📥 Exporting data for mode:', mode);
    toast.info('Экспорт данных в CSV...');
    
    // Вызываем экспорт для текущего режима
    // Экспорт будет обрабатываться в дочернем компоненте
    const exportEvent = new CustomEvent('dashboard-export', { 
      detail: { mode, period } 
    });
    window.dispatchEvent(exportEvent);
  };

  const handleAudit = () => {
    console.log('🔍 Running audit...');
    toast.info('Запуск аудита системы...');
    // TODO: Implement audit logic
  };

  // Рендерим содержимое в зависимости от режима
  const renderContent = () => {
    console.log('🎨 Rendering mode:', mode); // Отладка
    
    switch (mode) {
      case 'ceo':
        return <CEOMissionControl currentUser={currentUser} period={period} />;
      
      case 'admin':
        return <AdminOpsDashboard currentUser={currentUser} period={period} />;
      
      case 'finance':
        return <FinanceDashboard currentUser={currentUser} period={period} />;
      
      case 'warehouse':
        return <WarehouseDashboard currentUser={currentUser} period={period} />;
      
      case 'seo':
        return <SEODashboard currentUser={currentUser} period={period} />;
      
      case 'support':
        return <SupportDashboard currentUser={currentUser} period={period} />;
      
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      mode={mode}
      onModeChange={handleModeChange}
      status={status}
      statusMessage={statusMessage}
      period={period}
      onPeriodChange={setPeriod}
      onRefresh={handleRefresh}
      onExport={handleExport}
      onAudit={handleAudit}
      currentUser={currentUser}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
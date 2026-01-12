import { useState, useEffect } from 'react';
import { DashboardLayout, DashboardMode } from './DashboardLayout';
import { CEOMissionControl } from './CEOMissionControl';
import { AdminOpsDashboard } from './AdminOpsDashboard';
import { WarehouseDashboard } from './WarehouseDashboard';
import { FinanceDashboard } from './FinanceDashboard';
import { SEODashboard } from './SEODashboard';
import { SupportDashboard } from './SupportDashboard';
import { PartnerDashboard } from './PartnerDashboard'; // 🆕 Дашборд для партнёров
import { StatusType } from './StatusLight';
import { toast } from 'sonner';
import { dashboardExporters } from '../../utils/dashboardExport';
import { useRole, RoleType } from '../../contexts/RoleContext'; // 🔥 НОВОЕ: импорт контекста

interface UnifiedDashboardProps {
  currentUser: any;
}

// 🔥 НОВАЯ функция: маппинг RoleType -> DashboardMode
function roleToDashboardMode(role: RoleType): DashboardMode {
  const mapping: Record<RoleType, DashboardMode> = {
    'owner': 'ceo',
    'adminops': 'admin',
    'finance': 'finance',
    'warehouse': 'warehouse',
    'marketing': 'seo',
    'support': 'support',
    'partner': 'partner',
  };
  return mapping[role];
}

export function UnifiedDashboard({ currentUser }: UnifiedDashboardProps) {
  const { currentRole } = useRole(); // 🔥 НОВОЕ: получаем currentRole из контекста как source of truth
  const mode = roleToDashboardMode(currentRole); // 🔥 НОВОЕ: маппинг роли в режим дашборда
  
  const [status, setStatus] = useState<StatusType>('ok');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [period, setPeriod] = useState('30');
  
  // 🆕 Состояние для activeModule (используется только в режиме CEO)
  const [activeModule, setActiveModule] = useState<DashboardMode>('ceo');

  // 🔥 URL-SYNC для activeModule (ТОЛЬКО для Owner/ceo режима)
  useEffect(() => {
    const validModules: DashboardMode[] = ['ceo', 'admin', 'finance', 'warehouse', 'seo', 'support', 'partner'];
    
    if (mode === 'ceo') {
      // Читаем ?module= из URL при монтировании или смене на ceo режим
      const params = new URLSearchParams(window.location.search);
      const moduleFromUrl = params.get('module') as DashboardMode | null;
      
      if (moduleFromUrl && validModules.includes(moduleFromUrl)) {
        setActiveModule(moduleFromUrl);
        console.log('URL_SYNC_OK', { mode, activeModule: moduleFromUrl, search: window.location.search });
      } else {
        setActiveModule('ceo');
        // Устанавливаем ?module=ceo если параметра нет или он невалидный
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('module', 'ceo');
        window.history.replaceState(null, '', newUrl.toString());
        console.log('URL_SYNC_OK', { mode, activeModule: 'ceo', search: newUrl.search });
      }
    } else {
      // Если режим НЕ ceo → удаляем ?module= из URL
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has('module')) {
        currentUrl.searchParams.delete('module');
        window.history.replaceState(null, '', currentUrl.toString());
        console.log('URL_SYNC_OK', { mode, activeModule: 'removed', search: currentUrl.search });
      }
    }
  }, [mode]); // Срабатывает при смене режима

  // 🔥 Синхронизация URL при изменении activeModule (только в ceo режиме)
  useEffect(() => {
    if (mode === 'ceo') {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('module', activeModule);
      window.history.replaceState(null, '', newUrl.toString());
      console.log('URL_SYNC_OK', { mode, activeModule, search: newUrl.search });
    }
  }, [activeModule, mode]);

  // 🔥 УДАЛЕНА логика локального state mode и useEffect для currentUser

  console.log('🔥 UnifiedDashboard render:', { currentRole, mode, activeModule }); // 🔥 НОВЫЙ лог для отладки

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
    // 🆕 В режиме CEO используем activeModule для определения контента
    const effectiveMode = mode === 'ceo' ? activeModule : mode;
    console.log('🎨 Rendering mode:', mode, '| effective:', effectiveMode); // Отладка
    
    switch (effectiveMode) {
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
      
      case 'partner':
        return <PartnerDashboard currentUser={currentUser} period={period} />; // 🆕 Дашборд для партнёров
      
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      mode={mode}
      onModeChange={undefined} // 🔥 УДАЛЕНО: переключение теперь только через TopBarRu
      period={period}
      onPeriodChange={setPeriod}
      onExport={handleExport}
      currentUser={currentUser}
      activeModule={activeModule}
      onActiveModuleChange={setActiveModule}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
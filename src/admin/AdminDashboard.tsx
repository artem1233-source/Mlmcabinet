import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Role, Period, Section, ROLE_CONFIGS } from './types';
import { RoleType, useRole } from '../contexts/RoleContext';
import { hasSectionAccess, getHomeDashboard, getRedirectSection } from './utils/roleAccess';
import { AdminTopbar } from './components/layout/AdminTopbar';
import { AdminSidebar } from './components/layout/AdminSidebar';
import { OwnerDashboard } from './components/roles/OwnerDashboard';
import { AdminOpsDashboard } from './components/roles/AdminOpsDashboard';
import { FinanceDashboard } from './components/roles/FinanceDashboard';
import { WarehouseDashboard } from './components/roles/WarehouseDashboard';
import { MarketingDashboard } from './components/roles/MarketingDashboard';
import { SupportDashboard } from './components/roles/SupportDashboard';
import { PartnerDashboard } from '../components/dashboard/PartnerDashboard';
import { OrderDetailsDrawer } from './components/orders/OrderDetailsDrawer';
import { InteractiveTestPanel } from './components/testing/InteractiveTestPanel';
import { PartnerOrders } from './components/orders/PartnerOrders';

/**
 * Маппинг ролей из RoleContext в роли AdminDashboard
 */
function mapRoleTypeToRole(roleType: RoleType): Role {
  const mapping: Record<RoleType, Role> = {
    owner: 'SEO',
    adminops: 'AdminOps',
    finance: 'Finance',
    warehouse: 'Warehouse',
    marketing: 'Marketing',
    support: 'Support',
    partner: 'Partner'
  };
  return mapping[roleType];
}

/**
 * Маппинг ролей из AdminDashboard в роли RoleContext
 */
function mapRoleToRoleType(role: Role): RoleType {
  const mapping: Record<Role, RoleType> = {
    SEO: 'owner',
    AdminOps: 'adminops',
    Finance: 'finance',
    Warehouse: 'warehouse',
    Marketing: 'marketing',
    Support: 'support',
    Partner: 'partner'
  };
  return mapping[role];
}

export function AdminDashboard() {
  // Используем RoleContext вместо локального state
  const { currentRole: currentRoleType, setCurrentRole: setCurrentRoleType, inspectionMode, setInspectionMode } = useRole();
  const currentRole = mapRoleTypeToRole(currentRoleType);
  
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [period, setPeriod] = useState<Period>('30');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Используем inspectionMode из RoleContext
  const showAccessInspection = inspectionMode;

  // Автоматический редирект при смене роли
  useEffect(() => {
    const redirectSection = getRedirectSection(currentRole, activeSection);
    if (redirectSection) {
      console.log('🔀 Auto-redirecting to:', redirectSection);
      setActiveSection(redirectSection);
    }
  }, [currentRole]);

  const handleRoleChange = (role: Role) => {
    console.log('🔄 Role changing from', currentRole, 'to', role);
    setCurrentRoleType(mapRoleToRoleType(role));
    toast.success(`Режим изменён: ${ROLE_CONFIGS[role].name}`);
    
    // Переходим на домашний дашборд роли
    const homeDashboard = getHomeDashboard(role);
    setActiveSection(homeDashboard);
  };

  const handleSectionChange = (section: Section) => {
    // Проверяем доступ
    const hasAccess = hasSectionAccess(currentRole, section);
    
    // Если режим инспекции включен и доступа нет - блокируем с уведомлением
    if (showAccessInspection && !hasAccess) {
      toast.error(`🔒 Раздел "${section}" недоступен для роли ${ROLE_CONFIGS[currentRole].name}`);
      return;
    }
    
    // Если режим инспекции выключен и доступа нет - локируем (но это не должно произойти)
    if (!showAccessInspection && !hasAccess) {
      toast.error('Раздел недоступен для текущей роли');
      return;
    }
    
    setActiveSection(section);
  };

  const handleRefresh = () => {
    toast.success('Данные обновлены');
  };

  const handleExport = () => {
    toast.success('Экспорт начат...');
  };

  const handleSettings = () => {
    toast.info('Настройки (в разработке)');
  };

  const getSectionTitle = () => {
    // Для дашборда показываем название роли
    if (activeSection === 'dashboard') {
      return `${ROLE_CONFIGS[currentRole].name} - Центр управления`;
    }
    
    const titles: Record<string, string> = {
      dashboard: 'ентр управления',
      admin: 'Администрирование',
      finance: 'Финансы',
      warehouse: 'Склад',
      marketing: 'Маркетинг',
      support: 'Поддержка',
      partner: 'Партнёр',
      orders: 'Заказы',
      analytics: 'Аналитика',
      settings: 'астройки',
      testing: 'Тестирование системы' // Ноый раздел
    };
    return titles[activeSection] || 'Панель управления';
  };

  const renderContent = () => {
    // Добавляем лог для отладки
    console.log('📊 Rendering content for:', { currentRole, activeSection });
    
    switch (activeSection) {
      case 'dashboard':
        // Показываем дашборд в соответствии с текущей ролью
        console.log('🎯 Rendering dashboard for role:', currentRole);
        switch (currentRole) {
          case 'SEO':
            return <OwnerDashboard key="owner-dashboard" />;
          case 'AdminOps':
            return <AdminOpsDashboard key="adminops-dashboard" />;
          case 'Finance':
            return <FinanceDashboard key="finance-dashboard" />;
          case 'Warehouse':
            return <WarehouseDashboard key="warehouse-dashboard" />;
          case 'Marketing':
            return <MarketingDashboard key="marketing-dashboard" />;
          case 'Support':
            return <SupportDashboard key="support-dashboard" />;
          case 'Partner':
            // Для партнёра показываем партнерский дашборд с мок-данными
            return (
              <div key="partner-dashboard" className="space-y-4">
                {/* Информационный баннер */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                      👁️
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Режим просмотра партнёрского кабинета</h3>
                      <p className="text-sm text-gray-600">Вы видите интерфейс, который видят партнёры на главной странице своего личного кабинета</p>
                    </div>
                  </div>
                </div>
                
                <PartnerDashboard currentUser={{ 
                  id: 'demo_partner', 
                  email: 'partner@demo.com', 
                  full_name: 'Демо Партнёр',
                  ref_code: 'DEMO123',
                  rank: 2,
                  balance: 25000
                }} period={period} />
              </div>
            );
          default:
            return <OwnerDashboard key="owner-dashboard-default" />;
        }
      
      case 'admin':
        return <AdminOpsDashboard />;
      
      case 'finance':
        return <FinanceDashboard />;
      
      case 'warehouse':
        return <WarehouseDashboard />;
      
      case 'marketing':
        return <MarketingDashboard />;
      
      case 'support':
        return <SupportDashboard />;
      
      case 'partner':
        // Показываем партнерский дашборд с мок-данными для демонстрации
        return (
          <div className="space-y-4">
            {/* Информационный баннер */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                  👁️
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Режим росмотра партнёрского кабинета</h3>
                  <p className="text-sm text-gray-600">Вы видите интерфейс, которй видят партнёры на главной странице своего личного кабинета</p>
                </div>
              </div>
            </div>
            
            <PartnerDashboard currentUser={{ 
              id: 'demo_partner', 
              email: 'partner@demo.com', 
              full_name: 'Демо Партнёр',
              ref_code: 'DEMO123',
              rank: 2,
              balance: 25000
            }} period={period} />
          </div>
        );
      
      case 'orders':
        if (currentRole === 'Partner') return <PartnerOrders />;
        else return <PlaceholderSection title={`Заказы (${ROLE_CONFIGS[currentRole].name})`} />;
      
      case 'analytics':
        return <AnalyticsSection />;
      
      case 'settings':
        return <SettingsSection />;
      
      case 'testing':
        // 🧪 Интерактивная панель тестирования
        return <InteractiveTestPanel />;
      
      default:
        return <PlaceholderSection title={getSectionTitle()} />;
    }
  };

  const canSwitchRoles = ROLE_CONFIGS[currentRole].canSwitchRoles;

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex">
      {/* Sidebar */}
      <AdminSidebar
        currentRole={currentRole}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        showAccessInspection={showAccessInspection}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <AdminTopbar
          currentRole={currentRole}
          title={getSectionTitle()}
          period={period}
          onPeriodChange={setPeriod}
          onRoleChange={handleRoleChange}
          onRefresh={handleRefresh}
          onExport={handleExport}
          onSettings={canSwitchRoles ? handleSettings : undefined}
          canSwitchRoles={canSwitchRoles}
          showAccessInspection={showAccessInspection}
          onAccessInspectionChange={setInspectionMode}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        {/* Content Area */}
        <main key={`dashboard-${currentRole}-${activeSection}`} className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Order Details Drawer */}
      {selectedOrderId && (
        <OrderDetailsDrawer
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          userRole={currentRole}
        />
      )}
    </div>
  );
}

// Placeholder sections (будут созданы позже)
function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl text-white">🚧</span>
        </div>
        <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">{title}</h2>
        <p className="text-[#666]">Раздел в разработке</p>
      </div>
    </div>
  );
}

function AdminOpsSection() {
  return <PlaceholderSection title="Администрирование" />;
}

function FinanceSection() {
  return <PlaceholderSection title="Финансы" />;
}

function WarehouseSection() {
  return <PlaceholderSection title="Склад" />;
}

function MarketingSection() {
  return <PlaceholderSection title="Мркетинг" />;
}

function SupportSection() {
  return <PlaceholderSection title="Поддержка" />;
}

function OrdersSection({ currentRole }: { currentRole: Role }) {
  return <PlaceholderSection title={`Заказы (${ROLE_CONFIGS[currentRole].name})`} />;
}

function AnalyticsSection() {
  return <PlaceholderSection title="Аналитика" />;
}

function SettingsSection() {
  return <PlaceholderSection title="Настройки" />;
}
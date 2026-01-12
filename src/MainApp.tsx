import { useState, useEffect } from 'react';
import { LoginRu } from './components/LoginRu';
import { RegistrationRu } from './components/RegistrationRu';
import { SidebarRu } from './components/SidebarRu';
import { TopBarRu } from './components/TopBarRu'; // 🆕 Импорт TopBar
import { OrdersRu } from './components/OrdersRu';
import { BalanceRu } from './components/BalanceRu';
import { CatalogRu } from './components/CatalogRu';
import { UsersManagementRu } from './components/UsersManagementRuV2';
import { UsersManagementOptimized } from './components/UsersManagementOptimized';
import { StructureWithVersionToggle } from './components/StructureWithVersionToggle';
import { TrainingRu } from './components/TrainingRu';
import { ProfileRu } from './components/ProfileRu';
import { SettingsRu } from './components/SettingsRu';
import { NotificationsRu } from './components/NotificationsRu';
import { AchievementsRu } from './components/AchievementsRu';
import { MarketingToolsRu } from './components/MarketingToolsRu';
import { EarningsRu } from './components/EarningsRu';
import { AdminRu } from './components/AdminRu';
import { AdminPanel } from './components/AdminPanel';
import { AdminFinancePage } from './components/admin/AdminFinancePage'; // Neobank Finance Page
import { UnifiedDashboard } from './components/dashboard/UnifiedDashboard'; // 🆕 Unified Dashboard
import { DrilldownProvider } from './components/dashboard/DrilldownProvider'; // 🆕 Drilldown Provider
import { AdminDashboard } from './admin/AdminDashboard'; // 🆕 H2 Platform Admin Panel
import { RoleProvider } from './contexts/RoleContext'; // 🆕 Role Context для управления ролями
import { Menu } from 'lucide-react';
import { Button } from './components/ui/button';
import * as api from './utils/api.ts';

interface MainAppProps {
  authScreen: 'login' | 'register';
  setAuthScreen: (screen: 'login' | 'register') => void;
}

export function MainApp({ authScreen, setAuthScreen }: MainAppProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('дашборд');
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // 🚀 Переключатель между старой и оптимизированной версией управления пользователями
  // ✅ Оптимизированная версия по умолчанию (имеет 100% функционал + лучшая производительность)
  const useOptimizedUsers = true; // Всегда используем новую версию

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 🔄 Обработчик навигации из компонентов (например, PartnerDashboard)
  useEffect(() => {
    const handleNavigate = (event: any) => {
      const section = event.detail;
      if (section) {
        setActiveSection(section);
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  // 🚪 Выход из системы
  const handleLogout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('userId');
    localStorage.removeItem('access_token');
    api.clearAuthToken();
    setUserId(null);
    setCurrentUser(null);
    setActiveSection('дашборд');
    window.location.reload();
  };

  // 🔄 Загружаем полные данные пользователя при изменении userId или refreshTrigger
  useEffect(() => {
    console.log('🔄 MainApp useEffect triggered. userId:', userId, 'refreshTrigger:', refreshTrigger);
    
    const loadUserData = async () => {
      if (!userId) {
        console.log('🔵 MainApp: No userId, clearing currentUser');
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 MainApp: Loading user data for:', userId);
        const response = await api.getUser(userId); // 🆕 Используем getUser вместо getUserProfile
        console.log('📦 MainApp: getUser response:', response);
        
        if (response.success && response.user) {
          console.log('✅ MainApp: User data loaded:', response.user);
          setCurrentUser(response.user);
        } else {
          console.error('❌ MainApp: Failed to load user data:', response);
          // Если не уалось загрузить данные, очищаем userId
          setUserId(null);
          api.clearAuthToken();
        }
      } catch (error) {
        console.error('❌ MainApp: Error loading user data:', error);
        setUserId(null);
        api.clearAuthToken();
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, refreshTrigger]); // 🆕 Добавили refreshTrigger в зависимости

  // 💓 Activity heartbeat (обновление последней активности пользователя)
  useEffect(() => {
    // Heartbeat только для авторизованных пользователей
    if (!userId || !currentUser?.id) {
      return;
    }

    const updateActivity = async () => {
      try {
        const { projectId, publicAnonKey } = await import('./utils/supabase/info');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/user/activity`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ userId }),
            // Добавляем таймаут для предотвращения зависания
            signal: AbortSignal.timeout(5000), // 5 секунд
          }
        );
        
        if (!response.ok) {
          // Тихо игнорируем все ошибки heartbeat - не критично для работы приложения
          // Пользователь не должен видеть эти технические ошибки
          return;
        }
        
        const data = await response.json();
        // console.log('💓 Activity updated:', data);
      } catch (error) {
        // Тихо игнорируем все ошибки сети для heartbeat (не критично)
        // Включая таймауты, сетевые ошибки, 500 и т.д.
        // Пользователь не должен видеть эти технические ошибки
      }
    };

    // Обновляем активность сразу при монтировании
    updateActivity();

    // Устанавливаем интервал для периодического обновления (каждую минуту как резервный механизм)
    const interval = setInterval(updateActivity, 60 * 1000); // 60 секунд

    return () => clearInterval(interval);
  }, [userId, currentUser]);

  // Проверяем URL и устанавливаем правильный экран пр загрузке
  useEffect(() => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    // Если есть реферальный код в URL, автоматически открываем форму регистрации
    if (refCode) {
      console.log('🔵 MainApp: Referral code detected:', refCode, 'switching to register screen');
      setAuthScreen('register');
    } else if (path === '/register') {
      console.log('🔵 MainApp: URL is /register, switching to register screen');
      setAuthScreen('register');
    } else if (path === '/login' || path === '/') {
      console.log('🔵 MainApp: URL is /login or /, switching to login screen');
      setAuthScreen('login');
    }
  }, [setAuthScreen]);

  useEffect(() => {
    console.log('🔍 MainApp: Checking auth status...');
    const token = api.getAuthToken();
    console.log('🔍 MainApp: Token from storage:', token ? 'EXISTS' : 'NULL');
    
    if (token) {
      setUserId(token);
      // Save userId to localStorage for AdminPanel and other components
      localStorage.setItem('userId', token);
      console.log('✅ MainApp: User is authenticated, userId:', token);
    } else {
      console.log('❌ MainApp: No auth token, showing login');
    }
    setLoading(false);
  }, []);

  const handleAuth = (newUserId: string) => {
    console.log('✅ MainApp: Authentication successful, userId:', newUserId);
    setUserId(newUserId);
    // Save userId to localStorage for AdminPanel and other components
    localStorage.setItem('userId', newUserId);
    console.log('💾 Saved userId to localStorage:', newUserId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если пользователь не авторизова или данные ещё не загружены
  if (!userId || !currentUser) {
    if (!userId) {
      // Показываем форму входа/регистрации
      if (authScreen === 'register') {
        console.log('🔵 MainApp: Rendering RegistrationRu');
        return <RegistrationRu onSwitchToLogin={() => {
          console.log('🔵 MainApp: Switching to login');
          setAuthScreen('login');
        }} />;
      } else {
        console.log('🔵 MainApp: Rendering LoginRu');
        return <LoginRu 
          onSwitchToRegister={() => {
            console.log('🔵 MainApp: Switching to register');
            setAuthScreen('register');
          }}
          onLogin={(newUserId) => {
            console.log('✅ MainApp: User logged in, calling handleAuth');
            handleAuth(newUserId);
          }}
        />;
      }
    } else {
      // Загружаем данные пользователя
      return (
        <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка данных пользователя...</p>
          </div>
        </div>
      );
    }
  }

  console.log('✅ MainApp: User authenticated, showing main app. Active section:', activeSection);

  // Рендерим нужную секцию на основе activeSection
  const renderSection = () => {
    switch (activeSection) {
      case 'дашборд':
      case 'dashboard':
        // 🚀 Новый Unified Dashboard
        return <UnifiedDashboard currentUser={currentUser} />;
      case 'структура':
      case 'structure':
        return <StructureWithVersionToggle currentUser={currentUser} refreshTrigger={refreshTrigger} />;
      case 'пользователи':
      case 'users':
        // 🚀 Оптимизированная версия управления пользователями
        return <UsersManagementOptimized currentUser={currentUser} onRefresh={handleRefresh} />;
      case 'заказы':
      case 'orders':
        return <OrdersRu currentUser={currentUser} refreshTrigger={refreshTrigger} />;
      case 'доходы':
      case 'incomes':
      case 'earnings':
        return <EarningsRu currentUser={currentUser} refreshTrigger={refreshTrigger} />;
      case 'баланс':
      case 'balance':
        return <BalanceRu currentUser={currentUser} onRefresh={handleRefresh} refreshTrigger={refreshTrigger} />;
      case 'каталог':
      case 'catalog':
        return <CatalogRu currentUser={currentUser} onOrderCreated={handleRefresh} />;
      case 'маркетинг':
      case 'marketing':
        return <MarketingToolsRu currentUser={currentUser} />;
      case 'обучение':
      case 'training':
        return <TrainingRu currentUser={currentUser} />;
      case 'достижения':
      case 'achievements':
        return <AchievementsRu />;
      case 'уведомления':
      case 'notifications':
        return <NotificationsRu />;
      case 'профиль':
      case 'profile':
        return <ProfileRu currentUser={currentUser} onUpdate={handleRefresh} onLogout={handleLogout} />;
      case 'настройки':
      case 'settings':
        return <SettingsRu currentUser={currentUser} onUpdate={handleRefresh} onLogout={handleLogout} />;
      case 'админ':
      case 'admin':
        return <AdminRu currentUser={currentUser} />;
      case 'управление-админами':
      case 'admin-management':
        return <AdminPanel currentUser={currentUser} />;
      case 'финансы':
      case 'finance':
        // 💎 Neobank Finance Page (единственная версия)
        return <AdminFinancePage currentUser={currentUser} />;
      case 'mission-control':
      case 'мишн-контрол':
        // 🚀 Unified Dashboard с CEO Mission Control
        return <UnifiedDashboard currentUser={currentUser} />;
      case 'h2-admin':
      case 'админ-h2':
        // 👑 H2 Platform Admin Panel (Центр управления с ролями)
        return <AdminDashboard />;
      default:
        // 🚀 По умолчанию тоже показываем Unified Dashboard
        return <UnifiedDashboard currentUser={currentUser} />;
    }
  };

  return (
    <RoleProvider>
      <div className="flex h-screen bg-[#F7FAFC] overflow-hidden">
        <SidebarRu 
          текущаяВкладка={activeSection} 
          изменитьВкладку={(tab) => {
            setActiveSection(tab);
            setMobileMenuOpen(false);
          }}
          currentUser={currentUser}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop TopBar */}
          <div className="hidden lg:block">
            <TopBarRu
              имяПользователя={currentUser?.name || currentUser?.username || 'Пользователь'}
              балансПользователя={currentUser?.balance || 0}
              cartItemsCount={0}
              onMenuClick={() => setMobileMenuOpen(true)}
              onProfileClick={() => setActiveSection('профиль')}
              onBalanceClick={() => setActiveSection('баланс')}
              onNotificationsClick={() => setActiveSection('уведомления')}
              onLogoClick={() => setActiveSection('дашборд')}
              onCartClick={() => setActiveSection('каталог')}
            />
          </div>
          
          {/* Mobile Header */}
          <header className="lg:hidden bg-white border-b border-[#E6E9EE] px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="text-[#666]"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-[#39B7FF] font-bold">H₂ Платформа</h1>
            <div className="w-9" /> {/* Spacer for centering */}
          </header>
          
          <main className="flex-1 overflow-y-auto pt-0 lg:pt-20">
            <div className="max-w-7xl mx-auto w-full">
              {renderSection()}
            </div>
          </main>
        </div>
      </div>
    </RoleProvider>
  );
}
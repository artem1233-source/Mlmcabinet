import { useState, useEffect } from 'react';
import { LoginRu } from './components/LoginRu';
import { RegistrationRu } from './components/RegistrationRu';
import { SidebarRu } from './components/SidebarRu';
import { DashboardRu } from './components/DashboardRu';
import { StructureRu } from './components/StructureRu';
import { OrdersRu } from './components/OrdersRu';
import { EarningsRu } from './components/EarningsRu';
import { BalanceRu } from './components/BalanceRu';
import { CatalogRu } from './components/CatalogRu';
import { MarketingToolsRu } from './components/MarketingToolsRu';
import { TrainingRu } from './components/TrainingRu';
import { AchievementsRu } from './components/AchievementsRu';
import { NotificationsRu } from './components/NotificationsRu';
import { ProfileRu } from './components/ProfileRu';
import { SettingsRu } from './components/SettingsRu';
import { AdminRu } from './components/AdminRu';
import { AdminPanel } from './components/AdminPanel';
import { AdminDebug } from './components/AdminDebug';
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

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 🔄 Загружаем полные данные пользователя при изменении userId
  useEffect(() => {
    console.log('🔄 MainApp useEffect triggered. userId:', userId, 'currentUser:', currentUser);
    
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
          // Если не удалось загрузить данные, очищаем userId
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
  }, [userId]);

  // Проверяем URL и устанавливаем правильный экран при загрузке
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/register') {
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
      console.log('✅ MainApp: User is authenticated, userId:', token);
    } else {
      console.log('❌ MainApp: No auth token, showing login');
    }
    setLoading(false);
  }, []);

  const handleAuth = (newUserId: string) => {
    console.log('✅ MainApp: Authentication successful, userId:', newUserId);
    setUserId(newUserId);
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

  // Если пользователь не авторизован или данные ещё не загружены
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
            console.log('✅ MainApp: User logged in, setting userId:', newUserId);
            setUserId(newUserId);
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
        return <DashboardRu currentUser={currentUser} onRefresh={handleRefresh} refreshTrigger={refreshTrigger} />;
      case 'структура':
      case 'structure':
        return <StructureRu currentUser={currentUser} refreshTrigger={refreshTrigger} />;
      case 'заказы':
      case 'orders':
        return <OrdersRu currentUser={currentUser} refreshTrigger={refreshTrigger} />;
      case 'доходы':
      case 'earnings':
        return <EarningsRu currentUser={currentUser} onRefresh={handleRefresh} refreshTrigger={refreshTrigger} />;
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
        return <TrainingRu />;
      case 'достижения':
      case 'achievements':
        return <AchievementsRu />;
      case 'уведомления':
      case 'notifications':
        return <NotificationsRu />;
      case 'профиль':
      case 'profile':
        return <ProfileRu 
          currentUser={currentUser} 
          onUpdate={async () => {
            // Перезагружаем данные пользователя
            const response = await api.getUser(userId!);
            if (response.success && response.user) {
              setCurrentUser(response.user);
            }
          }} 
        />; 
      case 'настройки':
      case 'settings':
        return <SettingsRu 
          currentUser={currentUser} 
          onUpdate={async () => {
            // Перезагружаем данные пользователя
            const response = await api.getUser(userId!);
            if (response.success && response.user) {
              setCurrentUser(response.user);
            }
          }}
          onLogout={() => {
            setUserId(null);
            setCurrentUser(null);
            api.clearAuthToken();
            setAuthScreen('login');
          }}
        />; 
      case 'админ':
      case 'admin':
        return <AdminRu />;
      case 'управление-админами':
      case 'adminpanel':
        return <AdminPanel currentUser={currentUser} />;
      case 'админдебаг':
      case 'admindebug':
        return <AdminDebug currentUser={currentUser} />;
      default:
        return <DashboardRu currentUser={currentUser} onRefresh={handleRefresh} refreshTrigger={refreshTrigger} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F7FAFC] overflow-hidden">
      <SidebarRu 
        текущаяВкладка={activeSection} 
        изменитьВкладку={setActiveSection}
        currentUser={currentUser}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { LoginRu } from './components/LoginRu';
import { RegistrationRu } from './components/RegistrationRu';
import { SidebarRu } from './components/SidebarRu';
import { DashboardRu } from './components/DashboardRu';
import { DashboardRuOptimized } from './components/DashboardRuOptimized';
import { UnifiedDashboard } from './components/dashboard';
import { OrdersRu } from './components/OrdersRu';
import { BalanceRu } from './components/BalanceRu';
import { CatalogRu } from './components/CatalogRu';
import { CartRu } from './components/CartRu';
import { UsersManagementOptimized } from './components/UsersManagementOptimized';
import { StructureDataViz } from './components/StructureDataViz';
import { TrainingRu } from './components/TrainingRu';
import { ProfileRu } from './components/ProfileRu';
import { SettingsRu } from './components/SettingsRu';
import { NotificationsRu } from './components/NotificationsRu';
import { AchievementsRu } from './components/AchievementsRu';
import { MarketingToolsRu } from './components/MarketingToolsRu';
import { EarningsRu } from './components/EarningsRu';
import { AdminRu } from './components/AdminRu';
import { AdminPanel } from './components/AdminPanel';
import { PayoutsAdminRu } from './components/PayoutsAdminRu';
import { AdminFinanceRu } from './components/AdminFinanceRu';
import { Menu, ShoppingCart } from 'lucide-react';
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
  
  // 🛒 Состояние корзины
  const [cartItems, setCartItems] = useState<Array<{product: any; quantity: number; isPartner: boolean}>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // 🚀 Переключатель между старой и оптимизированной версией дашборда
  // ✅ Оптимизированная версия по умолчанию (React Query + кэширование + экспорт CSV)
  const [useOptimizedDashboard, setUseOptimizedDashboard] = useState(true);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 🛒 Функции для работы с корзиной
  const handleAddToCart = (product: any, isPartner: boolean, quantity: number = 1) => {
    console.log('🛒 Adding to cart:', product.название, 'isPartner:', isPartner, 'qty:', quantity);
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.sku === product.sku && item.isPartner === isPartner
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      
      return [...prev, { product, quantity, isPartner }];
    });
    // Корзина НЕ открывается — товар добавляется с анимацией, можно продолжать покупки
  };

  const handleUpdateQuantity = (productId: string, isPartner: boolean, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId, isPartner);
      return;
    }
    setCartItems(prev => 
      prev.map(item => 
        item.product.sku === productId && item.isPartner === isPartner
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string, isPartner: boolean) => {
    setCartItems(prev => 
      prev.filter(item => !(item.product.sku === productId && item.isPartner === isPartner))
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleCartOrderCreated = () => {
    handleClearCart();
    setIsCartOpen(false);
    handleRefresh();
  };

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
  }, [userId, refreshTrigger]); // 🆕 Добавили refreshTrigger в зависимости

  // 💓 Heartbeat для обновления активности пользователя
  useEffect(() => {
    if (!userId || !currentUser) return;

    // Функция для обновления lastLogin
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
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Activity update failed:', response.status, errorText);
          return;
        }
        
        const data = await response.json();
        // console.log('💓 Activity updated:', data);
      } catch (error) {
        console.error('❌ Failed to update activity:', error);
      }
    };

    // Обновляем активность сразу при монтировании
    updateActivity();

    // Устанавливаем интервал для периодического обновления (каждую минуту как резервный механизм)
    const interval = setInterval(updateActivity, 60 * 1000); // 60 секунд

    return () => clearInterval(interval);
  }, [userId, currentUser]);

  // Проверяем URL и устанавливаем правильный экран при загрузке
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
        // Для обычных пользователей — только стандартный дашборд
        // Для CEO/админов — переключатель между версиями
        const isAdminUser = currentUser?.isAdmin === true || 
                           currentUser?.id === 'seo' || 
                           currentUser?.id === 'ceo' || 
                           currentUser?.role === 'ceo';
        
        if (!isAdminUser) {
          // Обычный пользователь — только стандартный дашборд
          return (
            <DashboardRu 
              currentUser={currentUser} 
              onNavigate={setActiveSection}
              onRefresh={handleRefresh} 
              refreshTrigger={refreshTrigger} 
            />
          );
        }
        
        // Админ/CEO — показываем переключатель
        return (
          <div>
            {/* Переключатель версий (только для админов) */}
            <div className="bg-white border-b border-[#E6E9EE] px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[#666]" style={{ fontSize: '14px' }}>Версия дашборда:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseOptimizedDashboard(false)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      !useOptimizedDashboard 
                        ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white shadow-sm' 
                        : 'bg-gray-100 text-[#666] hover:bg-gray-200'
                    }`}
                    style={{ fontSize: '13px', fontWeight: '600' }}
                  >
                    Стандартная
                  </button>
                  <button
                    onClick={() => setUseOptimizedDashboard(true)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      useOptimizedDashboard 
                        ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white shadow-sm' 
                        : 'bg-gray-100 text-[#666] hover:bg-gray-200'
                    }`}
                    style={{ fontSize: '13px', fontWeight: '600' }}
                  >
                    🚀 Оптимизированная
                  </button>
                </div>
              </div>
              <p className="text-[#999]" style={{ fontSize: '12px' }}>
                {useOptimizedDashboard ? '⚡ React Query кэширование + экспорт CSV (< 200ms)' : '📋 Обычная загрузка (2-3 сек)'}
              </p>
            </div>
            
            {/* Рендер выбранной версии */}
            {useOptimizedDashboard ? (
              <DashboardRuOptimized currentUser={currentUser} onRefresh={handleRefresh} refreshTrigger={refreshTrigger} />
            ) : (
              <DashboardRu 
                currentUser={currentUser} 
                onNavigate={setActiveSection}
                onRefresh={handleRefresh} 
                refreshTrigger={refreshTrigger} 
              />
            )}
          </div>
        );
      case 'структура':
      case 'structure':
        return <StructureDataViz currentUser={currentUser} refreshTrigger={refreshTrigger} />;
      case 'пользователи':
      case 'users':
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
        return <CatalogRu currentUser={currentUser} onOrderCreated={handleRefresh} onAddToCart={handleAddToCart} />;
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
      case 'финансы':
      case 'finance':
        return <AdminFinanceRu currentUser={currentUser} />;
      case 'панель':
      case 'control-panel':
        return <UnifiedDashboard currentUser={currentUser} />;
      case 'выплаты':
      case 'payouts':
        return <PayoutsAdminRu currentUser={currentUser} />;
      case 'управление-админами':
      case 'admin-management':
        return <AdminPanel currentUser={currentUser} />;
      default:
        return <DashboardRu 
          currentUser={currentUser} 
          onNavigate={setActiveSection}
          onRefresh={handleRefresh} 
          refreshTrigger={refreshTrigger} 
        />;
    }
  };

  return (
    <>
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
          {/* Mobile Header */}
          <header className="bg-white border-b border-[#E6E9EE] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden text-[#666]"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="text-[#39B7FF] font-bold">H₂ Платформа</h1>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-[#666]" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-full flex items-center justify-center text-[10px] font-bold px-1">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </header>
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              {renderSection()}
            </div>
          </main>
        </div>
      </div>
      
      {/* 🛒 Корзина */}
      <CartRu
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onOrderCreated={handleCartOrderCreated}
      />
    </>
  );
}
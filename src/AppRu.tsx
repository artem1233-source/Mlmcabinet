import { useState, useEffect } from 'react';
import { SidebarRu } from './components/SidebarRu';
import { TopBarRu } from './components/TopBarRu';
import { DashboardRu } from './components/DashboardRu';
import { StructureRu } from './components/StructureRu';
import { OrdersRu } from './components/OrdersRu';
import { EarningsRu } from './components/EarningsRu';
import { BalanceRu } from './components/BalanceRu';
import { CatalogRu } from './components/CatalogRu';
import { CartRu } from './components/CartRu';
import { TrainingRu } from './components/TrainingRu';
import { AchievementsRu } from './components/AchievementsRu';
import { NotificationsRu } from './components/NotificationsRu';
import { ProfileRu } from './components/ProfileRu';
// import { ProfileDebug } from './components/ProfileDebug'; // Закомментировано для сборки
import { SettingsRu } from './components/SettingsRu';
import { TelegramAuthRu } from './components/TelegramAuthRu';
import { EmailAuthRu } from './components/EmailAuthRu';
import { ResetPasswordRu } from './components/ResetPasswordRu';
import { ServerHealthCheck } from './components/ServerHealthCheck';
import TelegramWidgetTest from './components/TelegramWidgetTest';
import TelegramDiagnostic from './components/TelegramDiagnostic';
import { Toaster } from './components/ui/sonner';
import { PWAHead } from './components/PWAHead';
import { toast } from 'sonner';
import * as api from './utils/api';
import { isDemoMode, getCurrentDemoUser } from './utils/demoApi';
import { loadDemoDataFromStorage, generateAllDemoData, saveDemoDataToStorage } from './utils/demoData';
import { DemoUserSelector } from './components/DemoUserSelector';
import { AdminRu } from './components/AdminRu';
import { AdminPanel } from './components/AdminPanel';
import { MarketingToolsRu } from './components/MarketingToolsRu';
import { useDemoUser } from './contexts/DemoUserContext'; // 🆕 Импортируем хук

export default function AppRu() {
  // Если URL содержит /test-widget, показываем тестовую страницу
  if (window.location.pathname === '/test-widget') {
    return <TelegramWidgetTest />;
  }
  
  // Если URL содержит /diagnostic, показываем диагностику
  if (window.location.pathname === '/diagnostic') {
    return <TelegramDiagnostic />;
  }
  
  // Если URL содержит /health-check, показываем проверку сервера
  if (window.location.pathname === '/health-check') {
    return <ServerHealthCheck />;
  }
  
  // Если URL содержит /reset-password И type=recovery, показываем страницу сброса пароля
  // НЕ показываем для OAuth callback (без type=recovery)!
  if (window.location.pathname === '/reset-password' && window.location.hash.includes('type=recovery')) {
    return <ResetPasswordRu />;
  }
  
  // 🆕 ВСЕГДА получаем контекст (даже если не в демо-режиме), чтобы избежать условных хуков
  const demoContext = useDemoUser();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI state
  const [текущаяВкладка, setТекущаяВкладка] = useState('дашборд');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Cart state
  const [cartItems, setCartItems] = useState<Array<{product: any, quantity: number, isPartner: boolean}>>(() => {
    // Загружаем корзину из localStorage при инициализации
    try {
      const saved = localStorage.getItem('cart');
      if (!saved) return [];
      
      const items = JSON.parse(saved);
      
      // 🆕 Фильтруем товары с некорректным SKU
      const validItems = items.filter((item: any) => {
        const sku = item.product?.sku;
        if (!sku || sku.length < 2) {
          console.warn('⚠️ Removing cart item with invalid SKU:', sku, 'Product:', item.product?.название);
          return false;
        }
        return true;
      });
      
      // Если отфильтровали некорректные товары, сохраняем очищенную корзину
      if (validItems.length !== items.length) {
        console.log('🧹 Cleaned', items.length - validItems.length, 'invalid items from cart');
        console.log(' TIP: If you see SKU errors, clear localStorage: localStorage.clear(); location.reload();');
        setTimeout(() => {
          localStorage.setItem('cart', JSON.stringify(validItems));
        }, 0);
      }
      
      return validItems;
    } catch {
      return [];
    }
  });
  const [showCart, setShowCart] = useState(false);
  
  // Сохраняем корзину в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);
  
  // Handle OAuth callback
  const handleOAuthCallback = async () => {
    console.log('🚀 handleOAuthCallback STARTED!');
    try {
      console.log('📦 Importing Supabase...');
      const { createClient } = await import('@supabase/supabase-js');
      const { projectId, publicAnonKey } = await import('./utils/supabase/info');
      
      console.log('🔧 Creating Supabase client...');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      console.log('🔑 Getting OAuth session...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('OAuth callback error:', error);
        toast.error('Ошибка OAuth авторизации');
        setIsLoading(false);
        window.location.hash = '';
        return;
      }

      if (session?.access_token && session?.user) {
        console.log('OAuth successful, creating user in database...');
        
        // Вызываем API для создания/получения пользователя в базе данных
        const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/oauth`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ access_token: session.access_token }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('OAuth API Error:', errorData);
          throw new Error(errorData.error || 'OAuth API call failed');
        }

        const data = await response.json();
        
        if (!data.success || !data.user) {
          console.error('Invalid OAuth API response:', data);
          throw new Error('Invalid response from OAuth API');
        }

        // Сохраняем токен (используем userId как токен для API)
        api.setAuthToken(data.token);
        
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setIsLoading(false);
        
        // Очищаем hash из URL
        window.location.hash = '';
        
        toast.success(`Добро пожаловать, ${data.user.имя}!`);
      } else {
        console.error('No session found in OAuth callback');
        setIsLoading(false);
        window.location.hash = '';
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast.error('Ошибка обработки OAuth');
      setIsLoading(false);
      window.location.hash = '';
    }
  };
  
  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      console.log('🔍 CHECK SESSION STARTED');
      console.log('Current URL:', window.location.href);
      console.log('URL Hash:', window.location.hash);
      
      // ПРОВЕРКА ДЕМО ДАННЫХ: если старая версия - пере��оздаём
      const demoData = loadDemoDataFromStorage();
      if (!demoData) {
        // Демо данх нет - создаём новые
        console.log('🔄 Создание демо данных...');
        const newData = generateAllDemoData();
        saveDemoDataToStorage(newData);
        console.log('✅ Демо данные созданы!');
      }
      
      // Проверяем OAuth callback (access_token в URL hash)
      const hash = window.location.hash;
      console.log('🔍 Checking for OAuth callback...');
      console.log('Hash value:', hash);
      console.log('Has access_token?', hash.includes('access_token'));
      
      if (hash && hash.includes('access_token')) {
        console.log('✅ OAuth callback detected! Calling handleOAuthCallback...');
        await handleOAuthCallback();
        return;
      } else {
        console.log('❌ No OAuth callback detected');
      }
      
      const token = api.getAuthToken();
      if (token) {
        try {
          const data = await api.getCurrentUser();
          if (data.success && data.user) {
            setCurrentUser(data.user);
            setIsAuthenticated(true);
          } else {
            api.clearAuthToken();
          }
        } catch (error) {
          console.error('Session check error:', error);
          api.clearAuthToken();
        }
      } else if (isDemoMode()) {
        // Если нет токена но есть демо данные - автоматически логиним
        console.log('🎭 Auto-login demo user...');
        // 🆕 Используем getCurrentDemoUser() вместо freshDemoData.currentUser
        const currentDemoUser = getCurrentDemoUser();
        
        if (currentDemoUser) {
          // Сохраняем ID демо-пользователя как auth_token для загрзки изображений
          api.setAuthToken(currentDemoUser.id);
          setCurrentUser(currentDemoUser);
          setIsAuthenticated(true);
          console.log('🎭 Demo user loaded:', currentDemoUser.имя, currentDemoUser.фамилия);
        }
      }
      setIsLoading(false);
    };
    
    checkSession();
  }, []);
  
  // 🆕 Отслеживаем изменения демо-пользователя в контексте
  useEffect(() => {
    if (!isDemoMode() || !demoContext || !isAuthenticated) return;
    
    console.log('🎭 Demo context changed, currentUserId:', demoContext.currentUserId);
    
    // Обновляем currentUser когда меняется currentUserId в контексте
    if (demoContext.currentUser && demoContext.currentUser.id !== currentUser?.id) {
      console.log('🎭 Updating currentUser from context:', demoContext.currentUser.имя, demoContext.currentUser.фамилия);
      setCurrentUser(demoContext.currentUser);
      refreshData(); // Обновляем все данные
    }
  }, [demoContext?.currentUserId, demoContext?.currentUser, isAuthenticated]);
  
  // 🎮 Listen for navigate-to-achievements event from widgets
  useEffect(() => {
    const handleNavigateToAchievements = () => {
      setТекущаяВкладка('достижения');
      setMobileMenuOpen(false);
    };
    
    window.addEventListener('navigate-to-achievements', handleNavigateToAchievements);
    
    return () => {
      window.removeEventListener('navigate-to-achievements', handleNavigateToAchievements);
    };
  }, []);
  
  // Handle auth
  const handleAuth = (userData: any) => {
    try {
      console.log('Auth successful:', userData);
      
      if (!userData || !userData.id) {
        console.error('Invalid user data received:', userData);
        toast.error('Ошибка авторизации: некорректные данные пользователя');
        return;
      }
      
      // Store auth token (используем ID пользователя для всех режимов)
      api.setAuthToken(userData.id);
      
      setCurrentUser(userData);
      setIsAuthenticated(true);
      toast.success(`Добро пожаловать, ${userData.имя || 'пользователь'}!`);
    } catch (error) {
      console.error('Error handling auth:', error);
      toast.error('Ошибка при обработке авторизации');
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    api.logout();
    
    // Если был демо режим - очищаем демо данны
    if (isDemoMode()) {
      localStorage.removeItem('demoData');
      console.log('🎭 Demo data cleared');
    }
    
    // Очищаем корзину
    setCartItems([]);
    localStorage.removeItem('cart');
    
    setIsAuthenticated(false);
    setCurrentUser(null);
    setТекущаяВкладка('дашборд');
    toast.info('Вы вышли из системы');
  };
  
  // Refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  // 🆕 Обновить текущего демо-пользователя после переключения
  const handleDemoUserChange = async () => {
    if (!isDemoMode()) return;
    
    console.log('🎭 Demo user changed, refreshing...');
    const currentDemoUser = getCurrentDemoUser();
    
    if (currentDemoUser) {
      api.setAuthToken(currentDemoUser.id);
      setCurrentUser(currentDemoUser);
      refreshData(); // Обновляем все данные
      toast.success(`Перелючено на: ${currentDemoUser.имя} ${currentDemoUser.фамилия}`);
    }
  };
  
  // Update user data
  const updateUser = async () => {
    try {
      console.log('🔄 Updating user data...');
      const data = await api.getCurrentUser();
      console.log('📥 Received user data:', data);
      
      if (data.success && data.user) {
        console.log('✅ User data updated:', data.user);
        setCurrentUser(data.user);
        return data.user;
      } else {
        console.error('❌ Failed to get user data:', data);
        
        // 🆕 Если не удалось загрузить - восстанавливаем из демо данных
        if (isDemoMode()) {
          console.log('🔄 Attempting to restore from demo data...');
          const demoUser = getCurrentDemoUser();
          if (demoUser) {
            console.log('✅ Restored from demo data:', demoUser);
            setCurrentUser(demoUser);
            return demoUser;
          }
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error updating user:', error);
      
      // 🆕 При ошибке также пытаемся восстановить из демо данных
      if (isDemoMode()) {
        console.log('🔄 Error occurred, attempting to restore from demo data...');
        const demoUser = getCurrentDemoUser();
        if (demoUser) {
          console.log('✅ Restored from demo data:', demoUser);
          setCurrentUser(demoUser);
          return demoUser;
        }
      }
      
      return null;
    }
  };
  
  // Cart functions
  const handleAddToCart = (product: any, isPartner: boolean, quantity: number) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => (item.product.id || item.product.sku) === (product.id || product.sku) && item.isPartner === isPartner
      );
      
      if (existingIndex >= 0) {
        // Увеличиваем количество существующего товара
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      } else {
        // Добавляем новый товар
        return [...prev, { product, quantity, isPartner }];
      }
    });
  };
  
  const handleUpdateCartQuantity = (productId: string, isPartner: boolean, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId, isPartner);
      return;
    }
    
    setCartItems(prev => 
      prev.map(item => 
        (item.product.id || item.product.sku) === productId && item.isPartner === isPartner
          ? { ...item, quantity }
          : item
      )
    );
  };
  
  const handleRemoveFromCart = (productId: string, isPartner: boolean) => {
    setCartItems(prev => 
      prev.filter(item => 
        !((item.product.id || item.product.sku) === productId && item.isPartner === isPartner)
      )
    );
  };
  
  const handleClearCart = () => {
    setCartItems([]);
  };
  
  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Render current page
  const renderPage = () => {
    if (!currentUser) return null;
    
    switch (текущаяВкладка) {
      case 'дашборд':
        return (
          <DashboardRu 
            currentUser={currentUser}
            onRefresh={refreshData}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'структура':
        return (
          <StructureRu 
            currentUser={currentUser}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'заказы':
        return (
          <OrdersRu 
            currentUser={currentUser}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'доходы':
        return (
          <EarningsRu 
            currentUser={currentUser}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'баланс':
        return (
          <BalanceRu 
            currentUser={currentUser}
            onRefresh={updateUser}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'каталог':
        return (
          <CatalogRu
            currentUser={currentUser}
            onOrderCreated={() => {
              updateUser();
              refreshData();
            }}
            onAddToCart={handleAddToCart}
          />
        );
      case 'маркетинг':
        return <MarketingToolsRu currentUser={currentUser} />;
      case 'обучение':
        return <TrainingRu currentUser={currentUser} />;
      case 'достижения':
        return <AchievementsRu />;
      case 'уведомления':
        return <NotificationsRu currentUser={currentUser} />;
      case 'профиль':
        return (
          <ProfileRu 
            currentUser={currentUser}
            onUpdate={updateUser}
          />
        );
      case 'настройки':
        return (
          <SettingsRu 
            currentUser={currentUser}
            onLogout={handleLogout}
            onUpdate={updateUser}
          />
        );
      case 'админ':
        return (
          <AdminRu
            currentUser={currentUser}
          />
        );
      case 'управление-админами':
        return (
          <AdminPanel
            currentUser={currentUser}
          />
        );
      default:
        return (
          <DashboardRu 
            currentUser={currentUser}
            onRefresh={refreshData}
            refreshTrigger={refreshTrigger}
          />
        );
    }
  };
  
  // Show loading screen
  if (isLoading) {
    return (
      <>
        <PWAHead />
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7FAFC' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <p className="text-[#666]">Загрузка...</p>
          </div>
        </div>
      </>
    );
  }
  
  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <PWAHead />
        <EmailAuthRu 
          onAuth={handleAuth}
        />
        <Toaster position="top-right" />
      </>
    );
  }
  
  return (
    <>
      <PWAHead />
      <div className="min-h-screen flex max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <SidebarRu 
          текущаяВкладка={текущаяВкладка} 
          изменитьВкладку={(tab) => {
            setТекущаяВкладка(tab);
            setMobileMenuOpen(false);
          }} 
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentUser={currentUser}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          <TopBarRu 
            имяПользователя={currentUser?.имя || ''} 
            балансПользователя={currentUser?.баланс || 0}
            cartItemsCount={totalCartItems}
            onMenuClick={() => setMobileMenuOpen(true)}
            onLogoClick={() => {
              setТекущаяВкладка('дашборд');
              setMobileMenuOpen(false);
            }}
            onProfileClick={() => {
              setТекущаяВкладка('профиль');
              setMobileMenuOpen(false);
            }}
            onBalanceClick={() => {
              setТекущаяВкладка('баланс');
              setMobileMenuOpen(false);
            }}
            onCartClick={() => setShowCart(true)}
            onNotificationsClick={() => {
              setТекущаяВкладка('уведомления');
              setMobileMenuOpen(false);
            }}
          />
          
          {/* 🆕 Селектор демо-пользователей (только в демо-режиме) */}
          {/* УДАЛЕНО: Теперь переключение пользователей встроено в AdminToolbar */}
          
          <main className={`flex-1 overflow-auto pt-16 lg:pt-20`}>
            <div className="transition-opacity duration-300">
              {renderPage()}
            </div>
          </main>
        </div>
        
        {/* Cart Sidebar */}
        <CartRu
          isOpen={showCart}
          onClose={() => setShowCart(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onOrderCreated={() => {
            updateUser();
            refreshData();
          }}
        />
        
        <Toaster 
          position="bottom-right"
          duration={2000}
          closeButton
        />
      </div>
    </>
  );
}
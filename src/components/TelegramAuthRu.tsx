import { useEffect, useState } from 'react';
import { AlertCircle, Play } from 'lucide-react';
import { generateAllDemoData, saveDemoDataToStorage } from '../utils/demoData';

interface TelegramAuthProps {
  onAuth: (userData: any) => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
    onTelegramAuth?: (user: any) => void;
  }
}

export function TelegramAuthRu({ onAuth, onError }: TelegramAuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 TelegramAuthRu: Initializing...');
    
    // ========================================
    // 1. ПРОВЕРКА РЕФЕРАЛЬНОГО КОДА
    // ========================================
    
    // Проверяем URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get('ref');
    
    if (refFromUrl) {
      console.log('📎 Referral code from URL:', refFromUrl);
      setRefCode(refFromUrl);
      localStorage.setItem('refCode', refFromUrl);
    } else {
      // Проверяем сохранённый реф-код
      const savedRef = localStorage.getItem('refCode');
      if (savedRef) {
        console.log('📎 Referral code from localStorage:', savedRef);
        setRefCode(savedRef);
      }
    }

    // ========================================
    // 2. ГЛОБАЛЬНЫЙ CALLBACK ДЛЯ TELEGRAM LOGIN WIDGET
    // ========================================
    
    window.onTelegramAuth = async (user: any) => {
      console.log('🔵 Telegram Login Widget callback triggered!', user);
      await handleTelegramAuth(user);
    };

    // ========================================
    // 3. ЗАГРУЗКА TELEGRAM LOGIN WIDGET
    // ========================================
    
    // КРИТИЧЕСКИЙ МОМЕНТ: Telegram Login Widget требует особого подхода
    // Нельзя использовать innerHTML (скрипты не выполняются)
    // Нужно создать скрипт через createElement, но установить src ПОСЛЕ добавления в DOM
    
    const container = document.getElementById('telegram-login-h2enterbot');
    if (container) {
      // Очищаем контейнер
      container.innerHTML = '';
      
      // Получаем имя бота из env или используем h2enterbot
      const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'h2enterbot';
      
      // Создаём скрипт виджета
      const widgetScript = document.createElement('script');
      
      // ВАЖНО! Устанавливаем атрибуты ДО установки src
      widgetScript.setAttribute('data-telegram-login', botName);
      widgetScript.setAttribute('data-size', 'large');
      widgetScript.setAttribute('data-radius', '10');
      widgetScript.setAttribute('data-request-access', 'write');
      // КРИТИЧНО! Передаём ИМЯ функции, а не вызов
      widgetScript.setAttribute('data-onauth', 'onTelegramAuth');
      widgetScript.async = true;
      
      // Добавляем в DOM
      container.appendChild(widgetScript);
      
      // КРИТИЧНО! Устанавливаем src ПОСЛЕ добавления в DOM
      // Это заставляет браузер выполнить скрипт
      widgetScript.src = 'https://telegram.org/js/telegram-widget.js?22';
      
      console.log('✅ Telegram Login Widget script created and added to DOM');
      console.log('📋 Bot name:', botName);
      console.log('📋 Container:', container);
    } else {
      console.error('❌ Container #telegram-login-h2enterbot not found!');
    }

    // ========================================
    // 4. TELEGRAM MINI APP SUPPORT
    // ========================================
    
    // КРИТИЧНО! Загружаем telegram-web-app.js ТОЛЬКО если мы реально в Telegram
    // Проверяем наличие TelegramWebviewProxy (есть только в реальном Telegram)
    const isRealTelegramApp = !!(window as any).TelegramWebviewProxy || 
                               !!(window as any).external?.notify ||
                               (window.navigator.userAgent.includes('Telegram'));
    
    let miniAppScript: HTMLScriptElement | null = null;
    
    if (isRealTelegramApp) {
      console.log('📱 Detected real Telegram app, loading telegram-web-app.js');
      miniAppScript = document.createElement('script');
      miniAppScript.src = 'https://telegram.org/js/telegram-web-app.js';
      miniAppScript.async = true;
      
      miniAppScript.onload = () => {
        console.log('📱 Telegram Web App script loaded');
        checkTelegramMiniApp();
      };
      
      document.head.appendChild(miniAppScript);
    } else {
      console.log('🌐 Running in regular browser, skipping telegram-web-app.js');
    }

    // Cleanup
    return () => {
      if (miniAppScript?.parentNode) {
        miniAppScript.parentNode.removeChild(miniAppScript);
      }
      delete window.onTelegramAuth;
      console.log('🧹 TelegramAuthRu: Cleanup complete');
    };
  }, []);

  // ========================================
  // TELEGRAM MINI APP ПРОВЕРКА
  // ========================================
  
  const checkTelegramMiniApp = () => {
    try {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        console.log('📱 Telegram Mini App detected!', tg);
        
        // Инициализация
        tg.ready();
        tg.expand();
        
        // Проверяем start_param (реферальный код из deep link)
        const startParam = tg.initDataUnsafe?.start_param;
        if (startParam) {
          console.log('📎 Referral code from Mini App start_param:', startParam);
          setRefCode(startParam);
          localStorage.setItem('refCode', startParam);
        }
        
        // Проверяем наличие пользователя
        if (tg.initDataUnsafe?.user) {
          console.log('✅ User data available in Mini App, auto-authenticating...');
          // Используем единую функцию авторизации
          handleTelegramAuth(tg.initDataUnsafe.user);
        } else {
          console.log('ℹ️ No user data in Mini App');
        }
      } else {
        console.log('ℹ️ Not running in Telegram Mini App');
      }
    } catch (err) {
      console.error('❌ Error checking Telegram Mini App:', err);
    }
  };

  // ========================================
  // ОСНОВНАЯ ФУНКЦИЯ АВТОРИЗАЦИИ
  // ========================================
  
  const handleTelegramAuth = async (user: any) => {
    console.log('🔐 Starting Telegram authentication for user:', user.id);
    setLoading(true);
    setError(null);
    
    try {
      // Получаем переменные окружения
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!projectId || !anonKey) {
        throw new Error('❌ Конфигурация сервера не настроена. Проверьте переменные окружения VITE_SUPABASE_PROJECT_ID и VITE_SUPABASE_ANON_KEY.');
      }
      
      console.log('✅ Environment variables loaded');
      console.log('📡 Project ID:', projectId);
      
      // Получаем текущий реферальный код
      const currentRefCode = refCode || localStorage.getItem('refCode') || undefined;
      
      // Подготавливаем данные пользователя
      const userData = {
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        photo_url: user.photo_url || '',
        auth_date: user.auth_date || Math.floor(Date.now() / 1000),
        hash: user.hash || '',
        refCode: currentRefCode
      };
      
      console.log('📦 Prepared user data:', { ...userData, id: '***', hash: '***' });
      if (currentRefCode) {
        console.log('📎 Including referral code:', currentRefCode);
      }
      
      // Формируем URL backend
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/telegram-auth`;
      console.log('🌐 Backend URL:', url);
      
      // Отправляем запрос
      console.log('📤 Sending auth request...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(userData)
      });
      
      console.log('📥 Response status:', response.status);
      
      // Парсим ответ
      const data = await response.json();
      console.log('📄 Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `Ошибка сервера: ${response.status}`);
      }
      
      if (data.success === true && data.user) {
        console.log('✅ Authentication successful!');
        console.log('👤 User data received:', data.user);
        
        // Очищаем реферальный код из localStorage
        localStorage.removeItem('refCode');
        console.log('🧹 Referral code cleared from localStorage');
        
        // Сохраняем токен (используем ID пользователя как токен)
        const authToken = data.user.id?.toString() || data.user.telegramId?.toString();
        if (authToken) {
          localStorage.setItem('authToken', authToken);
          console.log('💾 Auth token saved to localStorage');
        }
        
        // Вызываем callback успешной авторизации
        onAuth(data.user);
        console.log('🎉 onAuth callback called');
      } else {
        throw new Error('Некорректный ответ сервера: отсутствует success или user');
      }
    } catch (err) {
      console.error('❌ Telegram auth error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка авторизации';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // ДЕМО РЕЖИМ
  // ========================================
  
  const handleDemoLogin = () => {
    console.log('🎭 Starting demo mode...');
    setLoading(true);
    setError(null);
    
    try {
      // Генерируем демо данные
      const demoData = generateAllDemoData();
      console.log('📊 Demo data generated:', demoData);
      
      // Сохраняем в localStorage
      saveDemoDataToStorage(demoData);
      console.log('💾 Demo data saved to localStorage');
      
      // Авторизуемся как демо пользователь (токен будет установлен в handleAuth)
      onAuth(demoData.currentUser);
      console.log('✅ Demo mode activated');
    } catch (err) {
      console.error('❌ Demo mode error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка демо режима';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // LOADING STATE
  // ========================================
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#F7FAFC] to-[#E6E9EE] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#666]" style={{ fontSize: '16px', fontWeight: '600' }}>
              Авторизация...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // MAIN UI
  // ========================================
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#F7FAFC] to-[#E6E9EE] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
          Партнёрская платформа H₂
        </h1>
        <p className="text-center text-[#666] mb-6">
          Войдите через Telegram для доступа к личному кабинету
        </p>
        
        {/* Referral code indicator */}
        {refCode && (
          <div className="mb-6 p-3 bg-gradient-to-r from-[#39B7FF]/10 to-[#12C9B6]/10 rounded-xl border border-[#39B7FF]/30">
            <p className="text-[#1E1E1E] text-center" style={{ fontSize: '13px', fontWeight: '600' }}>
              🎉 Вы регистрируетесь по реферальной ссылке!
            </p>
            <p className="text-[#666] text-center mt-1" style={{ fontSize: '12px' }}>
              Код: <span className="font-mono text-[#39B7FF]">{refCode}</span>
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700" style={{ fontSize: '14px', fontWeight: '600' }}>Ошибка</p>
              <p className="text-red-600" style={{ fontSize: '13px' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Login Buttons */}
        <div className="flex flex-col items-center gap-4 mb-8">
          {/* Telegram Login Widget Container */}
          <div id="telegram-login-h2enterbot" className="flex justify-center w-full"></div>
          
          <div className="w-full border-t border-gray-200 relative my-2">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[#666]" style={{ fontSize: '12px' }}>
              или
            </span>
          </div>
          
          {/* Demo Mode Button */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            <Play size={20} />
            <span style={{ fontWeight: '600' }}>Демо вход (50 человек, 6 месяцев)</span>
          </button>
          
          <p className="text-[#666] text-center" style={{ fontSize: '12px' }}>
            💡 В демо режиме вы увидите реалистичные данные без регистрации
          </p>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-gradient-to-r from-[#39B7FF]/10 to-[#12C9B6]/10 rounded-xl border border-[#39B7FF]/20 mb-6">
          <p className="text-[#1E1E1E] text-center mb-3" style={{ fontSize: '14px', fontWeight: '600' }}>
            Как войти:
          </p>
          <ol className="space-y-2 text-[#666]" style={{ fontSize: '13px' }}>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-[#39B7FF] text-white rounded-full flex items-center justify-center" style={{ fontSize: '11px', fontWeight: '600' }}>1</span>
              <span>Нажмите на синюю кнопку Telegram выше</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-[#39B7FF] text-white rounded-full flex items-center justify-center" style={{ fontSize: '11px', fontWeight: '600' }}>2</span>
              <span>Откроется всплывающее окно Telegram</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-[#39B7FF] text-white rounded-full flex items-center justify-center" style={{ fontSize: '11px', fontWeight: '600' }}>3</span>
              <span>Подтвердите предоставление доступа к данным</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-[#39B7FF] text-white rounded-full flex items-center justify-center" style={{ fontSize: '11px', fontWeight: '600' }}>4</span>
              <span>Готово! Вы войдёте автоматически</span>
            </li>
          </ol>
        </div>

        {/* Info */}
        <div className="p-4 bg-[#F7FAFC] rounded-xl mb-6">
          <p className="text-[#666] text-center mb-2" style={{ fontSize: '13px' }}>
            Для входа используется безопасная авторизация Telegram. Ваши данные защищены.
          </p>
          <p className="text-[#39B7FF] text-center" style={{ fontSize: '12px', fontWeight: '600' }}>
            💡 Вход с сайта и через Mini App используют единую базу данных
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#12C9B6] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>Быстрый вход</p>
              <p className="text-[#666]" style={{ fontSize: '13px' }}>Войдите одним кликом через Telegram</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#12C9B6] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>Безопасность</p>
              <p className="text-[#666]" style={{ fontSize: '13px' }}>Ваши данные надёжно защищены</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#12C9B6] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>MLM структура</p>
              <p className="text-[#666]" style={{ fontSize: '13px' }}>Получайте комиссии от команды</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

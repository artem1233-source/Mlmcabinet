import { useEffect, useState } from 'react';

export default function TelegramWidgetTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [statuses, setStatuses] = useState({
    callback: 'pending' as 'ok' | 'error' | 'pending',
    script: 'pending' as 'ok' | 'error' | 'pending',
    iframe: 'pending' as 'ok' | 'error' | 'pending',
    domain: window.location.hostname === 'h2touch.pro' ? 'ok' : 'error' as 'ok' | 'error' | 'pending',
  });
  const [userInfo, setUserInfo] = useState<any>(null);

  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
    console.log(message, data || '');
    setLogs(prev => [...prev, logEntry]);
  };

  useEffect(() => {
    addLog('🧪 Telegram Widget Test Page initialized');
    
    // Глобальная функция для callback
    (window as any).onTelegramAuth = function(user: any) {
      addLog('🎉 Telegram Login Widget callback triggered!', user);
      setStatuses(prev => ({ ...prev, callback: 'ok' }));
      setUserInfo(user);
    };

    addLog('✅ Global onTelegramAuth function created');
    setStatuses(prev => ({ ...prev, callback: 'ok' }));

    // Загрузка Telegram Widget
    addLog('📥 Loading Telegram Login Widget...');
    
    const container = document.getElementById('telegram-widget-test-container');
    if (container) {
      container.innerHTML = '';
      
      const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'h2enterbot';
      
      // Создаём скрипт виджета
      const widgetScript = document.createElement('script');
      
      // Устанавливаем атрибуты ДО установки src
      widgetScript.setAttribute('data-telegram-login', botName);
      widgetScript.setAttribute('data-size', 'large');
      widgetScript.setAttribute('data-radius', '10');
      widgetScript.setAttribute('data-request-access', 'write');
      // КРИТИЧНО! Передаём ИМЯ функции, а не вызов
      widgetScript.setAttribute('data-onauth', 'onTelegramAuth');
      widgetScript.async = true;
      
      // Добавляем в DOM
      container.appendChild(widgetScript);
      
      // Устанавливаем src ПОСЛЕ добавления в DOM
      widgetScript.src = 'https://telegram.org/js/telegram-widget.js?22';
      
      addLog('✅ Widget script created and added to DOM');
      addLog('📋 Bot name: ' + botName);
      setStatuses(prev => ({ ...prev, script: 'ok' }));
      
      // Проверка iframe через 2 секунды
      setTimeout(() => {
        const iframe = container.querySelector('iframe');
        if (iframe) {
          addLog('✅ Telegram Login Widget iframe found!');
          addLog('iframe src: ' + iframe.src);
          setStatuses(prev => ({ ...prev, iframe: 'ok' }));
        } else {
          addLog('❌ Telegram Login Widget iframe NOT found!');
          addLog('⚠️ Possible issues:');
          addLog('1. Domain not set in BotFather: /setdomain h2touch.pro');
          addLog('2. Wrong bot username');
          addLog('3. CORS/CSP restrictions');
          setStatuses(prev => ({ ...prev, iframe: 'error' }));
        }
      }, 2000);
      
      // Проверка через 5 секунд
      setTimeout(() => {
        const iframe = container.querySelector('iframe');
        if (!iframe) {
          addLog('⚠️ Still no iframe after 5 seconds');
          addLog('Container HTML: ' + container.innerHTML.substring(0, 200));
        }
      }, 5000);
    } else {
      addLog('❌ Container not found!');
      setStatuses(prev => ({ ...prev, script: 'error' }));
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, []);

  const getStatusColor = (status: 'ok' | 'error' | 'pending') => {
    switch (status) {
      case 'ok': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'pending': return 'bg-orange-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Telegram Login Widget Test</h1>
        <p className="text-gray-600 mb-6">Тестовая страница для проверки Telegram Login Widget</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="font-semibold mb-2">ℹ️ Настройки бота:</p>
          <ul className="text-sm space-y-1">
            <li>• Бот: @h2enterbot</li>
            <li>• Домен в BotFather: h2touch.pro ✅</li>
            <li>• Callback: onTelegramAuth</li>
          </ul>
        </div>

        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
          <p className="text-gray-500 text-center mb-4">👇 Telegram Login Widget должен появиться ниже:</p>
          <div id="telegram-widget-test-container" className="flex justify-center"></div>
        </div>

        {userInfo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="font-semibold mb-2">✅ Авторизация успешна!</p>
            <p className="text-sm">
              👤 {userInfo.first_name} {userInfo.last_name || ''}<br />
              🆔 ID: {userInfo.id}<br />
              {userInfo.username && `📝 Username: @${userInfo.username}`}<br />
              📅 Auth Date: {new Date(userInfo.auth_date * 1000).toLocaleString()}
            </p>
          </div>
        )}

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Диагностика</h2>
          
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-5 h-5 rounded-full ${getStatusColor(statuses.callback)}`}></div>
              <span>Глобальная функция onTelegramAuth</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-5 h-5 rounded-full ${getStatusColor(statuses.script)}`}></div>
              <span>Скрипт telegram-widget.js</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-5 h-5 rounded-full ${getStatusColor(statuses.iframe)}`}></div>
              <span>Iframe виджета</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-5 h-5 rounded-full ${getStatusColor(statuses.domain)}`}></div>
              <span>Текущий домен: <strong>{window.location.hostname}</strong></span>
            </div>
          </div>

          <h3 className="font-semibold mb-2">Console Logs:</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
            {logs.join('\n\n')}
          </pre>
        </div>
      </div>
    </div>
  );
}

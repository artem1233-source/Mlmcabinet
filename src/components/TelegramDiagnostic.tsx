import React, { useEffect, useState } from 'react';

interface DiagnosticResult {
  test: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export default function TelegramDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const updateResult = (test: string, status: DiagnosticResult['status'], message: string, details?: string) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.test === test);
      const newResult = { test, status, message, details };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newResult;
        return updated;
      }
      return [...prev, newResult];
    });
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    addLog('🚀 Начинаем диагностику Telegram Widget...');

    // 1. Проверка домена
    addLog('1️⃣ Проверка домена...');
    const currentDomain = window.location.hostname;
    if (currentDomain === 'h2touch.pro') {
      updateResult('domain', 'pass', 'Домен правильный: h2touch.pro');
      addLog('✅ Домен: h2touch.pro');
    } else {
      updateResult('domain', 'fail', `Неправильный домен: ${currentDomain}`, 'Виджет настроен на h2touch.pro');
      addLog(`❌ Домен: ${currentDomain} (ожидается h2touch.pro)`);
    }

    // 2. Проверка HTTPS
    addLog('2️⃣ Проверка HTTPS...');
    if (window.location.protocol === 'https:') {
      updateResult('https', 'pass', 'HTTPS активен');
      addLog('✅ HTTPS активен');
    } else {
      updateResult('https', 'fail', 'HTTPS не активен', 'Telegram Widget требует HTTPS');
      addLog('❌ HTTPS не активен');
    }

    // 3. Проверка доступности telegram.org
    addLog('3️⃣ Проверка доступности telegram.org...');
    try {
      const response = await fetch('https://telegram.org/favicon.ico', { mode: 'no-cors' });
      updateResult('telegram-access', 'pass', 'telegram.org доступен');
      addLog('✅ telegram.org доступен');
    } catch (error) {
      updateResult('telegram-access', 'fail', 'Не удалось подключиться к telegram.org', error instanceof Error ? error.message : 'Unknown error');
      addLog(`❌ telegram.org недоступен: ${error}`);
    }

    // 4. Проверка загрузки скрипта
    addLog('4️⃣ Проверка загрузки telegram-widget.js...');
    const scriptExists = document.querySelector('script[src*="telegram.org/js/telegram-widget.js"]');
    if (scriptExists) {
      updateResult('script', 'warning', 'Скрипт уже загружен в документе');
      addLog('⚠️ Скрипт уже существует');
    }

    // Загружаем скрипт
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    
    script.onload = () => {
      updateResult('script', 'pass', 'Скрипт telegram-widget.js загружен');
      addLog('✅ Скрипт загружен успешно');
      
      // 5. Проверка window.Telegram
      setTimeout(() => {
        addLog('5️⃣ Проверка window.Telegram...');
        if (window.Telegram && window.Telegram.Login) {
          updateResult('telegram-object', 'pass', 'window.Telegram.Login доступен');
          addLog('✅ window.Telegram.Login найден');
          
          // 6. Попытка создать виджет
          addLog('6️⃣ Создание тестового виджета...');
          createTestWidget();
        } else {
          updateResult('telegram-object', 'fail', 'window.Telegram.Login не найден');
          addLog('❌ window.Telegram.Login не найден');
          addLog(`window.Telegram: ${JSON.stringify(window.Telegram)}`);
        }
      }, 1000);
    };

    script.onerror = () => {
      updateResult('script', 'fail', 'Ошибка загрузки скрипта');
      addLog('❌ Не удалось загрузить скрипт');
    };

    document.head.appendChild(script);
  };

  const createTestWidget = () => {
    const container = document.getElementById('telegram-widget-container');
    if (!container) {
      addLog('❌ Контейнер не найден');
      return;
    }

    addLog('Параметры виджета:');
    addLog('  bot_id: 8065673558');
    addLog('  origin: ' + window.location.origin);
    addLog('  embed: 1');

    try {
      // @ts-ignore
      if (window.Telegram && window.Telegram.Login) {
        // @ts-ignore
        window.Telegram.Login.auth(
          { bot_id: '8065673558', request_access: 'write', embed: 1 },
          (data: any) => {
            if (data) {
              addLog('✅ Авторизация успешна!');
              addLog('Данные: ' + JSON.stringify(data));
              updateResult('widget', 'pass', 'Виджет работает!', JSON.stringify(data));
            } else {
              addLog('❌ Авторизация отменена');
            }
          }
        );
        
        updateResult('widget-creation', 'pass', 'Попытка создания виджета выполнена');
        addLog('✅ Функция создания виджета вызвана');
        
        // Проверка создания iframe через 2 секунды
        setTimeout(() => {
          const iframe = container.querySelector('iframe');
          if (iframe) {
            updateResult('widget', 'pass', 'Виджет (iframe) создан!', `src: ${iframe.src}`);
            addLog('✅ iframe создан: ' + iframe.src);
          } else {
            updateResult('widget', 'fail', 'iframe не создан', 'Проверьте настройки бота и домен');
            addLog('❌ iframe не появился в контейнере');
            addLog('HTML контейнера: ' + container.innerHTML);
          }
        }, 2000);
      }
    } catch (error) {
      updateResult('widget-creation', 'fail', 'Ошибка при создании виджета', error instanceof Error ? error.message : 'Unknown error');
      addLog(`❌ Ошибка: ${error}`);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass': return 'bg-green-50 border-green-200';
      case 'fail': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl mb-8">🔬 Telegram Widget - Полная диагностика</h1>

        {/* Результаты тестов */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl mb-4">📊 Результаты проверок</h2>
          <div className="space-y-3">
            {results.length === 0 && (
              <p className="text-gray-500">Запуск диагностики...</p>
            )}
            {results.map((result, index) => (
              <div key={index} className={`p-4 border rounded-lg ${getStatusColor(result.status)}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getStatusIcon(result.status)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{result.test}</div>
                    <div className="text-sm mt-1">{result.message}</div>
                    {result.details && (
                      <div className="text-xs mt-2 p-2 bg-white/50 rounded border border-black/10 font-mono">
                        {result.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Тестовый контейнер для виджета */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl mb-4">🎯 Тестовый виджет</h2>
          <div 
            id="telegram-widget-container"
            className="min-h-[50px] border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center"
          >
            <p className="text-gray-500">Виджет должен появиться здесь...</p>
          </div>
        </div>

        {/* Логи */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl mb-4">📝 Детальный лог</h2>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 && <p>Ожидание логов...</p>}
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>

        {/* Информация о конфигурации */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl mb-4">⚙️ Текущая конфигурация</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>URL:</strong> {window.location.href}</div>
            <div><strong>Домен:</strong> {window.location.hostname}</div>
            <div><strong>Протокол:</strong> {window.location.protocol}</div>
            <div><strong>User Agent:</strong> {navigator.userAgent}</div>
            <div><strong>Bot Username:</strong> @h2enterbot</div>
            <div><strong>Bot ID:</strong> 8065673558</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Расширяем Window для TypeScript
declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (params: any, callback: (data: any) => void) => void;
      };
    };
  }
}

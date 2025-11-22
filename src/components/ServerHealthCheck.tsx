import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export function ServerHealthCheck() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [message, setMessage] = useState('Проверка соединения с сервером...');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    setStatus('checking');
    setMessage('Проверка соединения с сервером...');
    
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      console.log('Checking server health...');
      console.log('Project ID:', projectId);
      console.log('Anon Key:', publicAnonKey ? `${publicAnonKey.substring(0, 20)}...` : 'NOT FOUND');
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/health`;
      console.log('Health check URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      let data;
      try {
        const text = await response.text();
        console.log('Response text:', text);
        data = text ? JSON.parse(text) : null;
        console.log('Response data:', data);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setStatus('error');
        setMessage('❌ Сервер вернул невалидный JSON');
        setDetails({
          url,
          projectId,
          status: response.status,
          statusText: response.statusText,
          parseError: String(parseError),
          hint: response.status === 404 
            ? 'Edge Function не найдена. Убедитесь что функция задеплоена в Supabase.' 
            : 'Сервер вернул невалидный ответ.'
        });
        return;
      }
      
      if (response.ok && data?.status === 'ok') {
        setStatus('ok');
        setMessage('✅ Сервер работает нормально!');
        setDetails({
          url,
          projectId,
          status: response.status,
          data,
          timestamp: new Date().toISOString()
        });
      } else {
        setStatus('error');
        setMessage(`❌ Сервер вернул ошибку (${response.status})`);
        setDetails({
          url,
          projectId,
          status: response.status,
          statusText: response.statusText,
          data,
          hint: response.status === 404 
            ? 'Edge Function не найдена. Проверьте деплой в Supabase Dashboard.' 
            : response.status === 403
            ? 'Доступ запрещён. Проверьте настройки авторизации.'
            : 'Неожиданный ответ сервера.'
        });
      }
    } catch (error) {
      console.error('Health check error:', error);
      setStatus('error');
      setMessage(`❌ Ошибка подключения`);
      setDetails({
        error: error instanceof Error ? error.message : String(error),
        type: error instanceof TypeError ? 'Network Error' : 'Unknown Error',
        hint: 'Проверьте подключение к интернету и убедитесь что Edge Function задеплоена.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7FAFC] to-[#E6E9EE] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-[#1E1E1E] mb-6">
            Проверка сервера
          </h1>

          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            {status === 'checking' && (
              <>
                <Loader className="w-6 h-6 text-[#39B7FF] animate-spin" />
                <span className="text-[#666]">{message}</span>
              </>
            )}
            {status === 'ok' && (
              <>
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-green-700 font-semibold">{message}</span>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="w-6 h-6 text-red-500" />
                <span className="text-red-700 font-semibold">{message}</span>
              </>
            )}
          </div>

          {details && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm overflow-auto">
              <pre>{JSON.stringify(details, null, 2)}</pre>
            </div>
          )}

          <button
            onClick={checkServer}
            className="mt-6 w-full py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-xl hover:opacity-90 transition-all font-semibold"
          >
            Проверить снова
          </button>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-semibold text-blue-900 mb-2">Что проверяется:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>✓ Доступность Supabase Edge Function</li>
              <li>✓ Правильность роута /health</li>
              <li>✓ CORS настройки</li>
              <li>✓ Общая работоспособность сервера</li>
            </ul>
          </div>

          <div className="mt-4">
            <a
              href="/"
              className="text-[#39B7FF] hover:underline font-semibold"
            >
              ← Вернуться к регистрации
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

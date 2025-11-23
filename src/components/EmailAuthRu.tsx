import { useState } from 'react';
import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import * as api from '../utils/api';

interface EmailAuthProps {
  onAuth: (userData: any) => void;
}

export function EmailAuthRu({ onAuth }: EmailAuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'admin-register'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [sponsorInfo, setSponsorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Валидация
    if (!email.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (mode === 'register' && (!firstName.trim() || !lastName.trim())) {
      setError('Пожалуйста, введите ваше имя и фамилию');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Пожалуйста, введите корректный email');
      return;
    }

    setLoading(true);

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      if (mode === 'register') {
        // Регистрация
        console.log('Attempting signup with:', { email: email.trim(), name: `${firstName.trim()} ${lastName.trim()}` });
        console.log('Project ID:', projectId);
        console.log('Has Anon Key:', !!publicAnonKey);
        
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/signup`;
        console.log('Signup URL:', url);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            referralCode: referralCode.trim() || null,
          }),
        });

        console.log('Signup response status:', response.status);
        console.log('Signup response headers:', Object.fromEntries(response.headers.entries()));
        
        let data;
        try {
          data = await response.json();
          console.log('Signup response data:', data);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          const text = await response.text();
          console.error('Response text:', text);
          setDebugInfo({ 
            status: response.status, 
            url,
            parseError: String(parseError),
            responseText: text 
          });
          throw new Error(`Сервер вернул невалидный ответ (статус ${response.status}). Возможно Edge Function не задеплоена.`);
        }

        if (!response.ok) {
          console.error('Signup failed:', data);
          setDebugInfo({ response: data, status: response.status, url });
          throw new Error(data.error || 'Ошибка регистрации');
        }

        setSuccess('Регистрация успешна! Входим...');
        
        // Автоматический вход после регистрации
        setTimeout(() => handleLogin(), 1000);
      } else {
        // Вход
        await handleLogin();
      }
    } catch (err) {
      console.error('Auth error:', err);
      setDebugInfo((prev: any) => ({ ...prev, error: err instanceof Error ? err.message : String(err) }));
      setError(err instanceof Error ? err.message : 'Ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      console.log('Attempting login with:', { email: email.trim() });
      console.log('Project ID:', projectId);
      console.log('Has Anon Key:', !!publicAnonKey);
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/login`;
      console.log('Login URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          login: email.trim(),
          password: password,
        }),
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));
      
      let data;
      try {
        data = await response.json();
        console.log('Login response data:', data);
      } catch (parseError) {
        console.error('Failed to parse login response:', parseError);
        const text = await response.text();
        console.error('Response text:', text);
        throw new Error(`Сервер вернул невалидный ответ (статус ${response.status}). Возможно Edge Function не задеплоена.`);
      }

      if (!response.ok) {
        console.error('Login failed:', data);
        // Show more detailed error message if available
        const errorMsg = data.details ? `${data.error}\n\n${data.details}` : data.error;
        throw new Error(errorMsg || 'Ошибка входа');
      }

      if (data.user && data.access_token) {
        console.log('✅ Login successful, saving auth token for user:', data.user.id);
        
        // Используем api.setAuthToken для сохранения userId
        // (система использует userId как токен)
        api.setAuthToken(data.user.id);
        
        onAuth(data.user);
      } else {
        throw new Error('Неверный ответ сервера');
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Пожалуйста, введите email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Пожалуйста, введите корректный email');
      return;
    }

    setLoading(true);

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      console.log('Attempting password reset for:', email.trim());
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/reset-password`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка восстановления пароля');
      }

      setSuccess('Письмо со ссылкой для восстановления пароля отправлено на ваш email!');
      setTimeout(() => setMode('login'), 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github' | 'apple') => {
    setLoading(true);
    setError(null);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      console.log(`Attempting ${provider} OAuth login...`);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      // OAuth redirect будет автоматически
      console.log(`${provider} OAuth initiated`);
    } catch (err) {
      console.error(`${provider} OAuth error:`, err);
      setError(err instanceof Error ? err.message : `Ошибка входа через ${provider}`);
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => handleOAuthLogin('google');
  const handleAppleLogin = () => handleOAuthLogin('apple');
  const handleGitHubLogin = () => handleOAuthLogin('github');

  const handleAdminRegister = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('👑 Admin Registration...');
      
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      console.log('Attempting admin signup with:', { email: email.trim(), name: `${firstName.trim()} ${lastName.trim()}` });
      console.log('Project ID:', projectId);
      console.log('Has Anon Key:', !!publicAnonKey);
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/signup-admin`;
      console.log('Admin Signup URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          referralCode: referralCode.trim() || null,
          adminCode: adminCode.trim(),
        }),
      });

      console.log('Admin Signup response status:', response.status);
      console.log('Admin Signup response headers:', Object.fromEntries(response.headers.entries()));
      
      let data;
      try {
        data = await response.json();
        console.log('Admin Signup response data:', data);
      } catch (parseError) {
        console.error('Failed to parse admin signup response:', parseError);
        const text = await response.text();
        console.error('Response text:', text);
        setDebugInfo({ 
          status: response.status, 
          url,
          parseError: String(parseError),
          responseText: text 
        });
        throw new Error(`Сервер вернул невалидный ответ (статус ${response.status}). Возможно Edge Function не задеплоена.`);
      }

      if (!response.ok) {
        console.error('Admin Signup failed:', data);
        setDebugInfo({ response: data, status: response.status, url });
        throw new Error(data.error || 'Ошибка регистрации администратора');
      }

      setSuccess('Регистрация администратора успешна! Входим...');
      
      // Автоматический вход после регистрации
      setTimeout(() => handleLogin(), 1000);
    } catch (err) {
      console.error('Admin Register error:', err);
      setDebugInfo((prev: any) => ({ ...prev, error: err instanceof Error ? err.message : String(err) }));
      setError(err instanceof Error ? err.message : 'Ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

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
        <p className="text-center text-[#666] mb-8">
          {mode === 'login' && 'Войдите в личный кабинет'}
          {mode === 'register' && 'Создайте новый аккаунт'}
          {mode === 'forgot' && 'Восстановление пароля'}
          {mode === 'admin-register' && 'Регистрация администратора'}
        </p>

        {/* Toggle Mode */}
        {mode !== 'forgot' && (
          <div className="flex gap-2 mb-6 bg-[#F7FAFC] p-1 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white shadow-md text-[#39B7FF]'
                  : 'text-[#666] hover:text-[#39B7FF]'
              }`}
              style={{ fontWeight: '600', fontSize: '14px' }}
            >
              Вход
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white shadow-md text-[#39B7FF]'
                  : 'text-[#666] hover:text-[#39B7FF]'
              }`}
              style={{ fontWeight: '600', fontSize: '14px' }}
            >
              Регистрация
            </button>
          </div>
        )}
        
        {mode === 'forgot' && (
          <button
            onClick={() => setMode('login')}
            className="mb-6 text-[#39B7FF] hover:underline text-sm"
          >
            ← ��ернуться к входу
          </button>
        )}

        {mode === 'admin-register' && (
          <button
            onClick={() => setMode('login')}
            className="mb-6 text-[#39B7FF] hover:underline text-sm"
          >
            ← Вернуться к входу
          </button>
        )}
        
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700" style={{ fontSize: '14px', fontWeight: '600' }}>Успешно!</p>
              <p className="text-green-600" style={{ fontSize: '13px' }}>{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-700" style={{ fontSize: '14px', fontWeight: '600' }}>Ошибка</p>
                <p className="text-red-600 whitespace-pre-line" style={{ fontSize: '13px' }}>{error}</p>
              </div>
            </div>
            
            {/* Auth Diagnostic Link */}
            {mode === 'login' && error.includes('пароль') && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <a 
                  href="/auth-diagnostic" 
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <AlertCircle className="w-4 h-4" />
                  Проверить статус учетной записи
                </a>
              </div>
            )}
            
            {debugInfo && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-red-600 hover:text-red-700 font-semibold">
                  Показать техническую информацию
                </summary>
                <div className="mt-2 p-2 bg-gray-900 text-green-400 rounded font-mono overflow-auto max-h-40">
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              </details>
            )}
          </div>
        )}

        {/* Input Form */}
        <div className="space-y-4 mb-6">
          {(mode === 'register' || mode === 'admin-register') && (
            <div>
              <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                Ваше имя
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Например: Иван"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {(mode === 'register' || mode === 'admin-register') && (
            <div>
              <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                Ваша фамилия
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Например: Петров"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                disabled={loading}
                onKeyPress={(e) => mode === 'forgot' && e.key === 'Enter' && handleForgotPassword()}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Минимум 6 символов"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                Реферальный код
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Введите реферальный код"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {mode === 'admin-register' && (
            <div>
              <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                Код администратора
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
                <input
                  type="text"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Введите код администратора"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {mode === 'forgot' ? (
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span style={{ fontWeight: '600' }}>Отправка...</span>
                </>
              ) : (
                <span style={{ fontWeight: '600' }}>Отправить ссылку для восстановления</span>
              )}
            </button>
          ) : (
            <button
              onClick={mode === 'admin-register' ? handleAdminRegister : handleSubmit}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span style={{ fontWeight: '600' }}>
                    {mode === 'login' ? 'Вход...' : 'Регистрация...'}
                  </span>
                </>
              ) : (
                <span style={{ fontWeight: '600' }}>
                  {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                </span>
              )}
            </button>
          )}
        </div>
        
        {/* Forgot Password Link */}
        {mode === 'login' && (
          <div className="text-center mb-6">
            <button
              onClick={() => setMode('forgot')}
              className="text-[#39B7FF] hover:underline text-sm"
            >
              Забыли пароль?
            </button>
          </div>
        )}

        {/* Divider */}
        {mode !== 'forgot' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#666]">или войти через</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-6">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-6 border-2 border-gray-300 hover:border-gray-400 bg-white text-[#1E1E1E] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span style={{ fontWeight: '600' }}>Продолжить с Google</span>
              </button>

              {/* Apple */}
              <button
                onClick={handleAppleLogin}
                disabled={loading}
                className="w-full py-3 px-6 border-2 border-gray-900 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span style={{ fontWeight: '600' }}>Продолжить с Apple</span>
              </button>

              {/* GitHub */}
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                className="w-full py-3 px-6 border-2 border-gray-700 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
                <span style={{ fontWeight: '600' }}>Продолжить с GitHub</span>
              </button>
            </div>

            {/* Admin Registration Link */}
            {mode === 'login' && (
              <div className="mt-4 text-center space-y-2">
                <div>
                  <a
                    href="/register"
                    className="text-[#39B7FF] hover:underline text-sm font-semibold"
                  >
                    📝 Регистрация партнера (получить ID)
                  </a>
                </div>
                <div>
                  <button
                    onClick={() => setMode('admin-register')}
                    className="text-purple-600 hover:underline text-sm font-semibold"
                  >
                    👑 Создать учётную запись CEO (код CEO-2024)
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div className="mt-8 p-4 bg-[#F7FAFC] rounded-xl">
          <p className="text-[#666] text-center" style={{ fontSize: '13px' }}>
            {mode === 'register' 
              ? 'После регистрации вы получите доступ к личному кабинету партнёра'
              : 'Это MLM система для водородного порошка и оздоровительных продуктов'
            }
          </p>
          {error && (
            <div className="mt-3 space-y-2">
              <div className="text-center">
                <a 
                  href="/health-check" 
                  className="text-[#39B7FF] hover:underline text-xs font-semibold"
                >
                  🔍 Проверить состояние сервера
                </a>
              </div>
              {debugInfo?.status === 404 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 text-xs font-semibold mb-1">
                    ⚠️ Edge Function не найдена (404)
                  </p>
                  <p className="text-orange-700 text-xs">
                    Возможно Edge Function не задеплоена. См. файл DEPLOY_EDGE_FUNCTION.md
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#12C9B6] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>4 ровня партнёрства</p>
              <p className="text-[#666]" style={{ fontSize: '13px' }}>От Уровня 0 до Уровня 3</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#12C9B6] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>Прозрачные выплаты</p>
              <p className="text-[#666]" style={{ fontSize: '13px' }}>Комиссии по 3 уровням низ</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#12C9B6] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>Построение структуры</p>
              <p className="text-[#666]" style={{ fontSize: '13px' }}>Растите команду и доходы</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
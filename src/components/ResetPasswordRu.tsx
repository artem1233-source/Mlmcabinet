import { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

export function ResetPasswordRu() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Получаем access_token из URL hash (Supabase возвращает его после клика на ссылку)
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    
    if (token) {
      setAccessToken(token);
      console.log('Access token found in URL');
    } else {
      setError('Недействительная ссылка для сброса пароля. Пожалуйста, запросите новую.');
    }
  }, []);

  const handleResetPassword = async () => {
    setError(null);

    if (!password || !confirmPassword) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (!accessToken) {
      setError('Недействительная ссылка для сброса пароля');
      return;
    }

    setLoading(true);

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/update-password`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          access_token: accessToken,
          new_password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обновления пароля');
      }

      setSuccess(true);
      
      // Перенаправляем на страницу входа через 3 секунды
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#F7FAFC] to-[#E6E9EE] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-center text-[#1E1E1E] mb-4" style={{ fontSize: '24px', fontWeight: '700' }}>
            Пароль успешно обновлён!
          </h1>
          
          <p className="text-center text-[#666] mb-6">
            Сейчас вы будете перенаправлены на страницу входа...
          </p>
          
          <a
            href="/"
            className="block text-center text-[#39B7FF] hover:underline"
          >
            Войти сейчас
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#F7FAFC] to-[#E6E9EE] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center shadow-lg">
            <Lock className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
          Установка нового пароля
        </h1>
        <p className="text-center text-[#666] mb-8">
          Введите новый пароль для вашего аккаунта
        </p>

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

        {/* Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
              Новый пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                disabled={loading || !accessToken}
              />
            </div>
          </div>

          <div>
            <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
              Подтвердите пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
                placeholder="Повторите пароль"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                disabled={loading || !accessToken}
              />
            </div>
          </div>

          <button
            onClick={handleResetPassword}
            disabled={loading || !accessToken}
            className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span style={{ fontWeight: '600' }}>Обновление...</span>
              </>
            ) : (
              <span style={{ fontWeight: '600' }}>Установить новый пароль</span>
            )}
          </button>
        </div>

        <div className="text-center">
          <a href="/" className="text-[#39B7FF] hover:underline text-sm">
            ← Вернуться к входу
          </a>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Send, User, AlertCircle } from 'lucide-react';

interface SimpleAuthProps {
  onAuth: (userData: any) => void;
}

export function SimpleAuthRu({ onAuth }: SimpleAuthProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!name.trim()) {
      setError('Пожалуйста, введите ваше имя');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call API to login
      const { login } = await import('../utils/api');
      const data = await login(name.trim());
      
      if (data.success && data.user) {
        onAuth(data.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка входа. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { login } = await import('../utils/api');
      const data = await login('Артём Козлов');
      
      if (data.success && data.user) {
        onAuth(data.user);
      } else {
        throw new Error('Demo login failed');
      }
    } catch (err) {
      console.error('Demo login error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка входа');
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
          Введите ваше имя для входа в личный кабинет
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

        {/* Input Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
              Ваше имя
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Например: Иван Петров"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span style={{ fontWeight: '600' }}>Вход...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span style={{ fontWeight: '600' }}>Войти</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-[#666]">или</span>
          </div>
        </div>

        {/* Demo Login */}
        <button
          onClick={handleDemoLogin}
          className="w-full py-3 px-6 border-2 border-[#39B7FF] text-[#39B7FF] hover:bg-[#39B7FF] hover:text-white rounded-xl transition-all"
        >
          <span style={{ fontWeight: '600' }}>Войти как Артём (демо)</span>
        </button>

        {/* Info */}
        <div className="mt-8 p-4 bg-[#F7FAFC] rounded-xl">
          <p className="text-[#666] text-center" style={{ fontSize: '13px' }}>
            Это демо-версия MLM системы для водородного порошка и оздоровительных продуктов.
          </p>
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
              <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>4 уровня партнёрства</p>
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
              <p className="text-[#666]" style={{ fontSize: '13px' }}>Комиссии по 3 уровням вниз</p>
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

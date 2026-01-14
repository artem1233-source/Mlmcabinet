import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export function AdminRightsDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminRights();
  }, []);

  const checkAdminRights = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('Пользователь не авторизован. Сначала войдите в систему.');
        setLoading(false);
        return;
      }

      console.log('🔐 Checking admin rights for userId:', userId);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/user/check-admin`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to check admin rights');
        setLoading(false);
        return;
      }

      setResult(data);
      console.log('✅ Admin rights check result:', data);
    } catch (err) {
      console.error('❌ Admin rights check error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const renderFlag = (label: string, value: boolean) => (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100">
      <div className="flex-1 text-sm text-gray-700">{label}</div>
      <div className="flex items-center gap-1">
        {value ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-700">ДА</span>
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">НЕТ</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Диагностика прав администратора
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Проверка прав доступа к админским функциям
              </p>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Проверка прав доступа...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Ошибка</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6">
              {/* Общая информация */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Информация о пользователе
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ID пользователя:</span>
                    <span className="text-sm font-medium text-gray-900">{result.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium text-gray-900">{result.email || 'Не указан'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Имя:</span>
                    <span className="text-sm font-medium text-gray-900">{result.name}</span>
                  </div>
                </div>
              </div>

              {/* Статус администратора */}
              <div className={`rounded-xl p-6 ${result.isAdmin ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  {result.isAdmin ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {result.isAdmin ? 'У вас есть права администратора' : 'У вас нет прав администратора'}
                    </h2>
                    <p className="text-sm text-gray-700 mt-1">
                      {result.isAdmin
                        ? 'Вы можете получать доступ к админским функциям'
                        : 'Для доступа к админским функциям требуются права администратора'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Детали прав доступа */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Детали проверки прав
                </h2>
                <div className="space-y-1">
                  {renderFlag('Флаг isAdmin установлен', result.flags.hasAdminFlag)}
                  {renderFlag('Email admin@admin.com', result.flags.isAdminEmail)}
                  {renderFlag('ID пользователя = "ceo"', result.flags.isCEO)}
                  {renderFlag('ID пользователя = "1" или "001"', result.flags.isFirstUser)}
                  {renderFlag('Тип пользователя = "admin"', result.flags.hasAdminType)}
                  {renderFlag('Роль пользователя = "admin"', result.flags.hasAdminRole)}
                  {renderFlag('ID начинается с "admin-"', result.flags.hasAdminIdPrefix)}
                </div>
              </div>

              {/* Рекомендации */}
              {!result.isAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Рекомендации</h3>
                  <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
                    <li>Войдите под учётной записью администратора</li>
                    <li>Используйте email admin@admin.com для админского доступа</li>
                    <li>Первый зарегистрированный пользователь (ID=1) автоматически получает права администратора</li>
                  </ul>
                </div>
              )}

              {/* Кнопка повторной проверки */}
              <div className="flex justify-center">
                <button
                  onClick={checkAdminRights}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  Проверить снова
                </button>
              </div>
            </div>
          )}

          {/* Ссылка назад */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
            >
              ← Вернуться на главную
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

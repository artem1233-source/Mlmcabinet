import { useState } from 'react';
import { AlertCircle, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

export function AuthDiagnostic() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    if (!email.trim()) {
      setError('Введите email для проверки');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/debug/check-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка проверки');
      }

      setResult(data);
    } catch (err) {
      console.error('Check auth error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка проверки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F7FAFC' }}>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              🔍 Диагностика авторизации
            </CardTitle>
            <CardDescription>
              Проверьте состояние учетной записи пользователя в системе
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email для проверки (например: admin@admin.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAuth()}
              />
              <Button
                onClick={checkAuth}
                disabled={loading}
                style={{ backgroundColor: '#39B7FF' }}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Проверить
                  </>
                )}
              </Button>
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {/* Email */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-700 mb-1">Проверяемый Email:</div>
                  <div className="font-mono text-sm">{result.email}</div>
                </div>

                {/* KV Store Status */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    {result.kvStore.exists ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <h3 className="font-semibold">
                      KV Store (База данных приложения)
                    </h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус:</span>
                      <span className={result.kvStore.exists ? 'text-green-600 font-medium' : 'text-red-600'}>
                        {result.kvStore.exists ? '✅ Найден' : '❌ Не найден'}
                      </span>
                    </div>
                    {result.kvStore.exists && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">User ID:</span>
                          <span className="font-mono">{result.kvStore.userId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-mono text-xs">{result.kvStore.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Права админа:</span>
                          <span className={result.kvStore.isAdmin ? 'text-green-600' : 'text-gray-600'}>
                            {result.kvStore.isAdmin ? '👑 Да' : 'Нет'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Supabase ID:</span>
                          <span className="font-mono text-xs">{result.kvStore.supabaseId || 'Не указан'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Supabase Auth Status */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    {result.supabaseAuth.exists ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <h3 className="font-semibold">
                      Supabase Auth (Система авторизации)
                    </h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус:</span>
                      <span className={result.supabaseAuth.exists ? 'text-green-600 font-medium' : 'text-red-600'}>
                        {result.supabaseAuth.exists ? '✅ Найден' : '❌ Не найден'}
                      </span>
                    </div>
                    {result.supabaseAuth.exists && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Auth ID:</span>
                          <span className="font-mono text-xs">{result.supabaseAuth.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-mono text-xs">{result.supabaseAuth.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email подтверждён:</span>
                          <span className={result.supabaseAuth.confirmed ? 'text-green-600' : 'text-orange-600'}>
                            {result.supabaseAuth.confirmed ? '✅ Да' : '⚠️ Нет'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Создан:</span>
                          <span className="text-xs">{new Date(result.supabaseAuth.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recommendation */}
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Рекомендация:</strong> {result.recommendation}
                  </AlertDescription>
                </Alert>

                {/* Actions */}
                {!result.kvStore.exists && !result.supabaseAuth.exists && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 mb-2">
                      <strong>Что делать:</strong>
                    </p>
                    <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                      <li>Вернитесь на страницу входа</li>
                      <li>Нажмите "Регистрация"</li>
                      <li>Зарегистрируйте новый аккаунт с этим email</li>
                    </ol>
                  </div>
                )}

                {result.kvStore.exists && !result.supabaseAuth.exists && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-900 mb-2">
                      <strong>⚠️ Несоответствие данных:</strong>
                    </p>
                    <p className="text-sm text-orange-800 mb-2">
                      Пользователь есть в базе приложения, но отсутствует в системе авторизации Supabase.
                    </p>
                    <p className="text-sm text-orange-800">
                      <strong>Решение:</strong> Зарегистрируйтесь заново с этим email, чтобы синхронизировать данные.
                    </p>
                  </div>
                )}

                {!result.kvStore.exists && result.supabaseAuth.exists && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-900 mb-2">
                      <strong>⚠️ Несоответствие данных:</strong>
                    </p>
                    <p className="text-sm text-orange-800 mb-2">
                      Пользователь есть в системе авторизации, но отсутствует в базе приложения.
                    </p>
                    <p className="text-sm text-orange-800">
                      <strong>Решение:</strong> Обратитесь к администратору для восстановления данных профиля.
                    </p>
                  </div>
                )}

                {result.kvStore.exists && result.supabaseAuth.exists && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-900">
                      <strong>✅ Всё в порядке!</strong> Пользователь существует в обеих системах. 
                      Если возникают проблемы со входом, проверьте правильность пароля.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">💡 Справка</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-gray-700">
            <p>
              <strong>KV Store</strong> - база данных приложения, где хранятся профили пользователей, товары и заказы.
            </p>
            <p>
              <strong>Supabase Auth</strong> - система авторизации, которая проверяет email и пароль при входе.
            </p>
            <p>
              Для нормальной работы пользователь должен существовать в обеих системах.
            </p>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            ← Вернуться на главную
          </Button>
        </div>
      </div>
    </div>
  );
}

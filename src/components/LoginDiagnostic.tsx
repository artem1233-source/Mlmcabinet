import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

export function LoginDiagnostic() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    const steps: any = {
      step1_import: { status: 'pending', data: null },
      step2_url: { status: 'pending', data: null },
      step3_request: { status: 'pending', data: null },
      step4_response: { status: 'pending', data: null },
      step5_parse: { status: 'pending', data: null },
      step6_validate: { status: 'pending', data: null },
    };

    try {
      // Step 1: Import
      steps.step1_import.status = 'running';
      setResult({ ...steps });

      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      steps.step1_import = {
        status: 'success',
        data: { projectId, hasKey: !!publicAnonKey }
      };
      setResult({ ...steps });

      // Step 2: URL
      steps.step2_url.status = 'running';
      setResult({ ...steps });

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/login`;
      
      steps.step2_url = {
        status: 'success',
        data: { url }
      };
      setResult({ ...steps });

      // Step 3: Request
      steps.step3_request.status = 'running';
      setResult({ ...steps });

      const requestBody = {
        login: email.trim(),
        password: password,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      steps.step3_request = {
        status: 'success',
        data: {
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey?.substring(0, 20)}...`,
          }
        }
      };
      setResult({ ...steps });

      // Step 4: Response
      steps.step4_response.status = 'running';
      setResult({ ...steps });

      const responseHeaders = Object.fromEntries(response.headers.entries());

      steps.step4_response = {
        status: response.ok ? 'success' : 'error',
        data: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: responseHeaders,
        }
      };
      setResult({ ...steps });

      // Step 5: Parse
      steps.step5_parse.status = 'running';
      setResult({ ...steps });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
        
        steps.step5_parse = {
          status: 'success',
          data: {
            raw: text.substring(0, 500),
            parsed: data,
          }
        };
      } catch (parseError) {
        steps.step5_parse = {
          status: 'error',
          data: {
            error: String(parseError),
          }
        };
        setResult({ ...steps });
        return;
      }
      setResult({ ...steps });

      // Step 6: Validate
      steps.step6_validate.status = 'running';
      setResult({ ...steps });

      const hasUser = !!data.user;
      const hasAccessToken = !!data.access_token;
      const hasError = !!data.error;

      steps.step6_validate = {
        status: (hasUser && hasAccessToken) ? 'success' : 'error',
        data: {
          hasUser,
          hasAccessToken,
          hasError,
          error: data.error,
          user: data.user ? {
            id: data.user.id,
            имя: data.user.имя,
            email: data.user.email,
          } : null,
        }
      };
      setResult({ ...steps });

    } catch (error) {
      const errorSteps = { ...steps };
      for (const key in errorSteps) {
        if (errorSteps[key].status === 'running') {
          errorSteps[key] = {
            status: 'error',
            data: { error: String(error) }
          };
        }
      }
      setResult(errorSteps);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-red-600" />;
    if (status === 'running') return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    return <div className="w-5 h-5 rounded-full bg-gray-300" />;
  };

  const getStepColor = (status: string) => {
    if (status === 'success') return 'bg-green-50 border-green-200';
    if (status === 'error') return 'bg-red-50 border-red-200';
    if (status === 'running') return 'bg-blue-50 border-blue-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-[#1E1E1E]">Диагностика входа</h1>
            <p className="text-[#666]">Пошаговая проверка процесса авторизации</p>
          </div>
        </div>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Введите данные для входа</CardTitle>
            <CardDescription>
              Будет выполнена диагностика процесса авторизации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1E1E1E] mb-2">
                Email или ID
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com или 000001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1E1E1E] mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
                disabled={loading}
              />
            </div>

            <Button
              onClick={testLogin}
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Выполнение диагностики...
                </>
              ) : (
                'Запустить диагностику'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Step 1 */}
            <Card className={`border-2 ${getStepColor(result.step1_import.status)}`}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {getStepIcon(result.step1_import.status)}
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      Шаг 1: Импорт конфигурации
                    </CardTitle>
                    <CardDescription>
                      Загрузка данных проекта Supabase
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {result.step1_import.data && (
                <CardContent>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto">
                    {JSON.stringify(result.step1_import.data, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* Step 2 */}
            <Card className={`border-2 ${getStepColor(result.step2_url.status)}`}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {getStepIcon(result.step2_url.status)}
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      Шаг 2: Формирование URL
                    </CardTitle>
                    <CardDescription>
                      Создание ссылки на Edge Function
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {result.step2_url.data && (
                <CardContent>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto">
                    {JSON.stringify(result.step2_url.data, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* Step 3 */}
            <Card className={`border-2 ${getStepColor(result.step3_request.status)}`}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {getStepIcon(result.step3_request.status)}
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      Шаг 3: Отправка запроса
                    </CardTitle>
                    <CardDescription>
                      POST запрос на сервер
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {result.step3_request.data && (
                <CardContent>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto">
                    {JSON.stringify(result.step3_request.data, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* Step 4 */}
            <Card className={`border-2 ${getStepColor(result.step4_response.status)}`}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {getStepIcon(result.step4_response.status)}
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      Шаг 4: Получение ответа
                    </CardTitle>
                    <CardDescription>
                      HTTP статус и заголовки
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {result.step4_response.data && (
                <CardContent>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto">
                    {JSON.stringify(result.step4_response.data, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* Step 5 */}
            <Card className={`border-2 ${getStepColor(result.step5_parse.status)}`}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {getStepIcon(result.step5_parse.status)}
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      Шаг 5: Парсинг JSON
                    </CardTitle>
                    <CardDescription>
                      Преобразование ответа в объект
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {result.step5_parse.data && (
                <CardContent>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(result.step5_parse.data, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* Step 6 */}
            <Card className={`border-2 ${getStepColor(result.step6_validate.status)}`}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {getStepIcon(result.step6_validate.status)}
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      Шаг 6: Валидация данных
                    </CardTitle>
                    <CardDescription>
                      Проверка наличия user и access_token
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {result.step6_validate.data && (
                <CardContent>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto">
                    {JSON.stringify(result.step6_validate.data, null, 2)}
                  </pre>
                  
                  {result.step6_validate.status === 'success' && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 font-semibold">✅ Авторизация успешна!</p>
                      <p className="text-green-700 text-sm mt-1">
                        Получены данные пользователя и токен доступа
                      </p>
                    </div>
                  )}

                  {result.step6_validate.status === 'error' && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 font-semibold">❌ Ошибка авторизации</p>
                      <p className="text-red-700 text-sm mt-1">
                        {result.step6_validate.data.error || 'Проверьте правильность введённых данных'}
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

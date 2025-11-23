import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function ServerTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addResult = (test: string, success: boolean, details: string) => {
    setResults(prev => [...prev, { test, success, details, timestamp: Date.now() }]);
  };

  const runTests = async () => {
    setResults([]);
    setTesting(true);

    try {
      // Test 1: Check configuration
      addResult(
        'Конфигурация',
        !!projectId && !!publicAnonKey,
        `Project ID: ${projectId || 'MISSING'}, Anon Key: ${publicAnonKey ? 'SET' : 'MISSING'}`
      );

      // Test 2: Basic health check
      try {
        const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/health`;
        console.log('Testing health endpoint:', healthUrl);
        
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });

        const healthData = await healthResponse.json();
        addResult(
          'Health Check',
          healthResponse.ok,
          `Status: ${healthResponse.status}, Data: ${JSON.stringify(healthData)}`
        );
      } catch (error) {
        addResult(
          'Health Check',
          false,
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test 3: Admin health check
      try {
        const adminHealthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/health`;
        console.log('Testing admin health endpoint:', adminHealthUrl);
        
        const adminHealthResponse = await fetch(adminHealthUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });

        const adminHealthData = await adminHealthResponse.json();
        addResult(
          'Admin Health Check',
          adminHealthResponse.ok,
          `Status: ${adminHealthResponse.status}, Data: ${JSON.stringify(adminHealthData)}`
        );
      } catch (error) {
        addResult(
          'Admin Health Check',
          false,
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test 4: CORS Test
      try {
        const corsTestUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/health`;
        const corsResponse = await fetch(corsTestUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type,Authorization,X-User-Id',
          },
        });

        addResult(
          'CORS Preflight',
          corsResponse.ok || corsResponse.status === 204,
          `Status: ${corsResponse.status}, Headers: ${JSON.stringify(Object.fromEntries(corsResponse.headers.entries()))}`
        );
      } catch (error) {
        addResult(
          'CORS Preflight',
          false,
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }

    } catch (error) {
      addResult(
        'Test Suite',
        false,
        `Fatal error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-[#1E1E1E]">Диагностика подключения к серверу</CardTitle>
        <p className="text-[#666] text-sm">
          Проверка доступности Supabase Functions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={runTests}
            disabled={testing}
            className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Тестирование...
              </>
            ) : (
              '🔍 Запустить тесты'
            )}
          </Button>
          
          {results.length > 0 && (
            <div className="text-sm text-[#666]">
              Выполнено тестов: {results.length} | 
              Успешно: {results.filter(r => r.success).length} | 
              Ошибок: {results.filter(r => !r.success).length}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1E1E1E] mb-1">
                      {result.test}
                    </p>
                    <p className="text-sm text-[#666] break-words">
                      {result.details}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !testing && (
          <div className="p-8 text-center text-[#666]">
            <p>Нажмите кнопку выше, чтобы запустить диагностику</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

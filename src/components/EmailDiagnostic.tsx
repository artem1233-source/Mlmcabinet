import { useState } from 'react';
import { Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function EmailDiagnostic() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkEmail = async () => {
    if (!email.trim()) {
      setError('Введите email');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/diagnostic/check-email/${encodeURIComponent(email)}`;
      console.log('🔍 Checking email:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Diagnostic result:', data);
      setResult(data);
    } catch (err: any) {
      console.error('Error checking email:', err);
      setError(err.message || 'Ошибка проверки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Search className="w-6 h-6 text-[#39B7FF]" />
              Диагностика Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите email для проверки"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && checkEmail()}
              />
              <Button 
                onClick={checkEmail}
                disabled={loading}
                className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
              >
                {loading ? 'Проверка...' : 'Проверить'}
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <>
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-6">
              <CardHeader>
                <CardTitle className="text-[#1E1E1E]">
                  Результаты поиска для: {result.email}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Admin Email Index */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">1. Индекс admin:email</h3>
                    {result.searchResults.adminEmailIndex.found ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Найдено
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Не найдено
                      </Badge>
                    )}
                  </div>
                  <code className="text-xs bg-gray-100 p-2 rounded block">
                    {result.searchResults.adminEmailIndex.key}
                  </code>
                  {result.searchResults.adminEmailIndex.found && (
                    <pre className="text-xs bg-blue-50 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(result.searchResults.adminEmailIndex.data, null, 2)}
                    </pre>
                  )}
                </div>

                {/* User Email Index */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">2. Индекс user:email</h3>
                    {result.searchResults.userEmailIndex.found ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Найдено
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Не найдено
                      </Badge>
                    )}
                  </div>
                  <code className="text-xs bg-gray-100 p-2 rounded block">
                    {result.searchResults.userEmailIndex.key}
                  </code>
                  {result.searchResults.userEmailIndex.found && (
                    <pre className="text-xs bg-blue-50 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(result.searchResults.userEmailIndex.data, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Scan All Users */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">3. Сканирование всех пользователей</h3>
                    {result.searchResults.scanAllUsers.foundByEmail ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Найдено
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Не найдено
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Всего пользователей: {result.searchResults.scanAllUsers.totalUsers}
                  </p>
                  {result.searchResults.scanAllUsers.foundByEmail && (
                    <pre className="text-xs bg-green-50 p-2 rounded overflow-auto">
                      {JSON.stringify(result.searchResults.scanAllUsers.userData, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Scan All Admins */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">4. Сканирование всех админов</h3>
                    {result.searchResults.scanAllAdmins.foundByEmail ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Найдено
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Не найдено
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Всего админов: {result.searchResults.scanAllAdmins.totalAdmins}
                  </p>
                  {result.searchResults.scanAllAdmins.foundByEmail && (
                    <pre className="text-xs bg-green-50 p-2 rounded overflow-auto">
                      {JSON.stringify(result.searchResults.scanAllAdmins.adminData, null, 2)}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sample Users */}
            {result.sampleUsers && result.sampleUsers.length > 0 && (
              <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">
                    Примеры пользователей в базе (первые 10)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.sampleUsers.map((user: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              {user.имя} {user.фамилия}
                            </p>
                            <p className="text-sm text-gray-600">
                              ID: {user.id} | Email: {user.email}
                            </p>
                          </div>
                          {user.isAdmin && (
                            <Badge className="bg-red-100 text-red-700">
                              Админ
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

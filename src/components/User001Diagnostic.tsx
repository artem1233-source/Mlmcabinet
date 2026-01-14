import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Users } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

export function User001Diagnostic() {
  const [user001, setUser001] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a`;

  const checkUser001 = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/emergency/check-001`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', response.status, errorText);
        toast.error(`Ошибка сервера: ${response.status}`);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setUser001(data.user001);
        setAllUsers(data.childrenOf001 || []);
        
        if (!data.user001) {
          toast.error('Пользователь 001 не найден!');
        } else {
          toast.success('Пользователь 001 найден');
        }
      }
    } catch (error) {
      console.error('Error checking user 001:', error);
      toast.error('Ошибка проверки пользователя 001');
    } finally {
      setLoading(false);
    }
  };

  const restoreUser001 = async () => {
    setRestoring(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/emergency/restore-001`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', response.status, errorText);
        toast.error(`Ошибка сервера: ${response.status}`);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Пользователь 001 восстановлен!');
        setUser001(data.user001);
        setAllUsers(data.children || []);
      } else {
        toast.error('Ошибка восстановления пользователя 001');
      }
    } catch (error) {
      console.error('Error restoring user 001:', error);
      toast.error('Ошибка восстановления пользователя 001');
    } finally {
      setRestoring(false);
    }
  };

  useEffect(() => {
    checkUser001();
  }, []);

  return (
    <Card className="border-[#E6E9EE] rounded-xl shadow-lg">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#39B7FF]" />
            Диагностика пользователя 001
          </CardTitle>
          <Button
            onClick={checkUser001}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-[#39B7FF]" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Статус польз��вателя 001 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {user001 ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <div className="font-semibold text-lg">
                    {user001 ? 'Пользователь 001 найден' : 'Пользователь 001 отсутствует'}
                  </div>
                  {user001 && (
                    <div className="text-sm text-gray-600">
                      {user001.имя} {user001.фамилия} • {user001.рефКод}
                    </div>
                  )}
                </div>
              </div>
              {user001 ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Активен
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  Не найден
                </Badge>
              )}
            </div>

            {/* Информация о детях */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <div className="font-semibold text-blue-900">
                  Партнёры в команде пользователя 001
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {allUsers.length}
              </div>
              {allUsers.length > 0 && (
                <div className="mt-3 space-y-1">
                  {allUsers.slice(0, 5).map((user: any) => (
                    <div key={user.id} className="text-sm text-blue-800">
                      • {user.имя} (ID: {user.id})
                    </div>
                  ))}
                  {allUsers.length > 5 && (
                    <div className="text-sm text-blue-600">
                      ... и еще {allUsers.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Кнопка восстановления */}
            {!user001 && (
              <Button
                onClick={restoreUser001}
                disabled={restoring}
                className="w-full bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
              >
                {restoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Восстановление...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Восстановить пользователя 001
                  </>
                )}
              </Button>
            )}

            {/* Описание */}
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <strong>Пользователь 001</strong> — это корневой партнёр системы. Все новые партнёры, 
              зарегистрированные без реферального кода, будут привязаны к нему. Если пользователь 001 
              отсутствует, дерево команды не будет отображаться.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
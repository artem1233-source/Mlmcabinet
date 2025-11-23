import { useEffect, useState } from 'react';
import { Shield, AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AdminDebugProps {
  currentUser: any;
}

export function AdminDebug({ currentUser }: AdminDebugProps) {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    try {
      const users = await api.debugGetAllUsers();
      console.log('Debug: Loaded users:', users);
      console.log('Debug: Is array?', Array.isArray(users));
      
      // Ensure users is always an array
      if (Array.isArray(users)) {
        setAllUsers(users);
      } else {
        console.warn('Users is not an array:', users);
        setAllUsers([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setAllUsers([]);
      setLoading(false);
    }
  };

  const makeCurrentUserAdmin = async () => {
    if (!currentUser?.id) {
      alert('Текущий пользователь не найден');
      return;
    }

    if (confirm(`Сделать пользователя ${currentUser.имя} (${currentUser.email}) администратором?`)) {
      try {
        // Обновляем флаг isAdmin напрямую через API
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/users/${currentUser.id}/make-admin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-User-Id': currentUser.id
            }
          }
        );

        if (response.ok) {
          alert('✅ Вы теперь администратор! Перезагрузите страницу.');
          window.location.reload();
        } else {
          const error = await response.json();
          alert(`Ошибка: ${error.error || 'Не удалось установить права админа'}`);
        }
      } catch (error) {
        console.error('Error making admin:', error);
        alert(`Ошибка: ${error}`);
      }
    }
  };

  const deleteUser = async (userId: string, userName: string, userEmail: string) => {
    if (userId === currentUser?.id) {
      toast.error('Нельзя удалить себя!', {
        description: 'Используйте функцию удаления аккаунта в Настройках'
      });
      return;
    }

    if (!confirm(`⚠️ УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ\n\n${userName}\n${userEmail}\nID: ${userId}\n\nЭто действие необратимо!\n\nПродолжить?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/delete-user/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Пользователь удалён!', {
          description: `${data.deletedUser.name} (${data.deletedUser.email})`
        });
        // Перезагружаем список
        loadAllUsers();
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Ошибка удаления пользователя');
    }
  };

  const isAdmin = currentUser?.isAdmin === true;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="text-blue-500" size={24} />
            🔍 Диагностика прав администратора
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current User Info */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              👤 Текущий пользователь
            </h3>
            {currentUser ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">ID:</span>
                  <code className="bg-white px-2 py-1 rounded">{currentUser.id}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Имя:</span>
                  <span>{currentUser.имя}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Email:</span>
                  <span>{currentUser.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Уровень:</span>
                  <span>{currentUser.уровень}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Админ флаг:</span>
                  {isAdmin ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle size={16} />
                      <strong>true (ВЫ АДМИН ✅)</strong>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle size={16} />
                      <strong>false (НЕ АДМИН ❌)</strong>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Тип isAdmin:</span>
                  <code className="bg-white px-2 py-1 rounded">
                    {typeof currentUser.isAdmin}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Сырое значение:</span>
                  <code className="bg-white px-2 py-1 rounded">
                    {JSON.stringify(currentUser.isAdmin)}
                  </code>
                </div>
              </div>
            ) : (
              <p className="text-red-600">❌ Пользователь не загружен</p>
            )}
          </div>

          {/* All Users List */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              👥 Все пользователи в базе ({Array.isArray(allUsers) ? allUsers.length : 0})
            </h3>
            {loading ? (
              <p>Загрузка...</p>
            ) : !Array.isArray(allUsers) ? (
              <p className="text-red-600">❌ Ошибка загрузки пользователей (не массив)</p>
            ) : allUsers.length === 0 ? (
              <p className="text-red-600">❌ Пользователи не найдены</p>
            ) : (
              <div className="space-y-2">
                {allUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className={`p-3 rounded ${
                      user.id === currentUser?.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {index + 1}. {user.имя}
                          </span>
                          {user.id === currentUser?.id && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                              ВЫ
                            </span>
                          )}
                          {user.isAdmin && (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                              АДМИН
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: <code className="bg-gray-200 px-1 rounded">{user.id}</code>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div>
                          isAdmin: <strong>{String(user.isAdmin)}</strong>
                        </div>
                        <div className="text-gray-500">
                          Зарег: {new Date(user.зарегистрирован).toLocaleDateString('ru')}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="mt-2">
                        <Button
                          onClick={() => deleteUser(user.id, user.имя, user.email)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Удалить пользователя
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status & Actions */}
          <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-300">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <AlertCircle className="text-yellow-600" size={20} />
              Статус и действия
            </h3>
            
            {isAdmin ? (
              <div className="text-green-700">
                <p className="mb-2">✅ <strong>У вас есть права администратора!</strong></p>
                <p className="text-sm">Кнопка "Админ-панель" должна появиться в боковом меню.</p>
                <p className="text-sm mt-2 text-gray-600">
                  Если кнопка не видна - обновите страницу (F5).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-red-700">
                  ❌ <strong>У вас НЕТ прав администратора</strong>
                </p>
                <p className="text-sm text-gray-700">
                  Возможные причины:
                </p>
                <ul className="text-sm text-gray-700 list-disc ml-5 space-y-1">
                  <li>Вы не первый зарегистрированный пользователь</li>
                  <li>Флаг isAdmin не установился при регистрации</li>
                  <li>Данные в KV store не обновились</li>
                </ul>
                
                <div className="mt-4 pt-4 border-t border-yellow-300">
                  <p className="text-sm mb-2">
                    <strong>Решение:</strong> Назначить себя админом вручную
                  </p>
                  <Button
                    onClick={makeCurrentUserAdmin}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Shield size={16} className="mr-2" />
                    Сделать меня администратором
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-300">
            <h3 className="font-bold mb-2 text-blue-900">📋 Инструкция по решению проблем:</h3>
            <ol className="text-sm text-blue-900 list-decimal ml-5 space-y-2">
              <li>
                <strong>Если вы единственный пользователь:</strong>
                <br />
                Нажмите кнопку "Сделать меня администратором" выше.
              </li>
              <li>
                <strong>Если есть другие пользователи:</strong>
                <br />
                Удалите все записи из Supabase KV Store (ключи начинаются с "user:") и зарегистрируйтесь заново.
              </li>
              <li>
                <strong>После назначения админом:</strong>
                <br />
                Перезагрузите страницу (F5) - кнопка "Админ-панель" появится в sidebar.
              </li>
            </ol>
          </div>

          {/* Raw Data */}
          <details className="border rounded-lg p-4 bg-gray-50">
            <summary className="font-bold cursor-pointer">
              🔧 Сырые данные (для отладки)
            </summary>
            <pre className="mt-3 text-xs bg-white p-3 rounded overflow-auto">
              {JSON.stringify({ currentUser, allUsers }, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
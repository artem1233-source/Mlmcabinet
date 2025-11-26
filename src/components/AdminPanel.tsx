import { useState, useEffect } from 'react';
import { Shield, Users, Plus, X, CheckCircle, AlertCircle, Trash2, UserX, ArrowRight, AlertTriangle, Edit } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getAccessToken } from '../utils/supabase/client';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';

interface AdminPanelProps {
  currentUser: any;
}

interface Admin {
  id: string;
  type: 'admin';
  email: string;
  имя: string;
  фамилия: string;
  role: string;
  permissions: string[];
  created: string;
  createdBy: string | null;
}

const roleLabels: { [key: string]: string } = {
  ceo: '👑 CEO (Полный доступ)',
  finance: '💰 Бухгалтер (Финансы)',
  warehouse: '📦 Складской менеджер (Склад)',
  manager: '👥 Менеджер (Пользователи)',
  support: '🎧 Поддержка (Только просмотр)'
};

const roleDescriptions: { [key: string]: string } = {
  ceo: 'Полный доступ ко всем функциям системы',
  finance: 'Управление финансами, выплатами, баансами',
  warehouse: 'Управление складом, товарами, поставками',
  manager: 'Управление пользователями, заказами',
  support: 'Просмотр данных без возможности редактирования'
};

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'admins' | 'users'>('admins');
  const [showReloginPrompt, setShowReloginPrompt] = useState(false);

  // Create admin form state
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'support'
  });

  // Change ID dialog state
  const [changeIdDialogOpen, setChangeIdDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUserId, setNewUserId] = useState<string>('');
  const [isChangingId, setIsChangingId] = useState(false);

  // Change role dialog state
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [selectedAdminForRole, setSelectedAdminForRole] = useState<Admin | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Check if current user is CEO
  const isCEO = currentUser?.type === 'admin' && currentUser?.role === 'ceo';

  useEffect(() => {
    if (isCEO) {
      const initializeToken = async () => {
        // ✅ Check if token exists in localStorage
        let accessToken = localStorage.getItem('access_token');
        const userId = localStorage.getItem('userId');
        
        console.log('🔑 AdminPanel: Token check:', {
          exists: !!accessToken,
          length: accessToken?.length || 0,
          preview: accessToken ? `${accessToken.substring(0, 20)}...` : 'N/A',
          currentUserId: currentUser?.id,
          storedUserId: userId
        });
        
        // 🆕 FALLBACK: If no access_token but user is logged in, try to get it from Supabase
        if (!accessToken && userId) {
          console.log('⚠️ No access_token found, but user is logged in. Trying to get session from Supabase...');
          
          try {
            const token = await getAccessToken();
            if (token) {
              accessToken = token;
              localStorage.setItem('access_token', token);
              console.log('✅ Retrieved and saved access_token from Supabase session');
            } else {
              console.warn('❌ Could not retrieve access_token from Supabase');
            }
          } catch (error) {
            console.error('Error getting access_token:', error);
          }
        }
        
        if (!accessToken) {
          console.warn('⚠️ AdminPanel: Access token отсутствует. Пользователь должен войти заново.');
          console.warn('💡 Debugging info:', {
            isCEO,
            currentUser,
            localStorageKeys: Object.keys(localStorage)
          });
          setError('Требуется повторный вход в систему для доступа к управлению администраторами');
          return;
        }
        
        // Token exists, load admin data
        console.log('✅ AdminPanel: Token found, loading admin data...');
        loadAdmins();
        loadAllUsers();
      };
      
      initializeToken();
    } else {
      console.log('ℹ️ AdminPanel: User is not CEO, skipping initialization', {
        currentUser,
        isCEO
      });
    }
  }, [isCEO, currentUser?.id]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');

      // ✅ Check if user is authenticated
      if (!accessToken) {
        console.warn('⚠️ Access token не найден. Пользователь не авторизован.');
        setError('Требуется повторный вход в систему');
        return;
      }

      // 🆕 Use dedicated /admins endpoint instead of /admin/users
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admins`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle specific auth errors
        if (response.status === 401) {
          console.error('❌ Токен невалиден или истек');
          setError('Сессия истекла. Пожалуйста, войдите заново.');
          // Clear invalid token
          localStorage.removeItem('access_token');
          return;
        }
        throw new Error(data.error || 'Ошибка загрузки списка админов');
      }

      // 🆕 Now we get only real admins from admin:id:* prefix
      const adminsList = (data.admins || [])
        .map((u: any) => ({
          ...u,
          permissions: u.permissions || [],  // Add default empty array if permissions is undefined
          role: u.role || 'support',          // Add default role if missing
        }));
      
      console.log('📋 Loaded admins from /admins endpoint:', adminsList.length);
      setAdmins(adminsList);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Load admins error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Id': userId || '',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки списка пользователей');
      }

      setAllUsers(data.users || []);
    } catch (err) {
      console.error('Load users error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!newAdmin.email || !newAdmin.password || !newAdmin.firstName || !newAdmin.lastName) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (newAdmin.password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/signup-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: newAdmin.email.trim(),
            password: newAdmin.password,
            firstName: newAdmin.firstName.trim(),
            lastName: newAdmin.lastName.trim(),
            role: newAdmin.role,
            creatorToken: accessToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания админа');
      }

      setSuccess(`Администратор ${newAdmin.firstName} ${newAdmin.lastName} успешно создан!`);
      setShowCreateForm(false);
      setNewAdmin({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'support'
      });

      // Reload admins list
      loadAdmins();
    } catch (err) {
      console.error('Create admin error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/delete-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            adminId,
            creatorToken: accessToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка удаления адмна');
      }

      toast.success(`Администратор успешно удален!`);
      // Reload admins list
      loadAdmins();
    } catch (err) {
      console.error('Delete admin error:', err);
      toast.error(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChangeIdDialog = (userId: string) => {
    setSelectedUserId(userId);
    setNewUserId('');
    setChangeIdDialogOpen(true);
  };

  const handleCloseChangeIdDialog = () => {
    if (!isChangingId) {
      setChangeIdDialogOpen(false);
      setSelectedUserId('');
      setNewUserId('');
    }
  };

  const handleChangeUserId = async () => {
    if (!selectedUserId || !newUserId.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    // Валидация нового ID
    const trimmedNewId = newUserId.trim();
    
    if (trimmedNewId.length < 2) {
      toast.error('ID должен содержать минимум 2 символа');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedNewId)) {
      toast.error('ID может содержать только латинские буквы, цифры, дефис и подчёркивание');
      return;
    }

    const selectedUser = admins.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      toast.error('Пользователь не найден');
      return;
    }

    const confirmMsg = `Вы уверены, что хотите изменить ID администратора?\n\n${selectedUser.имя} ${selectedUser.фамилия}\n${selectedUserId} → ${trimmedNewId}\n\n⚠️ Это действие обновит все ссылки в системе.`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    setIsChangingId(true);

    try {
      const response = await api.changeUserId(selectedUserId, trimmedNewId);
      
      if (response.success) {
        toast.success(`ID успешно изменён: ${selectedUserId} → ${trimmedNewId}`);
        
        // Если изменили ID текущего пользователя, нужно обновить токен
        if (selectedUserId === currentUser.id) {
          api.setAuthToken(trimmedNewId);
          toast.info('Ваш ID изменён. Перезагрузка...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          handleCloseChangeIdDialog();
          // Reload admins list
          loadAdmins();
          loadAllUsers();
        }
      } else {
        toast.error(response.error || 'Ошибка при изменении ID');
      }
    } catch (error: any) {
      console.error('Error changing ID:', error);
      toast.error(error.message || 'Ошибка при изменении ID');
    } finally {
      setIsChangingId(false);
    }
  };

  const handleOpenChangeRoleDialog = (admin: Admin) => {
    setSelectedAdminForRole(admin);
    setNewRole(admin.role);
    setChangeRoleDialogOpen(true);
  };

  const handleCloseChangeRoleDialog = () => {
    if (!isChangingRole) {
      setChangeRoleDialogOpen(false);
      setSelectedAdminForRole(null);
      setNewRole('');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedAdminForRole || !newRole) {
      toast.error('Заполните все поля');
      return;
    }

    const confirmMsg = `Вы уверены, что хотите изменить роль администратора?\n\n${selectedAdminForRole.имя} ${selectedAdminForRole.фамилия}\n${selectedAdminForRole.role} → ${newRole}\n\n⚠️ Это действие может повлиять на права доступа.`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    setIsChangingRole(true);

    try {
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) {
        toast.error('Токен доступа не найден. Пожалуйста, выйдите и войдите снова.');
        return;
      }
      
      const response = await api.changeUserRole(selectedAdminForRole.id, newRole);
      
      if (response.success) {
        toast.success(`Роль успешно изменена: ${selectedAdminForRole.role} → ${newRole}`);
        
        // Close dialog
        handleCloseChangeRoleDialog();
        
        // Reload admins list
        loadAdmins();
        loadAllUsers();
      } else {
        toast.error(response.error || 'Ошибка при изменении роли');
      }
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast.error(error.message || 'Ошибка при изменении роли');
    } finally {
      setIsChangingRole(false);
    }
  };

  if (!isCEO) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-red-800 font-semibold">Доступ запрещён</p>
            <p className="text-red-600 text-sm">Только CEO может управлять администраторами</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Управление администраторами</h2>
            <p className="text-gray-600">Создавайте и управляйте учётными записями админов</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (confirm('Очистить дубликаты администраторов? Это удалит копии админов из user:id: и оставит только в admin:id:')) {
                try {
                  setLoading(true);
                  const result = await api.cleanDuplicateAdmins();
                  
                  // Показываем детальный результат
                  if (result.migratedAdmins > 0 || result.deletedDuplicates > 0) {
                    toast.success(
                      `✅ ${result.message}\n` +
                      `Мигрировано: ${result.migratedAdmins}\n` +
                      `Удалено дубликатов: ${result.deletedDuplicates}`,
                      { duration: 5000 }
                    );
                  } else {
                    toast.info('ℹ️ Дубликаты не найдены. Все администраторы находятся в правильных префиксах.', { duration: 4000 });
                  }
                  
                  // Показываем лог если есть
                  if (result.log && result.log.length > 0) {
                    console.log('📋 Лог очистки дубликатов:', result.log);
                  }
                  
                  loadAdmins();
                } catch (error: any) {
                  console.error('❌ Ошибка очистки дубликатов:', error);
                  toast.error(error.message || 'Ошибка очистки');
                } finally {
                  setLoading(false);
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            disabled={loading}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Очистить дубликаты</span>
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            {showCreateForm ? (
              <>
                <X className="w-5 h-5" />
                <span>Отмена</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Создать админа</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-700 font-semibold">Успешно!</p>
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-semibold">Ошибка</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Check token again
                const accessToken = localStorage.getItem('access_token');
                const userId = localStorage.getItem('userId');
                console.log('🔍 Повторная проверка токена:', {
                  hasAccessToken: !!accessToken,
                  accessTokenLength: accessToken?.length || 0,
                  hasUserId: !!userId,
                  userId: userId || 'N/A',
                  preview: accessToken ? `${accessToken.substring(0, 30)}...` : 'N/A'
                });
                
                if (accessToken) {
                  alert(`✅ Токен найден!\n\nДлина: ${accessToken.length}\nПревью: ${accessToken.substring(0, 40)}...\n\nПопробуйте перезагрузить страницу.`);
                  // Try to reload data
                  setError(null);
                  loadAdmins();
                  loadAllUsers();
                } else {
                  alert('❌ Токен не найден в localStorage.\n\nВам нужно войти заново.');
                }
              }}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              🔍 Проверить токен
            </button>
            {(error.includes('истекла') || error.includes('Требуется')) && (
              <button
                onClick={() => {
                  // Clear old token
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('userId');
                  // Reload page to go back to login
                  window.location.reload();
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Войти заново
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Admin Form */}
      {showCreateForm && (
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Создать нового администратора</h3>
          
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Имя
                </label>
                <input
                  type="text"
                  value={newAdmin.firstName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                  placeholder="Например: Иван"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Фамилия
                </label>
                <input
                  type="text"
                  value={newAdmin.lastName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                  placeholder="Например: Петров"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                placeholder="Минимум 6 символов"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Роль
              </label>
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              >
                {Object.entries(roleLabels).map(([role, label]) => (
                  role !== 'ceo' && (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  )
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600">
                {roleDescriptions[newAdmin.role]}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Создание...' : 'Создать администратора'}
            </button>
          </form>
        </div>
      )}

      {/* Admins List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">
              Список администраторов ({admins.length})
            </h3>
          </div>
        </div>

        {loading && admins.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600">Загрузка...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Пока нет других администраторов</p>
            <p className="text-gray-500 text-sm mt-1">Создайте первого администратора</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {admins.map((admin) => (
              <div key={admin.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      admin.role === 'ceo' 
                        ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                        : admin.role === 'finance'
                        ? 'bg-gradient-to-br from-green-500 to-green-700'
                        : admin.role === 'warehouse'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                        : admin.role === 'manager'
                        ? 'bg-gradient-to-br from-orange-500 to-orange-700'
                        : 'bg-gradient-to-br from-gray-500 to-gray-700'
                    }`}>
                      <Shield className="w-6 h-6 text-white" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {admin.имя} {admin.фамилия}
                        </h4>
                        {admin.role === 'ceo' && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                            👑 CEO
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">{admin.email}</p>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-700 font-medium">
                          {roleLabels[admin.role]}
                        </span>
                        <span className="text-xs text-gray-500">
                          ID: {admin.id}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        Создан: {new Date(admin.created).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {admin.createdBy && ` • Создал: ${admin.createdBy}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenChangeIdDialog(admin.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Изменить ID</span>
                    </button>
                    <button
                      onClick={() => handleOpenChangeRoleDialog(admin)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Изменить роль</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(admin.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>

                {/* Permissions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(admin.permissions || []).map((permission) => (
                    <span 
                      key={permission}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {permission.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change User ID Dialog */}
      <Dialog open={changeIdDialogOpen} onOpenChange={handleCloseChangeIdDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Изменить ID администратора</DialogTitle>
            <DialogDescription>
              {(() => {
                const user = admins.find(u => u.id === selectedUserId);
                return user ? `${user.имя} ${user.фамилия} (${user.email})` : 'Выберите пользователя';
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Важно:</strong> При изменении ID все ссылки в системе (спонсоры, команды, заказы) будут автоматически обновлены.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Текущий ID
              </label>
              <Input
                value={selectedUserId}
                disabled
                className="bg-gray-50 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Новый ID <span className="text-red-500">*</span>
              </label>
              <Input
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="Введите новый ID (например: CEO, admin, director)"
                className="font-mono"
                disabled={isChangingId}
              />
              <p className="text-xs text-gray-600">
                Только латинские буквы, цифры, дефис и подчёркивание. Минимум 2 символа.
              </p>
            </div>

            {selectedUserId === currentUser?.id && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  ⚠️ Вы изменяете свой собственный ID. После изменения страница перезагрузится, и вам нужно будет войти с новым ID.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={handleCloseChangeIdDialog}
              disabled={isChangingId}
            >
              Отмена
            </button>
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 sm:ml-3 sm:w-auto disabled:opacity-50"
              onClick={handleChangeUserId}
              disabled={!newUserId.trim() || isChangingId}
            >
              {isChangingId ? 'Изменение...' : 'Изменить ID'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change User Role Dialog */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={handleCloseChangeRoleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Изменить роль администратора</DialogTitle>
            <DialogDescription>
              {(() => {
                const user = selectedAdminForRole;
                return user ? `${user.имя} ${user.фамилия} (${user.email})` : 'Выберите пользователя';
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Важно:</strong> При изменении роли администратора права доступа будут автоматически обновлены.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Текущая роль
              </label>
              <Input
                value={selectedAdminForRole?.role || ''}
                disabled
                className="bg-gray-50 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Новая роль <span className="text-red-500">*</span>
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isChangingRole}
              >
                {Object.entries(roleLabels).map(([role, label]) => (
                  role !== 'ceo' && (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  )
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600">
                {roleDescriptions[newRole]}
              </p>
            </div>

            {selectedAdminForRole?.id === currentUser?.id && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  ⚠️ Вы изменяете свою собственную роль. После изменения права доступа будут обновлены.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={handleCloseChangeRoleDialog}
              disabled={isChangingRole}
            >
              Отмена
            </button>
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 sm:ml-3 sm:w-auto disabled:opacity-50"
              onClick={handleChangeRole}
              disabled={!newRole || isChangingRole}
            >
              {isChangingRole ? 'Изменение...' : 'Изменить роль'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
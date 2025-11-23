import { useState, useEffect } from 'react';
import { Shield, Users, Plus, X, CheckCircle, AlertCircle, Trash2, UserX } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import * as api from '../utils/api';

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
  finance: 'Управление финансами, выплатами, балансами',
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

  // Create admin form state
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'support'
  });

  // Check if current user is CEO
  const isCEO = currentUser?.type === 'admin' && currentUser?.role === 'ceo';

  useEffect(() => {
    if (isCEO) {
      loadAdmins();
      loadAllUsers();
    }
  }, [isCEO]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');

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
        throw new Error(data.error || 'Ошибка загрузки списка админов');
      }

      setAdmins(data.admins || []);
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
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/users`,
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
        throw new Error(data.error || 'Ошибка удаления админа');
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-semibold">Ошибка</p>
            <p className="text-red-600 text-sm">{error}</p>
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
                      onClick={() => handleDeleteAdmin(admin.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>

                {/* Permissions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {admin.permissions.map((permission) => (
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
    </div>
  );
}
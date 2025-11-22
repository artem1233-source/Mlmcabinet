import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Move, X, ChevronDown, ChevronRight, AlertTriangle, Search } from 'lucide-react';
import * as api from '../utils/api';
import { toast } from 'sonner';

interface AdminPanelProps {
  currentUser: any;
  onRefresh: () => void;
}

export function AdminPanel({ currentUser, onRefresh }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set(['DEMO_USER']));

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    имя: '',
    фамилия: '',
    уровень: 1,
    sponsorId: 'DEMO_USER'
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAllUsers();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Построение дерева структуры
  const buildTree = () => {
    const userMap = new Map(users.map(u => [u.id, { ...u, children: [] }]));
    const roots: any[] = [];

    users.forEach(user => {
      const userNode = userMap.get(user.id);
      if (user.пригласившийId && userMap.has(user.пригласившийId)) {
        const parent = userMap.get(user.пригласившийId);
        parent.children.push(userNode);
      } else if (user.id === 'DEMO_USER') {
        roots.push(userNode);
      }
    });

    return roots;
  };

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleCreateUser = async () => {
    try {
      if (!newUserForm.имя || !newUserForm.фамилия) {
        toast.error('Заполните имя и фамилию');
        return;
      }

      const data = await api.createUser(newUserForm);
      
      if (data.success) {
        toast.success(data.message);
        setShowCreateModal(false);
        setNewUserForm({
          имя: '',
          фамилия: '',
          уровень: 1,
          sponsorId: 'DEMO_USER'
        });
        await loadUsers();
        onRefresh();
      }
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast.error(error.message || 'Ошибка создания пользователя');
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (user.id === 'DEMO_USER') {
      toast.error('Нельзя удалить главного администратора');
      return;
    }

    if (!confirm(`Удалить ${user.имя} ${user.фамилия}?`)) {
      return;
    }

    try {
      const data = await api.deleteUserAdmin(user.id);
      
      if (data.success) {
        toast.success(data.message);
        await loadUsers();
        onRefresh();
      }
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.message || 'Ошибка удаления пользователя');
    }
  };

  const handleMoveUser = async () => {
    if (!selectedUser) return;

    try {
      const data = await api.moveUser(selectedUser.id, newUserForm.sponsorId);
      
      if (data.success) {
        toast.success(data.message);
        setShowMoveModal(false);
        setSelectedUser(null);
        await loadUsers();
        onRefresh();
      }
    } catch (error: any) {
      console.error('Failed to move user:', error);
      toast.error(error.message || 'Ошибка перемещения пользователя');
    }
  };

  const openMoveModal = (user: any) => {
    setSelectedUser(user);
    setNewUserForm(prev => ({ ...prev, sponsorId: user.пригласившийId || 'DEMO_USER' }));
    setShowMoveModal(true);
  };

  const filteredUsers = users.filter(u => 
    u.имя.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.фамилия.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.рефКод?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Рендер пользователя в дереве
  const renderUserNode = (user: any, level: number = 0) => {
    const hasChildren = user.children && user.children.length > 0;
    const isExpanded = expandedUsers.has(user.id);
    const isAdmin = user.id === 'DEMO_USER';

    return (
      <div key={user.id} className="mb-1">
        <div
          className={`flex items-center gap-2 p-3 rounded-xl transition-all hover:bg-gray-50 ${
            user.id === currentUser.id ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(user.id)}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Avatar */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white`}
            style={{
              background: user.уровень === 3 ? '#39B7FF' : user.уровень === 2 ? '#12C9B6' : '#999'
            }}
          >
            {user.имя[0]}{user.фамилия[0]}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[#1E1E1E]">
                {user.имя} {user.фамилия}
              </p>
              {isAdmin && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white text-xs rounded-full">
                  Админ
                </span>
              )}
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  user.уровень === 3 ? 'bg-blue-100 text-blue-700' :
                  user.уровень === 2 ? 'bg-teal-100 text-teal-700' :
                  'bg-gray-100 text-gray-700'
                }`}
              >
                Уровень {user.уровень}
              </span>
            </div>
            <p className="text-sm text-[#666]">
              {user.рефКод} • {hasChildren ? `${user.children.length} партнёр${user.children.length === 1 ? '' : user.children.length < 5 ? 'а' : 'ов'}` : '0 партнёров'}
            </p>
          </div>

          {/* Balance */}
          <div className="text-right">
            <p className="text-sm font-semibold text-[#1E1E1E]">
              {user.баланс?.toLocaleString('ru-RU')}₽
            </p>
            <p className="text-xs text-[#666]">баланс</p>
          </div>

          {/* Actions */}
          {!isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openMoveModal(user)}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                title="Переместить"
              >
                <Move className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteUser(user)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {user.children.map((child: any) => renderUserNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[#1E1E1E] mb-2" style={{ fontSize: '28px', fontWeight: '700' }}>
            Управление пользователями
          </h1>
          <p className="text-[#666]" style={{ fontSize: '16px' }}>
            Создавайте, редактируйте и перемещайте партнёров по структуре
          </p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени, username или рефкоду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
              />
            </div>

            {/* Add User Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-xl hover:opacity-90 transition-all"
              style={{ fontWeight: '600' }}
            >
              <Plus className="w-5 h-5" />
              <span>Создать пользователя</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[#666] text-sm mb-1">Всего пользователей</p>
            <p className="text-2xl font-bold text-[#1E1E1E]">{users.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[#666] text-sm mb-1">1-я линия</p>
            <p className="text-2xl font-bold text-[#39B7FF]">
              {users.filter(u => u.пригласившийId === 'DEMO_USER').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[#666] text-sm mb-1">2-я линия</p>
            <p className="text-2xl font-bold text-[#12C9B6]">
              {users.filter(u => u.глубина === 2).length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[#666] text-sm mb-1">3-я линия</p>
            <p className="text-2xl font-bold text-[#FF6B9D]">
              {users.filter(u => u.глубина === 3).length}
            </p>
          </div>
        </div>

        {/* User Tree */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-[#1E1E1E] mb-4" style={{ fontSize: '20px', fontWeight: '700' }}>
            <Users className="inline-block w-6 h-6 mr-2" />
            Структура партнёров
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[#666] mt-4">Загрузка...</p>
            </div>
          ) : searchQuery ? (
            <div className="space-y-2">
              {filteredUsers.map(user => renderUserNode({ ...user, children: [] }, 0))}
            </div>
          ) : (
            <div className="space-y-2">
              {tree.map(root => renderUserNode(root, 0))}
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#1E1E1E]" style={{ fontSize: '20px', fontWeight: '700' }}>
                  Создать пользователя
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E1E1E] mb-1">Имя</label>
                  <input
                    type="text"
                    value={newUserForm.имя}
                    onChange={(e) => setNewUserForm({ ...newUserForm, имя: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
                    placeholder="Иван"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E1E1E] mb-1">Фамилия</label>
                  <input
                    type="text"
                    value={newUserForm.фамилия}
                    onChange={(e) => setNewUserForm({ ...newUserForm, фамилия: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
                    placeholder="Иванов"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E1E1E] mb-1">Уровень</label>
                  <select
                    value={newUserForm.уровень}
                    onChange={(e) => setNewUserForm({ ...newUserForm, уровень: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
                  >
                    <option value={1}>Уровень 1</option>
                    <option value={2}>Уровень 2</option>
                    <option value={3}>Уровень 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E1E1E] mb-1">Спонсор</label>
                  <select
                    value={newUserForm.sponsorId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, sponsorId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.имя} {u.фамилия} ({u.рефКод})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-[#666] rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCreateUser}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-xl hover:opacity-90 transition-all"
                    style={{ fontWeight: '600' }}
                  >
                    Создать
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Move User Modal */}
        {showMoveModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#1E1E1E]" style={{ fontSize: '20px', fontWeight: '700' }}>
                  Переместить пользователя
                </h2>
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 mb-1">Внимание</p>
                  <p className="text-xs text-yellow-700">
                    Перемещение изменит всю структуру партнёров под {selectedUser.имя}. 
                    Это также повлияет на расчёт комиссий.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-[#666] mb-2">Перемещаемый пользователь:</p>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="font-semibold text-[#1E1E1E]">
                    {selectedUser.имя} {selectedUser.фамилия}
                  </p>
                  <p className="text-sm text-[#666]">{selectedUser.рефКод}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E1E1E] mb-1">
                    Новый спонсор
                  </label>
                  <select
                    value={newUserForm.sponsorId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, sponsorId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
                  >
                    {users
                      .filter(u => u.id !== selectedUser.id) // Нельзя переместить под себя
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.имя} {u.фамилия} ({u.рефКод})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowMoveModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-[#666] rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleMoveUser}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-xl hover:opacity-90 transition-all"
                    style={{ fontWeight: '600' }}
                  >
                    Переместить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

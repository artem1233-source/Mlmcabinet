import { useState, useEffect } from 'react';
import { 
  Users, Loader2, Trash2, Shield, 
  Search, Mail, Phone,
  Calendar, Award, ChevronDown, ChevronUp,
  List, Network, User, Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import * as localCounter from '../utils/localCounter';
import { IdManager } from './admin/IdManager';

interface UsersManagementRuProps {
  currentUser: any;
}

export function UsersManagementRu({ currentUser }: UsersManagementRuProps) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [nextUserId, setNextUserId] = useState<string>('001');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load users
      const usersResponse = await api.getAllUsers();
      if (usersResponse.success) {
        setUsers(usersResponse.users || []);
      }

      // Load counter from local storage
      const localNextUserId = localCounter.getNextLocalUserId();
      setNextUserId(localNextUserId);

    } catch (error) {
      console.error('Failed to load users data:', error);
      toast.error('Ошибка загрузки данных пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    console.log('🗑️ Delete user clicked:', userId, userName, userEmail);
    
    if (!confirm(`⚠️ УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ\n\n${userName}\n${userEmail}\nID: ${userId}\n\nЭто действие необратимо!\n\nПродолжить?`)) {
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/delete-user/${userId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Пользователь удалён!', {
          description: `${userName} (${userEmail})`
        });
        loadData();
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('❌ Delete user error:', error);
      toast.error('Ошибка удаления пользователя', {
        description: String(error)
      });
    }
  };

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  // Filter users based on search and level
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.имя?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.фамилия?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id?.toString().includes(searchQuery) ||
      user.рефКод?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Recursive tree render function
  const renderUserTree = (user: any, level: number): JSX.Element => {
    const hasChildren = user.команда && user.команда.length > 0;
    const isExpanded = expandedUsers.has(user.id);
    // Ограничиваем визуальный отступ для глубокой вложенности (max 12 уровней)
    const visualLevel = Math.min(level, 12);
    const indent = visualLevel * 20; // 20px indent per level

    return (
      <div key={user.id} className="mb-1">
        <div 
          className="border border-[#E6E9EE] rounded-lg p-3 bg-white hover:bg-[#F7FAFC] transition-colors"
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="flex items-center gap-3">
            {/* Level indicator for deep nesting */}
            {level > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-px h-8 bg-[#E6E9EE]" />
                <span className="text-xs text-[#999] font-mono min-w-[28px]">L{level}</span>
              </div>
            )}
            
            {/* Toggle button */}
            {hasChildren ? (
              <button
                onClick={() => toggleUserExpanded(user.id)}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[#666]" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-[#666]" />
                )}
              </button>
            ) : (
              <div className="w-7" />
            )}
            
            {/* Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-lg flex items-center justify-center text-white shrink-0">
              <span style={{ fontWeight: '600', fontSize: '14px' }}>
                {user.имя?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            
            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>
                  {user.имя} {user.фамилия}
                </p>
                <Badge className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white text-xs">
                  {user.id}
                </Badge>
                {user.isAdmin && (
                  <Badge className="bg-red-100 text-red-700 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Админ
                  </Badge>
                )}
                {user.id === currentUser?.id && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    Вы
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-[#666]" style={{ fontSize: '12px' }}>
                <span className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
                {hasChildren && (
                  <span className="flex items-center gap-1 shrink-0">
                    <Users className="w-3 h-3" />
                    {user.команда.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {user.команда.map((childId: string) => {
              const childUser = users.find((u: any) => u.id === childId);
              return childUser ? renderUserTree(childUser, level + 1) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#39B7FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[#1E1E1E]">Управление пользователями</h1>
              <p className="text-[#666]">Полный список и управление всеми пользователями системы</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>Всего пользователей</p>
                  <p className="text-[#1E1E1E]" style={{ fontSize: '28px', fontWeight: '700' }}>{users.length}</p>
                </div>
                <div className="w-12 h-12 bg-[#F0F9FF] rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#39B7FF]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white border border-[#E6E9EE] p-1 rounded-xl">
            <TabsTrigger 
              value="users" 
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Список пользователей
            </TabsTrigger>
            <TabsTrigger 
              value="ids" 
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Управление ID
            </TabsTrigger>
          </TabsList>

          {/* Users List Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-[#1E1E1E]">
                      {viewMode === 'list' ? 'Список' : 'Древовидная структура'} ({filteredUsers.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={viewMode === 'list' ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white' : ''}
                      >
                        <List className="w-4 h-4 mr-2" />
                        Список
                      </Button>
                      <Button
                        variant={viewMode === 'tree' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('tree')}
                        className={viewMode === 'tree' ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white' : ''}
                      >
                        <Network className="w-4 h-4 mr-2" />
                        Дерево
                      </Button>
                    </div>
                  </div>
                  
                  {viewMode === 'list' && (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666]" />
                        <Input
                          placeholder="Поиск по имени, email, ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 w-64"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'list' ? (
                  // List View
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="border border-[#E6E9EE] rounded-xl overflow-hidden">
                        {/* Main User Row */}
                        <div className="flex items-center justify-between p-4 bg-[#F7FAFC]">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center text-white">
                              <span style={{ fontWeight: '700' }}>
                                {user.имя?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                                  {user.имя} {user.фамилия}
                                </p>
                                <Badge className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white">
                                  ID: {user.id}
                                </Badge>
                                <Badge className="bg-gray-100 text-gray-700">
                                  Уровень {user.уровень}
                                </Badge>
                                {user.isAdmin && (
                                  <Badge className="bg-red-100 text-red-700">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Админ
                                  </Badge>
                                )}
                                {user.id === currentUser?.id && (
                                  <Badge className="bg-blue-100 text-blue-700">
                                    Вы
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-[#666]" style={{ fontSize: '13px' }}>
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {user.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  Реф: {user.рефКод}
                                </span>
                                {user.телефон && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {user.телефон}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                                ₽{user.баланс?.toLocaleString() || 0}
                              </p>
                              <p className="text-[#666]" style={{ fontSize: '12px' }}>Баланс</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserExpanded(user.id)}
                            >
                              {expandedUsers.has(user.id) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                            {user.id !== currentUser?.id ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id, `${user.имя} ${user.фамилия}`, user.email)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Удалить
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="border-gray-300 text-gray-400 cursor-not-allowed"
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Это вы
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Extended Info (Collapsible) */}
                        {expandedUsers.has(user.id) && (
                          <div className="p-4 bg-white border-t border-[#E6E9EE]">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-[#666] text-xs mb-1">Дата регистрации</p>
                                <p className="text-[#1E1E1E] text-sm font-medium flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {user.зарегистрирован ? new Date(user.зарегистрирован).toLocaleDateString('ru-RU') : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#666] text-xs mb-1">Спонсор</p>
                                <p className="text-[#1E1E1E] text-sm font-medium">
                                  {user.спонсорId ? `ID: ${user.спонсорId}` : 'Нет'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#666] text-xs mb-1">Партнёров в команде</p>
                                <p className="text-[#1E1E1E] text-sm font-medium flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {user.команда?.length || 0}
                                </p>
                              </div>
                              {user.telegram && (
                                <div>
                                  <p className="text-[#666] text-xs mb-1">Telegram</p>
                                  <p className="text-[#1E1E1E] text-sm font-medium">@{user.telegram}</p>
                                </div>
                              )}
                              {user.instagram && (
                                <div>
                                  <p className="text-[#666] text-xs mb-1">Instagram</p>
                                  <p className="text-[#1E1E1E] text-sm font-medium">@{user.instagram}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-[#666] text-xs mb-1">Supabase ID</p>
                                <p className="text-[#1E1E1E] text-xs font-mono">
                                  {user.supabaseId?.substring(0, 8) || '-'}...
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {filteredUsers.length === 0 && (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-[#666] mx-auto mb-4 opacity-50" />
                        <p className="text-[#666]">Пользователи не найдены</p>
                        <p className="text-[#999] text-sm mt-2">
                          {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'В системе пока нет пользователей'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Tree View
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[#666]">Древовидная структура всех партнёров ({users.length} чел.)</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            const allIds = new Set<string>();
                            users.forEach(user => {
                              if (user.команда && user.команда.length > 0) {
                                allIds.add(user.id);
                              }
                            });
                            setExpandedUsers(allIds);
                          }}
                        >
                          Развернуть всё
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setExpandedUsers(new Set())}
                        >
                          Свернуть всё
                        </Button>
                      </div>
                    </div>
                    
                    {/* Tree rendering */}
                    <div className="space-y-2">
                      {users
                        .filter(user => !user.спонсорId) // Root users without sponsors
                        .map(user => renderUserTree(user, 0))}
                    </div>
                    
                    {users.filter(user => !user.спонсорId).length === 0 && (
                      <div className="text-center py-12">
                        <Network className="w-12 h-12 text-[#666] mx-auto mb-4 opacity-50" />
                        <p className="text-[#666]">Нет пользователей для отображения</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ID Management Tab */}
          <TabsContent value="ids">
            <IdManager currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
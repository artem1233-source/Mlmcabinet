import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  Shield, 
  Trash2, 
  Calendar,
  Loader2,
  ChevronRight,
  Network,
  List,
  AlertTriangle,
  Edit,
  ChevronLeft,
  Filter,
  UserCog,
  DollarSign,
  Award,
  Wrench,
  TrendingUp,
  UserPlus,
  Wallet,
  UserCheck,
  UserX,
  Clock,
  Eye,
  ShoppingBag,
  Activity,
  X,
  MessageCircle,
  Instagram,
  Facebook,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { Label } from './ui/label';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { IdManager } from './admin/IdManager';
import { ChangeUserId } from './admin/ChangeUserId';
import { ManualLinkFixer } from './admin/ManualLinkFixer';
import { ManualSponsorAssign } from './admin/ManualSponsorAssign';
import { OrphanUsersManager } from './admin/OrphanUsersManager';
import { StatsWidgets } from './StatsWidgets';

interface UsersManagementRuProps {
  currentUser: any;
  onRefresh?: () => void;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function UsersManagementRu({ currentUser, onRefresh }: UsersManagementRuProps) {
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false); // 🆕 Отдельный loading для поиска
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  
  const isInitialLoad = useRef(true);
  const previousSearch = useRef('');

  // Tree mode - all users
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false
  });

  // Filters
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'balance' | 'level' | 'firstLine'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 🆕 Настраиваемый диапазон баланса
  const [balanceFrom, setBalanceFrom] = useState<string>('');
  const [balanceTo, setBalanceTo] = useState<string>('');
  
  // 🆕 Фильтр по диапазону рангов
  const [rankFrom, setRankFrom] = useState<number>(0);
  const [rankTo, setRankTo] = useState<number>(150);
  const [rankExactMatch, setRankExactMatch] = useState<boolean>(false);
  
  // Edit dialog
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    имя: '',
    фамилия: '',
    email: '',
    телефон: '',
    уровень: 1,
    баланс: 0,
    доступныйБаланс: 0,
    telegram: '',
    whatsapp: '',
    instagram: '',
    vk: '',
  });
  const [saving, setSaving] = useState(false);

  // 🆕 State для рангов пользователей
  const [userRanks, setUserRanks] = useState<Map<string, number>>(new Map());
  const [ranksLoading, setRanksLoading] = useState(false);

  // 📊 State для статистики
  const [stats, setStats] = useState({
    totalUsers: 0,
    newToday: 0,
    newThisMonth: 0,
    activePartners: 0,
    passivePartners: 0,
    activeUsers: 0,
    passiveUsers: 0,
    withTeam: 0,
    totalBalance: 0,
    orphans: 0
  });
  
  // 🎯 State для активного фильтра из виджетов
  const [activeStatsFilter, setActiveStatsFilter] = useState<string>('all');

  // 👁️ Quick View State
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedUserForView, setSelectedUserForView] = useState<any | null>(null);
  const [quickViewLoading, setQuickViewLoading] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);

  // 🆕 Функция для определения статуса активности
  const getActivityStatus = (lastActivity?: string) => {
    if (!lastActivity) return { status: 'inactive', color: 'bg-gray-400', text: 'Никогда не заходил', textColor: 'text-gray-600' };
    
    const now = new Date().getTime();
    const lastTime = new Date(lastActivity).getTime();
    const diff = now - lastTime;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 5) {
      return { status: 'online', color: 'bg-green-500', text: 'Онлайн', textColor: 'text-green-600' };
    } else if (hours < 24) {
      return { status: 'today', color: 'bg-yellow-500', text: `${hours}ч назад`, textColor: 'text-yellow-600' };
    } else if (days < 7) {
      return { status: 'week', color: 'bg-orange-400', text: `${days}д назад`, textColor: 'text-orange-600' };
    } else {
      return { status: 'inactive', color: 'bg-gray-400', text: `${days}д назад`, textColor: 'text-gray-600' };
    }
  };

  // 🆕 Функция для подсчета всей команды рекурсивно
  const calculateTotalTeam = (userId: string, visited = new Set<string>()): number => {
    if (visited.has(userId)) return 0; // Защита от циклов
    visited.add(userId);
    
    const user = allUsers.find(u => u.id === userId) || users.find(u => u.id === userId);
    if (!user || !user.команда || user.команда.length === 0) return 0;
    
    let total = user.команда.length; // Прямые рефералы
    
    // Рекурсивно добавляем команды рефералов
    for (const childId of user.команда) {
      total += calculateTotalTeam(childId, visited);
    }
    
    return total;
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (viewMode === 'list') {
      // Определяем, изменился ли только поиск
      const isSearchChange = debouncedSearch !== previousSearch.current;
      previousSearch.current = debouncedSearch;
      
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        loadUsers(false);
      } else {
        loadUsers(isSearchChange);
      }
    } else if (viewMode === 'tree') {
      loadAllUsersForTree();
    }
  }, [viewMode, pagination.page, debouncedSearch, sortBy, sortOrder, balanceFrom, balanceTo, rankFrom, rankTo, rankExactMatch, activeStatsFilter]);

  // 🆕 Загрузка рангов для всех пользователей
  useEffect(() => {
    if (users.length > 0) {
      loadUserRanks();
    }
  }, [users]);

  const loadUserRanks = async () => {
    try {
      setRanksLoading(true);
      const newRanks = new Map<string, number>();
      
      // Загружаем ранги только для партнёров (не админов)
      const partnersToLoad = users.filter(u => !u.isAdmin);
      
      // Загружаем ранги параллельно (макс. 10 одновременно)
      const batchSize = 10;
      for (let i = 0; i < partnersToLoad.length; i += batchSize) {
        const batch = partnersToLoad.slice(i, i + batchSize);
        const rankPromises = batch.map(user => 
          api.getUserRank(user.id, true).catch(() => ({ success: true, rank: 0 }))
        );
        
        const results = await Promise.all(rankPromises);
        results.forEach((result, index) => {
          if (result.success) {
            const user = batch[index];
            newRanks.set(user.id, result.rank);
          }
        });
      }
      
      setUserRanks(newRanks);
    } catch (error) {
      console.error('Failed to load ranks:', error);
    } finally {
      setRanksLoading(false);
    }
  };

  const loadAllUsersForTree = async () => {
    try {
      setTreeLoading(true);
      const response = await api.getAllUsers();
      if (response.success) {
        const loadedUsers = response.users || [];
        // 🚫 Additional frontend filter to exclude admins
        const filteredUsers = loadedUsers.filter((u: any) => 
          u.__type !== 'admin' && 
          u.isAdmin !== true && 
          u.роль !== 'admin'
        );
        setAllUsers(filteredUsers);
        // Auto-expand root users
        const rootUsers = filteredUsers.filter((u: any) => !u.спонсорId);
        setExpandedUsers(new Set(rootUsers.map((u: any) => u.id)));
      }
    } catch (error) {
      console.error('Failed to load tree users:', error);
      toast.error('Ошибка загрузки дерева');
    } finally {
      setTreeLoading(false);
    }
  };

  const loadUsers = async (isSearch = false) => {
    try {
      // 🔍 Используем разные loading states
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      
      const userId = localStorage.getItem('userId');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      // 🆕 Отправляем диапазон рангов
      if (rankFrom !== 0 || rankTo !== 150 || rankExactMatch) {
        params.append('rankFrom', rankFrom.toString());
        params.append('rankTo', rankTo.toString());
      }
      
      // 🆕 Отправляем диапазон баланса
      if (balanceFrom) params.append('balanceFrom', balanceFrom);
      if (balanceTo) params.append('balanceTo', balanceTo);
      
      // 🎯 Отправляем фильтр из виджетов статистики
      if (activeStatsFilter && activeStatsFilter !== 'all') {
        params.append('statsFilter', activeStatsFilter);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users/paginated?${params}`,
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
        throw new Error(data.error || 'Failed to load users');
      }

      setUsers(data.users || []);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
        hasMore: data.pagination.hasMore,
      });
      
      // 📊 Update stats if available
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error('Ошибка загрузки пользователей');
    } finally {
      // 🔍 Сбрасываем loading state в зависимости от типа запроса
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
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
        toast.success('Пользователь удалён!');
        loadUsers();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Ошибка удаления пользователя');
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

  const handleCleanBrokenRefs = async () => {
    if (!confirm('🧹 ОЧИСТКА БИТЫХ ССЫЛОК\n\nЭта операция удалит все ссылки на несуществующих пользователей.\n\nПродолжить?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.cleanBrokenRefs();
      
      if (response.success) {
        toast.success('Очистка завершена!');
        await loadUsers();
      } else {
        throw new Error(response.error || 'Failed to clean');
      }
    } catch (error) {
      console.error('Clean error:', error);
      toast.error('Ошибка очистки');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTeams = async () => {
    if (!confirm('🔄 СИНХРОНИЗАЦИЯ КОМАНД\n\nЭта операция синхронизирует команды пользователей.\n\nПродолжить?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.syncTeams();
      
      if (response.success) {
        toast.success('Синхронизация завершена!');
        await loadUsers();
      } else {
        throw new Error(response.error || 'Failed to sync');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Ошибка синхронизации');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      имя: user.имя || '',
      фамилия: user.фамилия || '',
      email: user.email || '',
      телефон: user.телефон || '',
      уровень: user.уровень || 1,
      баланс: user.баланс || 0,
      доступныйБаланс: user.доступныйБаланс || 0,
      telegram: user.telegram || user.socialMedia?.telegram || '',
      whatsapp: user.whatsapp || user.socialMedia?.whatsapp || '',
      instagram: user.instagram || user.socialMedia?.instagram || '',
      vk: user.vk || user.socialMedia?.vk || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      const userId = localStorage.getItem('userId');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${editingUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Id': userId || '',
          },
          body: JSON.stringify({ userData: editFormData }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обновления пользователя');
      }

      toast.success('Пользователь обновлён!');
      setEditDialogOpen(false);
      setEditingUser(null);
      loadUsers();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Ошибка обновления пользователя');
    } finally {
      setSaving(false);
    }
  };

  // 🎯 Обработчик клика по виджетам статистики
  const handleStatsFilterClick = (filter: string) => {
    setActiveStatsFilter(filter);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // 👁️ Открытие Quick View панели
  const openQuickView = async (user: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Предотвращаем всплытие события
    
    setSelectedUserForView(user);
    setQuickViewOpen(true);
    
    // Загружаем детальные данные
    try {
      setQuickViewLoading(true);
      
      // Загружаем заказы пользователя
      const ordersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/user-orders/${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const ordersData = await ordersResponse.json();
      setUserOrders(ordersData.orders || []);
      
      // Загружаем транзакции пользователя
      const transactionsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/user-transactions/${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const transactionsData = await transactionsResponse.json();
      setUserTransactions(transactionsData.transactions || []);
      
    } catch (error) {
      console.error('Failed to load user details:', error);
    } finally {
      setQuickViewLoading(false);
    }
  };

  const renderUserCard = (user: any, isAdmin: boolean = false) => {
    const isExpanded = expandedUsers.has(user.id);

    return (
      <div 
        key={user.id} 
        className={`border rounded-xl overflow-hidden transition-all duration-150 hover:shadow-md cursor-pointer ${
          isAdmin ? 'border-purple-200 bg-purple-50/30' : 'border-[#E6E9EE] bg-white hover:border-[#39B7FF]/40'
        }`}
        onClick={(e) => {
          // Предотвращаем открытие если кликнули на кнопку действия
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          toggleUserExpanded(user.id);
        }}
      >
        <div className="p-3">
          <div className="flex items-center justify-between gap-3">
            {/* User Info - Compact */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 overflow-hidden relative ${
                isAdmin 
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                  : 'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]'
              }`}>
                {user.аватарка ? (
                  <img 
                    src={user.аватарка} 
                    alt={user.имя}
                    className="w-full h-full object-cover absolute inset-0"
                    onError={(e) => {
                      // Fallback к инициалам при ошибке загрузки
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center" style={{ fontWeight: '600', fontSize: '15px', display: user.аватарка ? 'none' : 'flex' }}>
                  {user.имя?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>
                    {user.имя} {user.фамилия}
                  </h3>
                  <Badge className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white px-2 py-0 text-xs">
                    {user.id}
                  </Badge>
                  {user.партнёрскийID && (
                    <Badge className="border-[#39B7FF] text-[#39B7FF] bg-[#F0F9FF] px-2 py-0 text-xs" variant="outline">
                      P{user.партнёрскийID}
                    </Badge>
                  )}
                  {isAdmin && (
                    <Badge className="bg-purple-600 text-white px-2 py-0 text-xs">
                      <Shield className="w-3 h-3 mr-0.5" />
                      Admin
                    </Badge>
                  )}
                  {!isAdmin && (
                    <Badge className="bg-orange-500 text-white px-2 py-0 text-xs">
                      Ранг {userRanks.get(user.id) ?? '...'}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-[#666] flex-wrap" style={{ fontSize: '12px' }}>
                  {/* 🎨 Activity Status Indicator */}
                  {(() => {
                    const activityStatus = getActivityStatus(user.lastActivity);
                    return (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${activityStatus.color} animate-pulse`}></span>
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className={activityStatus.textColor}>{activityStatus.text}</span>
                      </span>
                    );
                  })()}
                  
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0 text-[#39B7FF]" />
                    <span className="truncate">{user.email}</span>
                  </span>
                  {user.телефон && (
                    <span className="flex items-center gap-1 shrink-0">
                      <Phone className="w-3 h-3 text-[#12C9B6]" />
                      <span>{user.телефон}</span>
                    </span>
                  )}
                  {user.команда?.length > 0 && (
                    <span className="flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3 text-teal-600" />
                      <span>{user.команда.length} (всего: {calculateTotalTeam(user.id)})</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Balance & Actions - Compact */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[#1E1E1E]" style={{ fontWeight: '700', fontSize: '15px' }}>
                  ₽{user.баланс?.toLocaleString() || 0}
                </p>
                <p className="text-[#999]" style={{ fontSize: '11px' }}>
                  Дост: ₽{user.доступныйБаланс?.toLocaleString() || 0}
                </p>
              </div>
              
              {/* Индикатор раскрытия */}
              <div className="w-6 h-6 flex items-center justify-center text-[#999]">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
              
              {/* Разделитель */}
              <div className="h-8 w-px bg-[#E6E9EE]"></div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickView(user, e);
                  }}
                  className="w-8 h-8 p-0 hover:bg-purple-50"
                  title="Открыть детали"
                >
                  <ChevronRight className="w-4 h-4 text-purple-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(user);
                  }}
                  className="w-8 h-8 p-0 hover:bg-blue-50"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </Button>
                {user.id !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(user.id, `${user.имя} ${user.фамилия}`, user.email);
                    }}
                    className="w-8 h-8 p-0 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Details - Compact Grid */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-[#E6E9EE]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <p className="text-[#999] mb-0.5" style={{ fontSize: '10px', fontWeight: '600' }}>РЕГИСТРАЦИЯ</p>
                  <p className="text-[#1E1E1E]" style={{ fontSize: '12px', fontWeight: '600' }}>
                    {user.зарегистрирован ? new Date(user.зарегистрирован).toLocaleDateString('ru-RU') : '-'}
                  </p>
                </div>
                <div className="bg-purple-50 p-2 rounded-lg">
                  <p className="text-[#999] mb-0.5" style={{ fontSize: '10px', fontWeight: '600' }}>СПОНСОР</p>
                  <p className="text-[#1E1E1E]" style={{ fontSize: '12px', fontWeight: '600' }}>
                    {user.спонсорId ? `ID: ${user.спонсорId}` : 'Нет'}
                  </p>
                </div>
                <div className="bg-teal-50 p-2 rounded-lg">
                  <p className="text-[#999] mb-0.5" style={{ fontSize: '10px', fontWeight: '600' }}>КОМАНДА</p>
                  <p className="text-[#1E1E1E]" style={{ fontSize: '12px', fontWeight: '600' }}>
                    Первая линия: {user.команда?.length || 0}<br/>
                    Вся структура: {calculateTotalTeam(user.id)}
                  </p>
                </div>
                <div className="bg-green-50 p-2 rounded-lg">
                  <p className="text-[#999] mb-0.5" style={{ fontSize: '10px', fontWeight: '600' }}>РЕФ КОД</p>
                  <p className="text-[#1E1E1E] font-mono" style={{ fontSize: '11px', fontWeight: '600' }}>
                    {user.рефКод || '-'}
                  </p>
                </div>
              </div>
              
              {/* 📱 Социальные сети */}
              {(user.telegram || user.whatsapp || user.instagram || user.vk || user.socialMedia) && (
                <div className="mt-2">
                  <p className="text-[#999] mb-1.5" style={{ fontSize: '10px', fontWeight: '600' }}>СОЦИАЛЬНЫЕ СЕТИ</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(user.telegram || user.socialMedia?.telegram) && (
                      <div className="flex items-center gap-1.5 bg-blue-50 p-1.5 rounded">
                        <Send className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <span className="text-[#1E1E1E] truncate" style={{ fontSize: '10px', fontWeight: '500' }}>
                          {user.telegram || user.socialMedia?.telegram}
                        </span>
                      </div>
                    )}
                    {(user.whatsapp || user.socialMedia?.whatsapp) && (
                      <div className="flex items-center gap-1.5 bg-green-50 p-1.5 rounded">
                        <Phone className="w-3 h-3 text-green-600 flex-shrink-0" />
                        <span className="text-[#1E1E1E] truncate" style={{ fontSize: '10px', fontWeight: '500' }}>
                          {user.whatsapp || user.socialMedia?.whatsapp}
                        </span>
                      </div>
                    )}
                    {(user.instagram || user.socialMedia?.instagram) && (
                      <div className="flex items-center gap-1.5 bg-pink-50 p-1.5 rounded">
                        <Instagram className="w-3 h-3 text-pink-600 flex-shrink-0" />
                        <span className="text-[#1E1E1E] truncate" style={{ fontSize: '10px', fontWeight: '500' }}>
                          {user.instagram || user.socialMedia?.instagram}
                        </span>
                      </div>
                    )}
                    {(user.vk || user.socialMedia?.vk) && (
                      <div className="flex items-center gap-1.5 bg-indigo-50 p-1.5 rounded">
                        <Facebook className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                        <span className="text-[#1E1E1E] truncate" style={{ fontSize: '10px', fontWeight: '500' }}>
                          {user.vk || user.socialMedia?.vk}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderUserTree = (user: any, level: number): JSX.Element => {
    const hasChildren = user.команда && user.команда.length > 0;
    const isExpanded = expandedUsers.has(user.id);
    const visualLevel = Math.min(level, 12);
    const indent = visualLevel * 20;

    return (
      <div key={user.id} className="mb-1">
        <div 
          className="border border-[#E6E9EE] rounded-lg p-3 bg-white hover:bg-[#F7FAFC] transition-colors"
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="flex items-center gap-3">
            {level > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-px h-8 bg-[#E6E9EE]" />
                <span className="text-xs text-[#999] font-mono min-w-[28px]">L{level}</span>
              </div>
            )}
            
            {hasChildren ? (
              <button
                onClick={() => toggleUserExpanded(user.id)}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[#666]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#666]" />
                )}
              </button>
            ) : (
              <div className="w-7" />
            )}
            
            <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-lg flex items-center justify-center text-white shrink-0">
              <span style={{ fontWeight: '600', fontSize: '14px' }}>
                {user.имя?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            
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
        
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {user.команда.map((childId: string) => {
              const childUser = allUsers.find((u: any) => u.id === childId);
              return childUser ? renderUserTree(childUser, level + 1) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4"> {/* Было mb-8 */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-[#1E1E1E]" style={{ fontSize: '32px', fontWeight: '700' }}>
                Управление пользователями
              </h1>
              <p className="text-[#666]" style={{ fontSize: '15px' }}>
                Полный контроль над пользователями и их данными
              </p>
            </div>
          </div>
        </div>

        {/* 📊 Clickable Stats Widgets */}
        <StatsWidgets
          stats={stats}
          activeFilter={activeStatsFilter}
          onFilterClick={handleStatsFilterClick}
        />

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-3"> {/* Было space-y-6 */}
          <TabsList className="bg-white border border-[#E6E9EE] p-1.5 rounded-xl shadow-sm">
            <TabsTrigger 
              value="users" 
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Users className="w-4 h-4 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger 
              value="ids" 
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Shield className="w-4 h-4 mr-2" />
              Управление ID
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
              <CardHeader className="border-b border-[#E6E9EE]">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-[#1E1E1E]">
                      {viewMode === 'list' ? 'Список пользователей' : 'Дреовидная структура'}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-[#E6E9EE] hover:bg-gray-50"
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Утилиты
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={handleCleanBrokenRefs}>
                          <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
                          <span>Очистить битые ссылки</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSyncTeams}>
                          <Users className="w-4 h-4 mr-2 text-blue-600" />
                          <span>Синхронизировать</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-4 pt-0 -mt-3"> {/* Увеличили отрицательный margin */}
                {viewMode === 'tree' ? (
                  treeLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#39B7FF]" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allUsers.filter(u => !u.спонсорId && u.isAdmin !== true).map((rootUser) => 
                        renderUserTree(rootUser, 0)
                      )}
                    </div>
                  )
                ) : loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#39B7FF]" />
                  </div>
                ) : (
                  <div className="space-y-3"> {/* Было space-y-6 */}
                    {/* Filters & Sort Bar */}
                    <div className="bg-white p-4 rounded-xl border border-[#E6E9EE] shadow-sm">
                      {/* Верхний ряд - Фильтры */}
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <Filter className="w-5 h-5 text-[#666] shrink-0" />
                        
                        {/* 🏆 Rank Filter */}
                        <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-orange-100/50 px-4 py-2.5 rounded-lg border border-orange-200">
                          <Award className="w-4 h-4 text-orange-600 shrink-0" />
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="rankExact"
                                checked={rankExactMatch}
                                onCheckedChange={(checked) => {
                                  setRankExactMatch(checked as boolean);
                                  setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                              />
                              <label htmlFor="rankExact" className="text-sm text-orange-900 cursor-pointer whitespace-nowrap select-none">
                                Точный
                              </label>
                            </div>
                            
                            {rankExactMatch ? (
                              <select
                                value={rankFrom}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setRankFrom(value);
                                  setRankTo(value);
                                  setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                className="h-9 px-3 border border-orange-300 rounded-lg text-sm bg-white hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[100px]"
                              >
                                {Array.from({ length: 151 }, (_, i) => i).map((rank) => (
                                  <option key={rank} value={rank}>
                                    Ранг {rank}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-orange-700 whitespace-nowrap">От:</span>
                                  <select
                                    value={rankFrom}
                                    onChange={(e) => {
                                      setRankFrom(Number(e.target.value));
                                      setPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="h-9 px-3 border border-orange-300 rounded-lg text-sm bg-white hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 w-20"
                                  >
                                    {Array.from({ length: 151 }, (_, i) => i).map((rank) => (
                                      <option key={rank} value={rank}>
                                        {rank}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-orange-700 whitespace-nowrap">До:</span>
                                  <select
                                    value={rankTo}
                                    onChange={(e) => {
                                      setRankTo(Number(e.target.value));
                                      setPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="h-9 px-3 border border-orange-300 rounded-lg text-sm bg-white hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 w-20"
                                  >
                                    {Array.from({ length: 151 }, (_, i) => i).map((rank) => (
                                      <option key={rank} value={rank}>
                                        {rank}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 💰 Balance Filter */}
                        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100/50 px-4 py-2.5 rounded-lg border border-blue-200">
                          <DollarSign className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-blue-700 whitespace-nowrap">От:</span>
                              <Input
                                type="number"
                                value={balanceFrom}
                                onChange={(e) => {
                                  setBalanceFrom(e.target.value);
                                  setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                placeholder="0"
                                className="h-9 w-24 border-blue-300 focus:ring-blue-400"
                              />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-blue-700 whitespace-nowrap">До:</span>
                              <Input
                                type="number"
                                value={balanceTo}
                                onChange={(e) => {
                                  setBalanceTo(e.target.value);
                                  setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                placeholder="∞"
                                className="h-9 w-24 border-blue-300 focus:ring-blue-400"
                              />
                            </div>
                          </div>
                        </div>

                        {/* ✕ Clear Filters */}
                        {(rankFrom !== 0 || rankTo !== 150 || rankExactMatch || balanceFrom !== '' || balanceTo !== '' || sortBy !== 'created' || sortOrder !== 'desc') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRankFrom(0);
                              setRankTo(150);
                              setRankExactMatch(false);
                              setBalanceFrom('');
                              setBalanceTo('');
                              setSortBy('created');
                              setSortOrder('desc');
                              setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            ✕ Сбросить
                          </Button>
                        )}

                        {/* 📊 Results count */}
                        <div className="ml-auto h-9 flex items-center text-sm text-[#666] bg-gradient-to-r from-gray-50 to-gray-100 px-4 rounded-lg border border-[#E6E9EE]">
                          Найдено: <span className="ml-1.5 font-semibold text-[#1E1E1E]">{pagination.total}</span>
                        </div>
                      </div>

                      {/* Нижний ряд - Сортировка и Поиск */}
                      <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-[#E6E9EE]">
                        <span className="text-sm text-[#666]">Сортировка:</span>

                        {/* 📊 Sort By */}
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="h-9 px-4 border border-[#E6E9EE] rounded-lg text-sm bg-white hover:border-[#39B7FF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#39B7FF] min-w-[160px]">
                          <option value="created">📅 Дата регистрации</option>
                          <option value="name">👤 По имени</option>
                          <option value="balance">💰 По балансу</option>
                          <option value="level">⭐ По уровню</option>
                          <option value="firstLine">👥 По первой линии</option>
                        </select>

                        {/* ⬆️⬇️ Sort Order */}
                        <button
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="h-9 px-4 border border-[#E6E9EE] rounded-lg text-sm bg-white hover:bg-[#F0F9FF] hover:border-[#39B7FF] transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                          {sortOrder === 'desc' ? (
                            <>
                              <ChevronDown className="w-4 h-4 text-[#39B7FF]" />
                              <span>По убыванию</span>
                            </>
                          ) : (
                            <>
                              <ChevronUp className="w-4 h-4 text-[#12C9B6]" />
                              <span>По возрастанию</span>
                            </>
                          )}
                        </button>

                        {/* 🔍 Search - Справа */}
                        <div className="relative ml-auto">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666]" />
                          <Input
                            placeholder="Поиск по имени, email, ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 h-9 w-72"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Partners List */}
                    {users.length > 0 && (
                      <div className="space-y-2"> {/* Было space-y-3 */}
                        {users.map((user) => renderUserCard(user, false))}
                      </div>
                    )}

                    {/* Empty State */}
                    {users.length === 0 && (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-[#666]">Пользователи не найдены</p>
                      </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-6 border-t border-[#E6E9EE]">
                        <p className="text-[#666]" style={{ fontSize: '14px' }}>
                          Страница {pagination.page} из {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Назад
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={!pagination.hasMore}
                          >
                            Вперёд
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ID Management Tab */}
          <TabsContent value="ids" className="space-y-6">
            <IdManager currentUser={currentUser} onDataChange={loadUsers} />
            <ChangeUserId />
            <ManualLinkFixer />
            <ManualSponsorAssign />
            <OrphanUsersManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                editingUser?.isAdmin 
                  ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                  : 'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]'
              }`}>
                {editingUser?.isAdmin ? (
                  <Shield className="w-5 h-5 text-white" />
                ) : (
                  <Users className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>Редактирование пользователя</span>
                  {editingUser?.isAdmin && (
                    <Badge className="bg-purple-100 text-purple-700">Admin</Badge>
                  )}
                </div>
                <DialogDescription className="mt-1">
                  ID: {editingUser?.id} {editingUser?.партнёрскийID && `• P${editingUser.партнёрскийID}`}
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="имя">Имя</Label>
                <Input
                  id="имя"
                  value={editFormData.имя}
                  onChange={(e) => setEditFormData({ ...editFormData, имя: e.target.value })}
                  placeholder="Введите имя"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="фамилия">Фамилия</Label>
                <Input
                  id="фамилия"
                  value={editFormData.фамилия}
                  onChange={(e) => setEditFormData({ ...editFormData, фамилия: e.target.value })}
                  placeholder="Введите фамилию"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="телефон" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Телефон
              </Label>
              <Input
                id="телефон"
                value={editFormData.телефон}
                onChange={(e) => setEditFormData({ ...editFormData, телефон: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            {/* 📱 Social Media */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="w-4 h-4" />
                Социальные сети
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="telegram" className="flex items-center gap-1.5 text-xs">
                    <Send className="w-3 h-3 text-blue-600" />
                    Telegram
                  </Label>
                  <Input
                    id="telegram"
                    value={editFormData.telegram || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, telegram: e.target.value })}
                    placeholder="@username"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="flex items-center gap-1.5 text-xs">
                    <Phone className="w-3 h-3 text-green-600" />
                    WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    value={editFormData.whatsapp || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                    placeholder="+7 999 123-45-67"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-1.5 text-xs">
                    <Instagram className="w-3 h-3 text-pink-600" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={editFormData.instagram || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, instagram: e.target.value })}
                    placeholder="@username"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vk" className="flex items-center gap-1.5 text-xs">
                    <Facebook className="w-3 h-3 text-indigo-600" />
                    VK
                  </Label>
                  <Input
                    id="vk"
                    value={editFormData.vk || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, vk: e.target.value })}
                    placeholder="id123456789"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Partner Level - только для партнёров */}
            {!editingUser?.isAdmin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="уровень" className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Уровень партнёра
                  </Label>
                  <select
                    id="уровень"
                    value={editFormData.уровень}
                    onChange={(e) => setEditFormData({ ...editFormData, уровень: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
                  >
                    <option value={1}>Уровень 1</option>
                    <option value={2}>Уровень 2</option>
                    <option value={3}>Уровень 3</option>
                  </select>
                </div>

                {/* Balance */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="баланс" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Общий баланс
                    </Label>
                    <Input
                      id="баланс"
                      type="number"
                      value={editFormData.баланс}
                      onChange={(e) => setEditFormData({ ...editFormData, баланс: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="доступныйБаланс" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Доступный баланс
                    </Label>
                    <Input
                      id="доступныйБаланс"
                      type="number"
                      value={editFormData.доступныйБаланс}
                      onChange={(e) => setEditFormData({ ...editFormData, доступныйБаланс: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Warning for admin */}
            {editingUser?.isAdmin && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Это администратор. Редактируйте с осторожностью.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={saving}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 👁️ Quick View Sheet */}
      <Sheet open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center text-white overflow-hidden relative">
                {selectedUserForView?.аватарка ? (
                  <img 
                    src={selectedUserForView.аватарка} 
                    alt={selectedUserForView.имя}
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center" style={{ fontWeight: '700', fontSize: '18px' }}>
                    {selectedUserForView?.имя?.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div>
                <div>{selectedUserForView?.имя} {selectedUserForView?.фамилия}</div>
                <SheetDescription className="text-sm">
                  ID: {selectedUserForView?.id}
                </SheetDescription>
              </div>
            </SheetTitle>
          </SheetHeader>

          {quickViewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#39B7FF]" />
            </div>
          ) : selectedUserForView && (
            <div className="mt-6 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCog className="w-4 h-4" />
                    Основная информация
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#999] mb-1">Email</p>
                      <p className="text-sm font-medium">{selectedUserForView.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#999] mb-1">Телефон</p>
                      <p className="text-sm font-medium">{selectedUserForView.телефон || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#999] mb-1">Уровень</p>
                      <Badge className="bg-blue-100 text-blue-700">{selectedUserForView.уровень}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-[#999] mb-1">Ранг</p>
                      <Badge className="bg-orange-100 text-orange-700">
                        {userRanks.get(selectedUserForView.id) ?? 0}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-[#999] mb-1">Регистрация</p>
                      <p className="text-sm">
                        {selectedUserForView.зарегистрирован 
                          ? new Date(selectedUserForView.зарегистрирован).toLocaleDateString('ru-RU')
                          : '—'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#999] mb-1">Реф. код</p>
                      <p className="text-sm font-mono font-medium">{selectedUserForView.рефКод || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Balance */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Баланс
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
                      <p className="text-xs text-green-700 mb-1">Общий баланс</p>
                      <p className="text-2xl font-bold text-green-900">
                        ₽{selectedUserForView.баланс?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl">
                      <p className="text-xs text-blue-700 mb-1">Доступно</p>
                      <p className="text-2xl font-bold text-blue-900">
                        ₽{selectedUserForView.доступныйБаланс?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Команда
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#999] mb-1">Первая линия</p>
                      <p className="text-xl font-bold">{selectedUserForView.команда?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#999] mb-1">Вся структура</p>
                      <p className="text-xl font-bold">{calculateTotalTeam(selectedUserForView.id)}</p>
                    </div>
                  </div>
                  {selectedUserForView.спонсорId && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-700 mb-1">Спонсор</p>
                      <p className="text-sm font-medium">ID: {selectedUserForView.спонсорId}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 📱 Social Media */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Социальные сети
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Send className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-[#999] mb-0.5">Telegram</p>
                        <p className="text-sm font-medium">
                          {selectedUserForView.telegram || selectedUserForView.socialMedia?.telegram || <span className="text-[#999]">Не указан</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <Phone className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-xs text-[#999] mb-0.5">WhatsApp</p>
                        <p className="text-sm font-medium">
                          {selectedUserForView.whatsapp || selectedUserForView.socialMedia?.whatsapp || <span className="text-[#999]">Не указан</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg">
                      <Instagram className="w-4 h-4 text-pink-600" />
                      <div>
                        <p className="text-xs text-[#999] mb-0.5">Instagram</p>
                        <p className="text-sm font-medium">
                          {selectedUserForView.instagram || selectedUserForView.socialMedia?.instagram || <span className="text-[#999]">Не указан</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
                      <Facebook className="w-4 h-4 text-indigo-600" />
                      <div>
                        <p className="text-xs text-[#999] mb-0.5">VK</p>
                        <p className="text-sm font-medium">
                          {selectedUserForView.vk || selectedUserForView.socialMedia?.vk || <span className="text-[#999]">Не указан</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Orders */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Заказы ({userOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userOrders.length > 0 ? (
                    <div className="space-y-2">
                      {userOrders.slice(0, 5).map((order: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{order.продукт || 'Продукт'}</p>
                            <p className="text-xs text-[#999]">
                              {order.дата ? new Date(order.дата).toLocaleDateString('ru-RU') : '—'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">₽{order.сумма?.toLocaleString() || 0}</p>
                            <Badge 
                              className={`text-xs ${
                                order.статус === 'завершён' ? 'bg-green-100 text-green-700' :
                                order.статус === 'в обработке' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {order.статус || 'Не указан'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {userOrders.length > 5 && (
                        <p className="text-xs text-center text-[#999] pt-2">
                          И ещё {userOrders.length - 5} заказов...
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#999] text-center py-6">Заказов пока нет</p>
                  )}
                </CardContent>
              </Card>

              {/* Transactions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Транзакции ({userTransactions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userTransactions.length > 0 ? (
                    <div className="space-y-2">
                      {userTransactions.slice(0, 5).map((transaction: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{transaction.тип || 'Операция'}</p>
                            <p className="text-xs text-[#999]">
                              {transaction.дата ? new Date(transaction.дата).toLocaleDateString('ru-RU') : '—'}
                            </p>
                          </div>
                          <p className={`text-sm font-bold ${
                            transaction.сумма > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.сумма > 0 ? '+' : ''}₽{transaction.сумма?.toLocaleString() || 0}
                          </p>
                        </div>
                      ))}
                      {userTransactions.length > 5 && (
                        <p className="text-xs text-center text-[#999] pt-2">
                          И ещё {userTransactions.length - 5} транзакций...
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#999] text-center py-6">Транзакций пока нет</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
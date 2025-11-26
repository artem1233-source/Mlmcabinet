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
  Send,
  Info,
  PhoneCall,
  ExternalLink,
  Copy,
  Download,
  Bell,
  Link2,
  BarChart3,
  TrendingDown,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight
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
  
  // 📋 State для модального окна детальной информации
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any | null>(null);
  
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
  const [balanceConfirmOpen, setBalanceConfirmOpen] = useState(false);
  const [originalBalances, setOriginalBalances] = useState({ баланс: 0, доступныйБаланс: 0 });

  // 🔔 State для отправки уведомлений
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationData, setNotificationData] = useState({
    тип: 'course' as 'order' | 'commission' | 'new_partner' | 'goal' | 'inactive' | 'withdrawal' | 'course',
    заголовок: '',
    сообщение: '',
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationTargetUser, setNotificationTargetUser] = useState<any | null>(null);

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
  const getActivityStatus = (user: any) => {
    // Проверяем различные возможные поля для последней активности
    const lastActivity = user?.lastActivity || user?.lastLogin || user?.последняяАктивность || user?.последнийВход;
    
    if (!lastActivity) return { status: 'inactive', color: 'bg-gray-400', text: 'Никогда не заходил', textColor: 'text-gray-600' };
    
    const now = new Date().getTime();
    const lastTime = new Date(lastActivity).getTime();
    const diff = now - lastTime;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 3) {
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

  // 💓 Автообновление списка каждые 60 секунд для актуализации статусов активности
  useEffect(() => {
    if (viewMode !== 'list') return; // Только для режима списка

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing users list for activity status');
      loadUsers(false); // Тихое обновление без изменения loading state
    }, 60000); // 60 секунд

    return () => clearInterval(interval);
  }, [viewMode]); // Убрали лишние зависимости, чтобы не пересоздавать интервал

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
    setOriginalBalances({ 
      баланс: user.баланс || 0, 
      доступныйБаланс: user.доступныйБаланс || 0 
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    // Проверяем, изменились ли балансы
    const balanceChanged = 
      editFormData.баланс !== originalBalances.баланс || 
      editFormData.доступныйБаланс !== originalBalances.доступныйБаланс;

    // Если баланс изменился, показываем подтверждение
    if (balanceChanged) {
      setBalanceConfirmOpen(true);
      return;
    }

    // Если баланс не изменился, сохраняем сразу
    await saveUserData();
  };

  const saveUserData = async () => {
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
      setBalanceConfirmOpen(false);
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

  // 🔔 Открытие диалога отправки уведомления
  const openNotificationDialog = (user: any) => {
    setNotificationTargetUser(user);
    setNotificationData({
      тип: 'course',
      заголовок: '',
      сообщение: '',
    });
    setNotificationDialogOpen(true);
  };

  // 🔔 Отправка уведомления пользователю
  const handleSendNotification = async () => {
    if (!notificationTargetUser || !notificationData.заголовок || !notificationData.сообщение) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      setSendingNotification(true);
      console.log('🔔 Sending notification to user:', notificationTargetUser);
      console.log('🔔 User ID:', notificationTargetUser.id);
      await api.sendNotificationToUser(notificationTargetUser.id, notificationData);
      toast.success('Уведомление отправлено!');
      setNotificationDialogOpen(false);
      setNotificationTargetUser(null);
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error(error.message || 'Ошибка отправки уведомления');
    } finally {
      setSendingNotification(false);
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

  // 📊 Экспорт всех пользователей в Google Sheets
  const handleExportToGoogleSheets = async () => {
    try {
      const exportData = users.map((user, index) => {
        const activityStatus = getActivityStatus(user);
        return {
          '№': index + 1,
          'ID': user.id || '-',
          'Имя': user.имя || '-',
          'Фамилия': user.фамилия || '-',
          'Email': user.email || '-',
          'Телефон': user.телефон || '-',
          'Уровень': user.уровень || 1,
          'Баланс': user.баланс || 0,
          'Доступный баланс': user.доступныйБаланс || 0,
          'Холдинг': user.холдинг || 0,
          'Реферальный код': user.реферальныйКод || '-',
          'Спонсор ID': user.спонсорID || '-',
          'Команда (1 линия)': user.команда?.length || 0,
          'Всего в структуре': calculateTotalTeam(user.id),
          'Дата регистрации': user.зарегистрирован ? new Date(user.зарегистрирован).toLocaleDateString('ru-RU') : '-',
          'Последняя активность': activityStatus.text,
          'Город': user.город || '-',
          'Страна': user.страна || '-'
        };
      });

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join('\t'),
        ...exportData.map(row => headers.map(h => row[h]).join('\t'))
      ].join('\n');

      // Используем альтернативный метод копирования для обхода ограничений Clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = csvContent;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast.success(
            'Данные скопированы! Откройте Google Sheets и вставьте (Ctrl+V)',
            { duration: 5000 }
          );
        } else {
          throw new Error('execCommand failed');
        }
      } catch (execError) {
        // Если execCommand не сработал, пробуем современный API
        try {
          await navigator.clipboard.writeText(csvContent);
          toast.success(
            'Данные скопированы! Откройте Google Sheets и вставьте (Ctrl+V)',
            { duration: 5000 }
          );
        } catch (clipboardError) {
          toast.error('Не удалось скопировать данные. Попробуйте вручную скопировать из консоли.');
          console.log('CSV Data for manual copy:', csvContent);
        }
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта данных');
    }
  };

  // 📄 Индивидуальный экспорт пользователя в PDF
  const handleExportUserToPDF = async (user: any) => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      // Создаём временный контейнер с карточкой пользователя
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 40px;
        background-color: #ffffff;
        font-family: Arial, sans-serif;
        color: #000000;
      `;
      
      tempContainer.innerHTML = `
        <div style="all: initial; font-family: Arial, sans-serif; background: #ffffff; color: #000000; box-sizing: border-box; display: block; padding: 40px; width: 800px;">
          <div style="border-bottom: 3px solid #39B7FF; padding-bottom: 20px; margin-bottom: 30px; background: transparent;">
            <h1 style="all: initial; font-family: Arial, sans-serif; color: #39B7FF; margin: 0; padding: 0; font-size: 32px; font-weight: bold; display: block;">Карточка пользователя</h1>
            <p style="all: initial; font-family: Arial, sans-serif; color: #999999; margin: 10px 0 0 0; padding: 0; font-size: 14px; display: block;">Дата создания: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}</p>
          </div>
          
          <div style="margin-bottom: 30px; background: transparent;">
            <h2 style="all: initial; font-family: Arial, sans-serif; color: #1E1E1E; font-size: 20px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #F0F0F0; padding-bottom: 8px; display: block;">Основная информация</h2>
            <table style="all: initial; width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; display: table;">
              <tbody style="all: initial; display: table-row-group;">
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; width: 180px; font-family: Arial, sans-serif; display: table-cell;">ФИО:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${user.имя || ''} ${user.фамилия || ''}</td>
              </tr>
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">ID:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${user.id || '-'}</td>
              </tr>
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Email:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${user.email || '-'}</td>
              </tr>
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Телефон:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${user.телефон || '-'}</td>
              </tr>
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Реферальный код:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${user.рефКод || '-'}</td>
              </tr>
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Спонсор ID:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${user.спонсорId || '-'}</td>
              </tr>
              <tr style="all: initial; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Дата регистрации:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${user.зарегистрирован ? new Date(user.зарегистрирован).toLocaleDateString('ru-RU') : '-'}</td>
              </tr>
              </tbody>
            </table>
          </div>
          
          <div style="margin-bottom: 30px; background: transparent;">
            <h2 style="all: initial; font-family: Arial, sans-serif; color: #1E1E1E; font-size: 20px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #F0F0F0; padding-bottom: 8px; display: block;">Финансовая информация</h2>
            <table style="all: initial; width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; display: table;">
              <tbody style="all: initial; display: table-row-group;">
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; width: 180px; font-family: Arial, sans-serif; display: table-cell;">Уровень:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">Уровень ${user.уровень || 1}</td>
              </tr>
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Баланс:</td>
                <td style="all: initial; padding: 10px 0; color: #12C9B6; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; display: table-cell;">${(user.баланс || 0).toLocaleString('ru-RU')} ₽</td>
              </tr>
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Доступный баланс:</td>
                <td style="all: initial; padding: 10px 0; color: #39B7FF; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; display: table-cell;">${(user.доступныйБаланс || 0).toLocaleString('ru-RU')} ₽</td>
              </tr>
              <tr style="all: initial; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Холдинг:</td>
                <td style="all: initial; padding: 10px 0; color: #FF9500; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; display: table-cell;">${(user.холдинг || 0).toLocaleString('ru-RU')} ₽</td>
              </tr>
              </tbody>
            </table>
          </div>
          
          <div style="background: transparent;">
            <h2 style="all: initial; font-family: Arial, sans-serif; color: #1E1E1E; font-size: 20px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #F0F0F0; padding-bottom: 8px; display: block;">Структура команды</h2>
            <table style="all: initial; width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; display: table;">
              <tbody style="all: initial; display: table-row-group;">
              <tr style="all: initial; border-bottom: 1px solid #F0F0F0; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; width: 180px; font-family: Arial, sans-serif; display: table-cell;">Команда (1 линия):</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${user.команда?.length || 0} чел</td>
              </tr>
              <tr style="all: initial; display: table-row;">
                <td style="all: initial; padding: 10px 0; color: #666666; font-size: 14px; font-family: Arial, sans-serif; display: table-cell;">Всего в структуре:</td>
                <td style="all: initial; padding: 10px 0; color: #1E1E1E; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; display: table-cell;">${calculateTotalTeam(user.id)} чел</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      
      document.body.appendChild(tempContainer);
      
      // Конвертируем в canvas с полной изоляцией от глобальных стилей
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false
      });
      
      // Удаляем временный контейнер
      document.body.removeChild(tempContainer);
      
      // Создаём PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // отступы 10мм с каждой стороны
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10;
      
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
      
      // Если контент не помещается на одну страницу
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }
      
      const fileName = `user_${user.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('Карточка пользователя экспортирована в PDF!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта в PDF');
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
          if (target.closest('button') || target.closest('a')) return;
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
                    const activityStatus = getActivityStatus(user);
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
                    setSelectedUserForDetails(user);
                    setUserDetailsOpen(true);
                  }}
                  className="w-8 h-8 p-0 hover:bg-blue-50"
                  title="Детальная информация"
                >
                  <Info className="w-4 h-4 text-[#39B7FF]" />
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 auto-rows-fr">
                    {(user.telegram || user.socialMedia?.telegram) && (
                      <a
                        href={`https://t.me/${(user.telegram || user.socialMedia?.telegram).replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors cursor-pointer block min-h-[60px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Send className="w-3 h-3 text-blue-600" />
                          <p className="text-[#999]" style={{ fontSize: '10px', fontWeight: '600' }}>TELEGRAM</p>
                        </div>
                        <p className="text-blue-700 truncate" style={{ fontSize: '12px', fontWeight: '600' }}>
                          @{(user.telegram || user.socialMedia?.telegram).replace(/^@/, '')}
                        </p>
                      </a>
                    )}
                    {(user.whatsapp || user.socialMedia?.whatsapp) && (
                      <a
                        href={`https://wa.me/${(user.whatsapp || user.socialMedia?.whatsapp).replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-50 hover:bg-green-100 p-2 rounded-lg transition-colors cursor-pointer block min-h-[60px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Phone className="w-3 h-3 text-green-600" />
                          <p className="text-[#999]" style={{ fontSize: '10px', fontWeight: '600' }}>WHATSAPP</p>
                        </div>
                        <p className="text-green-700 truncate" style={{ fontSize: '12px', fontWeight: '600' }}>
                          {user.whatsapp || user.socialMedia?.whatsapp}
                        </p>
                      </a>
                    )}
                    {(user.instagram || user.socialMedia?.instagram) && (
                      <a
                        href={`https://instagram.com/${(user.instagram || user.socialMedia?.instagram).replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-pink-50 hover:bg-pink-100 p-2 rounded-lg transition-colors cursor-pointer block min-h-[60px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Instagram className="w-3 h-3 text-pink-600" />
                          <p className="text-[#999]" style={{ fontSize: '10px', fontWeight: '600' }}>INSTAGRAM</p>
                        </div>
                        <p className="text-pink-700 truncate" style={{ fontSize: '12px', fontWeight: '600' }}>
                          @{(user.instagram || user.socialMedia?.instagram).replace(/^@/, '')}
                        </p>
                      </a>
                    )}
                    {(user.vk || user.socialMedia?.vk) && (
                      <a
                        href={`https://vk.com/${(user.vk || user.socialMedia?.vk).replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors cursor-pointer block min-h-[60px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Facebook className="w-3 h-3 text-indigo-600" />
                          <p className="text-[#999]" style={{ fontSize: '10px', fontWeight: '600' }}>VK</p>
                        </div>
                        <p className="text-indigo-700 truncate" style={{ fontSize: '12px', fontWeight: '600' }}>
                          {(user.vk || user.socialMedia?.vk).replace(/^@/, '')}
                        </p>
                      </a>
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
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4">
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
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  loadUsers(false);
                }}
                className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white hover:opacity-90 transition-opacity"
                title="Обновить список пользователей"
              >
                <Activity className="w-4 h-4 mr-2" />
                Обновить
              </Button>
              <Button
                onClick={async () => {
                  try {
                    toast.loading('Запуск миграции lastActivity...');
                    const response = await fetch(
                      `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/migrate-activity`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${publicAnonKey}`,
                          'X-User-Id': currentUser?.id || '',
                        },
                      }
                    );
                    const data = await response.json();
                    if (data.success) {
                      toast.success(`Миграция завершена: обновлено ${data.migratedCount} из ${data.totalUsers} пользователей`);
                      setTimeout(() => loadUsers(false), 500);
                    } else {
                      toast.error(`Ошибка миграции: ${data.error}`);
                    }
                  } catch (error) {
                    console.error('Migration error:', error);
                    toast.error('Ошибка при выполнении миграции');
                  }
                }}
                variant="outline"
                title="Запустить миграцию lastActivity для всех пользователей"
              >
                🔄 Миграция активности
              </Button>
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
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-[#1E1E1E]">
                      {viewMode === 'list' ? 'Список пользователей' : 'Дреовидная структура'}
                    </CardTitle>
                    <div className="flex gap-2 items-center">
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
                      <div className="w-px h-6 bg-[#E6E9EE] mx-1"></div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleExportToGoogleSheets}
                        className="border-green-200 hover:bg-green-50 text-green-700 hover:border-green-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Экспорт в Google Sheets
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
                      value={editFormData.баланс === 0 ? '' : editFormData.баланс}
                      onChange={(e) => setEditFormData({ ...editFormData, баланс: e.target.value === '' ? 0 : Number(e.target.value) })}
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
                      value={editFormData.доступныйБаланс === 0 ? '' : editFormData.доступныйБаланс}
                      onChange={(e) => setEditFormData({ ...editFormData, доступныйБаланс: e.target.value === '' ? 0 : Number(e.target.value) })}
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

      {/* ⚠️ Подтверждение изменения баланса */}
      <Dialog open={balanceConfirmOpen} onOpenChange={setBalanceConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <DialogTitle>Подтверждение изменения баланса</DialogTitle>
                <DialogDescription>
                  Это критическое изменение финансовых данных
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
              <p className="text-sm text-yellow-900 font-medium">
                Вы собираетесь изменить баланс пользователя:
              </p>
              
              {originalBalances.баланс !== editFormData.баланс && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Общий баланс:</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400">₽{originalBalances.баланс.toLocaleString()}</span>
                    <ArrowUpRight className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-yellow-900">₽{editFormData.баланс.toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              {originalBalances.доступныйБаланс !== editFormData.доступныйБаланс && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Доступный баланс:</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400">₽{originalBalances.доступныйБаланс.toLocaleString()}</span>
                    <ArrowUpRight className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-yellow-900">₽{editFormData.доступныйБаланс.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800">
                ⚠️ Изменение баланса повлияет на финансовые операции пользователя. Убедитесь в корректности данных.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBalanceConfirmOpen(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              onClick={saveUserData}
              disabled={saving}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Подтверждаю изменение
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔔 Диалог отправки уведомления */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle>Отправить уведомление</DialogTitle>
                <DialogDescription>
                  {notificationTargetUser && `Пользователю: ${notificationTargetUser.имя} ${notificationTargetUser.фамилия || ''}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Тип уведомления */}
            <div className="space-y-2">
              <Label htmlFor="notification-type">Тип уведомления</Label>
              <select
                id="notification-type"
                value={notificationData.тип}
                onChange={(e) => setNotificationData({ ...notificationData, тип: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
              >
                <option value="course">📚 Обучение</option>
                <option value="order">🛒 Заказ</option>
                <option value="commission">💰 Комиссия</option>
                <option value="new_partner">👥 Новый партнер</option>
                <option value="goal">🎯 Цель</option>
                <option value="withdrawal">💳 Вывод средств</option>
                <option value="inactive">⏰ Неактивность</option>
              </select>
            </div>

            {/* Заголовок */}
            <div className="space-y-2">
              <Label htmlFor="notification-title">Заголовок</Label>
              <Input
                id="notification-title"
                value={notificationData.заголовок}
                onChange={(e) => setNotificationData({ ...notificationData, заголовок: e.target.value })}
                placeholder="Введите заголовок уведомления"
                maxLength={100}
              />
            </div>

            {/* Сообщение */}
            <div className="space-y-2">
              <Label htmlFor="notification-message">Сообщение</Label>
              <textarea
                id="notification-message"
                value={notificationData.сообщение}
                onChange={(e) => setNotificationData({ ...notificationData, сообщение: e.target.value })}
                placeholder="Введите текст уведомления"
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF] resize-none"
              />
              <p className="text-xs text-gray-500 text-right">
                {notificationData.сообщение.length}/500
              </p>
            </div>

            {/* Превью */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Превью:</p>
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 text-[#39B7FF] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {notificationData.заголовок || 'Заголовок уведомления'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {notificationData.сообщение || 'Текст уведомления появится здесь'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setNotificationDialogOpen(false)}
              disabled={sendingNotification}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={sendingNotification || !notificationData.заголовок || !notificationData.сообщение}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
            >
              {sendingNotification ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Отправить
                </>
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
                      <p className="text-xs text-[#999] mb-1">Ранг</p>
                      <Badge className="bg-orange-100 text-orange-700">
                        {userRanks.get(selectedUserForView.id) ?? 0}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-[#999] mb-1">Уровень</p>
                      <Badge className="bg-blue-100 text-blue-700">{selectedUserForView.уровень}</Badge>
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
              {(selectedUserForView.telegram || selectedUserForView.whatsapp || selectedUserForView.instagram || selectedUserForView.vk || 
                selectedUserForView.socialMedia?.telegram || selectedUserForView.socialMedia?.whatsapp || 
                selectedUserForView.socialMedia?.instagram || selectedUserForView.socialMedia?.vk) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Социальные сети
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 auto-rows-fr">
                      {(selectedUserForView.telegram || selectedUserForView.socialMedia?.telegram) && (
                        <a
                          href={`https://t.me/${(selectedUserForView.telegram || selectedUserForView.socialMedia?.telegram).replace(/^@/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer w-full"
                        >
                          <Send className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[#999] mb-0.5">Telegram</p>
                            <p className="text-sm font-medium truncate text-blue-700">
                              @{(selectedUserForView.telegram || selectedUserForView.socialMedia?.telegram).replace(/^@/, '')}
                            </p>
                          </div>
                        </a>
                      )}
                      {(selectedUserForView.whatsapp || selectedUserForView.socialMedia?.whatsapp) && (
                        <a
                          href={`https://wa.me/${(selectedUserForView.whatsapp || selectedUserForView.socialMedia?.whatsapp).replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer w-full"
                        >
                          <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[#999] mb-0.5">WhatsApp</p>
                            <p className="text-sm font-medium truncate text-green-700">
                              {selectedUserForView.whatsapp || selectedUserForView.socialMedia?.whatsapp}
                            </p>
                          </div>
                        </a>
                      )}
                      {(selectedUserForView.instagram || selectedUserForView.socialMedia?.instagram) && (
                        <a
                          href={`https://instagram.com/${(selectedUserForView.instagram || selectedUserForView.socialMedia?.instagram).replace(/^@/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors cursor-pointer w-full"
                        >
                          <Instagram className="w-4 h-4 text-pink-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[#999] mb-0.5">Instagram</p>
                            <p className="text-sm font-medium truncate text-pink-700">
                              @{(selectedUserForView.instagram || selectedUserForView.socialMedia?.instagram).replace(/^@/, '')}
                            </p>
                          </div>
                        </a>
                      )}
                      {(selectedUserForView.vk || selectedUserForView.socialMedia?.vk) && (
                        <a
                          href={`https://vk.com/${(selectedUserForView.vk || selectedUserForView.socialMedia?.vk).replace(/^@/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer w-full"
                        >
                          <Facebook className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[#999] mb-0.5">VK</p>
                            <p className="text-sm font-medium truncate text-indigo-700">
                              {(selectedUserForView.vk || selectedUserForView.socialMedia?.vk).replace(/^@/, '')}
                            </p>
                          </div>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

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

      {/* User Details Modal */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedUserForDetails?.isAdmin 
                  ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                  : 'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]'
              }`}>
                {selectedUserForDetails?.isAdmin ? (
                  <Shield className="w-6 h-6 text-white" />
                ) : (
                  <Users className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{selectedUserForDetails?.имя} {selectedUserForDetails?.фамилия}</span>
                  {selectedUserForDetails?.isAdmin && (
                    <Badge className="bg-purple-100 text-purple-700">Admin</Badge>
                  )}
                  <Badge className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white">
                    Ранг {userRanks.get(selectedUserForDetails?.id || '') ?? 0}
                  </Badge>
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              ID: {selectedUserForDetails?.id} {selectedUserForDetails?.партнёрскийID && `• P${selectedUserForDetails.партнёрскийID}`}
            </DialogDescription>
          </DialogHeader>

          {selectedUserForDetails && (
            <div className="py-2">
              {/* Быстрые действия */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-[#E6E9EE]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedUserForDetails.рефКод || '');
                    // Можно добавить toast уведомление
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Реф-код
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const refLink = `${window.location.origin}?ref=${selectedUserForDetails.рефКод}`;
                    navigator.clipboard.writeText(refLink);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Реф-ссылка
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(selectedUserForDetails)}
                  className="flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Редактировать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5"
                  onClick={() => {
                    openNotificationDialog(selectedUserForDetails);
                  }}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Уведомление
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 border-red-200 hover:bg-red-50 text-red-700"
                  onClick={() => handleExportUserToPDF(selectedUserForDetails)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Экспорт в PDF
                </Button>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  <TabsTrigger value="general">Общее</TabsTrigger>
                  <TabsTrigger value="team">Команда</TabsTrigger>
                  <TabsTrigger value="sales">Продажи</TabsTrigger>
                  <TabsTrigger value="finance">Финансы</TabsTrigger>
                  <TabsTrigger value="activity">Активность</TabsTrigger>
                </TabsList>

                {/* Вкладка: Общее */}
                <TabsContent value="general" className="space-y-4">
                  {/* Основные метрики */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>РЕГИСТРАЦИЯ</p>
                      <p className="text-[#1E1E1E]" style={{ fontSize: '13px', fontWeight: '600' }}>
                        {selectedUserForDetails.зарегистрирован ? new Date(selectedUserForDetails.зарегистрирован).toLocaleDateString('ru-RU') : '-'}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>СПОНСОР</p>
                      <p className="text-[#1E1E1E]" style={{ fontSize: '13px', fontWeight: '600' }}>
                        {selectedUserForDetails.спонсорId ? `ID: ${selectedUserForDetails.спонсорId}` : 'Нет'}
                      </p>
                    </div>
                    <div className="bg-teal-50 p-3 rounded-lg">
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>КОМАНДА</p>
                      <p className="text-[#1E1E1E]" style={{ fontSize: '13px', fontWeight: '600' }}>
                        {calculateTotalTeam(selectedUserForDetails.id)} чел
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>РЕФ КОД</p>
                      <p className="text-[#1E1E1E] font-mono" style={{ fontSize: '12px', fontWeight: '600' }}>
                        {selectedUserForDetails.рефКод || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Контактная информация */}
                  <div className="bg-[#F7FAFC] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-4 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <Mail className="w-4 h-4 text-[#39B7FF]" />
                      Контактная информация
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email Card */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-[#39B7FF] transition-all flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Mail className="w-4 h-4 text-[#39B7FF]" />
                          </div>
                          <span className="text-[#999]" style={{ fontSize: '11px', fontWeight: '600' }}>EMAIL</span>
                        </div>
                        <a 
                          href={`mailto:${selectedUserForDetails.email}`}
                          className="text-[#1E1E1E] hover:text-[#39B7FF] transition-colors block mb-3 flex-grow"
                          style={{ fontSize: '13px', fontWeight: '600' }}
                        >
                          {selectedUserForDetails.email}
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedUserForDetails.email);
                            toast.success('Email скопирован');
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Копировать
                        </Button>
                      </div>

                      {/* Phone Card */}
                      {selectedUserForDetails.телефон && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-[#12C9B6] transition-all flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                              <Phone className="w-4 h-4 text-[#12C9B6]" />
                            </div>
                            <span className="text-[#999]" style={{ fontSize: '11px', fontWeight: '600' }}>ТЕЛЕФОН</span>
                          </div>
                          <div className="text-[#1E1E1E] mb-3 flex-grow" style={{ fontSize: '13px', fontWeight: '600' }}>
                            {selectedUserForDetails.телефон}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7"
                              onClick={() => window.open(`https://wa.me/${selectedUserForDetails.телефон.replace(/\D/g, '')}`, '_blank')}
                            >
                              <MessageCircle className="w-3 h-3 mr-1" />
                              WhatsApp
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7"
                              onClick={() => {
                                const cleanPhone = selectedUserForDetails.телефон.replace(/\D/g, '');
                                window.open(`tg://resolve?phone=${cleanPhone}`, '_blank');
                              }}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Telegram
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7"
                              onClick={() => window.open(`tel:${selectedUserForDetails.телефон}`, '_blank')}
                            >
                              <PhoneCall className="w-3 h-3 mr-1" />
                              Позвонить
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Социальные сети */}
                  {(selectedUserForDetails.telegram || selectedUserForDetails.whatsapp || selectedUserForDetails.instagram || selectedUserForDetails.vk || selectedUserForDetails.socialMedia) && (
                    <div>
                      <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                        <MessageCircle className="w-4 h-4 text-[#39B7FF]" />
                        Социальные сети
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(selectedUserForDetails.telegram || selectedUserForDetails.socialMedia?.telegram) && (
                          <a
                            href={`https://t.me/${(selectedUserForDetails.telegram || selectedUserForDetails.socialMedia?.telegram).replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-50 hover:bg-blue-100 p-3 rounded-lg transition-colors cursor-pointer block"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Send className="w-4 h-4 text-blue-600" />
                              <p className="text-[#999]" style={{ fontSize: '10px', fontWeight: '600' }}>TELEGRAM</p>
                            </div>
                            <p className="text-blue-700 truncate" style={{ fontSize: '13px', fontWeight: '600' }}>
                              @{(selectedUserForDetails.telegram || selectedUserForDetails.socialMedia?.telegram).replace(/^@/, '')}
                            </p>
                          </a>
                        )}
                        {(selectedUserForDetails.whatsapp || selectedUserForDetails.socialMedia?.whatsapp) && (
                          <a
                            href={`https://wa.me/${(selectedUserForDetails.whatsapp || selectedUserForDetails.socialMedia?.whatsapp).replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-50 hover:bg-green-100 p-3 rounded-lg transition-colors cursor-pointer block"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Phone className="w-4 h-4 text-green-600" />
                              <p className="text-[#999]" style={{ fontSize: '10px', fontWeight: '600' }}>WHATSAPP</p>
                            </div>
                            <p className="text-green-700 truncate" style={{ fontSize: '13px', fontWeight: '600' }}>
                              {selectedUserForDetails.whatsapp || selectedUserForDetails.socialMedia?.whatsapp}
                            </p>
                          </a>
                        )}
                        {(selectedUserForDetails.instagram || selectedUserForDetails.socialMedia?.instagram) && (
                          <a
                            href={`https://instagram.com/${(selectedUserForDetails.instagram || selectedUserForDetails.socialMedia?.instagram).replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-pink-50 hover:bg-pink-100 p-3 rounded-lg transition-colors cursor-pointer block"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Instagram className="w-4 h-4 text-pink-600" />
                              <p className="text-[#999]" style={{ fontSize: '10px', fontWeight: '600' }}>INSTAGRAM</p>
                            </div>
                            <p className="text-pink-700 truncate" style={{ fontSize: '13px', fontWeight: '600' }}>
                              @{(selectedUserForDetails.instagram || selectedUserForDetails.socialMedia?.instagram).replace(/^@/, '')}
                            </p>
                          </a>
                        )}
                        {(selectedUserForDetails.vk || selectedUserForDetails.socialMedia?.vk) && (
                          <a
                            href={`https://vk.com/${(selectedUserForDetails.vk || selectedUserForDetails.socialMedia?.vk).replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-50 hover:bg-indigo-100 p-3 rounded-lg transition-colors cursor-pointer block"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Facebook className="w-4 h-4 text-indigo-600" />
                              <p className="text-[#999]" style={{ fontSize: '10px', fontWeight: '600' }}>VK</p>
                            </div>
                            <p className="text-indigo-700 truncate" style={{ fontSize: '13px', fontWeight: '600' }}>
                              {(selectedUserForDetails.vk || selectedUserForDetails.socialMedia?.vk).replace(/^@/, '')}
                            </p>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Вкладка: Команда */}
                <TabsContent value="team" className="space-y-4">
                  {/* Структура команды */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>1 ЛИНИЯ</p>
                      <p className="text-[#1E1E1E] text-2xl font-bold">{selectedUserForDetails.команда?.length || 0}</p>
                      <p className="text-xs text-[#666] mt-1">Прямые партнёры</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>2 ЛИНИЯ</p>
                      <p className="text-[#1E1E1E] text-2xl font-bold">
                        {selectedUserForDetails.команда?.reduce((sum: number, member: any) => sum + (member.команда?.length || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-[#666] mt-1">Партнёры 2 уровня</p>
                    </div>
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg">
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>ВСЕГО</p>
                      <p className="text-[#1E1E1E] text-2xl font-bold">{calculateTotalTeam(selectedUserForDetails.id)}</p>
                      <p className="text-xs text-[#666] mt-1">Вся структура</p>
                    </div>
                  </div>

                  {/* Активные партнёры */}
                  <div className="bg-[#F7FAFC] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Активность команды
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-[#666]">Активные за месяц</span>
                          <span className="text-sm font-bold text-green-600">85%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-[#666]">Неактивные</span>
                          <span className="text-sm font-bold text-red-600">15%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Последние регистрации */}
                  <div className="bg-white border border-[#E6E9EE] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <UserPlus className="w-4 h-4 text-[#39B7FF]" />
                      Последние регистрации
                    </h3>
                    <div className="space-y-2">
                      {selectedUserForDetails.команда?.slice(0, 3).map((member: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-[#F7FAFC] rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] flex items-center justify-center text-white text-xs font-bold">
                              {member.имя?.[0]}{member.фамилия?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#1E1E1E]">{member.имя} {member.фамилия}</p>
                              <p className="text-xs text-[#999]">ID: {member.id}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700">Уровень {member.уровень || 1}</Badge>
                        </div>
                      )) || <p className="text-sm text-[#999] text-center py-4">Нет партнёров</p>}
                    </div>
                  </div>
                </TabsContent>

                {/* Вкладка: Продажи */}
                <TabsContent value="sales" className="space-y-4">
                  {/* Статистика продаж */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <ShoppingBag className="w-5 h-5 text-green-600" />
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>ЛИЧНЫЕ ПРОДАЖИ</p>
                      <p className="text-[#1E1E1E] text-xl font-bold">₽0</p>
                      <p className="text-xs text-green-600 mt-1">+0% за месяц</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>ПРОДАЖИ КОМАНДЫ</p>
                      <p className="text-[#1E1E1E] text-xl font-bold">₽0</p>
                      <p className="text-xs text-blue-600 mt-1">+0% за месяц</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Award className="w-5 h-5 text-purple-600" />
                      </div>
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>ЗАКАЗОВ</p>
                      <p className="text-[#1E1E1E] text-xl font-bold">0</p>
                      <p className="text-xs text-[#666] mt-1">Всего заказов</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="w-5 h-5 text-orange-600" />
                      </div>
                      <p className="text-[#999] mb-1" style={{ fontSize: '10px', fontWeight: '600' }}>СРЕДНИЙ ЧЕК</p>
                      <p className="text-[#1E1E1E] text-xl font-bold">₽0</p>
                      <p className="text-xs text-[#666] mt-1">За последний месяц</p>
                    </div>
                  </div>

                  {/* График продаж (заглушка) */}
                  <div className="bg-[#F7FAFC] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <TrendingUp className="w-4 h-4 text-[#39B7FF]" />
                      Динамика продаж (30 дней)
                    </h3>
                    <div className="h-32 flex items-end gap-1">
                      {[...Array(30)].map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-[#39B7FF] to-[#12C9B6] rounded-t opacity-30"
                          style={{ height: `${Math.random() * 100}%` }}
                        ></div>
                      ))}
                    </div>
                    <p className="text-xs text-[#999] text-center mt-2">График активности за последние 30 дней</p>
                  </div>

                  {/* Топ продуктов */}
                  <div className="bg-white border border-[#E6E9EE] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <Award className="w-4 h-4 text-[#39B7FF]" />
                      Топ продуктов
                    </h3>
                    <div className="text-sm text-[#999] text-center py-6">
                      Данные о продажах пока отсутствуют
                    </div>
                  </div>
                </TabsContent>

                {/* Вкладка: Финансы */}
                <TabsContent value="finance" className="space-y-4">
                  {/* Балансы */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-[#39B7FF]/20 to-[#12C9B6]/20 p-4 rounded-lg border border-[#39B7FF]/30">
                      <p className="text-[#999] mb-2" style={{ fontSize: '10px', fontWeight: '600' }}>ОБЩИЙ БАЛАНС</p>
                      <p className="text-[#1E1E1E] text-3xl font-bold">
                        ₽{selectedUserForDetails.баланс?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-lg border border-green-300">
                      <p className="text-[#999] mb-2" style={{ fontSize: '10px', fontWeight: '600' }}>ДОСТУПНЫЙ БАЛАНС</p>
                      <p className="text-green-700 text-3xl font-bold">
                        ₽{selectedUserForDetails.доступныйБаланс?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  {/* Доходы по линиям */}
                  <div className="bg-white border border-[#E6E9EE] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <DollarSign className="w-4 h-4 text-[#39B7FF]" />
                      Доходы по линиям (комиссии)
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-blue-600 text-xs mb-1 font-semibold">D1 (1 линия)</p>
                        <p className="text-[#1E1E1E] text-lg font-bold">₽0</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <p className="text-purple-600 text-xs mb-1 font-semibold">D2 (2 линия)</p>
                        <p className="text-[#1E1E1E] text-lg font-bold">₽0</p>
                      </div>
                      <div className="bg-teal-50 p-3 rounded-lg text-center">
                        <p className="text-teal-600 text-xs mb-1 font-semibold">D3 (3 линия)</p>
                        <p className="text-[#1E1E1E] text-lg font-bold">₽0</p>
                      </div>
                    </div>
                  </div>

                  {/* Прогресс к следующему уровню */}
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                      Прогресс к следующему уровню
                    </h3>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#666]">Уровень {selectedUserForDetails.уровень || 1} → Уровень {(selectedUserForDetails.уровень || 1) + 1}</span>
                        <span className="text-sm font-bold text-orange-600">0%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-gradient-to-r from-orange-400 to-yellow-500 h-3 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <p className="text-xs text-[#666]">
                      Для перехода необходимо выполнить условия программы лояльности
                    </p>
                  </div>

                  {/* История транзакций */}
                  <div className="bg-white border border-[#E6E9EE] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <Wallet className="w-4 h-4 text-[#39B7FF]" />
                      Последние транзакции
                    </h3>
                    <div className="text-sm text-[#999] text-center py-6">
                      Транзакций пока нет
                    </div>
                  </div>
                </TabsContent>

                {/* Вкладка: Активность */}
                <TabsContent value="activity" className="space-y-4">
                  {/* Статус активности */}
                  <div className="bg-[#F7FAFC] p-4 rounded-lg border-2 border-[#E6E9EE]">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <Clock className="w-4 h-4 text-[#39B7FF]" />
                      Текущий статус
                    </h3>
                    {(() => {
                      const activityStatus = getActivityStatus(selectedUserForDetails);
                      return (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                          <span className={`w-4 h-4 rounded-full ${activityStatus.color} animate-pulse`}></span>
                          <div className="flex-1">
                            <p className={`${activityStatus.textColor} font-semibold`}>{activityStatus.text}</p>
                            <p className="text-xs text-[#999] mt-1">
                              {(() => {
                                const lastActivity = selectedUserForDetails.lastActivity || selectedUserForDetails.lastLogin || selectedUserForDetails.последняяАктивность || selectedUserForDetails.последнийВход;
                                return lastActivity 
                                  ? `Последняя активность: ${new Date(lastActivity).toLocaleString('ru-RU')}`
                                  : 'Активность не отслеживается';
                              })()}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Последние действия */}
                  <div className="bg-white border border-[#E6E9EE] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <Activity className="w-4 h-4 text-[#39B7FF]" />
                      Последние действия
                    </h3>
                    <div className="space-y-2">
                      {/* Заглушка для истории */}
                      <div className="flex items-start gap-3 p-3 bg-[#F7FAFC] rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#1E1E1E]">Регистрация в системе</p>
                          <p className="text-xs text-[#999]">
                            {selectedUserForDetails.зарегистрирован 
                              ? new Date(selectedUserForDetails.зарегистрирован).toLocaleString('ru-RU')
                              : 'Дата неизвестна'}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-[#999] text-center py-4">
                        История действий пока пуста
                      </div>
                    </div>
                  </div>

                  {/* Последние заказы */}
                  <div className="bg-white border border-[#E6E9EE] p-4 rounded-lg">
                    <h3 className="text-[#1E1E1E] mb-3 flex items-center gap-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                      <ShoppingBag className="w-4 h-4 text-[#39B7FF]" />
                      Последние заказы
                    </h3>
                    <div className="text-sm text-[#999] text-center py-6">
                      Заказов пока нет
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
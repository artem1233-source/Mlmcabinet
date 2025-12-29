import { useState, useEffect, useMemo, useRef } from 'react';
import { Hash, User, ArrowRight, Check, X, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import * as api from '../../utils/api';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAllUsers, useInvalidateUsers } from '../../hooks/useAllUsers';

interface IdManagerProps {
  currentUser: any;
  onDataChange?: () => void;
}

interface UserData {
  id: string;
  имя: string;
  фамилия: string;
  email: string;
}

export function IdManager({ currentUser, onDataChange }: IdManagerProps) {
  // 🚀 Используем общий хук для загрузки пользователей
  const { users: allUsers, isLoading: usersLoading, refetch: refetchUsers } = useAllUsers();
  const invalidateUsers = useInvalidateUsers();
  
  const [reservedIds, setReservedIds] = useState<string[]>([]);
  const [loadingReserved, setLoadingReserved] = useState(true);
  const [selectedFreeIds, setSelectedFreeIds] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedReservedId, setSelectedReservedId] = useState<string>('');
  
  // 🔍 Поисковые запросы для каждой колонки
  const [occupiedSearch, setOccupiedSearch] = useState<string>('');
  const [freeSearch, setFreeSearch] = useState<string>('');
  const [reservedSearch, setReservedSearch] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Конвертируем типы для совместимости
  const users: UserData[] = useMemo(() => {
    return allUsers.map(u => ({
      id: u.id,
      имя: u.имя,
      фамилия: u.фамилия,
      email: u.email,
    }));
  }, [allUsers]);

  const loading = usersLoading || loadingReserved;

  useEffect(() => {
    loadReservedIds();
  }, []);

  const loadReservedIds = async () => {
    try {
      setLoadingReserved(true);
      const reservedResponse = await api.getReservedIds();
      if (reservedResponse.success) {
        setReservedIds(reservedResponse.reserved || []);
      }
    } catch (error) {
      console.error('Failed to load reserved IDs:', error);
      toast.error('Ошибка загрузки зарезервированных ID');
    } finally {
      setLoadingReserved(false);
    }
  };

  const loadData = async () => {
    await Promise.all([
      refetchUsers(),
      loadReservedIds()
    ]);
  };

  // 🚀 ОПТИМИЗАЦИЯ: Мемоизация генерации всех ID (генерируется ОДИН РАЗ)
  const allIds = useMemo(() => {
    console.log('🔄 Generating allIds array (99,999 elements)...');
    const ids = Array.from({ length: 99999 }, (_, i) => String(i + 1).padStart(3, '0'));
    console.log('✅ Generated allIds');
    return ids;
  }, []); // Пустой массив зависимостей = генерируется один раз
  
  // 🚀 ОПТИМИЗАЦИЯ: Мемоизация вычислений на основе users и reservedIds
  const { occupiedIds, reservedIdsFormatted, freeIds, duplicateIds, nextId } = useMemo(() => {
    console.log('🔄 Recalculating occupied/free/reserved IDs...');
    
    // Проверяем, что все данные доступны
    if (!Array.isArray(users) || !Array.isArray(reservedIds) || !Array.isArray(allIds)) {
      console.warn('⚠️ Data not ready for ID calculations');
      return {
        occupiedIds: [],
        reservedIdsFormatted: [],
        freeIds: [],
        duplicateIds: [],
        nextId: 'N/A'
      };
    }
    
    // Occupied IDs (users have them)
    const occupied = users.map(u => u.id).filter(Boolean).sort((a, b) => a.localeCompare(b));
    
    // Free IDs (not occupied and not reserved) - convert reservedIds to strings with padding
    const reservedFormatted = reservedIds.map(id => {
      const numId = parseInt(id);
      return numId <= 999 ? String(numId).padStart(3, '0') : String(numId);
    }).filter(Boolean);
    
    const occupiedSet = new Set(occupied);
    const reservedSet = new Set(reservedFormatted);
    
    const free = allIds.filter(id => !occupiedSet.has(id) && !reservedSet.has(id));
    
    // Calculate duplicates (IDs that are both occupied and reserved)
    const duplicates = reservedFormatted.filter(id => occupiedSet.has(id)).sort((a, b) => a.localeCompare(b));
    
    // Next ID to assign (first free)
    const next = free[0] || 'N/A';
    
    console.log(`✅ Calculated: ${occupied.length} occupied, ${free.length} free, ${reservedFormatted.length} reserved, ${duplicates.length} duplicates`);
    
    return {
      occupiedIds: occupied,
      reservedIdsFormatted: reservedFormatted,
      freeIds: free,
      duplicateIds: duplicates,
      nextId: next
    };
  }, [users, reservedIds, allIds]);

  // 🔍 Фильтрация списков по поисковым запросам
  const filteredOccupiedIds = useMemo(() => {
    if (!Array.isArray(occupiedIds)) return [];
    if (!occupiedSearch.trim()) return occupiedIds;
    const query = occupiedSearch.trim().toLowerCase();
    return occupiedIds.filter(id => {
      if (!id) return false;
      const user = users.find(u => u.id === id);
      return (
        id.includes(query) ||
        user?.имя?.toLowerCase().includes(query) ||
        user?.фамилия?.toLowerCase().includes(query)
      );
    });
  }, [occupiedIds, occupiedSearch, users]);

  const filteredFreeIds = useMemo(() => {
    if (!Array.isArray(freeIds)) return [];
    if (!freeSearch.trim()) return freeIds;
    const query = freeSearch.trim();
    return freeIds.filter(id => id && id.includes(query));
  }, [freeIds, freeSearch]);

  const filteredReservedIds = useMemo(() => {
    if (!Array.isArray(reservedIdsFormatted)) return [];
    if (!reservedSearch.trim()) return reservedIdsFormatted;
    const query = reservedSearch.trim();
    return reservedIdsFormatted.filter(id => id && id.includes(query));
  }, [reservedIdsFormatted, reservedSearch]);

  const toggleFreeId = (id: string) => {
    setSelectedFreeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleReserveSelected = async () => {
    if (selectedFreeIds.length === 0) {
      toast.error('Выберите номера для резервирования');
      return;
    }

    console.log('🔵 Reserving IDs:', selectedFreeIds);

    try {
      const response = await api.reserveIds(selectedFreeIds);
      console.log('🔵 Reserve response:', response);
      
      if (response.success) {
        toast.success(`Зарезервировано ${selectedFreeIds.length} номеров`);
        setSelectedFreeIds([]);
        await loadReservedIds();
      }
    } catch (error) {
      console.error('Error reserving IDs:', error);
      toast.error('Ошибка резервирования');
    }
  };

  const handleUnreserveId = async (id: string) => {
    try {
      const response = await api.unreserveId(id);
      if (response.success) {
        toast.success(`Номер ${id} возвращён в свободные`);
        await loadReservedIds();
      }
    } catch (error) {
      console.error('Error unreserving ID:', error);
      toast.error('Ошибка отмены резервирования');
    }
  };

  const handleSyncReservedIds = async () => {
    try {
      setLoadingReserved(true);
      const response = await api.syncReservedIds();
      if (response.success) {
        const { removed, message } = response;
        if (removed && Array.isArray(removed) && removed.length > 0) {
          toast.success(`${message}\nУдалены: ${removed.join(', ')}`);
        } else {
          toast.success('Все зарезервированные номера актуальны');
        }
        await loadReservedIds();
        invalidateUsers();
      }
    } catch (error) {
      console.error('Error syncing reserved IDs:', error);
      toast.error('Ошибка синхронизации');
    } finally {
      setLoadingReserved(false);
    }
  };

  const handleAssignReservedId = async () => {
    if (!selectedReservedId || !selectedUserId) {
      toast.error('Выберите номер и пользователя');
      return;
    }

    const user = users.find(u => u.id === selectedUserId);
    if (!user) {
      console.error('❌ User not found in local list:', selectedUserId);
      toast.error('Пользователь не найден в списке');
      return;
    }

    console.log('🔵 Assigning reserved ID:', {
      selectedReservedId,
      selectedUserId,
      userName: `${user.имя} ${user.фамилия}`,
      userEmail: user.email
    });

    const confirmMsg = `Присвоить номер ${selectedReservedId} пользователю ${user.имя} ${user.фамилия}?\n\nСтарый номер ${user.id} вернётся в свободные.`;
    if (!confirm(confirmMsg)) return;

    try {
      // 🔍 DEBUG: Проверим существование пользователя в БД
      console.log('🔍 DEBUG: Checking user in DB before assignment...');
      let debugData: any = null;
      try {
        const debugResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/debug-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
            'X-User-Id': currentUser?.id || ''
          },
          body: JSON.stringify({ userId: selectedUserId })
        });
        
        if (debugResponse.ok) {
          debugData = await debugResponse.json();
          console.log('🔍 DEBUG response:', debugData);
        } else {
          console.error('Debug endpoint returned error status:', debugResponse.status);
        }
      } catch (err) {
        console.error('Debug endpoint error:', err);
      }
      
      // Проверяем, найден ли пользователь хотя бы одним способом
      const userFound = debugData && (
        debugData.directGet || 
        debugData.userFromPrefix || 
        debugData.userNormalized || 
        debugData.userPadded
      );
      
      if (!userFound) {
        console.error('❌ User not found in database:', selectedUserId);
        
        // Показываем упрощенное сообщение об ошибке
        let errorMsg = `ОШИБКА: Пользователь с ID "${selectedUserId}" не найден в базе данных!\n\n`;
        
        if (debugData && debugData.similarIds && Array.isArray(debugData.similarIds) && debugData.similarIds.length > 0) {
          errorMsg += `Найдены похожие ID:\n`;
          debugData.similarIds.slice(0, 5).forEach((s: any) => {
            errorMsg += `- ID: "${s.id}" → ${s.name}\n`;
          });
          errorMsg += `\n`;
        }
        
        if (debugData && debugData.totalUsers) {
          errorMsg += `Всего пользователей в БД: ${debugData.totalUsers}\n`;
        }
        
        errorMsg += `\nВозможные причины:\n` +
              `1. Пользователь отображается в UI, но не сохранен в БД\n` +
              `2. Данные не синхронизированы между кэшем и БД\n` +
              `3. Попробуйте обновить страницу и повторить операцию`;
        
        alert(errorMsg);
        toast.error(`Пользователь ${selectedUserId} не найден в БД!`, { duration: 5000 });
        return;
      }
      
      console.log('✅ User found in DB, proceeding with assignment...');
      console.log('✅ Found using method:', {
        directGet: debugData.directGet,
        userFromPrefix: debugData.userFromPrefix,
        userNormalized: debugData.userNormalized,
        userPadded: debugData.userPadded
      });
      
      console.log('🔵 Calling API assignReservedId with:', { newId: selectedReservedId, userId: selectedUserId });
      const response = await api.assignReservedId(selectedReservedId, selectedUserId);
      if (response.success) {
        toast.success(`Номер ${selectedReservedId} присвоен пользователю`);
        setAssignDialogOpen(false);
        setSelectedReservedId('');
        setSelectedUserId('');
        
        // Инвалидируем кэш пользователей
        invalidateUsers();
        await loadReservedIds();
        
        // Trigger parent component refresh if callback provided
        if (onDataChange) {
          onDataChange();
        }
      }
    } catch (error) {
      console.error('Error assigning ID:', error);
      toast.error('Ошибка присвоения номера');
    }
  };

  const handleUserClick = (userId: string) => {
    // Scroll to user in the tree (future enhancement)
    toast.info(`Переход к пользователю ${userId} (в разработке)`);
  };

  // 🚀 ВИРТУАЛИЗАЦИЯ: Refs для списков
  const occupiedListRef = useRef<HTMLDivElement>(null);
  const freeListRef = useRef<HTMLDivElement>(null);
  const reservedListRef = useRef<HTMLDivElement>(null);

  // 🚀 ВИРТУАЛИЗАЦИЯ: Virtualizers для каждого списка (с учётом фильтрации)
  const occupiedVirtualizer = useVirtualizer({
    count: filteredOccupiedIds?.length || 0,
    getScrollElement: () => occupiedListRef.current,
    estimateSize: () => 64, // Примерная высота элемента
    overscan: 5, // Рендерим 5 дополнительных элементов за пределами видимой области
  });

  const freeVirtualizer = useVirtualizer({
    count: filteredFreeIds?.length || 0, // ✅ Показываем ВСЕ отфильтрованные номера через виртуализацию
    getScrollElement: () => freeListRef.current,
    estimateSize: () => 64,
    overscan: 10, // Увеличили overscan для плавности при большом списке
  });

  const reservedVirtualizer = useVirtualizer({
    count: filteredReservedIds?.length || 0,
    getScrollElement: () => reservedListRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  // 🚀 ВИРТУАЛИЗАЦИЯ: Ref и virtualizer для списка пользователей в диалоге
  const usersDialogListRef = useRef<HTMLDivElement>(null);

  // Фильтрация и сортировка пользователей для диалога
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    return users
      .filter(user => {
        if (!user) return false;
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
          user.имя?.toLowerCase().includes(query) ||
          user.фамилия?.toLowerCase().includes(query) ||
          user.id?.includes(query) ||
          user.email?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        // Sort by relevance if there's a search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const aNameMatch = a.имя?.toLowerCase().startsWith(query) || a.фамилия?.toLowerCase().startsWith(query);
          const bNameMatch = b.имя?.toLowerCase().startsWith(query) || b.фамилия?.toLowerCase().startsWith(query);
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;
        }
        return `${a.имя || ''} ${a.фамилия || ''}`.localeCompare(`${b.имя || ''} ${b.фамилия || ''}`);
      });
  }, [users, searchQuery]);

  const usersDialogVirtualizer = useVirtualizer({
    count: filteredUsers?.length || 0,
    getScrollElement: () => usersDialogListRef.current,
    estimateSize: () => 70,
    overscan: 3,
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Управление ID номерами
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-3 text-[#1E1E1E]">
                <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
                  <Hash className="w-5 h-5 text-white" />
                </div>
                <span className="text-base sm:text-lg">Управление ID номерами (001-99999)</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncReservedIds}
                  disabled={loading}
                  className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  🔄 Синхронизировать
                </Button>
                <Button variant="outline" size="sm" onClick={loadData}>
                  Обновить
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-300 rounded" />
                <span className="text-[#666]">
                  Занятые: {occupiedIds.length}
                  {filteredOccupiedIds.length !== occupiedIds.length && (
                    <span className="text-[#39B7FF] ml-1">({filteredOccupiedIds.length})</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-[#666]">
                  Свободные: {freeIds.length.toLocaleString('ru-RU')}
                  {filteredFreeIds.length !== freeIds.length && (
                    <span className="text-[#39B7FF] ml-1">({filteredFreeIds.length.toLocaleString('ru-RU')})</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span className="text-[#666]">
                  Зарезервированные: {reservedIds.length}
                  {filteredReservedIds.length !== reservedIdsFormatted.length && (
                    <span className="text-[#39B7FF] ml-1">({filteredReservedIds.length})</span>
                  )}
                </span>
              </div>
              <div className="sm:ml-auto">
                <Badge className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white text-xs">
                  Следующий: {nextId}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Warning about duplicates */}
            {duplicateIds.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800 mb-2">
                      Обнаружены дублирующиеся номера! ({duplicateIds.length})
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      Следующие номера одновременно заняты пользователями И находятся в зарезервированных:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {duplicateIds.map(id => (
                        <code key={id} className="bg-red-100 px-2 py-1 rounded text-red-800 font-semibold">
                          {id}
                        </code>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSyncReservedIds}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🔄 Синхронизировать сейчас
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Column 1: Occupied IDs - 🚀 С ВИРТУАЛИЗАЦИЕЙ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#1E1E1E]">
                    Занятые номера
                  </h3>
                  <Badge variant="secondary">{occupiedIds.length}</Badge>
                </div>
                {/* 🔍 Поиск */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999]" />
                  <Input
                    placeholder="Поиск по номеру или имени..."
                    value={occupiedSearch}
                    onChange={(e) => setOccupiedSearch(e.target.value)}
                    className="pl-9 h-9 text-sm border-[#E6E9EE]"
                  />
                  {occupiedSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOccupiedSearch('')}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {filteredOccupiedIds.length !== occupiedIds.length && (
                  <p className="text-xs text-[#666] px-1">
                    Найдено: {filteredOccupiedIds.length} из {occupiedIds.length}
                  </p>
                )}
                <div 
                  ref={occupiedListRef}
                  className="h-[540px] rounded-xl border border-[#E6E9EE] p-3 bg-gray-50 overflow-auto"
                >
                  {filteredOccupiedIds.length === 0 ? (
                    <p className="text-center text-[#999] text-sm py-8">
                      {occupiedSearch ? 'Ничего не найдено' : 'Нет занятых номеров'}
                    </p>
                  ) : (
                    <div
                      style={{
                        height: `${occupiedVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {occupiedVirtualizer.getVirtualItems().map((virtualRow) => {
                        const id = filteredOccupiedIds[virtualRow.index];
                        const user = users.find(u => u.id === id);
                        return (
                          <div
                            key={virtualRow.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <button
                              onClick={() => handleUserClick(id)}
                              className="w-full text-left px-3 py-3 rounded-lg bg-white border border-gray-200 hover:border-[#39B7FF] hover:bg-[#F7FAFC] transition-colors group mb-2 min-h-[60px]"
                            >
                              <div className="flex items-center justify-between">
                                <code className="text-sm font-mono text-[#1E1E1E] font-semibold">
                                  {id}
                                </code>
                                <User className="w-3 h-3 text-[#666] group-hover:text-[#39B7FF]" />
                              </div>
                              {user && (
                                <p className="text-xs text-[#666] mt-1 truncate">
                                  {user.имя} {user.фамилия}
                                </p>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Free IDs - 🚀 С ВИРТУАЛИЗАЦИЕЙ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#1E1E1E]">
                    Свободные номера
                  </h3>
                  <Badge variant="secondary">{freeIds.length}</Badge>
                </div>
                {/* 🔍 Поиск */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999]" />
                  <Input
                    placeholder="Поиск по номеру..."
                    value={freeSearch}
                    onChange={(e) => setFreeSearch(e.target.value)}
                    className="pl-9 h-9 text-sm border-[#E6E9EE]"
                  />
                  {freeSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFreeSearch('')}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {filteredFreeIds.length !== freeIds.length && (
                  <p className="text-xs text-[#666] px-1">
                    Найдено: {filteredFreeIds.length} из {freeIds.length}
                  </p>
                )}
                <div className="space-y-2">
                  {selectedFreeIds.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm text-[#666]">
                        Выбрано: {selectedFreeIds.length}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleReserveSelected}
                          className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
                        >
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Зарезервировать
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedFreeIds([])}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <div 
                    ref={freeListRef}
                    className="h-[540px] rounded-xl border border-[#E6E9EE] p-3 bg-green-50 overflow-auto"
                  >
                    {filteredFreeIds.length === 0 ? (
                      <p className="text-center text-[#999] text-sm py-8">
                        {freeSearch ? 'Ничего не найдено' : 'Нет свободных номеров'}
                      </p>
                    ) : (
                      <div
                        style={{
                          height: `${freeVirtualizer.getTotalSize()}px`,
                          width: '100%',
                          position: 'relative',
                        }}
                      >
                        {freeVirtualizer.getVirtualItems().map((virtualRow) => {
                          const id = filteredFreeIds[virtualRow.index];
                          return (
                            <div
                              key={virtualRow.key}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-white border border-green-200 hover:border-green-400 transition-colors mb-2 min-h-[60px]">
                                <Checkbox
                                  checked={selectedFreeIds.includes(id)}
                                  onCheckedChange={() => toggleFreeId(id)}
                                />
                                <code className="text-sm font-mono text-[#1E1E1E] flex-1">
                                  {id}
                                </code>
                                {id === nextId && (
                                  <Badge className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white text-xs">
                                    Следующий
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 3: Reserved IDs - 🚀 С ВИРТУАЛИЗАЦИЕЙ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#1E1E1E]">
                    Зарезервированные
                  </h3>
                  <Badge variant="secondary">{reservedIds.length}</Badge>
                </div>
                {/* 🔍 Поиск */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999]" />
                  <Input
                    placeholder="Поиск по номеру..."
                    value={reservedSearch}
                    onChange={(e) => setReservedSearch(e.target.value)}
                    className="pl-9 h-9 text-sm border-[#E6E9EE]"
                  />
                  {reservedSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReservedSearch('')}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {filteredReservedIds.length !== reservedIdsFormatted.length && (
                  <p className="text-xs text-[#666] px-1">
                    Найдено: {filteredReservedIds.length} из {reservedIdsFormatted.length}
                  </p>
                )}
                <div 
                  ref={reservedListRef}
                  className="h-[540px] rounded-xl border border-[#E6E9EE] p-3 bg-purple-50 overflow-auto"
                >
                  {filteredReservedIds.length === 0 ? (
                    <p className="text-center text-[#999] text-sm py-8">
                      {reservedSearch ? 'Ничего не найдено' : 'Нет зарезервированных номеров'}
                    </p>
                  ) : (
                    <div
                      style={{
                        height: `${reservedVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {reservedVirtualizer.getVirtualItems().map((virtualRow) => {
                        const id = filteredReservedIds[virtualRow.index];
                        return (
                          <div
                            key={virtualRow.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <div className="px-3 py-3 rounded-lg bg-white border border-purple-200 hover:border-purple-400 transition-colors mb-2 min-h-[60px]">
                              <div className="flex items-center justify-between">
                                <code className="text-sm font-mono text-[#1E1E1E] font-semibold">
                                  {id}
                                </code>
                                <div className="flex gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedReservedId(id);
                                          setAssignDialogOpen(true);
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <User className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Присвоить пользователю</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUnreserveId(id)}
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-semibold text-[#1E1E1E] mb-2">
                💡 Как это работает:
              </h4>
              <ul className="text-sm text-[#666] space-y-1">
                <li>• <strong>Занятые</strong> — присвоены пользователям (кликабельны для перехода)</li>
                <li>• <strong>Свободные</strong> — выдаются по порядку при регистрации</li>
                <li>• <strong>Зарезервированные</strong> — не выдаются автоматически, можно присвоить вручную</li>
                <li>• При смене номера старый возвращается в свободные</li>
                <li>• 🔍 <strong>Поиск:</strong> используйте поле поиска над каждой колонкой для быстрого нахождения номеров</li>
                <li>• 🚀 <strong>Виртуализация:</strong> все {freeIds.length.toLocaleString('ru-RU')} номеров доступны, рендерятся только видимые для максимальной производительности</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>

      {/* Assign Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) {
            setSearchQuery('');
            setSelectedUserId('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Присвоить номер {selectedReservedId} пользователю</DialogTitle>
            <DialogDescription>
              Введите имя или фамилию для поиска пользователя. Старый номер пользователя вернётся в список свободных.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999]" />
              <Input
                placeholder="Введите имя или фамилию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtered Users List - 🚀 С ВИРТУАЛИЗАЦИЕЙ */}
            <div className="border rounded-lg">
              <div 
                ref={usersDialogListRef}
                className="h-[300px] overflow-auto"
              >
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-[#999]">
                    Пользователи не найдены
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${usersDialogVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                      padding: '8px',
                    }}
                  >
                    {usersDialogVirtualizer.getVirtualItems().map((virtualRow) => {
                      const user = filteredUsers[virtualRow.index];
                      return (
                        <div
                          key={virtualRow.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 8,
                            right: 8,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <button
                            onClick={() => setSelectedUserId(user.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-all hover:bg-[#F7FAFC] mb-1 ${
                              selectedUserId === user.id
                                ? 'bg-gradient-to-r from-[#39B7FF]/10 to-[#12C9B6]/10 border-2 border-[#39B7FF]'
                                : 'border-2 border-transparent hover:border-[#E6E9EE]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[#1E1E1E]">
                                    {user.имя} {user.фамилия}
                                  </span>
                                  {selectedUserId === user.id && (
                                    <Check className="w-4 h-4 text-[#39B7FF]" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-[#666]">
                                  <code className="bg-gray-100 px-2 py-0.5 rounded">
                                    ID: {user.id}
                                  </code>
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected User Warning */}
            {selectedUserId && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Старый номер <code className="bg-yellow-100 px-1.5 py-0.5 rounded">{users.find(u => u.id === selectedUserId)?.id}</code> вернётся в свободные
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAssignDialogOpen(false);
                setSearchQuery('');
                setSelectedUserId('');
              }}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleAssignReservedId}
              disabled={!selectedUserId}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white disabled:opacity-50"
            >
              <Check className="w-4 h-4 mr-2" />
              Присвоить номер
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
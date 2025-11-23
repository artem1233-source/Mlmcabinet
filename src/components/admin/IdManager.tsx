import { useState, useEffect } from 'react';
import { Hash, User, ArrowRight, Check, X, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
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
import * as api from '../../utils/api';
import { toast } from 'sonner';

interface IdManagerProps {
  currentUser: any;
}

interface UserData {
  id: string;
  имя: string;
  фамилия: string;
  email: string;
}

export function IdManager({ currentUser }: IdManagerProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [reservedIds, setReservedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFreeIds, setSelectedFreeIds] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedReservedId, setSelectedReservedId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

      // Load reserved IDs
      const reservedResponse = await api.getReservedIds();
      if (reservedResponse.success) {
        setReservedIds(reservedResponse.reserved || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Generate all IDs from 001 to 9999
  const allIds = Array.from({ length: 9999 }, (_, i) => String(i + 1).padStart(3, '0'));
  
  // Occupied IDs (users have them)
  const occupiedIds = users.map(u => u.id).sort((a, b) => a.localeCompare(b));
  
  // Free IDs (not occupied and not reserved)
  const freeIds = allIds.filter(id => !occupiedIds.includes(id) && !reservedIds.includes(id));
  
  // Next ID to assign (first free)
  const nextId = freeIds[0] || 'N/A';

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
        loadData();
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
        loadData();
      }
    } catch (error) {
      console.error('Error unreserving ID:', error);
      toast.error('Ошибка отмены резервирования');
    }
  };

  const handleAssignReservedId = async () => {
    if (!selectedReservedId || !selectedUserId) {
      toast.error('Выберите номер и пользователя');
      return;
    }

    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;

    const confirmMsg = `Присвоить номер ${selectedReservedId} пользователю ${user.имя} ${user.фамилия}?\n\nСтарый номер ${user.id} вернётся в свободные.`;
    if (!confirm(confirmMsg)) return;

    try {
      const response = await api.assignReservedId(selectedReservedId, selectedUserId);
      if (response.success) {
        toast.success(`Номер ${selectedReservedId} присвоен пользователю`);
        setAssignDialogOpen(false);
        setSelectedReservedId('');
        setSelectedUserId('');
        loadData();
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
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-3 text-[#1E1E1E]">
              <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
                <Hash className="w-5 h-5 text-white" />
              </div>
              <span className="text-base sm:text-lg">Управление ID номерами (001-9999)</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadData}>
              Обновить
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded" />
              <span className="text-[#666]">Занятые: {occupiedIds.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-[#666]">Свободные: {freeIds.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded" />
              <span className="text-[#666]">Зарезервированные: {reservedIds.length}</span>
            </div>
            <div className="sm:ml-auto">
              <Badge className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white text-xs">
                Следующий: {nextId}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Column 1: Occupied IDs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1E1E1E]">
                  Занятые номера
                </h3>
                <Badge variant="secondary">{occupiedIds.length}</Badge>
              </div>
              <ScrollArea className="h-[600px] rounded-xl border border-[#E6E9EE] p-3 bg-gray-50">
                <div className="space-y-1">
                  {occupiedIds.map(id => {
                    const user = users.find(u => u.id === id);
                    return (
                      <button
                        key={id}
                        onClick={() => handleUserClick(id)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-[#39B7FF] hover:bg-[#F7FAFC] transition-colors group"
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
                    );
                  })}
                  {occupiedIds.length === 0 && (
                    <p className="text-center text-[#999] text-sm py-8">
                      Нет занятых номеров
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Column 2: Free IDs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1E1E1E]">
                  Свободные номера
                </h3>
                <Badge variant="secondary">{freeIds.length}</Badge>
              </div>
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
                <ScrollArea className="h-[560px] rounded-xl border border-[#E6E9EE] p-3 bg-green-50">
                  <div className="space-y-1">
                    {freeIds.slice(0, 500).map(id => (
                      <div
                        key={id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-green-200 hover:border-green-400 transition-colors"
                      >
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
                    ))}
                    {freeIds.length > 500 && (
                      <p className="text-center text-[#666] text-xs py-2">
                        ... и ещё {freeIds.length - 500} номеров
                      </p>
                    )}
                    {freeIds.length === 0 && (
                      <p className="text-center text-[#999] text-sm py-8">
                        Нет свободных номеров
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Column 3: Reserved IDs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1E1E1E]">
                  Зарезервированные
                </h3>
                <Badge variant="secondary">{reservedIds.length}</Badge>
              </div>
              <ScrollArea className="h-[600px] rounded-xl border border-[#E6E9EE] p-3 bg-purple-50">
                <div className="space-y-2">
                  {reservedIds.map(id => (
                    <div
                      key={id}
                      className="px-3 py-3 rounded-lg bg-white border border-purple-200 hover:border-purple-400 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm font-mono text-[#1E1E1E] font-semibold">
                          {id}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnreserveId(id)}
                          className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => {
                          setSelectedReservedId(id);
                          setAssignDialogOpen(true);
                        }}
                      >
                        <User className="w-3 h-3 mr-1" />
                        Присвоить пользователю
                      </Button>
                    </div>
                  ))}
                  {reservedIds.length === 0 && (
                    <p className="text-center text-[#999] text-sm py-8">
                      Нет зарезервированных номеров
                    </p>
                  )}
                </div>
              </ScrollArea>
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
            </ul>
          </div>
        </CardContent>
      </Card>

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

            {/* Filtered Users List */}
            <div className="border rounded-lg">
              <ScrollArea className="h-[300px]">
                <div className="p-2 space-y-1">
                  {users
                    .filter(user => {
                      const query = searchQuery.toLowerCase().trim();
                      if (!query) return true;
                      return (
                        user.имя.toLowerCase().includes(query) ||
                        user.фамилия.toLowerCase().includes(query) ||
                        user.id.includes(query) ||
                        user.email.toLowerCase().includes(query)
                      );
                    })
                    .sort((a, b) => {
                      // Sort by relevance if there's a search query
                      if (searchQuery.trim()) {
                        const query = searchQuery.toLowerCase();
                        const aNameMatch = a.имя.toLowerCase().startsWith(query) || a.фамилия.toLowerCase().startsWith(query);
                        const bNameMatch = b.имя.toLowerCase().startsWith(query) || b.фамилия.toLowerCase().startsWith(query);
                        if (aNameMatch && !bNameMatch) return -1;
                        if (!aNameMatch && bNameMatch) return 1;
                      }
                      return `${a.имя} ${a.фамилия}`.localeCompare(`${b.имя} ${b.фамилия}`);
                    })
                    .map(user => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all hover:bg-[#F7FAFC] ${
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
                    ))}
                  {users.filter(user => {
                    const query = searchQuery.toLowerCase().trim();
                    if (!query) return true;
                    return (
                      user.имя.toLowerCase().includes(query) ||
                      user.фамилия.toLowerCase().includes(query) ||
                      user.id.includes(query) ||
                      user.email.toLowerCase().includes(query)
                    );
                  }).length === 0 && (
                    <div className="text-center py-8 text-[#999]">
                      Пользователи не найдены
                    </div>
                  )}
                </div>
              </ScrollArea>
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
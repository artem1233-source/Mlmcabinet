import { useState, useEffect } from 'react';
import { Hash, Lock, Unlock, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import * as api from '../../utils/api';
import { toast } from 'sonner';

interface IdStatus {
  userIds: {
    used: number[];
    freed: number[];
    reserved: number[];
    nextCounter: number;
  };
  partnerIds: {
    used: number[];
    freed: number[];
    reserved: number[];
    nextCounter: number;
  };
  reservedMetadata: Array<{
    type: 'user' | 'partner';
    id: number;
    reservedBy: string;
    reservedAt: string;
    reason: string;
  }>;
}

interface IdManagerProps {
  currentUser: any;
}

export function IdManager({ currentUser }: IdManagerProps) {
  const [status, setStatus] = useState<IdStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [idType, setIdType] = useState<'user' | 'partner'>('user');
  const [reserveReason, setReserveReason] = useState('');
  const [manualIds, setManualIds] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await api.getIdsStatus();
      if (response.success) {
        setStatus(response);
      }
    } catch (error) {
      console.error('Error loading ID status:', error);
      toast.error('Ошибка загрузки статуса ID');
    } finally {
      setLoading(false);
    }
  };

  const toggleIdSelection = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const reserveSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Выберите ID для резервирования');
      return;
    }

    if (!reserveReason.trim()) {
      toast.error('Укажите причину резервирования');
      return;
    }

    try {
      const response = await api.reserveIds(idType, selectedIds, reserveReason);
      if (response.success) {
        toast.success(response.message);
        setSelectedIds([]);
        setReserveReason('');
        loadStatus();
      }
    } catch (error) {
      console.error('Error reserving IDs:', error);
      toast.error('Ошибка резервирования ID');
    }
  };

  const unreserveIds = async (ids: number[]) => {
    if (!confirm(`Снять резервирование с ${ids.length} ID?`)) {
      return;
    }

    try {
      const response = await api.unreserveIds(idType, ids);
      if (response.success) {
        toast.success(response.message);
        loadStatus();
      }
    } catch (error) {
      console.error('Error unreserving IDs:', error);
      toast.error('Ошибка снятия резервирования');
    }
  };

  const reserveManualIds = async () => {
    const ids = manualIds
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));

    if (ids.length === 0) {
      toast.error('Введите корректные номера ID через запятую');
      return;
    }

    if (!reserveReason.trim()) {
      toast.error('Укажите причину резервирования');
      return;
    }

    try {
      const response = await api.reserveIds(idType, ids, reserveReason);
      if (response.success) {
        toast.success(response.message);
        setManualIds('');
        setReserveReason('');
        loadStatus();
      }
    } catch (error) {
      console.error('Error reserving IDs:', error);
      toast.error('Ошибка резервирования ID');
    }
  };

  const renderIdBadges = (ids: number[], type: 'used' | 'freed' | 'reserved', currentType: 'user' | 'partner') => {
    const maxDisplay = 50;
    const displayIds = ids.slice(0, maxDisplay);
    const remaining = ids.length - maxDisplay;

    const colors = {
      used: 'bg-gray-200 text-gray-700',
      freed: 'bg-green-100 text-green-700',
      reserved: 'bg-purple-200 text-purple-700',
    };

    const isInteractive = type !== 'used';

    return (
      <div className="flex flex-wrap gap-2">
        {displayIds.map(id => (
          <button
            key={id}
            onClick={() => isInteractive && toggleIdSelection(id)}
            disabled={!isInteractive}
            className={`px-2 py-1 rounded text-sm font-mono transition-all ${colors[type]} ${
              isInteractive
                ? selectedIds.includes(id)
                  ? 'ring-2 ring-blue-500 scale-110'
                  : 'hover:scale-105 cursor-pointer'
                : 'cursor-default'
            }`}
          >
            {currentType === 'partner' ? String(id).padStart(3, '0') : id}
          </button>
        ))}
        {remaining > 0 && (
          <span className="px-2 py-1 text-sm text-gray-500">
            +{remaining} ещё...
          </span>
        )}
      </div>
    );
  };

  const renderReservedMetadata = () => {
    const filtered = status?.reservedMetadata.filter(m => m.type === idType) || [];

    if (filtered.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500 text-sm">
          Нет зарезервированных ID
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filtered.map(meta => (
          <div
            key={`${meta.type}-${meta.id}`}
            className="border rounded-lg p-3 bg-purple-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <code className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-mono">
                    {meta.type === 'partner' ? String(meta.id).padStart(3, '0') : meta.id}
                  </code>
                  <span className="text-xs text-gray-500">
                    {new Date(meta.reservedAt).toLocaleString('ru')}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{meta.reason}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Зарезервировал: {meta.reservedBy}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unreserveIds([meta.id])}
                className="text-red-600 hover:text-red-700"
              >
                <Unlock className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Управление ID номерами
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Загрузка...
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentIds = idType === 'user' ? status.userIds : status.partnerIds;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Управление ID номерами
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadStatus}>
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={idType} onValueChange={(v) => {
          setIdType(v as 'user' | 'partner');
          setSelectedIds([]);
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">Пользовательские ID</TabsTrigger>
            <TabsTrigger value="partner">Партнёрские ID</TabsTrigger>
          </TabsList>

          <TabsContent value={idType} className="space-y-4 mt-4">
            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Используется</div>
                <div className="text-2xl font-bold text-gray-700">
                  {currentIds.used.length}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-xs text-green-600 mb-1">Освобождено</div>
                <div className="text-2xl font-bold text-green-700">
                  {currentIds.freed.length}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-xs text-purple-600 mb-1">Зарезервировано</div>
                <div className="text-2xl font-bold text-purple-700">
                  {currentIds.reserved.length}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-600 mb-1">Следующий новый</div>
                <div className="text-2xl font-bold text-blue-700">
                  {idType === 'partner' 
                    ? String(currentIds.nextCounter).padStart(3, '0')
                    : currentIds.nextCounter
                  }
                </div>
              </div>
            </div>

            {/* Used IDs */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-600" />
                Используемые ID ({currentIds.used.length})
              </h3>
              {currentIds.used.length === 0 ? (
                <p className="text-sm text-gray-500">Нет используемых ID</p>
              ) : (
                renderIdBadges(currentIds.used, 'used', idType)
              )}
            </div>

            {/* Freed IDs */}
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-green-600" />
                Освобождённые ID ({currentIds.freed.length})
                <span className="text-xs text-gray-500 font-normal">
                  - Будут переиспользованы автоматически
                </span>
              </h3>
              {currentIds.freed.length === 0 ? (
                <p className="text-sm text-gray-500">Нет освобождённых ID</p>
              ) : (
                <>
                  {renderIdBadges(currentIds.freed, 'freed', idType)}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reserveSelected()}
                      disabled={selectedIds.length === 0}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Зарезервировать выбранные ({selectedIds.length})
                    </Button>
                    {selectedIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIds([])}
                      >
                        Отменить выбор
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Reserved IDs */}
            <div className="border rounded-lg p-4 bg-purple-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600" />
                Зарезервированные ID ({currentIds.reserved.length})
                <span className="text-xs text-gray-500 font-normal">
                  - Не будут выданы автоматически
                </span>
              </h3>
              {renderReservedMetadata()}
            </div>

            {/* Manual reservation */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Зарезервировать определённые номера
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="manual-ids">
                    Номера ID (через запятую)
                  </Label>
                  <Input
                    id="manual-ids"
                    placeholder="Например: 5, 10, 15, 100"
                    value={manualIds}
                    onChange={(e) => setManualIds(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reserve-reason">
                    Причина резервирования
                  </Label>
                  <Input
                    id="reserve-reason"
                    placeholder="Например: Для VIP клиента"
                    value={reserveReason}
                    onChange={(e) => setReserveReason(e.target.value)}
                  />
                </div>
                <Button onClick={reserveManualIds}>
                  <Lock className="w-4 h-4 mr-2" />
                  Зарезервировать
                </Button>
              </div>
            </div>

            {/* Help text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                💡 Как это работает:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  <strong>Используемые ID</strong> - присвоены существующим пользователям
                </li>
                <li>
                  <strong>Освобождённые ID</strong> - освобождены после удаления пользователей, 
                  будут автоматически переиспользованы при регистрации новых
                </li>
                <li>
                  <strong>Зарезервированные ID</strong> - заблокированы вами, не будут выданы 
                  автоматически. Вы сможете присвоить их конкретному пользователю вручную
                </li>
                <li>
                  Нажмите на освобождённый ID чтобы выбрать его для резервирования
                </li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

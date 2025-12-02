import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Star, 
  Pause, 
  Play, 
  Search,
  Hash,
  AtSign,
  Loader2,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import {
  getUserCodes,
  addUserCode,
  setCodeAsPrimary,
  deactivateCode,
  activateCode,
  checkCodeAvailability,
  PartnerCode
} from '@/utils/api';

interface UserCodesManagerProps {
  userId: string;
  userName?: string;
  onClose?: () => void;
  onCodesChanged?: () => void;
}

export function UserCodesManager({ userId, userName, onClose, onCodesChanged }: UserCodesManagerProps) {
  const [codes, setCodes] = useState<PartnerCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [makePrimary, setMakePrimary] = useState(false);
  const [addingCode, setAddingCode] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadCodes();
  }, [userId]);

  useEffect(() => {
    if (newCode.length >= 1) {
      const timer = setTimeout(() => checkCode(newCode), 500);
      return () => clearTimeout(timer);
    } else {
      setCodeAvailable(null);
    }
  }, [newCode]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const response = await getUserCodes(userId);
      if (response.success) {
        setCodes(response.codes || []);
      } else {
        toast.error('Ошибка загрузки кодов');
      }
    } catch (error) {
      console.error('Error loading codes:', error);
      toast.error('Ошибка загрузки кодов');
    } finally {
      setLoading(false);
    }
  };

  const checkCode = async (code: string) => {
    setCheckingCode(true);
    try {
      const response = await checkCodeAvailability(code);
      setCodeAvailable(response.available);
    } catch (error) {
      setCodeAvailable(null);
    } finally {
      setCheckingCode(false);
    }
  };

  const handleAddCode = async () => {
    if (!newCode.trim()) {
      toast.error('Введите код');
      return;
    }

    if (codeAvailable === false) {
      toast.error('Этот код уже занят');
      return;
    }

    setAddingCode(true);
    try {
      const response = await addUserCode(userId, newCode, makePrimary);
      if (response.success) {
        toast.success(response.message);
        setCodes(response.codes);
        setNewCode('');
        setMakePrimary(false);
        setCodeAvailable(null);
        onCodesChanged?.();
      } else {
        toast.error(response.message || 'Ошибка добавления кода');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка добавления кода');
    } finally {
      setAddingCode(false);
    }
  };

  const handleSetPrimary = async (code: string) => {
    setActionLoading(code);
    try {
      const response = await setCodeAsPrimary(userId, code);
      if (response.success) {
        toast.success(response.message);
        setCodes(response.codes);
        onCodesChanged?.();
      } else {
        toast.error(response.message || 'Ошибка');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (code: string) => {
    setActionLoading(code);
    try {
      const response = await deactivateCode(userId, code);
      if (response.success) {
        toast.success(response.message);
        setCodes(response.codes);
        onCodesChanged?.();
      } else {
        toast.error(response.message || 'Ошибка');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (code: string) => {
    setActionLoading(code);
    try {
      const response = await activateCode(userId, code);
      if (response.success) {
        toast.success(response.message);
        setCodes(response.codes);
        onCodesChanged?.();
      } else {
        toast.error(response.message || 'Ошибка');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Коды партнёра</CardTitle>
            <CardDescription>
              {userName ? `${userName} (ID: ${userId})` : `ID: ${userId}`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={loadCodes} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <div className="text-sm font-medium">Добавить новый код</div>
            <div className="relative">
              <Input
                placeholder="Введите код (цифры или буквы)"
                value={newCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCode(e.target.value.toUpperCase())}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingCode && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!checkingCode && codeAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                {!checkingCode && codeAvailable === false && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>
          </div>
          <Button 
            onClick={handleAddCode} 
            disabled={addingCode || !newCode.trim() || codeAvailable === false}
            size="icon"
          >
            {addingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="makePrimary"
            checked={makePrimary}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMakePrimary(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="makePrimary" className="text-sm">
            Сделать основным
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Hash className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Нет дополнительных кодов</p>
            <p className="text-sm">Основной ID: {userId}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Всего кодов: {codes.length}
            </div>
            <div className="space-y-2">
              {codes.map((code) => (
                <div
                  key={code.value}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    code.primary ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 
                    !code.isActive ? 'border-gray-300 bg-gray-50 dark:bg-gray-900 opacity-60' :
                    'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {code.type === 'numeric' ? (
                      <Hash className="h-5 w-5 text-blue-500" />
                    ) : (
                      <AtSign className="h-5 w-5 text-purple-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{code.value}</span>
                        {code.primary && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Основной
                          </Badge>
                        )}
                        {!code.isActive && (
                          <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                            Неактивен
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {code.type === 'numeric' ? 'Цифровой' : 'Буквенный'} • 
                        Добавлен: {formatDate(code.createdAt)}
                        {code.assignedBy && ` • Кем: ${code.assignedBy}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!code.primary && code.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetPrimary(code.value)}
                        disabled={actionLoading === code.value}
                        title="Сделать основным"
                      >
                        {actionLoading === code.value ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    
                    {code.value !== userId && (
                      code.isActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivate(code.value)}
                          disabled={actionLoading === code.value}
                          title="Деактивировать"
                        >
                          {actionLoading === code.value ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pause className="h-4 w-4 text-orange-500" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleActivate(code.value)}
                          disabled={actionLoading === code.value}
                          title="Активировать"
                        >
                          {actionLoading === code.value ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {onClose && (
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              Закрыть
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CodeLookup() {
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async () => {
    if (!searchCode.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const { resolveCode } = await import('@/utils/api');
      const response = await resolveCode(searchCode);
      setResult(response);
    } catch (error: any) {
      setResult({ success: false, error: error.message || 'Код не найден' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5" />
          Поиск по коду
        </CardTitle>
        <CardDescription>
          Найти партнёра по любому его коду (цифровому или буквенному)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Введите код для поиска"
            value={searchCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchCode(e.target.value.toUpperCase())}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading || !searchCode.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {result.success ? (
              <div className="space-y-2">
                <div className="font-medium text-green-800">Найден партнёр!</div>
                <div className="text-sm">
                  <p><strong>ID:</strong> {result.userId}</p>
                  {result.user && (
                    <>
                      <p><strong>Имя:</strong> {result.user.имя} {result.user.фамилия}</p>
                      <p><strong>Email:</strong> {result.user.email}</p>
                      {result.user.codes && result.user.codes.length > 0 && (
                        <p><strong>Все коды:</strong> {result.user.codes.map((c: any) => c.value).join(', ')}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-red-800">
                {result.error || 'Код не найден'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

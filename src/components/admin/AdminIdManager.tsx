import { useState } from 'react';
import { Shield, User, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import {
  Alert,
  AlertDescription,
} from '../ui/alert';
import * as api from '../../utils/api';
import { toast } from 'sonner';

interface AdminIdManagerProps {
  currentUser: any;
  allUsers?: any[];
  onIdChanged?: () => void;
}

export function AdminIdManager({ currentUser, allUsers = [], onIdChanged }: AdminIdManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newId, setNewId] = useState<string>('');
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // Проверка: только CEO может менять ID
  const isCEO = currentUser?.isAdmin === true;

  if (!isCEO) {
    return null;
  }

  // Получаем список всех администраторов
  const adminUsers = allUsers.filter(user => user.isAdmin === true);

  const handleOpenChangeDialog = (userId: string) => {
    setSelectedUserId(userId);
    setNewId('');
    setChangeDialogOpen(true);
  };

  const handleChangeId = async () => {
    if (!selectedUserId || !newId.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    // Валидация нового ID
    const trimmedNewId = newId.trim();
    
    if (trimmedNewId.length < 2) {
      toast.error('ID должен содержать минимум 2 символа');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedNewId)) {
      toast.error('ID может содержать только латинские буквы, цифры, дефис и подчёркивание');
      return;
    }

    const selectedUser = allUsers.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      toast.error('Пользователь не найден');
      return;
    }

    const confirmMsg = `Вы уверены, что хотите изменить ID пользователя?\n\n${selectedUser.имя} ${selectedUser.фамилия}\n${selectedUserId} → ${trimmedNewId}\n\n⚠️ Это действие обновит все ссылки в системе.`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    setIsChanging(true);

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
          setChangeDialogOpen(false);
          setSelectedUserId('');
          setNewId('');
          
          if (onIdChanged) {
            onIdChanged();
          }
        }
      } else {
        toast.error(response.error || 'Ошибка при изменении ID');
      }
    } catch (error: any) {
      console.error('Error changing ID:', error);
      toast.error(error.message || 'Ошибка при изменении ID');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <>
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-[#1E1E1E]">
                Управление ID администраторов
              </CardTitle>
              <CardDescription>
                Изменение ID для себя и других администраторов
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Важно:</strong> При изменении ID пользователя все ссылки в системе (спонсоры, команды, заказы) будут автоматически обновлены. 
              Если вы измените свой собственный ID, вам потребуется войти заново с новым ID.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold text-[#1E1E1E]">
              Администраторы ({adminUsers.length})
            </h3>
            
            {adminUsers.length === 0 ? (
              <div className="text-center py-8 text-[#999]">
                Администраторы не найдены
              </div>
            ) : (
              <div className="space-y-2">
                {adminUsers.map(user => (
                  <div 
                    key={user.id}
                    className="border border-red-200 rounded-xl p-4 bg-red-50/30 hover:bg-red-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white shrink-0">
                          <span style={{ fontWeight: '700' }}>
                            {user.имя?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-[#1E1E1E] font-semibold">
                              {user.имя} {user.фамилия}
                            </p>
                            <Badge className="bg-red-100 text-red-700">
                              <Shield className="w-3 h-3 mr-1" />
                              Админ
                            </Badge>
                            {user.id === currentUser.id && (
                              <Badge className="bg-blue-100 text-blue-700">
                                Вы
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[#666] text-sm">
                            <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">
                              ID: {user.id}
                            </code>
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChangeDialog(user.id)}
                        className="shrink-0"
                      >
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Изменить ID
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="font-semibold text-[#1E1E1E] mb-2">
              💡 Рекомендации по выбору ID:
            </h4>
            <ul className="text-sm text-[#666] space-y-1">
              <li>• Используйте латинские буквы, цифры, дефис или подчёркивание</li>
              <li>• Минимум 2 символа</li>
              <li>• Примеры: <code className="bg-white px-1 rounded">CEO</code>, <code className="bg-white px-1 rounded">admin</code>, <code className="bg-white px-1 rounded">director</code></li>
              <li>• ID должен быть уникальным в системе</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Change ID Dialog */}
      <Dialog 
        open={changeDialogOpen} 
        onOpenChange={(open) => {
          if (!isChanging) {
            setChangeDialogOpen(open);
            if (!open) {
              setSelectedUserId('');
              setNewId('');
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить ID пользователя</DialogTitle>
            <DialogDescription>
              {(() => {
                const user = allUsers.find(u => u.id === selectedUserId);
                return user ? `${user.имя} ${user.фамилия} (${user.id})` : '';
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1E1E1E]">
                Текущий ID
              </label>
              <Input
                value={selectedUserId}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1E1E1E]">
                Новый ID <span className="text-red-500">*</span>
              </label>
              <Input
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="Введите новый ID (например: CEO, admin)"
                className="font-mono"
                disabled={isChanging}
              />
              <p className="text-xs text-[#666]">
                Только латинские буквы, цифры, дефис и подчёркивание. Минимум 2 символа.
              </p>
            </div>

            {selectedUserId === currentUser.id && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  ⚠️ Вы изменяете свой собственный ID. После изменения страница перезагрузится, 
                  и вам нужно будет войти с новым ID.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setChangeDialogOpen(false);
                setSelectedUserId('');
                setNewId('');
              }}
              disabled={isChanging}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleChangeId}
              disabled={!newId.trim() || isChanging}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
            >
              {isChanging ? (
                <>Изменение...</>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Изменить ID
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

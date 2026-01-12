/**
 * 📦 СИСТЕМА АВТОМАТИЧЕСКИХ БЭКАПОВ
 * Ежедневное сохранение всех данных для восстановления
 */

import { useState, useEffect } from 'react';
import { Database, Download as DownloadIcon, Upload, Clock, CheckCircle, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAllUsers } from '../../hooks/useAllUsers';

interface Backup {
  id: string;
  timestamp: string;
  usersCount: number;
  fileSize: number;
  auto: boolean;
}

export function AutoBackupManager({ currentUser }: { currentUser: any }) {
  const { users: allUsers, isLoading } = useAllUsers();
  
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Загружаем настройки из localStorage
  useEffect(() => {
    const enabled = localStorage.getItem('autoBackupEnabled') === 'true';
    const lastTime = localStorage.getItem('lastBackupTime');
    setAutoBackupEnabled(enabled);
    setLastBackupTime(lastTime);
    
    // Загружаем список бэкапов
    loadBackups();
  }, []);

  // Автоматический бэкап каждые 24 часа
  useEffect(() => {
    if (!autoBackupEnabled) return;
    
    const checkAndBackup = () => {
      const now = Date.now();
      const lastTime = lastBackupTime ? new Date(lastBackupTime).getTime() : 0;
      const hoursSinceLastBackup = (now - lastTime) / (1000 * 60 * 60);
      
      // Если прошло больше 24 часов - делаем бэкап
      if (hoursSinceLastBackup >= 24 || !lastBackupTime) {
        console.log('🔄 Автоматический бэкап: прошло', hoursSinceLastBackup.toFixed(1), 'часов');
        createBackup(true);
      }
    };
    
    // Проверяем при загрузке
    checkAndBackup();
    
    // Проверяем каждый час
    const interval = setInterval(checkAndBackup, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [autoBackupEnabled, lastBackupTime, allUsers]);

  // Загружаем список бэкапов из localStorage
  const loadBackups = () => {
    const stored = localStorage.getItem('userBackups');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBackups(parsed.sort((a: Backup, b: Backup) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      } catch (e) {
        console.error('Failed to load backups:', e);
      }
    }
  };

  // Создать бэкап
  const createBackup = async (auto = false) => {
    if (allUsers.length === 0) {
      toast.error('Нет данных для бэкапа');
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading(auto ? '📦 Автоматический бэкап...' : '📦 Создание бэкапа...');
    
    try {
      const timestamp = new Date().toISOString();
      const backupData = {
        timestamp,
        users: allUsers,
        meta: {
          totalUsers: allUsers.length,
          nonAdminUsers: allUsers.filter(u => !u.isAdmin).length,
          createdBy: currentUser.id,
          auto,
        }
      };
      
      // Сохраняем в localStorage (для простых случаев)
      const backupId = `backup_${Date.now()}`;
      const backupJson = JSON.stringify(backupData);
      const fileSizeKB = Math.round(backupJson.length / 1024);
      
      // Сохраняем сам бэкап
      localStorage.setItem(backupId, backupJson);
      
      // Обновляем список бэкапов
      const newBackup: Backup = {
        id: backupId,
        timestamp,
        usersCount: allUsers.length,
        fileSize: fileSizeKB,
        auto,
      };
      
      const updatedBackups = [newBackup, ...backups];
      
      // Ограничиваем количество бэкапов (максимум 10)
      const limitedBackups = updatedBackups.slice(0, 10);
      
      // Удаляем старые бэкапы из localStorage
      updatedBackups.slice(10).forEach(old => {
        localStorage.removeItem(old.id);
      });
      
      localStorage.setItem('userBackups', JSON.stringify(limitedBackups));
      setBackups(limitedBackups);
      
      // Обновляем время последнего бэкапа
      setLastBackupTime(timestamp);
      localStorage.setItem('lastBackupTime', timestamp);
      
      toast.success(`✅ Бэкап создан (${fileSizeKB} KB)`, {
        id: toastId,
        description: auto ? 'Автоматический бэкап' : undefined
      });
      
      console.log(`📦 Backup created: ${backupId}, ${fileSizeKB} KB, ${allUsers.length} users`);
      
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Ошибка создания бэкапа', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Скачать бэкап
  const downloadBackup = (backup: Backup) => {
    try {
      const data = localStorage.getItem(backup.id);
      if (!data) {
        toast.error('Бэкап не найден');
        return;
      }
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mlm_backup_${new Date(backup.timestamp).toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('✅ Бэкап скачан');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Ошибка скачивания');
    }
  };

  // Восстановить из бэкапа
  const restoreBackup = async (backup: Backup) => {
    const confirmation = confirm(
      `⚠️ ВОССТАНОВЛЕНИЕ ИЗ БЭКАПА\n\n` +
      `Дата: ${new Date(backup.timestamp).toLocaleString('ru')}\n` +
      `Пользователей: ${backup.usersCount}\n\n` +
      `ВНИМАНИЕ: Текущие данные будут заменены!\n\n` +
      `Продолжить?`
    );
    
    if (!confirmation) return;
    
    setLoading(true);
    const toastId = toast.loading('🔄 Восстановление данных...');
    
    try {
      const data = localStorage.getItem(backup.id);
      if (!data) {
        throw new Error('Бэкап не найден');
      }
      
      const backupData = JSON.parse(data);
      const usersToRestore = backupData.users;
      
      // Восстанавливаем каждого пользователя
      let successCount = 0;
      let errorCount = 0;
      
      for (const user of usersToRestore) {
        try {
          const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${user.id}`;
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userData: user })
          });
          
          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to restore user ${user.id}:`, error);
          errorCount++;
        }
      }
      
      toast.success(`✅ Восстановлено: ${successCount}`, {
        id: toastId,
        description: errorCount > 0 ? `Ошибок: ${errorCount}` : undefined
      });
      
      // Перезагружаем страницу для обновления данных
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Ошибка восстановления', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Удалить бэкап
  const deleteBackup = (backup: Backup) => {
    const confirmation = confirm(
      `Удалить бэкап от ${new Date(backup.timestamp).toLocaleString('ru')}?`
    );
    
    if (!confirmation) return;
    
    try {
      localStorage.removeItem(backup.id);
      const updatedBackups = backups.filter(b => b.id !== backup.id);
      localStorage.setItem('userBackups', JSON.stringify(updatedBackups));
      setBackups(updatedBackups);
      toast.success('Бэкап удалён');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Ошибка удаления');
    }
  };

  // Переключить автобэкап
  const toggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    localStorage.setItem('autoBackupEnabled', enabled.toString());
    
    if (enabled) {
      toast.success('✅ Автоматические бэкапы включены', {
        description: 'Бэкап будет создаваться каждые 24 часа'
      });
      
      // Создаём первый бэкап сразу, если его ещё не было
      if (!lastBackupTime) {
        createBackup(true);
      }
    } else {
      toast.info('Автоматические бэкапы отключены');
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSinceBackup = () => {
    if (!lastBackupTime) return 'Никогда';
    
    const now = Date.now();
    const lastTime = new Date(lastBackupTime).getTime();
    const hoursSince = Math.floor((now - lastTime) / (1000 * 60 * 60));
    
    if (hoursSince < 1) return 'Меньше часа назад';
    if (hoursSince === 1) return '1 час назад';
    if (hoursSince < 24) return `${hoursSince} ч. назад`;
    const daysSince = Math.floor(hoursSince / 24);
    return `${daysSince} д. назад`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Автоматические бэкапы
            </CardTitle>
            <CardDescription>
              Ежедневное сохранение данных для восстановления при ошибках
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-backup"
                checked={autoBackupEnabled}
                onCheckedChange={toggleAutoBackup}
                disabled={loading}
              />
              <Label htmlFor="auto-backup" className="text-sm">
                Автобэкап
              </Label>
            </div>
            
            <Button
              onClick={() => createBackup(false)}
              disabled={loading || isLoading}
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Создать сейчас
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Статус */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">
              Последний бэкап: <strong>{getTimeSinceBackup()}</strong>
            </span>
          </div>
          {autoBackupEnabled && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Активно
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Бэкапов пока нет</p>
            <p className="text-sm">Создайте первый бэкап или включите автоматический режим</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Доступные бэкапы ({backups.length}/10)
              </span>
              <span className="text-xs text-gray-500">
                Хранятся в браузере (localStorage)
              </span>
            </div>
            
            {backups.map(backup => (
              <div
                key={backup.id}
                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {formatDate(backup.timestamp)}
                      </span>
                      {backup.auto && (
                        <Badge variant="secondary" className="text-xs">
                          Авто
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>👥 {backup.usersCount} пользователей</span>
                      <span>📦 {backup.fileSize} KB</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => downloadBackup(backup)}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      onClick={() => restoreBackup(backup)}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      onClick={() => deleteBackup(backup)}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Инструкция */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Как это работает:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Автобэкап создаётся каждые 24 часа</li>
                <li>Сохраняются последние 10 бэкапов</li>
                <li>Данные хранятся в браузере (localStorage)</li>
                <li>Можно скачать бэкап на компьютер</li>
                <li>Восстановление заменяет все текущие данные</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

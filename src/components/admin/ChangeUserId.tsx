import { useState } from 'react';
import { Edit, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import * as api from '../../utils/api';

interface ChangeUserIdProps {
  currentUser: any;
  onSuccess?: () => void;
}

export function ChangeUserId({ currentUser, onSuccess }: ChangeUserIdProps) {
  const [oldId, setOldId] = useState('');
  const [newId, setNewId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeId = async () => {
    if (!oldId || !newId) {
      toast.error('Заполните оба поля');
      return;
    }

    if (oldId === newId) {
      toast.error('Старый и новый ID совпадают');
      return;
    }

    if (!confirm(`⚠️ ИЗМЕНЕНИЕ ID ПОЛЬЗОВАТЕЛЯ\n\nСтарый ID: ${oldId}\nНовый ID: ${newId}\n\nВсе ссылки на этого пользователя будут автоматически обновлены.\n\nПродолжить?`)) {
      return;
    }

    try {
      setLoading(true);
      console.log(`🔄 Changing user ID: ${oldId} → ${newId}`);

      const response = await api.changeUserId(oldId, newId);
      console.log('✅ Change ID response:', response);

      if (response.success) {
        toast.success('ID успешно изменён!', {
          description: response.message
        });

        // Clear form
        setOldId('');
        setNewId('');

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(response.error || 'Failed to change ID');
      }
    } catch (error) {
      console.error('❌ Change ID error:', error);
      toast.error('Ошибка изменения ID', {
        description: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
          <Edit className="w-5 h-5 text-[#39B7FF]" />
          Безопасное изменение ID
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-2">
                Эта функция автоматически обновит:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Поле <code className="bg-blue-100 px-1 rounded">спонсорId</code> у всех партнёров</li>
                <li>Массив <code className="bg-blue-100 px-1 rounded">команда</code> у всех пользователей</li>
                <li>Запись пользователя в базе данных</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="oldId">Старый ID (который нужно заменить)</Label>
            <Input
              id="oldId"
              value={oldId}
              onChange={(e) => setOldId(e.target.value)}
              placeholder="Например: 003"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="newId">Новый ID (на который заменить)</Label>
            <Input
              id="newId"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="Например: 005"
              className="mt-1"
            />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <p className="text-sm text-orange-900">
              Новый ID должен быть свободен. Если ID уже занят, операция будет отменена.
            </p>
          </div>
        </div>

        <Button
          onClick={handleChangeId}
          disabled={loading || !oldId || !newId}
          className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white hover:opacity-90"
        >
          {loading ? 'Обработка...' : 'Изменить ID'}
        </Button>
      </CardContent>
    </Card>
  );
}

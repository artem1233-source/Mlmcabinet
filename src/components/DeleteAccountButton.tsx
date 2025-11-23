import { useState } from 'react';
import { UserX, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import * as api from '../utils/api';

interface DeleteAccountButtonProps {
  currentUser: any;
  onDeleted?: () => void;
}

export function DeleteAccountButton({ currentUser, onDeleted }: DeleteAccountButtonProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'УДАЛИТЬ') {
      toast.error('Введите "УДАЛИТЬ" для подтверждения');
      return;
    }

    if (!confirm('⚠️ ВНИМАНИЕ!\n\nВы уверены, что хотите НАВСЕГДА удалить свою учетную запись?\n\nЭто удалит:\n• Ваш профиль\n• Весь баланс\n• Историю заказов\n• Связь с командой\n\nВаш ID будет освобождён и доступен для новых пользователей.\n\nЭто действие НЕОБРАТИМО!\n\nПродолжить?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await api.deleteAccount();

      if (response.success) {
        toast.success('Учетная запись удалена', {
          description: 'Ваш ID освобождён. Перенаправление на страницу входа...'
        });
        
        // Очищаем локальное хранилище
        localStorage.clear();
        
        // Перенаправляем на страницу входа через 2 секунды
        setTimeout(() => {
          if (onDeleted) {
            onDeleted();
          } else {
            window.location.reload();
          }
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Ошибка удаления учетной записи');
      setIsDeleting(false);
    }
  };

  if (!showConfirmation) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <UserX className="w-5 h-5" />
            Опасная зона
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-red-600 mb-3">
              Удаление учетной записи - необратимое действие. Будут удалены все ваши данные, баланс и история.
            </p>
            <Button
              onClick={() => setShowConfirmation(true)}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-100"
            >
              <UserX className="w-4 h-4 mr-2" />
              Удалить мою учетную запись
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-500 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          Подтверждение удаления учетной записи
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 space-y-2">
          <p className="text-red-900">
            <strong>⚠️ Вы собираетесь удалить свою учетную запись!</strong>
          </p>
          <p className="text-sm text-red-800">
            Это действие удалит:
          </p>
          <ul className="text-sm text-red-800 list-disc ml-5 space-y-1">
            <li>Ваш профиль и личные данные</li>
            <li>Весь накопленный баланс</li>
            <li>Историю заказов и транзакций</li>
            <li>Связь с вашей командой</li>
            <li>Ваш партнёрский ID будет освобождён для новых пользователей</li>
          </ul>
          <p className="text-sm text-red-900 mt-3">
            <strong>Это действие НЕОБРАТИМО!</strong>
          </p>
        </div>

        <div>
          <label className="text-sm text-red-700 mb-2 block">
            Введите <strong>УДАЛИТЬ</strong> для подтверждения:
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="УДАЛИТЬ"
            className="border-red-300"
            disabled={isDeleting}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowConfirmation(false);
              setConfirmText('');
            }}
            variant="outline"
            className="flex-1"
            disabled={isDeleting}
          >
            Отмена
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={isDeleting || confirmText !== 'УДАЛИТЬ'}
            variant="destructive"
            className="flex-1"
          >
            {isDeleting ? 'Удаление...' : 'Подтвердить удаление'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
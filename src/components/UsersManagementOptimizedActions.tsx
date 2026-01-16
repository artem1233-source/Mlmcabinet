/**
 * 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ
 * Вынесены из основного компонента для уменьшения размера файла
 */

import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * 🗑️ Удаление пользователя
 */
export async function deleteUser(
  user: any,
  queryClient: any,
  onRefresh?: () => void,
  setUserDetailsOpen?: (open: boolean) => void
) {
  console.log('🗑️ deleteUser called for:', user?.id, user?.имя);
  
  if (!user || !user.id) {
    console.error('❌ deleteUser: user or user.id is missing', user);
    toast.error('Ошибка: пользователь не найден');
    return;
  }
  
  if (!confirm(`⚠️ УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ\n\n${user.имя} ${user.фамилия}\n${user.email}\nID: ${user.id}\n\nЭто действие необратимо!\n\nПродолжить?`)) {
    console.log('🗑️ Delete cancelled by user');
    return;
  }

  try {
    const userId = localStorage.getItem('userId');
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/delete-user/${user.id}`;
    console.log('🗑️ DELETE request to:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': userId || '',
      },
    });

    console.log('🗑️ Response status:', response.status);
    const data = await response.json();
    console.log('🗑️ Response data:', data);

    if (data.success) {
      toast.success('Пользователь удалён!');
      queryClient.invalidateQueries({ queryKey: ['users-optimized'] });
      if (setUserDetailsOpen) setUserDetailsOpen(false);
      if (onRefresh) onRefresh();
    } else {
      throw new Error(data.error || 'Failed to delete user');
    }
  } catch (error: any) {
    console.error('❌ Delete user error:', error);
    toast.error(`Ошибка удаления: ${error.message || 'Неизвестная ошибка'}`);
  }
}

/**
 * 📊 Изменение уровня пользователя
 */
export async function changeLevelUser(
  user: any,
  queryClient: any,
  onRefresh?: () => void
) {
  const newLevel = prompt(`Текущий уровень: ${user.уровень || 1}\n\nВведите новый уровень (1, 2 или 3):`, String(user.уровень || 1));
  
  if (!newLevel || !['1', '2', '3'].includes(newLevel)) {
    if (newLevel !== null) toast.error('Допустимые значения: 1, 2, 3');
    return;
  }

  const level = parseInt(newLevel);
  if (level === user.уровень) {
    toast.info('Уровень не изменился');
    return;
  }

  try {
    const userId = localStorage.getItem('userId');
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users/${user.id}/level`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level }),
      }
    );

    const data = await response.json();

    if (data.success) {
      toast.success(`Уровень изменён: ${user.уровень || 1} → ${level}`);
      queryClient.invalidateQueries({ queryKey: ['users-optimized'] });
      if (onRefresh) onRefresh();
    } else {
      throw new Error(data.error || 'Failed to change level');
    }
  } catch (error: any) {
    console.error('Change level error:', error);
    toast.error('Ошибка изменения уровня');
  }
}

/**
 * 💰 Корректировка баланса
 */
export async function adjustBalance(
  user: any,
  queryClient: any,
  onRefresh?: () => void
) {
  const amount = prompt(`Текущий баланс: ${(user.баланс || 0).toLocaleString('ru-RU')} ₽\n\nВведите сумму корректировки (положительное или отрицательное число):`, '0');
  
  if (!amount) return;
  
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum === 0) {
    toast.error('Введите корректное число');
    return;
  }

  const reason = prompt('Укажите причину корректировки:', '');
  if (!reason) {
    toast.error('Необходимо указать причину');
    return;
  }

  try {
    const userId = localStorage.getItem('userId');
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users/${user.id}/balance`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: amountNum, reason }),
      }
    );

    const data = await response.json();

    if (data.success) {
      toast.success(`Баланс скорректирован на ${amountNum > 0 ? '+' : ''}${amountNum.toLocaleString('ru-RU')} ₽`);
      queryClient.invalidateQueries({ queryKey: ['users-optimized'] });
      if (onRefresh) onRefresh();
    } else {
      throw new Error(data.error || 'Failed to adjust balance');
    }
  } catch (error: any) {
    console.error('Adjust balance error:', error);
    toast.error('Ошибка корректировки баланса');
  }
}

/**
 * 🛡️ Установка статуса администратора
 */
export async function toggleAdmin(
  user: any,
  queryClient: any,
  onRefresh?: () => void
) {
  const action = user.isAdmin ? 'убрать' : 'добавить';
  if (!confirm(`${action.toUpperCase()} права администратора для ${user.имя}?`)) {
    return;
  }

  try {
    const userId = localStorage.getItem('userId');
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users/${user.id}/set-admin`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAdmin: !user.isAdmin }),
      }
    );

    const data = await response.json();

    if (data.success) {
      toast.success(`Права ${user.isAdmin ? 'убраны' : 'добавлены'}!`);
      queryClient.invalidateQueries({ queryKey: ['users-optimized'] });
      if (onRefresh) onRefresh();
    } else {
      throw new Error(data.error || 'Failed to toggle admin');
    }
  } catch (error: any) {
    console.error('Toggle admin error:', error);
    toast.error('Ошибка изменения прав');
  }
}

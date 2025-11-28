import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import * as api from '../../utils/api';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAllUsers, useInvalidateUsers } from '../../hooks/useAllUsers';

interface ManualSponsorAssignProps {
  currentUser: any;
  onSuccess?: () => void;
}

export function ManualSponsorAssign({ currentUser, onSuccess }: ManualSponsorAssignProps) {
  // 🚀 Используем общий хук для загрузки пользователей
  const { users, isLoading, refetch } = useAllUsers();
  const invalidateUsers = useInvalidateUsers();
  
  const [assigning, setAssigning] = useState(false);
  const [childId, setChildId] = useState('');
  const [sponsorId, setSponsorId] = useState('');

  const loading = isLoading || assigning;

  const findUser = (id: string) => {
    return users.find(u => u.id === id);
  };

  const handleAssign = async () => {
    if (!childId || !sponsorId) {
      toast.error('Укажите оба ID');
      return;
    }

    if (childId === sponsorId) {
      toast.error('ID не могут совпадать');
      return;
    }

    const child = findUser(childId);
    const sponsor = findUser(sponsorId);

    if (!child) {
      toast.error(`Пользователь ${childId} не найден`);
      return;
    }

    if (!sponsor) {
      toast.error(`Спонсор ${sponsorId} не найден`);
      return;
    }

    if (!confirm(
      `🔗 НАЗНАЧЕНИЕ СПОНСОРА\n\n` +
      `Ребёнок: ${childId} (${child.имя})\n` +
      `Спонсор: ${sponsorId} (${sponsor.имя})\n\n` +
      `Будет выполнено:\n` +
      `1. У ${childId} установится sponsorId = ${sponsorId}\n` +
      `2. ${childId} будет добавлен в команду ${sponsorId}\n\n` +
      `Продолжить?`
    )) {
      return;
    }

    try {
      setAssigning(true);

      // Update child: set sponsorId
      const updatedChild = { ...child, спонсорId: sponsorId };
      
      const childUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${childId}`;
      const childResponse = await fetch(childUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userData: updatedChild })
      });

      const childData = await childResponse.json();
      if (!childData.success) {
        throw new Error(childData.error || 'Failed to update child');
      }

      // Update sponsor: add to команда
      const updatedSponsor = { 
        ...sponsor, 
        команда: [...(sponsor.команда || []), childId]
      };
      
      const sponsorUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${sponsorId}`;
      const sponsorResponse = await fetch(sponsorUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userData: updatedSponsor })
      });

      const sponsorData = await sponsorResponse.json();
      if (!sponsorData.success) {
        throw new Error(sponsorData.error || 'Failed to update sponsor');
      }

      toast.success(`✅ Связь восстановлена!\n${childId} → ${sponsorId}`);
      setChildId('');
      setSponsorId('');
      
      // Инвалидируем кэш пользователей
      invalidateUsers();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Assign error:', error);
      toast.error('Ошибка назначения', {
        description: String(error)
      });
    } finally {
      setAssigning(false);
    }
  };

  const childUser = findUser(childId);
  const sponsorUser = findUser(sponsorId);

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#39B7FF]" />
          Ручное назначение спонсора
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[#666]">
          Используйте этот инструмент для восстановления потерянных связей между пользователями
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1E1E1E]">
              ID ребёнка (кому назначить спонсора)
            </label>
            <Input
              placeholder="Например: 005"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="font-mono"
            />
            {childUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <p className="text-xs text-blue-900">
                  ✓ <strong>{childUser.имя} {childUser.фамилия}</strong>
                </p>
                <p className="text-xs text-blue-700">
                  Текущий спонсор: {childUser.спонсорId || 'нет'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1E1E1E]">
              ID спонсора (кто будет спонсором)
            </label>
            <Input
              placeholder="Например: 002"
              value={sponsorId}
              onChange={(e) => setSponsorId(e.target.value)}
              className="font-mono"
            />
            {sponsorUser && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <p className="text-xs text-green-900">
                  ✓ <strong>{sponsorUser.имя} {sponsorUser.фамилия}</strong>
                </p>
                <p className="text-xs text-green-700">
                  В команде: {sponsorUser.команда?.length || 0} чел.
                </p>
              </div>
            )}
          </div>
        </div>

        {childUser && sponsorUser && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-900 font-medium mb-2">
              📋 Что будет сделано:
            </p>
            <div className="text-xs text-yellow-800 space-y-1">
              <p>
                1. У <strong>{childId}</strong> ({childUser.имя}) установится{' '}
                <code className="bg-yellow-100 px-1 rounded">sponsorId = {sponsorId}</code>
              </p>
              <p>
                2. <strong>{childId}</strong> будет добавлен в{' '}
                <code className="bg-yellow-100 px-1 rounded">команда</code> пользователя{' '}
                <strong>{sponsorId}</strong> ({sponsorUser.имя})
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleAssign}
          disabled={loading || !childId || !sponsorId || !childUser || !sponsorUser}
          className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white hover:opacity-90"
        >
          {loading ? 'Назначаю...' : 'Назначить спонсора'}
        </Button>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-700 font-medium mb-2">
            💡 Быстрые ссылки для восстановления:
          </p>
          <div className="space-y-1">
            <button
              onClick={() => {
                setChildId('005');
                setSponsorId('002');
              }}
              className="text-xs text-blue-600 hover:underline block"
            >
              → Восстановить связь: 005 (Эльза) → 002 (Елизавета)
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
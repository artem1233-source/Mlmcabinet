import { useState, useMemo } from 'react';
import { UserX, Users, ArrowRight, CheckSquare, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import * as api from '../../utils/api';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAllUsers, useInvalidateUsers } from '../../hooks/useAllUsers';

interface OrphanUsersManagerProps {
  currentUser: any;
  onSuccess?: () => void;
}

export function OrphanUsersManager({ currentUser, onSuccess }: OrphanUsersManagerProps) {
  // 🚀 Используем общий хук для загрузки пользователей
  const { users: allUsers, isLoading, refetch } = useAllUsers();
  const invalidateUsers = useInvalidateUsers();
  
  const [assigning, setAssigning] = useState(false);
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set());
  const [selectedSponsor, setSelectedSponsor] = useState<string>('');
  const [searchSponsor, setSearchSponsor] = useState('');

  // Фильтруем администраторов
  const isAdmin = (u: any) => {
    return u.isAdmin === true || 
           u.email?.toLowerCase() === 'admin@admin.com' || 
           u.id === 'ceo' || 
           u.id === '1';
  };

  // Мемоизируем фильтрацию пользователей
  const { users, orphans, sponsors } = useMemo(() => {
    const nonAdminUsers = allUsers.filter(u => !isAdmin(u));
    console.log(`📊 OrphanUsersManager: Filtered ${allUsers.length} total users to ${nonAdminUsers.length} non-admin users`);

    // Пользователи без спонсора (исключая админов)
    const orphanUsers = nonAdminUsers.filter((u: any) => !u.спонсорId);
    console.log(`📊 OrphanUsersManager: Found ${orphanUsers.length} orphan users (non-admin)`);

    return {
      users: nonAdminUsers,
      orphans: orphanUsers,
      sponsors: nonAdminUsers,
    };
  }, [allUsers]);

  const loading = isLoading || assigning;

  const toggleOrphan = (userId: string) => {
    const newSelected = new Set(selectedOrphans);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedOrphans(newSelected);
  };

  const toggleAll = () => {
    if (selectedOrphans.size === orphans.length) {
      setSelectedOrphans(new Set());
    } else {
      setSelectedOrphans(new Set(orphans.map(o => o.id)));
    }
  };

  const handleAssignSponsor = async (orphanId: string, sponsorId: string) => {
    const orphan = users.find(u => u.id === orphanId);
    const sponsor = users.find(u => u.id === sponsorId);

    if (!orphan || !sponsor) {
      toast.error('Пользователь не найден');
      return;
    }

    if (orphanId === sponsorId) {
      toast.error('Нельзя назначить пользователя спонсором самому себе');
      return;
    }

    try {
      // Update orphan: set sponsorId
      const updatedOrphan = { ...orphan, спонсорId: sponsorId };
      
      const orphanUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${orphanId}`;
      const orphanResponse = await fetch(orphanUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userData: updatedOrphan })
      });

      const orphanData = await orphanResponse.json();
      if (!orphanData.success) {
        throw new Error(orphanData.error || 'Failed to update orphan');
      }

      // Update sponsor: add to команда
      const updatedSponsor = { 
        ...sponsor, 
        команда: [...(sponsor.команда || []), orphanId]
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

      return true;
    } catch (error) {
      console.error('Assign error:', error);
      throw error;
    }
  };

  const handleBatchAssign = async () => {
    if (selectedOrphans.size === 0) {
      toast.error('Выберите хотя бы одного пользователя');
      return;
    }

    if (!selectedSponsor) {
      toast.error('Выберите спонсора');
      return;
    }

    const sponsor = users.find(u => u.id === selectedSponsor);
    if (!sponsor) {
      toast.error('Спонсор не найден');
      return;
    }

    const orphansList = Array.from(selectedOrphans).map(id => {
      const user = users.find(u => u.id === id);
      return user ? `${user.имя} ${user.фамилия} (${id})` : id;
    }).join('\n');

    if (!confirm(
      `🔗 МАССОВОЕ НАЗНАЧЕНИЕ СПОНСОРА\n\n` +
      `Будет назначен спонсор:\n${sponsor.имя} ${sponsor.фамилия} (${selectedSponsor})\n\n` +
      `Для пользователей (${selectedOrphans.size}):\n${orphansList}\n\n` +
      `Продолжить?`
    )) {
      return;
    }

    try {
      setAssigning(true);
      let successCount = 0;
      let errorCount = 0;

      for (const orphanId of Array.from(selectedOrphans)) {
        try {
          await handleAssignSponsor(orphanId, selectedSponsor);
          successCount++;
        } catch (error) {
          console.error(`Failed to assign sponsor for ${orphanId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`✅ Успешно назначено: ${successCount}`, {
          description: errorCount > 0 ? `Ошибок: ${errorCount}` : undefined
        });
      }

      if (errorCount > 0 && successCount === 0) {
        toast.error('Не удалось назначить спонсора');
      }

      setSelectedOrphans(new Set());
      setSelectedSponsor('');
      
      // Инвалидируем кэш пользователей
      invalidateUsers();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Batch assign error:', error);
      toast.error('Ошибка массового назначения');
    } finally {
      setAssigning(false);
    }
  };

  const handleSingleAssign = async (orphanId: string, sponsorId: string) => {
    const orphan = users.find(u => u.id === orphanId);
    const sponsor = users.find(u => u.id === sponsorId);

    if (!orphan || !sponsor) return;

    if (!confirm(
      `🔗 НАЗНАЧЕНИЕ СПОНСОРА\n\n` +
      `Пользователь: ${orphan.имя} ${orphan.фамилия} (${orphanId})\n` +
      `Спонсор: ${sponsor.имя} ${sponsor.фамилия} (${sponsorId})\n\n` +
      `Продолжить?`
    )) {
      return;
    }

    try {
      setAssigning(true);
      await handleAssignSponsor(orphanId, sponsorId);
      toast.success('✅ Спонсор назначен!');
      
      // Инвалидируем кэш пользователей
      invalidateUsers();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Single assign error:', error);
      toast.error('Ошибка назначения спонсора');
    } finally {
      setAssigning(false);
    }
  };

  const filteredSponsors = useMemo(() => {
    return sponsors.filter(s => {
      if (!searchSponsor) return true;
      return (
        s.имя?.toLowerCase().includes(searchSponsor.toLowerCase()) ||
        s.фамилия?.toLowerCase().includes(searchSponsor.toLowerCase()) ||
        s.id?.includes(searchSponsor) ||
        s.email?.toLowerCase().includes(searchSponsor.toLowerCase())
      );
    });
  }, [sponsors, searchSponsor]);

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
          <UserX className="w-5 h-5 text-orange-500" />
          Пользователи без спонсора
          {orphans.length > 0 && (
            <Badge className="bg-orange-100 text-orange-700">
              {orphans.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orphans.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <UserX className="w-12 h-12 text-green-600 mx-auto mb-3 opacity-50" />
            <p className="text-green-900 font-medium mb-1">Все в порядке!</p>
            <p className="text-sm text-green-700">Нет пользователей без спонсора</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Массовое назначение */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Массовое назначение спонсора
                  </p>
                  <p className="text-xs text-blue-700">
                    Выбрано: {selectedOrphans.size} из {orphans.length}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {selectedOrphans.size === orphans.length ? 'Снять все' : 'Выбрать все'}
                </Button>
              </div>

              {selectedOrphans.size > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-blue-900 mb-2 block">
                      Выберите спонсора для всех выбранных:
                    </label>
                    <Input
                      placeholder="Поиск спонсора по имени, ID, email..."
                      value={searchSponsor}
                      onChange={(e) => setSearchSponsor(e.target.value)}
                      className="mb-2"
                    />
                    <div className="max-h-40 overflow-y-auto border border-blue-200 rounded-lg bg-white">
                      {filteredSponsors.map(sponsor => (
                        <button
                          key={sponsor.id}
                          onClick={() => setSelectedSponsor(sponsor.id)}
                          className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-blue-100 last:border-b-0 ${
                            selectedSponsor === sponsor.id ? 'bg-blue-100' : ''
                          }`}
                          disabled={selectedOrphans.has(sponsor.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              selectedSponsor === sponsor.id ? 'bg-blue-600' : 'bg-gray-300'
                            }`} />
                            <span className="text-sm font-medium text-gray-900">
                              {sponsor.имя} {sponsor.фамилия}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {sponsor.id}
                            </Badge>
                            {selectedOrphans.has(sponsor.id) && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                В списке назначения
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 ml-4">{sponsor.email}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedSponsor && (
                    <Button
                      onClick={handleBatchAssign}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white hover:opacity-90"
                    >
                      {loading ? 'Назначаю...' : `Назначить спонсора для ${selectedOrphans.size} чел.`}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Список пользователей без спонсора */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Список пользователей без спонсора:
              </p>
              <div className="space-y-2">
                {orphans.map((orphan) => (
                  <div
                    key={orphan.id}
                    className={`border rounded-lg p-3 transition-all ${
                      selectedOrphans.has(orphan.id)
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleOrphan(orphan.id)}
                        className="mt-1 shrink-0"
                      >
                        {selectedOrphans.has(orphan.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-400 rounded-lg flex items-center justify-center text-white shrink-0">
                        <span className="font-semibold text-sm">
                          {orphan.имя?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {orphan.имя} {orphan.фамилия}
                          </p>
                          <Badge className="bg-orange-100 text-orange-700 text-xs">
                            {orphan.id}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{orphan.email}</p>
                        {orphan.команда && orphan.команда.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            В команде: {orphan.команда.length} чел.
                          </p>
                        )}
                      </div>

                      {/* Быстрое назначение для одного пользователя */}
                      <div className="shrink-0">
                        <select
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSingleAssign(orphan.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          disabled={loading}
                        >
                          <option value="">Назначить спонсора...</option>
                          {sponsors
                            .filter(s => s.id !== orphan.id)
                            .map(sponsor => (
                              <option key={sponsor.id} value={sponsor.id}>
                                {sponsor.имя} {sponsor.фамилия} ({sponsor.id})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-gray-700">
            💡 <strong>Как использовать:</strong> Отметьте галочками пользователей, которым нужен спонсор, 
            выберите спонсора из списка и нажмите кнопку для массового назначения. 
            Либо используйте выпадающий список справа от каждого пользователя для индивидуального назначения.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

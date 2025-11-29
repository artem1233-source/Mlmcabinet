import { useState, useMemo } from 'react';
import { Link, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import * as api from '../../utils/api';
import { useAllUsers, useInvalidateUsers } from '../../hooks/useAllUsers';

interface ManualLinkFixerProps {
  currentUser: any;
  onSuccess?: () => void;
}

export function ManualLinkFixer({ currentUser, onSuccess }: ManualLinkFixerProps) {
  // 🚀 Используем общий хук для загрузки пользователей
  const { users: allUsers, isLoading, refetch } = useAllUsers();
  const invalidateUsers = useInvalidateUsers();
  
  const [fixing, setFixing] = useState(false);

  // Мемоизируем анализ проблем - напрямую используем результат без useState
  const issues = useMemo(() => {
    if (!Array.isArray(allUsers)) {
      console.warn('⚠️ allUsers is not an array in ManualLinkFixer');
      return [];
    }
    
    const foundIssues: any[] = [];
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // Check for mismatched relationships
    for (const user of allUsers) {
      // Issue 1: User in команда but sponsorId doesn't match
      if (user.команда && Array.isArray(user.команда)) {
        for (const childId of user.команда) {
          const child = userMap.get(childId);
          if (child && child.спонсорId !== user.id) {
            foundIssues.push({
              type: 'mismatch',
              description: `${childId} (${child.имя}) в команде у ${user.id}, но sponsorId = ${child.спонсорId || 'null'}`,
              fix: {
                userId: childId,
                field: 'спонсорId',
                currentValue: child.спонсорId || 'null',
                correctValue: user.id
              }
            });
          }
        }
      }

      // Issue 2: User has sponsorId but not in sponsor's команда
      if (user.спонсорId) {
        const sponsor = userMap.get(user.спонсорId);
        if (sponsor) {
          const inTeam = sponsor.команда && sponsor.команда.includes(user.id);
          if (!inTeam) {
            foundIssues.push({
              type: 'missing_in_team',
              description: `${user.id} (${user.имя}) имеет sponsorId=${user.спонсорId}, но отсутствует в команде спонсора`,
              fix: {
                userId: user.спонсорId,
                field: 'команда',
                currentValue: sponsor.команда || [],
                correctValue: [...(sponsor.команда || []), user.id]
              }
            });
          }
        }
      }
      
      // 🆕 Issue 3: User registered recently but has no sponsor (suspicious)
      if (!user.спонсорId && user.зарегистрирован) {
        const regDate = new Date(user.зарегистрирован);
        const daysSinceReg = (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // If registered less than 30 days ago and no sponsor - might be orphaned
        if (daysSinceReg < 30) {
          // Find who might have referred them by checking all users' команды
          let possibleSponsors: string[] = [];
          for (const [userId, u] of userMap) {
            if (u.команда && u.команда.includes(user.id)) {
              possibleSponsors.push(userId);
            }
          }
          
          if (possibleSponsors.length > 0) {
            foundIssues.push({
              type: 'orphaned_user',
              description: `${user.id} (${user.имя}) НЕ ИМЕЕТ СПОНСОРА, но находится в команде у: ${possibleSponsors.join(', ')}`,
              fix: {
                userId: user.id,
                field: 'спонсорId',
                currentValue: 'null',
                correctValue: possibleSponsors[0], // Take first found sponsor
                possibleSponsors: possibleSponsors
              }
            });
          }
        }
      }
    }

    return foundIssues;
  }, [allUsers]);

  const fixIssue = async (issue: any) => {
    try {
      setFixing(true);
      
      const user = allUsers.find(u => u.id === issue.fix.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update the field
      const updatedUser = { ...user };
      updatedUser[issue.fix.field] = issue.fix.correctValue;

      // Save via API
      const response = await api.updateUser(issue.fix.userId, updatedUser);
      
      if (response.success) {
        toast.success('Связь исправлена!');
        
        // Инвалидируем кэш пользователей
        invalidateUsers();
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(response.error || 'Failed to fix');
      }
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Ошибка исправления', {
        description: String(error)
      });
    } finally {
      setFixing(false);
    }
  };

  const loading = isLoading || fixing;

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
          <Link className="w-5 h-5 text-[#39B7FF]" />
          Диагностика связей
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#666]">
            Автоматический поиск несоответствий в структуре команды
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Обновить'}
          </Button>
        </div>

        {/* 🆕 DEBUG INFO */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-700 font-medium mb-2">🔍 Отладочная информация:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Всего пользователей загружено: <strong>{allUsers.length}</strong></p>
            <p>Найдено проблем: <strong>{issues.length}</strong></p>
            {allUsers.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600 hover:underline">
                  Показать всех пользователей и их связи
                </summary>
                <div className="mt-2 space-y-1 max-h-64 overflow-y-auto bg-white p-2 rounded border">
                  {allUsers.map(u => (
                    <div key={u.id} className="text-xs border-b pb-1">
                      <strong>{u.id}</strong> ({u.имя}): 
                      sponsorId=<span className={!u.спонсорId ? 'text-red-600 font-bold' : 'text-green-600'}>{u.спонсорId || 'NULL'}</span>,
                      команда=[{u.команда?.join(', ') || 'пусто'}]
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        {issues.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-green-900 font-medium">
                  Все связи в порядке!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Несоответствий не обнаружено. Структура команды корректна.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-900">
                  Обнаружено {issues.length} несоответствий в структуре команды
                </p>
              </div>
            </div>

            {issues.map((issue, index) => (
              <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-orange-900 font-medium mb-2">
                      {issue.description}
                    </p>
                    <div className="text-xs text-orange-700 space-y-1">
                      <p>
                        <span className="font-medium">Поле:</span> {issue.fix.field}
                      </p>
                      <p>
                        <span className="font-medium">Сейчас:</span>{' '}
                        {Array.isArray(issue.fix.currentValue) 
                          ? `[${issue.fix.currentValue.join(', ')}]`
                          : issue.fix.currentValue}
                      </p>
                      <p>
                        <span className="font-medium">Должно быть:</span>{' '}
                        {Array.isArray(issue.fix.correctValue)
                          ? `[${issue.fix.correctValue.join(', ')}]`
                          : issue.fix.correctValue}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => fixIssue(issue)}
                    disabled={loading}
                    className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white hover:opacity-90 shrink-0"
                  >
                    {loading ? 'Исправляю...' : 'Исправить'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-900">
            💡 <strong>Подсказка:</strong> Эта функция автоматически находит несоответствия между массивами <code className="bg-blue-100 px-1 rounded">команда</code> и полями <code className="bg-blue-100 px-1 rounded">спонсорId</code> и предлагает исправления.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
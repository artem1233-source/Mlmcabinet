import { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  Wrench,
  Database,
  Users,
  Link,
  XCircle,
  Info,
  Zap,
  UserCog,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { useAllUsers, useInvalidateUsers } from '../../hooks/useAllUsers';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Input } from '../ui/input';

interface DataRecoveryToolProps {
  currentUser: any;
  onSuccess?: () => void;
}

interface Issue {
  type: 'orphan' | 'broken_sponsor' | 'broken_team' | 'missing_user' | 'duplicate';
  severity: 'critical' | 'high' | 'medium' | 'low';
  userId: string;
  userName: string;
  description: string;
  details: any;
  fix?: () => Promise<void>;
}

export function DataRecoveryTool({ currentUser, onSuccess }: DataRecoveryToolProps) {
  const { users: allUsers, isLoading, refetch } = useAllUsers();
  const invalidateUsers = useInvalidateUsers();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [fixedIssues, setFixedIssues] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  // 🆕 Состояние для модального окна назначения спонсора
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [selectedOrphan, setSelectedOrphan] = useState<any>(null);
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [sponsorSearchResults, setSponsorSearchResults] = useState<any[]>([]);
  const [selectedSponsor, setSelectedSponsor] = useState<any>(null);
  const [isSearchingSponsors, setIsSearchingSponsors] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Функция для поиска спонсоров
  const searchSponsors = async (query: string) => {
    if (!query.trim()) return [];
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/user001/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search sponsors error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error searching sponsors:', error);
      toast.error('Ошибка поиска спонсоров');
      return [];
    }
  };

  // Функция для назначения спонсора
  const assignSponsor = async () => {
    if (!selectedOrphan || !selectedSponsor) {
      toast.error('Выберите пользователя и спонсора');
      return;
    }

    if (selectedOrphan.id === selectedSponsor.id) {
      toast.error('Пользователь не может быть своим спонсором');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/user001/assign-sponsor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: selectedOrphan.id,
            sponsorId: selectedSponsor.id
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Assign sponsor error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      toast.success(`Спонсор успешно назначен: ${selectedOrphan.имя} → ${selectedSponsor.имя}`);
      
      // Помечаем проблему как исправленную
      markAsFixed({ type: 'orphan', userId: selectedOrphan.id } as Issue);
      
      // Закрываем модальное окно и сбрасываем состояние
      setShowSponsorModal(false);
      setSelectedOrphan(null);
      setSelectedSponsor(null);
      setSponsorSearch('');
      setSponsorSearchResults([]);
      
      // Перезагружаем данные
      invalidateUsers();
      await refetch();
      
      // Запускаем повторный анализ
      await analyzeData();
    } catch (error) {
      console.error('Error assigning sponsor:', error);
      toast.error('Ошибка при назначении спонсора');
    } finally {
      setIsAssigning(false);
    }
  };

  // Обработчик поиска спонсоров
  useEffect(() => {
    if (sponsorSearch.trim()) {
      setIsSearchingSponsors(true);
      searchSponsors(sponsorSearch).then(results => {
        setSponsorSearchResults(results);
        setIsSearchingSponsors(false);
      });
    } else {
      setSponsorSearchResults([]);
    }
  }, [sponsorSearch]);

  // 🔍 Анализ данных и поиск поблем
  const analyzeData = async () => {
    setAnalyzing(true);
    const foundIssues: Issue[] = [];

    try {
      console.log('🔍 Starting data analysis...');
      console.log(`📊 Total users loaded: ${allUsers.length}`);

      // Создаём карту пользователей для быстрого доступа
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      // Множество всех существующих ID
      const existingIds = new Set(allUsers.map(u => u.id));

      // 🔍 ПРОВЕРКА 1: Поиск пользователей без спонсора (кроме админов и CEO)
      console.log('🔍 Checking for orphan users...');
      for (const user of allUsers) {
        // Пропускаем админов и CEO
        if (user.isAdmin || user.id === 'ceo' || user.id === '1') {
          continue;
        }

        if (!user.спонсорId) {
          foundIssues.push({
            type: 'orphan',
            severity: 'high',
            userId: user.id,
            userName: `${user.имя} ${user.фамилия}`,
            description: `Пользователь без спонсора`,
            details: {
              registered: user.зарегистрирован,
              hasTeam: user.команда?.length > 0,
              teamSize: user.команда?.length || 0
            }
          });
        }
      }

      // 🔍 ПРОВЕРКА 2: Ссылки на несуществующих спонсоров
      console.log('🔍 Checking for broken sponsor references...');
      for (const user of allUsers) {
        if (user.спонсорId && !existingIds.has(user.спонсорId)) {
          foundIssues.push({
            type: 'broken_sponsor',
            severity: 'critical',
            userId: user.id,
            userName: `${user.имя} ${user.фамилия}`,
            description: `Ссылка на несуществующего спонсора: ${user.спонсорId}`,
            details: {
              brokenSponsorId: user.спонсорId,
              // Поиск похожих ID (возможно изменённых)
              similarIds: allUsers
                .filter(u => {
                  const id = u.id;
                  const broken = user.спонсорId;
                  // Ищем ID с похожими цифрами
                  return id.includes(broken.replace(/^0+/, '')) || 
                         broken.includes(id.replace(/^0+/, ''));
                })
                .map(u => ({ id: u.id, name: `${u.имя} ${u.фамилия}` }))
                .slice(0, 5)
            }
          });
        }
      }

      // 🔍 ПРОВЕРКА 3: Несоответствия в команде
      console.log('🔍 Checking team consistency...');
      for (const user of allUsers) {
        if (user.команда && Array.isArray(user.команда)) {
          for (const childId of user.команда) {
            const child = userMap.get(childId);
            
            if (!child) {
              // Ребёнок не существует
              foundIssues.push({
                type: 'missing_user',
                severity: 'high',
                userId: user.id,
                userName: `${user.имя} ${user.фамилия}`,
                description: `В команде ссылка на несуществующего пользователя: ${childId}`,
                details: {
                  missingChildId: childId,
                  currentTeam: user.команда
                }
              });
            } else if (child.спонсорId !== user.id) {
              // Ребёнок существует, но его sponsorId не совпадает
              foundIssues.push({
                type: 'broken_team',
                severity: 'high',
                userId: child.id,
                userName: `${child.имя} ${child.фамилия}`,
                description: `В команде у ${user.id}, но sponsorId = ${child.спонсорId || 'NULL'}`,
                details: {
                  parentId: user.id,
                  parentName: `${user.имя} ${user.фамилия}`,
                  currentSponsorId: child.спонсорId || 'NULL',
                  shouldBeSponsorId: user.id
                }
              });
            }
          }
        }
      }

      // 🔍 ПРОВЕРКА 4: Пользователи с sponsorId, но отсутствующие в команде спонсора
      console.log('🔍 Checking sponsor-team consistency...');
      for (const user of allUsers) {
        if (user.спонсорId && existingIds.has(user.спонсорId)) {
          const sponsor = userMap.get(user.спонсорId);
          if (sponsor && (!sponsor.команда || !sponsor.команда.includes(user.id))) {
            foundIssues.push({
              type: 'broken_team',
              severity: 'medium',
              userId: user.id,
              userName: `${user.имя} ${user.фамилия}`,
              description: `Имеет sponsorId=${user.спонсорId}, но отсутствует в его команде`,
              details: {
                sponsorId: user.спонсорId,
                sponsorName: `${sponsor.имя} ${sponsor.фамилия}`,
                sponsorTeam: sponsor.команда || []
              }
            });
          }
        }
      }

      // 🔍 ПРОВЕРКА 5: Дубликаты ID (не должно быть, но проверим)
      console.log('🔍 Checking for duplicate IDs...');
      const idCounts = new Map<string, number>();
      for (const user of allUsers) {
        idCounts.set(user.id, (idCounts.get(user.id) || 0) + 1);
      }
      for (const [id, count] of idCounts) {
        if (count > 1) {
          foundIssues.push({
            type: 'duplicate',
            severity: 'critical',
            userId: id,
            userName: 'ДУБЛИКАТ',
            description: `Обнаружено ${count} пользователей с ID ${id}`,
            details: { count }
          });
        }
      }

      console.log(`✅ Analysis complete. Found ${foundIssues.length} issues`);
      
      // Сортируем по серьёзности
      foundIssues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      setIssues(foundIssues);

      if (foundIssues.length === 0) {
        toast.success('🎉 Проблем не обнаружено! Все связи в порядке.');
      } else {
        toast.warning(`⚠️ Обнаружено ${foundIssues.length} проблем`, {
          description: `Критических: ${foundIssues.filter(i => i.severity === 'critical').length}`
        });
      }

    } catch (error) {
      console.error('Error analyzing data:', error);
      toast.error('Ошибка анализа данных');
    } finally {
      setAnalyzing(false);
    }
  };

  // 🔧 Исправление конкретной проблемы
  const fixIssue = async (issue: Issue) => {
    try {
      setFixing(true);
      console.log(`🔧 Fixing issue for user ${issue.userId}:`, issue);

      switch (issue.type) {
        case 'broken_sponsor':
          // Пользователь ссылается на несуществующего спонсора
          // Предлагаем убрать sponsorId (сделать orphan) или назначить нового
          if (issue.details.similarIds && issue.details.similarIds.length > 0) {
            const suggested = issue.details.similarIds[0];
            if (confirm(
              `🔧 ИСПРАВЛЕНИЕ СЛОМАННОЙ ССЫЛКИ\n\n` +
              `Пользователь: ${issue.userName} (${issue.userId})\n` +
              `Ссылается на несуществующего: ${issue.details.brokenSponsorId}\n\n` +
              `Найден похожий пользователь:\n${suggested.name} (${suggested.id})\n\n` +
              `Назначить его спонсором?`
            )) {
              await updateUserSponsor(issue.userId, suggested.id);
              markAsFixed(issue);
              toast.success(`Исправлено: ${issue.userId} → sponsorId=${suggested.id}`);
            }
          } else {
            if (confirm(
              `🔧 ИСПРАВЛЕНИЕ СЛОМАННОЙ ССЫЛКИ\n\n` +
              `Пользователь: ${issue.userName} (${issue.userId})\n` +
              `Ссылается на несуществующего: ${issue.details.brokenSponsorId}\n\n` +
              `Похожих пользователей не найдено.\n` +
              `Убрать sponsorId (сделать orphan)?`
            )) {
              await updateUserSponsor(issue.userId, null);
              markAsFixed(issue);
              toast.success(`Исправлено: убран sponsorId у ${issue.userId}`);
            }
          }
          break;

        case 'broken_team':
          // Несоответствие между sponsorId и командой
          if (issue.details.shouldBeSponsorId) {
            // Пользователь в команде, но sponsorId не совпадает
            if (confirm(
              `🔧 ИСПРАВЛЕНИЕ НЕСООТВЕТСТВИЯ\n\n` +
              `Пользователь: ${issue.userName} (${issue.userId})\n` +
              `В команде у: ${issue.details.parentName} (${issue.details.parentId})\n` +
              `Но sponsorId = ${issue.details.currentSponsorId}\n\n` +
              `Установить sponsorId = ${issue.details.shouldBeSponsorId}?`
            )) {
              await updateUserSponsor(issue.userId, issue.details.shouldBeSponsorId);
              markAsFixed(issue);
              toast.success(`Исправлено: sponsorId обновлён`);
            }
          } else if (issue.details.sponsorId) {
            // Пользователь имеет sponsorId, но отсутствует в его команде
            if (confirm(
              `🔧 ИСПРАВЛЕНИЕ НЕСООТВЕТСТВИЯ\n\n` +
              `Пользователь: ${issue.userName} (${issue.userId})\n` +
              `Имеет sponsorId=${issue.details.sponsorId}\n` +
              `Но отсутствует в команде спонсора\n\n` +
              `Добавить в команду?`
            )) {
              await addToSponsorTeam(issue.userId, issue.details.sponsorId);
              markAsFixed(issue);
              toast.success(`Исправлено: добавлен в команду`);
            }
          }
          break;

        case 'missing_user':
          // В команде ссылка на несуществующего пользователя
          if (confirm(
            `🔧 УДАЛЕНИЕ СЛОМАННОЙ ССЫЛКИ\n\n` +
            `Пользователь: ${issue.userName} (${issue.userId})\n` +
            `В команде ссылка на несуществующего: ${issue.details.missingChildId}\n\n` +
            `Удалить эту ссылку из команды?`
          )) {
            await removeFromTeam(issue.userId, issue.details.missingChildId);
            markAsFixed(issue);
            toast.success(`Исправлено: удалена ссылка`);
          }
          break;

        case 'orphan':
          // Пользователь без спонсора - открываем модальное окно для назначения
          const orphanUser = allUsers.find(u => u.id === issue.userId);
          if (orphanUser) {
            setSelectedOrphan(orphanUser);
            setShowSponsorModal(true);
          } else {
            toast.error('Пользователь не найден');
          }
          break;

        default:
          toast.warning('Этот тип проблемы требует ручного исправления');
      }

    } catch (error) {
      console.error('Error fixing issue:', error);
      toast.error('Ошибка исправления');
    } finally {
      setFixing(false);
    }
  };

  // Вспомогательные функции для исправления
  const updateUserSponsor = async (userId: string, newSponsorId: string | null) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, спонсорId: newSponsorId };
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify({ userData: updatedUser })
      }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to update');
    
    invalidateUsers();
  };

  const addToSponsorTeam = async (userId: string, sponsorId: string) => {
    const sponsor = allUsers.find(u => u.id === sponsorId);
    if (!sponsor) throw new Error('Sponsor not found');

    const updatedSponsor = {
      ...sponsor,
      команда: [...(sponsor.команда || []), userId]
    };

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${sponsorId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify({ userData: updatedSponsor })
      }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to update');
    
    invalidateUsers();
  };

  const removeFromTeam = async (userId: string, childIdToRemove: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const updatedUser = {
      ...user,
      команда: (user.команда || []).filter(id => id !== childIdToRemove)
    };

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify({ userData: updatedUser })
      }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to update');
    
    invalidateUsers();
  };

  const markAsFixed = (issue: Issue) => {
    setFixedIssues(prev => new Set([...prev, `${issue.type}-${issue.userId}`]));
  };

  const isFixed = (issue: Issue) => {
    return fixedIssues.has(`${issue.type}-${issue.userId}`);
  };

  // 🔧 Автоматическое исправление всех безопасных проблем
  const fixAllSafe = async () => {
    const safeIssues = issues.filter(i => 
      i.type === 'missing_user' || 
      (i.type === 'broken_team' && i.details.shouldBeSponsorId)
    );

    if (safeIssues.length === 0) {
      toast.info('Нет проблем для автоматического исправления');
      return;
    }

    if (!confirm(
      `🤖 АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ\n\n` +
      `Будет автоматически исправлено ${safeIssues.length} проблем:\n` +
      `- Удаление сломанных ссылок\n` +
      `- Синхронизация sponsorId с командой\n\n` +
      `Продолжить?`
    )) {
      return;
    }

    setFixing(true);
    let fixed = 0;
    let failed = 0;

    try {
      for (const issue of safeIssues) {
        try {
          if (issue.type === 'missing_user') {
            await removeFromTeam(issue.userId, issue.details.missingChildId);
          } else if (issue.type === 'broken_team' && issue.details.shouldBeSponsorId) {
            await updateUserSponsor(issue.userId, issue.details.shouldBeSponsorId);
          }
          markAsFixed(issue);
          fixed++;
        } catch (error) {
          console.error(`Failed to fix issue for ${issue.userId}:`, error);
          failed++;
        }
      }

      if (fixed > 0) {
        toast.success(`✅ Исправлено: ${fixed} проблем`, {
          description: failed > 0 ? `Ошибок: ${failed}` : undefined
        });
        
        // Перезагружаем данные и анализируем снова
        await refetch();
        await analyzeData();
      }

    } finally {
      setFixing(false);
    }
  };

  // Статистика по типам проблем
  const stats = useMemo(() => {
    const bySeverity = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    };

    const byType = {
      orphan: issues.filter(i => i.type === 'orphan').length,
      broken_sponsor: issues.filter(i => i.type === 'broken_sponsor').length,
      broken_team: issues.filter(i => i.type === 'broken_team').length,
      missing_user: issues.filter(i => i.type === 'missing_user').length,
      duplicate: issues.filter(i => i.type === 'duplicate').length,
    };

    return { bySeverity, byType };
  }, [issues]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600 text-white">Критично</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">Высокая</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Средняя</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 text-white">Низкая</Badge>;
      default:
        return <Badge>Неизвестно</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'orphan':
        return <Users className="w-4 h-4" />;
      case 'broken_sponsor':
        return <XCircle className="w-4 h-4" />;
      case 'broken_team':
        return <Link className="w-4 h-4" />;
      case 'missing_user':
        return <AlertTriangle className="w-4 h-4" />;
      case 'duplicate':
        return <Database className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-[#1E1E1E]">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <span>Восстановление данных</span>
          {issues.length > 0 && (
            <Badge className="bg-red-100 text-red-700">
              {issues.length} проблем
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Описание */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-2">
                🔍 Что делает этот инструмент:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Анализирует все связи между пользователями</li>
                <li>Находит сломанные ссылки и несоответствия</li>
                <li>Предлагает автоматическое исправление</li>
                <li>Восстанавливает структуру дерева команды</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex gap-3">
          <Button
            onClick={analyzeData}
            disabled={analyzing || isLoading}
            className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white hover:opacity-90"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Анализирую...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Начать анализ
              </>
            )}
          </Button>

          {issues.length > 0 && (
            <>
              <Button
                onClick={fixAllSafe}
                disabled={fixing}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                {fixing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Исправляю...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Автоисправление
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowDetails(!showDetails)}
                variant="outline"
                size="sm"
              >
                {showDetails ? 'Скрыть детали' : 'Показать детали'}
              </Button>
            </>
          )}
        </div>

        {/* Статистика */}
        {issues.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-700">{stats.bySeverity.critical}</div>
              <div className="text-xs text-red-600">Критичных</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-700">{stats.bySeverity.high}</div>
              <div className="text-xs text-orange-600">Высоких</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-700">{stats.bySeverity.medium}</div>
              <div className="text-xs text-yellow-600">Средних</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-700">{stats.bySeverity.low}</div>
              <div className="text-xs text-blue-600">Низких</div>
            </div>
          </div>
        )}

        {/* Список проблем */}
        {issues.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-[#1E1E1E]">Обнаруженные проблемы:</h3>
            
            {issues.map((issue, index) => (
              <div
                key={`${issue.type}-${issue.userId}-${index}`}
                className={`border rounded-lg p-4 transition-all ${
                  isFixed(issue)
                    ? 'border-green-300 bg-green-50 opacity-60'
                    : issue.severity === 'critical'
                    ? 'border-red-300 bg-red-50'
                    : issue.severity === 'high'
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-yellow-300 bg-yellow-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${
                    isFixed(issue) ? 'text-green-600' : 
                    issue.severity === 'critical' ? 'text-red-600' :
                    issue.severity === 'high' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>
                    {isFixed(issue) ? <CheckCircle2 className="w-5 h-5" /> : getTypeIcon(issue.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {issue.userName} ({issue.userId})
                      </span>
                      {getSeverityBadge(issue.severity)}
                      {isFixed(issue) && (
                        <Badge className="bg-green-100 text-green-700">Исправлено</Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-2">{issue.description}</p>

                    {showDetails && issue.details && (
                      <div className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-600 font-mono mb-2">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(issue.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {!isFixed(issue) && (
                      <Button
                        size="sm"
                        onClick={() => fixIssue(issue)}
                        disabled={fixing}
                        className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white hover:opacity-90"
                      >
                        {fixing ? 'Исправляю...' : 'Исправить'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Успешное сообщение */}
        {!analyzing && issues.length === 0 && !isLoading && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4 opacity-50" />
            <p className="text-green-900 font-medium mb-2">Всё в порядке!</p>
            <p className="text-sm text-green-700">
              Проблем не обнаружено. Все связи корректны.
            </p>
          </div>
        )}

        {/* Подсказка */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-700">
            💡 <strong>Совет:</strong> Запускайте анализ после любых массовых операций 
            (изменение ID, импорт пользователей, восстановление из бэкапа) для проверки целостности данных.
          </p>
        </div>
      </CardContent>

      {/* 🆕 Модальное окно назначения спонсора */}
      {showSponsorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <UserCog className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1E1E1E]">Назначение спонсора</h3>
                    <p className="text-sm text-[#666]">
                      {selectedOrphan?.имя} {selectedOrphan?.фамилия} (ID: {selectedOrphan?.id})
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSponsorModal(false);
                    setSelectedOrphan(null);
                    setSelectedSponsor(null);
                    setSponsorSearch('');
                    setSponsorSearchResults([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Информация о пользователе */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {selectedOrphan?.имя?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1E1E1E]">
                      {selectedOrphan?.имя} {selectedOrphan?.фамилия}
                    </p>
                    <p className="text-sm text-[#666]">{selectedOrphan?.email}</p>
                    <p className="text-xs text-orange-700 mt-2">
                      ⚠️ У этого пользователя отсутствует спонсор
                    </p>
                  </div>
                </div>
              </div>

              {/* Поиск спонсора */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-[#1E1E1E]">
                  Найдите и выберите спонсора
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                  <Input
                    placeholder="Поиск по имени, email, ID, рефкоду..."
                    value={sponsorSearch}
                    onChange={(e) => setSponsorSearch(e.target.value)}
                    className="pl-10 border-[#E6E9EE] rounded-xl"
                  />
                </div>
                
                {isSearchingSponsors && (
                  <div className="p-4 bg-white rounded-xl border-2 border-green-500">
                    <div className="flex items-center gap-2 text-sm text-[#666]">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Поиск...
                    </div>
                  </div>
                )}
                
                {sponsorSearchResults.length > 0 && !isSearchingSponsors && (
                  <div className="p-4 bg-white rounded-xl border-2 border-green-500 max-h-60 overflow-y-auto space-y-2">
                    {sponsorSearchResults.map(user => (
                      <div 
                        key={user.id} 
                        className={`flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-3 rounded-lg transition-colors ${
                          selectedSponsor?.id === user.id ? 'bg-green-100 border-2 border-green-500' : ''
                        }`}
                        onClick={() => setSelectedSponsor(user)}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {user.имя?.[0] || 'S'}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[#1E1E1E]">{user.имя} {user.фамилия}</p>
                          <p className="text-sm text-[#666]">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-[#666]">ID: {user.id}</p>
                            {user.рефКод && (
                              <p className="text-xs text-[#666]">• Рефкод: {user.рефКод}</p>
                            )}
                          </div>
                        </div>
                        {selectedSponsor?.id === user.id && (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {sponsorSearchResults.length === 0 && sponsorSearch.trim() && !isSearchingSponsors && (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-sm text-[#666]">
                    Пользователи не найдены. Попробуйте другой запрос.
                  </div>
                )}

                {selectedSponsor && (
                  <div className="p-4 bg-white rounded-xl border-2 border-green-500">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {selectedSponsor.имя?.[0] || 'S'}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#1E1E1E]">{selectedSponsor.имя} {selectedSponsor.фамилия}</p>
                        <p className="text-sm text-[#666]">{selectedSponsor.email}</p>
                        <p className="text-xs text-[#666]">ID: {selectedSponsor.id}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-800">
                        ✓ Уровень {selectedSponsor.уровень || 1} • Команда: {selectedSponsor.команда?.length || 0} чел.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Предпросмотр назначения */}
              {selectedSponsor && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Предпросмотр</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <span className="font-semibold text-[#1E1E1E]">
                      {selectedOrphan?.имя} ({selectedOrphan?.id})
                    </span>
                    <span className="text-[#666]">→</span>
                    <span className="font-semibold text-green-600">
                      {selectedSponsor?.имя} ({selectedSponsor?.id})
                    </span>
                  </div>
                </div>
              )}

              {/* Предупреждение */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">⚠️ Важно</p>
                    <p>
                      Назначение спонсора изменяет структуру MLM-сети. 
                      Убедитесь, что выбран правильный спонсор. Операция будет залогирована.
                    </p>
                  </div>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowSponsorModal(false);
                    setSelectedOrphan(null);
                    setSelectedSponsor(null);
                    setSponsorSearch('');
                    setSponsorSearchResults([]);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={assignSponsor}
                  disabled={!selectedSponsor || isAssigning}
                  className="flex-1 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white gap-2"
                >
                  {isAssigning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Назначение...
                    </>
                  ) : (
                    <>
                      <UserCog className="w-4 h-4" />
                      Назначить спонсора
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
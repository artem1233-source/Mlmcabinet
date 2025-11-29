/**
 * 🧠 УМНОЕ ВОССТАНОВЛЕНИЕ СВЯЗЕЙ
 * Автоматически находит родителя по пригласительКод
 */

import { useState } from 'react';
import { Lightbulb, UserX, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAllUsers, useInvalidateUsers } from '../../hooks/useAllUsers';

interface SmartOrphanFixerProps {
  currentUser: any;
  onSuccess?: () => void;
}

interface OrphanAnalysis {
  orphan: any;
  suggestedSponsor: any | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  hasChildren: boolean;
  childrenCount: number;
}

export function SmartOrphanFixer({ currentUser, onSuccess }: SmartOrphanFixerProps) {
  const { users: allUsers, isLoading } = useAllUsers();
  const invalidateUsers = useInvalidateUsers();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [analyses, setAnalyses] = useState<OrphanAnalysis[]>([]);

  // Фильтр админов
  const isAdmin = (u: any) => {
    return u.isAdmin === true || 
           u.email?.toLowerCase() === 'admin@admin.com' || 
           u.id === 'ceo' || 
           u.id === '1';
  };

  const users = allUsers.filter(u => !isAdmin(u));

  // 🧠 АНАЛИЗ: Поиск родителя по пригласительКод
  const analyzeOrphans = () => {
    setAnalyzing(true);
    
    try {
      // Находим всех orphans (исключаем корневого пользователя ID: 001)
      const orphans = users.filter(u => !u.спонсорId && u.id !== '001');
      
      console.log(`🔍 Найдено ${orphans.length} пользователей без спонсора`);
      
      if (orphans.length === 0) {
        toast.success('✅ Все пользователи имеют спонсора!');
        setAnalyses([]);
        return;
      }
      
      // Создаём Map для быстрого поиска по рефКод
      const refCodeMap = new Map<string, any>();
      users.forEach(u => {
        if (u.рефКод) {
          refCodeMap.set(u.рефКод, u);
        }
      });
      
      // Анализируем каждого orphan
      const results: OrphanAnalysis[] = orphans.map(orphan => {
        let suggestedSponsor = null;
        let confidence: 'high' | 'medium' | 'low' = 'low';
        let reason = 'Не удалось определить спонсора';
        
        // 🎯 МЕТОД 1: По пригласительКод (высокая точность)
        if (orphan.пригласительКод) {
          const sponsor = refCodeMap.get(orphan.пригласительКод);
          
          if (sponsor) {
            suggestedSponsor = sponsor;
            confidence = 'high';
            reason = `Найден по пригласительКод: "${orphan.пригласительКод}" = рефКод спонсора`;
          } else {
            reason = `Пригласительный код "${orphan.пригласительКод}" не найден среди активных пользователей`;
            confidence = 'low';
          }
        } else {
          reason = 'Отсутствует поле пригласительКод';
          confidence = 'low';
        }
        
        // Проверяем, есть ли у orphan дети
        const hasChildren = orphan.команда && orphan.команда.length > 0;
        const childrenCount = orphan.команда?.length || 0;
        
        return {
          orphan,
          suggestedSponsor,
          confidence,
          reason,
          hasChildren,
          childrenCount,
        };
      });
      
      // Сортируем: сначала с высокой уверенностью и с детьми
      results.sort((a, b) => {
        // Приоритет 1: Наличие детей (критично!)
        if (a.hasChildren && !b.hasChildren) return -1;
        if (!a.hasChildren && b.hasChildren) return 1;
        
        // Приоритет 2: Уверенность
        const confOrder = { high: 0, medium: 1, low: 2 };
        return confOrder[a.confidence] - confOrder[b.confidence];
      });
      
      setAnalyses(results);
      
      const highConfidence = results.filter(r => r.confidence === 'high').length;
      const withChildren = results.filter(r => r.hasChildren).length;
      
      toast.success(`📊 Анализ завершён`, {
        description: `Найдено: ${results.length} orphans, ${highConfidence} с высокой точностью, ${withChildren} имеют детей`
      });
      
      console.log('📊 Результаты анализа:', results);
      
    } catch (error) {
      console.error('Analyze error:', error);
      toast.error('Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  // 🔧 ИСПРАВЛЕНИЕ: Назначить спонсора
  const fixOrphan = async (analysis: OrphanAnalysis) => {
    if (!analysis.suggestedSponsor) {
      toast.error('Нет предложенного спонсора');
      return;
    }
    
    const { orphan, suggestedSponsor } = analysis;
    
    const confirmation = confirm(
      `🔗 НАЗНАЧИТЬ СПОНСОРА\n\n` +
      `Пользователь: ${orphan.имя} ${orphan.фамилия} (ID: ${orphan.id})\n` +
      (analysis.hasChildren ? `⚠️ ВНИМАНИЕ: У пользователя ${analysis.childrenCount} детей!\n` : '') +
      `\nСпонсор: ${suggestedSponsor.имя} ${suggestedSponsor.фамилия} (ID: ${suggestedSponsor.id})\n` +
      `Уверенность: ${analysis.confidence === 'high' ? '✅ ВЫСОКАЯ' : analysis.confidence === 'medium' ? '⚠️ СРЕДНЯЯ' : '❌ НИЗКАЯ'}\n` +
      `Причина: ${analysis.reason}\n\n` +
      `Продолжить?`
    );
    
    if (!confirmation) return;
    
    setFixing(true);
    const toastId = toast.loading(`Назначаем спонсора для ${orphan.имя} ${orphan.фамилия}...`);
    
    try {
      // 1. Обновляем orphan: устанавливаем sponsorId
      const updatedOrphan = { ...orphan, спонсорId: suggestedSponsor.id };
      
      const orphanUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${orphan.id}`;
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
      
      // 2. Обновляем sponsor: добавляем в команду
      const updatedSponsor = {
        ...suggestedSponsor,
        команда: [...(suggestedSponsor.команда || []), orphan.id]
      };
      
      const sponsorUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${suggestedSponsor.id}`;
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
      
      toast.success(`✅ Связь восстановлена!`, {
        id: toastId,
        description: `${orphan.имя} → ${suggestedSponsor.имя}`
      });
      
      // Убираем из списка
      setAnalyses(prev => prev.filter(a => a.orphan.id !== orphan.id));
      
      // Обновляем данные
      invalidateUsers();
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Ошибка назначения спонсора', { id: toastId });
    } finally {
      setFixing(false);
    }
  };

  // 🚀 МАССОВОЕ ИСПРАВЛЕНИЕ (только high confidence)
  const fixAllHigh = async () => {
    const highConfidenceItems = analyses.filter(a => a.confidence === 'high' && a.suggestedSponsor);
    
    if (highConfidenceItems.length === 0) {
      toast.error('Нет элементов с высокой уверенностью');
      return;
    }
    
    const list = highConfidenceItems.map(a => 
      `${a.orphan.имя} ${a.orphan.фамилия} (${a.orphan.id})` + 
      (a.hasChildren ? ` ⚠️ ${a.childrenCount} детей` : '')
    ).join('\n');
    
    const confirmation = confirm(
      `🚀 МАССОВОЕ ИСПРАВЛЕНИЕ\n\n` +
      `Будет исправлено ${highConfidenceItems.length} пользователей с высокой уверенностью:\n\n${list}\n\n` +
      `Продолжить?`
    );
    
    if (!confirmation) return;
    
    setFixing(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const analysis of highConfidenceItems) {
      try {
        const { orphan, suggestedSponsor } = analysis;
        
        // Update orphan
        const updatedOrphan = { ...orphan, спонсорId: suggestedSponsor.id };
        const orphanUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${orphan.id}`;
        const orphanResponse = await fetch(orphanUrl, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ userData: updatedOrphan })
        });
        const orphanData = await orphanResponse.json();
        if (!orphanData.success) throw new Error('Orphan update failed');
        
        // Update sponsor
        const updatedSponsor = { ...suggestedSponsor, команда: [...(suggestedSponsor.команда || []), orphan.id] };
        const sponsorUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/update-user/${suggestedSponsor.id}`;
        const sponsorResponse = await fetch(sponsorUrl, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ userData: updatedSponsor })
        });
        const sponsorData = await sponsorResponse.json();
        if (!sponsorData.success) throw new Error('Sponsor update failed');
        
        successCount++;
      } catch (error) {
        console.error('Fix error:', error);
        errorCount++;
      }
    }
    
    toast.success(`✅ Исправлено: ${successCount}`, {
      description: errorCount > 0 ? `Ошибок: ${errorCount}` : undefined
    });
    
    // Перезапускаем анализ
    invalidateUsers();
    setTimeout(analyzeOrphans, 1000);
    
    setFixing(false);
    
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Умное восстановление связей
            </CardTitle>
            <CardDescription>
              Автоматически находит родителя по пригласительному коду
            </CardDescription>
          </div>
          <Button
            onClick={analyzeOrphans}
            disabled={isLoading || analyzing}
            variant="outline"
            size="sm"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Анализ...
              </>
            ) : (
              'Начать анализ'
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {analyses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <UserX className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Нажмите "Начать анализ" для поиска пользователей без спонсора</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Массовое действие */}
            {analyses.filter(a => a.confidence === 'high' && a.suggestedSponsor).length > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-900">
                    Найдено {analyses.filter(a => a.confidence === 'high').length} с высокой уверенностью
                  </p>
                  <p className="text-sm text-green-700">
                    Можно исправить автоматически
                  </p>
                </div>
                <Button
                  onClick={fixAllHigh}
                  disabled={fixing}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {fixing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Исправление...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Исправить всё
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Список orphans */}
            {analyses.map((analysis, idx) => (
              <div
                key={analysis.orphan.id}
                className={`p-4 border rounded-lg ${
                  analysis.confidence === 'high' ? 'border-green-300 bg-green-50' :
                  analysis.confidence === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                  'border-red-300 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {analysis.orphan.имя} {analysis.orphan.фамилия}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        ID: {analysis.orphan.id}
                      </Badge>
                      {analysis.hasChildren && (
                        <Badge variant="destructive" className="text-xs">
                          ⚠️ {analysis.childrenCount} детей
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Badge variant={
                        analysis.confidence === 'high' ? 'default' :
                        analysis.confidence === 'medium' ? 'secondary' :
                        'destructive'
                      }>
                        {analysis.confidence === 'high' ? '✅ Высокая' :
                         analysis.confidence === 'medium' ? '⚠️ Средняя' :
                         '❌ Низкая'}
                      </Badge>
                      <span>{analysis.reason}</span>
                    </div>
                    
                    {analysis.suggestedSponsor && (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <UserX className="w-4 h-4 text-gray-400" />
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-blue-600">
                          {analysis.suggestedSponsor.имя} {analysis.suggestedSponsor.фамилия}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          ID: {analysis.suggestedSponsor.id}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => fixOrphan(analysis)}
                    disabled={!analysis.suggestedSponsor || fixing}
                    size="sm"
                    variant={analysis.confidence === 'high' ? 'default' : 'outline'}
                  >
                    {fixing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Исправить'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

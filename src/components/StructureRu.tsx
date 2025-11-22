import { useState, useEffect } from 'react';
import { Users, UserPlus, TrendingUp, Award, Loader2, Share2, Copy, CheckCircle2, Network, BarChart3, Trophy, ChevronDown, ChevronRight, Minimize2, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { UserProfileView } from './UserProfileView';
import * as api from '../utils/api';
import { toast } from 'sonner';
import { useDemoUser } from '../contexts/DemoUserContext';

interface StructureRuProps {
  currentUser: any;
  refreshTrigger: number;
}

export function StructureRu({ currentUser, refreshTrigger }: StructureRuProps) {
  const { isDemoMode, currentUserId } = useDemoUser();
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'table' | 'top'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 🆕 Определяем эффективного пользователя (для демо или реального режима)
  const effectiveUserId = isDemoMode && currentUserId ? currentUserId : currentUser?.id;

  // Автоматически раскрываем первый уровень при переключении на дерево
  useEffect(() => {
    if (viewMode === 'tree' && expandedNodes.size === 0 && team.length > 0) {
      const firstLevelIds = team
        .filter(m => m.пригласительКод === currentUser.рефКод)
        .map(m => m.id);
      setExpandedNodes(new Set(firstLevelIds));
    }
  }, [viewMode, team, currentUser.рефКод]);

  useEffect(() => {
    console.log('🔄 StructureRu: effectiveUserId changed:', effectiveUserId);
    loadTeam();
  }, [refreshTrigger, effectiveUserId]); // 🆕 Слушаем effectiveUserId вместо currentUser.id

  const loadTeam = async () => {
    if (!effectiveUserId) return;
    
    setLoading(true);
    try {
      console.log('📊 StructureRu: Loading team for user:', effectiveUserId);
      const data = await api.getUserTeam(effectiveUserId); // 🆕 Используем effectiveUserId
      if (data.success && data.team) {
        // 🆕 ИСПРАВЛЕНИЕ: Фильтруем самого пользователя из структуры
        // Каждый пользователь видит только СВОИХ партнёров, а не себя
        const filteredTeam = data.team.filter((m: any) => m.id !== effectiveUserId);
        console.log('✅ StructureRu: Loaded team:', filteredTeam.length, 'members');
        setTeam(filteredTeam);
      }
    } catch (error) {
      console.error('Failed to load team:', error);
      toast.error('Не удалось загрузить структуру команды');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 2:
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 3:
        return 'bg-amber-50 text-amber-600 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAvatarColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-gradient-to-br from-blue-200 to-blue-300';
      case 2:
        return 'bg-gradient-to-br from-rose-200 to-rose-300';
      case 3:
        return 'bg-gradient-to-br from-amber-200 to-amber-300';
      default:
        return 'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]';
    }
  };

  const getAvatarTextColor = (level: number) => {
    switch (level) {
      case 1:
        return 'text-blue-700';
      case 2:
        return 'text-rose-700';
      case 3:
        return 'text-amber-700';
      default:
        return 'text-white';
    }
  };

  const getLevelIcon = (level: number) => {
    return <Award className="w-4 h-4" />;
  };

  const handleCopyReferralLink = () => {
    const link = `${window.location.origin}?ref=${currentUser.рефКод}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Реферальная ссылка скопирована!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = () => {
    const link = `${window.location.origin}?ref=${currentUser.рефКод}`;
    const text = `Присоединяйтесь к H₂ Partner Platform!\n\nПриглашаю вас стать партнёром по продаже водородного порошка H₂-Touch.\n\nРеферальная ссылка: ${link}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'H₂ Partner Platform',
        text: text,
        url: link
      }).catch(() => {
        handleCopyReferralLink();
      });
    } else {
      handleCopyReferralLink();
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = team.map(m => m.id);
    setExpandedNodes(new Set(allIds));
    toast.success('Все узлы развёрнуты');
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
    toast.success('Все узлы свёрнуты');
  };

  // Построение дерева партнёров
  const buildTree = (parentRefCode: string, depth = 0): any[] => {
    return team
      .filter(member => member.пригласительКод === parentRefCode)
      .map(member => ({
        ...member,
        children: buildTree(member.рефКод, depth + 1),
        depth
      }));
  };

  // Рекурсивный рендер дерева
  const renderTreeNode = (node: any) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="ml-0">
        <div 
          className="flex items-center gap-2 p-3 bg-[#F7FAFC] rounded-xl mb-2 hover:bg-blue-50 transition-colors cursor-pointer group"
          onClick={() => setSelectedUserId(node.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-[#666]" />
              ) : (
                <ChevronRight size={16} className="text-[#666]" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <div className={`w-10 h-10 ${getAvatarColor(node.глубина || 1)} rounded-lg flex items-center justify-center ${getAvatarTextColor(node.глубина || 1)} flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
            <span style={{ fontWeight: '700', fontSize: '14px' }}>
              {node.имя.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[#1E1E1E] truncate group-hover:text-[#39B7FF] transition-colors" style={{ fontWeight: '600', fontSize: '14px' }}>
                {node.имя} {node.фамилия}
              </span>
              <Badge className={`${getLevelColor(node.глубина || 1)} border text-xs`}>
                Уровень {node.глубина || 1}
              </Badge>
            </div>
            <div className="text-[#666]" style={{ fontSize: '12px' }}>
              {node.рефКод} • {(node.баланс || 0).toLocaleString('ru-RU')}₽
            </div>
          </div>

          {hasChildren && (
            <Badge variant="outline" className="text-xs">
              {node.children.length} чел.
            </Badge>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-8 border-l-2 border-gray-200 pl-4 mt-2">
            {node.children.map((child: any) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Топ активных партнёров
  const getTopPartners = () => {
    return [...team]
      .sort((a, b) => (b.баланс || 0) - (a.баланс || 0))
      .slice(0, 10);
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
            <p className="text-[#666]">Загрузка структуры...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate team stats by LINE (глубина в структуре, не уровень партнера!)
  const teamByLine = team.reduce((acc, member) => {
    const line = member.глубина || 1;
    acc[line] = (acc[line] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Calculate team stats by LEVEL (уровень партнера: 1, 2, 3)
  const teamByLevel = team.reduce((acc, member) => {
    const level = member.уровень || 1;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
          Структура команды
        </h1>
        <p className="text-[#666]">Ваши партнёры и их результаты</p>
      </div>

      {/* Referral Section */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] text-white mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-5 h-5" />
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                  Пригласите новых партнёров
                </h3>
              </div>
              <p className="opacity-90 mb-3" style={{ fontSize: '14px' }}>
                Делитесь вашей реферальной ссылкой и зарабатывайте с каждой продажи вашей команды
              </p>
              <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                <code className="flex-1 text-white font-mono" style={{ fontSize: '13px' }}>
                  {currentUser.рефКод}
                </code>
                <button
                  onClick={handleCopyReferralLink}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Копировать код"
                >
                  {copiedLink ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleShare}
                className="bg-white text-[#39B7FF] hover:bg-white/90 w-full sm:w-auto"
              >
                <Share2 size={18} className="mr-2" />
                Поделиться ссылкой
              </Button>
              <Button
                onClick={handleCopyReferralLink}
                variant="outline"
                className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
              >
                <Copy size={18} className="mr-2" />
                Копировать код
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#39B7FF]/10 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 lg:w-6 lg:h-6 text-[#39B7FF]" />
              </div>
            </div>
            <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
              {team.length}
            </div>
            <div className="text-[#666]" style={{ fontSize: '12px' }}>Всего партнёров</div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
              {teamByLine[1] || 0}
            </div>
            <div className="text-[#666]" style={{ fontSize: '12px' }}>1-я линия</div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-rose-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500" />
              </div>
            </div>
            <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
              {teamByLine[2] || 0}
            </div>
            <div className="text-[#666]" style={{ fontSize: '12px' }}>2-я линия</div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500" />
              </div>
            </div>
            <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
              {teamByLine[3] || 0}
            </div>
            <div className="text-[#666]" style={{ fontSize: '12px' }}>3-я линия</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members with Tabs */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-[#1E1E1E]">Партнёры</CardTitle>
            <div className="flex items-center gap-3">
              {viewMode === 'tree' && team.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAll}
                    className="text-xs"
                  >
                    <Maximize2 size={14} className="mr-1" />
                    Развернуть
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="text-xs"
                  >
                    <Minimize2 size={14} className="mr-1" />
                    Свернуть
                  </Button>
                </div>
              )}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                <TabsList className="grid grid-cols-3 w-auto">
                  <TabsTrigger value="tree" className="px-3">
                    <Network size={16} />
                  </TabsTrigger>
                  <TabsTrigger value="table" className="px-3">
                    <BarChart3 size={16} />
                  </TabsTrigger>
                  <TabsTrigger value="top" className="px-3">
                    <Trophy size={16} />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-[#1E1E1E] mb-2" style={{ fontWeight: '600' }}>
                Пока нет партнёров
              </h3>
              <p className="text-[#666] mb-6" style={{ fontSize: '14px' }}>
                Пригласите первого партнёра, используя вашу реферальную ссылку
              </p>
              <Button
                onClick={handleShare}
                className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
              >
                <UserPlus size={18} className="mr-2" />
                Пригласить партнёра
              </Button>
            </div>
          ) : (
            <>
              {/* Tree View */}
              {viewMode === 'tree' && (
                <div className="space-y-2">
                  {buildTree(currentUser.рефКод).map((node) => renderTreeNode(node))}
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                          Партнёр
                        </th>
                        <th className="text-left p-3 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                          Уровень
                        </th>
                        <th className="text-left p-3 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                          Код
                        </th>
                        <th className="text-right p-3 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                          Баланс
                        </th>
                        <th className="text-left p-3 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                          Регистрация
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((member) => (
                        <tr key={member.id} className="border-b border-gray-100 hover:bg-[#F7FAFC] transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${getAvatarColor(member.глубина || 1)} rounded-lg flex items-center justify-center ${getAvatarTextColor(member.глубина || 1)} flex-shrink-0 shadow-sm`}>
                                <span style={{ fontWeight: '700', fontSize: '14px' }}>
                                  {member.имя.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>
                                {member.имя} {member.фамилия}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={`${getLevelColor(member.глубина || 1)} border`}>
                              Уровень {member.глубина || 1}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <code className="text-[#666] bg-gray-100 px-2 py-1 rounded" style={{ fontSize: '12px' }}>
                              {member.рефКод}
                            </code>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                              {(member.баланс || 0).toLocaleString('ru-RU')}₽
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-[#666]" style={{ fontSize: '13px' }}>
                              {member.датаРегистрации || member.зарегистрирован ? 
                                new Date(member.датаРегистрации || member.зарегистрирован).toLocaleDateString('ru-RU') : 
                                '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Top Partners View */}
              {viewMode === 'top' && (
                <div className="space-y-3">
                  {getTopPartners().map((member, index) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-4 bg-[#F7FAFC] rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                        'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]'
                      }`}>
                        <span style={{ fontWeight: '700', fontSize: '18px' }}>
                          {index + 1}
                        </span>
                      </div>

                      <div className={`w-10 h-10 ${getAvatarColor(member.глубина || 1)} rounded-lg flex items-center justify-center ${getAvatarTextColor(member.глубина || 1)} flex-shrink-0 shadow-sm`}>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>
                          {member.имя.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[#1E1E1E] truncate" style={{ fontWeight: '600' }}>
                            {member.имя} {member.фамилия}
                          </p>
                          <Badge className={`${getLevelColor(member.глубина || 1)} border text-xs`}>
                            Уровень {member.глубина || 1}
                          </Badge>
                        </div>
                        <div className="text-[#666]" style={{ fontSize: '13px' }}>
                          {member.рефКод}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-[#1E1E1E] mb-1" style={{ fontWeight: '700', fontSize: '18px' }}>
                          {(member.баланс || 0).toLocaleString('ru-RU')}₽
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[#12C9B6]" style={{ fontSize: '12px' }}>
                          <TrendingUp size={14} />
                          <span style={{ fontWeight: '600' }}>ТОП-{index + 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>


      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileView
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

    </div>
  );
}
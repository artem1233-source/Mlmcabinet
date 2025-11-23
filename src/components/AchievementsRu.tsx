import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trophy, Target, Medal, Star, TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import * as api from '../utils/api';

export function AchievementsRu() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any>({});
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('achievements');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [achievementsData, challengesData, leaderboardData] = await Promise.all([
        api.getAchievements(),
        api.getChallenges(),
        api.getLeaderboard()
      ]);

      setAchievements(achievementsData.achievements || []);
      setStats(achievementsData.stats || {});
      setChallenges(challengesData.challenges || []);
      setLeaderboard(leaderboardData || {});
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales': return <Target className="w-5 h-5" />;
      case 'team': return <Users className="w-5 h-5" />;
      case 'money': return <DollarSign className="w-5 h-5" />;
      case 'level': return <TrendingUp className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'sales': return 'Продажи';
      case 'team': return 'Команда';
      case 'money': return 'Доход';
      case 'level': return 'Уровень';
      case 'special': return 'Специальный';
      default: return 'Общее';
    }
  };

  const getTimeLeft = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Завершено';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} дн.`;
    return `${hours} ч.`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#666]">Загрузка достижений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-[#39B7FF]" />
          <h1 className="text-[#1A202C]" style={{ fontSize: '28px', fontWeight: '700' }}>
            Достижения
          </h1>
        </div>
        <p className="text-[#666]">
          Отслеживайте свой прогресс и соревнуйтесь с другими партнёрами
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 lg:mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <div className="text-[#666] text-sm">Завершено</div>
                <div className="text-[#1A202C]" style={{ fontSize: '20px', fontWeight: '700' }}>
                  {stats.completed || 0}/{stats.total || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#39B7FF]/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#39B7FF]" />
              </div>
              <div>
                <div className="text-[#666] text-sm">В процессе</div>
                <div className="text-[#1A202C]" style={{ fontSize: '20px', fontWeight: '700' }}>
                  {stats.inProgress || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <div className="text-[#666] text-sm">Заработано</div>
                <div className="text-[#1A202C]" style={{ fontSize: '20px', fontWeight: '700' }}>
                  {(stats.totalEarnings || 0).toLocaleString('ru-RU')}₽
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#12C9B6]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#12C9B6]" />
              </div>
              <div>
                <div className="text-[#666] text-sm">Команда</div>
                <div className="text-[#1A202C]" style={{ fontSize: '20px', fontWeight: '700' }}>
                  {stats.totalPartners || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-[#E6E9EE] p-1 rounded-xl">
          <TabsTrigger value="achievements" className="rounded-lg data-[state=active]:bg-[#39B7FF] data-[state=active]:text-white">
            <Trophy className="w-4 h-4 mr-2" />
            Достижения
          </TabsTrigger>
          <TabsTrigger value="challenges" className="rounded-lg data-[state=active]:bg-[#39B7FF] data-[state=active]:text-white">
            <Target className="w-4 h-4 mr-2" />
            Челленджи
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-lg data-[state=active]:bg-[#39B7FF] data-[state=active]:text-white">
            <Medal className="w-4 h-4 mr-2" />
            Рейтинг
          </TabsTrigger>
        </TabsList>

        {/* Достижения */}
        <TabsContent value="achievements" className="space-y-4">
          {['sales', 'team', 'money', 'level'].map(category => {
            const categoryAchievements = achievements.filter(a => a.категория === category);
            if (categoryAchievements.length === 0) return null;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  {getCategoryIcon(category)}
                  <h2 className="text-[#1A202C]" style={{ fontSize: '18px', fontWeight: '600' }}>
                    {getCategoryName(category)}
                  </h2>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {categoryAchievements.map((achievement) => (
                    <Card 
                      key={achievement.id}
                      className={`border-2 rounded-2xl shadow-sm transition-all ${
                        achievement.завершено 
                          ? 'border-[#10B981] bg-[#10B981]/5' 
                          : 'border-[#E6E9EE] hover:border-[#39B7FF]/30'
                      }`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                            style={{ backgroundColor: `${achievement.цвет}15` }}
                          >
                            {achievement.иконка}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h3 className="text-[#1A202C]" style={{ fontSize: '16px', fontWeight: '600' }}>
                                  {achievement.название}
                                </h3>
                                <p className="text-[#666] text-sm mt-1">
                                  {achievement.описание}
                                </p>
                              </div>
                              {achievement.завершено && (
                                <Badge className="bg-[#10B981] hover:bg-[#10B981] flex-shrink-0">
                                  <Star className="w-3 h-3 mr-1" />
                                  Получено
                                </Badge>
                              )}
                            </div>

                            {/* Progress */}
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#666]">Прогресс</span>
                                <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                                  {achievement.прогресс.toLocaleString('ru-RU')} / {achievement.цель.toLocaleString('ru-RU')}
                                </span>
                              </div>
                              <Progress 
                                value={(achievement.прогресс / achievement.цель) * 100} 
                                className="h-2"
                                style={{ 
                                  backgroundColor: '#E6E9EE',
                                }}
                              />
                            </div>

                            {/* Reward */}
                            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#F7FAFC' }}>
                              <div className="flex items-center gap-2 text-sm">
                                <Award className="w-4 h-4" style={{ color: achievement.цвет }} />
                                <span className="text-[#666]">Награда:</span>
                                <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                                  {achievement.награда}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Челленджи */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="grid gap-4">
            {challenges.map((challenge) => (
              <Card 
                key={challenge.id}
                className={`border-2 rounded-2xl shadow-sm ${
                  challenge.завершено 
                    ? 'border-[#10B981] bg-[#10B981]/5' 
                    : 'border-[#E6E9EE]'
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                      style={{ backgroundColor: `${challenge.цвет}15` }}
                    >
                      {challenge.иконка}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[#1A202C]" style={{ fontSize: '18px', fontWeight: '600' }}>
                              {challenge.название}
                            </h3>
                            <Badge variant="outline" style={{ borderColor: challenge.цвет, color: challenge.цвет }}>
                              {getCategoryName(challenge.категория)}
                            </Badge>
                          </div>
                          <p className="text-[#666]">
                            {challenge.описание}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-[#666] text-sm">До завершения</div>
                            <div className="text-[#1A202C]" style={{ fontSize: '16px', fontWeight: '600' }}>
                              {getTimeLeft(challenge.дедлайн)}
                            </div>
                          </div>
                          {challenge.завершено && (
                            <Badge className="bg-[#10B981] hover:bg-[#10B981]">
                              <Star className="w-3 h-3 mr-1" />
                              Выполнено
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#666]">Прогресс</span>
                          <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                            {challenge.прогресс.toLocaleString('ru-RU')} / {challenge.цель.toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <Progress 
                          value={(challenge.прогресс / challenge.цель) * 100} 
                          className="h-3"
                          style={{ backgroundColor: '#E6E9EE' }}
                        />
                      </div>

                      {/* Reward */}
                      <div className="p-4 rounded-xl" style={{ backgroundColor: `${challenge.цвет}10` }}>
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5" style={{ color: challenge.цвет }} />
                          <span className="text-[#666]">Награда:</span>
                          <span className="text-[#1A202C]" style={{ fontSize: '16px', fontWeight: '700' }}>
                            {challenge.награда}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Рейтинг */}
        <TabsContent value="leaderboard" className="space-y-6">
          {['sales', 'team', 'earnings'].map((type) => {
            const leaders = leaderboard[type] || [];
            const typeNames: Record<string, string> = {
              sales: 'По продажам',
              team: 'По размеру команды',
              earnings: 'По доходу'
            };

            return (
              <Card key={type} className="border-[#E6E9EE] rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#1A202C]">
                    <Medal className="w-5 h-5 text-[#F59E0B]" />
                    {typeNames[type]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaders.map((leader: any, index: number) => (
                      <div 
                        key={leader.userId}
                        className="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-[#F7FAFC]"
                      >
                        <div 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            index === 0 ? 'bg-[#F59E0B] text-white' :
                            index === 1 ? 'bg-[#9CA3AF] text-white' :
                            index === 2 ? 'bg-[#CD7F32] text-white' :
                            'bg-[#E6E9EE] text-[#666]'
                          }`}
                          style={{ fontSize: '16px', fontWeight: '700' }}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#1A202C]" style={{ fontSize: '16px', fontWeight: '600' }}>
                              {leader.имя} {leader.фамилия}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              Уровень {leader.уровень}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[#1A202C]" style={{ fontSize: '18px', fontWeight: '700' }}>
                            {leader.значение.toLocaleString('ru-RU')} {leader.метрика}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

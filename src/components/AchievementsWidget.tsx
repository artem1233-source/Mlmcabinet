import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Trophy, Star, ArrowRight } from 'lucide-react';
import * as api from '../utils/api';

interface AchievementsWidgetProps {
  onNavigate?: () => void;
}

export function AchievementsWidget({ onNavigate }: AchievementsWidgetProps) {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const data = await api.getAchievements();
      setAchievements(data.achievements || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A202C]">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
            Достижения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-[#666]">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  // Показываем только незавершенные достижения с прогрессом
  const inProgressAchievements = achievements
    .filter(a => !a.завершено && a.прогресс > 0)
    .slice(0, 3);

  const recentCompleted = achievements
    .filter(a => a.завершено)
    .slice(0, 2);

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#1A202C]">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
            Достижения
          </CardTitle>
          <button
            onClick={onNavigate}
            className="text-[#39B7FF] hover:text-[#2997d9] transition-colors flex items-center gap-1 text-sm"
            style={{ fontWeight: '600' }}
          >
            Все
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Статистика */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#10B981]/5">
            <div className="text-[#666] text-xs mb-1">Завершено</div>
            <div className="text-[#1A202C]" style={{ fontSize: '20px', fontWeight: '700' }}>
              {stats.completed || 0}/{stats.total || 0}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#39B7FF]/5">
            <div className="text-[#666] text-xs mb-1">В процессе</div>
            <div className="text-[#1A202C]" style={{ fontSize: '20px', fontWeight: '700' }}>
              {stats.inProgress || 0}
            </div>
          </div>
        </div>

        {/* Недавно завершенные */}
        {recentCompleted.length > 0 && (
          <div className="space-y-2">
            <div className="text-[#666] text-xs" style={{ fontWeight: '600' }}>
              Недавно получено
            </div>
            {recentCompleted.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/20"
              >
                <div className="text-2xl">{achievement.иконка}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[#1A202C] text-sm" style={{ fontWeight: '600' }}>
                    {achievement.название}
                  </div>
                  <div className="text-[#666] text-xs flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#10B981]" />
                    {achievement.награда}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* В процессе */}
        {inProgressAchievements.length > 0 && (
          <div className="space-y-3">
            <div className="text-[#666] text-xs" style={{ fontWeight: '600' }}>
              В процессе выполнения
            </div>
            {inProgressAchievements.map((achievement) => (
              <div key={achievement.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="text-xl">{achievement.иконка}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#1A202C] text-sm" style={{ fontWeight: '600' }}>
                      {achievement.название}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1 mb-2">
                      <span className="text-[#666]">
                        {achievement.прогресс.toLocaleString('ru-RU')} / {achievement.цель.toLocaleString('ru-RU')}
                      </span>
                      <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                        {Math.round((achievement.прогресс / achievement.цель) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(achievement.прогресс / achievement.цель) * 100}
                      className="h-2"
                      style={{ backgroundColor: '#E6E9EE' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Пустое состояние */}
        {inProgressAchievements.length === 0 && recentCompleted.length === 0 && (
          <div className="text-center py-6">
            <Trophy className="w-12 h-12 text-[#E6E9EE] mx-auto mb-3" />
            <p className="text-[#666] text-sm">
              Начните продавать и приглашать партнёров, чтобы получить достижения!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

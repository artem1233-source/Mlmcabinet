import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit2, Trash2, Trophy, Target, Award, Save, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import * as api from '../utils/api';

interface Achievement {
  id: string;
  название: string;
  описание: string;
  иконка: string;
  категория: string;
  цель: number;
  награда: string;
  цвет: string;
}

interface Challenge {
  id: string;
  название: string;
  описание: string;
  иконка: string;
  категория: string;
  цель: number;
  дедлайн: string;
  награда: string;
  тип: string;
  цвет: string;
}

export function AchievementsAdminRu() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('achievements');
  
  // Achievement dialog
  const [achievementDialogOpen, setAchievementDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [achievementForm, setAchievementForm] = useState<Partial<Achievement>>({
    название: '',
    описание: '',
    иконка: '🎯',
    категория: 'sales',
    цель: 1,
    награда: '',
    цвет: '#10B981'
  });
  
  // Challenge dialog
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [challengeForm, setChallengeForm] = useState<Partial<Challenge>>({
    название: '',
    описание: '',
    иконка: '🎯',
    категория: 'sales',
    цель: 1,
    дедлайн: '',
    награда: '',
    тип: 'monthly',
    цвет: '#10B981'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [achievementsData, challengesData] = await Promise.all([
        api.getAchievementsAdmin(),
        api.getChallengesAdmin()
      ]);
      
      // ✅ Обрабатываем ответ API правильно
      setAchievements(Array.isArray(achievementsData?.achievements) ? achievementsData.achievements : []);
      setChallenges(Array.isArray(challengesData?.challenges) ? challengesData.challenges : []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
      // Устанавливаем пустые массивы при ошибке
      setAchievements([]);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  // Achievement handlers
  const openAchievementDialog = (achievement?: Achievement) => {
    if (achievement) {
      setEditingAchievement(achievement);
      setAchievementForm(achievement);
    } else {
      setEditingAchievement(null);
      setAchievementForm({
        название: '',
        описание: '',
        иконка: '🎯',
        категория: 'sales',
        цель: 1,
        награда: '',
        цвет: '#10B981'
      });
    }
    setAchievementDialogOpen(true);
  };

  const saveAchievement = async () => {
    try {
      if (!achievementForm.название || !achievementForm.описание || !achievementForm.награда) {
        toast.error('Заполните все обязательные поля');
        return;
      }

      if (editingAchievement) {
        await api.updateAchievement(editingAchievement.id, achievementForm);
        toast.success('Достижение обновлено');
      } else {
        await api.createAchievement(achievementForm);
        toast.success('Достижение создано');
      }
      
      setAchievementDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving achievement:', error);
      toast.error('Ошибка сохранения достижения');
    }
  };

  const deleteAchievement = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это достижение?')) {
      return;
    }
    
    try {
      await api.deleteAchievement(id);
      toast.success('Достижение удалено');
      loadData();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast.error('Ошибка удаления достижения');
    }
  };

  // Challenge handlers
  const openChallengeDialog = (challenge?: Challenge) => {
    if (challenge) {
      setEditingChallenge(challenge);
      setChallengeForm(challenge);
    } else {
      setEditingChallenge(null);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(0);
      
      setChallengeForm({
        название: '',
        описание: '',
        иконка: '🎯',
        категория: 'sales',
        цель: 1,
        дедлайн: nextMonth.toISOString().split('T')[0],
        награда: '',
        тип: 'monthly',
        цвет: '#10B981'
      });
    }
    setChallengeDialogOpen(true);
  };

  const saveChallenge = async () => {
    try {
      if (!challengeForm.название || !challengeForm.описание || !challengeForm.награда || !challengeForm.дедлайн) {
        toast.error('Заполните все обязательные поля');
        return;
      }

      if (editingChallenge) {
        await api.updateChallenge(editingChallenge.id, challengeForm);
        toast.success('Челлендж обновлён');
      } else {
        await api.createChallenge(challengeForm);
        toast.success('Челлендж создан');
      }
      
      setChallengeDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving challenge:', error);
      toast.error('Ошибка сохранения челленджа');
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот челлендж?')) {
      return;
    }
    
    try {
      await api.deleteChallenge(id);
      toast.success('Челлендж удалён');
      loadData();
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast.error('Ошибка удаления челленджа');
    }
  };

  const categoryOptions = [
    { value: 'sales', label: 'Продажи' },
    { value: 'team', label: 'Команда' },
    { value: 'money', label: 'Доход' },
    { value: 'level', label: 'Уровень' },
    { value: 'special', label: 'Специальный' }
  ];

  const challengeTypeOptions = [
    { value: 'daily', label: 'Ежедневный' },
    { value: 'weekly', label: 'Еженедельный' },
    { value: 'monthly', label: 'Ежемесячный' },
    { value: 'special', label: 'Специальный' }
  ];

  const colorOptions = [
    { value: '#10B981', label: 'Зелёный' },
    { value: '#39B7FF', label: 'Синий' },
    { value: '#12C9B6', label: 'Бирюзовый' },
    { value: '#F59E0B', label: 'Оранжевый' },
    { value: '#8B5CF6', label: 'Фиолетовый' },
    { value: '#EF4444', label: 'Красный' }
  ];

  const emojiOptions = [
    '🎯', '🔥', '⭐', '🤝', '👥', '🏆', '💰', '💎', '👑', '📈', '🚀',
    '📦', '⚡', '🎄', '🎉', '💪', '🌟', '🎁', '🏅', '✨', '💯'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#666]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-[#39B7FF]" />
              <h1 className="text-[#1A202C]" style={{ fontSize: '28px', fontWeight: '700' }}>
                Управление достижениями
              </h1>
            </div>
            <p className="text-[#666]">
              Создавайте и редактируйте достижения и челленджи для партнёров
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-[#E6E9EE] p-1 rounded-xl">
          <TabsTrigger value="achievements" className="rounded-lg data-[state=active]:bg-[#39B7FF] data-[state=active]:text-white">
            <Trophy className="w-4 h-4 mr-2" />
            Достижения ({achievements.length})
          </TabsTrigger>
          <TabsTrigger value="challenges" className="rounded-lg data-[state=active]:bg-[#39B7FF] data-[state=active]:text-white">
            <Target className="w-4 h-4 mr-2" />
            Челленджи ({challenges.length})
          </TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => openAchievementDialog()}
              className="bg-[#39B7FF] hover:bg-[#2A9EE8] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить достижение
            </Button>
          </div>

          <div className="grid gap-4">
            {achievements.map((achievement) => (
              <Card key={achievement.id} className="border-[#E6E9EE] rounded-2xl shadow-sm">
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
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline">
                            {categoryOptions.find(c => c.value === achievement.категория)?.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-[#666]" />
                          <span className="text-[#666]">Цель:</span>
                          <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                            {achievement.цель.toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#666]" />
                          <span className="text-[#666]">Награда:</span>
                          <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                            {achievement.награда}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAchievementDialog(achievement)}
                        className="text-[#39B7FF] hover:text-[#2A9EE8] hover:bg-[#39B7FF]/10"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAchievement(achievement.id)}
                        className="text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => openChallengeDialog()}
              className="bg-[#39B7FF] hover:bg-[#2A9EE8] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить челлендж
            </Button>
          </div>

          <div className="grid gap-4">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="border-[#E6E9EE] rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: `${challenge.цвет}15` }}
                    >
                      {challenge.иконка}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-[#1A202C]" style={{ fontSize: '16px', fontWeight: '600' }}>
                            {challenge.название}
                          </h3>
                          <p className="text-[#666] text-sm mt-1">
                            {challenge.описание}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline">
                            {categoryOptions.find(c => c.value === challenge.категория)?.label}
                          </Badge>
                          <Badge variant="outline" style={{ borderColor: challenge.цвет, color: challenge.цвет }}>
                            {challengeTypeOptions.find(t => t.value === challenge.тип)?.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-[#666]" />
                          <span className="text-[#666]">Цель:</span>
                          <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                            {challenge.цель.toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#666]" />
                          <span className="text-[#666]">Награда:</span>
                          <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                            {challenge.награда}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#666]">Дедлайн:</span>
                          <span className="text-[#1A202C]" style={{ fontWeight: '600' }}>
                            {new Date(challenge.дедлайн).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openChallengeDialog(challenge)}
                        className="text-[#39B7FF] hover:text-[#2A9EE8] hover:bg-[#39B7FF]/10"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteChallenge(challenge.id)}
                        className="text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Achievement Dialog */}
      <Dialog open={achievementDialogOpen} onOpenChange={setAchievementDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAchievement ? 'Редактировать достижение' : 'Новое достижение'}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о достижении
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="achievement-name">Название *</Label>
                <Input
                  id="achievement-name"
                  value={achievementForm.название}
                  onChange={(e) => setAchievementForm({ ...achievementForm, название: e.target.value })}
                  placeholder="Например: Первая продажа"
                />
              </div>

              <div>
                <Label htmlFor="achievement-description">Описание *</Label>
                <Textarea
                  id="achievement-description"
                  value={achievementForm.описание}
                  onChange={(e) => setAchievementForm({ ...achievementForm, описание: e.target.value })}
                  placeholder="Краткое описание достижения"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="achievement-category">Категория *</Label>
                  <Select
                    value={achievementForm.категория}
                    onValueChange={(value) => setAchievementForm({ ...achievementForm, категория: value })}
                  >
                    <SelectTrigger id="achievement-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="achievement-goal">Цель *</Label>
                  <Input
                    id="achievement-goal"
                    type="number"
                    value={achievementForm.цель}
                    onChange={(e) => setAchievementForm({ ...achievementForm, цель: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="achievement-reward">Награда *</Label>
                <Input
                  id="achievement-reward"
                  value={achievementForm.награда}
                  onChange={(e) => setAchievementForm({ ...achievementForm, награда: e.target.value })}
                  placeholder="Например: 500₽ бонус"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Иконка *</Label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {emojiOptions.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAchievementForm({ ...achievementForm, иконка: emoji })}
                        className={`p-2 text-2xl rounded-lg border-2 transition-all hover:scale-110 ${
                          achievementForm.иконка === emoji 
                            ? 'border-[#39B7FF] bg-[#39B7FF]/10' 
                            : 'border-[#E6E9EE]'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Цвет *</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setAchievementForm({ ...achievementForm, цвет: color.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          achievementForm.цвет === color.value 
                            ? 'border-[#39B7FF] scale-105' 
                            : 'border-[#E6E9EE]'
                        }`}
                        style={{ backgroundColor: `${color.value}20` }}
                      >
                        <div 
                          className="w-full h-6 rounded" 
                          style={{ backgroundColor: color.value }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAchievementDialogOpen(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
            <Button
              onClick={saveAchievement}
              className="bg-[#39B7FF] hover:bg-[#2A9EE8] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Challenge Dialog */}
      <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChallenge ? 'Редактировать челлендж' : 'Новый челлендж'}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о челлендже
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="challenge-name">Название *</Label>
                <Input
                  id="challenge-name"
                  value={challengeForm.название}
                  onChange={(e) => setChallengeForm({ ...challengeForm, название: e.target.value })}
                  placeholder="Например: Продайте 50 единиц в ноябре"
                />
              </div>

              <div>
                <Label htmlFor="challenge-description">Описание *</Label>
                <Textarea
                  id="challenge-description"
                  value={challengeForm.описание}
                  onChange={(e) => setChallengeForm({ ...challengeForm, описание: e.target.value })}
                  placeholder="Краткое описание челленджа"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="challenge-category">Категория *</Label>
                  <Select
                    value={challengeForm.категория}
                    onValueChange={(value) => setChallengeForm({ ...challengeForm, категория: value })}
                  >
                    <SelectTrigger id="challenge-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="challenge-type">Тип *</Label>
                  <Select
                    value={challengeForm.тип}
                    onValueChange={(value) => setChallengeForm({ ...challengeForm, тип: value })}
                  >
                    <SelectTrigger id="challenge-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {challengeTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="challenge-goal">Цель *</Label>
                  <Input
                    id="challenge-goal"
                    type="number"
                    value={challengeForm.цель}
                    onChange={(e) => setChallengeForm({ ...challengeForm, цель: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="challenge-reward">Награда *</Label>
                  <Input
                    id="challenge-reward"
                    value={challengeForm.награда}
                    onChange={(e) => setChallengeForm({ ...challengeForm, награда: e.target.value })}
                    placeholder="Например: 15000₽"
                  />
                </div>

                <div>
                  <Label htmlFor="challenge-deadline">Дедлайн *</Label>
                  <Input
                    id="challenge-deadline"
                    type="date"
                    value={challengeForm.дедлайн?.split('T')[0] || ''}
                    onChange={(e) => setChallengeForm({ ...challengeForm, дедлайн: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Иконка *</Label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {emojiOptions.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setChallengeForm({ ...challengeForm, иконка: emoji })}
                        className={`p-2 text-2xl rounded-lg border-2 transition-all hover:scale-110 ${
                          challengeForm.иконка === emoji 
                            ? 'border-[#39B7FF] bg-[#39B7FF]/10' 
                            : 'border-[#E6E9EE]'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Цвет *</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setChallengeForm({ ...challengeForm, цвет: color.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          challengeForm.цвет === color.value 
                            ? 'border-[#39B7FF] scale-105' 
                            : 'border-[#E6E9EE]'
                        }`}
                        style={{ backgroundColor: `${color.value}20` }}
                      >
                        <div 
                          className="w-full h-6 rounded" 
                          style={{ backgroundColor: color.value }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChallengeDialogOpen(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
            <Button
              onClick={saveChallenge}
              className="bg-[#39B7FF] hover:bg-[#2A9EE8] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
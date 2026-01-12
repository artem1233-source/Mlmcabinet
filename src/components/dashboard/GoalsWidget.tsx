import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Target, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2, Circle, Calendar as CalendarIcon } from 'lucide-react';
import { Goal, GoalsStats } from '../../utils/goalsHelper';

interface GoalsWidgetProps {
  userId: string;
  activeGoals: Goal[];
  completedGoals: Goal[];
  stats: GoalsStats;
  onToggleGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddGoal: () => void;
}

export function GoalsWidget({ 
  userId, 
  activeGoals, 
  completedGoals, 
  stats, 
  onToggleGoal, 
  onDeleteGoal, 
  onAddGoal 
}: GoalsWidgetProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return <span className="text-red-600">Просрочено</span>;
    if (diffDays === 0) return <span className="text-orange-600">Сегодня</span>;
    if (diffDays === 1) return <span className="text-orange-500">Завтра</span>;
    if (diffDays <= 7) return <span className="text-yellow-600">{diffDays}д</span>;
    return <span className="text-gray-500">{diffDays}д</span>;
  };

  return (
    <Card className="p-6">
      {/* Header с статистикой */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Мои цели</h3>
            <p className="text-sm text-gray-500">
              Выполнено {stats.completionRate}% за месяц
            </p>
          </div>
        </div>
        
        {/* Мини-статистика */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-green-600">{stats.weekCompleted}</div>
            <div className="text-xs text-gray-500">за неделю</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-purple-600">{stats.totalCompleted}</div>
            <div className="text-xs text-gray-500">всего</div>
          </div>
        </div>
      </div>

      {/* Прогресс-бар */}
      {activeGoals.length > 0 && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
              style={{ 
                width: `${(completedGoals.length / (activeGoals.length + completedGoals.length)) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Активные цели */}
      <div className="space-y-2 mb-4">
        {activeGoals.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            Добавьте свою первую цель
          </div>
        ) : (
          activeGoals.map((goal) => (
            <div
              key={goal.id}
              className="group flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <button
                onClick={() => onToggleGoal(goal.id)}
                className="flex-shrink-0 hover:scale-110 transition-transform"
              >
                <Circle className="w-5 h-5 text-gray-400 hover:text-purple-600" />
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">{goal.title}</div>
                {goal.deadline && (
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <CalendarIcon className="w-3 h-3" />
                    {formatDeadline(goal.deadline)}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => onDeleteGoal(goal.id)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-red-50 rounded transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Кнопка добавить цель */}
      <Button
        variant="outline"
        className="w-full mb-4 border-dashed border-2 hover:border-purple-300 hover:bg-purple-50"
        onClick={onAddGoal}
      >
        <Plus className="w-4 h-4 mr-2" />
        Добавить цель
      </Button>

      {/* Выполненные цели (сворачиваемый раздел) */}
      {completedGoals.length > 0 && (
        <div className="border-t pt-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>✅ Выполнено ({completedGoals.length})</span>
            {showCompleted ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showCompleted && (
            <div className="space-y-2 mt-3">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="group flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                >
                  <button
                    onClick={() => onToggleGoal(goal.id)}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-500 line-through">{goal.title}</div>
                    {goal.completedAt && (
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(goal.completedAt).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGoal: (title: string, deadline?: string) => void;
}

export function AddGoalModal({ isOpen, onClose, onAddGoal }: AddGoalModalProps) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleAdd = () => {
    if (!title.trim()) {
      toast.error('Введите название цели');
      return;
    }

    onAddGoal(title.trim(), deadline || undefined);
    toast.success('✅ Цель добавлена!');
    setTitle('');
    setDeadline('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Добавить цель</h3>
              <p className="text-sm text-gray-500">Поставьте новую цель на неделю</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Форма */}
          <div className="space-y-4">
            {/* Название цели */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 Название цели
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Пригласить 5 партнёров"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
              />
            </div>

            {/* Дедлайн (опционально) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Дедлайн (необязательно)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF] focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white"
              onClick={handleAdd}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
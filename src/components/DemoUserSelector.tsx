// 🎭 СЕЛЕКТОР ДЕМО-ПОЛЬЗОВАТЕЛЕЙ

import { useState, useEffect } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { getDemoUsersList } from '../utils/demoApi';
import { useDemoUser } from '../contexts/DemoUserContext';
import { toast } from 'sonner';

interface DemoUserSelectorProps {
  onUserChange: () => void; // Колбэк для обновления данных после смены пользователя
}

export function DemoUserSelector({ onUserChange }: DemoUserSelectorProps) {
  const { currentUserId, setCurrentUserId } = useDemoUser();
  const [usersList, setUsersList] = useState<Array<{
    id: string;
    label: string;
    level: string;
    depth: number;
  }>>([]);

  // Загружаем список пользователей при монтировании
  useEffect(() => {
    const users = getDemoUsersList();
    console.log('🎭 DemoUserSelector mounted, users:', users.length);
    console.log('🎭 Users list:', users);
    setUsersList(users);
    console.log('🎭 Current demo user ID from context:', currentUserId);
  }, [currentUserId]);

  // Находим текущего пользователя
  const currentUser = usersList.find(u => u.id === currentUserId);

  const handleUserChange = (userId: string) => {
    console.log('🎭 DemoUserSelector: Switching to demo user:', userId);
    setCurrentUserId(userId); // Используем setCurrentUserId из контекста
    
    // Вызываем колбэк для обновления данных
    onUserChange();
    
    // Показываем уведомление
    const user = usersList.find(u => u.id === userId);
    if (user) {
      toast.success(`Переключено на: ${user.label}`);
    }
  };

  if (usersList.length === 0) {
    console.log('⚠️ DemoUserSelector: No users to display, returning null');
    return null;
  }

  console.log('✅ DemoUserSelector: Rendering with', usersList.length, 'users');

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-amber-700" />
        <span className="text-sm text-amber-900" style={{ fontWeight: '600' }}>
          Демо-режим • Просмотр как:
        </span>
      </div>
      
      <div className="relative">
        <select
          value={currentUserId || ''}
          onChange={(e) => handleUserChange(e.target.value)}
          className="appearance-none bg-white border border-amber-300 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-900 cursor-pointer hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
          style={{ fontWeight: '500' }}
        >
          {usersList.map((user) => (
            <option key={user.id} value={user.id}>
              {user.label} • {user.level}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-amber-700 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
      </div>

      <div className="text-xs text-amber-700">
        Переключайтесь между пользователями чтобы увидеть их данные, структуру и доходы
      </div>
    </div>
  );
}
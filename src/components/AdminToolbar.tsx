import { Eye, Crown, ChevronDown, RefreshCw } from 'lucide-react';
import { isDemoMode, getDemoUsersList, demoClearAllTransactions } from '../utils/demoApi';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useDemoUser } from '../contexts/DemoUserContext';

interface AdminToolbarProps {
  userName?: string;
  onUserChange?: () => void; // Колбэк для обновления данных после смены пользователя
}

export function AdminToolbar({ userName, onUserChange }: AdminToolbarProps) {
  const { isDemoMode: demoMode, currentUserId, setCurrentUserId } = useDemoUser();
  const [usersList, setUsersList] = useState<Array<{
    id: string;
    label: string;
    level: string;
    depth: number;
  }>>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Состояние для кастомного dropdown

  // Загружаем список пользователей при монтировании (только в демо-режиме)
  useEffect(() => {
    if (demoMode) {
      const users = getDemoUsersList();
      setUsersList(users);
      console.log('📋 AdminToolbar: Loaded users list:', users.length);
    }
  }, [demoMode]);

  // Находим текущего пользователя
  const currentUser = usersList.find(u => u.id === currentUserId);

  const handleUserChange = (userId: string) => {
    console.log('🎭 AdminToolbar: Switching to demo user:', userId);
    setCurrentUserId(userId); // Используем setCurrentUserId из контекста
    setIsOpen(false); // Закрываем dropdown
    
    // Вызываем колбэк для обновления данных
    if (onUserChange) {
      onUserChange();
    }
    
    // Показываем уведомление
    const user = usersList.find(u => u.id === userId);
    if (user) {
      toast.success(`Переключено на: ${user.label}`);
    }
  };

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-selector-dropdown')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleClearTransactions = async () => {
    if (!confirm('⚠️ Вы уверены? Все заказы, балансы и начисления будут удалены безвозвратно!')) {
      return;
    }
    
    setIsClearing(true);
    try {
      const result = await demoClearAllTransactions();
      
      if (!result.success) {
        throw new Error(result.message || 'Ошибка при очистке транзакций');
      }
      
      toast.success('✅ Данные очищены!');
      
      // ✅ Переключаемся на главного пользователя через контекст
      setCurrentUserId('DEMO_USER');
      
      // ✅ Обновляем данные через колбэк (если есть)
      if (onUserChange) {
        onUserChange();
      }
      
      // ✅ Небольшая задержка чтобы дать React обновить состояние
      setTimeout(() => {
        setIsClearing(false);
        toast.success('🎉 Система готова к работе!');
      }, 500);
    } catch (error) {
      console.error('Error clearing transactions:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при очистке транзакций');
      setIsClearing(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* Admin Badge */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg shadow flex items-center gap-2">
          <Crown className="w-3.5 h-3.5" />
          <span style={{ fontWeight: '700', fontSize: '12px' }}>
            Режим администратора
          </span>
        </div>
        
        {/* View Mode Indicator - с кастомным dropdown для демо-режима */}
        {demoMode && usersList.length > 0 ? (
          <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-1.5 shadow-sm user-selector-dropdown relative">
            <Eye className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-xs text-amber-900" style={{ fontWeight: '600' }}>
              Просмотр как:
            </span>
            
            {/* Кастомный dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-transparent border-none text-xs text-amber-900 cursor-pointer focus:outline-none"
                style={{ fontWeight: '700' }}
              >
                <span>{currentUser ? `${currentUser.label} • ${currentUser.level}` : 'Выберите...'}</span>
                <ChevronDown className={`w-3 h-3 text-amber-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown меню */}
              {isOpen && (
                <div 
                  className="absolute top-full right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
                  style={{ minWidth: '360px', maxHeight: '500px', overflowY: 'auto' }}
                >
                  {usersList.map((user, index) => {
                    const isSelected = user.id === currentUserId;
                    const isLast = index === usersList.length - 1;
                    
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserChange(user.id)}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          isSelected ? 'bg-gray-700' : ''
                        } ${!isLast ? 'border-b border-gray-700' : ''}`}
                      >
                        {/* Визуальное дерево с линиями */}
                        <div className="flex items-center" style={{ minWidth: `${user.depth * 20}px` }}>
                          {user.depth > 0 && (
                            <>
                              {/* Вертикальные линии для всех родительских уровней */}
                              {Array.from({ length: user.depth - 1 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="border-l border-gray-600"
                                  style={{ 
                                    width: '20px',
                                    height: '100%',
                                    marginLeft: i === 0 ? '0' : '0'
                                  }}
                                />
                              ))}
                              {/* L-образная линия для текущего уровня */}
                              <div className="relative" style={{ width: '20px', height: '32px' }}>
                                <div 
                                  className="absolute border-l border-b border-gray-600 rounded-bl"
                                  style={{ 
                                    width: '16px',
                                    height: '16px',
                                    left: '0',
                                    top: '0'
                                  }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Галочка для выбранного */}
                        {isSelected && (
                          <span className="mr-1 text-green-400 flex-shrink-0" style={{ fontSize: '14px' }}>✓</span>
                        )}
                        
                        {/* Имя и уровень */}
                        <span 
                          className={`flex-1 ${
                            user.depth === 0 ? 'text-purple-300' :
                            user.depth === 1 ? 'text-blue-300' :
                            user.depth === 2 ? 'text-rose-300' :
                            'text-amber-300'
                          }`}
                          style={{ fontWeight: isSelected ? '700' : '500', fontSize: '13px' }}
                        >
                          {user.label}
                        </span>
                        
                        {/* Бейдж с уровнем */}
                        <span 
                          className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                            user.depth === 0 ? 'bg-purple-900 text-purple-200 border border-purple-700' :
                            user.depth === 1 ? 'bg-blue-900 text-blue-200 border border-blue-700' :
                            user.depth === 2 ? 'bg-rose-900 text-rose-200 border border-rose-700' :
                            'bg-amber-900 text-amber-200 border border-amber-700'
                          }`}
                          style={{ fontWeight: '600' }}
                        >
                          {user.level}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            <span style={{ fontWeight: '600', fontSize: '12px' }}>
              Просмотр как: {userName || 'Администратор'}
            </span>
          </div>
        )}
      </div>
      
      {/* Подсказка для демо-режима */}
      {demoMode && usersList.length > 0 && (
        <div className="hidden lg:block text-xs text-amber-700">
          Переключайтесь между пользователями для проверки MLM-логики
        </div>
      )}
      
      {/* Кнопка очистки транзакций */}
      {demoMode && (
        <button
          className={`bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors ${isClearing ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleClearTransactions}
          disabled={isClearing}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
          <span style={{ fontWeight: '600', fontSize: '12px' }}>
            {isClearing ? 'Очистка...' : 'Очистить транзакции'}
          </span>
        </button>
      )}
    </div>
  );
}
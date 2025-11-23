import { useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Shield, User, CheckCircle, XCircle } from 'lucide-react';

interface CatalogDebugProps {
  currentUser: any;
}

export function CatalogDebug({ currentUser }: CatalogDebugProps) {
  const isAdmin = currentUser?.isAdmin === true || 
                  currentUser?.email === 'admin@admin.com' || 
                  currentUser?.id === 'ceo' || 
                  currentUser?.id === '1';
  
  useEffect(() => {
    console.log('🔍 CatalogDebug - Current User:', currentUser);
    console.log('🔍 CatalogDebug - isAdmin:', isAdmin);
  }, [currentUser, isAdmin]);
  
  return (
    <Card className="p-6 mb-6 border-2 border-amber-500 bg-amber-50">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          {isAdmin ? (
            <Shield className="w-6 h-6 text-amber-600" />
          ) : (
            <User className="w-6 h-6 text-amber-600" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-amber-900 mb-2">
            🔧 Диагностика доступа к управлению товарами
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Имя пользователя:</span>
              <span>{currentUser?.имя || 'Не задано'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold">Email:</span>
              <span>{currentUser?.email || 'Не задано'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold">ID пользователя:</span>
              <span>{currentUser?.id || 'Не задано'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold">Флаг isAdmin:</span>
              {currentUser?.isAdmin === true ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>true</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>{String(currentUser?.isAdmin)}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold">Проверка admin email:</span>
              {currentUser?.email === 'admin@admin.com' ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Совпадает</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-600">
                  <XCircle className="w-4 h-4" />
                  <span>Не совпадает</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-4 p-3 bg-white rounded border">
              <span className="font-bold">Итоговый статус админа:</span>
              {isAdmin ? (
                <div className="flex items-center gap-1 text-green-600 font-bold">
                  <CheckCircle className="w-5 h-5" />
                  <span>АДМИН</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600 font-bold">
                  <XCircle className="w-5 h-5" />
                  <span>НЕ АДМИН</span>
                </div>
              )}
            </div>
          </div>
          
          {!isAdmin && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              <p className="font-semibold">❌ Управление товарами недоступно</p>
              <p className="mt-1">
                Для доступа к функциям управления нужен статус админа. 
                Войдите как пользователь с ID 1 или email admin@admin.com
              </p>
            </div>
          )}
          
          {isAdmin && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              <p className="font-semibold">✅ Управление товарами доступно</p>
              <p className="mt-1">
                Вы должны видеть кнопки "Добавить товар", "Редактировать", "Архивировать" и другие функции управления.
              </p>
            </div>
          )}
          
          <Button
            onClick={() => {
              console.log('📋 Full currentUser object:', currentUser);
              alert(`Информация выведена в консоль разработчика (F12)`);
            }}
            variant="outline"
            className="mt-4"
          >
            Вывести полную информацию в консоль
          </Button>
        </div>
      </div>
    </Card>
  );
}
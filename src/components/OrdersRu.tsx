import { useState } from 'react';
import { LayoutGrid, BarChart3, Columns, Table, Zap } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { OrdersVariant1 } from './orders/OrdersVariant1';
import { OrdersVariant2 } from './orders/OrdersVariant2';
import { OrdersVariant3 } from './orders/OrdersVariant3';
import { OrdersVariant4 } from './orders/OrdersVariant4';
import { OrdersVariant5 } from './orders/OrdersVariant5';

interface OrdersRuProps {
  currentUser: any;
  refreshTrigger: number;
}

export function OrdersRu({ currentUser, refreshTrigger }: OrdersRuProps) {
  const [activeVariant, setActiveVariant] = useState<number>(1);

  const variants = [
    {
      id: 1,
      name: 'Премиум',
      description: 'Детальный просмотр с поиском и фильтрами',
      icon: LayoutGrid,
      component: OrdersVariant1,
      color: 'from-blue-500 to-purple-500'
    },
    {
      id: 2,
      name: 'Аналитика',
      description: 'Графики, KPI и статистика продаж',
      icon: BarChart3,
      component: OrdersVariant2,
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 3,
      name: 'Kanban',
      description: 'Доска с перетаскиванием карточек',
      icon: Columns,
      component: OrdersVariant3,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 4,
      name: 'Таблица',
      description: 'Сортировка и массовые операции',
      icon: Table,
      component: OrdersVariant4,
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 5,
      name: 'Компактный',
      description: 'Быстрые фильтры и бесконечный скролл',
      icon: Zap,
      component: OrdersVariant5,
      color: 'from-cyan-500 to-blue-500'
    },
  ];

  const ActiveComponent = variants.find(v => v.id === activeVariant)?.component || OrdersVariant1;

  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[#1E1E1E] mb-2 text-2xl font-bold">
          История заказов
        </h1>
        <p className="text-[#666]">Выберите вариант отображения для тестирования</p>
      </div>

      {/* Variant Selector */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-lg mb-6 overflow-hidden bg-gradient-to-br from-white to-gray-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {variants.map((variant) => {
              const Icon = variant.icon;
              const isActive = activeVariant === variant.id;
              
              return (
                <button
                  key={variant.id}
                  onClick={() => setActiveVariant(variant.id)}
                  className={`relative p-4 rounded-xl transition-all duration-300 text-left group ${
                    isActive
                      ? 'bg-gradient-to-br ' + variant.color + ' text-white shadow-xl scale-105'
                      : 'bg-white hover:bg-gray-50 text-[#666] border-2 border-[#E6E9EE] hover:border-[#39B7FF]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all ${
                    isActive 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-gradient-to-br ' + variant.color + ' group-hover:scale-110'
                  }`}>
                    <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white'}`} />
                  </div>
                  
                  <h3 className={`font-bold mb-1 ${isActive ? 'text-white' : 'text-[#1E1E1E]'}`}>
                    {variant.name}
                  </h3>
                  <p className={`text-xs ${isActive ? 'text-white/90' : 'text-[#666]'}`}>
                    {variant.description}
                  </p>
                  
                  {isActive && (
                    <div className="mt-3 text-xs font-semibold text-white/90 flex items-center gap-1">
                      ✓ Активен
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info Banner */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              💡 <span className="font-semibold">Тестовый режим:</span> После выбора лучшего варианта, остальные будут удалены.
              Все варианты работают с реальными данными из вашей базы.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Variant Component */}
      <ActiveComponent currentUser={currentUser} refreshTrigger={refreshTrigger} />
    </div>
  );
}

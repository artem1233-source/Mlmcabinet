/**
 * 🌳 Компонент для рендеринга древовидной структуры команды пользователей
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown, Users, Award, Wallet, Calendar, Eye, Shield } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface UserTreeRendererProps {
  user: any;
  allUsers: any[];
  depth: number;
  userRanks: Map<string, number>;
  calculateTotalTeam: (userId: string) => number;
  onUserClick: (user: any, event: React.MouseEvent) => void;
}

export function UserTreeRenderer({ 
  user, 
  allUsers, 
  depth, 
  userRanks, 
  calculateTotalTeam,
  onUserClick 
}: UserTreeRendererProps) {
  const [expanded, setExpanded] = useState(depth === 0); // Первый уровень раскрыт по умолчанию
  
  const children = allUsers.filter(u => u.спонсорId === user.id);
  const hasChildren = children.length > 0;
  const rank = userRanks.get(user.id) ?? 0;
  const totalTeam = calculateTotalTeam(user.id);

  // Цвет ранга
  const getRankColor = (rank: number) => {
    if (rank >= 100) return 'from-purple-400 to-purple-600';
    if (rank >= 50) return 'from-orange-400 to-orange-600';
    if (rank >= 20) return 'from-blue-400 to-blue-600';
    return 'from-gray-400 to-gray-600';
  };

  return (
    <div className="relative">
      {/* Линия связи с родителем */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 w-6 h-6 border-l-2 border-b-2 border-[#E6E9EE] rounded-bl-lg"
          style={{ marginLeft: `${(depth - 1) * 32}px` }}
        />
      )}
      
      <div 
        className={`mb-2 ${depth > 0 ? 'ml-8' : ''}`}
        style={{ marginLeft: depth > 0 ? `${depth * 32}px` : '0' }}
      >
        {/* Карточка пользователя */}
        <div className={`
          group relative bg-white border-2 rounded-xl transition-all duration-200
          ${hasChildren && expanded ? 'border-[#39B7FF] shadow-md' : 'border-[#E6E9EE]'}
          hover:border-[#39B7FF] hover:shadow-lg
        `}>
          <div className="p-3 flex items-center gap-3">
            {/* Кнопка раскрытия */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-[#39B7FF]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#666]" />
                )}
              </Button>
            )}
            
            {/* Аватар */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0
              ${user.isAdmin ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]'}
            `}>
              {user.isAdmin ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>

            {/* Информация */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-[#1E1E1E] truncate" style={{ fontSize: '14px' }}>
                  {user.имя} {user.фамилия}
                </p>
                {user.isAdmin && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs">Admin</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-[#666]">
                <span>ID: {user.id}</span>
                {user.email && <span className="truncate">✉️ {user.email}</span>}
              </div>
            </div>

            {/* Статистика */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Ранг */}
              <Badge className={`bg-gradient-to-r ${getRankColor(rank)} text-white text-xs`}>
                <Award className="w-3 h-3 mr-1" />
                {rank}
              </Badge>

              {/* Команда */}
              <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                <Users className="w-3 h-3 mr-1" />
                {children.length} / {totalTeam}
              </Badge>

              {/* Баланс */}
              <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                <Wallet className="w-3 h-3 mr-1" />
                ₽{(user.баланс || 0).toLocaleString()}
              </Badge>

              {/* Кнопка просмотра */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3"
                onClick={(e) => onUserClick(user, e)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Дата регистрации */}
          {user.зарегистрирован && (
            <div className="px-3 pb-2 text-xs text-[#999] flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(user.зарегистрирован).toLocaleDateString('ru-RU')}
            </div>
          )}
        </div>
      </div>

      {/* Дочерние элементы */}
      {hasChildren && expanded && (
        <div className="relative">
          {children.map((child, index) => (
            <div key={child.id} className="relative">
              <UserTreeRenderer
                user={child}
                allUsers={allUsers}
                depth={depth + 1}
                userRanks={userRanks}
                calculateTotalTeam={calculateTotalTeam}
                onUserClick={onUserClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 🌳 Компонент для рендеринга древовидной структуры команды пользователей
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown, Users, Award, Wallet, Calendar, Eye, Shield, ChevronsDown, ChevronsUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface UserTreeRendererProps {
  user: any;
  allUsers: any[];
  depth: number;
  userRanks: Map<string, number>;
  calculateTotalTeam: (userId: string) => number;
  onUserClick: (user: any, event: React.MouseEvent) => void;
  // 🆕 Новые пропсы для виртуализации (опциональные для обратной совместимости)
  isExpanded?: boolean;
  onToggle?: () => void;
  hasChildren?: boolean;
  childrenCount?: number;
  // 🌳 Массовое управление деревом
  onExpandTree?: () => void;
  onCollapseTree?: () => void;
  // 🆕 Информация о siblings (братьях) для визуальных линий
  isFirstSibling?: boolean;
  isLastSibling?: boolean;
  isOnlySibling?: boolean;
}

export function UserTreeRenderer({ 
  user, 
  allUsers, 
  depth, 
  userRanks, 
  calculateTotalTeam,
  onUserClick,
  isExpanded: isExpandedProp,
  onToggle: onToggleProp,
  hasChildren: hasChildrenProp,
  childrenCount: childrenCountProp,
  onExpandTree,
  onCollapseTree,
  isFirstSibling = false,
  isLastSibling = false,
  isOnlySibling = false,
}: UserTreeRendererProps) {
  // 🔄 Поддержка двух режимов: рекурсивный (старый) и виртуализированный (новый)
  const [expandedInternal, setExpandedInternal] = useState(depth < 2);
  
  const isVirtualized = onToggleProp !== undefined;
  const expanded = isVirtualized ? (isExpandedProp ?? false) : expandedInternal;
  
  const children = allUsers.filter(u => u.спонсорId === user.id);
  const hasChildren = isVirtualized ? (hasChildrenProp ?? false) : children.length > 0;
  const childrenCount = isVirtualized ? (childrenCountProp ?? 0) : children.length;
  const rank = userRanks.get(user.id) ?? user.уровень ?? 0;
  const totalTeam = calculateTotalTeam(user.id);
  
  // 🎯 Расчёт правильного ранга на основе дерева - МАКСИМАЛЬНАЯ ГЛУБИНА!
  const calculateCorrectRank = (): number => {
    if (children.length === 0) return 0;
    
    // ✅ ПРАВИЛЬНО: Ранг = 1 + максимальный ранг среди детей
    let maxChildRank = 0;
    children.forEach(child => {
      const childRank = userRanks.get(child.id) ?? child.уровень ?? 0;
      if (childRank > maxChildRank) {
        maxChildRank = childRank;
      }
    });
    
    return 1 + maxChildRank;
  };
  
  const correctRank = calculateCorrectRank();
  const hasRankError = rank !== correctRank;

  // 🎨 Пастельные цвета рангов (мягкие градиенты)
  const getRankColor = (rank: number) => {
    if (rank >= 100) return 'from-purple-300 to-purple-400';
    if (rank >= 50) return 'from-rose-300 to-pink-400';
    if (rank >= 20) return 'from-blue-300 to-sky-400';
    if (rank >= 10) return 'from-cyan-300 to-teal-400';
    if (rank >= 5) return 'from-emerald-300 to-green-400';
    if (rank >= 2) return 'from-amber-300 to-orange-400';
    if (rank >= 1) return 'from-sky-300 to-blue-400';
    return 'from-slate-300 to-gray-400';
  };
  
  // 🌸 Воздушные пастельные рамки
  const getBorderColor = (rank: number) => {
    if (rank >= 50) return 'border-purple-100';
    if (rank >= 20) return 'border-rose-100';
    if (rank >= 10) return 'border-blue-100';
    if (rank >= 5) return 'border-cyan-100';
    if (rank >= 1) return 'border-emerald-100';
    return 'border-slate-100';
  };

  // 🎨 Цвет линий в зависимости от ранга
  const getLineColor = (rank: number) => {
    if (rank >= 50) return '#E9D5FF'; // purple-200
    if (rank >= 20) return '#FBCFE8'; // rose-200
    if (rank >= 10) return '#B8E0FF'; // blue-200
    if (rank >= 5) return '#A7F3D0'; // emerald-200
    if (rank >= 1) return '#FED7AA'; // orange-200
    return '#E2E8F0'; // slate-200
  };

  return (
    <div className="relative">
      <div 
        className={`transition-all duration-200 ${depth > 0 ? 'ml-6' : ''}`}
        style={{ 
          marginLeft: depth > 0 ? `${depth * 24}px` : '0',
        }}
      >
        {/* 🌸 Воздушная карточка пользователя */}
        <div 
          className={`
            group relative bg-white rounded-xl transition-all duration-300
            border ${hasRankError ? 'border-red-200 bg-red-50/20' : getBorderColor(rank)}
            ${hasRankError ? 'ring-1 ring-red-100' : ''}
            hover:shadow-lg hover:shadow-blue-100/50 hover:border-blue-200 hover:-translate-y-0.5
            ${hasChildren ? 'cursor-pointer hover:bg-blue-50/30 active:scale-[0.99]' : 'cursor-default'}
          `}
          onClick={(e) => {
            // Клик на карточку разворачивает/сворачивает только если есть дети
            if (hasChildren) {
              // Проверяем, что клик не на кнопке "Открыть" или других интерактивных элементах
              const target = e.target as HTMLElement;
              if (!target.closest('button')) {
                if (isVirtualized && onToggleProp) {
                  onToggleProp();
                } else {
                  setExpandedInternal(!expandedInternal);
                }
              }
            }
          }}
          title={hasChildren ? (expanded ? 'Кликните чтобы свернуть' : 'Кликните чтобы развернуть') : undefined}
        >
          <div className="p-2 flex items-center gap-3">
            {/* 🌿 Кнопка раскрытия - воздушная */}
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full hover:bg-blue-50 shrink-0 relative transition-all group-hover:ring-2 group-hover:ring-blue-200/50"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isVirtualized && onToggleProp) {
                    onToggleProp();
                  } else {
                    setExpandedInternal(!expandedInternal);
                  }
                }}
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-blue-400 group-hover:text-blue-500 transition-colors" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                )}
                <div className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
                  {childrenCount}
                </div>
              </Button>
            ) : (
              <div className="w-7 shrink-0"></div>
            )}
            
            {/* 🎨 Аватар с изображением */}
            <div className="relative shrink-0">
              <div className={`
                w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-100/50 transition-transform group-hover:scale-105 overflow-hidden relative
                ${user.isAdmin ? 'bg-gradient-to-br from-purple-300 to-purple-400' : `bg-gradient-to-br ${getRankColor(rank)}`}
              `}>
                {user.аватарка ? (
                  <img 
                    src={user.аватарка} 
                    alt={user.имя}
                    className="w-full h-full object-cover absolute inset-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <span className={user.аватарка ? 'hidden' : ''}>
                  {user.isAdmin ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </span>
              </div>
            </div>

            {/* 📝 Информация - воздушная */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-slate-700 truncate font-semibold text-sm">
                  {user.имя} {user.фамилия}
                </p>
                <Badge 
                  className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-1.5 py-0 text-[10px] cursor-help shrink-0"
                  title="1-я линия / глубина / всего в команде"
                >
                  {childrenCount}/{rank}/{totalTeam}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">ID: {user.id}</span>
                {user.email && <span className="truncate">✉️ {user.email.split('@')[0]}</span>}
                {user.зарегистрирован && (
                  <span className="flex items-center gap-0.5">
                    📅 {new Date(user.зарегистрирован).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </span>
                )}
              </div>
              {/* ⚠️ Индикатор ошибки ранга */}
              {hasRankError && (
                <div className="mt-1">
                  <span className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-red-100 animate-pulse inline-flex items-center gap-1">
                    ⚠️ {rank} → {correctRank}
                  </span>
                </div>
              )}
            </div>

            {/* 📊 Статистика - пастельная */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Команда */}
              <div className="flex items-center gap-1 bg-blue-50/50 border border-blue-100 rounded-lg px-2 py-1 transition-all hover:bg-blue-50">
                <Users className="w-3 h-3 text-blue-400" />
                <div className="flex flex-col items-center">
                  <span className="text-blue-500 text-[9px] font-medium leading-none">Команда</span>
                  <span className="text-blue-600 text-xs font-semibold leading-none mt-0.5">
                    {childrenCount}/{totalTeam}
                  </span>
                </div>
              </div>

              {/* Баланс */}
              <div className="flex items-center gap-1 bg-emerald-50/50 border border-emerald-100 rounded-lg px-2 py-1 transition-all hover:bg-emerald-50">
                <Wallet className="w-3 h-3 text-emerald-400" />
                <div className="flex flex-col items-center">
                  <span className="text-emerald-500 text-[9px] font-medium leading-none">Баланс</span>
                  <span className="text-emerald-600 text-xs font-semibold leading-none mt-0.5">
                    ₽{(user.баланс || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 🌳 Кнопки управления деревом - только для карточек с детьми */}
              {hasChildren && onExpandTree && onCollapseTree && (
                <div className="flex items-center gap-1">
                  {/* 🌟 Раскрыть всё дерево */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg hover:bg-blue-50 border border-blue-100 transition-all hover:border-blue-300 hover:shadow-sm group/expand"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandTree();
                    }}
                    title="Раскрыть всё дерево"
                  >
                    <ChevronsDown className="w-3.5 h-3.5 text-blue-400 group-hover/expand:text-blue-600 transition-colors" />
                  </Button>
                  
                  {/* 📦 Свернуть всё дерево */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg hover:bg-slate-50 border border-slate-200 transition-all hover:border-slate-300 hover:shadow-sm group/collapse"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCollapseTree();
                    }}
                    title="Свернуть всё дерево"
                  >
                    <ChevronsUp className="w-3.5 h-3.5 text-slate-400 group-hover/collapse:text-slate-600 transition-colors" />
                  </Button>
                </div>
              )}

              {/* 👁️ Кнопка просмотра - воздушная */}
              <Button
                variant="default"
                size="sm"
                className="h-8 px-3 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-blue-200/50 transition-all text-xs text-white"
                onClick={(e) => onUserClick(user, e)}
              >
                <Eye className="w-3 h-3 mr-1" />
                Открыть
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Дочерние элементы с анимацией - только в рекурсивном режиме */}
      {!isVirtualized && hasChildren && expanded && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
          {children.map((child, index) => (
            <div 
              key={child.id} 
              className="relative"
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
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

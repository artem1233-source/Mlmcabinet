/**
 * 🚀 Виртуализированное дерево пользователей
 * Рендерит только видимые узлы для максимальной производительности
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo, useState, useEffect } from 'react';
import { Search, X, Filter, TrendingUp, Users as UsersIcon, Layers, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { UserTreeRenderer } from './UserTreeRenderer';
import { flattenTree, expandPathToUser, findPathToUser } from '../utils/treeUtils';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface VirtualizedTreeViewProps {
  allUsers: any[];
  userRanks: Map<string, number>;
  calculateTotalTeam: (userId: string) => number;
  onUserClick: (user: any, event: React.MouseEvent) => void;
  onRecalculateRanks?: () => void;
  isRecalculating?: boolean;
}

export function VirtualizedTreeView({
  allUsers,
  userRanks,
  calculateTotalTeam,
  onUserClick,
  onRecalculateRanks,
  isRecalculating = false,
}: VirtualizedTreeViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // 🎨 Цвет линий в зависимости от ранга
  const getLineColor = (rank: number) => {
    if (rank >= 50) return '#E9D5FF'; // purple-200
    if (rank >= 20) return '#FBCFE8'; // rose-200
    if (rank >= 10) return '#B8E0FF'; // blue-200
    if (rank >= 5) return '#A7F3D0'; // emerald-200
    if (rank >= 1) return '#FED7AA'; // orange-200
    return '#E2E8F0'; // slate-200
  };
  
  // 🎯 Состояния
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // По умолчанию раскрываем первые 2 уровня
    const initialExpanded = new Set<string>();
    const rootUsers = allUsers.filter(u => !u.спонсорId && !u.isAdmin);
    
    rootUsers.slice(0, 10).forEach(root => {
      initialExpanded.add(root.id);
      // Раскрываем первый уровень детей
      if (root.команда) {
        root.команда.slice(0, 5).forEach((childId: string) => {
          initialExpanded.add(childId);
        });
      }
    });
    
    return initialExpanded;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const [renderTime, setRenderTime] = useState<number>(0);
  const [searchResultsCount, setSearchResultsCount] = useState<number>(0);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // 🎨 Преобразуем фильтр ранга в диапазон
  const rankRange = useMemo(() => {
    switch (rankFilter) {
      case 'high': return { min: 20, max: 999 };
      case 'medium': return { min: 5, max: 19 };
      case 'low': return { min: 1, max: 4 };
      default: return undefined;
    }
  }, [rankFilter]);
  
  // 🔄 Создаём плоский список с учётом раскрытых узлов и фильтров
  const flatList = useMemo(() => {
    const startTime = performance.now();
    const result = flattenTree(allUsers, expandedIds, userRanks, searchQuery, rankRange);
    const endTime = performance.now();
    setRenderTime(endTime - startTime);
    return result;
  }, [allUsers, expandedIds, userRanks, searchQuery, rankRange]);
  
  // 📊 Статистика
  const stats = useMemo(() => {
    const totalPartners = allUsers.filter(u => !u.isAdmin).length;
    const visibleNodes = flatList.length;
    const expandedCount = expandedIds.size;
    const maxRank = Math.max(...Array.from(userRanks.values()), 0);
    
    return {
      total: totalPartners,
      visible: visibleNodes,
      expanded: expandedCount,
      maxRank,
    };
  }, [allUsers, flatList, expandedIds, userRanks]);
  
  // 🎯 Виртуализатор
  const virtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90, // Примерная высота карточки
    overscan: 10, // Рендерим 10 дополнительных элементов для плавности
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined, // Измеряем реальные размеры (кроме Firefox)
  });
  
  // 🔍 Обработка поиска
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim()) {
      // Ищем совпадения среди ВСЕХ пользователей
      const q = query.toLowerCase();
      const matchingUsers = allUsers.filter(user => {
        if (user.isAdmin) return false;
        const fullName = `${user.имя || ''} ${user.фамилия || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const id = (user.id || '').toLowerCase();
        const phone = (user.телефон || '').toLowerCase();
        return fullName.includes(q) || email.includes(q) || id.includes(q) || phone.includes(q);
      });
      
      setSearchResults(matchingUsers);
      setSearchResultsCount(matchingUsers.length);
      setCurrentResultIndex(0);
      
      if (matchingUsers.length > 0) {
        navigateToResult(matchingUsers[0]);
      } else {
        setHighlightedUserId(null);
      }
    } else {
      setHighlightedUserId(null);
      setSearchResultsCount(0);
      setSearchResults([]);
      setCurrentResultIndex(0);
    }
  };
  
  // 🎯 Навигация к результату поиска
  const navigateToResult = (user: any) => {
    setHighlightedUserId(user.id);
    
    // Автоматически раскрываем путь к найденному пользователю
    const pathToExpand = expandPathToUser(user.id, allUsers, expandedIds);
    setExpandedIds(pathToExpand);
    
    // Прокручиваем к элементу после обновления дерева
    setTimeout(() => {
      const index = flatList.findIndex(n => n.id === user.id);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'center' });
      }
    }, 150);
  };
  
  // 🎯 Переключение раскрытия узла
  const toggleNode = (nodeId: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  
  // 🌟 Раскрыть все корневые узлы
  const expandAllRoots = () => {
    const rootUsers = allUsers.filter(u => !u.спонсорId && !u.isAdmin);
    setExpandedIds(new Set(rootUsers.map(u => u.id)));
  };
  
  // 📦 Свернуть всё
  const collapseAll = () => {
    setExpandedIds(new Set());
  };
  
  // 🌳 Получить всех потомков пользователя рекурсивно
  const getAllDescendants = (userId: string): string[] => {
    const descendants: string[] = [];
    const children = allUsers.filter(u => u.спонсорId === userId);
    
    children.forEach(child => {
      descendants.push(child.id);
      descendants.push(...getAllDescendants(child.id));
    });
    
    return descendants;
  };
  
  // 🌟 Раскрыть всё дерево конкретного пользователя
  const expandUserTree = (userId: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      
      // Добавляем всех потомков
      const descendants = getAllDescendants(userId);
      descendants.forEach(id => newSet.add(id));
      
      return newSet;
    });
  };
  
  // 📦 Свернуть всё дерево конкретного пользователя
  const collapseUserTree = (userId: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      
      // Удаляем всех потомков
      const descendants = getAllDescendants(userId);
      descendants.forEach(id => newSet.delete(id));
      
      // Удаляем самого пользователя
      newSet.delete(userId);
      
      return newSet;
    });
  };
  
  // 🎨 Сброс фильтров
  const resetFilters = () => {
    setSearchQuery('');
    setRankFilter('all');
    setHighlightedUserId(null);
    setSearchResultsCount(0);
    setSearchResults([]);
    setCurrentResultIndex(0);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* 🎛️ Панель управления - воздушная */}
      <Card className="mb-3 border-slate-100 shadow-sm">
        <CardContent className="p-3">
          {/* Поиск и быстрые действия */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999]" />
              <Input
                placeholder="Поиск по имени, email, ID, телефону..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-8"
              />
              {searchQuery && (
                <>
                  {searchResultsCount > 0 && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                      <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Найдено: {searchResultsCount}
                      </Badge>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => handleSearch('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            
            {/* Навигация по результатам поиска */}
            {searchResultsCount > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => {
                    const newIndex = currentResultIndex > 0 ? currentResultIndex - 1 : searchResults.length - 1;
                    setCurrentResultIndex(newIndex);
                    navigateToResult(searchResults[newIndex]);
                  }}
                  disabled={searchResults.length === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-xs text-slate-500 px-2 min-w-[60px] text-center font-medium">
                  {currentResultIndex + 1} / {searchResultsCount}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => {
                    const newIndex = currentResultIndex < searchResults.length - 1 ? currentResultIndex + 1 : 0;
                    setCurrentResultIndex(newIndex);
                    navigateToResult(searchResults[newIndex]);
                  }}
                  disabled={searchResults.length === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            <Select value={rankFilter} onValueChange={(v: any) => setRankFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все ранги</SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-300 to-purple-400"></div>
                    Высокие (20+)
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-300 to-green-400"></div>
                    Средние (5-19)
                  </div>
                </SelectItem>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-300 to-orange-400"></div>
                    Низкие (1-4)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {(searchQuery || rankFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="shrink-0"
              >
                <X className="w-4 h-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>
          
          {/* 📊 Статистика и действия - воздушные */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <UsersIcon className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-slate-400">
                  Показано: <span className="font-semibold text-slate-600">{stats.visible}</span> из {stats.total}
                </span>
              </div>
              <div className="w-px h-4 bg-slate-100"></div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-400">
                  Раскрыто: <span className="font-semibold text-slate-600">{stats.expanded}</span>
                </span>
              </div>
              <div className="w-px h-4 bg-slate-100"></div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-300" />
                <span className="text-xs text-slate-400">
                  Макс. ранг: <span className="font-semibold text-slate-600">{stats.maxRank}</span>
                </span>
              </div>
              {renderTime > 0 && (
                <>
                  <div className="w-px h-4 bg-slate-100"></div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium ${renderTime < 100 ? 'text-emerald-400' : renderTime < 500 ? 'text-amber-400' : 'text-rose-400'}`}>
                      ⚡ {renderTime.toFixed(0)}ms
                    </span>
                  </div>
                </>
              )}
            </div>
            
            {/* 🎨 Цветовая шкала рангов */}
            <div className="flex items-center gap-2 bg-slate-50/60 rounded-lg px-3 py-1.5 border border-slate-100/80">
              <span className="text-slate-500 text-[10px] font-semibold whitespace-nowrap">РАНГИ:</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-slate-300 to-gray-400"></div>
                  <span className="text-[9px] text-slate-400 font-medium">0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-sky-300 to-blue-400"></div>
                  <span className="text-[9px] text-slate-400 font-medium">1</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-400"></div>
                  <span className="text-[9px] text-slate-400 font-medium">2-4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-300 to-green-400"></div>
                  <span className="text-[9px] text-slate-400 font-medium">5-9</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-300 to-teal-400"></div>
                  <span className="text-[9px] text-slate-400 font-medium">10-19</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-300 to-sky-400"></div>
                  <span className="text-[9px] text-slate-400 font-medium">20-49</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-300 to-pink-400"></div>
                  <span className="text-[9px] text-slate-400 font-medium">50-99</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-300 to-purple-400"></div>
                  <span className="text-[9px] text-slate-400 font-medium">100+</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAllRoots}
                className="text-xs"
              >
                Раскрыть корни
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="text-xs"
              >
                Свернуть всё
              </Button>
              {onRecalculateRanks && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onRecalculateRanks}
                  className="bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white shadow-sm text-xs"
                  disabled={isRecalculating || allUsers.length === 0}
                >
                  <Award className="w-3.5 h-3.5 mr-1" />
                  🔄 Пересчитать ранги
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 🌳 Виртуализированное дерево - воздушный фон */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto bg-gradient-to-b from-white via-blue-50/20 to-slate-50/30 rounded-xl border border-slate-100 scroll-smooth"
        style={{ height: '800px' }}
      >
        {flatList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
            <UsersIcon className="w-16 h-16 mb-4 text-slate-200" />
            <p className="text-slate-500 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
              {rankFilter !== 'all' ? 'Ничего не найдено' : 'Нет данных'}
            </p>
            <p className="text-slate-400 mb-4" style={{ fontSize: '14px' }}>
              {rankFilter !== 'all' 
                ? 'Попробуйте изменить фильтр рангов' 
                : 'Добавьте пользователей для отображения дерева'}
            </p>
            {rankFilter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                <X className="w-4 h-4 mr-2" />
                Сбросить фильтры
              </Button>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {/* 🔗 СЛОЙ СОЕДИНИТЕЛЬНЫХ ЛИНИЙ - рисуем ОДНУ линию для каждой группы siblings */}
            {(() => {
              const virtualItems = virtualizer.getVirtualItems();
              const lines: JSX.Element[] = [];
              const processedGroups = new Set<string>();
              
              // Группируем siblings по parentId + depth
              virtualItems.forEach((virtualItem) => {
                const node = flatList[virtualItem.index];
                
                if (node.depth === 0 || node.isOnlySibling) return;
                
                const groupKey = `${node.parentId}_${node.depth}`;
                if (processedGroups.has(groupKey)) return;
                
                // Это первый sibling в группе - найдем последнего
                if (node.isFirstSibling) {
                  processedGroups.add(groupKey);
                  
                  // Найти последнего sibling в ВИДИМЫХ элементах
                  const lastSiblingVirtual = virtualItems.find(vi => {
                    const n = flatList[vi.index];
                    return n.parentId === node.parentId && n.depth === node.depth && n.isLastSibling;
                  });
                  
                  if (lastSiblingVirtual) {
                    const lastNode = flatList[lastSiblingVirtual.index];
                    const rank = userRanks.get(node.user.id) ?? node.user.уровень ?? 0;
                    
                    // Позиция вертикальной линии - там, где начинаются горизонтальные отводы
                    const lineLeft = 16 + node.depth * 24; // px-4 (16px) + полный отступ глубины
                    
                    // Середина карточки: py-1 (4px сверху) + примерно 45px до середины
                    const cardMiddleOffset = 49; 
                    
                    // Рисуем ОДНУ вертикальную линию от середины первого до середины последнего
                    lines.push(
                      <div
                        key={groupKey}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${lineLeft}px`,
                          top: `${virtualItem.start + cardMiddleOffset}px`,
                          height: `${lastSiblingVirtual.start - virtualItem.start}px`,
                          width: '2px',
                          borderLeft: `2px dashed ${getLineColor(rank)}`,
                          opacity: 0.5,
                        }}
                      />
                    );
                  }
                }
              });
              
              return lines;
            })()}
            
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const node = flatList[virtualItem.index];
              const isHighlighted = highlightedUserId === node.id;
              
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={`transition-all duration-300`}
                >
                  {/* 🔗 Горизонтальный отвод от вертикальной линии к карточке */}
                  {node.depth > 0 && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${16 + node.depth * 24}px`, // Позиция вертикальной линии siblings
                        top: 'calc(50% + 4px)', // Середина карточки с учетом py-1
                        width: `${24}px`, // Фиксированная длина отвода до карточки
                        height: '2px',
                        borderTop: `2px dashed ${getLineColor(userRanks.get(node.user.id) ?? node.user.уровень ?? 0)}`,
                        opacity: 0.5,
                      }}
                    />
                  )}
                  
                  <div className={`px-4 py-1 ${
                    isHighlighted ? 'bg-amber-50/50 ring-2 ring-amber-200 rounded-xl' : ''
                  }`}>
                    <UserTreeRenderer
                    user={node.user}
                    allUsers={allUsers}
                    depth={node.depth}
                    userRanks={userRanks}
                    calculateTotalTeam={calculateTotalTeam}
                    onUserClick={onUserClick}
                    isExpanded={node.isExpanded}
                    onToggle={() => toggleNode(node.id)}
                    hasChildren={node.hasChildren}
                    childrenCount={node.childrenCount}
                    onExpandTree={() => expandUserTree(node.id)}
                    onCollapseTree={() => collapseUserTree(node.id)}
                    isFirstSibling={node.isFirstSibling}
                    isLastSibling={node.isLastSibling}
                    isOnlySibling={node.isOnlySibling}
                  />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* 💡 Подсказка */}
      {flatList.length > 0 && (
        <div className="mt-2 text-center">
          {searchQuery ? (
            <p className="text-xs text-slate-400">
              💡 Поиск подсвечивает совпадения мягким цветом. Все узлы можно раскрывать/сворачивать
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              💡 Используйте поиск для быстрого нахождения партнёра в дереве
            </p>
          )}
        </div>
      )}
    </div>
  );
}

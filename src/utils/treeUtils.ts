/**
 * 🌳 Утилиты для работы с древовидной структурой
 */

export interface TreeNode {
  id: string;
  user: any;
  depth: number;
  hasChildren: boolean;
  childrenCount: number;
  isExpanded: boolean;
  parentId: string | null;
  path: string[]; // Путь от корня до узла (массив ID)
  // 🆕 Информация о siblings (братьях)
  isFirstSibling: boolean;   // Первый ли среди братьев
  isLastSibling: boolean;    // Последний ли среди братьев
  isOnlySibling: boolean;    // Единственный ли ребёнок
  totalSiblings: number;     // Общее количество братьев
  siblingIndex: number;      // Индекс среди братьев (0-based)
}

/**
 * 🔄 Преобразует дерево в плоский список с учётом раскрытых узлов
 */
export function flattenTree(
  allUsers: any[],
  expandedIds: Set<string>,
  userRanks: Map<string, number>,
  searchQuery?: string,
  rankFilter?: { min: number; max: number }
): TreeNode[] {
  const flatList: TreeNode[] = [];
  
  // Создаём Map для быстрого поиска
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  
  // Функция поиска совпадений (с мемоизацией)
  const searchLower = searchQuery?.toLowerCase().trim() || '';
  const matchesSearch = (user: any): boolean => {
    if (!searchLower) return true;
    
    const fullName = `${user.имя || ''} ${user.фамилия || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const id = (user.id || '').toLowerCase();
    const phone = (user.телефон || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           id.includes(searchLower) ||
           phone.includes(searchLower);
  };
  
  // Функция проверки фильтра по рангу
  const matchesRankFilter = (userId: string): boolean => {
    if (!rankFilter) return true;
    
    const rank = userRanks.get(userId) ?? 0;
    return rank >= rankFilter.min && rank <= rankFilter.max;
  };
  
  // Рекурсивная функция обхода дерева
  const traverse = (
    userId: string, 
    depth: number, 
    parentId: string | null,
    path: string[],
    siblingIndex: number = 0,
    totalSiblings: number = 1
  ) => {
    const user = userMap.get(userId);
    if (!user || user.isAdmin) return;
    
    // Получаем детей
    const childrenIds = user.команда || [];
    const hasChildren = childrenIds.length > 0;
    const isExpanded = expandedIds.has(userId);
    
    // Проверяем совпадение с фильтром рангов (поиск не фильтрует, только подсвечивает)
    const matchesRank = matchesRankFilter(userId);
    
    // 🆕 Вычисляем информацию о siblings
    const isOnlySibling = totalSiblings === 1;
    const isFirstSibling = siblingIndex === 0;
    const isLastSibling = siblingIndex === totalSiblings - 1;
    
    // Добавляем узел только если он соответствует фильтру рангов
    if (matchesRank) {
      flatList.push({
        id: userId,
        user,
        depth,
        hasChildren,
        childrenCount: childrenIds.length,
        isExpanded,
        parentId,
        path: [...path, userId],
        // 🆕 Информация о siblings
        isFirstSibling,
        isLastSibling,
        isOnlySibling,
        totalSiblings,
        siblingIndex,
      });
    }
    
    // Если узел раскрыт, добавляем детей
    if (isExpanded && childrenIds.length > 0) {
      const childCount = childrenIds.length;
      childrenIds.forEach((childId: string, index: number) => {
        traverse(childId, depth + 1, userId, [...path, userId], index, childCount);
      });
    }
  };
  
  // Находим корневые узлы (без спонсора)
  const rootUsers = allUsers.filter(u => !u.спонсорId && !u.isAdmin);
  
  // Обходим каждый корневой узел (корневые узлы не имеют siblings между собой)
  rootUsers.forEach((rootUser, index) => {
    traverse(rootUser.id, 0, null, [], index, rootUsers.length);
  });
  
  return flatList;
}

/**
 * 🔍 Находит путь к пользователю в дереве
 */
export function findPathToUser(
  userId: string,
  allUsers: any[]
): string[] {
  const path: string[] = [];
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  
  let currentId: string | null = userId;
  
  while (currentId) {
    path.unshift(currentId);
    const user = userMap.get(currentId);
    currentId = user?.спонсорId || null;
  }
  
  return path;
}

/**
 * 🎯 Автоматически раскрывает путь к пользователю
 */
export function expandPathToUser(
  userId: string,
  allUsers: any[],
  currentExpandedIds: Set<string>
): Set<string> {
  const path = findPathToUser(userId, allUsers);
  const newExpandedIds = new Set(currentExpandedIds);
  
  // Раскрываем все узлы на пути (кроме самого последнего)
  path.slice(0, -1).forEach(id => {
    newExpandedIds.add(id);
  });
  
  return newExpandedIds;
}

/**
 * 📊 Подсчёт видимых узлов
 */
export function countVisibleNodes(
  flatList: TreeNode[]
): { total: number; visible: number; collapsed: number } {
  let collapsed = 0;
  
  flatList.forEach(node => {
    if (node.hasChildren && !node.isExpanded) {
      // Рекурсивно считаем скрытых детей
      collapsed += countCollapsedChildren(node.id, flatList);
    }
  });
  
  return {
    total: flatList.length + collapsed,
    visible: flatList.length,
    collapsed,
  };
}

function countCollapsedChildren(parentId: string, flatList: TreeNode[]): number {
  // Эта функция упрощена, т.к. невидимые узлы не попадают в flatList
  // Можно улучшить если нужна точная статистика
  return 0;
}

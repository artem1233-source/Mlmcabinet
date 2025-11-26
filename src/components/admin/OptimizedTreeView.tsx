import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, User, Users, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface TreeNode {
  id: string;
  имя: string;
  фамилия: string;
  email: string;
  партнёрскийID: string;
  уровень: number;
  спонсор: string | null;
  команда: string[];
  зарегистрирован: string;
  childCount?: number; // 🆕 Количество детей без загрузки
  children?: TreeNode[]; // Загружаются по требованию
  isLoaded?: boolean; // Флаг загрузки детей
}

interface OptimizedTreeViewProps {
  currentUser: any;
}

export function OptimizedTreeView({ currentUser }: OptimizedTreeViewProps) {
  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    loadRootNodes();
  }, []);

  const loadRootNodes = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Id': userId || '',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки пользователей');
      }

      const allUsers = data.users || [];
      
      // Filter to get only root nodes (no sponsor)
      const roots = allUsers
        .filter((u: any) => !u.спонсор && u.type !== 'admin')
        .map((u: any) => ({
          ...u,
          childCount: u.команда?.length || 0,
          isLoaded: false,
          children: []
        }))
        .sort((a: any, b: any) => 
          new Date(a.зарегистрирован).getTime() - new Date(b.зарегистрирован).getTime()
        );

      setRootNodes(roots);
      setTotalUsers(allUsers.filter((u: any) => u.type !== 'admin').length);
      toast.success(`Загружено ${roots.length} корневых пользователей`);
    } catch (error) {
      console.error('Error loading root nodes:', error);
      toast.error('Ошибка загрузки структуры команды');
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async (parentId: string) => {
    try {
      setLoadingChildren(prev => new Set(prev).add(parentId));
      const userId = localStorage.getItem('userId');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Id': userId || '',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки детей');
      }

      const allUsers = data.users || [];
      
      // Get children of this parent
      const children = allUsers
        .filter((u: any) => u.спонсор === parentId && u.type !== 'admin')
        .map((u: any) => ({
          ...u,
          childCount: u.команда?.length || 0,
          isLoaded: false,
          children: []
        }))
        .sort((a: any, b: any) => 
          new Date(a.зарегистрирован).getTime() - new Date(b.зарегистрирован).getTime()
        );

      // Update tree recursively
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            return { ...node, children, isLoaded: true };
          }
          if (node.children && node.children.length > 0) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };

      setRootNodes(updateNode(rootNodes));
    } catch (error) {
      console.error('Error loading children:', error);
      toast.error('Ошибка загрузки дочерних элементов');
    } finally {
      setLoadingChildren(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    }
  };

  const toggleNode = async (nodeId: string, node: TreeNode) => {
    const isExpanded = expandedNodes.has(nodeId);
    
    if (isExpanded) {
      // Collapse
      const newExpanded = new Set(expandedNodes);
      newExpanded.delete(nodeId);
      setExpandedNodes(newExpanded);
    } else {
      // Expand
      if (!node.isLoaded && node.childCount && node.childCount > 0) {
        // Load children if not loaded
        await loadChildren(nodeId);
      }
      const newExpanded = new Set(expandedNodes);
      newExpanded.add(nodeId);
      setExpandedNodes(newExpanded);
    }
  };

  const renderNode = (node: TreeNode, level: number = 0): JSX.Element => {
    const hasChildren = (node.childCount || 0) > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isLoadingChildren = loadingChildren.has(node.id);
    const isCurrentUser = node.id === currentUser?.id;

    return (
      <div key={node.id} className="mb-0.5">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
            isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          }`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => hasChildren && toggleNode(node.id, node)}
        >
          {/* Expand/Collapse button */}
          {hasChildren ? (
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {isLoadingChildren ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#39B7FF]" />
              ) : isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </div>
          ) : (
            <div className="w-5" />
          )}

          {/* User avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
            node.уровень === 3
              ? 'bg-gradient-to-br from-yellow-500 to-yellow-700'
              : node.уровень === 2
              ? 'bg-gradient-to-br from-blue-500 to-blue-700'
              : 'bg-gradient-to-br from-gray-400 to-gray-600'
          }`}>
            <User className="w-4 h-4" />
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">
                {node.имя} {node.фамилия}
              </span>
              {isCurrentUser && (
                <Badge className="bg-blue-500 text-white text-xs">ВЫ</Badge>
              )}
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                P{node.партнёрскийID}
              </Badge>
              <Badge className="bg-gray-100 text-gray-700 text-xs">
                L{node.уровень}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 truncate">
              {node.email}
            </div>
          </div>

          {/* Team count badge */}
          {hasChildren && (
            <Badge className="bg-[#12C9B6] text-white flex items-center gap-1">
              <Users className="w-3 h-3" />
              {node.childCount}
            </Badge>
          )}
        </div>

        {/* Render children if expanded and loaded */}
        {isExpanded && node.isLoaded && node.children && node.children.length > 0 && (
          <div className="mt-0.5">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-[#1E1E1E]">Дерево команды</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {totalUsers.toLocaleString()} пользователей
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadRootNodes}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#39B7FF] animate-spin" />
          </div>
        ) : rootNodes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Нет корневых пользователей</p>
          </div>
        ) : (
          <div className="space-y-0.5 max-h-[600px] overflow-y-auto">
            {rootNodes.map(node => renderNode(node))}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
              💡
            </div>
            <p>
              <strong>Совет:</strong> Кликните на пользователя с командой, чтобы раскрыть дочерние элементы. 
              Данные загружаются по требованию для ускорения работы.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

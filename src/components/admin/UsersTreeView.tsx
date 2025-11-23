import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, User, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import * as api from '../../utils/api';
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
  children: TreeNode[];
}

interface UsersTreeViewProps {
  currentUser: any;
}

export function UsersTreeView({ currentUser }: UsersTreeViewProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    try {
      setLoading(true);
      const response = await api.getUsersTree();
      if (response.success) {
        setTree(response.tree);
        setTotalUsers(response.totalUsers);
        toast.success('Структура команды загружена');
      }
    } catch (error) {
      console.error('Error loading tree:', error);
      toast.error('Ошибка загрузки структуры команды');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(tree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isCurrentUser = node.id === currentUser?.id;

    return (
      <div key={node.id} className="mb-1">
        <div
          className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-colors ${
            isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {/* Expand/Collapse button */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* User icon */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
            <User className="w-4 h-4" />
          </div>

          {/* User info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {node.имя} {node.фамилия}
              </span>
              {isCurrentUser && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                  ВЫ
                </span>
              )}
              {node.isAdmin && (
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                  АДМИН
                </span>
              )}
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                #{node.партнёрскийID}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                LVL {node.уровень}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {node.email}
            </div>
          </div>

          {/* Team count */}
          {hasChildren && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{node.children.length}</span>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Древовидная структура партнёров
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Загрузка структуры...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Древовидная структура партнёров
            <span className="text-sm font-normal text-gray-500">
              ({totalUsers} пользователей)
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Развернуть всё
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Свернуть всё
            </Button>
            <Button variant="outline" size="sm" onClick={loadTree}>
              Обновить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tree.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Нет пользователей в системе
          </div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {tree.map(node => renderNode(node))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

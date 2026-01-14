import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  ZoomIn, ZoomOut, Maximize2, Users, Wallet, TrendingUp, 
  Phone, MessageCircle, Send, X, ChevronDown, ChevronRight,
  Home, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface TreeNode {
  id: string;
  name: string;
  balance: number;
  level: number;
  isExpanded: boolean;
  children: TreeNode[];
  directChildren: number;
  totalTeam: number;
  lastActive?: string;
  phone?: string;
  telegram?: string;
  whatsapp?: string;
  refCode: string;
  x?: number; // позиция для рендеринга
  y?: number;
  width?: number;
}

interface TreeVisualizationProps {
  currentUser: any;
  refreshTrigger?: number;
}

export function TreeVisualization({ currentUser, refreshTrigger }: TreeVisualizationProps) {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTreeData();
  }, [currentUser, refreshTrigger]);

  const loadTreeData = async () => {
    setLoading(true);
    try {
      const response = await api.getUserTeam(currentUser?.id);
      
      if (response.success && response.team) {
        const tree = buildTreeStructure(currentUser, response.team);
        setTreeData(tree);
        
        // Центрируем дерево
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setPan({ x: rect.width / 2, y: 80 });
        }
      }
    } catch (error) {
      console.error('❌ Error loading tree:', error);
      toast.error('Не удалось загрузить структуру');
    } finally {
      setLoading(false);
    }
  };

  const buildTreeStructure = (user: any, team: any[]): TreeNode => {
    const userId = user.id;
    // 🔧 ИСПРАВЛЕНИЕ: Используем спонсорId вместо пригласительКод
    const directChildren = team.filter(
      (m: any) => m.спонсорId === userId
    );

    const node: TreeNode = {
      id: user.id,
      name: `${user.имя || user.full_name || 'Вы'} ${user.фамилия || ''}`.trim(),
      balance: user.баланс || user.balance || 0,
      level: user.уровень || user.level || 1,
      isExpanded: true, // По умолчанию раскрыт только первый уровень
      children: [],
      directChildren: directChildren.length,
      totalTeam: team.length,
      lastActive: user.последнийВход || user.last_active,
      phone: user.телефон || user.phone,
      telegram: user.telegram,
      whatsapp: user.whatsapp,
      refCode: user.рефКод || user.ref_code,
    };

    // Рекурсивно строим дерево для детей
    node.children = directChildren.map((child: any) => 
      buildTreeStructure(child, team)
    );

    // Сворачиваем узлы после первого уровня
    node.children.forEach(child => {
      child.isExpanded = false;
    });

    return node;
  };

  const getActivityStatus = (lastActive?: string) => {
    if (!lastActive) return { color: '#9CA3AF', label: 'Неактивен' };
    
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffHours = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return { color: '#10B981', label: 'Онлайн' };
    if (diffHours < 24) return { color: '#F59E0B', label: 'Сегодня' };
    if (diffHours < 168) return { color: '#F97316', label: 'На неделе' };
    return { color: '#9CA3AF', label: 'Неактивен' };
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return '#3B82F6'; // blue
      case 2: return '#8B5CF6'; // purple
      case 3: return '#EC4899'; // pink
      default: return '#6B7280'; // gray
    }
  };

  const toggleNode = (nodeId: string) => {
    if (!treeData) return;

    const toggleNodeRecursive = (node: TreeNode): TreeNode => {
      if (node.id === nodeId) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      return {
        ...node,
        children: node.children.map(toggleNodeRecursive),
      };
    };

    setTreeData(toggleNodeRecursive(treeData));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetView = () => {
    setZoom(1);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: 80 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderNode = (
    node: TreeNode,
    x: number,
    y: number,
    depth: number = 0
  ): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const nodeWidth = 180;
    const nodeHeight = 80;
    const horizontalGap = 200;
    const verticalGap = 140;

    const status = getActivityStatus(node.lastActive);
    const levelColor = getLevelColor(node.level);

    // Рисуем узел
    elements.push(
      <g key={`node-${node.id}`}>
        {/* Карточка партнёра */}
        <rect
          x={x - nodeWidth / 2}
          y={y}
          width={nodeWidth}
          height={nodeHeight}
          rx={12}
          fill="white"
          stroke={status.color}
          strokeWidth={2}
          className="cursor-pointer transition-all hover:stroke-[#39B7FF] hover:shadow-lg"
          onClick={() => setSelectedNode(node)}
        />

        {/* Индикатор статуса */}
        <circle
          cx={x - nodeWidth / 2 + 15}
          cy={y + 15}
          r={5}
          fill={status.color}
        />

        {/* Имя */}
        <text
          x={x}
          y={y + 28}
          textAnchor="middle"
          className="text-sm font-semibold fill-gray-900"
          style={{ fontSize: '13px' }}
        >
          {node.name.length > 18 ? node.name.substring(0, 18) + '...' : node.name}
        </text>

        {/* Реф-код */}
        <text
          x={x}
          y={y + 45}
          textAnchor="middle"
          className="text-xs fill-gray-500"
          style={{ fontSize: '11px', fontFamily: 'monospace' }}
        >
          {node.refCode}
        </text>

        {/* Баланс */}
        <text
          x={x}
          y={y + 63}
          textAnchor="middle"
          className="text-xs font-bold"
          style={{ fontSize: '12px', fill: levelColor }}
        >
          {node.balance.toLocaleString('ru-RU')} ₽
        </text>

        {/* Индикатор детей */}
        {node.children.length > 0 && (
          <g
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(node.id);
            }}
          >
            <circle
              cx={x}
              cy={y + nodeHeight + 10}
              r={12}
              fill={node.isExpanded ? '#39B7FF' : '#E5E7EB'}
              className="transition-all"
            />
            {node.isExpanded ? (
              <path
                d={`M ${x - 4} ${y + nodeHeight + 7} L ${x} ${y + nodeHeight + 13} L ${x + 4} ${y + nodeHeight + 7}`}
                stroke="white"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <path
                d={`M ${x - 4} ${y + nodeHeight + 10} L ${x + 4} ${y + nodeHeight + 10}`}
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}
            <text
              x={x}
              y={y + nodeHeight + 30}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              style={{ fontSize: '10px' }}
            >
              {node.children.length}
            </text>
          </g>
        )}

        {/* Бейдж уровня */}
        <rect
          x={x + nodeWidth / 2 - 35}
          y={y + 5}
          width={30}
          height={18}
          rx={4}
          fill={levelColor}
        />
        <text
          x={x + nodeWidth / 2 - 20}
          y={y + 17}
          textAnchor="middle"
          className="text-xs font-bold fill-white"
          style={{ fontSize: '11px' }}
        >
          L{node.level}
        </text>
      </g>
    );

    // Рисуем детей, если узел раскрыт
    if (node.isExpanded && node.children.length > 0) {
      const totalWidth = (node.children.length - 1) * horizontalGap;
      const startX = x - totalWidth / 2;

      node.children.forEach((child, index) => {
        const childX = startX + index * horizontalGap;
        const childY = y + nodeHeight + verticalGap;

        // Линия к ребёнку
        elements.push(
          <line
            key={`line-${node.id}-${child.id}`}
            x1={x}
            y1={y + nodeHeight + 20}
            x2={childX}
            y2={childY}
            stroke={getLevelColor(child.level)}
            strokeWidth={2}
            strokeDasharray={child.isExpanded ? '0' : '5,5'}
            opacity={0.5}
          />
        );

        // Рекурсивно рисуем ребёнка
        elements.push(...renderNode(child, childX, childY, depth + 1));
      });
    }

    return elements;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка дерева структуры...</p>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Структура не найдена</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и описание */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Визуализация дерева структуры
        </h2>
        <p className="text-gray-600 mb-4">
          Интерактивное дерево партнёрской структуры с возможностью раскрытия каждого уровня
        </p>

        <Card className="p-4 bg-blue-50 border-blue-200 inline-block">
          <div className="space-y-2 text-left text-sm">
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span className="text-gray-700">Визуальное представление иерархии</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔍</span>
              <span className="text-gray-700">Зум и перемещение по дереву</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👆</span>
              <span className="text-gray-700">Клик на партнёра → детальная информация</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📊</span>
              <span className="text-gray-700">Цветовая индикация по статусу активности</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Панель управления */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomIn}
              title="Увеличить"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomOut}
              title="Уменьшить"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetView}
              title="Сбросить вид"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <div className="text-sm text-gray-600 ml-2">
              Масштаб: {Math.round(zoom * 100)}%
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Онлайн</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-gray-600">Сегодня</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-gray-600">Неактивен</span>
            </div>
          </div>
        </div>
      </Card>

      {/* SVG дерево */}
      <Card className="p-0 overflow-hidden">
        <div
          ref={containerRef}
          className="relative bg-gray-50"
          style={{ height: '600px', cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="overflow-visible"
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {renderNode(treeData, 0, 0)}
            </g>
          </svg>
        </div>
      </Card>

      {/* Модальное окно с деталями партнёра */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedNode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: getLevelColor(selectedNode.level) }}
                  >
                    {selectedNode.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedNode.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{selectedNode.refCode}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Статистика */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-600 mb-1">Баланс</div>
                    <div className="text-lg font-bold text-blue-900">
                      {selectedNode.balance.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-purple-600 mb-1">Уровень</div>
                    <div className="text-lg font-bold text-purple-900">
                      {selectedNode.level}
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-600 mb-1">Прямых</div>
                    <div className="text-lg font-bold text-green-900">
                      {selectedNode.directChildren}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-xs text-orange-600 mb-1">Команда</div>
                    <div className="text-lg font-bold text-orange-900">
                      {selectedNode.totalTeam}
                    </div>
                  </div>
                </div>

                {/* Статус */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getActivityStatus(selectedNode.lastActive).color }}
                    ></div>
                    <span className="text-sm text-gray-700">
                      {getActivityStatus(selectedNode.lastActive).label}
                    </span>
                  </div>
                </div>

                {/* Контакты */}
                {(selectedNode.phone || selectedNode.telegram || selectedNode.whatsapp) && (
                  <div className="flex gap-2">
                    {selectedNode.telegram && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(`https://t.me/${selectedNode.telegram.replace('@', '')}`, '_blank')}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Telegram
                      </Button>
                    )}
                    {selectedNode.whatsapp && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(`https://wa.me/${selectedNode.whatsapp.replace(/[^0-9]/g, '')}`, '_blank')}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                    )}
                    {selectedNode.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(`tel:${selectedNode.phone}`, '_blank')}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Позвонить
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
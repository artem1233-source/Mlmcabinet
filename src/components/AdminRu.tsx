import { useState, useEffect } from 'react';
import { 
  Shield, Users, ShoppingBag, Wallet, TrendingUp, 
  Loader2, CheckCircle2, XCircle, Clock, Award,
  DollarSign, ArrowUpRight, ArrowDownRight, Edit2, Trash2,
  Plus, X, Save, BookOpen, Tag, Settings, FileText,
  BarChart3, Package, Video, Gift, ExternalLink, Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { CommissionEditor } from './CommissionEditor';
import type { ProductCommission } from '../utils/types/commission';
import { DEFAULT_COMMISSIONS } from '../utils/types/commission';
import { AchievementsAdminRu } from './AchievementsAdminRu';
import { UsersTreeView } from './admin/UsersTreeView';
import { IdManager } from './admin/IdManager';
import { ServerTest } from './ServerTest';
import * as localCounter from '../utils/localCounter';

interface AdminRuProps {
  currentUser: any;
}

export function AdminRu({ currentUser }: AdminRuProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [trainingMaterials, setTrainingMaterials] = useState<any[]>([]);
  const [nextUserId, setNextUserId] = useState<string>('001');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    название: '',
    описание: '',
    цена: 0,
    категория: '',
    доступно: true,
  });
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [newTraining, setNewTraining] = useState({
    название: '',
    описание: '',
    тип: 'видео',
    контент: '',
    порядок: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load users
      const usersResponse = await api.getAllUsers();
      if (usersResponse.success) {
        setUsers(usersResponse.users || []);
      }

      // Load orders
      const ordersResponse = await api.getAllOrders();
      if (ordersResponse.success) {
        setOrders(ordersResponse.orders || []);
      }

      // Load products
      const productsResponse = await api.getProducts();
      if (productsResponse.success) {
        setProducts(productsResponse.products || []);
      }

      // Load training materials
      const trainingResponse = await api.getTrainingMaterials();
      if (trainingResponse.success) {
        setTrainingMaterials(trainingResponse.materials || []);
      }

      // ✅ Load counter from local storage ONLY (skip server sync to avoid errors)
      console.log('📊 Loading counter from local storage...');
      
      const localNextUserId = localCounter.getNextLocalUserId();
      const localNextPartnerId = localCounter.getNextLocalPartnerId();
      console.log('📍 Local counters:', { localNextUserId, localNextPartnerId });
      
      // Set local counter
      setNextUserId(localNextUserId);
      console.log('✅ Counter loaded from local storage:', localNextUserId);
      
      // 💡 Server sync disabled to prevent "Failed to fetch" errors
      // To enable server sync, deploy Supabase Functions and uncomment the sync code below
      
      /*
      // Optional: Try to sync with server (only when server is deployed)
      if (projectId && publicAnonKey) {
        try {
          const counterUrl = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/counter`;
          const userId = api.getAuthToken();
          
          const response = await fetch(counterUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-User-Id': userId || '',
            },
          });
          
          if (response.ok) {
            const counterData = await response.json();
            if (counterData.success) {
              localCounter.syncCountersWithServer(
                counterData.userCounter || 0,
                counterData.partnerCounter || 0
              );
              setNextUserId(counterData.nextUserId || counterData.nextId);
              console.log('✅ Counter synced with server');
            }
          }
        } catch (error) {
          console.log('⚠️ Server sync skipped (server not deployed)');
        }
      }
      */
      
      // Calculate stats
      const totalRevenue = (ordersResponse.orders || []).reduce((sum: number, order: any) => 
        sum + (order.итого || 0), 0
      );
      const pendingOrders = (ordersResponse.orders || []).filter((order: any) => 
        order.статус === 'в обработке'
      ).length;

      setStats({
        totalUsers: usersResponse.users?.length || 0,
        totalOrders: ordersResponse.orders?.length || 0,
        totalRevenue,
        pendingOrders,
      });

    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    console.log('🗑️ Delete user clicked:', userId, userName, userEmail);
    console.log('🔍 currentUser:', currentUser);
    console.log('🔍 projectId:', projectId);
    console.log('🔍 publicAnonKey exists:', !!publicAnonKey);
    
    if (!confirm(`⚠️ УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ\n\n${userName}\n${userEmail}\nID: ${userId}\n\nЭто действие необратимо!\n\nПродолжить?`)) {
      console.log('❌ User cancelled deletion');
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/delete-user/${userId}`;
      console.log('🌐 DELETE request URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success) {
        toast.success('Пользователь удалён!', {
          description: `${userName} (${userEmail})`
        });
        console.log('🔄 Reloading users list...');
        loadData();
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('❌ Delete user error:', error);
      toast.error('Ошибка удаления пользователя', {
        description: String(error)
      });
    }
  };

  const handleResetCounter = async () => {
    if (!confirm('⚠️ СБРОС СЧЁТЧИКА ПОЛЬЗОВАТЕЛЕЙ\n\nВы действительно хотите сбросить счётчик?\n\nСледующий зарегистрированный пользователь получит ID: 001\n\nПродолжить?')) {
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/reset-counter`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Reset counter response:', data);

      if (data.success) {
        setNextUserId('001');
        toast.success('Счётчик сброшен!', {
          description: 'Следующий ID будет 001'
        });
      } else {
        throw new Error(data.error || 'Failed to reset counter');
      }
    } catch (error) {
      console.error('Reset counter error:', error);
      toast.error('Ошибка сброса счётчика', {
        description: String(error)
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await api.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        toast.success('Статус заказа обновлён');
        loadData();
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        const response = await api.updateProduct(editingProduct.id, editingProduct);
        if (response.success) {
          toast.success('Товар обновлён');
          setEditingProduct(null);
          loadData();
        }
      } else {
        const response = await api.createProduct(newProduct);
        if (response.success) {
          toast.success('Товар создан');
          setNewProduct({
            название: '',
            описание: '',
            цена: 0,
            категория: '',
            доступно: true,
          });
          loadData();
        }
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error('Ошибка сохранения товара');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Удалить этот товар?')) return;
    
    try {
      const response = await api.deleteProduct(productId);
      if (response.success) {
        toast.success('Товар удалён');
        loadData();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Ошибка удаления товара');
    }
  };

  const handleSaveTraining = async () => {
    try {
      if (editingTraining) {
        const response = await api.updateTrainingMaterial(editingTraining.id, editingTraining);
        if (response.success) {
          toast.success('Материал обновлён');
          setEditingTraining(null);
          loadData();
        }
      } else {
        const response = await api.createTrainingMaterial(newTraining);
        if (response.success) {
          toast.success('Материал создан');
          setNewTraining({
            название: '',
            описание: '',
            тип: 'видео',
            контент: '',
            порядок: 0,
          });
          loadData();
        }
      }
    } catch (error) {
      console.error('Failed to save training material:', error);
      toast.error('Ошибка сохранения материала');
    }
  };

  const handleDeleteTraining = async (materialId: string) => {
    if (!confirm('Удалить этот материал?')) return;
    
    try {
      const response = await api.deleteTrainingMaterial(materialId);
      if (response.success) {
        toast.success('Материал удалён');
        loadData();
      }
    } catch (error) {
      console.error('Failed to delete training material:', error);
      toast.error('Ошибка удаления материала');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#39B7FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[#1E1E1E]">Панель администратора</h1>
              <p className="text-[#666]">
                Системные настройки • Управление пользователями доступно в главном меню
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>Всего пользователей</p>
                  <p className="text-[#1E1E1E]" style={{ fontSize: '28px', fontWeight: '700' }}>{stats.totalUsers}</p>
                </div>
                <div className="w-12 h-12 bg-[#F0F9FF] rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#39B7FF]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>Всего заказов</p>
                  <p className="text-[#1E1E1E]" style={{ fontSize: '28px', fontWeight: '700' }}>{stats.totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-[#12C9B6]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>Общий доход</p>
                  <p className="text-[#1E1E1E]" style={{ fontSize: '28px', fontWeight: '700' }}>₽{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-[#FFF7ED] rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-[#FB923C]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#666]" style={{ fontSize: '14px', marginBottom: '8px' }}>В обработке</p>
                  <p className="text-[#1E1E1E]" style={{ fontSize: '28px', fontWeight: '700' }}>{stats.pendingOrders}</p>
                </div>
                <div className="w-12 h-12 bg-[#FEF2F2] rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#EF4444]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-[#E6E9EE] p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white">
              Обзор
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white">
              🔍 Диагностика
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white">
              Заказы
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white">
              Товары
            </TabsTrigger>
            <TabsTrigger value="training" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white">
              Обучение
            </TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white">
              Достижения
            </TabsTrigger>
            <TabsTrigger value="commissions" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#39B7FF] data-[state=active]:to-[#12C9B6] data-[state=active]:text-white">
              Комиссии
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-[#1E1E1E]">Системный обзор</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-[#12C9B6]" />
                      <div>
                        <p style={{ fontWeight: '600' }} className="text-[#1E1E1E]">Активность системы</p>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>Все системы работают нормально</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Активно</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-[#39B7FF]" />
                      <div>
                        <p style={{ fontWeight: '600' }} className="text-[#1E1E1E]">Новые пользователи</p>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>За последние 7 дней</p>
                      </div>
                    </div>
                    <p style={{ fontWeight: '700', fontSize: '20px' }} className="text-[#1E1E1E]">{users.length}</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl">
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5 text-[#FB923C]" />
                      <div>
                        <p style={{ fontWeight: '600' }} className="text-[#1E1E1E]">Новые заказы</p>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>За последние 7 дней</p>
                      </div>
                    </div>
                    <p style={{ fontWeight: '700', fontSize: '20px' }} className="text-[#1E1E1E]">{orders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnostics Tab */}
          <TabsContent value="diagnostics">
            <div className="space-y-6">
              {/* Server Connectivity Test */}
              <ServerTest />

              {/* System Status */}
              <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">Статус системы</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-[#39B7FF]" />
                        <div>
                          <p style={{ fontWeight: '600' }} className="text-[#1E1E1E]">Проект ID</p>
                          <p className="text-[#666]" style={{ fontSize: '13px' }}>Проверка проекта</p>
                        </div>
                      </div>
                      <Badge className={projectId ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {projectId ? '✓' : '✗'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-[#39B7FF]" />
                        <div>
                          <p style={{ fontWeight: '600' }} className="text-[#1E1E1E]">Ключ анонимного доступа</p>
                          <p className="text-[#666]" style={{ fontSize: '13px' }}>Проверка ключа</p>
                        </div>
                      </div>
                      <Badge className={publicAnonKey ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {publicAnonKey ? '✓' : '✗'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-[#39B7FF]" />
                        <div>
                          <p style={{ fontWeight: '600' }} className="text-[#1E1E1E]">Текущий пользователь</p>
                          <p className="text-[#666]" style={{ fontSize: '13px' }}>Проверка пользователя</p>
                        </div>
                      </div>
                      <Badge className={currentUser ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {currentUser ? '✓' : '✗'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-[#39B7FF]" />
                        <div>
                          <p style={{ fontWeight: '600' }} className="text-[#1E1E1E]">Счётчик пользователей</p>
                          <p className="text-[#666]" style={{ fontSize: '13px' }}>
                            Локальный: {localCounter.getNextLocalUserId()} | 
                            Партнёр: {localCounter.getNextLocalPartnerId()}
                          </p>
                        </div>
                      </div>
                      <Badge className={nextUserId ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {nextUserId ? '✓' : '✗'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <div>
                          <p style={{ fontWeight: '600' }} className="text-blue-900">💾 Локальный режим активен</p>
                          <p className="text-blue-700" style={{ fontSize: '13px' }}>
                            Приложение работает автономно с локальными счётчиками
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-white">
                        Активно
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-[#1E1E1E]">Все заказы ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.map((order, index) => (
                    <div
                      key={`${order.id}-${index}`}
                      className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                            Заказ #{order.номер}
                          </p>
                          <Badge className={
                            order.статус === 'выполнен' ? 'bg-green-100 text-green-700' :
                            order.статус === 'в обработке' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {order.статус}
                          </Badge>
                        </div>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>
                          {new Date(order.дата).toLocaleDateString('ru-RU')} • ₽{order.итого?.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'выполнен')}
                          disabled={order.статус === 'выполнен'}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Выполнен
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'отменён')}
                          disabled={order.статус === 'отменён'}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Отменить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1E1E1E]">Управление товарами</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить товар
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Новый товар</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Название</Label>
                          <Input
                            value={newProduct.название}
                            onChange={(e) => setNewProduct({...newProduct, название: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Описание</Label>
                          <Textarea
                            value={newProduct.описание}
                            onChange={(e) => setNewProduct({...newProduct, описание: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Базовая цена (₽)</Label>
                          <Input
                            type="number"
                            value={newProduct.цена}
                            onChange={(e) => setNewProduct({...newProduct, цена: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label>Категория</Label>
                          <Input
                            value={newProduct.категория}
                            onChange={(e) => setNewProduct({...newProduct, категория: e.target.value})}
                          />
                        </div>
                        <Button
                          className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
                          onClick={handleSaveProduct}
                        >
                          Сохранить товар
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                    >
                      <div className="flex-1">
                        <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                          {product.название}
                        </p>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>
                          Базовая цена: ₽{product.basePrice?.toLocaleString()} • {product.категория}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training">
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1E1E1E]">Материалы для обучения</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить материал
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Новый материал</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Название</Label>
                          <Input
                            value={newTraining.название}
                            onChange={(e) => setNewTraining({...newTraining, название: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Описание</Label>
                          <Textarea
                            value={newTraining.описание}
                            onChange={(e) => setNewTraining({...newTraining, описание: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Тип</Label>
                          <Input
                            value={newTraining.тип}
                            onChange={(e) => setNewTraining({...newTraining, тип: e.target.value})}
                            placeholder="видео, статья, документ"
                          />
                        </div>
                        <div>
                          <Label>Контент (URL или текст)</Label>
                          <Textarea
                            value={newTraining.контент}
                            onChange={(e) => setNewTraining({...newTraining, контент: e.target.value})}
                          />
                        </div>
                        <Button
                          className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
                          onClick={handleSaveTraining}
                        >
                          Сохранить материал
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trainingMaterials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-lg flex items-center justify-center">
                          {material.тип === 'видео' ? (
                            <Video className="w-5 h-5 text-white" />
                          ) : material.тип === 'статья' ? (
                            <FileText className="w-5 h-5 text-white" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                            {material.название}
                          </p>
                          <p className="text-[#666]" style={{ fontSize: '13px' }}>
                            {material.тип} • Порядок: {material.порядок}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTraining(material)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTraining(material.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <AchievementsAdminRu />
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-[#1E1E1E]">Настройка комиссий</CardTitle>
                <p className="text-[#666]" style={{ fontSize: '14px' }}>
                  Управляйте комиссиями для каждого продукта
                </p>
              </CardHeader>
              <CardContent>
                <CommissionEditor />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        {editingProduct && (
          <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Редактировать товар</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Название</Label>
                  <Input
                    value={editingProduct.название}
                    onChange={(e) => setEditingProduct({...editingProduct, название: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Описание</Label>
                  <Textarea
                    value={editingProduct.описание}
                    onChange={(e) => setEditingProduct({...editingProduct, описание: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Базовая цена (₽)</Label>
                  <Input
                    type="number"
                    value={editingProduct.basePrice}
                    onChange={(e) => setEditingProduct({...editingProduct, basePrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Категория</Label>
                  <Input
                    value={editingProduct.категория}
                    onChange={(e) => setEditingProduct({...editingProduct, категория: e.target.value})}
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
                  onClick={handleSaveProduct}
                >
                  Сохранить изменения
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Training Dialog */}
        {editingTraining && (
          <Dialog open={!!editingTraining} onOpenChange={() => setEditingTraining(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Редактировать материал</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Название</Label>
                  <Input
                    value={editingTraining.название}
                    onChange={(e) => setEditingTraining({...editingTraining, название: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Описание</Label>
                  <Textarea
                    value={editingTraining.описание}
                    onChange={(e) => setEditingTraining({...editingTraining, описание: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Тип</Label>
                  <Input
                    value={editingTraining.тип}
                    onChange={(e) => setEditingTraining({...editingTraining, тип: e.target.value})}
                    placeholder="видео, статья, документ"
                  />
                </div>
                <div>
                  <Label>Контент (URL или текст)</Label>
                  <Textarea
                    value={editingTraining.контент}
                    onChange={(e) => setEditingTraining({...editingTraining, контент: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Порядок</Label>
                  <Input
                    type="number"
                    value={editingTraining.порядок}
                    onChange={(e) => setEditingTraining({...editingTraining, порядок: Number(e.target.value)})}
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
                  onClick={handleSaveTraining}
                >
                  Сохранить изменения
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
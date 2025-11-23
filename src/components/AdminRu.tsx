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

interface AdminRuProps {
  currentUser: any;
}

export function AdminRu({ currentUser }: AdminRuProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Form states for products
  const [productForm, setProductForm] = useState({
    название: '',
    описание: '',
    sku: '',
    изображение: '',
    цена1: '',
    цена2: '',
    цена3: '',
    цена_розница: '',
    категория: 'general',
    активен: true
  });
  
  // 🆕 Комиссии продукта
  const [productCommission, setProductCommission] = useState<ProductCommission>(
    DEFAULT_COMMISSIONS['H2-1'] // Дефолтные комиссии
  );
  
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Form states for lessons
  const [lessonForm, setLessonForm] = useState({
    название: '',
    описание: '',
    видео: '',
    категория: 'general',
    уровень: '1',
    порядок: '0',
    активен: true
  });
  
  // Form states for promos
  const [promoForm, setPromoForm] = useState({
    код: '',
    тип: 'percent',
    значение: '',
    макс_использований: '',
    срок_действия: '',
    активен: true
  });
  
  // Withdrawal edit states
  const [editingWithdrawal, setEditingWithdrawal] = useState<string | null>(null);
  const [withdrawalStatus, setWithdrawalStatus] = useState('');
  const [withdrawalNote, setWithdrawalNote] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    if (activeTab === 'products') {
      loadProducts();
    } else if (activeTab === 'training') {
      loadTraining();
    } else if (activeTab === 'promos') {
      loadPromos();
    } else if (activeTab === 'settings') {
      loadSettings();
    } else if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'overview') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, ordersData, withdrawalsData] = await Promise.all([
        api.getAdminStats().catch(() => ({ success: false })),
        api.getAllUsersAdmin().catch(() => ({ success: false, users: [] })),
        api.getAllOrdersAdmin().catch(() => ({ success: false, orders: [] })),
        api.getAllWithdrawalsAdmin().catch(() => ({ success: false, withdrawals: [] }))
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (usersData.success) setUsers(usersData.users);
      if (ordersData.success) setOrders(ordersData.orders);
      if (withdrawalsData.success) setWithdrawals(withdrawalsData.withdrawals);
    } catch (error: any) {
      console.error('Failed to load admin data:', error);
      if (error?.message?.includes('Admin')) {
        toast.error('У вас нет доступа к админ-панели');
      } else {
        toast.error('Не удалось загрузить данные админ-панели');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.getAdminProducts();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Load products error:', error);
      toast.error('Ошибка загрузки товаров');
    }
  };

  const loadTraining = async () => {
    try {
      const data = await api.getAdminTraining();
      if (data.success) {
        setLessons(data.lessons);
      }
    } catch (error) {
      console.error('Load training error:', error);
      toast.error('Ошибка загрузки обучения');
    }
  };

  const loadPromos = async () => {
    try {
      const data = await api.getAdminPromos();
      if (data.success) {
        setPromos(data.promos);
      }
    } catch (error) {
      console.error('Load promos error:', error);
      toast.error('Ошибка загрузки промокодов');
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getAdminSettings();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Load settings error:', error);
      toast.error('Ошибка загрузки настроек');
    }
  };

  const loadLogs = async () => {
    try {
      const data = await api.getAdminLogs();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Load logs error:', error);
      toast.error('Ошибка загрузки логов');
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await api.getAdminAnalytics();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Load analytics error:', error);
    }
  };

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const data = await api.uploadProductImage(file);
      if (data.success && data.imageUrl) {
        setProductForm({ ...productForm, изображение: data.imageUrl });
        toast.success('Изображение загружено');
      } else {
        toast.error('Ошибка загрузки изображения');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Ошибка загрузки изображения');
    } finally {
      setUploadingImage(false);
    }
  };

  // Product handlers
  const handleCreateProduct = async () => {
    alert('🔥 handleCreateProduct вызвана! ВЕРСИЯ 2.0');
    console.log('🚀🚀🚀 ========== handleCreateProduct STARTED ==========');
    console.log('📋 productForm:', productForm);
    console.log('💰 productCommission STATE:', productCommission);
    
    try {
      // Upload image first if a file was selected
      if (imageFile && !productForm.изображение) {
        await handleImageUpload(imageFile);
      }
      
      // 🆕 ВАЖНО: если комиссии не заданы (null/undefined), используем дефолтные
      const finalCommission = productCommission || DEFAULT_COMMISSIONS['H2-1'];
      
      console.log('🔥🔥🔥 handleCreateProduct - commission state:', {
        productCommission,
        finalCommission,
        hasProductCommission: !!productCommission,
        isAllZero: JSON.stringify(productCommission) === JSON.stringify({
          guest: { L0: 0, L1: 0, L2: 0, L3: 0 },
          partner: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 }
        })
      });
      
      // 🆕 Добавляем комиссии в продукт
      const productData = {
        ...productForm,
        commission: finalCommission,
        retail_price: parseFloat(productForm.цена_розница) || 0,
        partner_price: parseFloat(productForm.цена1) || 0
      };
      
      console.log('🔥 Sending productData to API:');
      console.log('   - sku:', productData.sku);
      console.log('   - commission:', productData.commission);
      console.log('   - retail_price:', productData.retail_price);
      console.log('   - partner_price:', productData.partner_price);
      console.log('   - FULL productData:', productData);
      
      const data = await api.createProduct(productData);
      if (data.success) {
        toast.success('Товар создан');
        setShowProductModal(false);
        resetProductForm();
        setImageFile(null);
        loadProducts();
      }
    } catch (error) {
      console.error('Create product error:', error);
      toast.error('Ошибка создания товара');
    }
  };

  const handleUpdateProduct = async () => {
    try {
      // Upload new image if a file was selected
      if (imageFile) {
        await handleImageUpload(imageFile);
      }
      
      // 🆕 ВАЖНО: если комиссии не заданы, используем дефолтные
      const finalCommission = productCommission || DEFAULT_COMMISSIONS['H2-1'];
      
      console.log('🔥🔥🔥 handleUpdateProduct - commission state:', {
        productCommission,
        finalCommission,
        hasProductCommission: !!productCommission
      });
      
      // 🆕 Добавляем комиссии в обновление
      const productData = {
        ...productForm,
        commission: finalCommission,
        retail_price: parseFloat(productForm.цена_розница) || 0,
        partner_price: parseFloat(productForm.цена1) || 0
      };
      
      console.log('🔥 Sending productData to API:', {
        sku: productData.sku,
        commission: productData.commission,
        retail_price: productData.retail_price,
        partner_price: productData.partner_price
      });
      
      const data = await api.updateProduct(editingItem.id, productData);
      if (data.success) {
        toast.success('Товар обновлён');
        setShowProductModal(false);
        setEditingItem(null);
        resetProductForm();
        setImageFile(null);
        loadProducts();
      }
    } catch (error) {
      console.error('Update product error:', error);
      toast.error('Ошибка обновления товара');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Удалить этот товар?')) return;
    try {
      const data = await api.deleteProduct(productId);
      if (data.success) {
        toast.success('Товар удалён');
        loadProducts();
      }
    } catch (error) {
      console.error('Delete product error:', error);
      toast.error('Ошибка удаления товара');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      название: '',
      описание: '',
      sku: '',
      изображение: '',
      цена1: '',
      цена2: '',
      цена3: '',
      цена_розница: '',
      категория: 'general',
      активен: true
    });
    // 🆕 Сбрасываем комиссии на ПУСТЫЕ (все 0), чтобы пользователь увидел что нужно настроить
    setProductCommission({
      guest: { L0: 0, L1: 0, L2: 0, L3: 0 },
      partner: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 }
    });
    setImageFile(null);
  };

  const openEditProduct = (product: any) => {
    setEditingItem(product);
    setProductForm({
      название: product.название || '',
      описание: product.описание || '',
      sku: product.sku || '',
      изображение: product.изображение || '',
      цена1: product.цена1?.toString() || '',
      цена2: product.цена2?.toString() || '',
      цена3: product.цена3?.toString() || '',
      цена_розница: product.цена_розница?.toString() || '',
      категория: product.категория || 'general',
      активен: product.активен !== false
    });
    // 🆕 Загружаем комиссии продукта или используем дефолтные
    if (product.commission) {
      setProductCommission(product.commission);
    } else {
      // Fallback на дефолтные комиссии по SKU
      setProductCommission(DEFAULT_COMMISSIONS[product.sku] || DEFAULT_COMMISSIONS['H2-1']);
    }
    setShowProductModal(true);
  };

  // Lesson handlers
  const handleCreateLesson = async () => {
    try {
      const data = await api.createLesson(lessonForm);
      if (data.success) {
        toast.success('Урок создан');
        setShowLessonModal(false);
        resetLessonForm();
        loadTraining();
      }
    } catch (error) {
      console.error('Create lesson error:', error);
      toast.error('Ошибка создания урока');
    }
  };

  const handleUpdateLesson = async () => {
    try {
      const data = await api.updateLesson(editingItem.id, lessonForm);
      if (data.success) {
        toast.success('Урок обновлён');
        setShowLessonModal(false);
        setEditingItem(null);
        resetLessonForm();
        loadTraining();
      }
    } catch (error) {
      console.error('Update lesson error:', error);
      toast.error('Ошибка обновления урока');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Удалить этот урок?')) return;
    try {
      const data = await api.deleteLesson(lessonId);
      if (data.success) {
        toast.success('Урок удалён');
        loadTraining();
      }
    } catch (error) {
      console.error('Delete lesson error:', error);
      toast.error('Ошибка удаления урока');
    }
  };

  const resetLessonForm = () => {
    setLessonForm({
      название: '',
      описание: '',
      видео: '',
      категория: 'general',
      уровень: '1',
      порядок: '0',
      активен: true
    });
  };

  const openEditLesson = (lesson: any) => {
    setEditingItem(lesson);
    setLessonForm({
      название: lesson.название || '',
      описание: lesson.описание || '',
      видео: lesson.видео || '',
      категория: lesson.категория || 'general',
      уровень: lesson.уровень?.toString() || '1',
      порядок: lesson.порядок?.toString() || '0',
      активен: lesson.активен !== false
    });
    setShowLessonModal(true);
  };

  // Promo handlers
  const handleCreatePromo = async () => {
    try {
      const data = await api.createPromo(promoForm);
      if (data.success) {
        toast.success('Промокод создан');
        setShowPromoModal(false);
        resetPromoForm();
        loadPromos();
      }
    } catch (error) {
      console.error('Create promo error:', error);
      toast.error('Ошибка создания промокода');
    }
  };

  const handleUpdatePromo = async () => {
    try {
      const data = await api.updatePromo(editingItem.id, promoForm);
      if (data.success) {
        toast.success('Промокод обновлён');
        setShowPromoModal(false);
        setEditingItem(null);
        resetPromoForm();
        loadPromos();
      }
    } catch (error) {
      console.error('Update promo error:', error);
      toast.error('Ошибка обновления промокода');
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!confirm('Удалить этот промокод?')) return;
    try {
      const data = await api.deletePromo(promoId);
      if (data.success) {
        toast.success('Промокод удалён');
        loadPromos();
      }
    } catch (error) {
      console.error('Delete promo error:', error);
      toast.error('Ошибка удаления промокода');
    }
  };

  const resetPromoForm = () => {
    setPromoForm({
      код: '',
      тип: 'percent',
      значение: '',
      макс_использований: '',
      срок_действия: '',
      активен: true
    });
  };

  const openEditPromo = (promo: any) => {
    setEditingItem(promo);
    setPromoForm({
      код: promo.код || '',
      тип: promo.тип || 'percent',
      значение: promo.значение?.toString() || '',
      макс_использований: promo.макс_использований?.toString() || '',
      срок_действия: promo.срок_действия || '',
      активен: promo.активен !== false
    });
    setShowPromoModal(true);
  };

  // Settings handler
  const handleUpdateSettings = async () => {
    try {
      const data = await api.updateAdminSettings(settings);
      if (data.success) {
        toast.success('Настройки обновлены');
        loadSettings();
      }
    } catch (error) {
      console.error('Update settings error:', error);
      toast.error('Ошибка обновления настроек');
    }
  };

  const handleUpdateWithdrawalStatus = async (withdrawalId: string) => {
    try {
      const data = await api.updateWithdrawalStatus(withdrawalId, withdrawalStatus, withdrawalNote);
      if (data.success) {
        toast.success('Статус выплаты обновлен');
        setEditingWithdrawal(null);
        setWithdrawalStatus('');
        setWithdrawalNote('');
        loadAdminData();
      }
    } catch (error) {
      console.error('Update withdrawal error:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleUpdateUserLevel = async (userId: string, newLevel: number) => {
    try {
      const data = await api.updateUserLevel(userId, newLevel);
      if (data.success) {
        toast.success('Уровень пользователя обновлен');
        loadAdminData();
      }
    } catch (error) {
      console.error('Update user level error:', error);
      toast.error('Ошибка обновления уровня');
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
            <p className="text-[#666]">Загрузка админ-панели...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
            Панель администратора
          </h1>
        </div>
        <p className="text-[#666]">Управление системой H₂ Partner Platform</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <TabsList className="inline-flex w-auto min-w-full lg:w-full gap-2 flex-nowrap lg:flex-wrap">
            <TabsTrigger value="overview" className="whitespace-nowrap">
              <BarChart3 className="w-4 h-4 mr-2" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap">
              <Users className="w-4 h-4 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="products" className="whitespace-nowrap">
              <Package className="w-4 h-4 mr-2" />
              Товары
            </TabsTrigger>
            <TabsTrigger value="orders" className="whitespace-nowrap">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Заказы
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="whitespace-nowrap">
              <Wallet className="w-4 h-4 mr-2" />
              Выплаты
            </TabsTrigger>
            <TabsTrigger value="achievements" className="whitespace-nowrap">
              <Trophy className="w-4 h-4 mr-2" />
              Достижения
            </TabsTrigger>
            <TabsTrigger value="training" className="whitespace-nowrap">
              <BookOpen className="w-4 h-4 mr-2" />
              Обучение
            </TabsTrigger>
            <TabsTrigger value="promos" className="whitespace-nowrap">
              <Gift className="w-4 h-4 mr-2" />
              Промокоды
            </TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap">
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </TabsTrigger>
            <TabsTrigger value="logs" className="whitespace-nowrap">
              <FileText className="w-4 h-4 mr-2" />
              Логи
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <>
              {/* Financial Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                      ₽{stats.finance?.totalRevenue?.toLocaleString() || stats.totalRevenue?.toLocaleString() || 0}
                    </div>
                    <div className="text-[#666]" style={{ fontSize: '13px' }}>Общий доход</div>
                  </CardContent>
                </Card>

                <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <ArrowDownRight className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                      ₽{stats.finance?.totalEarnings?.toLocaleString() || 0}
                    </div>
                    <div className="text-[#666]" style={{ fontSize: '13px' }}>Выплачено партнёрам</div>
                  </CardContent>
                </Card>

                <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                    <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                      ₽{stats.finance?.pendingWithdrawals?.toLocaleString() || 0}
                    </div>
                    <div className="text-[#666]" style={{ fontSize: '13px' }}>Ожидают выплаты</div>
                  </CardContent>
                </Card>

                <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-[#1E1E1E] mb-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                      {stats.users?.total || stats.totalUsers || 0}
                    </div>
                    <div className="text-[#666]" style={{ fontSize: '13px' }}>Всего партнёров</div>
                  </CardContent>
                </Card>
              </div>

              {/* Analytics */}
              {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="text-[#1E1E1E]">Топ-10 партнёров</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.topPartners?.slice(0, 10).map((partner: any, index: number) => (
                          <div key={partner.userId} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-lg flex items-center justify-center text-white" style={{ fontSize: '12px', fontWeight: '700' }}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '14px' }}>
                                  {partner.name || partner.userId}
                                </p>
                              </div>
                            </div>
                            <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                              ₽{partner.revenue?.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="text-[#1E1E1E]">Ключевые метрики</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[#666]">Конверсия</span>
                            <span className="text-[#1E1E1E]" style={{ fontWeight: '700' }}>
                              {analytics.conversionRate}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] h-2 rounded-full"
                              style={{ width: `${Math.min(analytics.conversionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-[#666]">Средний чек</span>
                            <span className="text-[#1E1E1E]" style={{ fontWeight: '700' }}>
                              ₽{analytics.avgOrderValue?.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-[#666]">Всего заказов</span>
                            <span className="text-[#1E1E1E]" style={{ fontWeight: '700' }}>
                              {stats.orders?.total || stats.totalOrders || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* User Stats by Level */}
              <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">Распределение по уровням</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded"></div>
                        <span className="text-[#666]">Уровень 1</span>
                      </div>
                      <p className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
                        {stats.users?.byLevel?.level1 || 0}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded"></div>
                        <span className="text-[#666]">Уровень 2</span>
                      </div>
                      <p className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
                        {stats.users?.byLevel?.level2 || 0}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded"></div>
                        <span className="text-[#666]">Уровень 3</span>
                      </div>
                      <p className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
                        {stats.users?.byLevel?.level3 || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">Все пользователи ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center text-white">
                        <span style={{ fontWeight: '700' }}>
                          {user.имя.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                            {user.имя}
                          </p>
                          <Badge className="bg-gray-100 text-gray-700">
                            Уровень {user.уровень}
                          </Badge>
                          {user.isAdmin && (
                            <Badge className="bg-red-100 text-red-700">
                              Админ
                            </Badge>
                          )}
                        </div>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>
                          {user.email} • ID: {user.id} • Реф: {user.рефКод}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                          ₽{user.баланс?.toLocaleString() || 0}
                        </p>
                        <p className="text-[#666]" style={{ fontSize: '12px' }}>Баланс</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          if (!confirm(`⚠️ УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ\n\n${user.имя}\n${user.email}\nID: ${user.id}\n\nЭто действие необратимо!\n\nПродолжить?`)) {
                            return;
                          }

                          try {
                            const response = await fetch(
                              `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/admin/delete-user/${user.id}`,
                              {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${publicAnonKey}`,
                                  'Content-Type': 'application/json',
                                },
                              }
                            );

                            const data = await response.json();

                            if (data.success) {
                              toast.success('Пользователь удалён!', {
                                description: `${user.имя} (${user.email})`
                              });
                              // Reload users
                              loadData();
                            } else {
                              throw new Error(data.error || 'Failed to delete user');
                            }
                          } catch (error) {
                            console.error('Delete user error:', error);
                            toast.error('Ошибка удаления пользователя');
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Удалить
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#1E1E1E]">Товары ({products.length})</CardTitle>
              <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#39B7FF]"
                    onClick={() => {
                      setEditingItem(null);
                      resetProductForm();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать товар
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Редактировать товар' : 'Создать товар'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem ? 'Измените параметры товара' : 'Добавьте новый товар в каталог'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Название *</Label>
                        <Input
                          value={productForm.название}
                          onChange={(e) => setProductForm({ ...productForm, название: e.target.value })}
                          placeholder="Водородный порошок H₂"
                        />
                      </div>
                      <div>
                        <Label>SKU *</Label>
                        <Input
                          value={productForm.sku}
                          onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                          placeholder="H2-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Описание</Label>
                      <Textarea
                        value={productForm.описание}
                        onChange={(e) => setProductForm({ ...productForm, описание: e.target.value })}
                        placeholder="Описание товара..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Изображение товара</Label>
                      <div className="space-y-2">
                        {productForm.изображение && (
                          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={productForm.изображение}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <a
                              href={productForm.изображение}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-lg shadow-md transition-all flex items-center gap-1.5 text-sm"
                              title="Открыть файл в облаке"
                            >
                              <ExternalLink className="w-4 h-4 text-[#39B7FF]" />
                              <span className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '12px' }}>
                                Открыть в облаке
                              </span>
                            </a>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setImageFile(file);
                                handleImageUpload(file);
                              }
                            }}
                            disabled={uploadingImage}
                          />
                          {uploadingImage && (
                            <Loader2 className="w-6 h-6 animate-spin text-[#39B7FF]" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Или введите URL изображения:
                        </p>
                        <Input
                          value={productForm.изображение}
                          onChange={(e) => setProductForm({ ...productForm, изображение: e.target.value })}
                          placeholder="https://..."
                          disabled={uploadingImage}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Цена Уровень 1 (₽)</Label>
                        <Input
                          type="number"
                          value={productForm.цена1}
                          onChange={(e) => setProductForm({ ...productForm, цена1: e.target.value })}
                          placeholder="4900"
                        />
                      </div>
                      <div>
                        <Label>Цена Уровень 2 (₽)</Label>
                        <Input
                          type="number"
                          value={productForm.цена2}
                          onChange={(e) => setProductForm({ ...productForm, цена2: e.target.value })}
                          placeholder="4500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Цена Уровень 3 (₽)</Label>
                        <Input
                          type="number"
                          value={productForm.цена3}
                          onChange={(e) => setProductForm({ ...productForm, цена3: e.target.value })}
                          placeholder="4000"
                        />
                      </div>
                      <div>
                        <Label>Розничная цена (₽)</Label>
                        <Input
                          type="number"
                          value={productForm.цена_розница}
                          onChange={(e) => setProductForm({ ...productForm, цена_розница: e.target.value })}
                          placeholder="6500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Категория</Label>
                        <select
                          value={productForm.категория}
                          onChange={(e) => setProductForm({ ...productForm, категория: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="general">Основные</option>
                          <option value="hydrogen">Водородные</option>
                          <option value="health">Здоровье</option>
                          <option value="accessories">Аксессуары</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          checked={productForm.активен}
                          onChange={(e) => setProductForm({ ...productForm, активен: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label>Активен</Label>
                      </div>
                    </div>

                    {/* 🆕 Редактор комиссий */}
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-lg font-semibold mb-4">Комиссии продукта</h3>
                      <CommissionEditor
                        commission={productCommission}
                        onChange={setProductCommission}
                        retailPrice={Number(productForm.цена_розница) || 0}
                        partnerPrice={Number(productForm.цена1) || 0}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={editingItem ? handleUpdateProduct : handleCreateProduct}
                        className="bg-[#39B7FF]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {editingItem ? 'Сохранить' : 'Создать'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowProductModal(false);
                          setEditingItem(null);
                          resetProductForm();
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {product.изображение && (
                        <div className="relative group">
                          <img 
                            src={product.изображение} 
                            alt={product.название}
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(product.изображение, '_blank')}
                            title="Кликните, чтобы открыть в облаке"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                            <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                            {product.название}
                          </p>
                          <Badge className={product.активен ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {product.активен ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </div>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>
                          SKU: {product.sku} • Розница: ₽{product.цена_розница?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!product.isBaseProduct && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditProduct(product)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Удалить товар "${product.название}"?`)) {
                                handleDeleteProduct(product.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {product.isBaseProduct && (
                        <Badge className="bg-blue-100 text-blue-700">
                          Базовый товар
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="text-center py-8 text-[#666]">
                    Товары пока не созданы
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">Все заказы ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders.slice(0, 50).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        order.статус === 'paid' ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        {order.статус === 'paid' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                          {order.товар}
                        </p>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>
                          {order.id} • {new Date(order.дата).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                        ₽{order.цена?.toLocaleString()}
                      </p>
                      <p className={order.статус === 'paid' ? 'text-green-600' : 'text-orange-600'} 
                         style={{ fontSize: '12px' }}>
                        {order.статус === 'paid' ? 'Оплачено' : 'Ожидание'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">
                Заявки на выплаты ({withdrawals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="p-4 bg-[#F7FAFC] rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          withdrawal.status === 'completed' ? 'bg-green-100' :
                          withdrawal.status === 'processing' ? 'bg-blue-100' :
                          withdrawal.status === 'rejected' ? 'bg-red-100' :
                          'bg-orange-100'
                        }`}>
                          {withdrawal.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : withdrawal.status === 'rejected' ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                            ₽{withdrawal.amount.toLocaleString()}
                          </p>
                          <p className="text-[#666]" style={{ fontSize: '13px' }}>
                            {withdrawal.method} • {withdrawal.userId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          withdrawal.status === 'completed' ? 'bg-green-100 text-green-700' :
                          withdrawal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }>
                          {withdrawal.status}
                        </Badge>
                        <p className="text-[#666] mt-1" style={{ fontSize: '12px' }}>
                          {new Date(withdrawal.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>

                    {editingWithdrawal === withdrawal.id ? (
                      <div className="space-y-3 pt-3 border-t border-gray-200">
                        <div>
                          <Label>Новый статус</Label>
                          <select
                            value={withdrawalStatus}
                            onChange={(e) => setWithdrawalStatus(e.target.value)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Выберите статус</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div>
                          <Label>Примечание</Label>
                          <Input
                            value={withdrawalNote}
                            onChange={(e) => setWithdrawalNote(e.target.value)}
                            placeholder="Опционально"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateWithdrawalStatus(withdrawal.id)}
                            disabled={!withdrawalStatus}
                            size="sm"
                            className="bg-[#39B7FF]"
                          >
                            Сохранить
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingWithdrawal(null);
                              setWithdrawalStatus('');
                              setWithdrawalNote('');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : withdrawal.status !== 'completed' && withdrawal.status !== 'rejected' ? (
                      <Button
                        onClick={() => {
                          setEditingWithdrawal(withdrawal.id);
                          setWithdrawalStatus(withdrawal.status);
                        }}
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        <Edit2 size={14} className="mr-2" />
                        Изменить статус
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#1E1E1E]">Обучение ({lessons.length})</CardTitle>
              <Dialog open={showLessonModal} onOpenChange={setShowLessonModal}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#39B7FF]"
                    onClick={() => {
                      setEditingItem(null);
                      resetLessonForm();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать урок
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Редактировать урок' : 'Создать урок'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem ? 'Измените параметры урока' : 'Добавьте новый урок в систему обучения'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Название *</Label>
                      <Input
                        value={lessonForm.название}
                        onChange={(e) => setLessonForm({ ...lessonForm, название: e.target.value })}
                        placeholder="Введение в водородную терапию"
                      />
                    </div>

                    <div>
                      <Label>Описание</Label>
                      <Textarea
                        value={lessonForm.описание}
                        onChange={(e) => setLessonForm({ ...lessonForm, описание: e.target.value })}
                        placeholder="Описание урока..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Видео (YouTube/Vimeo URL)</Label>
                      <Input
                        value={lessonForm.видео}
                        onChange={(e) => setLessonForm({ ...lessonForm, видео: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Категория</Label>
                        <select
                          value={lessonForm.категория}
                          onChange={(e) => setLessonForm({ ...lessonForm, категория: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="general">Общее</option>
                          <option value="product">Продукты</option>
                          <option value="sales">Продажи</option>
                          <option value="mlm">MLM-система</option>
                        </select>
                      </div>
                      <div>
                        <Label>Минимальный уровень доступа</Label>
                        <select
                          value={lessonForm.уровень}
                          onChange={(e) => setLessonForm({ ...lessonForm, уровень: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="1">Уровень 1</option>
                          <option value="2">Уровень 2</option>
                          <option value="3">Уровень 3</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Порядок отображения</Label>
                        <Input
                          type="number"
                          value={lessonForm.порядок}
                          onChange={(e) => setLessonForm({ ...lessonForm, порядок: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          checked={lessonForm.активен}
                          onChange={(e) => setLessonForm({ ...lessonForm, активен: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label>Активен</Label>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={editingItem ? handleUpdateLesson : handleCreateLesson}
                        className="bg-[#39B7FF]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {editingItem ? 'Сохранить' : 'Создать'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowLessonModal(false);
                          setEditingItem(null);
                          resetLessonForm();
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lessons.sort((a: any, b: any) => (a.порядок || 0) - (b.порядок || 0)).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                        <Video className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                            {lesson.название}
                          </p>
                          <Badge className={lesson.активен ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {lesson.активен ? 'Активен' : 'Неактивен'}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700">
                            Уровень {lesson.уровень}+
                          </Badge>
                        </div>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>
                          {lesson.категория} • Просмотры: {lesson.просмотры || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditLesson(lesson)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {lessons.length === 0 && (
                  <div className="text-center py-8 text-[#666]">
                    Уроки пока не созданы
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promos Tab */}
        <TabsContent value="promos">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#1E1E1E]">Промокоды ({promos.length})</CardTitle>
              <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#39B7FF]"
                    onClick={() => {
                      setEditingItem(null);
                      resetPromoForm();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать промокод
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Редактировать промокод' : 'Создать промокод'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem ? 'Измените параметры промокода' : 'Создайте новый промокод для скидок'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Код промокода *</Label>
                      <Input
                        value={promoForm.код}
                        onChange={(e) => setPromoForm({ ...promoForm, код: e.target.value.toUpperCase() })}
                        placeholder="SUMMER2024"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Тип скидки</Label>
                        <select
                          value={promoForm.тип}
                          onChange={(e) => setPromoForm({ ...promoForm, тип: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="percent">Процент (%)</option>
                          <option value="fixed">Фиксированная сумма (₽)</option>
                        </select>
                      </div>
                      <div>
                        <Label>Значение</Label>
                        <Input
                          type="number"
                          value={promoForm.значение}
                          onChange={(e) => setPromoForm({ ...promoForm, значение: e.target.value })}
                          placeholder={promoForm.тип === 'percent' ? '10' : '500'}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Макс. использований</Label>
                        <Input
                          type="number"
                          value={promoForm.макс_использований}
                          onChange={(e) => setPromoForm({ ...promoForm, макс_использований: e.target.value })}
                          placeholder="Оставьте пустым для безлимита"
                        />
                      </div>
                      <div>
                        <Label>Срок действия</Label>
                        <Input
                          type="date"
                          value={promoForm.срок_действия}
                          onChange={(e) => setPromoForm({ ...promoForm, срок_действия: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={promoForm.активен}
                        onChange={(e) => setPromoForm({ ...promoForm, активен: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label>Активен</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={editingItem ? handleUpdatePromo : handleCreatePromo}
                        className="bg-[#39B7FF]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {editingItem ? 'Сохранить' : 'Создать'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPromoModal(false);
                          setEditingItem(null);
                          resetPromoForm();
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promos.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center">
                        <Tag className="w-6 h-6 text-pink-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[#1E1E1E]" style={{ fontWeight: '700', fontFamily: 'monospace' }}>
                            {promo.код}
                          </p>
                          <Badge className={promo.активен ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {promo.активен ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </div>
                        <p className="text-[#666]" style={{ fontSize: '13px' }}>
                          {promo.тип === 'percent' ? `${promo.значение}% скидка` : `₽${promo.значение} скидка`} • 
                          Использовано: {promo.использовано || 0}
                          {promo.макс_использований && ` / ${promo.макс_использований}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditPromo(promo)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePromo(promo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {promos.length === 0 && (
                  <div className="text-center py-8 text-[#666]">
                    Промокоды пока не созданы
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <AchievementsAdminRu />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">Настройки MLM-системы</CardTitle>
            </CardHeader>
            <CardContent>
              {settings && (
                <div className="space-y-6">
                  <div>
                    <Label>Минимальная сумма вывода (₽)</Label>
                    <Input
                      type="number"
                      value={settings.минимальный_вывод || ''}
                      onChange={(e) => setSettings({ ...settings, минимальный_вывод: Number(e.target.value) })}
                      placeholder="1000"
                      className="mt-2"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-[#1E1E1E] mb-4" style={{ fontWeight: '600' }}>
                      Комиссии MLM (₽)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Комиссия D1 (Уровень 1)</Label>
                        <Input
                          type="number"
                          value={settings.комиссия_d1 || ''}
                          onChange={(e) => setSettings({ ...settings, комиссия_d1: Number(e.target.value) })}
                          placeholder="1500"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Комиссия D2 (Уровень 2)</Label>
                        <Input
                          type="number"
                          value={settings.комиссия_d2 || ''}
                          onChange={(e) => setSettings({ ...settings, комиссия_d2: Number(e.target.value) })}
                          placeholder="900"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Комиссия D3 (Уровень 3)</Label>
                        <Input
                          type="number"
                          value={settings.комиссия_d3 || ''}
                          onChange={(e) => setSettings({ ...settings, комиссия_d3: Number(e.target.value) })}
                          placeholder="600"
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={handleUpdateSettings}
                      className="bg-[#39B7FF]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить настройки
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">Логи действий ({logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-[#F7FAFC] rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#1E1E1E]" style={{ fontSize: '14px', fontWeight: '600' }}>
                          {log.action}
                        </p>
                        <p className="text-[#666]" style={{ fontSize: '12px' }}>
                          Админ: {log.adminId}
                        </p>
                      </div>
                      <p className="text-[#666]" style={{ fontSize: '12px' }}>
                        {new Date(log.timestamp).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-8 text-[#666]">
                    Логи пока пусты
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

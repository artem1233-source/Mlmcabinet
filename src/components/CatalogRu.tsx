import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Tag, Loader2, Package, Plus, Edit2, Trash2, Save, X, Upload, Archive, ArchiveRestore, MoreVertical, FolderOpen, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { CatalogDebug } from './CatalogDebug';
import { toast } from 'sonner';
import { CheckoutRu } from './CheckoutRu';
import { GuestSaleModal } from './GuestSaleModal';
import * as api from '../utils/api';
import { CommissionEditor } from './CommissionEditor';
import type { ProductCommission } from '../utils/types/commission';
import { DEFAULT_COMMISSIONS } from '../utils/types/commission';

interface CatalogRuProps {
  currentUser: any;
  onOrderCreated: () => void;
  onAddToCart?: (product: any, isPartner: boolean, quantity: number) => void;
}

export function CatalogRu({ currentUser, onOrderCreated, onAddToCart }: CatalogRuProps) {
  // 🔐 Проверка прав администратора: CEO, admin email, или флаг isAdmin
  const isAdmin = currentUser?.isAdmin === true || 
                  currentUser?.email === 'admin@admin.com' || 
                  currentUser?.id === 'ceo' || 
                  currentUser?.id === '1';
  
  // 🔍 Debug: проверяем статус админа
  console.log('🔍 CatalogRu: currentUser:', currentUser);
  console.log('🔍 CatalogRu: isAdmin:', isAdmin);
  console.log('🔍 CatalogRu: currentUser.isAdmin:', currentUser?.isAdmin);
  console.log('🔍 CatalogRu: currentUser.email:', currentUser?.email);
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showArchived, setShowArchived] = useState(false); // Показывать архивные товары
  
  // Guest sale modal
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestModalProduct, setGuestModalProduct] = useState<any>(null);
  
  // Admin states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Categories management
  const [categories, setCategories] = useState([
    { id: 'general', name: 'Основные' },
    { id: 'hydrogen', name: 'Водородные' },
    { id: 'health', name: 'Здоровье' },
    { id: 'accessories', name: 'Аксессуары' }
  ]);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  
  // Function to generate ID from Russian name
  const generateCategoryId = (name: string): string => {
    const translit: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
      'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 
      'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    return name
      .toLowerCase()
      .split('')
      .map(char => translit[char] || char)
      .join('')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };
  
  // Функция для генерации уникального SKU
  const generateUniqueSKU = (baseName: string = ''): string => {
    const timestamp = Date.now().toString().slice(-6); // Последние 6 цифр timestamp
    const random = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 случайных символа
    
    if (baseName) {
      // Если есть название, используем первые буквы + timestamp
      const prefix = baseName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
      return `${prefix}-${timestamp}`;
    }
    
    // Иначе просто SKU + timestamp + random
    return `SKU-${timestamp}${random}`;
  };
  
  const [productForm, setProductForm] = useState({
    название: '',
    описание: '',
    sku: '',
    изображение: '',
    цена_розница: '', // Розничная цена
    цена1: '',        // Партнёрская цена
    цена2: '',        // Цена 1 линии
    цена3: '',        // Цена 2 линии
    цена4: '',        // Цена 3 линии (база компании)
    категория: 'general',
    в_архиве: false   // false = активен, true = в архиве
  });
  
  // 🆕 Состояние для кастомных комиссий
  const [productCommission, setProductCommission] = useState<ProductCommission | null>(null);

  // 🆕 Состояние для валидации комиссий
  const [commissionValidation, setCommissionValidation] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: true, errors: [] });

  // 🆕 Автоматический расчёт комиссий при изменении цен
  useEffect(() => {
    const retailPrice = parseFloat(productForm.цена_розница) || 0;
    const partnerPrice = parseFloat(productForm.цена1) || 0;
    const price2 = parseFloat(productForm.цена2) || 0;
    const price3 = parseFloat(productForm.цена3) || 0;
    const price4 = parseFloat(productForm.цена4) || 0;

    // Если хотя бы одна цена заполнена, рассчитываем комиссии
    // 🆕 СТРОГАЯ ЛОГИКА: синхронизирована с backend (commission_backend.ts)
    // Если какой-то уровень цены = 0 — комиссия для этого уровня = 0
    if (retailPrice > 0 || partnerPrice > 0) {
      // L0: разница между розничной и партнёрской ценой (всегда)
      const L0 = Math.max(0, retailPrice - partnerPrice);
      
      // L1: разница P1 - P2. Если P2=0 — L1=0
      const L1 = price2 > 0 ? Math.max(0, partnerPrice - price2) : 0;
      
      // L2: разница P2 - P3. Если P3=0 — L2=0
      const L2 = (price2 > 0 && price3 > 0) ? Math.max(0, price2 - price3) : 0;
      
      // L3: разница P3 - P4. Если P4=0 — L3=0
      const L3 = (price3 > 0 && price4 > 0) ? Math.max(0, price3 - price4) : 0;
      
      const calculatedCommission: ProductCommission = {
        guest: {
          L0: L0,  // Продавец получает разницу между розницей и партнёрской ценой
          L1: L1,  // 1 линия спонсора продавца
          L2: L2,  // 2 линия спонсора продавца
          L3: L3   // 3 линия спонсора продавца
        },
        partner: {
          L1: L1,  // 1 линия получает разницу между ценой1 и ценой2
          L2: L2,  // 2 линия получает разницу между ценой2 и ценой3
          L3: L3,  // 3 линия получает разницу между ценой3 и базой
          L4: 0,
          L5: 0
        }
      };
      
      console.log('🔢 Auto-calculated commissions (strict logic):', calculatedCommission);
      console.log('📊 Prices:', { retailPrice, partnerPrice, price2, price3, price4 });
      
      // 🆕 Валидация комиссий
      const errors: string[] = [];
      
      // Проверяем розничные комиссии
      if (retailPrice > 0) {
        const guestSum = calculatedCommission.guest.L0 + calculatedCommission.guest.L1 + 
                        calculatedCommission.guest.L2 + calculatedCommission.guest.L3;
        if (guestSum > retailPrice) {
          errors.push(`❌ Сумма гостевых комиссий (${guestSum.toFixed(2)} ₽) превышает розничную цену (${retailPrice} ₽)`);
        }
        if (guestSum < 0) {
          errors.push(`❌ Сумма гостевых комиссий отрицательная (${guestSum.toFixed(2)} ₽). Проверьте порядок цен.`);
        }
      }
      
      // Проверяем партнёрские комиссии
      if (partnerPrice > 0) {
        const partnerSum = calculatedCommission.partner.L1 + calculatedCommission.partner.L2 + 
                          calculatedCommission.partner.L3;
        if (partnerSum > partnerPrice) {
          errors.push(`❌ Сумма партнёрских комиссий (${partnerSum.toFixed(2)} ₽) превышает партнёрскую цену (${partnerPrice} ₽)`);
        }
        if (partnerSum < 0) {
          errors.push(`❌ Сумма партнёрских комиссий отрицательная (${partnerSum.toFixed(2)} ₽). Проверьте порядок цен.`);
        }
      }
      
      // Проверяем, что цены идут по убыванию
      if (retailPrice > 0 && partnerPrice > 0 && retailPrice <= partnerPrice) {
        errors.push(`⚠️ Розничная цена (${retailPrice} ₽) должна быть больше партнёрской (${partnerPrice} ₽)`);
      }
      if (partnerPrice > 0 && price2 > 0 && partnerPrice <= price2) {
        errors.push(`⚠️ Цена Уровень 1 (${partnerPrice} ₽) должна быть больше Уровень 2 (${price2} ₽)`);
      }
      if (price2 > 0 && price3 > 0 && price2 <= price3) {
        errors.push(`⚠️ Цена Уровень 2 (${price2} ₽) должна быть больше Уровень 3 (${price3} ₽)`);
      }
      if (price3 > 0 && price4 > 0 && price3 <= price4) {
        errors.push(`⚠️ Цена Уровень 3 (${price3} ₽) должна быть больше цены компании (${price4} ₽)`);
      }
      
      // Проверяем на отрицательные комиссии
      Object.entries(calculatedCommission.guest).forEach(([level, value]) => {
        if (value < 0) {
          errors.push(`⚠️ Гостевая комиссия ${level} отрицательная (${value.toFixed(2)} ₽)`);
        }
      });
      Object.entries(calculatedCommission.partner).forEach(([level, value]) => {
        if (value < 0) {
          errors.push(`⚠️ Партнёрская комиссия ${level} отрицательная (${value.toFixed(2)} ₽)`);
        }
      });
      
      setCommissionValidation({
        isValid: errors.length === 0,
        errors
      });
      
      setProductCommission(calculatedCommission);
    } else {
      // Если цены не заполнены, используем дефолтные комиссии по SKU
      const sku = productForm.sku || 'H2-1';
      const defaultComm = DEFAULT_COMMISSIONS[sku as keyof typeof DEFAULT_COMMISSIONS] || DEFAULT_COMMISSIONS['H2-1'];
      setProductCommission(defaultComm);
    }
  }, [productForm.цена_розница, productForm.цена1, productForm.цена2, productForm.цена3, productForm.цена4, productForm.sku]);

  useEffect(() => {
    loadProducts();
    // Load categories from localStorage
    const savedCategories = localStorage.getItem('product_categories');
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories));
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    }
  }, []);
  
  // Save categories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('product_categories', JSON.stringify(categories));
  }, [categories]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading products...');
      const data = await api.getProducts();
      console.log('📦 Products loaded:', data);
      
      if (data.success && data.products) {
        console.log('✅ Setting products:', data.products.length, 'items');
        setProducts(data.products);
      } else {
        console.warn('⚠️ No products in response');
      }
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      toast.error('Не удалось загрузить товары');
    } finally {
      setLoading(false);
    }
  };

  // Двумерная навигация по форме цен (как таблица)
  // 
  // Схема навигации:
  //                    Enter (только по левому столбцу ↓)
  //                    ←→ (горизонтально между столбцами)
  //                    ↑↓ (вертикально в пределах столбца)
  //
  // Столбец "Цены"         Столбец "Доход"
  // ┌─────────────────┐    ┌──────────────┐
  // │ Розничная цена  │ ←→ │  Доход L0    │
  // │       ↕ Enter   │    │      ↕       │
  // │ Цена Уровень 1  │ ←→ │  Доход L1    │
  // │       ↕ Enter   │    │      ↕       │
  // │ Цена Уровень 2  │ ←→ │  Доход L2    │
  // │       ↕ Enter   │    │      ↕       │
  // │ Цена Уровень 3  │ ←→ │  Доход L3    │
  // │       ↕ Enter   │    │              │
  // │ Цена компании   │    │              │
  // └─────────────────┘    └──────────────┘
  //
  const handlePriceFieldNavigation = (
    e: React.KeyboardEvent,
    currentId: string,
    navigation: {
      enter?: string;      // Enter: переход по столбцу цен вниз
      up?: string;         // Стрелка вверх: предыдущая строка в том же столбце
      down?: string;       // Стрелка вниз: следующая строка в том же столбце
      left?: string;       // Стрелка влево: переход в левый столбец в той же строке
      right?: string;      // Стрелка вправо: переход в правый столбец в той же строке
    }
  ) => {
    // Для input type="number" браузер по умолчанию изменяет значение стрелками вверх/вниз
    // Отключаем это поведение для ВСЕХ стрелок, даже если навигация не определена
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
    }
    
    if (e.key === 'Enter' && navigation.enter) {
      e.preventDefault();
      document.getElementById(navigation.enter)?.focus();
    } else if (e.key === 'ArrowUp' && navigation.up) {
      document.getElementById(navigation.up)?.focus();
    } else if (e.key === 'ArrowDown' && navigation.down) {
      document.getElementById(navigation.down)?.focus();
    } else if (e.key === 'ArrowLeft' && navigation.left) {
      document.getElementById(navigation.left)?.focus();
    } else if (e.key === 'ArrowRight' && navigation.right) {
      document.getElementById(navigation.right)?.focus();
    }
    // Tab продолжает работать как обычно (браузерная навигация)
  };

  const handleCreateOrder = async (product: any, isPartner: boolean) => {
    setCreatingOrder(true);
    try {
      // 🆕 Валидация SKU
      const sku = product.sku;
      console.log('📦 Creating order for:', product.название, 'SKU:', sku);
      
      if (!sku || sku.length < 2) {
        console.error('❌ Invalid SKU:', sku, 'for product:', product);
        throw new Error(`Некорректный SKU товара "${product.название}". Обратитесь к администратору.`);
      }
      
      const data = await api.createOrder(sku, isPartner, 1);
      
      if (data.success && data.order) {
        setSelectedOrder(data.order);
        setShowCheckout(true);
        
        const типПокупателя = isPartner ? 'партнёру' : 'гостю';
        toast.success('Заказ создан!', {
          description: `${product.название} - ${типПокупателя}`
        });
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Create order error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка создания заказа');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    setSelectedOrder(null);
    onOrderCreated();
    toast.success('Оплата прошла успешно!');
  };

  // Admin functions
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      console.log('📤 Uploading image:', file.name, file.type, file.size);
      
      // Validate file before upload
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Неверный тип файла. Разрешены только JPEG, PNG и WebP');
        return;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('Файл слишком большой. Максимальный размер: 5MB');
        return;
      }
      
      const data = await api.uploadImage(file);
      console.log('✅ Upload response:', data);
      
      if (data.success && data.url) {
        setProductForm(prev => ({ ...prev, изображение: data.url }));
        toast.success('Изображение загружено!', {
          description: file.name
        });
        // Clear file input after successful upload
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('❌ Upload failed - no URL in response:', data);
        toast.error('Ошибка: изображение не загружено');
      }
    } catch (error) {
      console.error('❌ Image upload error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast.error('Ошибка загрузки изображения', {
        description: errorMsg
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      название: '',
      описание: '',
      sku: '',
      изображение: '',
      цена_розница: '',
      цена1: '',
      цена2: '',
      цена3: '',
      цена4: '',
      категория: categories[0]?.id || 'general',
      в_архиве: false  // По умолчанию новый товар активен (не в архиве)
    });
    // 🆕 Сбрасываем комиссии на null (пользователь должен их настроить!)
    setProductCommission(null);
    // Сбрасываем валидацию
    setCommissionValidation({ isValid: true, errors: [] });
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      название: product.название || '',
      описание: product.описание || '',
      sku: product.sku || '',
      изображение: product.изображение || '',
      цена_розница: product.цена_розница?.toString() || '',
      цена1: product.цена1?.toString() || '',
      цена2: product.цена2?.toString() || '',
      цена3: product.цена3?.toString() || '',
      цена4: product.цена4?.toString() || '',
      категория: product.категория || categories[0]?.id || 'general',
      в_архиве: product.в_архиве || product.archived || false
    });
    // 🆕 Загружаем комиссии товара
    setProductCommission(product.commission || null);
    setShowProductModal(true);
  };

  const handleCreateProduct = async () => {
    // Защита от двойного клика
    if (isSubmitting) {
      console.log('⚠️ Already submitting, ignoring duplicate click');
      return;
    }
    
    // Валидация обязательных полей
    if (!productForm.название || !productForm.sku) {
      toast.error('Заполните название и SKU');
      return;
    }
    
    // 🆕 Валидация SKU
    if (productForm.sku.length < 2) {
      toast.error('SKU должен содержать минимум 2 символа (например: H2-1)');
      return;
    }
    
    if (!productForm.цена_розница || !productForm.цена1) {
      toast.error('Укажите розничную цену и цену Уровень 1 (партнёрскую)');
      return;
    }
    
    // Проверка что цены больше нуля
    const розница = Number(productForm.цена_розница);
    const цена1 = Number(productForm.цена1);
    
    if (розница <= 0 || цена1 <= 0) {
      toast.error('Цены должны быть больше нуля');
      return;
    }
    
    if (розница <= цена1) {
      toast.error('Розничная цена должна быть больше партнёрской');
      return;
    }
    
    // 🆕 Валидация комиссий
    if (!commissionValidation.isValid) {
      toast.error('Исправьте ошибки валидации комиссий');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('📦 Creating product:', productForm);
      console.log('💰 productCommission:', productCommission);
      
      // 🆕 Добавляем комиссии и цены в продукт
      const productData = {
        ...productForm,
        commission: productCommission || null,
        retail_price: parseFloat(productForm.цена_розница) || 0,
        partner_price: parseFloat(productForm.цена1) || 0
      };
      
      console.log('📦 Sending productData:', productData);
      const data = await api.createProduct(productData);
      console.log('✅ Product created:', data);
      
      if (data.success) {
        toast.success('Товар создан', {
          description: productForm.название
        });
        setShowProductModal(false);
        resetProductForm();
        await loadProducts(); // await для уверенности
      } else {
        toast.error('Не удалось создать товар');
      }
    } catch (error) {
      console.error('❌ Create product error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания товара';
      
      // Если ошибка связана с дублированием SKU, предлагаем сгенерировать новый
      if (errorMessage.includes('SKU уже существует')) {
        toast.error('Продукт с таким SKU уже существует', {
          description: 'Нажмите кнопку "Генерировать" для создания нового уникального SKU',
          duration: 5000
        });
      } else {
        toast.error('Ошибка создания товара', {
          description: errorMessage
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    // Защита от двойного клика
    if (isSubmitting) {
      console.log('⚠️ Already submitting, ignoring duplicate click');
      return;
    }

    // Валидация обязательных полей
    if (!productForm.название || !productForm.sku) {
      toast.error('Заполните название и SKU');
      return;
    }
    
    // 🆕 Валидация SKU
    if (productForm.sku.length < 2) {
      toast.error('SKU должен содержать минимум 2 символа (например: H2-1)');
      return;
    }
    
    if (!productForm.цена_розница || !productForm.цена1) {
      toast.error('Укажите розничную цену и цену Уровень 1 (партнёрскую)');
      return;
    }
    
    // Проверка что цены больше нуля
    const розница = Number(productForm.цена_розница);
    const цена1 = Number(productForm.цена1);
    
    if (розница <= 0 || цена1 <= 0) {
      toast.error('Цены должны быть больше нуля');
      return;
    }
    
    if (розница <= цена1) {
      toast.error('Розничная цена должна быть больше партнёрской');
      return;
    }
    
    // 🆕 Валидация комиссий
    if (!commissionValidation.isValid) {
      toast.error('Исправьте ошибки валидации комиссий');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('✏️ Updating product:', editingProduct.id, productForm);
      console.log('💰 productCommission:', productCommission);
      
      // 🆕 Добавляем комиссии и цены в обновление
      const updateData = {
        ...productForm,
        commission: productCommission || null,
        retail_price: parseFloat(productForm.цена_розница) || 0,
        partner_price: parseFloat(productForm.цена1) || 0
      };
      
      const data = await api.updateProduct(editingProduct.id, updateData);
      console.log('✅ Product updated:', data);
      
      if (data.success) {
        toast.success('Товар обновлён', {
          description: productForm.название
        });
        setShowProductModal(false);
        setEditingProduct(null);
        resetProductForm();
        await loadProducts(); // await для уверенности
      } else {
        toast.error('Не удалось обновить товар');
      }
    } catch (error) {
      console.error('❌ Update product error:', error);
      toast.error('Ошибка обновления товара');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
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

  const handleArchiveProduct = async (productId: string, archive: boolean = true) => {
    try {
      const data = await api.archiveProduct(productId, archive);
      if (data.success) {
        toast.success(archive ? 'Товар перемещён в архив' : 'Товар восстановлен из архива');
        loadProducts();
      } else {
        toast.error(archive ? 'Не удалось переместить в архив' : 'Не удалось восстановить товар');
      }
    } catch (error) {
      console.error('Archive product error:', error);
      toast.error('Ошибка архивации товара');
    }
  };

  const handleCleanDuplicates = async () => {
    if (!confirm('Очистить дубликаты товаров в базе данных?\n\nЭто безопасная операция, которая удалит только лишние записи.')) {
      return;
    }
    
    try {
      const data = await api.cleanDuplicateProducts();
      
      if (data.success) {
        toast.success(data.message || 'Дубликаты очищены', {
          description: `Удалено записей: ${data.details?.deletedDuplicates || 0}`
        });
        await loadProducts();
      } else {
        toast.error(data.error || 'Ошибка очистки');
      }
    } catch (error) {
      console.error('Clean duplicates error:', error);
      toast.error('Ошибка очистки дубликатов');
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
            <p className="text-[#666]">Загрузка товаров...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        {/* 🔧 ДИАГНОСТИЧЕСКИЙ КОМПОНЕНТ - ОТКЛЮЧЕН */}
        {/* <CatalogDebug currentUser={currentUser} /> */}
        
        <div className="mb-6 lg:mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
                Каталог товаров
              </h1>
              <p className="text-[#666]">
                Водородный порошок H₂-Touch для здоровья и долголетия
              </p>
            </div>
            
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEditingProduct(null);
                    resetProductForm();
                    // Автоматически генерируем уникальный SKU для нового товара
                    setProductForm(prev => ({ ...prev, sku: generateUniqueSKU() }));
                    setShowProductModal(true);
                  }}
                  className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить товар
                </Button>
                <Button
                  onClick={() => setShowCategoriesModal(true)}
                  variant="outline"
                  className="border-[#39B7FF] text-[#39B7FF] hover:bg-[#39B7FF]/10"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Категории
                </Button>
                <Button
                  onClick={handleCleanDuplicates}
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  title="Очистить дублирующиеся записи товаров"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Очистить дубликаты
                </Button>
              </div>
            )}
          </div>
          
          {/* Переключатель активные/архивные */}
          {isAdmin && (
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setShowArchived(false)}
                variant={!showArchived ? 'default' : 'outline'}
                className={!showArchived ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6]' : ''}
              >
                <Package className="w-4 h-4 mr-2" />
                Активные ({products.filter(p => !p.в_архиве && !p.archived).length})
              </Button>
              <Button
                onClick={() => setShowArchived(true)}
                variant={showArchived ? 'default' : 'outline'}
                className={showArchived ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6]' : ''}
              >
                <Archive className="w-4 h-4 mr-2" />
                Архивные ({products.filter(p => p.в_архиве || p.archived).length})
              </Button>
            </div>
          )}
          
          {/* Category filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              onClick={() => setSelectedCategoryFilter(null)}
              variant={selectedCategoryFilter === null ? 'default' : 'outline'}
              size="sm"
              className={selectedCategoryFilter === null ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6]' : ''}
            >
              Все категории
            </Button>
            {categories.map(category => {
              const count = products.filter(p => {
                const isArchived = p.в_архиве || p.archived;
                const matchesArchiveFilter = showArchived ? isArchived : !isArchived;
                return matchesArchiveFilter && p.категория === category.id;
              }).length;
              
              return (
                <Button
                  key={category.id}
                  onClick={() => setSelectedCategoryFilter(category.id)}
                  variant={selectedCategoryFilter === category.id ? 'default' : 'outline'}
                  size="sm"
                  className={selectedCategoryFilter === category.id ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6]' : ''}
                >
                  <FolderOpen className="w-3 h-3 mr-1" />
                  {category.name} ({count})
                </Button>
              );
            })}
          </div>
        </div>
        
        {(() => {
          const filteredProducts = products.filter(товар => {
            const isArchived = товар.в_архиве || товар.archived;
            const matchesArchiveFilter = showArchived ? isArchived : !isArchived;
            const matchesCategoryFilter = selectedCategoryFilter === null || товар.категория === selectedCategoryFilter;
            return matchesArchiveFilter && matchesCategoryFilter;
          });
          
          if (products.length === 0) {
            return (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-[#666]">Товары не найдены</p>
              </div>
            );
          }
          
          if (filteredProducts.length === 0) {
            return (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {showArchived ? (
                    <Archive className="w-8 h-8 text-gray-400" />
                  ) : (
                    <Package className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <p className="text-[#666]">
                  {showArchived ? 'Нет товаров в архиве' : 'Нет активных товаров'}
                </p>
                {isAdmin && showArchived && (
                  <p className="text-[#999] mt-2" style={{ fontSize: '14px' }}>
                    Архивированные товары появятся здесь
                  </p>
                )}
              </div>
            );
          }
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 auto-rows-fr">
              {filteredProducts.map((товар, index) => {
              // Все товары теперь используют цены из БД
              const розничнаяЦена = Number(товар.цена_розница || товар.розничнаяЦена || 0);
              const партнёрскаяЦена = Number(товар.цена1 || товар.партнёрскаяЦена || 0);
              
              // Вычисляем комиссии из цен
              const цена1 = Number(товар.цена1 || 0);
              const цена2 = Number(товар.цена2 || 0);
              const цена3 = Number(товар.цена3 || 0);
              const цена4 = Number(товар.цена4 || 0);
              
              const комиссииГость = розничнаяЦена - цена1; // L0 = розница - партнёрская
              
              const commissions = {
                L0: комиссииГость,
                L1: цена1 - цена2, // L1 = партнёрская - цена 1 линии
                L2: цена2 - цена3, // L2 = цена 1 линии - цена 2 линии
                L3: цена3 - цена4  // L3 = цена 2 линии - цена 3 линии
              };
              
              const isArchived = товар.в_архиве || товар.archived;
              const hasInvalidPrices = розничнаяЦена === 0 && партнёрскаяЦена === 0;
              
              return (
                <Card 
                  key={`${товар.id}-${товар.sku}-${index}`} 
                  className={`border-[#E6E9EE] rounded-2xl shadow-sm hover:shadow-xl transition-all bg-white overflow-hidden flex flex-col h-full ${isArchived ? 'opacity-60' : ''}`}
                >
                  <div className="relative h-48 bg-gradient-to-br from-[#F7FAFC] to-[#E6E9EE] flex-shrink-0">
                    {isArchived && (
                      <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-lg flex items-center gap-1" style={{ fontSize: '12px', fontWeight: '600' }}>
                        <Archive className="w-3 h-3" />
                        Архив
                      </div>
                    )}
                    {!isArchived && товар.категория && (
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#39B7FF] px-3 py-1 rounded-lg flex items-center gap-1" style={{ fontSize: '12px', fontWeight: '600' }}>
                        <FolderOpen className="w-3 h-3" />
                        {categories.find(c => c.id === товар.категория)?.name || товар.категория}
                      </div>
                    )}
                    <ImageWithFallback
                      src={товар.изображение}
                      alt={товар.название}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-[#1E1E1E] line-clamp-1">{товар.название}</CardTitle>
                        <p className="text-[#666] mt-2 line-clamp-2" style={{ fontSize: '14px' }}>{товар.описание}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Tag size={14} className="text-[#666]" />
                          <span className="text-[#666]" style={{ fontSize: '13px' }}>{товар.sku}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {hasInvalidPrices && isAdmin && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-600" style={{ fontSize: '13px', fontWeight: '600' }}>
                          ⚠️ Товар не настроен
                        </p>
                        <p className="text-red-500 mt-1" style={{ fontSize: '12px' }}>
                          Не указаны цены. Отредактируйте товар.
                        </p>
                      </div>
                    )}
                    
                    <div className="bg-[#F7FAFC] rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[#666]" style={{ fontSize: '13px' }}>Розничная цена</div>
                          <div className={`mt-1 ${hasInvalidPrices ? 'text-red-500' : 'text-[#1E1E1E]'}`} style={{ fontSize: '20px', fontWeight: '700' }}>
                            {hasInvalidPrices ? '—' : `₽${розничнаяЦена.toLocaleString()}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#666]" style={{ fontSize: '13px' }}>Партнёрская цена</div>
                          <div className={`mt-1 ${hasInvalidPrices ? 'text-red-500' : 'text-[#39B7FF]'}`} style={{ fontSize: '20px', fontWeight: '700' }}>
                            {hasInvalidPrices ? '—' : `₽${партнёрскаяЦена.toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                      
                      {!hasInvalidPrices && (
                        <div className="mt-3 pt-3 border-t border-[#E6E9EE]">
                          <div className="flex justify-between items-center">
                            <span className="text-[#666]" style={{ fontSize: '13px' }}>Доход при продаже гостю</span>
                            <span className="text-[#12C9B6]" style={{ fontWeight: '700' }}>
                              +₽{комиссииГость.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {!hasInvalidPrices && (
                      <div className="space-y-2 mb-4">
                        <div className="text-[#666]" style={{ fontWeight: '600', fontSize: '13px' }}>Комиссии MLM:</div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="p-2 bg-[#39B7FF]/10 rounded-lg text-center border border-[#39B7FF]/20">
                            <div className="text-[#666]" style={{ fontSize: '11px' }}>L0</div>
                            <div className="text-[#39B7FF]" style={{ fontWeight: '700', fontSize: '13px' }}>
                              ₽{commissions.L0 || 0}
                            </div>
                          </div>
                          <div className="p-2 bg-[#12C9B6]/10 rounded-lg text-center border border-[#12C9B6]/20">
                            <div className="text-[#666]" style={{ fontSize: '11px' }}>L1</div>
                            <div className="text-[#12C9B6]" style={{ fontWeight: '700', fontSize: '13px' }}>
                              ₽{commissions.L1 || 0}
                          </div>
                        </div>
                        <div className="p-2 bg-[#12C9B6]/10 rounded-lg text-center border border-[#12C9B6]/20">
                          <div className="text-[#666]" style={{ fontSize: '11px' }}>L2</div>
                          <div className="text-[#12C9B6]" style={{ fontWeight: '700', fontSize: '13px' }}>
                            ₽{commissions.L2 || 0}
                          </div>
                        </div>
                        <div className="p-2 bg-[#12C9B6]/10 rounded-lg text-center border border-[#12C9B6]/20">
                          <div className="text-[#666]" style={{ fontSize: '11px' }}>L3</div>
                          <div className="text-[#12C9B6]" style={{ fontWeight: '700', fontSize: '13px' }}>
                            ₽{commissions.L3 || 0}
                          </div>
                        </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {isAdmin && (
                        <div className="flex gap-2 mb-2">
                          <Button
                            onClick={() => openEditProduct(товар)}
                            variant="outline"
                            className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Редактировать
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="border-[#E6E9EE] hover:bg-gray-50 px-3"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {(товар.в_архиве || товар.archived) ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm(`Восстановить товар "${товар.название}" из архива?`)) {
                                        handleArchiveProduct(товар.id, false);
                                      }
                                    }}
                                    className="text-green-600 focus:text-green-600 cursor-pointer"
                                  >
                                    <ArchiveRestore className="w-4 h-4 mr-2" />
                                    Восстановить из архива
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm(`УДАЛИТЬ НАВСЕГДА товар "${товар.название}"?\n\nЭто действие нельзя отменить!`)) {
                                        handleDeleteProduct(товар.id);
                                      }
                                    }}
                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Удалить навсегда
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm(`Переместить товар "${товар.название}" в архив?`)) {
                                        handleArchiveProduct(товар.id, true);
                                      }
                                    }}
                                    className="text-orange-600 focus:text-orange-600 cursor-pointer"
                                  >
                                    <Archive className="w-4 h-4 mr-2" />
                                    Переместить в архив
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm(`УДАЛИТЬ товар "${товар.название}"?\n\nРекомендуется сначала переместить в архив.`)) {
                                        handleDeleteProduct(товар.id);
                                      }
                                    }}
                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Удалить
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      
                      {isArchived ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                          <Archive className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                          <p className="text-orange-600" style={{ fontSize: '14px', fontWeight: '600' }}>
                            Товар в архиве
                          </p>
                          <p className="text-orange-500 mt-1" style={{ fontSize: '12px' }}>
                            Недоступен для продажи
                          </p>
                        </div>
                      ) : hasInvalidPrices ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                          <p className="text-red-600" style={{ fontSize: '14px', fontWeight: '600' }}>
                            ⚠️ Товар не настроен
                          </p>
                          <p className="text-red-500 mt-1" style={{ fontSize: '12px' }}>
                            Установите цены для продажи
                          </p>
                        </div>
                      ) : (
                        <>
                          <Button
                            onClick={() => {
                              setGuestModalProduct(товар);
                              setIsGuestModalOpen(true);
                            }}
                            className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white"
                          >
                            <ShoppingCart size={16} className="mr-2" />
                            Продать гостю (₽{розничнаяЦена.toLocaleString()})
                          </Button>
                          
                          <Button
                            onClick={() => {
                              if (onAddToCart) {
                                onAddToCart(товар, true, 1);
                                toast.success('Добавлено в корзину', {
                                  description: `${товар.название} (партнёр)`
                                });
                              }
                            }}
                            variant="outline"
                            className="w-full border-[#39B7FF] text-[#39B7FF] hover:bg-[#39B7FF]/5"
                          >
                            <ShoppingCart size={16} className="mr-2" />
                            Купить (₽{партнёрскаяЦена.toLocaleString()})
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          );
        })()}
      </div>

      {/* Checkout Modal */}
      {showCheckout && selectedOrder && (
        <CheckoutRu
          order={selectedOrder}
          onClose={() => {
            setShowCheckout(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Admin Product Modal */}
      {isAdmin && (
        <Dialog open={showProductModal} onOpenChange={(open) => {
          setShowProductModal(open);
          if (!open) {
            setEditingProduct(null);
            resetProductForm();
            setIsSubmitting(false);
          } else if (!editingProduct) {
            // При открытии диалога для создания нового товара, генерируем SKU если его нет
            if (!productForm.sku) {
              setProductForm(prev => ({ ...prev, sku: generateUniqueSKU() }));
            }
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Редактировать товар' : 'Создать товар'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct 
                  ? 'Измените параметры товара в каталоге' 
                  : 'Добавьте новый товар в каталог с ценами по уровням'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Название товара *</Label>
                <Input
                  id="product-name"
                  value={productForm.название}
                  onChange={(e) => setProductForm({ ...productForm, название: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('product-description')?.focus();
                    }
                  }}
                  placeholder="Водородный порошок H₂-Touch"
                />
              </div>

              <div>
                <Label>Описание</Label>
                <Textarea
                  id="product-description"
                  value={productForm.описание}
                  onChange={(e) => setProductForm({ ...productForm, описание: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      document.getElementById('product-sku')?.focus();
                    }
                  }}
                  placeholder="Подробное описание товара..."
                  rows={3}
                />
              </div>

              <div>
                <Label>SKU (артикул) *</Label>
                <div className="flex gap-2">
                  <Input
                    id="product-sku"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('price-retail')?.focus();
                      }
                    }}
                    placeholder="H2-1"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newSKU = generateUniqueSKU(productForm.название);
                      setProductForm({ ...productForm, sku: newSKU });
                      toast.success('SKU сгенерирован', { description: newSKU });
                    }}
                    className="whitespace-nowrap"
                    title="Сгенерировать уникальный SKU"
                  >
                    🔄 Генерировать
                  </Button>
                </div>
                {!editingProduct && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 SKU генерируется автоматически. Можно изменить вручную или нажать "Генерировать"
                  </p>
                )}
              </div>

              <div>
                <Label>Изображение товара</Label>
                <div className="space-y-2">
                  {productForm.изображение && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <ImageWithFallback
                        src={productForm.изображение}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setProductForm(prev => ({ ...prev, изображение: '' }));
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                        }}
                        disabled={uploadingImage}
                        className="cursor-pointer"
                      />
                    </div>
                    {uploadingImage && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#39B7FF]" />
                        <span className="text-sm text-gray-600">Загрузка...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Или введите URL изображения (макс. 5MB, форматы: JPEG, PNG, WebP):
                  </p>
                  <Input
                    value={productForm.изображение}
                    onChange={(e) => setProductForm({ ...productForm, изображение: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    disabled={uploadingImage}
                  />
                </div>
              </div>

              {/* Система цен: 2 колонки в одну линию (редактируемые с обеих сторон) */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                {/* Заголовки */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-[#39B7FF]">💰</span> Ценообразование
                  </div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-[#12C9B6]">📊</span> Комиссии
                  </div>
                </div>
                
                {/* Подсказка по ценам */}
                <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
                  <strong>💡 Правило цен:</strong> Розничная &gt; Уровень 1 &gt; Уровень 2 &gt; Уровень 3 &gt; Цена компании. 
                  Каждая следующая цена должна быть меньше предыдущей, чтобы комиссии были положительными.
                </div>
                
                {/* Подсказка по навигации */}
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                  <strong>⌨️ Клавиатурная навигация:</strong> Enter = вниз по столбцу цен (из последней ячейки — к кнопке "Создать") | ↑↓ = вверх/вниз | ←→ = влево/вправо между столбцами
                </div>

                {/* Строка 1: Розничная цена ↔ L0 */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <Label>Розничная цена (₽) *</Label>
                    <Input
                      id="price-retail"
                      type="number"
                      value={productForm.цена_розница}
                      onChange={(e) => setProductForm({ ...productForm, цена_розница: e.target.value })}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-retail', {
                        enter: 'price-level1',
                        down: 'price-level1',
                        right: 'price-l0'
                      })}
                      placeholder="6900"
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Цена для гостей</p>
                  </div>
                  <div>
                    <Label>Доход L0</Label>
                    <Input
                      id="price-l0"
                      type="number"
                      value={productForm.цена_розница && productForm.цена1 ? (Number(productForm.цена_розница || 0) - Number(productForm.цена1 || 0)) : ''}
                      onChange={(e) => {
                        const L0 = Number(e.target.value) || 0;
                        const розница = Number(productForm.цена_розница) || 0;
                        setProductForm({ ...productForm, цена1: String(розница - L0) });
                      }}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-l0', {
                        down: 'price-l1',
                        left: 'price-retail'
                      })}
                      placeholder="2000"
                      className="text-lg border-2 border-green-200 text-green-600 font-semibold"
                    />
                    <p className="text-xs text-gray-500 mt-1">= Розница - Партнёрская</p>
                  </div>
                </div>

                {/* Строка 2: Цена Уровень 1 ↔ L1 */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <Label>Цена Уровень 1 (₽) *</Label>
                    <Input
                      id="price-level1"
                      type="number"
                      value={productForm.цена1}
                      onChange={(e) => setProductForm({ ...productForm, цена1: e.target.value })}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-level1', {
                        enter: 'price-level2',
                        up: 'price-retail',
                        down: 'price-level2',
                        right: 'price-l1'
                      })}
                      placeholder="4900"
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Партнёрская цена</p>
                  </div>
                  <div>
                    <Label>Доход L1</Label>
                    <Input
                      id="price-l1"
                      type="number"
                      value={productForm.цена1 && productForm.цена2 ? (Number(productForm.цена1 || 0) - Number(productForm.цена2 || 0)) : ''}
                      onChange={(e) => {
                        const L1 = Number(e.target.value) || 0;
                        const цена1 = Number(productForm.цена1) || 0;
                        setProductForm({ ...productForm, цена2: String(цена1 - L1) });
                      }}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-l1', {
                        up: 'price-l0',
                        down: 'price-l2',
                        left: 'price-level1'
                      })}
                      placeholder="400"
                      className="text-lg border-2 border-blue-200 text-blue-600 font-semibold"
                    />
                    <p className="text-xs text-gray-500 mt-1">= Ур1 - Ур2</p>
                  </div>
                </div>

                {/* Строка 3: Цена Уровень 2 ↔ L2 */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <Label>Цена Уровень 2 (₽)</Label>
                    <Input
                      id="price-level2"
                      type="number"
                      value={productForm.цена2}
                      onChange={(e) => setProductForm({ ...productForm, цена2: e.target.value })}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-level2', {
                        enter: 'price-level3',
                        up: 'price-level1',
                        down: 'price-level3',
                        right: 'price-l2'
                      })}
                      placeholder="4500"
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Для расчёта L1 = Ур1 - Ур2</p>
                  </div>
                  <div>
                    <Label>Доход L2</Label>
                    <Input
                      id="price-l2"
                      type="number"
                      value={productForm.цена2 && productForm.цена3 ? (Number(productForm.цена2 || 0) - Number(productForm.цена3 || 0)) : ''}
                      onChange={(e) => {
                        const L2 = Number(e.target.value) || 0;
                        const цена2 = Number(productForm.цена2) || 0;
                        setProductForm({ ...productForm, цена3: String(цена2 - L2) });
                      }}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-l2', {
                        up: 'price-l1',
                        down: 'price-l3',
                        left: 'price-level2'
                      })}
                      placeholder="900"
                      className="text-lg border-2 border-orange-200 text-orange-600 font-semibold"
                    />
                    <p className="text-xs text-gray-500 mt-1">= Ур2 - Ур3</p>
                  </div>
                </div>

                {/* Строка 4: Цена Уровень 3 ↔ L3 */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <Label>Цена Уровень 3 (₽)</Label>
                    <Input
                      id="price-level3"
                      type="number"
                      value={productForm.цена3}
                      onChange={(e) => setProductForm({ ...productForm, цена3: e.target.value })}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-level3', {
                        enter: 'price-company',
                        up: 'price-level2',
                        down: 'price-company',
                        right: 'price-l3'
                      })}
                      placeholder="3600"
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Для расчёта L2 = Ур2 - Ур3</p>
                  </div>
                  <div>
                    <Label>Доход L3</Label>
                    <Input
                      id="price-l3"
                      type="number"
                      value={productForm.цена3 && productForm.цена4 ? (Number(productForm.цена3 || 0) - Number(productForm.цена4 || 0)) : ''}
                      onChange={(e) => {
                        const L3 = Number(e.target.value) || 0;
                        const цена3 = Number(productForm.цена3) || 0;
                        setProductForm({ ...productForm, цена4: String(цена3 - L3) });
                      }}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-l3', {
                        up: 'price-l2',
                        left: 'price-level3'
                      })}
                      placeholder="300"
                      className="text-lg border-2 border-purple-200 text-purple-600 font-semibold"
                    />
                    <p className="text-xs text-gray-500 mt-1">= Ур3 - Цена компании</p>
                  </div>
                </div>

                {/* Строка 5: Цена компании ↔ Доход компании */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Цена компании (₽)</Label>
                    <Input
                      id="price-company"
                      type="number"
                      value={productForm.цена4}
                      onChange={(e) => setProductForm({ ...productForm, цена4: e.target.value })}
                      onKeyDown={(e) => handlePriceFieldNavigation(e, 'price-company', {
                        enter: 'submit-product-button',
                        up: 'price-level3',
                        down: 'submit-product-button'
                      })}
                      placeholder="3300"
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Базовая цена компании</p>
                  </div>
                  <div>
                    <Label>Доход компании</Label>
                    <Input
                      type="number"
                      value={productForm.цена4}
                      placeholder="0"
                      className="text-lg border-2 border-gray-300 text-gray-800 font-bold bg-gradient-to-r from-gray-100 to-gray-50"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">= Цена компании</p>
                  </div>
                </div>
              </div>
                
              {/* Итоговая проверка */}
              {productForm.цена1 && productForm.цена4 && (
                <div className="mt-3 space-y-2">
                  {/* Розничная продажа */}
                  {productForm.цена_розница && (
                    <div className={`p-3 rounded-lg ${
                      !commissionValidation.isValid && commissionValidation.errors.some(e => e.includes('гостев'))
                        ? 'bg-red-50 border-2 border-red-300'
                        : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className="text-sm font-semibold text-green-900 mb-1">Розничная продажа (гость покупает за ₽{Number(productForm.цена_розница).toLocaleString()}):</div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">L0: </span>
                          <span className="font-bold">₽{(Number(productForm.цена_розница) - Number(productForm.цена1)).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">L1+L2+L3: </span>
                          <span className="font-bold">₽{(
                            (Number(productForm.цена1) - Number(productForm.цена2 || 0)) +
                            (Number(productForm.цена2 || 0) - Number(productForm.цена3 || 0)) +
                            (Number(productForm.цена3 || 0) - Number(productForm.цена4))
                          ).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Цена компании: </span>
                          <span className="font-bold">₽{Number(productForm.цена4).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Проверка: </span>
                          <span className="font-bold text-green-600">
                            {(
                              (Number(productForm.цена_розница) - Number(productForm.цена1)) +
                              (Number(productForm.цена1) - Number(productForm.цена2 || 0)) +
                              (Number(productForm.цена2 || 0) - Number(productForm.цена3 || 0)) +
                              (Number(productForm.цена3 || 0) - Number(productForm.цена4)) +
                              Number(productForm.цена4)
                            ) === Number(productForm.цена_розница) ? '✅' : '❌'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Партнёрская продажа */}
                  <div className={`p-3 rounded-lg ${
                    !commissionValidation.isValid && commissionValidation.errors.some(e => e.includes('партнёр'))
                      ? 'bg-red-50 border-2 border-red-300'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="text-sm font-semibold text-blue-900 mb-1">Партнёрская продажа (партнёр покупает за ₽{Number(productForm.цена1).toLocaleString()}):</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">L1+L2+L3: </span>
                        <span className="font-bold">₽{(
                          (Number(productForm.цена1) - Number(productForm.цена2 || 0)) +
                          (Number(productForm.цена2 || 0) - Number(productForm.цена3 || 0)) +
                          (Number(productForm.цена3 || 0) - Number(productForm.цена4))
                        ).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Цена компании: </span>
                        <span className="font-bold">₽{Number(productForm.цена4).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Проверка: </span>
                        <span className="font-bold text-blue-600">
                          {(
                            (Number(productForm.цена1) - Number(productForm.цена2 || 0)) +
                            (Number(productForm.цена2 || 0) - Number(productForm.цена3 || 0)) +
                            (Number(productForm.цена3 || 0) - Number(productForm.цена4)) +
                            Number(productForm.цена4)
                          ) === Number(productForm.цена1) ? '✅' : '❌'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🆕 Редактор кастомных комиссий */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-2 text-gray-700">💰 Комиссии партнёрам</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Если не указано, будут использованы комиссии по умолчанию для SKU "{productForm.sku || 'H2-1'}"
                </p>
                
                {/* Ошибки валидации */}
                {!commissionValidation.isValid && commissionValidation.errors.length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-800 mb-1">Ошибки валидации комиссий:</h4>
                        <ul className="space-y-1">
                          {commissionValidation.errors.map((error, idx) => (
                            <li key={idx} className="text-sm text-red-700">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Успешная валидация */}
                {commissionValidation.isValid && productCommission && (
                  parseFloat(productForm.цена_розница) > 0 || parseFloat(productForm.цена1) > 0
                ) && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-700 text-sm">✅ Комиссии корректны</span>
                    </div>
                  </div>
                )}
                
                {productCommission && (
                  <CommissionEditor
                    commission={productCommission}
                    onChange={setProductCommission}
                    retailPrice={parseFloat(productForm.цена_розница) || 0}
                    partnerPrice={parseFloat(productForm.цена1) || 0}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Категория</Label>
                  <select
                    value={productForm.категория}
                    onChange={(e) => setProductForm({ ...productForm, категория: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={!productForm.в_архиве}
                    onChange={(e) => setProductForm({ ...productForm, в_архиве: !e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label>Активен</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  id="submit-product-button"
                  type="button"
                  onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
                  className="bg-[#39B7FF]"
                  disabled={isSubmitting || !commissionValidation.isValid}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSubmitting ? 'Сохранение...' : (editingProduct ? 'Сохранить' : 'Создать')}
                </Button>
                {!commissionValidation.isValid && (
                  <span className="text-sm text-red-600 flex items-center">
                    Исправьте ошибки валидации
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                    resetProductForm();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Categories Management Modal */}
      <Dialog open={showCategoriesModal} onOpenChange={setShowCategoriesModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1E1E1E]">Управление категориями</DialogTitle>
            <DialogDescription>
              Создавайте, редактируйте и удаляйте категории товаров
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add/Edit Category Form */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">
                {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Название категории *</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ name: e.target.value })}
                      placeholder="Новая категория"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (!categoryForm.name.trim()) {
                          toast.error('Введите название категории');
                          return;
                        }
                        
                        if (editingCategory) {
                          // Update category
                          setCategories(prev => prev.map(c => 
                            c.id === editingCategory.id 
                              ? { ...c, name: categoryForm.name }
                              : c
                          ));
                          toast.success('Категория обновлена');
                          setEditingCategory(null);
                        } else {
                          // Generate ID from name
                          const newId = generateCategoryId(categoryForm.name);
                          
                          // Check if ID already exists
                          if (categories.find(c => c.id === newId)) {
                            toast.error('Категория с похожим названием уже существует');
                            return;
                          }
                          // Add new category
                          setCategories(prev => [...prev, { id: newId, name: categoryForm.name }]);
                          toast.success('Категория добавлена');
                        }
                        setCategoryForm({ name: '' });
                      }}
                      className="bg-[#39B7FF] shrink-0"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {editingCategory ? 'Обновить' : 'Добавить'}
                    </Button>
                  </div>
                </div>
                {editingCategory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ name: '' });
                    }}
                  >
                    Отмена редактирования
                  </Button>
                )}
              </div>
            </div>
            
            {/* Categories List */}
            <div className="space-y-2">
              <h3 className="font-semibold">Существующие категории:</h3>
              {categories.map(category => (
                <div 
                  key={category.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-[#39B7FF]" />
                    <div>
                      <div className="font-semibold">{category.name}</div>
                    </div>
                    <div className="text-sm text-gray-400">
                      ({products.filter(p => p.категория === category.id).length} товаров)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryForm({ name: category.name });
                      }}
                      className="border-amber-500 text-amber-600 hover:bg-amber-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const productsInCategory = products.filter(p => p.категория === category.id).length;
                        if (productsInCategory > 0) {
                          toast.error(`Нельзя удалить категорию: в ней ${productsInCategory} товаров`);
                          return;
                        }
                        if (confirm(`Удалить категорию "${category.name}"?`)) {
                          setCategories(prev => prev.filter(c => c.id !== category.id));
                          toast.success('Категория удалена');
                        }
                      }}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoriesModal(false);
                  setEditingCategory(null);
                  setCategoryForm({ name: '' });
                }}
              >
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Sale Modal */}
      <GuestSaleModal
        isOpen={isGuestModalOpen}
        onClose={() => {
          setIsGuestModalOpen(false);
          setGuestModalProduct(null);
        }}
        product={guestModalProduct}
        onOrderCreated={onOrderCreated}
      />
    </>
  );
}

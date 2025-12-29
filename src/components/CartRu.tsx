import { useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { CheckoutRu } from './CheckoutRu';
import { toast } from 'sonner';
import * as api from '../utils/api';

interface CartItem {
  product: any;
  quantity: number;
  isPartner: boolean;
}

interface CartRuProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, isPartner: boolean, quantity: number) => void;
  onRemoveItem: (productId: string, isPartner: boolean) => void;
  onClearCart: () => void;
  onOrderCreated: () => void;
}

export function CartRu({ 
  isOpen, 
  onClose, 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart,
  onOrderCreated 
}: CartRuProps) {
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // Вычисляем общую стоимость корзины
  const totalAmount = cartItems.reduce((sum, item) => {
    const price = item.isPartner 
      ? (Number(item.product.цена1) || Number(item.product.партнёрскаяЦена) || 0)
      : (Number(item.product.цена_розница) || Number(item.product.розничнаяЦена) || 0);
    const itemTotal = price * item.quantity;
    
    // 🆕 Логирование для отладки
    console.log('📦 Cart item:', {
      name: item.product.название,
      price,
      quantity: item.quantity,
      itemTotal,
      isPartner: item.isPartner
    });
    
    return sum + itemTotal;
  }, 0);

  console.log('💰 Total cart amount:', totalAmount);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Корзина пуста');
      return;
    }

    setCreatingOrder(true);
    try {
      // Создаем заказы для каждого товара в корзине
      const orders = [];
      
      for (const item of cartItems) {
        // 🆕 Валидация SKU
        const sku = item.product.sku;
        console.log('📦 Creating order for:', item.product.название, 'SKU:', sku);
        
        if (!sku || sku.length < 2) {
          console.error('❌ Invalid SKU:', sku, 'for product:', item.product);
          
          // Подробное сообщение для пользователя
          const errorMsg = `Некорректный SKU товара "${item.product.название}" (SKU: "${sku}").\n\n` + 
            `Это ошибка в данных товара. Решение:\n` +
            `1. Удалите этот товар из корзины\n` +
            `2. Или сбросьте демо-данные в консоли:\n` +
            `   localStorage.clear(); location.reload()`;
          
          throw new Error(errorMsg);
        }
        
        const data = await api.createOrder(
          sku, 
          item.isPartner, 
          item.quantity
        );
        
        if (data.success && data.order) {
          orders.push(data.order);
        } else {
          throw new Error(`Ошибка создания заказа для ${item.product.название}`);
        }
      }

      // Если несколько заказов, объединяем их в один для оплаты
      if (orders.length === 1) {
        setSelectedOrder(orders[0]);
      } else {
        // Создаем комбинированный заказ для отображения в чекауте
        // 🆕 Используем суммаЗаказа (уже умножено на количество) вместо цена * количество
        const totalPrice = orders.reduce((sum, o) => sum + (o.суммаЗаказа || (o.цена || 0) * (o.количество || 1)), 0);
        const productNames = orders.map(o => `${o.товар} (x${o.количество})`).join(', ');
        
        const combinedOrder = {
          id: orders[0].id, // ID первого заказа (для отображения)
          orderIds: orders.map(o => o.id), // 🆕 Массив всех ID заказов
          товар: productNames, // 🆕 Все товары через запятую
          цена: totalPrice, // 🆕 Общая сумма всех заказов
          количество: orders.reduce((sum, o) => sum + (o.количество || 0), 0),
          суммаЗаказа: totalPrice,
          userId: orders[0].userId,
          статус: orders[0].статус,
          датаЗаказа: orders[0].датаЗаказа,
          isMultipleOrders: true, // 🆕 Флаг что это несколько заказов
          orders: orders // 🆕 Сохраняем все заказы
        };
        
        console.log('📦 Combined order created:', combinedOrder);
        setSelectedOrder(combinedOrder);
      }
      
      setShowCheckout(true);
      onClose(); // Закрываем корзину
      
      toast.success('Заказ создан!', {
        description: `${totalItems} ${totalItems === 1 ? 'товар' : 'товара'} на сумму ₽${totalAmount.toLocaleString()}`
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка оформления заказа');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    setSelectedOrder(null);
    onClearCart();
    onOrderCreated();
    toast.success('Оплата прошла успешно!');
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-[#1E1E1E]">
              <ShoppingCart className="w-5 h-5 text-[#39B7FF]" />
              Корзина ({totalItems})
            </SheetTitle>
            <SheetDescription>
              Просмотрите и измените товары в корзине перед оформлением заказа
            </SheetDescription>
          </SheetHeader>

          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-[#666] text-center">Корзина пуста</p>
              <p className="text-[#999] text-center mt-2" style={{ fontSize: '14px' }}>
                Добавьте товары из каталога
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {/* Список товаров */}
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const price = item.isPartner 
                    ? (Number(item.product.цена1) || Number(item.product.партнёрскаяЦена) || 0)
                    : (Number(item.product.цена_розница) || Number(item.product.розничнаяЦена) || 0);
                  
                  const itemKey = `${item.product.id || item.product.sku}-${item.isPartner ? 'partner' : 'guest'}`;
                  
                  return (
                    <Card key={itemKey} className="border-[#E6E9EE]">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          {/* Изображение товара */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <ImageWithFallback
                              src={item.product.изображение}
                              alt={item.product.название}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Информация  товаре */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[#1E1E1E] truncate" style={{ fontWeight: '600', fontSize: '14px' }}>
                                  {item.product.название}
                                </h4>
                                <p className="text-[#666] mt-1" style={{ fontSize: '12px' }}>
                                  {item.isPartner ? 'Партнёрская цена' : 'Розничная цена'}
                                </p>
                              </div>
                              <button
                                onClick={() => onRemoveItem(item.product.id || item.product.sku, item.isPartner)}
                                className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>

                            {/* Количество и цена */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onUpdateQuantity(item.product.id || item.product.sku, item.isPartner, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-7 h-7 flex items-center justify-center border border-[#E6E9EE] rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Minus className="w-3 h-3 text-[#666]" />
                                </button>
                                <span className="text-[#1E1E1E] w-8 text-center" style={{ fontWeight: '600' }}>
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => onUpdateQuantity(item.product.id || item.product.sku, item.isPartner, item.quantity + 1)}
                                  className="w-7 h-7 flex items-center justify-center border border-[#E6E9EE] rounded-lg hover:bg-gray-50"
                                >
                                  <Plus className="w-3 h-3 text-[#666]" />
                                </button>
                              </div>
                              <div className="text-right">
                                <div className="text-[#39B7FF]" style={{ fontWeight: '700', fontSize: '16px' }}>
                                  ₽{(price * item.quantity).toLocaleString()}
                                </div>
                                {item.quantity > 1 && (
                                  <div className="text-[#999]" style={{ fontSize: '11px' }}>
                                    ₽{price.toLocaleString()} × {item.quantity}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Итого */}
              <div className="sticky bottom-0 bg-white pt-4 pb-4 border-t border-[#E6E9EE] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#666]">Всего товаров:</span>
                  <span className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>{totalItems}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-[#1E1E1E]" style={{ fontWeight: '700', fontSize: '18px' }}>Итого:</span>
                  <span className="text-[#39B7FF]" style={{ fontWeight: '700', fontSize: '20px' }}>
                    ₽{totalAmount.toLocaleString()}
                  </span>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={creatingOrder}
                  className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white h-12"
                >
                  {creatingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Создание заказа...
                    </>
                  ) : (
                    <>
                      Оформить заказ
                    </>
                  )}
                </Button>

                <Button
                  onClick={onClearCart}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  Очистить корзину
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
    </>
  );
}
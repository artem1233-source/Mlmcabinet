import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
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

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = item.isPartner 
      ? (Number(item.product.цена1) || Number(item.product.партнёрскаяЦена) || 0)
      : (Number(item.product.цена_розница) || Number(item.product.розничнаяЦена) || 0);
    return sum + (price * item.quantity);
  }, 0);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Корзина пуста');
      return;
    }

    setCreatingOrder(true);
    try {
      // 🆕 Формируем массив items с ПОЛНЫМИ данными товаров включая комиссии
      const items = cartItems.map(item => {
        const product = item.product;
        const isGuest = !item.isPartner;
        
        // Цены
        const retailPrice = Number(product.цена_розница) || Number(product.розничнаяЦена) || 0;
        const partnerPrice = Number(product.цена1) || Number(product.партнёрскаяЦена) || 0;
        const priceL2 = Number(product.цена2) || 0;
        const priceL3 = Number(product.цена3) || 0;
        const companyPrice = Number(product.цена4) || Number(product.ценаКомпании) || 0;
        
        // Вычисляем комиссии по водопадной схеме
        const payoutL0 = isGuest ? Math.max(0, retailPrice - partnerPrice) : 0;
        const payoutL1 = priceL2 > 0 ? Math.max(0, partnerPrice - priceL2) : 0;
        const payoutL2 = (priceL2 > 0 && priceL3 > 0) ? Math.max(0, priceL2 - priceL3) : 0;
        const payoutL3 = (priceL3 > 0 && companyPrice > 0) ? Math.max(0, priceL3 - companyPrice) : 0;
        
        // Цена продажи
        const salePrice = isGuest ? retailPrice : partnerPrice;
        
        return {
          product_id: product.id || product.sku,
          sku: product.sku,
          name: product.название || product.name || 'Без названия',
          quantity: item.quantity,
          price: salePrice,
          is_guest: isGuest,
          partner_price: partnerPrice,
          retail_price: retailPrice,
          price_l2: priceL2,
          price_l3: priceL3,
          company_price: companyPrice,
          payout_l0: payoutL0,
          payout_l1: payoutL1,
          payout_l2: payoutL2,
          payout_l3: payoutL3,
        };
      });
      
      console.log('📦 Creating order with items:', items);
      
      // Отправляем заказ с полными данными
      const data = await api.createOrderWithItems(items);
      
      if (!data.success) {
        throw new Error(data.error || 'Ошибка создания заказа');
      }
      
      const order = data.order;
      setSelectedOrder({
        id: order.id,
        orderId: order.id,
        товар: items.map(i => `${i.name} (x${i.quantity})`).join(', '),
        цена: totalAmount,
        количество: totalItems,
        суммаЗаказа: totalAmount,
        статус: order.status || 'pending',
        датаЗаказа: order.created_at,
        items: items
      });
      
      setShowCheckout(true);
      onClose();
      
      toast.success('Заказ создан!', {
        description: `${totalItems} товаров на ₽${totalAmount.toLocaleString()}`
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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-5 py-4 border-b border-gray-100 bg-white">
            <DialogTitle className="flex items-center gap-2 text-[#1E1E1E] text-base">
              <ShoppingCart className="w-5 h-5 text-[#39B7FF]" />
              Корзина
              {totalItems > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-[#39B7FF]/10 text-[#39B7FF] rounded-full text-xs font-semibold">
                  {totalItems}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <Package className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-[#666] text-center text-sm">Корзина пуста</p>
              <p className="text-[#999] text-center mt-1 text-xs">
                Добавьте товары из каталога
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-[320px] overflow-y-auto px-4 py-3">
                <div className="space-y-2">
                  {cartItems.map((item) => {
                    const price = item.isPartner 
                      ? (Number(item.product.цена1) || Number(item.product.партнёрскаяЦена) || 0)
                      : (Number(item.product.цена_розница) || Number(item.product.розничнаяЦена) || 0);
                    
                    const itemKey = `${item.product.id || item.product.sku}-${item.isPartner ? 'partner' : 'guest'}`;
                    
                    return (
                      <div 
                        key={itemKey} 
                        className="flex gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100/50"
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-gray-100">
                          <ImageWithFallback
                            src={item.product.изображение}
                            alt={item.product.название}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[#1E1E1E] text-sm font-medium truncate leading-tight">
                                {item.product.название}
                              </h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {item.isPartner ? 'Для себя' : 'Для гостя'}
                              </p>
                            </div>
                            <button
                              onClick={() => onRemoveItem(item.product.id || item.product.sku, item.isPartner)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors -mr-1 -mt-1"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onUpdateQuantity(item.product.id || item.product.sku, item.isPartner, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus className="w-3 h-3 text-gray-500" />
                              </button>
                              <span className="text-[#1E1E1E] w-6 text-center text-sm font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.product.id || item.product.sku, item.isPartner, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                              >
                                <Plus className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                            <div className="text-right">
                              <div className="text-[#39B7FF] text-sm font-bold">
                                ₽{(price * item.quantity).toLocaleString()}
                              </div>
                              {item.quantity > 1 && (
                                <div className="text-[10px] text-gray-400">
                                  {price.toLocaleString()} × {item.quantity}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Товаров: {totalItems}</span>
                  <span className="text-[#1E1E1E] text-lg font-bold">
                    ₽{totalAmount.toLocaleString()}
                  </span>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={creatingOrder}
                  className="w-full bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white h-11 rounded-xl font-semibold"
                >
                  {creatingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Оформляю...
                    </>
                  ) : (
                    'Оформить заказ'
                  )}
                </Button>

                <button
                  onClick={onClearCart}
                  className="w-full text-center text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
                >
                  Очистить корзину
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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

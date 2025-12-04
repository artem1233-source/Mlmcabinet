import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, ShoppingBag, User, Phone, DollarSign } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import * as api from '../utils/api';

interface GuestSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onOrderCreated: () => void;
}

export function GuestSaleModal({ isOpen, onClose, product, onOrderCreated }: GuestSaleModalProps) {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!product) return null;

  const розничнаяЦена = Number(product.цена_розница || product.розничнаяЦена || 0);
  
  const getL0Commission = () => {
    if (product.commission?.guest?.L0 !== undefined) {
      return product.commission.guest.L0;
    }
    if (product.комиссии?.d0 !== undefined) {
      return product.комиссии.d0;
    }
    return product.sku === 'H2-3' ? 4500 : 1600;
  };
  
  const комиссияПродавца = getL0Commission();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Шаг 1: Создаём заказ
      const createData = await api.createOrder(product.sku, false, 1);
      
      if (!createData.success || !createData.order) {
        throw new Error(createData.error || 'Ошибка создания заказа');
      }
      
      const orderId = createData.order.id;
      console.log('📦 Order created:', orderId);
      
      // Шаг 2: Подтверждаем заказ (это начисляет комиссии!)
      const confirmData = await api.confirmOrder(orderId);
      
      if (!confirmData.success) {
        throw new Error(confirmData.error || 'Ошибка подтверждения заказа');
      }
      
      console.log('✅ Order confirmed, commissions created');
      
      toast.success('Продажа оформлена!', {
        description: `${product.название} — гостю${guestName ? ` ${guestName}` : ''}`
      });
      
      setGuestName('');
      setGuestPhone('');
      onClose();
      onOrderCreated();
    } catch (error) {
      console.error('Guest sale error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка оформления продажи');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setGuestName('');
      setGuestPhone('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E1E1E]">
            <ShoppingBag className="w-5 h-5 text-[#39B7FF]" />
            Продажа гостю
          </DialogTitle>
          <DialogDescription>
            Оформите быструю продажу товара гостю
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white">
              <ImageWithFallback
                src={product.изображение || product.image}
                alt={product.название}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#1E1E1E] truncate" style={{ fontSize: '15px' }}>
                {product.название}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#39B7FF] font-bold" style={{ fontSize: '18px' }}>
                  ₽{розничнаяЦена.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-600" style={{ fontSize: '13px', fontWeight: '600' }}>
                  Ваш доход: ₽{комиссияПродавца.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="guestName" className="text-[#666] text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Имя гостя (необязательно)
              </Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Введите имя"
                className="mt-1.5"
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="guestPhone" className="text-[#666] text-sm flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Телефон гостя (необязательно)
              </Label>
              <Input
                id="guestPhone"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__"
                className="mt-1.5"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 sm:flex-none bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Оформляю...
              </>
            ) : (
              'Подтвердить продажу'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { X, CreditCard, Wallet, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CheckoutRuProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckoutRu({ order, onClose, onSuccess }: CheckoutRuProps) {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      const { getPaymentMethods } = await import('../utils/api');
      const data = await getPaymentMethods();
      
      if (data.success && data.methods) {
        setPaymentMethods(data.methods);
        // Auto-select first enabled method
        const firstEnabled = data.methods.find((m: any) => m.enabled);
        if (firstEnabled) {
          setSelectedMethod(firstEnabled.id);
        }
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      toast.error('Не удалось загрузить способы оплаты');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Выберите способ оплаты');
      return;
    }

    setProcessing(true);
    setPaymentStatus('processing');

    try {
      const { createPayment } = await import('../utils/api');
      
      // 🆕 Если это несколько заказов, оплачиваем каждый
      const orderIds = order.isMultipleOrders && order.orderIds ? order.orderIds : [order.id];
      
      console.log('💳 Processing payment for orders:', orderIds);
      
      // Создаем платежи для всех заказов
      const paymentPromises = orderIds.map((orderId: string) => createPayment(orderId, selectedMethod));
      const paymentResults = await Promise.all(paymentPromises);
      
      // Проверяем что все платежи созданы
      if (paymentResults.every(data => data.success && data.payment)) {
        const firstPayment = paymentResults[0].payment;
        setPaymentData(firstPayment);

        if (firstPayment.paymentUrl) {
          // Redirect to payment page (YooKassa)
          window.location.href = firstPayment.paymentUrl;
        } else if (selectedMethod === 'demo') {
          // Demo payment - wait for auto-confirmation
          toast.info(`Демо-оплата обрабатывается для ${orderIds.length} заказов...`);
          
          // Poll for order status
          const checkInterval = setInterval(async () => {
            try {
              const { getOrders } = await import('../utils/api');
              const ordersData = await getOrders();
              
              if (ordersData.success) {
                // Проверяем что все заказы оплачены
                const allPaid = orderIds.every((orderId: string) => {
                  const updatedOrder = ordersData.orders.find((o: any) => o.id === orderId);
                  return updatedOrder && updatedOrder.статус === 'paid';
                });
                
                if (allPaid) {
                  clearInterval(checkInterval);
                  setPaymentStatus('success');
                  toast.success(`Все ${orderIds.length} заказов оплачены успешно!`);
                  setTimeout(() => {
                    onSuccess();
                  }, 1500);
                }
              }
            } catch (err) {
              console.error('Failed to check order status:', err);
            }
          }, 1000);

          // Stop checking after 10 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            if (paymentStatus === 'processing') {
              toast.warning('Проверка статуса заказа превысила лимит времени. Проверьте раздел "Заказы".');
            }
          }, 10000);
        } else if (selectedMethod === 'usdt') {
          // Show crypto payment instructions
          setPaymentStatus('idle');
          toast.info('Инструкции по оплате криптовалютой отображены');
        }
      } else {
        throw new Error('Failed to create payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      toast.error(error instanceof Error ? error.message : 'Ошибка при создании платежа');
    } finally {
      setProcessing(false);
    }
  };

  const getMethodIcon = (methodId: string) => {
    switch (methodId) {
      case 'yookassa':
        return <CreditCard className="w-5 h-5" />;
      case 'usdt':
        return <Wallet className="w-5 h-5" />;
      case 'demo':
        return <Zap className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
            Оплата прошла успешно!
          </h2>
          <p className="text-[#666] mb-6">
            Заказ {order.id} оплачен. Комиссии начислены участникам структуры.
          </p>
          <button
            onClick={onSuccess}
            className="w-full py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-xl hover:opacity-90 transition-all"
            style={{ fontWeight: '600' }}
          >
            Отлично!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-[#1E1E1E]" style={{ fontSize: '20px', fontWeight: '700' }}>
            Оплата заказа
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-[#666]" />
          </button>
        </div>

        {/* Order Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#666]" style={{ fontSize: '14px' }}>Заказ</span>
            <span className="text-[#1E1E1E]" style={{ fontSize: '14px', fontWeight: '600' }}>{order.id}</span>
          </div>
          
          {/* 🆕 Товары - если несколько заказов, показываем список */}
          {order.isMultipleOrders && order.orders ? (
            <div className="mb-3">
              <span className="text-[#666] block mb-2" style={{ fontSize: '14px' }}>Товары:</span>
              <div className="space-y-1.5">
                {order.orders.map((o: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[#1E1E1E] bg-gray-50 rounded-lg p-3">
                    <div className="flex-1">
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>
                        {o.товар}
                      </div>
                      <div className="text-[#999] mt-0.5" style={{ fontSize: '11px' }}>
                        ₽{o.цена?.toLocaleString()} × {o.количество}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div style={{ fontSize: '14px', fontWeight: '600' }} className="text-[#39B7FF]">
                        ₽{(o.суммаЗаказа || (o.цена * o.количество))?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between mb-3">
              <span className="text-[#666]" style={{ fontSize: '14px' }}>Товар</span>
              <span className="text-[#1E1E1E] text-right ml-4" style={{ fontSize: '14px', fontWeight: '600', maxWidth: '60%' }}>
                {order.товар}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-[#666]" style={{ fontSize: '14px' }}>Сумма к оплате</span>
            <span className="text-[#39B7FF]" style={{ fontSize: '20px', fontWeight: '700' }}>
              {(() => {
                const amount = order.total_amount || order.суммаЗаказа || order.общаяСумма || order.цена;
                if (!amount && amount !== 0) {
                  return <Loader2 className="w-5 h-5 animate-spin inline" />;
                }
                return `₽${Number(amount).toLocaleString()}`;
              })()}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6">
          <h3 className="text-[#1E1E1E] mb-4" style={{ fontSize: '16px', fontWeight: '600' }}>
            Способ оплаты
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#39B7FF] animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={!method.enabled || processing}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedMethod === method.id
                      ? 'border-[#39B7FF] bg-[#39B7FF]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!method.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedMethod === method.id ? 'bg-[#39B7FF] text-white' : 'bg-gray-100 text-[#666]'
                    }`}>
                      {getMethodIcon(method.id)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[#1E1E1E]" style={{ fontSize: '14px', fontWeight: '600' }}>
                        {method.name}
                      </p>
                      <p className="text-[#666]" style={{ fontSize: '12px' }}>
                        {method.description}
                      </p>
                    </div>
                    {selectedMethod === method.id && (
                      <CheckCircle2 className="w-5 h-5 text-[#39B7FF]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Crypto Payment Details */}
          {selectedMethod === 'usdt' && paymentData && (
            <div className="mt-4 p-4 bg-[#F7FAFC] rounded-xl">
              <p className="text-[#1E1E1E] mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                Инструкция по оплате:
              </p>
              <ol className="space-y-2 text-[#666]" style={{ fontSize: '13px' }}>
                <li>1. Отправьте {paymentData.amount} USDT на адрес:</li>
                <li className="font-mono bg-white p-2 rounded border border-gray-200 break-all">
                  {paymentData.address}
                </li>
                <li>2. После оплаты заказ будет обработан автоматически</li>
              </ol>
            </div>
          )}

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={!selectedMethod || processing}
            className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontWeight: '600' }}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Обработка...</span>
              </>
            ) : (
              <span>Оплатить ₽{Number(order.total_amount || order.суммаЗаказа || order.общаяСумма || order.цена || 0).toLocaleString()}</span>
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-6 bg-[#F7FAFC] border-t border-gray-200">
          <p className="text-[#666] text-center" style={{ fontSize: '12px' }}>
            🔒 Безопасная оплата. Ваши данные защищены
          </p>
        </div>
      </div>
    </div>
  );
}
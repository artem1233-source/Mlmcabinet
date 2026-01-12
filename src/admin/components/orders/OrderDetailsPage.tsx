import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { OrderDetailsDrawer } from './OrderDetailsDrawer';

interface OrderDetailsPageProps {
  orderId: string;
  onBack: () => void;
  userRole: string;
}

export function OrderDetailsPage({ orderId, onBack, userRole }: OrderDetailsPageProps) {
  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Назад к заказам
      </Button>

      {/* Reuse drawer content but in page layout */}
      <div className="max-w-4xl">
        <OrderDetailsDrawer 
          orderId={orderId} 
          onClose={onBack} 
          userRole={userRole}
        />
      </div>
    </div>
  );
}

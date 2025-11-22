import { Wallet, TrendingUp, Download, CreditCard, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';

interface BalanceProps {
  userBalance: number;
  orders: any[];
  payoutMethod: string;
  onPayout: () => void;
  onPayoutMethodChange: (method: string) => void;
}

export function BalanceNew({ userBalance, orders, payoutMethod, onPayout, onPayoutMethodChange }: BalanceProps) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const handlePayout = () => {
    if (userBalance >= 1000) {
      onPayout();
      toast.success('Payout request submitted!', {
        description: `₽1,000 will be sent to your ${payoutMethod} within 3-5 business days.`
      });
    } else {
      toast.error('Insufficient balance', {
        description: 'Minimum payout amount is ₽1,000.'
      });
    }
  };
  
  const getPayoutIcon = () => {
    switch (payoutMethod) {
      case 'USDT':
        return <Wallet size={24} />;
      case 'Card':
        return <CreditCard size={24} />;
      case 'Bank':
        return <Landmark size={24} />;
      default:
        return <Wallet size={24} />;
    }
  };
  
  return (
    <div className="p-8" style={{ backgroundColor: '#F7FAFC' }}>
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '700' }}>
        Balance & Payouts
      </h1>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="border-0 rounded-2xl shadow-sm bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet size={24} />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white" style={{ fontSize: '56px', fontWeight: '700' }}>
              ₽{userBalance.toLocaleString()}
            </div>
            <p className="text-white opacity-90 mt-2">Available for withdrawal</p>
            
            <div className="mt-6 space-y-3">
              <div>
                <label className="text-white opacity-90 mb-2 block">Payout Method</label>
                <Select value={payoutMethod} onValueChange={onPayoutMethodChange}>
                  <SelectTrigger className="bg-white/20 border-white/30 text-white backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT (Tether)</SelectItem>
                    <SelectItem value="Card">Bank Card</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handlePayout}
                className="w-full bg-white text-[#39B7FF] hover:bg-gray-100"
                style={{ fontWeight: '600' }}
              >
                <Download size={18} className="mr-2" />
                Request Payout (₽1,000)
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#222] flex items-center gap-2">
              <TrendingUp size={20} className="text-[#12C9B6]" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-[#666]">Total Orders</div>
                <div className="text-[#222] mt-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                  {orders.length}
                </div>
              </div>
              <div>
                <div className="text-[#666]">Total Earned</div>
                <div className="text-[#12C9B6] mt-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                  ₽{orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[#666]">Payout Method</div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-10 h-10 bg-[#F7FAFC] rounded-lg flex items-center justify-center">
                    {getPayoutIcon()}
                  </div>
                  <span className="text-[#222]" style={{ fontWeight: '600' }}>{payoutMethod}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-[#222]">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9EE]">
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Order ID</TableHead>
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Date</TableHead>
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Product</TableHead>
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Buyer</TableHead>
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Status</TableHead>
                <TableHead className="text-right" style={{ fontWeight: '600', color: '#222' }}>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => (
                <TableRow key={order.id} className="border-[#E6E9EE]">
                  <TableCell className="text-[#666]">{order.id}</TableCell>
                  <TableCell className="text-[#666]">
                    {new Date(order.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="text-[#666]">{order.productSku}</TableCell>
                  <TableCell className="text-[#666]">{order.buyer}</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-lg ${
                      order.status === 'completed' 
                        ? 'bg-[#12C9B6]/10 text-[#12C9B6]' 
                        : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                    }`} style={{ fontWeight: '600', fontSize: '12px' }}>
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-[#12C9B6]" style={{ fontWeight: '700', fontSize: '16px' }}>
                    +₽{order.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { Wallet, TrendingUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';

interface BalanceProps {
  userBalance: number;
  orders: any[];
  onPayout: () => void;
}

export function Balance({ userBalance, orders, onPayout }: BalanceProps) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const handlePayout = () => {
    if (userBalance >= 1000) {
      onPayout();
      toast.success('Payout request submitted!', {
        description: '₽1,000 will be processed within 3-5 business days.'
      });
    } else {
      toast.error('Insufficient balance', {
        description: 'Minimum payout amount is ₽1,000.'
      });
    }
  };
  
  return (
    <div className="p-8">
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '600' }}>
        Balance & Payouts
      </h1>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-gradient-to-br from-[#3FB7FF] to-[#2A9FE8] col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet size={24} />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white" style={{ fontSize: '48px', fontWeight: '700' }}>
              ₽{userBalance.toLocaleString()}
            </div>
            <p className="text-white opacity-90 mt-2">Available for withdrawal</p>
            
            <Button 
              onClick={handlePayout}
              className="mt-6 bg-white text-[#3FB7FF] hover:bg-gray-100"
              style={{ fontWeight: '600' }}
            >
              <Download size={18} className="mr-2" />
              Request Payout
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#222] flex items-center gap-2">
              <TrendingUp size={20} className="text-[#22C55E]" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-[#666]">Total Orders</div>
                <div className="text-[#222] mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                  {orders.length}
                </div>
              </div>
              <div>
                <div className="text-[#666]">Total Earned</div>
                <div className="text-[#22C55E] mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                  ₽{orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#222]">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9EE]">
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Order ID</TableHead>
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Date</TableHead>
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Type</TableHead>
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
                  <TableCell>
                    <span className="px-3 py-1 bg-[#22C55E]/10 text-[#22C55E] rounded-lg" style={{ fontWeight: '600' }}>
                      Commission
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-[#22C55E]" style={{ fontWeight: '700', fontSize: '16px' }}>
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

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface OrdersProps {
  orders: any[];
}

export function Orders({ orders }: OrdersProps) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalD0 = orders.reduce((sum, order) => sum + order.d0, 0);
  const totalD1 = orders.reduce((sum, order) => sum + order.d1, 0);
  const totalD2 = orders.reduce((sum, order) => sum + order.d2, 0);
  const totalD3 = orders.reduce((sum, order) => sum + order.d3, 0);
  const totalAll = orders.reduce((sum, order) => sum + order.total, 0);
  
  return (
    <div className="p-8">
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '600' }}>
        Orders History
      </h1>
      
      <div className="grid grid-cols-5 gap-4 mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="text-[#666]">L0 Total</div>
            <div className="text-[#3FB7FF] mt-1" style={{ fontSize: '20px', fontWeight: '700' }}>
              ₽{totalD0.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="text-[#666]">L1 Total</div>
            <div className="text-[#22C55E] mt-1" style={{ fontSize: '20px', fontWeight: '700' }}>
              ₽{totalD1.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="text-[#666]">L2 Total</div>
            <div className="text-[#F59E0B] mt-1" style={{ fontSize: '20px', fontWeight: '700' }}>
              ₽{totalD2.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="text-[#666]">L3 Total</div>
            <div className="text-[#EF4444] mt-1" style={{ fontSize: '20px', fontWeight: '700' }}>
              ₽{totalD3.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-[#3FB7FF]">
          <CardContent className="pt-6">
            <div className="text-white opacity-90">Total Income</div>
            <div className="text-white mt-1" style={{ fontSize: '20px', fontWeight: '700' }}>
              ₽{totalAll.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#222]">All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9EE]">
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Order ID</TableHead>
                <TableHead style={{ fontWeight: '600', color: '#222' }}>Date</TableHead>
                <TableHead className="text-right" style={{ fontWeight: '600', color: '#222' }}>L0</TableHead>
                <TableHead className="text-right" style={{ fontWeight: '600', color: '#222' }}>L1</TableHead>
                <TableHead className="text-right" style={{ fontWeight: '600', color: '#222' }}>L2</TableHead>
                <TableHead className="text-right" style={{ fontWeight: '600', color: '#222' }}>L3</TableHead>
                <TableHead className="text-right" style={{ fontWeight: '600', color: '#222' }}>Total</TableHead>
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
                      day: 'numeric' 
                    })}
                  </TableCell>
                  <TableCell className="text-right text-[#3FB7FF]" style={{ fontWeight: '600' }}>
                    ₽{order.d0.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[#22C55E]" style={{ fontWeight: '600' }}>
                    ₽{order.d1.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[#F59E0B]" style={{ fontWeight: '600' }}>
                    ₽{order.d2.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[#EF4444]" style={{ fontWeight: '600' }}>
                    ₽{order.d3.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[#222]" style={{ fontWeight: '700' }}>
                    ₽{order.total.toLocaleString()}
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

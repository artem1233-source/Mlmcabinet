import { TrendingUp, DollarSign, Users, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  selectedProduct: any;
  orders: any[];
}

// Income calculation function
function calcIncome(product: any) {
  if (!product) {
    return { d0: 0, d1: 0, d2: 0, d3: 0, total: 0 };
  }
  const P = product;
  const d0 = P.price0 - P.price1;
  const d1 = P.price1 - P.price2;
  const d2 = P.price2 - P.price3;
  const d3 = P.price3 - P.basePrice;
  return { d0, d1, d2, d3, total: d0 + d1 + d2 + d3 };
}

export function Dashboard({ selectedProduct, orders }: DashboardProps) {
  const income = calcIncome(selectedProduct);
  
  // Sample chart data
  const chartData = [
    { month: 'Jan', income: 4500 },
    { month: 'Feb', income: 5200 },
    { month: 'Mar', income: 4800 },
    { month: 'Apr', income: 6100 },
    { month: 'May', income: 7300 },
    { month: 'Jun', income: 8500 },
  ];
  
  // Calculate total from orders
  const totalFromOrders = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="p-8">
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '600' }}>
        Hydrogen Network Dashboard
      </h1>
      
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[#666]">Level 0 Income</CardTitle>
            <DollarSign className="h-4 w-4 text-[#3FB7FF]" />
          </CardHeader>
          <CardContent>
            <div className="text-[#222]" style={{ fontSize: '28px', fontWeight: '700' }}>
              ₽{income.d0.toLocaleString()}
            </div>
            <p className="text-[#666] mt-1">Direct sales</p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[#666]">Level 1 Income</CardTitle>
            <Users className="h-4 w-4 text-[#3FB7FF]" />
          </CardHeader>
          <CardContent>
            <div className="text-[#222]" style={{ fontSize: '28px', fontWeight: '700' }}>
              ₽{income.d1.toLocaleString()}
            </div>
            <p className="text-[#666] mt-1">First line</p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[#666]">Level 2 Income</CardTitle>
            <Award className="h-4 w-4 text-[#3FB7FF]" />
          </CardHeader>
          <CardContent>
            <div className="text-[#222]" style={{ fontSize: '28px', fontWeight: '700' }}>
              ₽{income.d2.toLocaleString()}
            </div>
            <p className="text-[#666] mt-1">Second line</p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[#666]">Level 3 Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#3FB7FF]" />
          </CardHeader>
          <CardContent>
            <div className="text-[#222]" style={{ fontSize: '28px', fontWeight: '700' }}>
              ₽{income.d3.toLocaleString()}
            </div>
            <p className="text-[#666] mt-1">Third line</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm mb-8">
        <CardHeader>
          <CardTitle className="text-[#222]">Total Income Per Sale</CardTitle>
          <p className="text-[#3FB7FF]" style={{ fontSize: '36px', fontWeight: '700', marginTop: '8px' }}>
            ₽{income.total.toLocaleString()}
          </p>
        </CardHeader>
      </Card>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#222]">Income Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#3FB7FF" 
                strokeWidth={3}
                dot={{ fill: '#3FB7FF', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

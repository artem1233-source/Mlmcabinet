import { TrendingUp, DollarSign, Users, Award, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState } from 'react';
import { toast } from 'sonner';

interface DashboardProps {
  selectedProduct: any;
  orders: any[];
  users: any[];
  onAddPartner: (partner: any) => void;
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

export function DashboardNew({ selectedProduct, orders, users, onAddPartner }: DashboardProps) {
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerLevel, setPartnerLevel] = useState('0');
  
  const income = calcIncome(selectedProduct);
  
  // Sample chart data
  const weeklyData = [
    { day: 'Mon', income: 4500 },
    { day: 'Tue', income: 5200 },
    { day: 'Wed', income: 4800 },
    { day: 'Thu', income: 6100 },
    { day: 'Fri', income: 7300 },
    { day: 'Sat', income: 8500 },
    { day: 'Sun', income: 6800 },
  ];
  
  const levelDistribution = [
    { level: 'L0', count: users.filter(u => u.level === 0).length },
    { level: 'L1', count: users.filter(u => u.level === 1).length },
    { level: 'L2', count: users.filter(u => u.level === 2).length },
    { level: 'L3', count: users.filter(u => u.level === 3).length },
  ];
  
  // Calculate total from orders
  const totalFromOrders = orders.reduce((sum, order) => sum + order.total, 0);
  
  const handleAddPartner = () => {
    if (!partnerName || !partnerEmail || !partnerPhone) {
      toast.error('Please fill in all fields');
      return;
    }
    
    const newPartner = {
      name: partnerName,
      email: partnerEmail,
      phone: partnerPhone,
      level: parseInt(partnerLevel),
    };
    
    onAddPartner(newPartner);
    toast.success('Partner added!', {
      description: `${partnerName} has been added to your network.`
    });
    
    setIsAddPartnerOpen(false);
    setPartnerName('');
    setPartnerEmail('');
    setPartnerPhone('');
    setPartnerLevel('0');
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#F7FAFC' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[#222]" style={{ fontSize: '32px', fontWeight: '700' }}>
          Hydrogen Network Dashboard
        </h1>
        
        <Dialog open={isAddPartnerOpen} onOpenChange={setIsAddPartnerOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#39B7FF] hover:bg-[#2A9FE8] text-white" style={{ fontWeight: '600' }}>
              <UserPlus size={18} className="mr-2" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Partner</DialogTitle>
              <DialogDescription>
                Fill out the form to add a new partner to your team structure.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="partner-name">Full Name</Label>
                <Input
                  id="partner-name"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Enter partner name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="partner-email">Email</Label>
                <Input
                  id="partner-email"
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="partner@email.com"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="partner-phone">Phone</Label>
                <Input
                  id="partner-phone"
                  type="tel"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="partner-level">Starting Level</Label>
                <Select value={partnerLevel} onValueChange={setPartnerLevel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Level 0 - Starter</SelectItem>
                    <SelectItem value="1">Level 1 - Curator</SelectItem>
                    <SelectItem value="2">Level 2 - Mentor</SelectItem>
                    <SelectItem value="3">Level 3 - Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleAddPartner} className="w-full bg-[#39B7FF] hover:bg-[#2A9FE8]">
                Add Partner
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[#666]">Level 0 Income</CardTitle>
            <DollarSign className="h-4 w-4 text-[#39B7FF]" />
          </CardHeader>
          <CardContent>
            <div className="text-[#222]" style={{ fontSize: '28px', fontWeight: '700' }}>
              ₽{income.d0.toLocaleString()}
            </div>
            <p className="text-[#666] mt-1">Direct sales</p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[#666]">Level 1 Income</CardTitle>
            <Users className="h-4 w-4 text-[#12C9B6]" />
          </CardHeader>
          <CardContent>
            <div className="text-[#222]" style={{ fontSize: '28px', fontWeight: '700' }}>
              ₽{income.d1.toLocaleString()}
            </div>
            <p className="text-[#666] mt-1">First line</p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[#666]">Level 2 Income</CardTitle>
            <Award className="h-4 w-4 text-[#F59E0B]" />
          </CardHeader>
          <CardContent>
            <div className="text-[#222]" style={{ fontSize: '28px', fontWeight: '700' }}>
              ₽{income.d2.toLocaleString()}
            </div>
            <p className="text-[#666] mt-1">Second line</p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[#666]">Level 3 Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#EF4444]" />
          </CardHeader>
          <CardContent>
            <div className="text-[#222]" style={{ fontSize: '28px', fontWeight: '700' }}>
              ₽{income.d3.toLocaleString()}
            </div>
            <p className="text-[#666] mt-1">Third line</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm col-span-2 bg-white">
          <CardHeader>
            <CardTitle className="text-[#222]">Total Network Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#39B7FF]" style={{ fontSize: '48px', fontWeight: '700' }}>
              ₽{income.total.toLocaleString()}
            </div>
            <p className="text-[#666] mt-2">Per sale commission breakdown</p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#222]">Network Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-[#666]">Total Partners</div>
                <div className="text-[#222] mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                  {users.length}
                </div>
              </div>
              <div>
                <div className="text-[#666]">Active Orders</div>
                <div className="text-[#12C9B6] mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                  {orders.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#222]">Weekly Income Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
                <XAxis dataKey="day" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#39B7FF" 
                  strokeWidth={3}
                  dot={{ fill: '#39B7FF', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#222]">Team Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={levelDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E9EE" />
                <XAxis dataKey="level" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Bar dataKey="count" fill="#39B7FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

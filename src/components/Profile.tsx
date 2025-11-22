import { User, Copy, Check, Award, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface ProfileProps {
  user: any;
}

export function Profile({ user }: ProfileProps) {
  const [copied, setCopied] = useState(false);
  
  const levelLabels = ['Starter', 'Curator', 'Mentor', 'Leader'];
  const levelColors = ['#3FB7FF', '#22C55E', '#F59E0B', '#EF4444'];
  
  const handleCopyReferralLink = () => {
    const link = `https://hydrogen.app/?ref=${user.refCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!', {
      description: 'Share this link to grow your network.'
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '600' }}>
        My Profile
      </h1>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#222]">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div 
                  className="w-24 h-24 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: levelColors[user.level] + '20' }}
                >
                  <User size={48} style={{ color: levelColors[user.level] }} />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-[#666]">Full Name</label>
                    <div className="text-[#222] mt-1" style={{ fontSize: '20px', fontWeight: '600' }}>
                      {user.name}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#666]">User ID</label>
                      <div className="text-[#222] mt-1" style={{ fontWeight: '600' }}>
                        {user.id}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[#666]">Member Since</label>
                      <div className="text-[#222] mt-1" style={{ fontWeight: '600' }}>
                        January 2025
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#222]">Referral Link</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#666] mb-4">
                Share your unique referral link to invite new members to your network and earn commissions.
              </p>
              
              <div className="flex gap-3">
                <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-[#E6E9EE]">
                  <div className="text-[#666]">Referral Code</div>
                  <div className="text-[#222] mt-1" style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '1px' }}>
                    {user.refCode}
                  </div>
                </div>
                
                <Button 
                  onClick={handleCopyReferralLink}
                  className="bg-[#3FB7FF] hover:bg-[#2A9FE8] text-white px-6"
                  style={{ fontWeight: '600' }}
                >
                  {copied ? (
                    <>
                      <Check size={18} className="mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} className="mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-[#3FB7FF]/10 rounded-xl border border-[#3FB7FF]/20">
                <code className="text-[#3FB7FF]" style={{ fontWeight: '600' }}>
                  https://hydrogen.app/?ref={user.refCode}
                </code>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#222]">Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start border-[#E6E9EE]">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start border-[#E6E9EE]">
                  Update Email
                </Button>
                <Button variant="outline" className="w-full justify-start border-[#E6E9EE]">
                  Payment Methods
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card 
            className="border-[#E6E9EE] rounded-2xl shadow-sm"
            style={{ background: `linear-gradient(135deg, ${levelColors[user.level]}20 0%, ${levelColors[user.level]}10 100%)` }}
          >
            <CardHeader>
              <CardTitle className="text-[#222] flex items-center gap-2">
                <Award size={20} style={{ color: levelColors[user.level] }} />
                Current Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="text-center py-8 px-4 rounded-xl"
                style={{ backgroundColor: levelColors[user.level] + '20' }}
              >
                <div style={{ color: levelColors[user.level], fontSize: '48px', fontWeight: '700' }}>
                  {user.level}
                </div>
                <div className="text-[#222] mt-2" style={{ fontSize: '24px', fontWeight: '700' }}>
                  {levelLabels[user.level]}
                </div>
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#666]">Discount Rate</span>
                  <span className="text-[#222]" style={{ fontWeight: '600' }}>
                    {[25, 35, 45, 50][user.level]}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Commission Levels</span>
                  <span className="text-[#222]" style={{ fontWeight: '600' }}>
                    {user.level + 1}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#222]">Account Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[#3FB7FF]" style={{ fontSize: '36px', fontWeight: '700' }}>
                ₽{user.balance.toLocaleString()}
              </div>
              <p className="text-[#666] mt-2">Available for withdrawal</p>
              
              <Button className="w-full mt-4 bg-[#3FB7FF] hover:bg-[#2A9FE8] text-white" style={{ fontWeight: '600' }}>
                View Balance Details
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#222] flex items-center gap-2">
                <Calendar size={20} />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#666]">This Month</span>
                  <span className="text-[#22C55E]" style={{ fontWeight: '700' }}>+₽12,500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Team Size</span>
                  <span className="text-[#222]" style={{ fontWeight: '600' }}>3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Total Sales</span>
                  <span className="text-[#222]" style={{ fontWeight: '600' }}>2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

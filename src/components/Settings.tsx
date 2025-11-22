import { Moon, Sun, Bell, Mail, Wallet, Shield, Droplet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface SettingsProps {
  payoutMethod: string;
  onPayoutMethodChange: (method: string) => void;
}

export function Settings({ payoutMethod, onPayoutMethodChange }: SettingsProps) {
  const handleSaveSettings = () => {
    toast.success('Settings saved!', {
      description: 'Your preferences have been updated.'
    });
  };
  
  return (
    <div className="p-8" style={{ backgroundColor: '#F7FAFC' }}>
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '700' }}>
        Settings
      </h1>
      
      <div className="max-w-3xl space-y-6">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#222] flex items-center gap-2">
              <Droplet size={20} className="text-[#39B7FF]" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[#222]" style={{ fontWeight: '600' }}>Dark Mode</Label>
                <p className="text-[#666] mt-1">Switch between light and dark theme</p>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EE]">
              <div>
                <Label className="text-[#222]" style={{ fontWeight: '600' }}>Compact View</Label>
                <p className="text-[#666] mt-1">Reduce spacing and font sizes</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#222] flex items-center gap-2">
              <Bell size={20} className="text-[#39B7FF]" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[#222]" style={{ fontWeight: '600' }}>Email Notifications</Label>
                <p className="text-[#666] mt-1">Receive updates about orders and network activity</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EE]">
              <div>
                <Label className="text-[#222]" style={{ fontWeight: '600' }}>Push Notifications</Label>
                <p className="text-[#666] mt-1">Get instant alerts for new sales and messages</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EE]">
              <div>
                <Label className="text-[#222]" style={{ fontWeight: '600' }}>Weekly Reports</Label>
                <p className="text-[#666] mt-1">Receive weekly performance summaries</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#222] flex items-center gap-2">
              <Wallet size={20} className="text-[#39B7FF]" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[#222]" style={{ fontWeight: '600' }}>Preferred Payout Method</Label>
              <p className="text-[#666] mt-1 mb-3">Choose how you want to receive payments</p>
              <Select value={payoutMethod} onValueChange={onPayoutMethodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT (Tether) - Crypto Wallet</SelectItem>
                  <SelectItem value="Card">Bank Card - Instant Transfer</SelectItem>
                  <SelectItem value="Bank">Bank Transfer - 3-5 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-4 border-t border-[#E6E9EE]">
              <Label className="text-[#222]" style={{ fontWeight: '600' }}>Auto-Payout Threshold</Label>
              <p className="text-[#666] mt-1 mb-3">Automatically request payout when balance reaches</p>
              <Select defaultValue="10000">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5000">₽5,000</SelectItem>
                  <SelectItem value="10000">₽10,000</SelectItem>
                  <SelectItem value="25000">₽25,000</SelectItem>
                  <SelectItem value="50000">₽50,000</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#222] flex items-center gap-2">
              <Shield size={20} className="text-[#39B7FF]" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[#222]" style={{ fontWeight: '600' }}>Two-Factor Authentication</Label>
                <p className="text-[#666] mt-1">Add an extra layer of security to your account</p>
              </div>
              <Switch />
            </div>
            
            <div className="pt-4 border-t border-[#E6E9EE]">
              <Button variant="outline" className="w-full border-[#E6E9EE]">
                Change Password
              </Button>
            </div>
            
            <div>
              <Button variant="outline" className="w-full border-[#E6E9EE]">
                Download My Data
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex gap-4">
          <Button 
            onClick={handleSaveSettings}
            className="flex-1 bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
            style={{ fontWeight: '600' }}
          >
            Save Settings
          </Button>
          <Button 
            variant="outline"
            className="border-[#E6E9EE]"
          >
            Reset to Default
          </Button>
        </div>
      </div>
    </div>
  );
}

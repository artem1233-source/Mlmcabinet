import { Bell, Wallet, Droplet } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';

interface TopBarProps {
  userName: string;
  userBalance: number;
}

export function TopBar({ userName, userBalance }: TopBarProps) {
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
  
  return (
    <div className="h-20 bg-white border-b border-[#E6E9EE] flex items-center justify-between px-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
          <Droplet size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-[#222]" style={{ fontSize: '18px', fontWeight: '700' }}>
            Santa Maria Hydrogen Lab
          </h2>
          <p className="text-[#666]">MLM Partner Cabinet</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#F7FAFC] rounded-xl">
          <Wallet size={18} className="text-[#39B7FF]" />
          <div>
            <div className="text-[#666]" style={{ fontSize: '11px' }}>Balance</div>
            <div className="text-[#222]" style={{ fontWeight: '700' }}>₽{userBalance.toLocaleString()}</div>
          </div>
        </div>
        
        <button className="relative p-2 hover:bg-gray-50 rounded-xl transition-all">
          <Bell size={20} className="text-[#666]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#39B7FF] rounded-full"></span>
        </button>
        
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] text-white" style={{ fontWeight: '700' }}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

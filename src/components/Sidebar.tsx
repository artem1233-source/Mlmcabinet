import { LayoutDashboard, Users, ShoppingBag, Wallet, Package, GraduationCap, UserCircle, Settings, Droplet } from 'lucide-react';

interface SidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ selectedTab, onTabChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'structure', label: 'Structure', icon: Users },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'balance', label: 'Balance', icon: Wallet },
    { id: 'catalog', label: 'Catalog', icon: Package },
    { id: 'training', label: 'Training', icon: GraduationCap },
    { id: 'profile', label: 'Profile', icon: UserCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-white border-r border-[#E6E9EE] flex flex-col" style={{ width: '220px' }}>
      <div className="p-6 border-b border-[#E6E9EE]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
            <Droplet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[#39B7FF]" style={{ fontSize: '16px', fontWeight: '700' }}>
              Santa Maria
            </h1>
            <p className="text-[#666]" style={{ fontSize: '11px' }}>Hydrogen Lab</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = selectedTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                isActive
                  ? 'bg-[#39B7FF] text-white shadow-lg shadow-[#39B7FF]/30'
                  : 'text-[#666] hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span style={{ fontWeight: isActive ? '600' : '500' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

import { Crown, Eye } from 'lucide-react';

interface AdminToolbarProps {
  userName?: string;
}

export function AdminToolbar({ userName }: AdminToolbarProps) {
  return (
    <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3">
      {/* Admin Badge */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg shadow flex items-center gap-2">
        <Crown className="w-3.5 h-3.5" />
        <span style={{ fontWeight: '700', fontSize: '12px' }}>
          Режим администратора
        </span>
      </div>
      
      {/* View Mode Indicator */}
      <div className="bg-white border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
        <Eye className="w-3.5 h-3.5" />
        <span style={{ fontWeight: '600', fontSize: '12px' }}>
          Просмотр как: {userName || 'Администратор'}
        </span>
      </div>
    </div>
  );
}

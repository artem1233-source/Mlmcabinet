import { useState } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface StructureProps {
  users: any[];
  currentUserId: string;
}

function UserNode({ user, allUsers }: { user: any; allUsers: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const children = allUsers.filter(u => u.referrerId === user.id);
  const hasChildren = children.length > 0;
  
  const levelColors = ['#3FB7FF', '#22C55E', '#F59E0B', '#EF4444'];
  const levelLabels = ['Starter', 'Curator', 'Mentor', 'Leader'];
  
  return (
    <div className="mb-2">
      <div 
        className="flex items-center gap-3 p-4 bg-white border border-[#E6E9EE] rounded-xl hover:shadow-md transition-all cursor-pointer"
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown size={20} className="text-[#666]" /> : <ChevronRight size={20} className="text-[#666]" />
        ) : (
          <div className="w-5" />
        )}
        
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: levelColors[user.level] + '20' }}>
          <User size={20} style={{ color: levelColors[user.level] }} />
        </div>
        
        <div className="flex-1">
          <div className="text-[#222]" style={{ fontWeight: '600' }}>{user.name}</div>
          <div className="text-[#666]">{levelLabels[user.level]} • ID: {user.id}</div>
        </div>
        
        <div className="text-right">
          <div className="text-[#222]" style={{ fontWeight: '600' }}>₽{user.balance.toLocaleString()}</div>
          <div className="text-[#666]">Balance</div>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="ml-12 mt-2 border-l-2 border-[#E6E9EE] pl-4">
          {children.map(child => (
            <UserNode key={child.id} user={child} allUsers={allUsers} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Structure({ users, currentUserId }: StructureProps) {
  const directReferrals = users.filter(u => u.referrerId === currentUserId);
  
  return (
    <div className="p-8">
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '600' }}>
        Team Structure
      </h1>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-[#222]">Your Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-[#666]">Direct Referrals</div>
              <div className="text-[#222] mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                {directReferrals.length}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-[#666]">Total Network</div>
              <div className="text-[#222] mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                {users.length - 1}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-[#666]">Active Members</div>
              <div className="text-[#222] mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                {users.filter(u => u.balance > 0).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#222]">Direct Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {directReferrals.length === 0 ? (
            <div className="text-center py-12 text-[#666]">
              No direct referrals yet. Share your referral link to grow your team!
            </div>
          ) : (
            <div>
              {directReferrals.map(user => (
                <UserNode key={user.id} user={user} allUsers={users} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

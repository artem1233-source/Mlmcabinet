import { useState } from 'react';
import { Users, UserCheck, UserX, Shield, Search, Filter, MoreVertical, Lock, Unlock } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';

export function AdminOpsDashboard() {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const users = [
    { id: '1', name: 'Александр Иванов', email: 'alex@example.com', phone: '+7 999 123-45-67', level: 3, status: 'active', team: 45, revenue: 450000, blocked: false },
    { id: '2', name: 'Мария Петрова', email: 'maria@example.com', phone: '+7 999 234-56-78', level: 3, status: 'active', team: 38, revenue: 380000, blocked: false },
    { id: '3', name: 'Дмитрий Сидоров', email: 'dmitry@example.com', phone: '+7 999 345-67-89', level: 2, status: 'active', team: 32, revenue: 320000, blocked: false },
    { id: '4', name: 'Елена Козлова', email: 'elena@example.com', phone: '+7 999 456-78-90', level: 2, status: 'pending', team: 0, revenue: 0, blocked: false },
    { id: '5', name: 'Игорь Новиков', email: 'igor@example.com', phone: '+7 999 567-89-01', level: 1, status: 'blocked', team: 15, revenue: 120000, blocked: true },
  ];

  const filteredUsers = users.filter(user => {
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    alert(`Массовое действие "${action}" для ${selectedUsers.size} пользователей`);
    setSelectedUsers(new Set());
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Активен' },
      pending: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Ожидает' },
      blocked: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Заблокирован' }
    };
    const variant = variants[status as keyof typeof variants] || variants.active;
    return <Badge className={`${variant.color} border`}>{variant.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Всего партнёров"
          value="1,248"
          delta={5.2}
          trend="up"
          icon={<Users className="w-5 h-5 text-[#39B7FF]" />}
          size="M"
        />
        <KPICard
          label="Новые за период"
          value="47"
          delta={12.8}
          trend="up"
          icon={<UserCheck className="w-5 h-5 text-green-600" />}
          size="M"
        />
        <KPICard
          label="Активные"
          value="1,156"
          delta={2.1}
          trend="up"
          icon={<UserCheck className="w-5 h-5 text-blue-600" />}
          size="M"
        />
        <KPICard
          label="Заблокированные"
          value="12"
          delta={-15.4}
          trend="down"
          icon={<UserX className="w-5 h-5 text-red-600" />}
          size="M"
        />
      </div>

      {/* Filters & Search */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                <Input
                  placeholder="Поиск по имени, email, телефону..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#E6E9EE] rounded-xl"
                />
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-[#39B7FF]' : ''}
              >
                Все ({users.length})
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-green-500' : ''}
              >
                Активные ({users.filter(u => u.status === 'active').length})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
                className={statusFilter === 'pending' ? 'bg-orange-500' : ''}
              >
                Ожидают ({users.filter(u => u.status === 'pending').length})
              </Button>
              <Button
                variant={statusFilter === 'blocked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('blocked')}
                className={statusFilter === 'blocked' ? 'bg-red-500' : ''}
              >
                Заблокированные ({users.filter(u => u.status === 'blocked').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card className="border-[#39B7FF] border-2 rounded-2xl shadow-md bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#39B7FF] text-white rounded-full flex items-center justify-center font-bold">
                  {selectedUsers.size}
                </div>
                <p className="font-semibold text-[#1E1E1E]">Выбрано пользователей: {selectedUsers.size}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')} className="gap-2">
                  <Unlock className="w-4 h-4" />
                  Разблокировать
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('block')} className="gap-2">
                  <Lock className="w-4 h-4" />
                  Заблокировать
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')} className="gap-2">
                  <Filter className="w-4 h-4" />
                  Экспорт
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#39B7FF]" />
            Партнёры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F7FAFC]">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left font-semibold text-[#1E1E1E]">Партнёр</th>
                  <th className="p-4 text-left font-semibold text-[#1E1E1E]">Контакты (PII)</th>
                  <th className="p-4 text-left font-semibold text-[#1E1E1E]">Уровень</th>
                  <th className="p-4 text-left font-semibold text-[#1E1E1E]">Команда</th>
                  <th className="p-4 text-left font-semibold text-[#1E1E1E]">Выручк��</th>
                  <th className="p-4 text-left font-semibold text-[#1E1E1E]">Статус</th>
                  <th className="p-4 text-left font-semibold text-[#1E1E1E]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-t border-[#E6E9EE] hover:bg-[#F7FAFC]">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => {
                          const newSelected = new Set(selectedUsers);
                          if (newSelected.has(user.id)) {
                            newSelected.delete(user.id);
                          } else {
                            newSelected.add(user.id);
                          }
                          setSelectedUsers(newSelected);
                        }}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-bold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1E1E1E]">{user.name}</p>
                          <p className="text-sm text-[#666]">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className="text-[#666]">{user.email}</p>
                        <p className="text-[#666]">{user.phone}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        Уровень {user.level}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-[#1E1E1E]">{user.team} чел.</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-[#39B7FF]">₽{user.revenue.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-[#666]">Пользователи не найдены</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
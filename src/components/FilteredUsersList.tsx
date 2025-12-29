/**
 * 📋 КОМПОНЕНТ ДЛЯ ОТОБРАЖЕНИЯ ОТФИЛЬТРОВАННОГО СПИСКА ПОЛЬЗОВАТЕЛЕЙ
 * 
 * Показывает таблицу пользователей, отфильтрованных по выбранному критерию.
 * Используется на дашборде администратора после клика на StatsWidgets.
 */

import { Users, Mail, Calendar, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface FilteredUsersListProps {
  users: any[];
  filterType: string;
  onClose: () => void;
}

export function FilteredUsersList({ users, filterType, onClose }: FilteredUsersListProps) {
  // 🏷️ Заголовки для разных типов фильтров
  const filterTitles: Record<string, string> = {
    all: 'Все пользователи',
    newToday: 'Новые сегодня',
    newThisMonth: 'Новые за месяц',
    activePartners: 'Активные партнёры (с рефералами)',
    passivePartners: 'Пассивные партнёры (без рефералов)',
    activeUsers: 'Активные по покупкам (за 30 дней)',
    passiveUsers: 'Пассивные по покупкам',
  };

  const title = filterTitles[filterType] || 'Пользователи';
  
  // 🎨 Иконки для разных типов
  const getIcon = () => {
    switch (filterType) {
      case 'newToday':
      case 'newThisMonth':
        return <Calendar className="w-5 h-5" />;
      case 'activePartners':
      case 'passivePartners':
        return <Users className="w-5 h-5" />;
      case 'activeUsers':
      case 'passiveUsers':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  // 📅 Форматирование даты
  const formatDate = (date: any) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // 🎯 Определяем, какие колонки показывать
  const showRegistrationDate = filterType.includes('new');
  const showReferralsCount = filterType.includes('Partners');
  const showLastPurchase = filterType.includes('Users') && filterType !== 'all';

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center text-white">
              {getIcon()}
            </div>
            <div>
              <CardTitle className="text-[#1E1E1E]">{title}</CardTitle>
              <p className="text-[#666] text-sm mt-1">
                Найдено: {users.length} {users.length === 1 ? 'пользователь' : users.length < 5 ? 'пользователя' : 'пользователей'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#666] hover:text-[#1E1E1E] transition-colors"
            style={{ fontSize: '14px', fontWeight: '600' }}
          >
            Скрыть
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-12 text-[#666]">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p style={{ fontSize: '14px' }}>По выбранному фильтру пользователи не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E6E9EE]">
                  <th className="text-left py-3 px-4 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                    Пользователь
                  </th>
                  <th className="text-left py-3 px-4 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                    Email
                  </th>
                  {showRegistrationDate && (
                    <th className="text-left py-3 px-4 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                      Дата регистрации
                    </th>
                  )}
                  {showReferralsCount && (
                    <th className="text-center py-3 px-4 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                      Рефералов
                    </th>
                  )}
                  {showLastPurchase && (
                    <th className="text-left py-3 px-4 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                      Последняя покупка
                    </th>
                  )}
                  <th className="text-center py-3 px-4 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                    Уровень
                  </th>
                  <th className="text-right py-3 px-4 text-[#666]" style={{ fontSize: '13px', fontWeight: '600' }}>
                    Баланс
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr 
                    key={user.id || index} 
                    className="border-b border-[#E6E9EE] hover:bg-[#F7FAFC] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center text-white font-semibold">
                          {(user.имя || user.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[#1E1E1E]" style={{ fontSize: '14px', fontWeight: '600' }}>
                            {user.имя || user.name || 'Без имени'}
                          </div>
                          <div className="text-[#999]" style={{ fontSize: '12px' }}>
                            ID: {user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-[#666]" style={{ fontSize: '13px' }}>
                        <Mail className="w-4 h-4" />
                        {user.email || '—'}
                      </div>
                    </td>
                    {showRegistrationDate && (
                      <td className="py-3 px-4 text-[#666]" style={{ fontSize: '13px' }}>
                        {formatDate(user.зарегистрирован || user.датаРегистрации || user.createdAt)}
                      </td>
                    )}
                    {showReferralsCount && (
                      <td className="py-3 px-4 text-center">
                        <Badge 
                          variant="secondary" 
                          className={user.referralsCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                        >
                          {user.referralsCount || 0}
                        </Badge>
                      </td>
                    )}
                    {showLastPurchase && (
                      <td className="py-3 px-4 text-[#666]" style={{ fontSize: '13px' }}>
                        {user.lastPurchaseDate ? formatDate(user.lastPurchaseDate) : '—'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <Badge 
                        variant="secondary"
                        className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
                      >
                        <Award className="w-3 h-3 mr-1" />
                        {user.уровень || user.level || 1}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-[#1E1E1E]" style={{ fontSize: '14px', fontWeight: '600' }}>
                      {(user.баланс || 0).toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

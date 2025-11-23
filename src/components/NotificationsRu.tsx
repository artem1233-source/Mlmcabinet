import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Filter, Trash2, Settings, ShoppingCart, DollarSign, Users, Target, AlertCircle, ArrowDownToLine, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import * as api from '../utils/api';

interface Notification {
  id: string;
  тип: 'order' | 'commission' | 'new_partner' | 'goal' | 'inactive' | 'withdrawal' | 'course';
  заголовок: string;
  сообщение: string;
  дата: string;
  прочитано: boolean;
  данные?: any; // Дополнительные данные (ID заказа, сумма и т.д.)
}

export function NotificationsRu() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Notification['тип']>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.getNotifications();
      if (response.success) {
        setNotifications(response.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, прочитано: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, прочитано: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: Notification['тип']) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="size-5 text-[#39B7FF]" />;
      case 'commission':
        return <DollarSign className="size-5 text-[#12C9B6]" />;
      case 'new_partner':
        return <Users className="size-5 text-purple-500" />;
      case 'goal':
        return <Target className="size-5 text-orange-500" />;
      case 'inactive':
        return <AlertCircle className="size-5 text-yellow-500" />;
      case 'withdrawal':
        return <ArrowDownToLine className="size-5 text-green-500" />;
      case 'course':
        return <BookOpen className="size-5 text-blue-500" />;
      default:
        return <Bell className="size-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: Notification['тип']) => {
    const labels: Record<Notification['тип'], string> = {
      order: 'Заказ',
      commission: 'Комиссия',
      new_partner: 'Партнёр',
      goal: 'Цель',
      inactive: 'Активность',
      withdrawal: 'Вывод',
      course: 'Обучение'
    };
    return labels[type];
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.тип === filter);

  const unreadCount = notifications.filter(n => !n.прочитано).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bell className="size-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Загрузка уведомлений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Bell className="size-8 text-[#39B7FF]" />
            Уведомления
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-gray-600 mt-1">
            Все события и обновления вашего кабинета
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              className="gap-2"
            >
              <CheckCheck className="size-4" />
              Прочитать всё
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
          >
            <Settings className="size-4" />
            Настройки
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="size-4 text-gray-500" />
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Все ({notifications.length})
            </Button>
            <Button
              variant={filter === 'order' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('order')}
              className="gap-2"
            >
              <ShoppingCart className="size-3" />
              Заказы
            </Button>
            <Button
              variant={filter === 'commission' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('commission')}
              className="gap-2"
            >
              <DollarSign className="size-3" />
              Комиссии
            </Button>
            <Button
              variant={filter === 'new_partner' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('new_partner')}
              className="gap-2"
            >
              <Users className="size-3" />
              Партнёры
            </Button>
            <Button
              variant={filter === 'goal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('goal')}
              className="gap-2"
            >
              <Target className="size-3" />
              Цели
            </Button>
            <Button
              variant={filter === 'withdrawal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('withdrawal')}
              className="gap-2"
            >
              <ArrowDownToLine className="size-3" />
              Выводы
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="size-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-500 mb-2">
                {filter === 'all' ? 'Нет уведомлений' : `Нет уведомлений типа "${getTypeLabel(filter as Notification['тип'])}"`}
              </h3>
              <p className="text-sm text-gray-400">
                Когда появятся новые события, они отобразятся здесь
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`
                transition-all cursor-pointer hover:shadow-md
                ${!notification.прочитано ? 'bg-blue-50 border-l-4 border-l-[#39B7FF]' : 'hover:bg-gray-50'}
              `}
              onClick={() => !notification.прочитано && markAsRead(notification.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`
                    p-3 rounded-full flex-shrink-0
                    ${!notification.прочитано ? 'bg-white' : 'bg-gray-100'}
                  `}>
                    {getNotificationIcon(notification.тип)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`
                            ${!notification.прочитано ? 'font-semibold' : 'font-medium text-gray-700'}
                          `}>
                            {notification.заголовок}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(notification.тип)}
                          </Badge>
                        </div>
                        <p className={`
                          text-sm mb-2
                          ${!notification.прочитано ? 'text-gray-700' : 'text-gray-600'}
                        `}>
                          {notification.сообщение}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(notification.дата).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.прочитано && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="h-8 w-8 p-0"
                            title="Отметить как прочитанное"
                          >
                            <Check className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Удалить"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

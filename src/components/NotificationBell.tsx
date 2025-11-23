import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, ShoppingCart, DollarSign, Users, Target, AlertCircle, ArrowDownToLine, BookOpen } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import * as api from '../utils/api';

interface Notification {
  id: string;
  тип: 'order' | 'commission' | 'new_partner' | 'goal' | 'inactive' | 'withdrawal' | 'course';
  заголовок: string;
  сообщение: string;
  дата: string;
  прочитано: boolean;
  данные?: any;
}

interface NotificationBellProps {
  onViewAll?: () => void;
}

export function NotificationBell({ onViewAll }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const response = await api.getNotifications();
      if (response.success) {
        // Сортируем по дате (новые сначала) и берём только последние 5
        const sorted = (response.notifications || [])
          .sort((a: Notification, b: Notification) => 
            new Date(b.дата).getTime() - new Date(a.дата).getTime()
          )
          .slice(0, 5);
        setNotifications(sorted);
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

  const getNotificationIcon = (type: Notification['тип']) => {
    const iconClass = "size-4";
    switch (type) {
      case 'order':
        return <ShoppingCart className={`${iconClass} text-[#39B7FF]`} />;
      case 'commission':
        return <DollarSign className={`${iconClass} text-[#12C9B6]`} />;
      case 'new_partner':
        return <Users className={`${iconClass} text-purple-500`} />;
      case 'goal':
        return <Target className={`${iconClass} text-orange-500`} />;
      case 'inactive':
        return <AlertCircle className={`${iconClass} text-yellow-500`} />;
      case 'withdrawal':
        return <ArrowDownToLine className={`${iconClass} text-green-500`} />;
      case 'course':
        return <BookOpen className={`${iconClass} text-blue-500`} />;
      default:
        return <Bell className={`${iconClass} text-gray-500`} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.прочитано).length;

  const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Уведомления"
      >
        <Bell className="size-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h3 className="font-semibold text-gray-900">Уведомления</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {unreadCount} непрочитанных
                </p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="size-4 text-gray-500" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Bell className="size-8 text-gray-300 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-500">Загрузка...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="size-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Нет уведомлений</p>
                <p className="text-xs text-gray-400 mt-1">
                  Новые события появятся здесь
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      p-4 hover:bg-gray-50 transition-colors cursor-pointer
                      ${!notification.прочитано ? 'bg-blue-50/50' : ''}
                    `}
                    onClick={() => {
                      if (!notification.прочитано) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="p-2 bg-white rounded-lg flex-shrink-0 shadow-sm">
                        {getNotificationIcon(notification.тип)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`
                          text-sm mb-0.5
                          ${!notification.прочитано ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}
                        `}>
                          {notification.заголовок}
                        </h4>
                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                          {notification.сообщение}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTime(notification.дата)}
                        </p>
                      </div>

                      {/* Mark as Read */}
                      {!notification.прочитано && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                          title="Отметить как прочитанное"
                        >
                          <Check className="size-4 text-[#39B7FF]" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <Button
                onClick={() => {
                  setIsOpen(false);
                  onViewAll?.();
                }}
                variant="ghost"
                className="w-full text-[#39B7FF] hover:text-[#2A8FD9] hover:bg-[#39B7FF]/10"
              >
                Посмотреть все уведомления
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

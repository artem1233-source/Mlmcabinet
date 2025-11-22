import { Bell, Check, X, ShoppingBag, Wallet, Users, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';

interface Notification {
  id: string;
  тип: 'заказ' | 'выплата' | 'команда' | 'доход';
  заголовок: string;
  описание: string;
  дата: Date;
  прочитано: boolean;
}

interface NotificationsRuProps {
  уведомления?: Notification[];
  отметитьПрочитанным?: (id: string) => void;
  удалитьУведомление?: (id: string) => void;
}

// Начальные уведомления для демонстрации
const начальныеУведомления: Notification[] = [
  {
    id: 'n1',
    тип: 'доход',
    заголовок: 'Новый доход получен',
    описание: 'Вы получили комиссию ₽1,600 от заказа партнёра',
    дата: new Date(Date.now() - 1000 * 60 * 30), // 30 минут назад
    прочитано: false
  },
  {
    id: 'n2',
    тип: 'заказ',
    заголовок: 'Новый заказ оформлен',
    описание: 'Заказ #ORD-1001 на сумму ₽5,000 успешно создан',
    дата: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 часа назад
    прочитано: false
  },
  {
    id: 'n3',
    тип: 'команда',
    заголовок: 'Новый партнёр в команде',
    описание: 'Дмитрий Петров присоединился к вашей команде',
    дата: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 день назад
    прочитано: true
  },
  {
    id: 'n4',
    тип: 'выплата',
    заголовок: 'Выплата обработана',
    описание: 'Выплата ₽1,000 успешно отправлена на ваш счёт',
    дата: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 дня назад
    прочитано: true
  },
  {
    id: 'n5',
    тип: 'доход',
    заголовок: 'Доход от структуры',
    описание: 'Получена комиссия ₽3,000 от продаж в вашей команде',
    дата: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 дня назад
    прочитано: true
  }
];

export function NotificationsRu({ 
  уведомления = начальныеУведомления,
  отметитьПрочитанным,
  удалитьУведомление 
}: NotificationsRuProps) {
  
  const getIcon = (тип: Notification['тип']) => {
    switch (тип) {
      case 'заказ':
        return <ShoppingBag size={20} className="text-[#39B7FF]" />;
      case 'выплата':
        return <Wallet size={20} className="text-[#12C9B6]" />;
      case 'команда':
        return <Users size={20} className="text-[#9333EA]" />;
      case 'доход':
        return <TrendingUp size={20} className="text-[#10B981]" />;
    }
  };

  const formatDate = (дата: Date) => {
    const now = new Date();
    const diff = now.getTime() - дата.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes} мин. назад`;
    } else if (hours < 24) {
      return `${hours} ч. назад`;
    } else if (days === 1) {
      return 'Вчера';
    } else if (days < 7) {
      return `${days} дн. назад`;
    } else {
      return дата.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  };

  const непрочитанныеКоличество = уведомления.filter(n => !n.прочитано).length;

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[#1E1E1E]" style={{ fontSize: '28px', fontWeight: '700' }}>
              Уведомления
            </h1>
            {непрочитанныеКоличество > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#39B7FF] rounded-full">
                <Bell size={16} className="text-white" />
                <span className="text-white" style={{ fontSize: '13px', fontWeight: '600' }}>
                  {непрочитанныеКоличество} новых
                </span>
              </div>
            )}
          </div>
          <p className="text-[#666]">
            Все важные события и обновления вашего аккаунта
          </p>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {уведомления.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell size={48} className="text-[#E6E9EE] mx-auto mb-4" />
              <h3 className="text-[#1E1E1E] mb-2" style={{ fontWeight: '600' }}>
                Нет уведомлений
              </h3>
              <p className="text-[#666]">
                Здесь будут отображаться все важные обновления
              </p>
            </Card>
          ) : (
            уведомления.map((уведомление) => (
              <Card
                key={уведомление.id}
                className={`p-4 transition-all hover:shadow-md ${
                  !уведомление.прочитано ? 'bg-[#F0F9FF] border-[#39B7FF]/20' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    !уведомление.прочитано ? 'bg-white' : 'bg-[#F7FAFC]'
                  }`}>
                    {getIcon(уведомление.тип)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                        {уведомление.заголовок}
                      </h3>
                      {!уведомление.прочитано && (
                        <div className="w-2 h-2 bg-[#39B7FF] rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-[#666] mb-2" style={{ fontSize: '14px' }}>
                      {уведомление.описание}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[#999]" style={{ fontSize: '12px' }}>
                        {formatDate(уведомление.дата)}
                      </span>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!уведомление.прочитано && отметитьПрочитанным && (
                          <button
                            onClick={() => отметитьПрочитанным(уведомление.id)}
                            className="p-1.5 hover:bg-white rounded-lg transition-all"
                            title="Отметить прочитанным"
                          >
                            <Check size={16} className="text-[#39B7FF]" />
                          </button>
                        )}
                        {удалитьУведомление && (
                          <button
                            onClick={() => удалитьУведомление(уведомление.id)}
                            className="p-1.5 hover:bg-white rounded-lg transition-all"
                            title="Удалить"
                          >
                            <X size={16} className="text-[#999]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Empty state alternative */}
        {уведомления.length > 0 && непрочитанныеКоличество === 0 && (
          <Card className="p-6 text-center mt-6 bg-[#F7FAFC] border-dashed">
            <Check size={32} className="text-[#12C9B6] mx-auto mb-2" />
            <p className="text-[#666]" style={{ fontSize: '14px' }}>
              Все уведомления прочитаны
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

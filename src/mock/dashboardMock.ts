import { DashboardPayload, DashboardMode, PeriodOption } from '../components/dashboard/types';

function generateChartData(days: number, baseValue: number, variance: number) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      x: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      y: Math.round(baseValue + (Math.random() - 0.5) * variance)
    });
  }
  return data;
}

export function getMockDashboardData(mode: DashboardMode, period: PeriodOption): DashboardPayload {
  const days = period;

  switch (mode) {
    case 'ceo':
      return {
        kpis: [
          { id: 'revenue', title: 'Выручка', value: 2450000, delta: 12.5, trend: 'up', prefix: '₽' },
          { id: 'partners', title: 'Партнёров', value: 156, delta: 8, trend: 'up' },
          { id: 'orders', title: 'Заказов', value: 342, delta: -3, trend: 'down' },
          { id: 'avg_check', title: 'Средний чек', value: 7165, delta: 5.2, trend: 'up', prefix: '₽' },
          { id: 'conversion', title: 'Конверсия', value: '4.2%', delta: 0.3, trend: 'up' },
          { id: 'nps', title: 'NPS', value: 72, delta: 2, trend: 'up' },
        ],
        charts: [
          {
            id: 'revenue_chart',
            title: 'Динамика выручки',
            type: 'area',
            series: [{ name: 'Выручка', data: generateChartData(days, 80000, 30000), color: '#39B7FF' }]
          },
          {
            id: 'partners_chart',
            title: 'Рост партнёрской сети',
            type: 'line',
            series: [{ name: 'Партнёры', data: generateChartData(days, 150, 20), color: '#12C9B6' }]
          }
        ],
        alerts: [
          { id: 'a1', level: 'critical', title: 'Низкий остаток товара', description: 'H2-Touch Starter Kit: осталось 5 шт.', actionLabel: 'Заказать', actionHref: '/warehouse' },
          { id: 'a2', level: 'warning', title: 'Просроченные заявки', description: '3 заявки на вывод ожидают более 48 часов', actionLabel: 'Обработать', actionHref: '/payouts' },
          { id: 'a3', level: 'info', title: 'Новые партнёры', description: '12 регистраций за последние 24 часа' },
        ]
      };

    case 'admin':
      return {
        kpis: [
          { id: 'total_users', title: 'Всего пользователей', value: 156 },
          { id: 'new_today', title: 'Новых сегодня', value: 3, delta: 50, trend: 'up' },
          { id: 'active_month', title: 'Активных за месяц', value: 89, delta: 5, trend: 'up' },
          { id: 'pending_verif', title: 'Ожидают верификации', value: 7 },
        ],
        charts: [
          {
            id: 'registrations',
            title: 'Регистрации',
            type: 'bar',
            series: [{ name: 'Регистрации', data: generateChartData(days, 5, 4), color: '#39B7FF' }]
          }
        ],
        table: {
          columns: [
            { key: 'id', title: 'ID' },
            { key: 'name', title: 'Имя' },
            { key: 'email', title: 'Email' },
            { key: 'status', title: 'Статус' },
            { key: 'registered', title: 'Дата регистрации' }
          ],
          rows: [
            { id: '010', name: 'Алексей Новиков', email: 'alex@example.com', status: 'Активен', registered: '27.12.2025' },
            { id: '009', name: 'Мария Сидорова', email: 'maria@example.com', status: 'Новый', registered: '26.12.2025' },
            { id: '008', name: 'Пётр Козлов', email: 'petr@example.com', status: 'Активен', registered: '25.12.2025' },
          ]
        },
        alerts: [
          { id: 'a1', level: 'warning', title: 'Дубликаты email', description: '2 пользователя с одинаковым email', actionLabel: 'Проверить', actionHref: '/users' },
        ]
      };

    case 'finance':
      return {
        kpis: [
          { id: 'total_balance', title: 'Общий баланс', value: 3770, prefix: '₽' },
          { id: 'pending_payouts', title: 'Ожидают выплаты', value: 0, prefix: '₽' },
          { id: 'paid_month', title: 'Выплачено за месяц', value: 0, prefix: '₽' },
          { id: 'total_earnings', title: 'Всего начислений', value: 3770, prefix: '₽' },
        ],
        charts: [
          {
            id: 'earnings_chart',
            title: 'Начисления комиссий',
            type: 'area',
            series: [{ name: 'Комиссии', data: generateChartData(days, 500, 400), color: '#12C9B6' }]
          },
          {
            id: 'payouts_chart',
            title: 'Выплаты',
            type: 'bar',
            series: [{ name: 'Выплаты', data: generateChartData(days, 300, 300), color: '#EF4444' }]
          }
        ],
        table: {
          columns: [
            { key: 'id', title: 'ID' },
            { key: 'partner', title: 'Партнёр' },
            { key: 'amount', title: 'Сумма', align: 'right' },
            { key: 'status', title: 'Статус' },
            { key: 'date', title: 'Дата' }
          ],
          rows: [
            { id: '1', partner: 'Иван Петров', amount: '₽1,650', status: 'Начислено', date: '27.12.2025' },
            { id: '2', partner: 'Ольга Смирнова', amount: '₽1,500', status: 'Начислено', date: '26.12.2025' },
          ]
        }
      };

    case 'warehouse':
      return {
        kpis: [
          { id: 'total_products', title: 'Товаров', value: 12 },
          { id: 'low_stock', title: 'Заканчиваются', value: 3, trend: 'down' },
          { id: 'out_of_stock', title: 'Нет в наличии', value: 1 },
          { id: 'total_value', title: 'Стоимость склада', value: 450000, prefix: '₽' },
        ],
        charts: [
          {
            id: 'stock_movement',
            title: 'Движение товара',
            type: 'bar',
            series: [
              { name: 'Приход', data: generateChartData(days, 20, 15), color: '#12C9B6' },
              { name: 'Расход', data: generateChartData(days, 18, 12), color: '#EF4444' }
            ]
          }
        ],
        table: {
          columns: [
            { key: 'sku', title: 'SKU' },
            { key: 'name', title: 'Название' },
            { key: 'stock', title: 'Остаток', align: 'right' },
            { key: 'reserved', title: 'Резерв', align: 'right' },
            { key: 'status', title: 'Статус' }
          ],
          rows: [
            { sku: 'H2T-001', name: 'H2-Touch Starter Kit', stock: 5, reserved: 2, status: 'Заканчивается' },
            { sku: 'H2T-002', name: 'H2-Touch Pro Set', stock: 45, reserved: 10, status: 'В наличии' },
            { sku: 'H2T-003', name: 'H2 Powder Refill', stock: 0, reserved: 0, status: 'Нет в наличии' },
          ]
        },
        alerts: [
          { id: 'a1', level: 'critical', title: 'Критически низкий остаток', description: 'H2-Touch Starter Kit: 5 шт. (резерв: 2)', actionLabel: 'Заказать' },
          { id: 'a2', level: 'warning', title: 'Товар закончился', description: 'H2 Powder Refill: нет в наличии' },
        ]
      };

    case 'seo':
      return {
        kpis: [
          { id: 'visits', title: 'Посещений', value: 4520, delta: 15, trend: 'up' },
          { id: 'unique_visitors', title: 'Уникальных', value: 2890, delta: 12, trend: 'up' },
          { id: 'bounce_rate', title: 'Отказы', value: '32%', delta: -5, trend: 'up' },
          { id: 'avg_time', title: 'Время на сайте', value: '3:42' },
          { id: 'ref_clicks', title: 'Переходы по рефералам', value: 234, delta: 28, trend: 'up' },
          { id: 'conversions', title: 'Конверсии', value: 67, delta: 8, trend: 'up' },
        ],
        charts: [
          {
            id: 'traffic',
            title: 'Трафик',
            type: 'area',
            series: [{ name: 'Посещения', data: generateChartData(days, 150, 80), color: '#39B7FF' }]
          },
          {
            id: 'sources',
            title: 'Источники трафика',
            type: 'pie',
            series: [
              { name: 'Органический', data: [{ x: 'Organic', y: 45 }], color: '#12C9B6' },
              { name: 'Рефералы', data: [{ x: 'Referral', y: 30 }], color: '#39B7FF' },
              { name: 'Прямой', data: [{ x: 'Direct', y: 15 }], color: '#F59E0B' },
              { name: 'Соцсети', data: [{ x: 'Social', y: 10 }], color: '#8B5CF6' },
            ]
          }
        ],
        alerts: [
          { id: 'a1', level: 'info', title: 'Рост органического трафика', description: '+23% за последнюю неделю' },
        ]
      };

    case 'support':
      return {
        kpis: [
          { id: 'open_tickets', title: 'Открытых обращений', value: 12 },
          { id: 'avg_response', title: 'Среднее время ответа', value: '2ч 15мин' },
          { id: 'resolved_today', title: 'Решено сегодня', value: 8, delta: 3, trend: 'up' },
          { id: 'satisfaction', title: 'Удовлетворённость', value: '94%', delta: 2, trend: 'up' },
        ],
        charts: [
          {
            id: 'tickets',
            title: 'Динамика обращений',
            type: 'bar',
            series: [
              { name: 'Новые', data: generateChartData(days, 8, 5), color: '#EF4444' },
              { name: 'Решённые', data: generateChartData(days, 7, 4), color: '#12C9B6' }
            ]
          }
        ],
        table: {
          columns: [
            { key: 'id', title: '№' },
            { key: 'subject', title: 'Тема' },
            { key: 'user', title: 'Пользователь' },
            { key: 'priority', title: 'Приоритет' },
            { key: 'status', title: 'Статус' }
          ],
          rows: [
            { id: '#1234', subject: 'Не приходит реферальная ссылка', user: 'user@mail.ru', priority: 'Высокий', status: 'Открыт' },
            { id: '#1233', subject: 'Вопрос по комиссиям', user: 'partner@gmail.com', priority: 'Средний', status: 'В работе' },
            { id: '#1232', subject: 'Ошибка при оформлении заказа', user: 'test@test.ru', priority: 'Высокий', status: 'Открыт' },
          ]
        },
        alerts: [
          { id: 'a1', level: 'warning', title: '3 обращения без ответа', description: 'Более 4 часов без ответа', actionLabel: 'Открыть' },
        ]
      };

    default:
      return { kpis: [], charts: [] };
  }
}

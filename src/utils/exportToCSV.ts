/**
 * 📊 ЭКСПОРТ ДАННЫХ В CSV/EXCEL
 * 
 * Функции для экспорта различных данных в формат CSV
 */

/**
 * Конвертирует массив объектов в CSV строку
 */
function convertToCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(',')];
  
  data.forEach(item => {
    const values = headers.map(header => {
      const value = item[header];
      
      // Обрабатываем значения
      if (value === null || value === undefined) {
        return '';
      }
      
      // Экранируем запятые и кавычки
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
    
    rows.push(values.join(','));
  });
  
  return rows.join('\n');
}

/**
 * Скачивает CSV файл
 */
function downloadCSV(csv: string, filename: string) {
  // Добавляем BOM для правильного отображения кириллицы в Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Экспорт структуры команды в CSV
 */
export function exportTeamToCSV(team: any[]) {
  const data = team.map(member => ({
    'ID': member.партнёрскийID || member.id,
    'Имя': member.имя,
    'Фамилия': member.фамилия,
    'Email': member.email,
    'Телефон': member.телефон || '',
    'Уровень': member.уровень || 1,
    'Глубина': member.глубина || 1,
    'Реф-код': member.рефКод,
    'Спонсор': member.спонсор || '',
    'Баланс': member.баланс || 0,
    'Дата регистрации': member.датаРегистрации || member.зарегистрирован || '',
  }));
  
  const headers = [
    'ID', 'Имя', 'Фамилия', 'Email', 'Телефон', 
    'Уровень', 'Глубина', 'Реф-код', 'Спонсор', 'Баланс', 'Дата регистрации'
  ];
  
  const csv = convertToCSV(data, headers);
  const filename = `команда_${new Date().toISOString().split('T')[0]}.csv`;
  
  downloadCSV(csv, filename);
  
  console.log('📊 Exported', team.length, 'members to CSV');
}

/**
 * Экспорт заказов в CSV
 */
export function exportOrdersToCSV(orders: any[]) {
  const data = orders.map(order => ({
    'ID заказа': order.id,
    'Дата': order.createdAt || order.date,
    'Клиент': order.customerName || order.userName || '',
    'Товары': order.items?.length || 0,
    'Сумма': order.total || 0,
    'Статус': order.status || 'pending',
    'Комиссия D1': order.d1 || 0,
    'Комиссия D2': order.d2 || 0,
    'Комиссия D3': order.d3 || 0,
  }));
  
  const headers = [
    'ID заказа', 'Дата', 'Клиент', 'Товары', 
    'Сумма', 'Статус', 'Комиссия D1', 'Комиссия D2', 'Комиссия D3'
  ];
  
  const csv = convertToCSV(data, headers);
  const filename = `заказы_${new Date().toISOString().split('T')[0]}.csv`;
  
  downloadCSV(csv, filename);
  
  console.log('📊 Exported', orders.length, 'orders to CSV');
}

/**
 * Экспорт доходов в CSV
 */
export function exportEarningsToCSV(earnings: any[]) {
  const data = earnings.map(earning => ({
    'Дата': earning.date || earning.createdAt,
    'Сумма': earning.amount || 0,
    'Тип': earning.type || 'commission',
    'От заказа': earning.orderId || '',
    'Описание': earning.description || '',
  }));
  
  const headers = ['Дата', 'Сумма', 'Тип', 'От заказа', 'Описание'];
  
  const csv = convertToCSV(data, headers);
  const filename = `доходы_${new Date().toISOString().split('T')[0]}.csv`;
  
  downloadCSV(csv, filename);
  
  console.log('📊 Exported', earnings.length, 'earnings to CSV');
}

/**
 * Экспорт всех пользователей в CSV (для администраторов)
 */
export function exportAllUsersToCSV(users: any[]) {
  const data = users.map(user => ({
    'ID': user.партнёрскийID || user.id,
    'Имя': user.имя,
    'Фамилия': user.фамилия,
    'Email': user.email,
    'Телефон': user.телефон || '',
    'Уровень': user.уровень || 1,
    'Глубина': user.глубина || 1,
    'Реф-код': user.рефКод,
    'Инвайт-код': user.пригласительКод || '',
    'Спонсор ID': user.спонсорId || '',
    'Баланс': user.баланс || 0,
    'Команда': user.команда?.length || 0,
    'Дата регистрации': user.датаРегистрации || user.зарегистрирован || '',
    'Администратор': user.isAdmin ? 'Да' : 'Нет',
  }));
  
  const headers = [
    'ID', 'Имя', 'Фамилия', 'Email', 'Телефон', 
    'Уровень', 'Глубина', 'Реф-код', 'Инвайт-код', 'Спонсор ID',
    'Баланс', 'Команда', 'Дата регистрации', 'Администратор'
  ];
  
  const csv = convertToCSV(data, headers);
  const filename = `все_пользователи_${new Date().toISOString().split('T')[0]}.csv`;
  
  downloadCSV(csv, filename);
  
  console.log('📊 Exported', users.length, 'users to CSV');
}

/**
 * Экспорт статистики в CSV
 */
export function exportStatsToCSV(stats: any) {
  const data = Object.entries(stats).map(([key, value]) => ({
    'Параметр': key,
    'Значение': String(value)
  }));
  
  const headers = ['Параметр', 'Значение'];
  
  const csv = convertToCSV(data, headers);
  const filename = `статистика_${new Date().toISOString().split('T')[0]}.csv`;
  
  downloadCSV(csv, filename);
  
  console.log('📊 Exported stats to CSV');
}

/**
 * Пример использования:
 * 
 * import { exportTeamToCSV } from '../utils/exportToCSV';
 * 
 * // В компоненте
 * <Button onClick={() => exportTeamToCSV(team)}>
 *   <Download size={16} />
 *   Экспорт в CSV
 * </Button>
 */

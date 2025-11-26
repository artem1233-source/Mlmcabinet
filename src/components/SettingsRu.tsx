import { Moon, Sun, Bell, Wallet, Shield, Droplet, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { DeleteAccountButton } from './DeleteAccountButton';

interface SettingsProps {
  currentUser: any;
  onLogout?: () => void;
  onUpdate?: () => void;
}

export function SettingsRu({ currentUser, onLogout, onUpdate }: SettingsProps) {
  console.log('🔵 SettingsRu: Rendering with currentUser:', currentUser);
  
  // Guard clause
  if (!currentUser) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="text-center py-20">
          <p className="text-[#666]">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  const методВыплаты = currentUser.методВыплаты || 'USDT';
  const изменитьМетодВыплаты = (method: string) => {
    toast.success('Метод выплаты обновлен', {
      description: `Выбран: ${method}`
    });
  };
  const handleSaveSettings = () => {
    toast.success('Настройки сохранены!', {
      description: 'Ваши предпочтения были обновлены.'
    });
  };
  
  const handleClearData = () => {
    if (confirm('⚠️ ВНИМАНИЕ!\n\nВы действительно хотите очистить все данные?\n\nЭто удалит:\n• Все товары из корзины\n• Все настройки\n\nПосле этого потребуется повторный вход.\n\nПродолжить?')) {
      // Очищаем весь localStorage
      localStorage.clear();
      
      // Перезагружаем страницу
      toast.success('Данные очищены! Перезагрузка...', {
        description: 'Все локальные данные удалены'
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };
  
  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      <h1 className="text-[#1E1E1E] mb-6 lg:mb-8" style={{ fontSize: '24px', fontWeight: '700' }}>
        Настройки
      </h1>
      
      <div className="max-w-3xl space-y-4 lg:space-y-6">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Droplet size={20} className="text-[#39B7FF]" />
              Внешний вид
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>Тёмная тема</Label>
                <p className="text-[#666] mt-1">Переключение между светлой и тёмной темой</p>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EE]">
              <div>
                <Label className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>Компактный вид</Label>
                <p className="text-[#666] mt-1">Уменьшить отступы и размеры шрифтов</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Bell size={20} className="text-[#39B7FF]" />
              Уведомления
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>Email уведомления</Label>
                <p className="text-[#666] mt-1">Получайте обновления о заказах и активности сети</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EE]">
              <div>
                <Label className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>Push уведомления</Label>
                <p className="text-[#666] mt-1">Мгновенные оповещения о новых продажах и сообщениях</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EE]">
              <div>
                <Label className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>Еженедельные отчёты</Label>
                <p className="text-[#666] mt-1">Получайте еженедельные сводки производительности</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Wallet size={20} className="text-[#39B7FF]" />
              Настройки выплат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>Предпочтительный метод выплат</Label>
              <p className="text-[#666] mt-1 mb-3">Выберите, как вы хотите получать платежи</p>
              <Select value={методВыплаты} onValueChange={изменитьМетодВыплаты}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT (Tether) - Крипто-кошелёк</SelectItem>
                  <SelectItem value="Карта">Банковская карта - Мгновенный перевод</SelectItem>
                  <SelectItem value="Банк">Банковский перевод - 3-5 дней</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-4 border-t border-[#E6E9EE]">
              <Label className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>Порог автовыплаты</Label>
              <p className="text-[#666] mt-1 mb-3">Автоматически запрашивать выплату при достижении баланса</p>
              <Select defaultValue="10000">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5000">₽5,000</SelectItem>
                  <SelectItem value="10000">₽10,000</SelectItem>
                  <SelectItem value="25000">₽25,000</SelectItem>
                  <SelectItem value="50000">₽50,000</SelectItem>
                  <SelectItem value="disabled">Отключено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Shield size={20} className="text-[#39B7FF]" />
              Безопасность и конфиденциалность
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>Двухфакторная аутентификация</Label>
                <p className="text-[#666] mt-1">Добавьте дополнительный уровень безопасности для вашего аккаунта</p>
              </div>
              <Switch />
            </div>
            
            <div className="pt-4 border-t border-[#E6E9EE]">
              <Button variant="outline" className="w-full border-[#E6E9EE]">
                Изменить пароль
              </Button>
            </div>
            
            <div>
              <Button variant="outline" className="w-full border-[#E6E9EE]">
                Скачать мои данные
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* 🆕 Секция очистки данных для решения проблем */}
        <Card className="border-orange-200 rounded-2xl shadow-sm bg-orange-50">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Trash2 size={20} className="text-orange-600" />
              Очистка данных
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[#666] mb-3">
                Если вы видите ошибки с некорректными SKU товаров (например: "Unknown product SKU: EF"), 
                используйте эту кнопку для полной очистки данных.
              </p>
              <p className="text-[#666] mb-4">
                <strong>Будет удалено:</strong> корзина, настройки. 
                После очистки потребуется повторный вход.
              </p>
            </div>
            <Button 
              onClick={handleClearData}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
              style={{ fontWeight: '600' }}
            >
              <Trash2 size={18} className="mr-2" />
              Очистить все данные
            </Button>
          </CardContent>
        </Card>
        
        {/* 🔧 DEV ONLY: Admin Delete User */}
        <DeleteAccountButton currentUser={currentUser} onDeleted={onLogout} />
        
        {onLogout && (
          <Card className="border-red-200 rounded-2xl shadow-sm bg-white">
            <CardContent className="pt-6">
              <Button 
                onClick={onLogout}
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                style={{ fontWeight: '600' }}
              >
                Выйти из аккаунта
              </Button>
            </CardContent>
          </Card>
        )}
        
        <div className="flex gap-4">
          <Button 
            onClick={handleSaveSettings}
            className="flex-1 bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
            style={{ fontWeight: '600' }}
          >
            Сохранить настройки
          </Button>
          <Button 
            variant="outline"
            className="border-[#E6E9EE]"
            onClick={() => toast.info('Настройки сброшены', { description: 'Восстановлены значения по умолчанию' })}
          >
            Сбросить по умолчанию
          </Button>
        </div>
      </div>
    </div>
  );
}

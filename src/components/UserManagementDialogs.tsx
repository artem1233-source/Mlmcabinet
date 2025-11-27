import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Users,
  Shield,
  Mail,
  Phone,
  MessageCircle,
  Send,
  Instagram,
  Facebook,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Bell,
} from 'lucide-react';

interface UserManagementDialogsProps {
  // Edit Dialog
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  editingUser: any;
  editFormData: any;
  setEditFormData: (data: any) => void;
  handleSaveUser: () => void;
  saving: boolean;
  
  // Balance Confirm Dialog
  balanceConfirmOpen: boolean;
  setBalanceConfirmOpen: (open: boolean) => void;
  originalBalances: { баланс: number; доступныйБаланс: number };
  saveUserData: () => void;
  
  // Data Confirm Dialog
  dataConfirmOpen: boolean;
  setDataConfirmOpen: (open: boolean) => void;
  originalUserData: any;
  
  // Notification Dialog
  notificationDialogOpen: boolean;
  setNotificationDialogOpen: (open: boolean) => void;
  notificationTargetUser: any;
  notificationData: any;
  setNotificationData: (data: any) => void;
  handleSendNotification: () => void;
  sendingNotification: boolean;
}

export function UserManagementDialogs({
  editDialogOpen,
  setEditDialogOpen,
  editingUser,
  editFormData,
  setEditFormData,
  handleSaveUser,
  saving,
  balanceConfirmOpen,
  setBalanceConfirmOpen,
  originalBalances,
  saveUserData,
  dataConfirmOpen,
  setDataConfirmOpen,
  originalUserData,
  notificationDialogOpen,
  setNotificationDialogOpen,
  notificationTargetUser,
  notificationData,
  setNotificationData,
  handleSendNotification,
  sendingNotification,
}: UserManagementDialogsProps) {
  return (
    <>
      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                editingUser?.isAdmin 
                  ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                  : 'bg-gradient-to-br from-[#39B7FF] to-[#12C9B6]'
              }`}>
                {editingUser?.isAdmin ? (
                  <Shield className="w-5 h-5 text-white" />
                ) : (
                  <Users className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>Редактирование пользователя</span>
                  {editingUser?.isAdmin && (
                    <Badge className="bg-purple-100 text-purple-700">Admin</Badge>
                  )}
                </div>
                <DialogDescription className="mt-1">
                  ID: {editingUser?.id} {editingUser?.партнёрскийID && `• P${editingUser.партнёрскийID}`}
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="имя">Имя</Label>
                <Input
                  id="имя"
                  value={editFormData.имя}
                  onChange={(e) => setEditFormData({ ...editFormData, имя: e.target.value })}
                  placeholder="Введите имя"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="фамилия">Фамилия</Label>
                <Input
                  id="фамилия"
                  value={editFormData.фамилия}
                  onChange={(e) => setEditFormData({ ...editFormData, фамилия: e.target.value })}
                  placeholder="Введите фамилию"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="телефон" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Телефон
              </Label>
              <Input
                id="телефон"
                value={editFormData.телефон}
                onChange={(e) => setEditFormData({ ...editFormData, телефон: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            {/* Social Media */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="w-4 h-4" />
                Социальные сети
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="telegram" className="flex items-center gap-1.5 text-xs">
                    <Send className="w-3 h-3 text-blue-600" />
                    Telegram
                  </Label>
                  <Input
                    id="telegram"
                    value={editFormData.telegram || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, telegram: e.target.value })}
                    placeholder="@username"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook" className="flex items-center gap-1.5 text-xs">
                    <MessageCircle className="w-3 h-3 text-blue-600" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook"
                    value={editFormData.facebook || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, facebook: e.target.value })}
                    placeholder="username"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-1.5 text-xs">
                    <Instagram className="w-3 h-3 text-pink-600" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={editFormData.instagram || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, instagram: e.target.value })}
                    placeholder="@username"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vk" className="flex items-center gap-1.5 text-xs">
                    <Facebook className="w-3 h-3 text-indigo-600" />
                    VK
                  </Label>
                  <Input
                    id="vk"
                    value={editFormData.vk || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, vk: e.target.value })}
                    placeholder="id123456789"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Balance - только для партнёров */}
            {!editingUser?.isAdmin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="баланс">Общий баланс</Label>
                    <Input
                      id="баланс"
                      type="number"
                      value={editFormData.баланс === 0 ? '' : editFormData.баланс}
                      onChange={(e) => setEditFormData({ ...editFormData, баланс: e.target.value === '' ? 0 : Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="доступныйБаланс">Доступный баланс</Label>
                    <Input
                      id="доступныйБаланс"
                      type="number"
                      value={editFormData.доступныйБаланс === 0 ? '' : editFormData.доступныйБаланс}
                      onChange={(e) => setEditFormData({ ...editFormData, доступныйБаланс: e.target.value === '' ? 0 : Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </>
            )}

            {editingUser?.isAdmin && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Это администратор. Редактируйте с осторожностью.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={saving}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Confirm Dialog */}
      <Dialog open={balanceConfirmOpen} onOpenChange={setBalanceConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <DialogTitle>Подтверждение изменения баланса</DialogTitle>
                <DialogDescription>
                  Это критическое изменение финансовых данных
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
              <p className="text-sm text-yellow-900 font-medium">
                Вы собираетесь изменить баланс пользователя:
              </p>
              
              {originalBalances.баланс !== editFormData.баланс && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Общий баланс:</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400">₽{originalBalances.баланс.toLocaleString()}</span>
                    <ArrowUpRight className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-yellow-900">₽{editFormData.баланс.toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              {originalBalances.доступныйБаланс !== editFormData.доступныйБаланс && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Доступный баланс:</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400">₽{originalBalances.доступныйБаланс.toLocaleString()}</span>
                    <ArrowUpRight className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-yellow-900">₽{editFormData.доступныйБаланс.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800">
                ⚠️ Изменение баланса повлияет на финансовые операции пользователя.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBalanceConfirmOpen(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              onClick={saveUserData}
              disabled={saving}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Подтверждаю изменение
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data Confirm Dialog */}
      <Dialog open={dataConfirmOpen} onOpenChange={setDataConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#39B7FF]" />
              </div>
              <div>
                <DialogTitle>Подтверждение изменения данных</DialogTitle>
                <DialogDescription>
                  Проверьте корректность изменений перед сохранением
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <p className="text-sm text-blue-900 font-medium">
                Вы собираетесь изменить данные пользователя:
              </p>
              
              {originalUserData?.имя !== editFormData.имя && (
                <div className="flex items-start justify-between text-sm gap-3">
                  <span className="text-gray-600 min-w-[80px]">Имя:</span>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="line-through text-gray-400">{originalUserData?.имя || '-'}</span>
                    <ArrowUpRight className="w-4 h-4 text-[#39B7FF] flex-shrink-0" />
                    <span className="font-bold text-[#39B7FF]">{editFormData.имя}</span>
                  </div>
                </div>
              )}
              
              {originalUserData?.фамилия !== editFormData.фамилия && (
                <div className="flex items-start justify-between text-sm gap-3">
                  <span className="text-gray-600 min-w-[80px]">Фамилия:</span>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="line-through text-gray-400">{originalUserData?.фамилия || '-'}</span>
                    <ArrowUpRight className="w-4 h-4 text-[#39B7FF] flex-shrink-0" />
                    <span className="font-bold text-[#39B7FF]">{editFormData.фамилия}</span>
                  </div>
                </div>
              )}
              
              {originalUserData?.email !== editFormData.email && (
                <div className="flex items-start justify-between text-sm gap-3">
                  <span className="text-gray-600 min-w-[80px]">Email:</span>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="line-through text-gray-400 truncate max-w-[120px]">{originalUserData?.email || '-'}</span>
                    <ArrowUpRight className="w-4 h-4 text-[#39B7FF] flex-shrink-0" />
                    <span className="font-bold text-[#39B7FF] truncate max-w-[120px]">{editFormData.email}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-800">
                ⚠️ Изменение данных может повлиять на доступ пользователя.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDataConfirmOpen(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              onClick={saveUserData}
              disabled={saving}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Подтверждаю изменение
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle>Отправить уведомление</DialogTitle>
                <DialogDescription>
                  {notificationTargetUser && `Пользователю: ${notificationTargetUser.имя} ${notificationTargetUser.фамилия || ''}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notification-type">Тип уведомления</Label>
              <select
                id="notification-type"
                value={notificationData.тип}
                onChange={(e) => setNotificationData({ ...notificationData, тип: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF]"
              >
                <option value="course">📚 Обучение</option>
                <option value="order">🛒 Заказ</option>
                <option value="commission">💰 Комиссия</option>
                <option value="new_partner">👥 Новый партнер</option>
                <option value="goal">🎯 Цель</option>
                <option value="withdrawal">💳 Вывод средств</option>
                <option value="inactive">⏰ Неактивность</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-title">Заголовок</Label>
              <Input
                id="notification-title"
                value={notificationData.заголовок}
                onChange={(e) => setNotificationData({ ...notificationData, заголовок: e.target.value })}
                placeholder="Введите заголовок уведомления"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-message">Сообщение</Label>
              <textarea
                id="notification-message"
                value={notificationData.сообщение}
                onChange={(e) => setNotificationData({ ...notificationData, сообщение: e.target.value })}
                placeholder="Введите текст уведомления"
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B7FF] resize-none"
              />
              <p className="text-xs text-gray-500 text-right">
                {notificationData.сообщение.length}/500
              </p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Превью:</p>
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 text-[#39B7FF] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {notificationData.заголовок || 'Заголовок уведомления'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {notificationData.сообщение || 'Текст уведомления появится здесь'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setNotificationDialogOpen(false)}
              disabled={sendingNotification}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={sendingNotification || !notificationData.заголовок || !notificationData.сообщение}
              className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white"
            >
              {sendingNotification ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Отправить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
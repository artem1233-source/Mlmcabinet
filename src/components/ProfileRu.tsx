import { useState, useRef, useEffect } from 'react';
import { User, Mail, Calendar, Copy, Share2, Award, TrendingUp, Edit2, Save, X, Phone, MessageCircle, Instagram, Facebook, Eye, EyeOff, Lock, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import * as api from '../utils/api';

interface ProfileProps {
  currentUser: any;
  onUpdate?: () => void;
}

export function ProfileRu({ currentUser, onUpdate }: ProfileProps) {
  console.log('🔵 ProfileRu: Rendering with currentUser:', currentUser);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Редактируемые поля
  const [formData, setFormData] = useState({
    имя: currentUser?.имя || '',
    телефон: currentUser?.телефон || '',
    telegram: currentUser?.socialMedia?.telegram || currentUser?.telegram || '',
    whatsapp: currentUser?.socialMedia?.whatsapp || '',
    instagram: currentUser?.socialMedia?.instagram || currentUser?.instagram || '',
    vk: currentUser?.socialMedia?.vk || currentUser?.vk || '',
    аватарка: currentUser?.аватарка || '',
  });
  
  // Настройки приватности
  const [privacySettings, setPrivacySettings] = useState({
    showPhone: currentUser?.privacySettings?.showPhone !== false,
    showEmail: currentUser?.privacySettings?.showEmail !== false,
    showTelegram: currentUser?.privacySettings?.showTelegram !== false,
    showWhatsapp: currentUser?.privacySettings?.showWhatsapp !== false,
    showInstagram: currentUser?.privacySettings?.showInstagram !== false,
    showVk: currentUser?.privacySettings?.showVk !== false,
    showBalance: currentUser?.privacySettings?.showBalance !== false,
    showEarnings: currentUser?.privacySettings?.showEarnings !== false,
  });
  
  // Обновляем formData когда currentUser меняется
  useEffect(() => {
    if (currentUser) {
      setFormData({
        имя: currentUser.имя || '',
        телефон: currentUser.телефон || '',
        telegram: currentUser.socialMedia?.telegram || currentUser.telegram || '',
        whatsapp: currentUser.socialMedia?.whatsapp || '',
        instagram: currentUser.socialMedia?.instagram || currentUser.instagram || '',
        vk: currentUser.socialMedia?.vk || currentUser.vk || '',
        аватарка: currentUser.аватарка || '',
      });
      setPrivacySettings({
        showPhone: currentUser.privacySettings?.showPhone !== false,
        showEmail: currentUser.privacySettings?.showEmail !== false,
        showTelegram: currentUser.privacySettings?.showTelegram !== false,
        showWhatsapp: currentUser.privacySettings?.showWhatsapp !== false,
        showInstagram: currentUser.privacySettings?.showInstagram !== false,
        showVk: currentUser.privacySettings?.showVk !== false,
        showBalance: currentUser.privacySettings?.showBalance !== false,
        showEarnings: currentUser.privacySettings?.showEarnings !== false,
      });
    }
  }, [currentUser]);
  
  // Guard clause
  if (!currentUser || !currentUser.имя) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
        <div className="text-center py-20">
          <p className="text-[#666]">Загрузка профиля...</p>
        </div>
      </div>
    );
  }
  
  const handleEdit = () => {
    setFormData({
      имя: currentUser.имя || '',
      телефон: currentUser.телефон || '',
      telegram: currentUser.socialMedia?.telegram || currentUser.telegram || '',
      whatsapp: currentUser.socialMedia?.whatsapp || '',
      instagram: currentUser.socialMedia?.instagram || currentUser.instagram || '',
      vk: currentUser.socialMedia?.vk || currentUser.vk || '',
      аватарка: currentUser.аватарка || '',
    });
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
  };
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Валидация имени
      if (!formData.имя.trim()) {
        toast.error('Имя не может быть пустым');
        return;
      }
      
      // Подготовка данных: отправляем только непустые поля (чтобы не стереть существующие данные)
      const normalizedData: any = {
        имя: formData.имя,
        телефон: formData.телефон,
        аватарка: formData.аватарка,
      };
      
      // Добавляем соц сети только если они заполнены
      const telegram = formData.telegram.replace(/^@/, '').trim();
      const whatsapp = formData.whatsapp.replace(/^@/, '').trim();
      const instagram = formData.instagram.replace(/^@/, '').trim();
      const vk = formData.vk.replace(/^@/, '').trim();
      
      if (telegram) normalizedData.telegram = telegram;
      if (whatsapp) normalizedData.whatsapp = whatsapp;
      if (instagram) normalizedData.instagram = instagram;
      if (vk) normalizedData.vk = vk;
      
      console.log('📤 Sending profile update:', normalizedData);
      const response = await api.updateProfile(normalizedData);
      console.log('📥 Received profile response:', response);
      
      if (response.success) {
        toast.success('Профиль обновлён!');
        setIsEditing(false);
        
        // Обновляем данные в родительском компоненте
        if (onUpdate) {
          await onUpdate();
        }
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Ошибка обновления профиля');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Проверка размера (макс 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс 2MB)');
      return;
    }
    
    // Конвертируем в Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, аватарка: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Цвета для уровней 1, 2, 3 (индекс 0 не используется)
  const цветаУровней = [
    '#999999',  // 0 - не используется (для совместимости с индексом)
    '#3B82F6',  // 1 - синий
    '#A855F7',  // 2 - фиолетовый  
    '#F59E0B'   // 3 - янтарный
  ];
  const инициалы = currentUser.имя.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  
  
  const getRefLink = () => {
    // Get current domain or use production domain
    const domain = window.location.hostname === 'localhost' 
      ? 'http://localhost:5173' 
      : window.location.origin;
    return `${domain}/?ref=${currentUser.рефКод}`;
  };

  const скопироватьРеферальнуюСсылку = () => {
    const ссылка = getRefLink();
    navigator.clipboard.writeText(ссылка);
    toast.success('Ссылка скопирована!', {
      description: 'Реферальная ссылка скопирована в буфер обмена.'
    });
  };

  const поделитьсяВТелеграм = () => {
    const ссылка = getRefLink();
    const текст = `Присоединяйтесь к партнёрской программе H₂! Получайте доход от продаж водородного порошка.`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(ссылка)}&text=${encodeURIComponent(текст)}`;
    window.open(telegramUrl, '_blank');
  };
  
  const скопироватьКод = () => {
    navigator.clipboard.writeText(currentUser.рефКод);
    toast.success('Код скопирован!', {
      description: 'Реферальный код скопирован в буфер обмена.'
    });
  };
  
  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <h1 className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
          Профиль
        </h1>
        {!isEditing ? (
          <Button
            onClick={handleEdit}
            className="bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
          >
            <Edit2 size={16} className="mr-2" />
            Редактировать
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="border-[#E6E9EE]"
            >
              <X size={16} className="mr-2" />
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#12C9B6] hover:bg-[#0FB89F] text-white"
            >
              <Save size={16} className="mr-2" />
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-4 lg:space-y-6 max-w-full">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E]">Личная информация</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="relative">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                  {(isEditing ? formData.аватарка : currentUser.аватарка) ? (
                    <AvatarImage src={isEditing ? formData.аватарка : currentUser.аватарка} />
                  ) : null}
                  <AvatarFallback 
                    className="text-white text-2xl"
                    style={{ 
                      background: `linear-gradient(135deg, ${цветаУровней[currentUser.уровень]} 0%, ${цветаУровней[currentUser.уровень]}CC 100%)`,
                      fontWeight: '700'
                    }}
                  >
                    {инициалы}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="sm"
                      className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
                    >
                      <Edit2 size={14} />
                    </Button>
                  </>
                )}
              </div>
              
              <div className="flex-1 space-y-4 w-full min-w-0">
                {!isEditing ? (
                  <>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h2 className="text-[#1E1E1E] truncate" style={{ fontSize: '20px', fontWeight: '700' }}>
                          {currentUser.имя}
                        </h2>
                        <Badge 
                          className="border-0 text-white self-start sm:self-auto"
                          style={{ 
                            backgroundColor: цветаУровней[currentUser.уровень],
                            fontWeight: '600'
                          }}
                        >
                          Уровень {currentUser.уровень}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#39B7FF]/10 to-[#12C9B6]/10 rounded-xl min-w-0 border border-[#39B7FF]/20">
                        <User size={20} className="text-[#39B7FF] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[#666]" style={{ fontSize: '12px' }}>ID Партнера</div>
                          <div className="text-[#39B7FF] truncate" style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '1px' }}>{currentUser.id}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(currentUser.id);
                            toast.success('ID скопирован!');
                          }}
                          className="h-8 w-8 p-0 hover:bg-[#39B7FF]/10"
                        >
                          <Copy size={14} className="text-[#39B7FF]" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-xl min-w-0">
                        <Mail size={20} className="text-[#666] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[#666]" style={{ fontSize: '12px' }}>Email</div>
                          <div className="text-[#1E1E1E] truncate" style={{ fontWeight: '600' }}>{currentUser.email || 'Не указан'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-xl min-w-0">
                        <Phone size={20} className="text-[#666] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[#666]" style={{ fontSize: '12px' }}>Телефон</div>
                          <div className="text-[#1E1E1E] truncate" style={{ fontWeight: '600' }}>{currentUser.телефон || 'Не указан'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-xl min-w-0">
                        <MessageCircle size={20} className="text-[#666] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[#666]" style={{ fontSize: '12px' }}>Telegram</div>
                          {currentUser.telegram ? (
                            <a 
                              href={`https://t.me/${currentUser.telegram.replace(/^@/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#39B7FF] hover:underline truncate block"
                              style={{ fontWeight: '600' }}
                            >
                              @{currentUser.telegram.replace(/^@/, '')}
                            </a>
                          ) : (
                            <div className="text-[#1E1E1E] truncate" style={{ fontWeight: '600' }}>Не указан</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-xl min-w-0">
                        <Calendar size={20} className="text-[#666] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[#666]" style={{ fontSize: '12px' }}>Регистрация</div>
                          <div className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '13px' }}>
                            {new Date(currentUser.зарегистрирован || currentUser.датаРегистрации).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <div className="text-[#666] mb-2" style={{ fontSize: '12px' }}>Соц. сети</div>
                      <div 
                        data-social-container="true"
                        style={{ 
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          width: '100%'
                        }}
                      >
                        {currentUser.instagram && (
                          <a 
                            data-social="instagram"
                            data-value={currentUser.instagram}
                            href={`https://instagram.com/${String(currentUser.instagram).replace(/^@/, '').trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: 'linear-gradient(to right, #f09433 0%, #e6683c 50%, #bc1888 100%)',
                              color: 'white',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontSize: '13px',
                              transition: 'opacity 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <Instagram size={16} />
                            <span>@{String(currentUser.instagram).replace(/^@/, '').trim()}</span>
                          </a>
                        )}
                        
                        {currentUser.vk && (
                          <a 
                            data-social="vk"
                            data-value={currentUser.vk}
                            href={`https://vk.com/${String(currentUser.vk).replace(/^@/, '').trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              backgroundColor: '#0077FF',
                              color: 'white',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontSize: '13px',
                              transition: 'opacity 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <span>VK: {String(currentUser.vk).replace(/^@/, '').trim()}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-[#666]">ФИО</Label>
                      <Input
                        id="name"
                        value={formData.имя}
                        onChange={(e) => setFormData(prev => ({ ...prev, имя: e.target.value }))}
                        className="mt-1"
                        placeholder="Иванов Иван Иванович"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-[#666]">Телефон</Label>
                      <Input
                        id="phone"
                        value={formData.телефон}
                        onChange={(e) => setFormData(prev => ({ ...prev, телефон: e.target.value }))}
                        className="mt-1"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="telegram" className="text-[#666]">Telegram</Label>
                      <Input
                        id="telegram"
                        value={formData.telegram}
                        onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
                        className="mt-1"
                        placeholder="username или @username"
                      />
                      <p className="text-[#999] mt-1" style={{ fontSize: '11px' }}>
                        Будет создана ссылка t.me/username
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="instagram" className="text-[#666]">Instagram</Label>
                        <Input
                          id="instagram"
                          value={formData.instagram}
                          onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                          className="mt-1"
                          placeholder="username"
                        />
                        <p className="text-[#999] mt-1" style={{ fontSize: '11px' }}>
                          instagram.com/username
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="vk" className="text-[#666]">VK</Label>
                        <Input
                          id="vk"
                          value={formData.vk}
                          onChange={(e) => setFormData(prev => ({ ...prev, vk: e.target.value }))}
                          className="mt-1"
                          placeholder="username"
                        />
                        <p className="text-[#999] mt-1" style={{ fontSize: '11px' }}>
                          vk.com/username
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 bg-[#F7FAFC] rounded-xl">
                      <Mail size={20} className="text-[#666]" />
                      <div>
                        <div className="text-[#666]" style={{ fontSize: '12px' }}>Email (не редактируется)</div>
                        <div className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>{currentUser.email}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Privacy Settings Card */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Lock size={20} />
              Настройки приватности
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#666] mb-4 text-sm">
              Выберите, какую информацию другие пользователи могут видеть в вашем профиле
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Phone size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] font-semibold text-sm">Показывать телефон</div>
                    <div className="text-[#666] text-xs">
                      {privacySettings.showPhone ? 'Виден всем' : 'Скрыт'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showPhone}
                  onCheckedChange={async (checked) => {
                    const newSettings = { ...privacySettings, showPhone: checked };
                    setPrivacySettings(newSettings);
                    try {
                      await api.updateUserProfile({ privacySettings: newSettings });
                      toast.success('Настройки приватности обновлены');
                      if (onUpdate) await onUpdate();
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Mail size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] font-semibold text-sm">Показывать email</div>
                    <div className="text-[#666] text-xs">
                      {privacySettings.showEmail ? 'Виден всем' : 'Скрыт'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showEmail}
                  onCheckedChange={async (checked) => {
                    const newSettings = { ...privacySettings, showEmail: checked };
                    setPrivacySettings(newSettings);
                    try {
                      await api.updateUserProfile({ privacySettings: newSettings });
                      toast.success('Настройки приватности обновлены');
                      if (onUpdate) await onUpdate();
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <MessageCircle size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] font-semibold text-sm">Показывать Telegram</div>
                    <div className="text-[#666] text-xs">
                      {privacySettings.showTelegram ? 'Виден всем' : 'Скрыт'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showTelegram}
                  onCheckedChange={async (checked) => {
                    const newSettings = { ...privacySettings, showTelegram: checked };
                    setPrivacySettings(newSettings);
                    try {
                      await api.updateUserProfile({ privacySettings: newSettings });
                      toast.success('Настройки приватности обновлены');
                      if (onUpdate) await onUpdate();
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Phone size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] font-semibold text-sm">Показывать WhatsApp</div>
                    <div className="text-[#666] text-xs">
                      {privacySettings.showWhatsapp ? 'Виден всем' : 'Скрыт'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showWhatsapp}
                  onCheckedChange={async (checked) => {
                    const newSettings = { ...privacySettings, showWhatsapp: checked };
                    setPrivacySettings(newSettings);
                    try {
                      await api.updateUserProfile({ privacySettings: newSettings });
                      toast.success('Настройки приватности обновлены');
                      if (onUpdate) await onUpdate();
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Instagram size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] font-semibold text-sm">Показывать Instagram</div>
                    <div className="text-[#666] text-xs">
                      {privacySettings.showInstagram ? 'Виден всем' : 'Скрыт'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showInstagram}
                  onCheckedChange={async (checked) => {
                    const newSettings = { ...privacySettings, showInstagram: checked };
                    setPrivacySettings(newSettings);
                    try {
                      await api.updateUserProfile({ privacySettings: newSettings });
                      toast.success('Настройки приватности обновлены');
                      if (onUpdate) await onUpdate();
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0077FF] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    VK
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] font-semibold text-sm">Показывать VK</div>
                    <div className="text-[#666] text-xs">
                      {privacySettings.showVk ? 'Виден всем' : 'Скрыт'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showVk}
                  onCheckedChange={async (checked) => {
                    const newSettings = { ...privacySettings, showVk: checked };
                    setPrivacySettings(newSettings);
                    try {
                      await api.updateUserProfile({ privacySettings: newSettings });
                      toast.success('Настройки приватности обновлены');
                      if (onUpdate) await onUpdate();
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              
              <div className="border-t border-gray-200 my-4 pt-4">
                <h4 className="text-sm font-semibold text-[#1E1E1E] mb-3">Финансовая информация</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="text-[#1E1E1E] font-semibold text-sm">Показывать баланс</div>
                        <div className="text-[#666] text-xs">
                          {privacySettings.showBalance ? 'Виден всем' : 'Скрыт'}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={privacySettings.showBalance}
                      onCheckedChange={async (checked) => {
                        const newSettings = { ...privacySettings, showBalance: checked };
                        setPrivacySettings(newSettings);
                        try {
                          await api.updateUserProfile({ privacySettings: newSettings });
                          toast.success('Настройки приватности обновлены');
                          if (onUpdate) await onUpdate();
                        } catch (error) {
                          toast.error('Ошибка обновления настроек');
                          setPrivacySettings(privacySettings);
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Award size={18} className="text-green-600" />
                      </div>
                      <div>
                        <div className="text-[#1E1E1E] font-semibold text-sm">Показывать доходы</div>
                        <div className="text-[#666] text-xs">
                          {privacySettings.showEarnings ? 'Виден всем' : 'Скрыт'}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={privacySettings.showEarnings}
                      onCheckedChange={async (checked) => {
                        const newSettings = { ...privacySettings, showEarnings: checked };
                        setPrivacySettings(newSettings);
                        try {
                          await api.updateUserProfile({ privacySettings: newSettings });
                          toast.success('Настройки приватности обновлены');
                          if (onUpdate) await onUpdate();
                        } catch (error) {
                          toast.error('Ошибка обновления настроек');
                          setPrivacySettings(privacySettings);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <Globe size={16} className="text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Эти настройки контролируют, какую информацию видят другие пользователи при просмотре вашего профиля
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <Share2 size={20} />
              Реферальная программа
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#666] mb-4">
              Приглашайте новых партнёров по вашей уникальной реферальной ссылке и получайте бонусы за каждого присоединившегося.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[#666] mb-2 block">Ваш реферальный код</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-[#F7FAFC] rounded-xl text-[#1E1E1E] flex items-center justify-between min-w-0">
                    <span className="truncate" style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '2px' }}>
                      {currentUser.рефКод}
                    </span>
                    <Button
                      onClick={скопироватьКод}
                      variant="ghost"
                      size="sm"
                      className="text-[#39B7FF] hover:text-[#2A9FE8] hover:bg-[#39B7FF]/10 flex-shrink-0"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-[#666] mb-2 block">Ваша реферальная ссылка</label>
                <div className="flex flex-col gap-2">
                  <div className="px-4 py-3 bg-[#F7FAFC] rounded-xl text-[#666] break-all text-sm">
                    {getRefLink()}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={скопироватьРеферальнуюСсылку}
                      className="flex-1 bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
                      style={{ fontWeight: '600' }}
                    >
                      <Copy size={16} className="mr-2" />
                      Скопировать ссылку
                    </Button>
                    <Button
                      onClick={поделитьсяВТелеграм}
                      className="flex-1 bg-[#0088cc] hover:bg-[#0077b3] text-white"
                      style={{ fontWeight: '600' }}
                    >
                      <Share2 size={16} className="mr-2" />
                      Поделиться в Telegram
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
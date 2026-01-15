import { useState, useRef, useEffect } from 'react';
import { User, Mail, Calendar, Copy, Share2, Award, TrendingUp, Edit2, Save, X, Phone, MessageCircle, Instagram, Facebook, Eye, EyeOff, Lock, Globe, LogOut, CalendarIcon, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { AvatarCropDialog } from './AvatarCropDialog';
import { TeamStructureBadge } from './TeamStructureBadge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ProfileProps {
  currentUser: any;
  onUpdate?: () => void;
  onLogout?: () => void;
}

export function ProfileRu({ currentUser, onUpdate, onLogout }: ProfileProps) {
  console.log('🔵 ProfileRu: Rendering with currentUser:', currentUser);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🆕 Состояние для обрезки аватарки
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  
  // 🆕 Локальное состояние для текстового ввода даты
  const [birthDateInput, setBirthDateInput] = useState('');
  
  // 🆕 Состояние для метрик команды из API
  const [teamStructure, setTeamStructure] = useState<{firstLine: number; depth: number; totalTeam: number}>({
    firstLine: 0, depth: 0, totalTeam: 0
  });
  
  // Редактируемые поля
  const [formData, setFormData] = useState({
    имя: currentUser?.имя?.split(' ')[0] || '', // Только имя (первое слово)
    фамилия: currentUser?.имя?.split(' ').slice(1).join(' ') || '', // Фамилия и отчество (остальное)
    телефон: currentUser?.телефон || '',
    telegram: currentUser?.socialMedia?.telegram || currentUser?.telegram || '',
    whatsapp: currentUser?.socialMedia?.whatsapp || currentUser?.whatsapp || '',
    facebook: currentUser?.socialMedia?.facebook || currentUser?.facebook || '',
    instagram: currentUser?.socialMedia?.instagram || currentUser?.instagram || '',
    vk: currentUser?.socialMedia?.vk || currentUser?.vk || '',
    аватарка: currentUser?.аватарка || '',
    датаРождения: currentUser?.датаРождения || '',
  });
  
  // Настройки приватности
  const [privacySettings, setPrivacySettings] = useState({
    showPhone: currentUser?.privacySettings?.showPhone !== false,
    showEmail: currentUser?.privacySettings?.showEmail !== false,
    showTelegram: currentUser?.privacySettings?.showTelegram !== false,
    showWhatsapp: currentUser?.privacySettings?.showWhatsapp !== false,
    showFacebook: currentUser?.privacySettings?.showFacebook !== false,
    showInstagram: currentUser?.privacySettings?.showInstagram !== false,
    showVk: currentUser?.privacySettings?.showVk !== false,
    showBalance: currentUser?.privacySettings?.showBalance !== false,
    showEarnings: currentUser?.privacySettings?.showEarnings !== false,
  });
  
  // Обновляем formData когда currentUser меняется
  useEffect(() => {
    if (currentUser) {
      setFormData({
        имя: currentUser.имя?.split(' ')[0] || '',
        фамилия: currentUser.имя?.split(' ').slice(1).join(' ') || '',
        телефон: currentUser.телефон || '',
        telegram: currentUser.socialMedia?.telegram || currentUser.telegram || '',
        whatsapp: currentUser.socialMedia?.whatsapp || currentUser.whatsapp || '',
        facebook: currentUser.socialMedia?.facebook || currentUser.facebook || '',
        instagram: currentUser.socialMedia?.instagram || currentUser.instagram || '',
        vk: currentUser.socialMedia?.vk || currentUser.vk || '',
        аватарка: currentUser.аватарка || '',
        датаРождения: currentUser.датаРождения || '',
      });
      setPrivacySettings({
        showPhone: currentUser.privacySettings?.showPhone !== false,
        showEmail: currentUser.privacySettings?.showEmail !== false,
        showTelegram: currentUser.privacySettings?.showTelegram !== false,
        showWhatsapp: currentUser.privacySettings?.showWhatsapp !== false,
        showFacebook: currentUser.privacySettings?.showFacebook !== false,
        showInstagram: currentUser.privacySettings?.showInstagram !== false,
        showVk: currentUser.privacySettings?.showVk !== false,
        showBalance: currentUser.privacySettings?.showBalance !== false,
        showEarnings: currentUser.privacySettings?.showEarnings !== false,
      });
      // Синхронизируем поле ввода даты
      if (currentUser.датаРождения) {
        setBirthDateInput(format(new Date(currentUser.датаРождения), 'dd.MM.yyyy'));
      } else {
        setBirthDateInput('');
      }
      
      // 🆕 Загружаем метрики команды из API
      if (currentUser.id && !currentUser.isAdmin) {
        api.getTeamStructure(currentUser.id).then(response => {
          if (response.success) {
            setTeamStructure({
              firstLine: response.firstLine || 0,
              depth: response.depth || 0,
              totalTeam: response.totalTeam || 0
            });
          }
        }).catch(() => {});
      }
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
      имя: currentUser.имя?.split(' ')[0] || '',
      фамилия: currentUser.имя?.split(' ').slice(1).join(' ') || '',
      телефон: currentUser.телефон || '',
      telegram: currentUser.socialMedia?.telegram || currentUser.telegram || '',
      whatsapp: currentUser.socialMedia?.whatsapp || currentUser.whatsapp || '',
      facebook: currentUser.socialMedia?.facebook || currentUser.facebook || '',
      instagram: currentUser.socialMedia?.instagram || currentUser.instagram || '',
      vk: currentUser.socialMedia?.vk || currentUser.vk || '',
      аватарка: currentUser.аватарка || '',
      датаРождения: currentUser.датаРождения || '',
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
      
      // Объединяем имя и фамилию для отправки
      const fullName = `${formData.имя.trim()} ${formData.фамилия.trim()}`.trim();
      
      // Подготовка данных: отправляем только непустые поля (чтобы не стереть существующие данные)
      const normalizedData: any = {
        имя: fullName,
        телефон: formData.телефон,
        аватарка: formData.аватарка,
      };
      
      // Добавляем дату рождния если она указана
      if (formData.датаРождения) {
        normalizedData.датаРождения = formData.датаРождения;
        console.log('📅 Saving birth date:', formData.датаРождения);
      } else {
        console.log('⚠️ Birth date is empty in formData');
      }
      
      // Добавляем соц сети только если они заполнены
      const telegram = formData.telegram.replace(/^@/, '').trim();
      const whatsapp = formData.whatsapp.replace(/^@/, '').trim();
      const facebook = formData.facebook.replace(/^@/, '').trim();
      const instagram = formData.instagram.replace(/^@/, '').trim();
      const vk = formData.vk.replace(/^@/, '').trim();
      
      if (telegram) normalizedData.telegram = telegram;
      if (whatsapp) normalizedData.whatsapp = whatsapp;
      if (facebook) normalizedData.facebook = facebook;
      if (instagram) normalizedData.instagram = instagram;
      if (vk) normalizedData.vk = vk;
      
      console.log('📤 Sending profile update:', normalizedData);
      const response = await api.updateProfile(normalizedData);
      console.log('📥 Received profile response:', response);
      
      if (response.success) {
        toast.success('Профиь обновлён!');
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
    
    // Конвертируем в data URL для предпросмотра
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (file: File | Blob) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.uploadAvatar(formData);
      
      if (response.success) {
        setFormData(prev => ({ ...prev, аватарка: response.avatarUrl }));
        toast.success('Аватарка загружена!');
        
        // Обновляем данные в родительском компоненте
        if (onUpdate) {
          await onUpdate();
        }
      } else {
        throw new Error(response.error || 'Failed to upload');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Ошибка загрузки аватарки');
    }
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
            <CardTitle className="text-[#1E1E1E]\">Личная информация</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="relative flex flex-col items-center gap-2">
                <Avatar className="w-32 h-32 flex-shrink-0">
                  {(isEditing ? formData.аватарка : currentUser.аватарка) ? (
                    <AvatarImage src={isEditing ? formData.аватарка : currentUser.аватарка} />
                  ) : null}
                  <AvatarFallback 
                    className="text-white text-3xl"
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
                      className="absolute top-0 right-0 rounded-full w-8 h-8 p-0 bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
                    >
                      <Edit2 size={14} />
                    </Button>
                  </>
                )}
                
                {/* 🎨 МЕТРИКА СТРУКТУРЫ КОМАНДЫ A/B/C ПОД АВАТАРКОЙ */}
                {!currentUser.isAdmin && (
                  <TeamStructureBadge 
                    firstLine={teamStructure.firstLine}
                    depth={teamStructure.depth}
                    totalTeam={teamStructure.totalTeam}
                    showTooltip={true}
                  />
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
                      
                      <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-xl min-w-0">
                        <Calendar size={20} className="text-[#666] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[#666]" style={{ fontSize: '12px' }}>Дата рождения</div>
                          <div className="text-[#1E1E1E]" style={{ fontWeight: '600', fontSize: '13px' }}>
                            {currentUser.датаРождения ? new Date(currentUser.датаРождения).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : 'Не указана'}
                          </div>
                        </div>
                      </div>
                      
                      {/* 🗑️ УДАЛЕНО: Блок "Глубина структуры" - дублирует ранг из бейджа */}
                    </div>
                    
                    <div className="pt-2">
                      <div className="text-[#666] mb-2" style={{ fontSize: '12px' }}>Соц. сети</div>
                      <div 
                        data-social-container="true"
                        className="flex flex-wrap gap-2"
                      >
                        {currentUser.telegram && (
                          <a 
                            data-social="telegram"
                            data-value={currentUser.telegram}
                            href={`https://t.me/${String(currentUser.telegram).replace(/^@/, '').trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 min-w-[140px] px-4 py-2.5 bg-[#0088cc] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                          >
                            <Send size={16} className="flex-shrink-0" />
                            <span>Telegram</span>
                          </a>
                        )}
                        
                        {currentUser.whatsapp && (
                          <a 
                            data-social="whatsapp"
                            data-value={currentUser.whatsapp}
                            href={`https://wa.me/${String(currentUser.whatsapp).replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 min-w-[140px] px-4 py-2.5 bg-[#25D366] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                          >
                            <MessageCircle size={16} className="flex-shrink-0" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        
                        {currentUser.facebook && (
                          <a 
                            data-social="facebook"
                            data-value={currentUser.facebook}
                            href={`https://facebook.com/${String(currentUser.facebook).replace(/^@/, '').trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 min-w-[140px] px-4 py-2.5 bg-[#1877F2] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                          >
                            <Facebook size={16} className="flex-shrink-0" />
                            <span>Facebook</span>
                          </a>
                        )}
                        
                        {currentUser.instagram && (
                          <a 
                            data-social="instagram"
                            data-value={currentUser.instagram}
                            href={`https://instagram.com/${String(currentUser.instagram).replace(/^@/, '').trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 min-w-[140px] px-4 py-2.5 rounded-lg text-white hover:opacity-90 transition-opacity text-sm font-medium"
                            style={{
                              background: 'linear-gradient(to right, #f09433 0%, #e6683c 50%, #bc1888 100%)'
                            }}
                          >
                            <Instagram size={16} className="flex-shrink-0" />
                            <span>Instagram</span>
                          </a>
                        )}
                        
                        {currentUser.vk && (
                          <a 
                            data-social="vk"
                            data-value={currentUser.vk}
                            href={`https://vk.com/${String(currentUser.vk).replace(/^@/, '').trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 min-w-[140px] px-4 py-2.5 bg-[#0077FF] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.162 18.994c.609 0 .858-.406.851-.915-.031-1.917.714-2.949 2.059-1.604 1.488 1.488 1.796 2.519 3.603 2.519h3.2c.808 0 1.126-.26 1.126-.668 0-.863-1.421-2.386-2.625-3.504-1.686-1.565-1.765-1.602-.313-3.486 1.801-2.339 4.157-5.336 2.073-5.336h-3.981c-.772 0-.828.435-1.103 1.083-.995 2.347-2.886 5.387-3.604 4.922-.751-.485-.407-2.406-.35-5.261.015-.754.011-1.271-.141-1.539-.36-.637-1.111-.778-1.742-.778-.631 0-1.381.141-1.742.778-.152.268-.156.785-.141 1.539.057 2.855.401 4.776-.35 5.261-.718.465-2.609-2.575-3.604-4.922-.275-.648-.331-1.083-1.103-1.083H2.294c-2.084 0 .272 2.997 2.073 5.336 1.452 1.884 1.373 1.921-.313 3.486-1.204 1.118-2.625 2.641-2.625 3.504 0 .408.418.668 1.126.668h3.2c1.807 0 2.115-1.031 3.603-2.519 1.345-1.345 2.09-.313 2.059 1.604-.007.509.242.915.851.915h4.894z"/>
                            </svg>
                            <span>VKontakte</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-[#666]">Имя</Label>
                        <Input
                          id="firstName"
                          value={formData.имя}
                          onChange={(e) => setFormData(prev => ({ ...prev, имя: e.target.value }))}
                          className="mt-1"
                          placeholder="Иван"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="lastName" className="text-[#666]">Фамилия</Label>
                        <Input
                          id="lastName"
                          value={formData.фамилия}
                          onChange={(e) => setFormData(prev => ({ ...prev, фамилия: e.target.value }))}
                          className="mt-1"
                          placeholder="Иванов"
                        />
                      </div>
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
                      <Label htmlFor="birthDate" className="text-[#666]">Дата рождения</Label>
                      <div className="space-y-2 mt-1">
                        {/* Поле для ручного ввода */}
                        <Input
                          type="text"
                          value={birthDateInput}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^\d]/g, ''); // Только цифры
                            
                            // Автоматическая расстановка точек
                            if (value.length >= 2) {
                              value = value.slice(0, 2) + '.' + value.slice(2);
                            }
                            if (value.length >= 5) {
                              value = value.slice(0, 5) + '.' + value.slice(5);
                            }
                            if (value.length > 10) {
                              value = value.slice(0, 10); // Ограничение дд.мм.гггг
                            }
                            
                            setBirthDateInput(value);
                            
                            // Проверяем формат дд.мм.гггг
                            const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
                            if (match) {
                              const [, day, month, year] = match;
                              const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                              console.log('📝 Setting date in formData:', dateStr);
                              setFormData(prev => ({ ...prev, датаРождения: dateStr }));
                            } else if (value.length < 10) {
                              // Если формат неполный, очищаем дату в formData
                              setFormData(prev => ({ ...prev, датаРождения: '' }));
                            }
                          }}
                          onKeyDown={(e) => {
                            // Сохранение по Enter
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const match = birthDateInput.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
                              if (match) {
                                handleSave();
                              }
                            }
                          }}
                          onFocus={() => {
                            // При фокусе показываем текущую дату в формате дд.мм.гггг
                            if (formData.датаРождения && !birthDateInput) {
                              setBirthDateInput(format(new Date(formData.датаРождения), 'dd.MM.yyyy'));
                            }
                          }}
                          onBlur={() => {
                            // При потере фокуса очищаем если формат неправильный
                            if (birthDateInput && !birthDateInput.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)) {
                              setBirthDateInput('');
                              setFormData(prev => ({ ...prev, датаРождения: '' }));
                            }
                          }}
                          placeholder="дд.мм.гггг"
                          className="w-full"
                        />
                        
                        {/* Календарь */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon size={16} className="mr-2" />
                              {formData.датаРождения ? format(new Date(formData.датаРождения), 'dd MMMM yyyy', { locale: ru }) : 'Выберите дату в календаре'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <div className="p-3 border-b space-y-2">
                              <div className="flex gap-2">
                                <select
                                  className="flex-1 px-2 py-1 border rounded text-sm"
                                  value={formData.датаРождения ? new Date(formData.датаРождения).getMonth() : new Date().getMonth()}
                                  onChange={(e) => {
                                    const currentDate = formData.датаРождения ? new Date(formData.датаРождения) : new Date();
                                    const year = currentDate.getFullYear();
                                    const month = String(parseInt(e.target.value) + 1).padStart(2, '0');
                                    const day = String(currentDate.getDate()).padStart(2, '0');
                                    const dateStr = `${year}-${month}-${day}`;
                                    setFormData(prev => ({ ...prev, датаРождения: dateStr }));
                                    setBirthDateInput(format(new Date(dateStr + 'T12:00:00'), 'dd.MM.yyyy'));
                                  }}
                                >
                                  {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map((month, idx) => (
                                    <option key={idx} value={idx}>{month}</option>
                                  ))}
                                </select>
                                <select
                                  className="w-24 px-2 py-1 border rounded text-sm"
                                  value={formData.датаРождения ? new Date(formData.датаРождения).getFullYear() : new Date().getFullYear()}
                                  onChange={(e) => {
                                    const currentDate = formData.датаРождения ? new Date(formData.датаРождения) : new Date();
                                    const year = e.target.value;
                                    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                    const day = String(currentDate.getDate()).padStart(2, '0');
                                    const dateStr = `${year}-${month}-${day}`;
                                    setFormData(prev => ({ ...prev, датаРождения: dateStr }));
                                    setBirthDateInput(format(new Date(dateStr + 'T12:00:00'), 'dd.MM.yyyy'));
                                  }}
                                >
                                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <CalendarComponent
                              mode="single"
                              selected={formData.датаРождения ? new Date(formData.датаРождения + 'T12:00:00') : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const dateStr = `${year}-${month}-${day}`;
                                  setFormData(prev => ({ ...prev, датаРождения: dateStr }));
                                  setBirthDateInput(format(new Date(dateStr + 'T12:00:00'), 'dd.MM.yyyy'));
                                }
                              }}
                              month={formData.датаРождения ? new Date(formData.датаРождения + 'T12:00:00') : undefined}
                              onMonthChange={(date) => {
                                if (date) {
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const dateStr = `${year}-${month}-${day}`;
                                  setFormData(prev => ({ ...prev, датаРождения: dateStr }));
                                  setBirthDateInput(format(new Date(dateStr + 'T12:00:00'), 'dd.MM.yyyy'));
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <p className="text-[#999]" style={{ fontSize: '11px' }}>
                          Введите дату в формате дд.мм.гггг или выберите в календаре
                        </p>
                      </div>
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
                    
                    <div>
                      <Label htmlFor="whatsapp" className="text-[#666]">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                        className="mt-1"
                        placeholder="+7 999 123-45-67"
                      />
                      <p className="text-[#999] mt-1" style={{ fontSize: '11px' }}>
                        Будет создана ссылка wa.me/номер
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="facebook" className="text-[#666]">Facebook</Label>
                      <Input
                        id="facebook"
                        value={formData.facebook}
                        onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                        className="mt-1"
                        placeholder="username"
                      />
                      <p className="text-[#999] mt-1" style={{ fontSize: '11px' }}>
                        Будет создана ссылка facebook.com/username
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
              {/* Контактная информация в 2 колонки */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                    <div className="text-[#1E1E1E] font-semibold text-sm">Показы��ать email</div>
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
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center">
                    <MessageCircle size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] font-semibold text-sm">Показывать Facebook</div>
                    <div className="text-[#666] text-xs">
                      {privacySettings.showFacebook ? 'Виден всем' : 'Скрыт'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showFacebook}
                  onCheckedChange={async (checked) => {
                    const newSettings = { ...privacySettings, showFacebook: checked };
                    setPrivacySettings(newSettings);
                    try {
                      await api.updateUserProfile({ privacySettings: newSettings });
                      toast.success('Настройки приватности обновлены');
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
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0077FF] rounded-lg flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.162 18.994c.609 0 .858-.406.851-.915-.031-1.917.714-2.949 2.059-1.604 1.488 1.488 1.796 2.519 3.603 2.519h3.2c.808 0 1.126-.26 1.126-.668 0-.863-1.421-2.386-2.625-3.504-1.686-1.565-1.765-1.602-.313-3.486 1.801-2.339 4.157-5.336 2.073-5.336h-3.981c-.772 0-.828.435-1.103 1.083-.995 2.347-2.886 5.387-3.604 4.922-.751-.485-.407-2.406-.35-5.261.015-.754.011-1.271-.141-1.539-.36-.637-1.111-.778-1.742-.778-.631 0-1.381.141-1.742.778-.152.268-.156.785-.141 1.539.057 2.855.401 4.776-.35 5.261-.718.465-2.609-2.575-3.604-4.922-.275-.648-.331-1.083-1.103-1.083H2.294c-2.084 0 .272 2.997 2.073 5.336 1.452 1.884 1.373 1.921-.313 3.486-1.204 1.118-2.625 2.641-2.625 3.504 0 .408.418.668 1.126.668h3.2c1.807 0 2.115-1.031 3.603-2.519 1.345-1.345 2.09-.313 2.059 1.604-.007.509.242.915.851.915h4.894z"/>
                    </svg>
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
                    } catch (error) {
                      toast.error('Ошибка обновления настроек');
                      setPrivacySettings(privacySettings);
                    }
                  }}
                />
              </div>
              </div>
              
              {/* Финансовая информация */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-[#1E1E1E] mb-3">Финансовая информация</h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
      
      {/* 🚪 Кнопка выхода */}
      {onLogout && (
        <div className="mt-6">
          <Card className="border-red-200 rounded-2xl shadow-sm bg-white">
            <CardContent className="pt-6">
              <Button 
                onClick={onLogout}
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                style={{ fontWeight: '600' }}
              >
                <LogOut size={16} className="mr-2" />
                Выйти из аккаунта
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Avatar Crop Dialog */}
      <AvatarCropDialog
        open={cropDialogOpen}
        onClose={() => {
          setCropDialogOpen(false);
          // Сбрасываем файл инпут
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        imageSrc={imageToCrop}
        onCropComplete={async (croppedBlob) => {
          uploadAvatar(croppedBlob);
        }}
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MessageCircle, Instagram, Share2, Wallet, TrendingUp, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import * as api from '../utils/api';
import { toast } from 'sonner';

interface UserProfileViewProps {
  userId: string;
  onClose: () => void;
}

export function UserProfileView({ userId, onClose }: UserProfileViewProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
    // Блокируем скролл body при открытии модалки
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [userId]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      console.log('📋 UserProfileView: Loading profile for user:', userId);
      const response = await api.getUserProfile(userId);
      console.log('📋 UserProfileView: API response:', response);
      
      if (response.success) {
        console.log('✅ UserProfileView: Profile loaded:', response.user);
        console.log('📊 UserProfileView: Privacy settings:', response.user.privacySettings);
        setUser(response.user);
      } else {
        console.error('❌ UserProfileView: Failed to load profile:', response);
        toast.error('Не удалось загрузить профиль');
      }
    } catch (error) {
      console.error('❌ UserProfileView: Error loading profile:', error);
      toast.error('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#39B7FF] animate-spin" />
              <p className="text-[#666]">Загрузка профиля...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <Card className="w-full max-w-2xl mx-4" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <CardContent className="p-8 text-center">
            <p className="text-[#666] mb-4">Пользователь не найден</p>
            <Button onClick={onClose}>Закрыть</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const socialMedia = user.socialMedia || {};
  const privacy = user.privacySettings || {};

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <CardContent className="p-0">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl">
                {user.имя?.[0]?.toUpperCase() || '👤'}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{user.имя} {user.фамилия || ''}</h2>
                <p className="text-white/90 text-sm">Уровень {user.уровень} • Рефкод: {user.рефКод}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              {privacy.showBalance !== false && user.баланс !== undefined && (
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <Wallet className="w-6 h-6 text-[#39B7FF] mx-auto mb-2" />
                  <div className="font-bold text-[#39B7FF] text-xl">
                    {(user.баланс || 0).toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-xs text-[#666] mt-1">Баланс</div>
                </div>
              )}
              
              {privacy.showEarnings !== false && user.totalEarnings !== undefined && (
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-[#12C9B6] mx-auto mb-2" />
                  <div className="font-bold text-[#12C9B6] text-xl">
                    {(user.totalEarnings || 0).toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-xs text-[#666] mt-1">Заработано</div>
                </div>
              )}
              
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="font-bold text-purple-600 text-xl">
                  {user.teamSize || 0}
                </div>
                <div className="text-xs text-[#666] mt-1">Команда</div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="font-semibold text-[#1E1E1E] mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#39B7FF]" />
                Контактная информация
              </h3>
              
              <div className="space-y-3">
                {privacy.showPhone !== false && user.телефон && (
                  <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-[#39B7FF]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-[#666]">Телефон</div>
                      <div className="font-semibold text-[#1E1E1E]">{user.телефон}</div>
                    </div>
                    <a
                      href={`tel:${user.телефон}`}
                      className="text-[#39B7FF] hover:text-[#12C9B6] transition-colors"
                    >
                      Позвонить
                    </a>
                  </div>
                )}

                {privacy.showEmail !== false && user.email && (
                  <div className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-[#666]">Email</div>
                      <div className="font-semibold text-[#1E1E1E]">{user.email}</div>
                    </div>
                    <a
                      href={`mailto:${user.email}`}
                      className="text-[#39B7FF] hover:text-[#12C9B6] transition-colors"
                    >
                      Написать
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Social Media */}
            {(
              (privacy.showTelegram !== false && socialMedia.telegram) ||
              (privacy.showWhatsapp !== false && socialMedia.whatsapp) ||
              (privacy.showFacebook !== false && socialMedia.facebook) ||
              (privacy.showInstagram !== false && socialMedia.instagram) ||
              (privacy.showVk !== false && socialMedia.vk)
            ) && (
              <div>
                <h3 className="font-semibold text-[#1E1E1E] mb-3 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-[#39B7FF]" />
                  Социальные сети
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {privacy.showTelegram !== false && socialMedia.telegram && (
                    <a
                      href={`https://t.me/${socialMedia.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#666]">Telegram</div>
                        <div className="font-semibold text-[#1E1E1E] truncate">{socialMedia.telegram}</div>
                      </div>
                    </a>
                  )}

                  {privacy.showWhatsapp !== false && socialMedia.whatsapp && (
                    <a
                      href={`https://wa.me/${socialMedia.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#666]">WhatsApp</div>
                        <div className="font-semibold text-[#1E1E1E] truncate">{socialMedia.whatsapp}</div>
                      </div>
                    </a>
                  )}

                  {privacy.showFacebook !== false && socialMedia.facebook && (
                    <a
                      href={`https://facebook.com/${socialMedia.facebook.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#666]">Facebook</div>
                        <div className="font-semibold text-[#1E1E1E] truncate">{socialMedia.facebook}</div>
                      </div>
                    </a>
                  )}

                  {privacy.showInstagram !== false && socialMedia.instagram && (
                    <a
                      href={`https://instagram.com/${socialMedia.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg hover:bg-pink-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Instagram className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#666]">Instagram</div>
                        <div className="font-semibold text-[#1E1E1E] truncate">{socialMedia.instagram}</div>
                      </div>
                    </a>
                  )}

                  {privacy.showVk !== false && socialMedia.vk && (
                    <a
                      href={`https://vk.com/${socialMedia.vk}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-[#0077FF] rounded-lg flex items-center justify-center text-white font-bold">
                        VK
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#666]">ВКонтакте</div>
                        <div className="font-semibold text-[#1E1E1E] truncate">{socialMedia.vk}</div>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
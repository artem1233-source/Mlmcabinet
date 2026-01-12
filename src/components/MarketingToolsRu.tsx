import { useState, useRef } from 'react';
import { 
  Share2, Download as DownloadIcon, Copy, ExternalLink, Instagram, 
  MessageCircle, Mail, QrCode, FileText, Image as ImageIcon,
  Video, Layout, Sparkles, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import QRCodeStyling from 'qr-code-styling';

interface MarketingToolsRuProps {
  currentUser: any;
}

export function MarketingToolsRu({ currentUser }: MarketingToolsRuProps) {
  console.log('🔵 MarketingToolsRu: Rendering with currentUser:', currentUser);
  
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('визитки');
  const qrRef = useRef<HTMLDivElement>(null);

  // Генерируем реферальную ссылку
  const getReferralLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?ref=${currentUser?.реф_код || 'DEMO'}`;
  };

  // Генератор постов для соцсетей
  const socialPosts = [
    {
      id: 'wellness-1',
      category: 'Здоровье',
      platform: 'Instagram',
      icon: Instagram,
      title: '💧 Водородная вода для здоровья',
      text: `💧 Водородная вода — это не просто тренд!\n\n✨ Это научно доказанный способ:\n• Повысить энергию\n• Улучшить состояние кожи\n• Укрепить иммунитет\n• Замедлить старение\n\n🎁 Попробуйте и почувствуйте разницу!\n👉 Подробнее по ссылке в профиле\n\n#водороднаявода #здоровье #красота #энергия #wellness`,
      hashtags: '#водороднаявода #здоровье #красота #энергия #wellness'
    },
    {
      id: 'business-1',
      category: 'Бизнес',
      platform: 'Instagram',
      icon: MessageCircle,
      title: '💼 Бизнес возможность',
      text: `💼 Хотите дополнительный доход?

Наша команда развивается в сфере wellness и здоровья!

✅ Работа онлайн из любой точки мира
✅ Гибкий график
✅ Пассивный доход от структуры
✅ Обучение и поддержка 24/7

💰 Начните зарабатывать уже сегодня!
📱 Пишите в Direct для подробностей

#бизнесонлайн #дополнительныйдоход #wellness #млм #работаонлайн`,
      hashtags: '#бизнесонлайн #дополнительныйдоход #wellness #млм #работаонлайн'
    },
    {
      id: 'product-1',
      category: 'Продукт',
      platform: 'VK',
      icon: MessageCircle,
      title: '🎁 Новинка: H₂ порошок',
      text: `🎁 Встречайте новинку — H₂ водородный порошок!

Один пакетик = 1,5 литра водородной воды

⚡️ Преимущества:
→ Удобно брать с собой
→ Быстро растворяется
→ Высокая концентрация водорода
→ Приятный вкус

💝 Специальная цена для партнёров!

📲 Напишите мне, чтобы узнать подробности`,
      hashtags: ''
    },
    {
      id: 'testimonial-1',
      category: 'Отзыв',
      platform: 'Instagram',
      icon: Instagram,
      title: '⭐ Отзыв клиента',
      text: `⭐ "Пью водородную воду уже месяц!"

Результаты:
✓ Больше энергии по утрам
✓ Кожа стала чище
✓ Лучше сплю
✓ Меньше устаю на работе

Спасибо команде за качественный продукт! 💙

#отзывы #водороднаявода #результаты #здоровье`,
      hashtags: '#отзывы #водороднаявода #результаты #здоровье'
    }
  ];

  // Шаблоны сообщений
  const messageTemplates = [
    {
      id: 'invite-1',
      category: 'Приглашение',
      title: 'Приглашение в команду (тёплый контакт)',
      text: `Привет, {имя}! 👋

Помнишь, ты интересовался темой дополнительного дохода?

Я сейчас развиваю классный проект в wellness-индустрии. Команда растёт, результаты есть! 💪

Может быть интересно? Расскажу подробнее, если хочешь 😊`,
      variables: ['{имя}']
    },
    {
      id: 'invite-2',
      category: 'Приглашение',
      title: 'Приглашение в команду (холодный контакт)',
      text: `Здравствуйте! 👋

Меня зовут {ваше_имя}, я развиваю направление wellness и здоровья.

Ищу активных людей для расширения команды. Если интересна тема дополнительного дохода без отрыва от основной работы — давайте пообщаемся!

Что предлагаем:
✅ Обучение с нуля
✅ Качественные продукты
✅ Поддержка наставника
✅ Пассивный доход

Интересно узнать подробнее? 😊`,
      variables: ['{ваше_имя}']
    },
    {
      id: 'product-offer-1',
      category: 'Продажа',
      title: 'Предложение продукта',
      text: `Привет! 👋

Хочу поделиться крутой штукой — водородной водой!

Я сам пью уже 2 месяца и реально чувствую:
⚡️ Больше энергии
💆‍♀️ Лучше самочувствие
😴 Крепче сон

Хочешь попробовать? Могу рассказать подробнее и помочь с заказом! 💙`,
      variables: []
    },
    {
      id: 'follow-up-1',
      category: 'Дожим',
      title: 'Напоминание после первого контакта',
      text: `Привет, {имя}! 👋

Как настроение? Думал(а) над моим предложением?

Кстати, у нас сейчас акция для новых партнёров — отличное время начать! 🎁

Если есть вопросы — с радостью отвечу! 😊`,
      variables: ['{имя}']
    }
  ];

  // Библиотека материалов
  const marketingMaterials = [
    {
      category: 'визитки',
      title: 'Визитки',
      icon: QrCode,
      items: [
        { id: 'card-1', name: 'Визитка классическая', type: 'Генератор', description: 'С QR-кодом и контактами' },
        { id: 'card-2', name: 'Визитка минимализм', type: 'Генератор', description: 'Стильный дизайн' }
      ]
    },
    {
      category: 'баннеры',
      title: 'Баннеры',
      icon: Layout,
      items: [
        { id: 'banner-1', name: 'Баннер для Stories', type: 'PNG', size: '1080x1920', description: 'Instagram Stories формат' },
        { id: 'banner-2', name: 'Баннер для поста', type: 'PNG', size: '1080x1080', description: 'Квадратный формат' },
        { id: 'banner-3', name: 'Обложка ВКонтакте', type: 'PNG', size: '1590x400', description: 'Для сообщества VK' }
      ]
    },
    {
      category: 'презентации',
      title: 'Презентации',
      icon: FileText,
      items: [
        { id: 'pres-1', name: 'Продукт-презентация', type: 'PDF', pages: '12', description: 'О продукте H₂' },
        { id: 'pres-2', name: 'Бизнес-презентация', type: 'PDF', pages: '15', description: 'О бизнес-возможности' },
        { id: 'pres-3', name: 'Быстрая презентация', type: 'PDF', pages: '5', description: 'Краткая версия' }
      ]
    },
    {
      category: 'видео',
      title: 'Видеоматериалы',
      icon: Video,
      items: [
        { id: 'video-1', name: 'Видео о продукте', type: 'MP4', duration: '2:30', description: 'Краткий обзор' },
        { id: 'video-2', name: 'Видео-отзыв', type: 'MP4', duration: '1:45', description: 'Реальный клиент' },
        { id: 'video-3', name: 'Инструкция по применению', type: 'MP4', duration: '3:00', description: 'Как использовать' }
      ]
    }
  ];

  // Копирование текста
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Скопировано в буфер обмена!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Скачивание QR-кода
  const handleDownloadQR = async () => {
    try {
      const qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: getReferralLink(),
        image: undefined,
        dotsOptions: {
          color: "#39B7FF",
          type: "rounded"
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 10
        },
        cornersSquareOptions: {
          color: "#12C9B6",
          type: "extra-rounded"
        },
        cornersDotOptions: {
          color: "#12C9B6",
          type: "dot"
        }
      });

      qrCode.download({ name: "referral-qr", extension: "png" });
      toast.success('QR-код скачан!');
    } catch (error) {
      console.error('QR download error:', error);
      toast.error('Ошибка скачивания QR-кода');
    }
  };

  // Создание визитки
  const handleCreateBusinessCard = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Размеры визитки (стандарт 90x50 мм при 300 DPI)
    canvas.width = 1063;
    canvas.height = 591;

    // Фон с градиентом
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#39B7FF');
    gradient.addColorStop(1, '#12C9B6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Белая область для текста
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(50, 50, 700, 491);

    // Текст
    ctx.fillStyle = '#1E1E1E';
    ctx.font = 'bold 48px Arial';
    ctx.fillText(`${currentUser?.имя || ''} ${currentUser?.фамилия || ''}`, 80, 140);

    ctx.font = '32px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('Партнёр H₂ Platform', 80, 190);

    ctx.font = '28px Arial';
    ctx.fillStyle = '#1E1E1E';
    ctx.fillText(`Уровень: ${currentUser?.уровень || 1}`, 80, 260);
    ctx.fillText(`Реф. код: ${currentUser?.реф_код || 'DEMO'}`, 80, 310);

    if (currentUser?.телефон) {
      ctx.fillText(`📱 ${currentUser.телефон}`, 80, 370);
    }
    if (currentUser?.email) {
      ctx.fillText(`📧 ${currentUser.email}`, 80, 420);
    }

    // QR-код (заглушка - в реальности нужно использовать библиотеку)
    ctx.fillStyle = '#39B7FF';
    ctx.fillRect(800, 150, 200, 200);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR-код', 900, 260);

    // Скачивание
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'business-card.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Визитка скачана!');
      }
    });
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-[#1E1E1E]" style={{ fontSize: '24px', fontWeight: '700' }}>
            Маркетинговые инструменты
          </h1>
        </div>
        <p className="text-[#666]">Готовые материалы для продвижения вашего бизнеса</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="posts">
            <Instagram className="w-4 h-4 mr-2" />
            Посты
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageCircle className="w-4 h-4 mr-2" />
            Сообщения
          </TabsTrigger>
          <TabsTrigger value="materials">
            <Layout className="w-4 h-4 mr-2" />
            Материалы
          </TabsTrigger>
          <TabsTrigger value="links">
            <Share2 className="w-4 h-4 mr-2" />
            Ссылки
          </TabsTrigger>
        </TabsList>

        {/* Генератор постов */}
        <TabsContent value="posts" className="space-y-6">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-[#39B7FF]" />
                Готовые посты для соцсетей
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialPosts.map((post) => (
                <Card key={post.id} className="border-[#E6E9EE] hover:border-[#39B7FF] transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-lg flex items-center justify-center">
                          <post.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-[#1E1E1E] font-semibold">{post.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{post.category}</Badge>
                            <Badge variant="outline" className="text-xs">{post.platform}</Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                      >
                        {selectedPost?.id === post.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>

                    {selectedPost?.id === post.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="bg-gray-50 rounded-lg p-4 mb-3">
                          <pre className="whitespace-pre-wrap text-sm text-[#1E1E1E] font-sans">
                            {post.text}
                          </pre>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCopy(post.text, post.id)}
                            className="bg-[#39B7FF] hover:bg-[#2A9FEF]"
                          >
                            {copiedId === post.id ? (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Скопировано
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-2" />
                                Копировать
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(post.platform === 'Instagram' 
                              ? 'https://www.instagram.com/' 
                              : 'https://vk.com/', '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Открыть {post.platform}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Шаблоны сообщений */}
        <TabsContent value="messages" className="space-y-6">
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#39B7FF]" />
                Шаблоны сообщений
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messageTemplates.map((template) => (
                <Card key={template.id} className="border-[#E6E9EE] hover:border-[#39B7FF] transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-[#1E1E1E] font-semibold">{template.title}</h3>
                        <Badge variant="outline" className="text-xs mt-1">{template.category}</Badge>
                        {template.variables.length > 0 && (
                          <p className="text-xs text-[#666] mt-2">
                            Переменные: {template.variables.join(', ')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPost(selectedPost?.id === template.id ? null : template)}
                      >
                        {selectedPost?.id === template.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>

                    {selectedPost?.id === template.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="bg-gray-50 rounded-lg p-4 mb-3">
                          <pre className="whitespace-pre-wrap text-sm text-[#1E1E1E] font-sans">
                            {template.text.replace('{ваше_имя}', currentUser?.имя || 'Ваше имя')}
                          </pre>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCopy(template.text.replace('{ваше_имя}', currentUser?.имя || 'Ваше имя'), template.id)}
                          className="bg-[#39B7FF] hover:bg-[#2A9FEF]"
                        >
                          {copiedId === template.id ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Скопировано
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Копировать
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Библиотека материалов */}
        <TabsContent value="materials" className="space-y-6">
          {marketingMaterials.map((category) => (
            <Card key={category.category} className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
              <CardHeader className="cursor-pointer" onClick={() => 
                setExpandedCategory(expandedCategory === category.category ? null : category.category)
              }>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <category.icon className="w-5 h-5 text-[#39B7FF]" />
                    {category.title}
                  </div>
                  {expandedCategory === category.category ? (
                    <ChevronUp className="w-5 h-5 text-[#666]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#666]" />
                  )}
                </CardTitle>
              </CardHeader>
              
              {expandedCategory === category.category && (
                <CardContent className="space-y-3">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-[#E6E9EE] rounded-xl hover:border-[#39B7FF] transition-colors">
                      <div>
                        <h4 className="text-[#1E1E1E] font-semibold mb-1">{item.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                          {(item as any).size && (
                            <span className="text-xs text-[#666]">{(item as any).size}</span>
                          )}
                          {(item as any).pages && (
                            <span className="text-xs text-[#666]">{(item as any).pages} стр.</span>
                          )}
                          {(item as any).duration && (
                            <span className="text-xs text-[#666]">{(item as any).duration}</span>
                          )}
                        </div>
                        <p className="text-xs text-[#666] mt-1">{item.description}</p>
                      </div>
                      <div className="flex gap-2">
                        {category.category === 'визитки' && item.id === 'card-1' ? (
                          <Button
                            size="sm"
                            onClick={handleCreateBusinessCard}
                            className="bg-[#39B7FF] hover:bg-[#2A9FEF]"
                          >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Создать
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toast.info('Материал будет доступен в следующей версии')}
                          >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Скачать
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Реферальные ссылки */}
        <TabsContent value="links" className="space-y-6">
          {/* Реферальная ссылка */}
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#39B7FF]" />
                Ваша реферальная ссылка
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={getReferralLink()}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={() => handleCopy(getReferralLink(), 'ref-link')}
                  className="bg-[#39B7FF] hover:bg-[#2A9FEF]"
                >
                  {copiedId === 'ref-link' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Копировать
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-[#666] text-sm mb-2">Реферальный код</p>
                  <div className="bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-xl p-4">
                    <p className="text-white text-2xl font-bold tracking-wider">
                      {currentUser?.реф_код || 'DEMO'}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[#666] text-sm mb-2">Зарегистрировано по вашей ссылке</p>
                  <div className="bg-gradient-to-br from-[#12C9B6] to-[#39B7FF] rounded-xl p-4">
                    <p className="text-white text-2xl font-bold">
                      {currentUser?.команда?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR-код */}
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#39B7FF]" />
                QR-код для быстрой регистрации
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-[#39B7FF]">
                  <div ref={qrRef} className="w-64 h-64 flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-32 h-32 text-[#39B7FF] mx-auto mb-4" />
                      <p className="text-[#666] text-sm">
                        QR-код с вашей реферальной ссылкой
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadQR}
                  className="bg-[#39B7FF] hover:bg-[#2A9FEF]"
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Скачать QR-код
                </Button>
                <p className="text-xs text-[#666] text-center max-w-md">
                  Распечатайте QR-код и используйте на визитках, флаерах или в презентациях. 
                  При сканировании человек сразу попадёт на страницу регистрации с вашей реферальной ссылкой.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
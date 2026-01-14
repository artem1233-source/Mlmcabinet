import { BookOpen, Users, TrendingUp, Play, Droplet, Award, Plus, Edit2, Trash2, Save, X, FileText, Loader2, ArrowUp, ArrowDown, Video, Image as ImageIcon, File, Link as LinkIcon, Upload, Eye, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface TrainingRuProps {
  currentUser: any;
}

interface Material {
  id: string;
  type: 'video' | 'pdf' | 'image' | 'document';
  title: string;
  url: string;
  videoProvider?: 'youtube' | 'vimeo' | 'direct';
  fileSize?: number;
  uploadedAt?: string;
}

interface Lesson {
  id: string;
  title: string;
  materials: Material[];
}

export function TrainingRu({ currentUser }: TrainingRuProps) {
  // 🔐 Проверка прав администратора: CEO, admin email, или флаг isAdmin
  const isAdmin = currentUser?.isAdmin === true || 
                  currentUser?.email === 'admin@admin.com' || 
                  currentUser?.id === 'ceo' || 
                  currentUser?.id === '1';
  
  const [выбранныйУрок, setВыбранныйУрок] = useState<any>(null);
  const [курсы, setКурсы] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Material management
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);
  const [materialType, setMaterialType] = useState<'video' | 'file'>('video');
  const [videoUrl, setVideoUrl] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Material viewer
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  
  // Доступные иконки для курсов
  const availableIcons = [
    { name: 'Droplet', component: Droplet, label: 'Капля' },
    { name: 'Users', component: Users, label: 'Люди' },
    { name: 'Award', component: Award, label: 'Награда' },
    { name: 'BookOpen', component: BookOpen, label: 'Книга' },
    { name: 'TrendingUp', component: TrendingUp, label: 'Рост' },
    { name: 'Play', component: Play, label: 'Плей' },
    { name: 'FileText', component: FileText, label: 'Документ' }
  ];
  
  const [courseForm, setCourseForm] = useState({
    название: '',
    описание: '',
    icon: 'Droplet',
    длительность: '',
    цвет: '#39B7FF',
    уроки: [{ id: '', title: '', materials: [] as Material[] }] as Lesson[]
  });

  useEffect(() => {
    loadCourses();
  }, []);
  
  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await api.getCourses();
      if (data.success && data.courses) {
        setКурсы(data.courses);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Не удалось загрузить курсы');
    } finally {
      setLoading(false);
    }
  };
  
  const resetCourseForm = () => {
    setCourseForm({
      название: '',
      описание: '',
      icon: 'Droplet',
      длительность: '',
      цвет: '#39B7FF',
      уроки: [{ id: '', title: '', materials: [] }]
    });
  };
  
  const openEditCourse = (course: any) => {
    setEditingCourse(course);
    
    // Преобразуем старый формат уроков в новый
    const lessons = course.уроки?.map((урок: any, index: number) => {
      if (typeof урок === 'string') {
        return {
          id: `lesson_${index}`,
          title: урок,
          materials: []
        };
      }
      return {
        id: урок.id || `lesson_${index}`,
        title: урок.title || урок,
        materials: урок.materials || []
      };
    }) || [{ id: '', title: '', materials: [] }];
    
    setCourseForm({
      название: course.название || '',
      описание: course.описание || '',
      icon: course.iconName || 'Droplet',
      длительность: course.длительность || '',
      цвет: course.цвет || '#39B7FF',
      уроки: lessons
    });
    setShowCourseModal(true);
  };
  
  const handleCreateCourse = async () => {
    if (isSubmitting) return;
    
    if (!courseForm.название || !courseForm.описание) {
      toast.error('Заполните название и описание');
      return;
    }
    
    const validLessons = courseForm.уроки.filter(l => l.title.trim() !== '');
    if (validLessons.length === 0) {
      toast.error('Добавьте хотя бы один урок');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const data = await api.createCourse({
        ...courseForm,
        уроки: validLessons,
        модули: validLessons.length
      });
      
      if (data.success) {
        toast.success('Курс создан');
        setShowCourseModal(false);
        resetCourseForm();
        await loadCourses();
      } else {
        toast.error('Не удалось создать курс');
      }
    } catch (error) {
      console.error('Create course error:', error);
      toast.error('Ошибка создания курса');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdateCourse = async () => {
    if (!editingCourse || isSubmitting) return;
    
    if (!courseForm.название || !courseForm.описание) {
      toast.error('Заполните название и описание');
      return;
    }
    
    const validLessons = courseForm.уроки.filter(l => l.title.trim() !== '');
    if (validLessons.length === 0) {
      toast.error('Добавьте хотя бы один урок');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const data = await api.updateCourse(editingCourse.id, {
        ...courseForm,
        уроки: validLessons,
        модули: validLessons.length
      });
      
      if (data.success) {
        toast.success('Курс обновлён');
        setShowCourseModal(false);
        setEditingCourse(null);
        resetCourseForm();
        await loadCourses();
      } else {
        toast.error('Не удалось обновить курс');
      }
    } catch (error) {
      console.error('Update course error:', error);
      toast.error('Ошибка обновления курса');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteCourse = async (courseId: string) => {
    try {
      const data = await api.deleteCourse(courseId);
      if (data.success) {
        toast.success('Курс удалён');
        await loadCourses();
      } else {
        toast.error('Не удалось удалить курс');
      }
    } catch (error) {
      console.error('Delete course error:', error);
      toast.error('Ошибка удаления курса');
    }
  };
  
  const addLesson = () => {
    setCourseForm({ 
      ...courseForm, 
      уроки: [...courseForm.уроки, { id: `lesson_${Date.now()}`, title: '', materials: [] }] 
    });
  };
  
  const removeLesson = (index: number) => {
    const newУроки = courseForm.уроки.filter((_, i) => i !== index);
    setCourseForm({ 
      ...courseForm, 
      уроки: newУроки.length > 0 ? newУроки : [{ id: '', title: '', materials: [] }] 
    });
  };
  
  const updateLesson = (index: number, field: 'title', value: string) => {
    const newУроки = [...courseForm.уроки];
    newУроки[index][field] = value;
    setCourseForm({ ...courseForm, уроки: newУроки });
  };
  
  const moveLesson = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === courseForm.уроки.length - 1)
    ) {
      return;
    }
    
    const newУроки = [...courseForm.уроки];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newУроки[index], newУроки[newIndex]] = [newУроки[newIndex], newУроки[index]];
    setCourseForm({ ...courseForm, уроки: newУроки });
  };
  
  // Получить компонент иконки по имени
  const getIconComponent = (iconName: string) => {
    const iconObj = availableIcons.find(i => i.name === iconName);
    return iconObj ? iconObj.component : Droplet;
  };
  
  // ============= МАТЕРИАЛЫ =============
  
  const openMaterialModal = (lessonIndex: number) => {
    setCurrentLessonIndex(lessonIndex);
    setMaterialType('video');
    setVideoUrl('');
    setMaterialTitle('');
    setShowMaterialModal(true);
  };
  
  const extractVideoId = (url: string): { provider: 'youtube' | 'vimeo' | 'direct', id: string } | null => {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return { provider: 'youtube', id: youtubeMatch[1] };
    }
    
    // Vimeo
    const vimeoRegex = /vimeo\.com\/(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return { provider: 'vimeo', id: vimeoMatch[1] };
    }
    
    // Direct link
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return { provider: 'direct', id: url };
    }
    
    return null;
  };
  
  const addVideoMaterial = () => {
    if (!videoUrl.trim()) {
      toast.error('Введите ссылку на видео');
      return;
    }
    
    const videoInfo = extractVideoId(videoUrl);
    if (!videoInfo) {
      toast.error('Неподдерживаемый формат видео. Используйте YouTube, Vimeo или прямую ссылку на MP4');
      return;
    }
    
    const newMaterial: Material = {
      id: `material_${Date.now()}`,
      type: 'video',
      title: materialTitle.trim() || 'Видео урок',
      url: videoUrl,
      videoProvider: videoInfo.provider,
      uploadedAt: new Date().toISOString()
    };
    
    if (currentLessonIndex !== null) {
      const newУроки = [...courseForm.уроки];
      newУроки[currentLessonIndex].materials.push(newMaterial);
      setCourseForm({ ...courseForm, уроки: newУроки });
      
      setVideoUrl('');
      setMaterialTitle('');
      setShowMaterialModal(false);
      toast.success('Видео добавлено');
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Проверка размера (макс 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 50MB');
      return;
    }
    
    setUploadingFile(true);
    
    try {
      const result = await api.uploadCourseMaterial(file);
      
      if (result.success && result.url) {
        const fileType = file.type.includes('pdf') ? 'pdf' : 
                        file.type.includes('image') ? 'image' : 'document';
        
        const newMaterial: Material = {
          id: `material_${Date.now()}`,
          type: fileType,
          title: materialTitle.trim() || file.name,
          url: result.url,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        };
        
        if (currentLessonIndex !== null) {
          const newУроки = [...courseForm.уроки];
          newУроки[currentLessonIndex].materials.push(newMaterial);
          setCourseForm({ ...courseForm, уроки: newУроки });
          
          setMaterialTitle('');
          setShowMaterialModal(false);
          toast.success('Файл загружен');
        }
      } else {
        toast.error('Ошибка загрузки файла');
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Не удалось загрузить файл');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const removeMaterial = (lessonIndex: number, materialId: string) => {
    const newУроки = [...courseForm.уроки];
    newУроки[lessonIndex].materials = newУроки[lessonIndex].materials.filter(m => m.id !== materialId);
    setCourseForm({ ...courseForm, уроки: newУроки });
    toast.success('Материал удалён');
  };
  
  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'pdf': return FileText;
      case 'image': return ImageIcon;
      default: return File;
    }
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };
  
  const getEmbedUrl = (material: Material): string => {
    if (material.type !== 'video') return material.url;
    
    if (material.videoProvider === 'youtube') {
      const videoId = extractVideoId(material.url)?.id;
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    if (material.videoProvider === 'vimeo') {
      const videoId = extractVideoId(material.url)?.id;
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    return material.url;
  };
  
  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-full overflow-x-hidden flex items-center justify-center min-h-screen" style={{ backgroundColor: '#F7FAFC' }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#39B7FF]" />
      </div>
    );
  }
  
  return (
    <div className="p-4 lg:p-8 max-w-full overflow-x-hidden" style={{ backgroundColor: '#F7FAFC' }}>
      <div className="flex items-start justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-[#1E1E1E] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
            Обучение и ресурсы
          </h1>
          <p className="text-[#666]">
            Академия знаний для развития вашего бизнеса
          </p>
        </div>
        
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingCourse(null);
              resetCourseForm();
              setShowCourseModal(true);
            }}
            className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить курс
          </Button>
        )}
      </div>
      
      <Card className="border-0 rounded-2xl shadow-sm mb-6 lg:mb-8 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6]">
        <CardContent className="p-6 lg:p-8">
          <h2 className="text-white mb-3" style={{ fontSize: '20px', fontWeight: '700' }}>
            Добро пожаловать в академию H��
          </h2>
          <p className="text-white/90 mb-6 max-w-3xl">
            Инвестируйте в свой успех. Наша комплексная программа обучения поможет вам освоить знания о продуктах, 
            техниках продаж и стратегиях построения команды.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white/80 text-sm">Всего курсов</div>
              <div className="text-white mt-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                {курсы.length}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white/80 text-sm">Всего модулей</div>
              <div className="text-white mt-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                {курсы.reduce((sum, c) => sum + (c.модули || 0), 0)}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white/80 text-sm">Общая длительность</div>
              <div className="text-white mt-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                {курсы.reduce((sum, c) => {
                  const duration = parseInt(c.длительность) || 0;
                  return sum + duration;
                }, 0)} мин
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 lg:gap-6 mb-8">
        {курсы.length === 0 ? (
          <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-[#666] mb-4">Пока нет курсв</p>
              {isAdmin && (
                <Button
                  onClick={() => {
                    setEditingCourse(null);
                    resetCourseForm();
                    setShowCourseModal(true);
                  }}
                  className="bg-[#39B7FF]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать первый курс
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          курсы.map((курс) => {
            const Icon = getIconComponent(курс.iconName || 'Droplet');
            
            return (
              <Card key={курс.id} className="border-[#E6E9EE] rounded-2xl shadow-sm hover:shadow-md transition-all bg-white">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div 
                      className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: курс.цвет + '20' }}
                    >
                      <Icon size={28} style={{ color: курс.цвет }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[#1E1E1E] mb-2" style={{ fontSize: '18px', fontWeight: '700' }}>
                        {курс.название}
                      </h3>
                      <p className="text-[#666] text-sm mb-4 line-clamp-2">
                        {курс.описание}
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-[#666]">
                          <Play size={16} />
                          <span>{курс.модули || 0} модулей</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#666]">
                          <BookOpen size={16} />
                          <span>{курс.длительность}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button 
                        className="bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
                        style={{ fontWeight: '600' }}
                        onClick={() => setВыбранныйУрок(курс)}
                      >
                        <Play size={16} className="mr-2" />
                        Начать курс
                      </Button>
                      
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="border-amber-500 text-amber-600 hover:bg-amber-50"
                            onClick={() => openEditCourse(курс)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Удалить курс "${курс.название}"?`)) {
                                handleDeleteCourse(курс.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E]">Дополнительные ресурсы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#39B7FF] transition-all cursor-pointer">
              <div className="text-[#1E1E1E] mb-2" style={{ fontWeight: '600', fontSize: '16px' }}>
                Каталог товаров
              </div>
              <p className="text-[#666] text-sm">
                Скачайте полный каталог товаров с ценами и характеристиками.
              </p>
            </div>
            
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#39B7FF] transition-all cursor-pointer">
              <div className="text-[#1E1E1E] mb-2" style={{ fontWeight: '600', fontSize: '16px' }}>
                Маркетинговые материалы
              </div>
              <p className="text-[#666] text-sm">
                Доступ к логотипам, баннерам и рекламному контенту.
              </p>
            </div>
            
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#39B7FF] transition-all cursor-pointer">
              <div className="text-[#1E1E1E] mb-2" style={{ fontWeight: '600', fontSize: '16px' }}>
                FAQ и поддержка
              </div>
              <p className="text-[#666] text-sm">
                Найдите ответы на часто задаваемые вопросы.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Course Viewer Dialog */}
      <Dialog open={!!выбранныйУрок} onOpenChange={() => setВыбранныйУрок(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1E1E1E] flex items-center gap-3">
              {выбранныйУрок && (() => {
                const Icon = getIconComponent(выбранныйУрок.iconName || 'Droplet');
                return (
                  <>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: выбранныйУрок.цвет + '20' }}
                    >
                      <Icon size={20} style={{ color: выбранныйУрок.цвет }} />
                    </div>
                    {выбранныйУрок.название}
                  </>
                );
              })()}
            </DialogTitle>
            <DialogDescription>
              Изучите модули курса и материалы для развития вашего бизнеса.
            </DialogDescription>
          </DialogHeader>
          
          {выбранныйУрок && (
            <div className="space-y-4">
              <p className="text-[#666]">{выбранныйУрок.описание}</p>
              
              <div>
                <h3 className="text-[#1E1E1E] mb-3" style={{ fontWeight: '600' }}>Модули курса:</h3>
                <div className="space-y-3">
                  {выбранныйУрок.уроки?.map((урок: any, index: number) => {
                    const lessonTitle = typeof урок === 'string' ? урок : урок.title;
                    const materials = typeof урок === 'object' ? урок.materials || [] : [];
                    
                    return (
                      <div key={index} className="border border-[#E6E9EE] rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 p-4 bg-[#F7FAFC]">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: выбранныйУрок.цвет + '20' }}
                          >
                            <span style={{ color: выбранныйУрок.цвет, fontWeight: '700' }}>
                              {index + 1}
                            </span>
                          </div>
                          <span className="text-[#1E1E1E] flex-1" style={{ fontWeight: '500' }}>
                            {lessonTitle}
                          </span>
                          {materials.length > 0 && (
                            <span className="text-xs text-[#666] bg-white px-2 py-1 rounded-full">
                              {materials.length} материал{materials.length > 1 ? 'а' : ''}
                            </span>
                          )}
                        </div>
                        
                        {materials.length > 0 && (
                          <div className="p-4 space-y-2">
                            {materials.map((material: Material) => {
                              const MaterialIcon = getMaterialIcon(material.type);
                              return (
                                <div 
                                  key={material.id}
                                  className="flex items-center gap-3 p-3 bg-white border border-[#E6E9EE] rounded-lg hover:border-[#39B7FF] transition-all cursor-pointer"
                                  onClick={() => setViewingMaterial(material)}
                                >
                                  <MaterialIcon size={20} className="text-[#39B7FF]" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-[#1E1E1E] truncate">
                                      {material.title}
                                    </div>
                                    {material.fileSize && (
                                      <div className="text-xs text-[#666]">
                                        {formatFileSize(material.fileSize)}
                                      </div>
                                    )}
                                  </div>
                                  <Eye size={16} className="text-[#666]" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Material Viewer Dialog */}
      <Dialog open={!!viewingMaterial} onOpenChange={() => setViewingMaterial(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingMaterial?.title}</DialogTitle>
            <DialogDescription>
              Просмотр учебного материала
            </DialogDescription>
          </DialogHeader>
          
          {viewingMaterial && (
            <div className="space-y-4">
              {viewingMaterial.type === 'video' && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={getEmbedUrl(viewingMaterial)}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}
              
              {viewingMaterial.type === 'image' && (
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src={viewingMaterial.url} 
                    alt={viewingMaterial.title}
                    className="w-full h-auto"
                  />
                </div>
              )}
              
              {viewingMaterial.type === 'pdf' && (
                <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src={viewingMaterial.url}
                    className="w-full h-full"
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  asChild
                  className="bg-[#39B7FF]"
                >
                  <a href={viewingMaterial.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Открыть в новой вкладке
                  </a>
                </Button>
                
                {viewingMaterial.type !== 'video' && (
                  <Button
                    asChild
                    variant="outline"
                  >
                    <a href={viewingMaterial.url} download>
                      <Download className="w-4 h-4 mr-2" />
                      Скачать
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Admin Course Modal */}
      {isAdmin && (
        <Dialog open={showCourseModal} onOpenChange={(open) => {
          setShowCourseModal(open);
          if (!open) {
            setEditingCourse(null);
            resetCourseForm();
            setIsSubmitting(false);
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? 'Редактировать курс' : 'Создать курс'}
              </DialogTitle>
              <DialogDescription>
                {editingCourse 
                  ? 'Измените параметры курса обучения' 
                  : 'Добавьте новый курс в академию обучения'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Название */}
              <div>
                <Label>Название курса *</Label>
                <Input
                  value={courseForm.название}
                  onChange={(e) => setCourseForm({ ...courseForm, название: e.target.value })}
                  placeholder="Например: Что такое водород"
                />
              </div>
              
              {/* Описание */}
              <div>
                <Label>Описание курса *</Label>
                <Textarea
                  value={courseForm.описание}
                  onChange={(e) => setCourseForm({ ...courseForm, описание: e.target.value })}
                  placeholder="Краткое описание курса и его пользы"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Иконка */}
                <div>
                  <Label>Иконка</Label>
                  <select
                    value={courseForm.icon}
                    onChange={(e) => setCourseForm({ ...courseForm, icon: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {availableIcons.map(icon => (
                      <option key={icon.name} value={icon.name}>{icon.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Длительность */}
                <div>
                  <Label>Длительность</Label>
                  <Input
                    value={courseForm.длительность}
                    onChange={(e) => setCourseForm({ ...courseForm, длительность: e.target.value })}
                    placeholder="45 мин"
                  />
                </div>
                
                {/* Цвет */}
                <div>
                  <Label>Цвет акцента</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={courseForm.цвет}
                      onChange={(e) => setCourseForm({ ...courseForm, цвет: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={courseForm.цвет}
                      onChange={(e) => setCourseForm({ ...courseForm, цвет: e.target.value })}
                      placeholder="#39B7FF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              {/* Уроки */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Уроки курса *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addLesson}
                    className="text-[#39B7FF] border-[#39B7FF]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить урок
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {courseForm.уроки.map((урок, index) => (
                    <div key={index} className="border border-[#E6E9EE] rounded-xl p-4 space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center bg-[#F7FAFC] rounded-lg">
                          <span className="text-[#666] font-semibold">{index + 1}</span>
                        </div>
                        <Input
                          value={урок.title}
                          onChange={(e) => updateLesson(index, 'title', e.target.value)}
                          placeholder={`Название урока ${index + 1}`}
                          className="flex-1"
                        />
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => moveLesson(index, 'up')}
                            disabled={index === 0}
                            className="px-2"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => moveLesson(index, 'down')}
                            disabled={index === courseForm.уроки.length - 1}
                            className="px-2"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeLesson(index)}
                            disabled={courseForm.уроки.length === 1}
                            className="border-red-300 text-red-600 hover:bg-red-50 px-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Materials */}
                      <div className="pl-10">
                        {урок.materials.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {урок.materials.map((material) => {
                              const MaterialIcon = getMaterialIcon(material.type);
                              return (
                                <div 
                                  key={material.id}
                                  className="flex items-center gap-2 p-2 bg-[#F7FAFC] rounded-lg text-sm"
                                >
                                  <MaterialIcon size={16} className="text-[#39B7FF]" />
                                  <span className="flex-1 truncate">{material.title}</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeMaterial(index, material.id)}
                                    className="h-6 w-6 p-0 text-red-500"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openMaterialModal(index)}
                          className="w-full border-dashed"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Добавить материал
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#666] mt-2">
                  Всего модулей: {courseForm.уроки.filter(u => u.title.trim() !== '').length}
                </p>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="button"
                  onClick={editingCourse ? handleUpdateCourse : handleCreateCourse}
                  className="bg-[#39B7FF]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSubmitting ? 'Сохранение...' : (editingCourse ? 'Сохранить' : 'Создать')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCourseModal(false);
                    setEditingCourse(null);
                    resetCourseForm();
                  }}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Add Material Modal */}
      {isAdmin && (
        <Dialog open={showMaterialModal} onOpenChange={setShowMaterialModal}>
          <DialogContent className="max-w-2xl" aria-describedby="add-material-description">
            <DialogHeader>
              <DialogTitle>Добавить материал к уроку</DialogTitle>
              <DialogDescription id="add-material-description">
                Загрузите видео, PDF, изображения или другие файлы
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={materialType} onValueChange={(v) => setMaterialType(v as 'video' | 'file')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="video">
                  <Video className="w-4 h-4 mr-2" />
                  Видео
                </TabsTrigger>
                <TabsTrigger value="file">
                  <Upload className="w-4 h-4 mr-2" />
                  Загрузить файл
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="video" className="space-y-4">
                <div>
                  <Label>Название материала</Label>
                  <Input
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Например: Введение в курс"
                  />
                </div>
                
                <div>
                  <Label>Ссылка на видео</Label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... или https://vimeo.com/..."
                  />
                  <p className="text-xs text-[#666] mt-1">
                    Поддерживается: YouTube, Vimeo, прямые ссылки на MP4
                  </p>
                </div>
                
                <Button
                  onClick={addVideoMaterial}
                  className="w-full bg-[#39B7FF]"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Добавить видео
                </Button>
              </TabsContent>
              
              <TabsContent value="file" className="space-y-4">
                <div>
                  <Label>Название материала</Label>
                  <Input
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Например: Презентация курса"
                  />
                </div>
                
                <div>
                  <Label>Выберите файл</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.webm"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    disabled={uploadingFile}
                  />
                  <p className="text-xs text-[#666] mt-1">
                    PDF, изображения, документы (макс. 50MB)
                  </p>
                </div>
                
                {uploadingFile && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-[#F7FAFC] rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin text-[#39B7FF]" />
                    <span className="text-[#666]">Загрузка файла...</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
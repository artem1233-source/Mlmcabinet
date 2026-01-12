import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Download as DownloadIcon, Star } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner@2.0.3';

interface TestItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'pass' | 'fail' | 'skip';
  rating?: number;
  notes?: string;
}

interface VariantEvaluation {
  variant: string;
  simplicity: number;
  visual: number;
  speed: number;
  functionality: number;
  forPartners: number;
}

export function InteractiveTestPanel() {
  const [adminTests, setAdminTests] = useState<TestItem[]>([
    // Шаг 1: Вход
    {
      id: 'admin-1',
      category: 'Вход в админку',
      title: 'Открытие админ-панели',
      description: 'Клик на кнопку "H2 Admin" 👑 открывает админ-панель',
      status: 'pending',
    },
    
    // Шаг 2: Роли
    {
      id: 'admin-2-1',
      category: 'Переключение ролей',
      title: '👑 Владелец',
      description: 'Дашборд владельца открывается, меню обновляется',
      status: 'pending',
      rating: 0,
    },
    {
      id: 'admin-2-2',
      category: 'Переключение ролей',
      title: '⚙️ Администрирование',
      description: 'Дашборд AdminOps с таблицей партнёров',
      status: 'pending',
      rating: 0,
    },
    {
      id: 'admin-2-3',
      category: 'Переключение ролей',
      title: '💰 Финансы',
      description: 'Дашборд Finance с выплатами',
      status: 'pending',
      rating: 0,
    },
    {
      id: 'admin-2-4',
      category: 'Переключение ролей',
      title: '📦 Склад',
      description: 'Дашборд Warehouse с заказами',
      status: 'pending',
      rating: 0,
    },
    {
      id: 'admin-2-5',
      category: 'Переключение ролей',
      title: '📊 Маркетинг',
      description: 'Дашборд Marketing с аналитикой',
      status: 'pending',
      rating: 0,
    },
    {
      id: 'admin-2-6',
      category: 'Переключение ролей',
      title: '💬 Поддержка',
      description: 'Дашборд Support с тикетами',
      status: 'pending',
      rating: 0,
    },
    {
      id: 'admin-2-7',
      category: 'Переключение ролей',
      title: '👤 Партнёр',
      description: 'Партнёрский кабинет в режиме просмотра',
      status: 'pending',
      rating: 0,
    },
    
    // Шаг 3: Режим инспекции
    {
      id: 'admin-3-1',
      category: 'Режим инспекции',
      title: 'Показать все разделы',
      description: 'Все разделы отображаются, недоступные серые с 🔒',
      status: 'pending',
    },
    {
      id: 'admin-3-2',
      category: 'Режим инспекции',
      title: 'Баннер инспекции',
      description: 'Жёлтый баннер "Режим инспекции" в Sidebar',
      status: 'pending',
    },
    
    // Шаг 4: Навигация
    {
      id: 'admin-4',
      category: 'Навигация',
      title: 'Все разделы открываются',
      description: 'Все 10 разделов открываются без ошибок',
      status: 'pending',
    },
    
    // Шаг 5: UI компоненты
    {
      id: 'admin-5-1',
      category: 'UI компоненты',
      title: 'PeriodSelector',
      description: 'Переключение периодов работает, показываются toast',
      status: 'pending',
    },
    {
      id: 'admin-5-2',
      category: 'UI компоненты',
      title: 'Глобальный поиск',
      description: 'Поиск открывается, dropdown работает',
      status: 'pending',
    },
    {
      id: 'admin-5-3',
      category: 'UI компоненты',
      title: 'Кнопки действий',
      description: 'Обновить, Экспорт, Настройки показывают toast',
      status: 'pending',
    },
    
    // Шаг 6: Дашборды
    {
      id: 'admin-6-1',
      category: 'Дашборды',
      title: 'Owner Dashboard',
      description: '4 KPI, 2 графика, ТОП-5 веток, центр действий, 6 ссылок',
      status: 'pending',
    },
    {
      id: 'admin-6-2',
      category: 'Дашборды',
      title: 'AdminOps Dashboard',
      description: '4 KPI, поиск, фильтры, таблица с PII, чекбоксы',
      status: 'pending',
    },
  ]);

  const [variantTests, setVariantTests] = useState<VariantEvaluation[]>([
    { variant: 'Вариант 1: Детальный', simplicity: 0, visual: 0, speed: 0, functionality: 0, forPartners: 0 },
    { variant: 'Вариант 2: Графики', simplicity: 0, visual: 0, speed: 0, functionality: 0, forPartners: 0 },
    { variant: 'Вариант 3: Канбан', simplicity: 0, visual: 0, speed: 0, functionality: 0, forPartners: 0 },
    { variant: 'Вариант 4: Массовые', simplicity: 0, visual: 0, speed: 0, functionality: 0, forPartners: 0 },
    { variant: 'Вариант 5: Быстрый', simplicity: 0, visual: 0, speed: 0, functionality: 0, forPartners: 0 },
  ]);

  const [bugs, setBugs] = useState<{ priority: string; description: string }[]>([]);
  const [newBug, setNewBug] = useState({ priority: 'medium', description: '' });

  const updateTestStatus = (id: string, status: 'pass' | 'fail' | 'skip') => {
    setAdminTests(prev => prev.map(test => 
      test.id === id ? { ...test, status } : test
    ));
    
    const statusText = status === 'pass' ? '✅ Пройден' : status === 'fail' ? '❌ Провален' : '⏭️ Пропущен';
    toast.success(`Тест обновлён: ${statusText}`);
  };

  const updateRating = (id: string, rating: number) => {
    setAdminTests(prev => prev.map(test => 
      test.id === id ? { ...test, rating } : test
    ));
  };

  const updateVariantRating = (index: number, field: keyof Omit<VariantEvaluation, 'variant'>, value: number) => {
    setVariantTests(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const addBug = () => {
    if (newBug.description.trim()) {
      setBugs([...bugs, newBug]);
      setNewBug({ priority: 'medium', description: '' });
      toast.success('Баг добавлен');
    }
  };

  const generateReport = () => {
    const passed = adminTests.filter(t => t.status === 'pass').length;
    const failed = adminTests.filter(t => t.status === 'fail').length;
    const total = adminTests.length;
    const percentage = Math.round((passed / total) * 100);

    const variantScores = variantTests.map(v => ({
      variant: v.variant,
      total: v.simplicity + v.visual + v.speed + v.functionality + v.forPartners,
    }));

    const bestVariant = variantScores.reduce((best, current) => 
      current.total > best.total ? current : best
    );

    const report = `
# 📊 Отчёт о тестировании H2 Platform

**Дата**: ${new Date().toLocaleDateString('ru-RU')}

## ✅ Админ-панель H2

**Пройдено**: ${passed}/${total} тестов (${percentage}%)
**Провалено**: ${failed}
**Статус**: ${percentage >= 80 ? '✅ Готово к использованию' : percentage >= 50 ? '⚠️ Требуются исправления' : '❌ Критические проблемы'}

### Детали по категориям:
${Array.from(new Set(adminTests.map(t => t.category))).map(cat => {
  const tests = adminTests.filter(t => t.category === cat);
  const catPassed = tests.filter(t => t.status === 'pass').length;
  return `- ${cat}: ${catPassed}/${tests.length}`;
}).join('\n')}

## 📦 Варианты экрана Заказов

**Рейтинг вариантов** (из 25 баллов):
${variantScores.map((v, i) => `${i + 1}. ${v.variant}: ${v.total}/25`).join('\n')}

**🏆 Рекомендуемый вариант**: ${bestVariant.variant} (${bestVariant.total} баллов)

## 🐛 Обнаруженные баги

**Всего**: ${bugs.length}
${bugs.length > 0 ? bugs.map((b, i) => `${i + 1}. [${b.priority.toUpperCase()}] ${b.description}`).join('\n') : '- Баги не обнаружены'}

## 🎯 Следующие шаги

1. ${failed > 0 ? `Исправить ${failed} провалившихся тестов` : 'Реализовать выбранный вариант заказов'}
2. Подключить реальные данные к админ-панели
3. Завершить OrderDetailsDrawer
4. Добавить экспорт данных (CSV)

---

**Готовность к production**: ${percentage >= 80 ? '✅ ДА' : '❌ НЕТ'} (${percentage}%)
`;

    // Копируем в буфер обмена
    navigator.clipboard.writeText(report);
    toast.success('📋 Отчёт скопирован в буфер обмена!');
  };

  const groupedTests = Array.from(new Set(adminTests.map(t => t.category))).map(category => ({
    category,
    tests: adminTests.filter(t => t.category === category),
  }));

  const totalPassed = adminTests.filter(t => t.status === 'pass').length;
  const totalFailed = adminTests.filter(t => t.status === 'fail').length;
  const totalTests = adminTests.length;
  const percentage = Math.round((totalPassed / totalTests) * 100);

  const variantScores = variantTests.map(v => ({
    ...v,
    total: v.simplicity + v.visual + v.speed + v.functionality + v.forPartners,
  }));

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧪 Интерактивное тестирование</h1>
          <p className="text-gray-600 mt-1">Протестируйте админ-панель и варианты заказов</p>
        </div>
        <Button onClick={generateReport} className="gap-2">
          <DownloadIcon className="w-4 h-4" />
          Сгенерировать отчёт
        </Button>
      </div>

      {/* Прогресс */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Общий прогресс</h3>
            <p className="text-sm text-gray-600">Админ-панель H2 Platform</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{percentage}%</div>
            <div className="text-sm text-gray-600">{totalPassed}/{totalTests} тестов</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Пройдено: {totalPassed}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span>Провалено: {totalFailed}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <span>Ожидает: {totalTests - totalPassed - totalFailed}</span>
          </div>
        </div>
      </Card>

      {/* Тесты админ-панели */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Часть 1: Админ-панель</h2>
        <div className="space-y-4">
          {groupedTests.map((group) => (
            <Card key={group.category} className="p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{group.category}</h3>
              <div className="space-y-3">
                {group.tests.map((test) => (
                  <div 
                    key={test.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      test.status === 'pass' ? 'border-green-300 bg-green-50' :
                      test.status === 'fail' ? 'border-red-300 bg-red-50' :
                      test.status === 'skip' ? 'border-gray-300 bg-gray-50' :
                      'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{test.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{test.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={test.status === 'pass' ? 'default' : 'outline'}
                          onClick={() => updateTestStatus(test.id, 'pass')}
                          className={test.status === 'pass' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={test.status === 'fail' ? 'default' : 'outline'}
                          onClick={() => updateTestStatus(test.id, 'fail')}
                          className={test.status === 'fail' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={test.status === 'skip' ? 'default' : 'outline'}
                          onClick={() => updateTestStatus(test.id, 'skip')}
                          className={test.status === 'skip' ? 'bg-gray-600 hover:bg-gray-700' : ''}
                        >
                          ⏭️
                        </Button>
                      </div>
                    </div>
                    
                    {test.rating !== undefined && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm text-gray-700 mb-2">Оценка (1-5):</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => updateRating(test.id, star)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= (test.rating || 0) 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Оценка вариантов */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📦 Часть 2: Варианты экрана Заказов</h2>
        <Card className="p-6">
          <div className="space-y-6">
            {variantTests.map((variant, index) => {
              const score = variantScores[index];
              return (
                <div key={variant.variant} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-gray-900">{variant.variant}</h3>
                    <Badge variant={score.total >= 20 ? 'default' : 'secondary'}>
                      {score.total}/25 баллов
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-4">
                    {[
                      { key: 'simplicity', label: 'Простота' },
                      { key: 'visual', label: 'Визуал' },
                      { key: 'speed', label: 'Скорость' },
                      { key: 'functionality', label: 'Функционал' },
                      { key: 'forPartners', label: 'Для партнёров' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <div className="text-sm text-gray-700 mb-2">{label}</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => updateVariantRating(index, key as keyof Omit<VariantEvaluation, 'variant'>, star)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  star <= variant[key as keyof Omit<VariantEvaluation, 'variant'>]
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Рекомендация */}
          {variantScores.some(v => v.total > 0) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">🏆 Рекомендация:</h4>
              <div className="text-gray-700">
                {variantScores.reduce((best, current) => current.total > best.total ? current : best).variant}
                {' '}
                ({variantScores.reduce((best, current) => current.total > best.total ? current : best).total} баллов)
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Баги */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🐛 Обнаруженные баги</h2>
        <Card className="p-6">
          <div className="flex gap-4 mb-4">
            <select
              value={newBug.priority}
              onChange={(e) => setNewBug({ ...newBug, priority: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="critical">🔴 Критический</option>
              <option value="high">🟠 Высокий</option>
              <option value="medium">🟡 Средний</option>
              <option value="low">🟢 Низкий</option>
            </select>
            <input
              type="text"
              value={newBug.description}
              onChange={(e) => setNewBug({ ...newBug, description: e.target.value })}
              placeholder="Описание бага..."
              className="flex-1 border border-gray-300 rounded px-3 py-2"
              onKeyPress={(e) => e.key === 'Enter' && addBug()}
            />
            <Button onClick={addBug}>Добавить</Button>
          </div>
          
          {bugs.length > 0 ? (
            <div className="space-y-2">
              {bugs.map((bug, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                  <Badge 
                    variant={
                      bug.priority === 'critical' ? 'destructive' :
                      bug.priority === 'high' ? 'default' :
                      'secondary'
                    }
                  >
                    {bug.priority}
                  </Badge>
                  <div className="flex-1 text-gray-700">{bug.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Баги не обнаружены 🎉
            </div>
          )}
        </Card>
      </div>

      {/* Итоговый статус */}
      <Card className={`p-6 ${percentage >= 80 ? 'bg-green-50' : percentage >= 50 ? 'bg-yellow-50' : 'bg-red-50'}`}>
        <h3 className="text-xl font-bold mb-2">
          {percentage >= 80 ? '✅ Готово к использованию!' : percentage >= 50 ? '⚠️ Требуются исправления' : '❌ Критические проблемы'}
        </h3>
        <p className="text-gray-700">
          {percentage >= 80 
            ? 'Админ-панель прошла все основные тесты. Можно приступать к интеграции с реальными данными.'
            : percentage >= 50
            ? 'Большинство функций работают, но есть проблемы, которые нужно исправить.'
            : 'Обнаружены критические проблемы. Необходимо исправить провалившиеся тесты перед продолжением.'}
        </p>
      </Card>
    </div>
  );
}

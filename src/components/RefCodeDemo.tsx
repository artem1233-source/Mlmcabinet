import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, Users, Link2 } from 'lucide-react';

export function RefCodeDemo() {
  return (
    <div className="min-h-screen bg-[#F7FAFC] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-[#1E1E1E] mb-2">
            Читаемые Реферальные Коды
          </h1>
          <p className="text-[#666]">
            Новая система генерации реф-кодов на основе имени партнера
          </p>
        </div>

        {/* Что изменилось */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Что изменилось
            </CardTitle>
            <CardDescription>
              Обновления в системе регистрации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-semibold text-red-800 mb-2">❌ Раньше</p>
                <code className="text-sm bg-white px-2 py-1 rounded block">
                  рефКод: "000001"
                </code>
                <p className="text-xs text-red-600 mt-2">
                  Просто ID пользователя
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-green-800 mb-2">✅ Теперь</p>
                <code className="text-sm bg-white px-2 py-1 rounded block">
                  рефКод: "IVAN-2847"
                </code>
                <p className="text-xs text-green-600 mt-2">
                  Читаемый код на основе имени
                </p>
              </div>
            </div>

            <div className="bg-[#39B7FF]/10 p-4 rounded-lg border border-[#39B7FF]/20">
              <p className="text-sm font-semibold text-[#1E1E1E] mb-2">
                Формат нового реф-кода:
              </p>
              <ul className="text-sm text-[#666] space-y-1 ml-4 list-disc">
                <li>Первые 4-5 букв имени (транслитерация)</li>
                <li>Первая буква фамилии (если есть)</li>
                <li>Уникальный числовой суффикс (4 цифры)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Примеры */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#39B7FF]" />
              Примеры реф-кодов
            </CardTitle>
            <CardDescription>
              Как генерируются коды для разных имен
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Иван', surname: 'Петров', code: 'IVANP-1234' },
                { name: 'Мария', surname: 'Сидорова', code: 'MARIS-5678' },
                { name: 'Александр', surname: 'Козлов', code: 'ALEKS-9012' },
                { name: 'Елена', surname: '', code: 'ELEN-3456' },
                { name: 'Дмитрий', surname: 'Смирнов', code: 'DMITR-7890' },
              ].map((example, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#39B7FF]/10 rounded-full flex items-center justify-center">
                      <span className="text-[#39B7FF] font-semibold">
                        {example.name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1E1E1E]">
                        {example.name} {example.surname}
                      </p>
                      <p className="text-xs text-[#666]">
                        Партнер #{idx + 1}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-[#12C9B6]/10 border-[#12C9B6]/20 text-[#12C9B6]">
                    {example.code}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Обратная совместимость */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[#12C9B6]" />
              Обратная совместимость
            </CardTitle>
            <CardDescription>
              Старые реф-коды продолжают работать
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                ✅ Система поддерживает оба формата
              </p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                <li>Старые числовые коды (000001, 000002) работают</li>
                <li>Новые читаемые коды (IVAN-1234) тоже работают</li>
                <li>Поиск сначала по ID, затем по индексу refcode</li>
              </ul>
            </div>

            <div className="bg-[#F7FAFC] p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-[#1E1E1E] mb-2">
                Технические детали:
              </p>
              <div className="text-xs text-[#666] space-y-1 font-mono">
                <p>• При регистрации создается индекс:</p>
                <p className="ml-4 bg-white px-2 py-1 rounded">
                  user:refcode:{'{'}code{'}'} → {'{'}id: "1"{'}'}
                </p>
                <p className="mt-2">• Поиск спонсора:</p>
                <p className="ml-4 bg-white px-2 py-1 rounded">
                  1. Попытка найти по user:id:{'{'}code{'}'}
                </p>
                <p className="ml-4 bg-white px-2 py-1 rounded">
                  2. Если не найден → поиск по user:refcode:{'{'}code{'}'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Исправления */}
        <Card className="border-[#12C9B6]/50">
          <CardHeader>
            <CardTitle className="text-[#12C9B6]">
              ✅ Все исправления внедрены
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-[#666]">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Функция generateReadableRefCode() добавлена</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Роут /register обновлен: firstName + lastName</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Роут /auth/signup обновлен: генерация читаемого кода</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Индекс user:refcode создается при регистрации</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Поиск спонсора работает для обоих форматов</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>RegistrationRu.tsx обновлен: два поля для имени</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Возврат refCode в response всех роутов регистрации</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

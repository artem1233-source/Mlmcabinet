// 🔍 КОМПОНЕНТ ДЛЯ ДИАГНОСТИКИ ПРОФИЛЯ
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ProfileDebugProps {
  currentUser: any;
}

export function ProfileDebug({ currentUser }: ProfileDebugProps) {
  return (
    <div className="p-4 lg:p-8" style={{ backgroundColor: '#F7FAFC' }}>
      <h1 className="text-[#1E1E1E] mb-6" style={{ fontSize: '24px', fontWeight: '700' }}>
        🔍 Диагностика профиля
      </h1>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mb-4">
        <CardHeader>
          <CardTitle>Состояние currentUser</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="p-3 bg-gray-100 rounded">
              <div className="text-sm text-gray-600 mb-1">Проверка существования:</div>
              <div className="font-mono text-sm">
                currentUser существует: {currentUser ? '✅ ДА' : '❌ НЕТ'}
              </div>
            </div>
            
            {currentUser && (
              <>
                <div className="p-3 bg-gray-100 rounded">
                  <div className="text-sm text-gray-600 mb-1">Поле "имя" (русский ключ):</div>
                  <div className="font-mono text-sm">
                    currentUser.имя = {currentUser.имя ? `"${currentUser.имя}"` : '❌ ПУСТО'}
                  </div>
                </div>
                
                <div className="p-3 bg-gray-100 rounded">
                  <div className="text-sm text-gray-600 mb-1">Поле "name" (английский ключ):</div>
                  <div className="font-mono text-sm">
                    currentUser.name = {currentUser.name ? `"${currentUser.name}"` : '❌ ПУСТО'}
                  </div>
                </div>
                
                <div className="p-3 bg-gray-100 rounded">
                  <div className="text-sm text-gray-600 mb-1">Email:</div>
                  <div className="font-mono text-sm">
                    currentUser.email = {currentUser.email ? `"${currentUser.email}"` : '❌ ПУСТО'}
                  </div>
                </div>
                
                <div className="p-3 bg-gray-100 rounded">
                  <div className="text-sm text-gray-600 mb-1">ID:</div>
                  <div className="font-mono text-sm">
                    currentUser.id = {currentUser.id ? `"${currentUser.id}"` : '❌ ПУСТО'}
                  </div>
                </div>
                
                <div className="p-3 bg-gray-100 rounded">
                  <div className="text-sm text-gray-600 mb-1">Уровень:</div>
                  <div className="font-mono text-sm">
                    currentUser.уровень = {currentUser.уровень ?? '❌ ПУСТО'}
                  </div>
                </div>
                
                <div className="p-3 bg-gray-100 rounded">
                  <div className="text-sm text-gray-600 mb-1">Реферальный код:</div>
                  <div className="font-mono text-sm">
                    currentUser.рефКод = {currentUser.рефКод ? `"${currentUser.рефКод}"` : '❌ ПУСТО'}
                  </div>
                </div>
                
                <div className="p-3 bg-gray-100 rounded">
                  <div className="text-sm text-gray-600 mb-1">Дополнительные поля:</div>
                  <div className="font-mono text-sm space-y-1">
                    <div>телефон: {currentUser.телефон !== undefined ? `"${currentUser.телефон}"` : '❌ НЕТ ПОЛЯ'}</div>
                    <div>telegram: {currentUser.telegram !== undefined ? `"${currentUser.telegram}"` : '❌ НЕТ ПОЛЯ'}</div>
                    <div>аватарка: {currentUser.аватарка !== undefined ? (currentUser.аватарка ? '✅ ЕСТЬ' : 'пусто') : '❌ НЕТ ПОЛЯ'}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
        <CardHeader>
          <CardTitle>Полный объект currentUser (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-gray-900 text-green-400 rounded overflow-x-auto text-xs">
            {JSON.stringify(currentUser, null, 2)}
          </pre>
        </CardContent>
      </Card>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-bold text-yellow-800 mb-2">📋 Что проверить:</h3>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>Если <code className="bg-yellow-100 px-1">имя</code> пустое - OAuth API не вызвался или вернул неправильные данные</li>
          <li>Если есть только <code className="bg-yellow-100 px-1">name</code> (английский) - OAuth callback не вызвал серверный API</li>
          <li>Если <code className="bg-yellow-100 px-1">телефон</code> = "НЕТ ПОЛЯ" - Edge Function не обновлена</li>
          <li>Если <code className="bg-yellow-100 px-1">id</code> не начинается с "u_oauth_" - используется старый метод входа</li>
        </ul>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-2">🔧 Что делать:</h3>
        <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
          <li>Откройте DevTools Console (F12)</li>
          <li>Проверьте логи после входа через Google</li>
          <li>Найдите запрос к <code className="bg-blue-100 px-1">/auth/oauth</code> в Network</li>
          <li>Если запроса нет - AppRu.tsx не обновлён</li>
          <li>Если запрос есть но ошибка - Edge Function не задеплоена</li>
          <li>Если всё OK - очистите кэш и войдите заново</li>
        </ol>
      </div>
    </div>
  );
}

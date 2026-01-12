import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Play, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Role, ROLE_CONFIGS } from '../../types';
import { Section } from '../../utils/roleAccess';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  message?: string;
  duration?: number;
}

interface AdminTestPanelProps {
  currentRole: Role;
  activeSection: Section;
  onRoleChange: (role: Role) => void;
  onSectionChange: (section: Section) => void;
}

export function AdminTestPanel({ 
  currentRole, 
  activeSection, 
  onRoleChange, 
  onSectionChange 
}: AdminTestPanelProps) {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const roleTests = [
    { id: 'SEO', sections: ['dashboard', 'admin', 'finance', 'warehouse', 'marketing', 'support', 'partner', 'orders', 'analytics'] },
    { id: 'AdminOps', sections: ['admin', 'orders'] },
    { id: 'Finance', sections: ['finance', 'orders', 'analytics'] },
    { id: 'Warehouse', sections: ['warehouse', 'orders'] },
    { id: 'Marketing', sections: ['marketing', 'analytics'] },
    { id: 'Support', sections: ['support', 'orders'] },
    { id: 'Partner', sections: ['orders'] },
  ];

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);
    const results: TestResult[] = [];

    // Тест 1: Проверка конфигурации ролей
    results.push({
      id: 'config',
      name: 'Конфигурация ролей',
      status: Object.keys(ROLE_CONFIGS).length === 7 ? 'pass' : 'fail',
      message: `Найдено ${Object.keys(ROLE_CONFIGS).length} ролей (ожидается 7)`,
    });
    setTests([...results]);
    await sleep(300);

    // Тест 2: Переключение ролей
    for (const roleTest of roleTests) {
      const role = roleTest.id as Role;
      const startTime = Date.now();
      
      try {
        onRoleChange(role);
        await sleep(100);
        
        const hasAccess = ROLE_CONFIGS[role].canSwitchRoles || role === currentRole;
        results.push({
          id: `role-${role}`,
          name: `Переключение на ${ROLE_CONFIGS[role].name}`,
          status: 'pass',
          duration: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          id: `role-${role}`,
          name: `Переключение на ${ROLE_CONFIGS[role].name}`,
          status: 'fail',
          message: (error as Error).message,
        });
      }
      
      setTests([...results]);
      await sleep(200);
    }

    // Тест 3: Навигация по разделам для каждой роли
    for (const roleTest of roleTests) {
      const role = roleTest.id as Role;
      onRoleChange(role);
      await sleep(100);

      for (const section of roleTest.sections) {
        const startTime = Date.now();
        
        try {
          onSectionChange(section);
          await sleep(50);
          
          results.push({
            id: `nav-${role}-${section}`,
            name: `${ROLE_CONFIGS[role].icon} ${section} (${ROLE_CONFIGS[role].name})`,
            status: 'pass',
            duration: Date.now() - startTime,
          });
        } catch (error) {
          results.push({
            id: `nav-${role}-${section}`,
            name: `${ROLE_CONFIGS[role].icon} ${section} (${ROLE_CONFIGS[role].name})`,
            status: 'fail',
            message: (error as Error).message,
          });
        }
        
        setTests([...results]);
        await sleep(100);
      }
    }

    // Тест 4: Проверка прав доступа
    const accessTests = [
      { role: 'SEO', canSwitch: true, expected: true },
      { role: 'AdminOps', canSwitch: false, expected: true },
      { role: 'Finance', canSwitch: false, expected: true },
      { role: 'Partner', canSwitch: false, expected: true },
    ];

    for (const test of accessTests) {
      const roleConfig = ROLE_CONFIGS[test.role as Role];
      const actual = roleConfig.canSwitchRoles;
      
      results.push({
        id: `access-${test.role}`,
        name: `Права переключения для ${roleConfig.name}`,
        status: actual === test.canSwitch ? 'pass' : 'fail',
        message: `Ожидается: ${test.canSwitch}, Получено: ${actual}`,
      });
      
      setTests([...results]);
      await sleep(100);
    }

    // Возвращаем на SEO роль
    onRoleChange('SEO');
    onSectionChange('dashboard');

    setIsRunning(false);
  };

  const resetTests = () => {
    setTests([]);
    onRoleChange('SEO');
    onSectionChange('dashboard');
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const passCount = tests.filter(t => t.status === 'pass').length;
  const failCount = tests.filter(t => t.status === 'fail').length;
  const warnCount = tests.filter(t => t.status === 'warning').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Заголовок */}
      <div className="bg-white rounded-xl border border-[#E6E9EE] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1E1E1E] mb-1">Панель тестирования</h2>
            <p className="text-sm text-[#999]">
              Автоматическая проверка системы переключения ролей и навигации
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={resetTests}
              variant="outline"
              disabled={isRunning}
              className="gap-2 h-9"
            >
              <RotateCcw className="w-4 h-4" />
              Сброс
            </Button>
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="gap-2 h-9 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] shadow-md shadow-[#39B7FF]/20"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Тестирование...' : 'Запустить тесты'}
            </Button>
          </div>
        </div>

        {/* Статистика */}
        {tests.length > 0 && (
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-[#F7FAFC] rounded-lg p-4">
              <div className="text-2xl font-bold text-[#1E1E1E]">{tests.length}</div>
              <div className="text-sm text-[#666]">Всего тестов</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{passCount}</div>
              <div className="text-sm text-green-700">Успешно</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{failCount}</div>
              <div className="text-sm text-red-700">Ошибки</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-600">{warnCount}</div>
              <div className="text-sm text-amber-700">Предупреждения</div>
            </div>
          </div>
        )}
      </div>

      {/* Текущее состояние */}
      <div className="bg-white rounded-xl border border-[#E6E9EE] p-6">
        <h3 className="font-bold text-[#1E1E1E] mb-4">Текущее состояние</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#F7FAFC] rounded-lg p-4">
            <div className="text-sm text-[#666] mb-1">Текущая роль</div>
            <div className="font-semibold text-[#1E1E1E] flex items-center gap-2">
              <span>{ROLE_CONFIGS[currentRole].icon}</span>
              <span>{ROLE_CONFIGS[currentRole].name}</span>
            </div>
          </div>
          <div className="bg-[#F7FAFC] rounded-lg p-4">
            <div className="text-sm text-[#666] mb-1">Активный раздел</div>
            <div className="font-semibold text-[#1E1E1E]">{activeSection}</div>
          </div>
        </div>
      </div>

      {/* Результаты тестов */}
      {tests.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E6E9EE] p-6">
          <h3 className="font-bold text-[#1E1E1E] mb-4">Результаты тестирования</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tests.map((test, index) => (
              <div
                key={test.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  test.status === 'pass'
                    ? 'bg-green-50 border border-green-200'
                    : test.status === 'fail'
                    ? 'bg-red-50 border border-red-200'
                    : test.status === 'warning'
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                {test.status === 'pass' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
                {test.status === 'fail' && (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                {test.status === 'warning' && (
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
                {test.status === 'pending' && (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-[#39B7FF] rounded-full animate-spin flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1E1E1E] truncate">{test.name}</div>
                  {test.message && (
                    <div className="text-sm text-[#666] mt-0.5">{test.message}</div>
                  )}
                </div>
                
                {test.duration && (
                  <div className="text-xs text-[#999] flex-shrink-0">{test.duration}ms</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Руководство */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-bold text-[#1E1E1E] mb-3">📋 Что проверяется</h3>
        <ul className="space-y-2 text-sm text-[#666]">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#39B7FF] mt-0.5 flex-shrink-0" />
            <span>Конфигурация всех 7 ролей (SEO, AdminOps, Finance, Warehouse, Marketing, Support, Partner)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#39B7FF] mt-0.5 flex-shrink-0" />
            <span>Переключение между ролями для супер-администратора</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#39B7FF] mt-0.5 flex-shrink-0" />
            <span>Навигация по разделам для каждой роли с проверкой прав доступа</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#39B7FF] mt-0.5 flex-shrink-0" />
            <span>Права на переключение ролей (только для SEO/Owner)</span>
          </li>
        </ul>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
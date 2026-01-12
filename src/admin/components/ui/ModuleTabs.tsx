/**
 * Debug UI flag - set to true to show debug information in the UI
 * When false, "MODULE_TABS_RENDERED" text is hidden from production
 */
const DEBUG_UI = false; // 🎨 Выключен для clean production UI

import { Role } from '../../types';
import { Lock } from 'lucide-react';
import { 
  MODULE_CONFIGS, 
  getAvailableModules, 
  hasModuleAccess,
  Module,
  Section 
} from '../../utils/roleAccess';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';

interface ModuleTabsProps {
  currentRole: Role;
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  inspectionEnabled?: boolean; // Режим инспекции доступов
}

export function ModuleTabs({ 
  currentRole, 
  activeSection, 
  onSectionChange,
  inspectionEnabled = false 
}: ModuleTabsProps) {
  // Модульные вкладки видны ТОЛЬКО для Owner (SEO/CEO)
  if (currentRole !== 'SEO') {
    return null;
  }

  // Все модули для Owner
  const allModules: Module[] = ['control', 'admin', 'finance', 'warehouse', 'marketing', 'support', 'partner'];
  
  // Определяем активный модуль на основе текущего раздела
  const getActiveModule = (): Module | null => {
    // Маппинг раздела на модуль
    const sectionToModule: Record<Section, Module | null> = {
      dashboard: 'control',
      admin: 'admin',
      finance: 'finance',
      warehouse: 'warehouse',
      marketing: 'marketing',
      support: 'support',
      partner: 'partner',
      orders: null,      // Заказы доступны в разных модулях
      analytics: null,   // Аналитика доступна в разных модулях
      settings: null,    // Настройки доступны везде
      testing: 'control' // Тестирование в центре управления
    };
    
    return sectionToModule[activeSection] ?? null;
  };

  const activeModule = getActiveModule();

  return (
    <div className="bg-white border-b border-[#E6E9EE]">
      {/* Smoke-test метка (временно для проверки) */}
      {DEBUG_UI && (
        <div className="px-6 pt-2">
          <p className="text-xs text-gray-400 font-mono">MODULE_TABS_RENDERED</p>
        </div>
      )}
      
      {/* Белый блок с заголовком и табами */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-5">
        {/* Верхняя строка: Заголовок + кнопки */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1E1E1E]">Центр управления</h2>
          <div className="flex items-center gap-2">
            {/* Здесь можно добавить кнопки при необходимости */}
          </div>
        </div>
        
        {/* Нижняя строка: Табы (пилюли) */}
        <TooltipProvider>
          <div className="flex items-center gap-2 overflow-x-auto">
            {allModules.map((moduleId) => {
              const module = MODULE_CONFIGS[moduleId];
              const isActive = activeModule === moduleId;
              const hasAccess = hasModuleAccess(currentRole, moduleId);
              const isLocked = inspectionEnabled && !hasAccess;
              
              const button = (
                <button
                  key={moduleId}
                  onClick={() => hasAccess ? onSectionChange(module.section) : null}
                  disabled={isLocked}
                  className={`
                    h-10 px-4 font-medium text-sm whitespace-nowrap transition-all rounded-full
                    flex items-center justify-center gap-2 relative
                    ${isActive 
                      ? 'text-white bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] border border-transparent shadow-md shadow-[#39B7FF]/20' 
                      : isLocked
                      ? 'text-[#999] bg-transparent border border-[#E6E9EE] opacity-50 cursor-not-allowed'
                      : 'text-[#666] bg-transparent border border-[#E6E9EE] hover:text-[#1E1E1E] hover:bg-[#F7FAFC]'
                    }
                  `}
                >
                  <span className={isActive ? 'text-base' : 'text-base'}>{module.icon}</span>
                  <span>{module.label}</span>
                  {isLocked && <Lock className="w-3 h-3 text-red-400" />}
                </button>
              );

              // Если элемент заблокирован, оборачиваем в Tooltip
              if (isLocked) {
                return (
                  <Tooltip key={moduleId}>
                    <TooltipTrigger asChild>
                      {button}
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white">
                      <p>Недоступно для роли {currentRole}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
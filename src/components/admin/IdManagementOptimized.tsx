/**
 * 🎯 ОПТИМИЗИРОВАННАЯ ПАНЕЛЬ УПРАВЛЕНИЯ ID
 * Все утилиты в одном месте с логической группировкой
 */

import { useState } from 'react';
import { Database, Lightbulb, Settings, UserX } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { AutoBackupManager } from './AutoBackupManager';
import { SmartOrphanFixer } from './SmartOrphanFixer';
import { DataRecoveryTool } from './DataRecoveryTool';
import { IdManager } from './IdManager';
import { ChangeUserId } from './ChangeUserId';
import { useAllUsers } from '../../hooks/useAllUsers';

interface IdManagementOptimizedProps {
  currentUser: any;
  onSuccess?: () => void;
}

export function IdManagementOptimized({ currentUser, onSuccess }: IdManagementOptimizedProps) {
  const { users: allUsers, isLoading } = useAllUsers();
  const [openSections, setOpenSections] = useState(['ids']); // По умолчанию открыт ID Manager

  // Вычисляем статистику
  const nonAdminUsers = allUsers.filter(u => !u.isAdmin && u.id !== 'ceo' && u.id !== '1');
  const orphansCount = allUsers.filter(u => !u.спонсорId && !u.isAdmin && u.id !== 'ceo' && u.id !== '1').length;
  const lastBackupTime = localStorage.getItem('lastBackupTime');
  
  function calculateIntegrity() {
    if (allUsers.length === 0) return 100;
    
    if (nonAdminUsers.length === 0) return 100;
    
    let issues = 0;
    
    // Проверяем orphans
    issues += orphansCount;
    
    // Проверяем сломанные связи
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    for (const user of allUsers) {
      // Проверяем sponsorId
      if (user.спонсорId && !userMap.has(user.спонсорId)) {
        issues++;
      }
      
      // Проверяем команду
      if (user.команда && Array.isArray(user.команда)) {
        for (const childId of user.команда) {
          const child = userMap.get(childId);
          if (!child) {
            issues++;
          } else if (child.спонсорId !== user.id) {
            issues++;
          }
        }
      }
    }
    
    const integrityPercent = Math.max(0, Math.round((1 - issues / (nonAdminUsers.length * 2)) * 100));
    return integrityPercent;
  }

  // Создаём объект stats после всех вычислений
  const stats = {
    total: allUsers.length,
    orphans: orphansCount,
    lastBackup: lastBackupTime,
    integrity: calculateIntegrity(),
  };

  const formatTimeSince = (timestamp: string | null) => {
    if (!timestamp) return 'Никогда';
    
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const hours = Math.floor((now - then) / (1000 * 60 * 60));
    
    if (hours < 1) return 'Меньше часа';
    if (hours < 24) return `${hours} ч.`;
    const days = Math.floor(hours / 24);
    return `${days} д.`;
  };

  // Прокрутить к секции и развернуть её
  const scrollToSection = (sectionId: string) => {
    setOpenSections(prev => {
      if (!prev.includes(sectionId)) {
        return [...prev, sectionId];
      }
      return prev;
    });
    
    // Небольшая задержка для анимации accordion
    setTimeout(() => {
      const element = document.getElementById(`accordion-${sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* ⚡ Информативные кнопки быстрых действий */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Orphans - красная если проблемы */}
        <Button
          size="sm"
          variant={stats.orphans > 0 ? 'destructive' : 'outline'}
          onClick={() => scrollToSection('recovery')}
          disabled={stats.orphans === 0}
          className={stats.orphans === 0 ? 'opacity-60' : ''}
        >
          <UserX className="w-4 h-4 mr-2" />
          Найти orphans
          <span className="mx-1.5">•</span>
          <span className="font-bold">{stats.orphans}</span>
        </Button>
        
        {/* Бэкап - показывает время */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => scrollToSection('backup')}
          className="border-purple-300 hover:bg-purple-50"
        >
          <Database className="w-4 h-4 mr-2 text-purple-600" />
          Бэкап
          <span className="mx-1.5">•</span>
          <span className="font-medium">{formatTimeSince(stats.lastBackup)}</span>
        </Button>
        
        {/* Управление ID - показывает целостность */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => scrollToSection('ids')}
          className={`
            ${stats.integrity >= 95 ? 'border-green-300 hover:bg-green-50' : ''}
            ${stats.integrity >= 80 && stats.integrity < 95 ? 'border-yellow-300 hover:bg-yellow-50' : ''}
            ${stats.integrity < 80 ? 'border-red-300 hover:bg-red-50' : ''}
          `}
        >
          <Settings className={`w-4 h-4 mr-2 ${stats.integrity >= 95 ? 'text-green-600' : stats.integrity >= 80 ? 'text-yellow-600' : 'text-red-600'}`} />
          Управление ID
          <span className="mx-1.5">•</span>
          <span className={`font-bold ${stats.integrity >= 95 ? 'text-green-600' : stats.integrity >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
            {stats.integrity}%
          </span>
        </Button>
      </div>

      {/* 📂 Accordion с утилитами */}
      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="space-y-4"
      >
        {/* 1. Управление ID и Номерами - ГЛАВНОЕ */}
        <AccordionItem 
          value="ids" 
          className="border rounded-lg px-4 bg-white"
          id="accordion-ids"
        >
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#39B7FF] rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-[#39B7FF]">🎯 Управление ID и Номерами</h3>
                <p className="text-xs text-gray-500">Просмотр, изменение ID и резервирование номеров</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-6">
            <IdManager 
              currentUser={currentUser}
              onDataChange={() => {
                if (onSuccess) onSuccess();
              }}
            />
            <ChangeUserId currentUser={currentUser} />
          </AccordionContent>
        </AccordionItem>

        {/* 2. Защита данных */}
        <AccordionItem 
          value="backup" 
          className="border rounded-lg px-4 bg-white"
          id="accordion-backup"
        >
          <AccordionTrigger className="hover:no-underline py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium">Защита данных</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <AutoBackupManager currentUser={currentUser} />
          </AccordionContent>
        </AccordionItem>

        {/* 3. Восстановление связей */}
        <AccordionItem 
          value="recovery" 
          className="border rounded-lg px-4 bg-white"
          id="accordion-recovery"
        >
          <AccordionTrigger className="hover:no-underline py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Восстановление связей</h3>
                  {stats.orphans > 0 && (
                    <Badge variant="destructive" className="text-xs h-5">
                      {stats.orphans}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-6">
            <SmartOrphanFixer 
              currentUser={currentUser} 
              onSuccess={() => {
                if (onSuccess) onSuccess();
              }} 
            />
            <DataRecoveryTool 
              currentUser={currentUser} 
              onSuccess={() => {
                if (onSuccess) onSuccess();
              }} 
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Компактная подсказка */}
      <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          <span className="font-medium">Совет:</span> Включите автобэкапы • При orphans используйте восстановление • Проверяйте целостность после изменений
        </p>
      </div>
    </div>
  );
}

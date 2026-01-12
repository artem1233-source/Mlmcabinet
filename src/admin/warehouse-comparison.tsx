import { useState } from 'react';
import { WarehouseDashboard } from './components/roles/WarehouseDashboard';
import { WarehouseDashboardV2 } from './components/roles/WarehouseDashboardV2';
import { Button } from '../components/ui/button';
import { ArrowLeftRight, Eye, Zap } from 'lucide-react';

export default function WarehouseComparison() {
  const [activeVersion, setActiveVersion] = useState<'v1' | 'v2' | 'split'>('split');

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6">
      {/* Header */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg p-6 border-2 border-[#39B7FF]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1E1E1E] mb-2">
              📊 Склад — Сравнение версий
            </h1>
            <p className="text-[#666]">
              Сравните оригинальную версию (v1) с переработанной Action-first версией (v2)
            </p>
          </div>
          
          <div className="flex gap-3 p-2 bg-gray-100 rounded-xl">
            <Button
              onClick={() => setActiveVersion('v1')}
              variant={activeVersion === 'v1' ? 'default' : 'ghost'}
              className={activeVersion === 'v1' ? 'bg-[#39B7FF]' : ''}
            >
              <Eye className="w-4 h-4 mr-2" />
              Только v1
            </Button>
            <Button
              onClick={() => setActiveVersion('split')}
              variant={activeVersion === 'split' ? 'default' : 'ghost'}
              className={activeVersion === 'split' ? 'bg-[#39B7FF]' : ''}
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Сравнение
            </Button>
            <Button
              onClick={() => setActiveVersion('v2')}
              variant={activeVersion === 'v2' ? 'default' : 'ghost'}
              className={activeVersion === 'v2' ? 'bg-[#12C9B6]' : ''}
            >
              <Zap className="w-4 h-4 mr-2" />
              Только v2
            </Button>
          </div>
        </div>
      </div>

      {/* Key Differences Banner */}
      <div className="mb-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
          <Zap className="w-7 h-7" />
          3 Главных визуальных отличия v2
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/30">
            <div className="text-3xl mb-2">🔥</div>
            <h3 className="font-bold text-lg mb-2">1. Animated Action Block</h3>
            <p className="text-sm text-white/90">
              Блок "Требует действий сегодня" с мигающими индикаторами, анимированными таймерами и градиентами для максимальной заметности
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/30">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold text-lg mb-2">2. Extreme KPI Hierarchy</h3>
            <p className="text-sm text-white/90">
              Радикальное разделение KPI на 2 уровня: огромные первичные метрики (текст 6xl) и компактные вторичные (текст xl)
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/30">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-bold text-lg mb-2">3. Smart Order Recommendations</h3>
            <p className="text-sm text-white/90">
              Кнопка "Рекомендуемый заказ: +XXX" вместо просто "Заказать" с умными расчётами и визуальными акцентами
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeVersion === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* V1 */}
          <div className="space-y-4">
            <div className="bg-gray-800 text-white px-6 py-3 rounded-t-2xl font-bold text-lg flex items-center justify-between sticky top-0 z-20">
              <span>📦 Версия 1 (Оригинал)</span>
              <span className="text-sm font-normal bg-white/20 px-3 py-1 rounded-full">Current</span>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto bg-white rounded-b-2xl p-6 shadow-lg border-2 border-gray-300">
              <WarehouseDashboard />
            </div>
          </div>

          {/* V2 */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white px-6 py-3 rounded-t-2xl font-bold text-lg flex items-center justify-between sticky top-0 z-20">
              <span>⚡ Версия 2 (Action-first)</span>
              <span className="text-sm font-normal bg-white/30 px-3 py-1 rounded-full">New</span>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto bg-white rounded-b-2xl p-6 shadow-lg border-2 border-[#39B7FF]">
              <WarehouseDashboardV2 />
            </div>
          </div>
        </div>
      ) : activeVersion === 'v1' ? (
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <WarehouseDashboard />
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <WarehouseDashboardV2 />
        </div>
      )}
    </div>
  );
}

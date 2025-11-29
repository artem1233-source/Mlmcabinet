/**
 * 🎨 Продвинутая панель фильтров для управления пользователями
 */

import { Filter, Award, Wallet } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';

interface AdvancedFiltersPanelProps {
  rankFrom: number;
  rankTo: number;
  rankExactMatch: boolean;
  balanceFrom: string;
  balanceTo: string;
  totalResults: number;
  onRankFromChange: (value: number) => void;
  onRankToChange: (value: number) => void;
  onRankExactMatchChange: (value: boolean) => void;
  onBalanceFromChange: (value: string) => void;
  onBalanceToChange: (value: string) => void;
  onResetFilters: () => void;
}

export function AdvancedFiltersPanel({
  rankFrom,
  rankTo,
  rankExactMatch,
  balanceFrom,
  balanceTo,
  totalResults,
  onRankFromChange,
  onRankToChange,
  onRankExactMatchChange,
  onBalanceFromChange,
  onBalanceToChange,
  onResetFilters,
}: AdvancedFiltersPanelProps) {
  const hasActiveFilters = 
    rankFrom !== 0 || 
    rankTo !== 150 || 
    rankExactMatch || 
    balanceFrom !== '' || 
    balanceTo !== '';

  return (
    <Card className="mb-2.5">
      <CardContent className="!px-2.5 !pt-2.5 !pb-2.5">
        {/* Верхний ряд - Фильтры */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Filter className="w-5 h-5 text-[#666] shrink-0" />
          
          {/* 🏆 Rank Filter */}
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-orange-50 to-orange-100/50 px-2.5 py-2.5 rounded-lg border border-orange-200">
            <Award className="w-4 h-4 text-orange-600 shrink-0" />
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rankExact"
                  checked={rankExactMatch}
                  onCheckedChange={(checked) => onRankExactMatchChange(checked as boolean)}
                />
                <label htmlFor="rankExact" className="text-sm text-orange-900 cursor-pointer whitespace-nowrap select-none">
                  Точный
                </label>
              </div>
              
              {rankExactMatch ? (
                <select
                  value={rankFrom}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    onRankFromChange(value);
                    onRankToChange(value);
                  }}
                  className="h-9 px-3 border border-orange-300 rounded-lg text-sm bg-white hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[100px]"
                >
                  {Array.from({ length: 151 }, (_, i) => i).map((rank) => (
                    <option key={rank} value={rank}>
                      Ранг {rank}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-orange-700 whitespace-nowrap">От:</span>
                    <select
                      value={rankFrom}
                      onChange={(e) => onRankFromChange(Number(e.target.value))}
                      className="h-9 px-3 border border-orange-300 rounded-lg text-sm bg-white hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[100px]"
                    >
                      {Array.from({ length: 151 }, (_, i) => i).map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-orange-700 whitespace-nowrap">До:</span>
                    <select
                      value={rankTo}
                      onChange={(e) => onRankToChange(Number(e.target.value))}
                      className="h-9 px-3 border border-orange-300 rounded-lg text-sm bg-white hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[100px]"
                    >
                      {Array.from({ length: 151 }, (_, i) => i).map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 💰 Balance Filter */}
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-50 to-blue-100/50 px-2.5 py-2.5 rounded-lg border border-blue-200">
            <Wallet className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700 whitespace-nowrap">От:</span>
                <Input
                  type="number"
                  value={balanceFrom}
                  onChange={(e) => onBalanceFromChange(e.target.value)}
                  placeholder="0"
                  className="h-9 w-24 border-blue-300 focus:ring-blue-400"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700 whitespace-nowrap">До:</span>
                <Input
                  type="number"
                  value={balanceTo}
                  onChange={(e) => onBalanceToChange(e.target.value)}
                  placeholder="∞"
                  className="h-9 w-24 border-blue-300 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* ✕ Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              ✕ Сбросить
            </Button>
          )}

          {/* 📊 Results count */}
          <div className="ml-auto h-9 flex items-center text-sm text-[#666] bg-gradient-to-r from-gray-50 to-gray-100 px-2.5 rounded-lg border border-[#E6E9EE]">
            Найдено: <span className="ml-2.5 font-semibold text-[#1E1E1E]">{totalResults}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

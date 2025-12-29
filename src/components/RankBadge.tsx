import { Star } from 'lucide-react';

interface RankBadgeProps {
  rank: number; // Реальный ранг пользователя (1-11)
}

export function RankBadge({ rank }: RankBadgeProps) {
  
  // 🛡️ Защита от некорректных значений
  const safeRank = Math.max(1, rank || 1);
  
  // Определяем цвет в зависимости от ранга
  const getRankStyle = (rank: number) => {
    if (rank >= 10) {
      return { 
        bgGradient: 'from-amber-500 via-yellow-500 to-amber-600',
        glowColor: 'shadow-amber-500/50',
      };
    } else if (rank >= 7) {
      return { 
        bgGradient: 'from-purple-500 via-pink-500 to-purple-600',
        glowColor: 'shadow-purple-500/50',
      };
    } else if (rank >= 4) {
      return { 
        bgGradient: 'from-teal-500 via-cyan-500 to-teal-600',
        glowColor: 'shadow-teal-500/50',
      };
    } else {
      return { 
        bgGradient: 'from-blue-500 via-sky-500 to-blue-600',
        glowColor: 'shadow-blue-500/50',
      };
    }
  };
  
  const style = getRankStyle(safeRank);

  return (
    <div className="relative inline-flex items-center justify-center">
      <div className={`relative px-5 py-2 bg-gradient-to-r ${style.bgGradient} rounded-full ${style.glowColor} shadow-lg border border-white/30`}>
        {/* Блеск */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></div>
        
        {/* Контент */}
        <div className="relative flex items-center gap-2">
          <Star size={16} className="text-white" fill="white" />
          <div className="text-white font-bold text-sm whitespace-nowrap">
            Ранг {safeRank}
          </div>
        </div>
      </div>
    </div>
  );
}

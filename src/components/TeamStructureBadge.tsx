import { Users, Info } from 'lucide-react';

interface TeamStructureBadgeProps {
  firstLine: number;
  depth: number;
  totalTeam: number;
  compact?: boolean;
  showTooltip?: boolean;
}

export function TeamStructureBadge({ 
  firstLine, 
  depth, 
  totalTeam, 
  compact = false,
  showTooltip = true 
}: TeamStructureBadgeProps) {
  const display = `${firstLine}/${depth}/${totalTeam}`;
  
  const getStyle = () => {
    if (totalTeam >= 50) {
      return { 
        bgGradient: 'from-amber-500 via-yellow-500 to-amber-600',
        glowColor: 'shadow-amber-500/50',
      };
    } else if (totalTeam >= 20) {
      return { 
        bgGradient: 'from-purple-500 via-pink-500 to-purple-600',
        glowColor: 'shadow-purple-500/50',
      };
    } else if (totalTeam >= 5) {
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
  
  const style = getStyle();

  if (compact) {
    return (
      <span className="font-mono font-bold text-sm text-gray-700">
        {display}
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <div className={`relative px-5 py-2 bg-gradient-to-r ${style.bgGradient} rounded-full ${style.glowColor} shadow-lg border border-white/30`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></div>
        
        <div className="relative flex items-center gap-2">
          <Users size={16} className="text-white" />
          <div className="text-white font-bold text-sm whitespace-nowrap font-mono">
            {display}
          </div>
          {showTooltip && (
            <span className="relative group">
              <Info size={14} className="text-white/70 hover:text-white cursor-help" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                1-я линия / глубина / всего в команде
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function formatTeamStructure(firstLine: number, depth: number, totalTeam: number): string {
  return `${firstLine}/${depth}/${totalTeam}`;
}

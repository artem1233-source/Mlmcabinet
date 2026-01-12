import { ROLE_CONFIGS, Role } from '../../types';

interface RoleBannerProps {
  role: Role;
}

export function RoleBanner({ role }: RoleBannerProps) {
  const config = ROLE_CONFIGS[role];
  
  return (
    <div 
      className="rounded-xl p-4 border-2 mb-6"
      style={{
        backgroundColor: `${config.color}10`,
        borderColor: `${config.color}40`,
      }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-md"
          style={{ backgroundColor: `${config.color}20` }}
        >
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-[#1E1E1E]">{config.name}</h2>
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: `${config.color}30`,
                color: config.color,
              }}
            >
              Активная роль
            </span>
          </div>
          <p className="text-sm text-[#666]">{config.description}</p>
        </div>
      </div>
    </div>
  );
}

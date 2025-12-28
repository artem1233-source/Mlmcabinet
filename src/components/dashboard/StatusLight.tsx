interface StatusLightProps {
  status: 'green' | 'yellow' | 'red' | 'gray';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
};

const sizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusLight({ status, label, size = 'md' }: StatusLightProps) {
  return (
    <div className="flex items-center gap-2">
      <span 
        className={`${statusColors[status]} ${sizes[size]} rounded-full animate-pulse`}
      />
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </div>
  );
}

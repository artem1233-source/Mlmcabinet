import { Period } from '../../types';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const periods: { value: Period; label: string }[] = [
    { value: 'today', label: 'Сегодня' },
    { value: '7', label: '7' },
    { value: '30', label: '30' },
    { value: '90', label: '90' },
    { value: 'year', label: 'Год' }
  ];

  return (
    <div className="inline-flex items-center bg-[#F7FAFC] border border-[#E6E9EE] rounded-full p-1">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`h-8 px-4 rounded-full text-sm font-medium transition-all ${
            value === period.value
              ? 'bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white shadow-md shadow-[#39B7FF]/20'
              : 'text-[#666] hover:bg-white hover:text-[#1E1E1E]'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
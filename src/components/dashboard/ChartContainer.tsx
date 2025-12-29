import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart3 } from 'lucide-react';
import { ChartData, ChartSeries } from './types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export interface ChartContainerProps {
  chart?: ChartData;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  error?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
}

export function ChartContainer({
  chart,
  title: propTitle,
  subtitle,
  children,
  actions,
  loading = false,
  empty: propEmpty = false,
  error = false,
  emptyMessage = 'Нет данных для отображения',
  errorMessage = 'Ошибка загрузки данных',
}: ChartContainerProps) {
  const title = propTitle || chart?.title || '';
  const chartType = chart?.type || 'line';
  const series = chart?.series || [];
  const empty = propEmpty || (chart && series.length === 0);

  const transformData = () => {
    if (!series.length) return [];
    if (chartType === 'pie') {
      return series.map((s: ChartSeries) => ({
        name: s.name,
        value: s.data[0]?.y || 0,
        color: s.color,
      }));
    }

    if (!series[0]?.data) return [];

    return series[0].data.map((point, idx) => {
      const item: Record<string, any> = { x: point.x };
      series.forEach((s: ChartSeries) => {
        item[s.name] = s.data[idx]?.y || 0;
      });
      return item;
    });
  };

  const data = chart ? transformData() : [];
  const COLORS = series.map((s: ChartSeries) => s.color || '#39B7FF');

  const renderAutoChart = () => {
    if (!chart || series.length === 0) return null;

    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              {series.map((s: ChartSeries, i: number) => (
                <linearGradient key={s.name} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="x" stroke="#6B7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
            {series.length > 1 && <Legend />}
            {series.map((s: ChartSeries, i: number) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={COLORS[i]}
                strokeWidth={2}
                fill={`url(#gradient-${i})`}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="x" stroke="#6B7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
            {series.length > 1 && <Legend />}
            {series.map((s: ChartSeries, i: number) => (
              <Bar key={s.name} dataKey={s.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case 'line':
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="x" stroke="#6B7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
            {series.length > 1 && <Legend />}
            {series.map((s: ChartSeries, i: number) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={COLORS[i]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && <p className="text-sm text-[#6B7280] mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0 ml-4">{actions}</div>}
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6B7280]">Загрузка данных...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1E1E1E] mb-1">{errorMessage}</p>
                <p className="text-xs text-[#6B7280]">Попробуйте обновить страницу</p>
              </div>
            </div>
          </div>
        )}

        {empty && !loading && !error && (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1E1E1E] mb-1">{emptyMessage}</p>
                <p className="text-xs text-[#6B7280]">Данные появятся после первых транзакций</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !empty && (
          children ? (
            children
          ) : chart ? (
            <ResponsiveContainer width="100%" height={250}>
              {renderAutoChart() || <div />}
            </ResponsiveContainer>
          ) : null
        )}
      </CardContent>
    </Card>
  );
}

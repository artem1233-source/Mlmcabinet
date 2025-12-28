import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartData } from './types';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface ChartContainerProps {
  chart: ChartData;
}

export function ChartContainer({ chart }: ChartContainerProps) {
  const { title, type = 'line', series } = chart;

  const transformData = () => {
    if (type === 'pie') {
      return series.map(s => ({
        name: s.name,
        value: s.data[0]?.y || 0,
        color: s.color
      }));
    }

    if (!series[0]?.data) return [];
    
    return series[0].data.map((point, idx) => {
      const item: Record<string, any> = { x: point.x };
      series.forEach(s => {
        item[s.name] = s.data[idx]?.y || 0;
      });
      return item;
    });
  };

  const data = transformData();
  const COLORS = series.map(s => s.color || '#39B7FF');

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.name} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="x" stroke="#6B7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
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
            {series.map((s, i) => (
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
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
            {series.map((s, i) => (
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
    <Card className="border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

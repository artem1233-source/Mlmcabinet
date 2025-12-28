import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { AlertsList } from './AlertsList';
import { DataTable } from './DataTable';
import type { DashboardData } from './types';

interface FinanceDashboardProps {
  data: DashboardData;
  period: number;
}

export function FinanceDashboard({ data, period: _period }: FinanceDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.kpis.map((kpi, index) => (
          <KPICard key={index} kpi={kpi} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.charts.map((chart, index) => (
          <ChartContainer key={index} chart={chart} />
        ))}
      </div>
      
      {data.alerts.length > 0 && (
        <AlertsList alerts={data.alerts} />
      )}
      
      {data.tables.map((table, index) => (
        <DataTable key={index} data={table} />
      ))}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DollarSign, TrendingUp, Clock, Search, FileText, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import type { DashboardData } from './types';

interface FinanceDashboardProps {
  data: DashboardData;
  period: number;
}

function FinanceKPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  iconBg 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: any; 
  iconColor: string; 
  iconBg: string;
}) {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#6B7280] mb-1">{title}</p>
            <p className="text-[32px] font-bold text-[#1E1E1E] leading-none mb-1.5">
              {value}
            </p>
            {subtitle && (
              <p className="text-[12px] text-[#10B981]">{subtitle}</p>
            )}
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CashflowChart() {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full">
      <CardHeader className="px-6 pt-5 pb-2">
        <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">
          Денежный поток (Cashflow)
        </CardTitle>
        <p className="text-[13px] text-[#9CA3AF]">Входящие и исходящие за период</p>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-[14px] font-medium text-[#6B7280] mb-1">
            Нет данных для отображения
          </p>
          <p className="text-[12px] text-[#9CA3AF]">
            Данные появятся после первых транзакций
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutStatusChart() {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full">
      <CardHeader className="px-6 pt-5 pb-2">
        <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">
          Статусы выплат
        </CardTitle>
        <p className="text-[13px] text-[#9CA3AF]">Распределение по статусам</p>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-[14px] font-medium text-[#6B7280] mb-1">
            Нет данных
          </p>
          <p className="text-[12px] text-[#9CA3AF]">
            Выплаты ещё не созданы
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingPayoutsTable() {
  const hasPendingPayouts = false;

  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <CardHeader className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-red-500" />
            </div>
            <CardTitle className="text-[15px] font-semibold text-[#1E1E1E]">
              Pending выплаты
            </CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по партнёру, ID..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-[200px] focus:outline-none focus:ring-2 focus:ring-[#39B7FF]/20 focus:border-[#39B7FF]"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1E1E1E] border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <FileText className="w-4 h-4" />
              Аудит
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {hasPendingPayouts ? (
          <div>Table rows here</div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[#D1FAE5] flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-[#10B981]" />
            </div>
            <p className="text-[14px] text-[#6B7280]">
              🎉 Все выплаты обработаны
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SmallStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  iconBg 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: any; 
  iconColor: string; 
  iconBg: string; 
}) {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-[#6B7280] mb-1">{title}</p>
            <p className="text-[28px] font-bold text-[#1E1E1E] leading-none mb-1">{value}</p>
            <p className="text-[12px] text-[#9CA3AF]">{subtitle}</p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FinanceDashboard({ data, period: _period }: FinanceDashboardProps) {
  const totalRevenue = data.kpis.find(k => k.id === 'total_revenue')?.value || 0;
  const totalPaid = data.kpis.find(k => k.id === 'total_paid')?.value || 0;
  const inProcessing = data.kpis.find(k => k.id === 'in_processing')?.value || 0;
  const cashflow = data.kpis.find(k => k.id === 'cashflow')?.value || 0;

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(val as string) || 0;
    return num.toLocaleString('ru-RU') + '₽';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <FinanceKPICard
          title="Общий доход"
          value={formatCurrency(totalRevenue)}
          subtitle="+15% vs месяц"
          icon={DollarSign}
          iconColor="#10B981"
          iconBg="#D1FAE5"
        />
        <FinanceKPICard
          title="Выплачено"
          value={formatCurrency(totalPaid)}
          subtitle="+12% vs месяц"
          icon={TrendingUp}
          iconColor="#10B981"
          iconBg="#D1FAE5"
        />
        <FinanceKPICard
          title="В обработке"
          value={formatCurrency(inProcessing)}
          icon={Clock}
          iconColor="#F59E0B"
          iconBg="#FEF3C7"
        />
        <FinanceKPICard
          title="Cashflow"
          value={formatCurrency(cashflow)}
          subtitle="+18% vs месяц"
          icon={TrendingUp}
          iconColor="#39B7FF"
          iconBg="#E0F2FE"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashflowChart />
        <PayoutStatusChart />
      </div>

      <PendingPayoutsTable />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SmallStatCard
          title="Одобрено"
          value="0 ₽"
          subtitle="всего за период"
          icon={CheckCircle}
          iconColor="#10B981"
          iconBg="#D1FAE5"
        />
        <SmallStatCard
          title="Отклонено"
          value="0 ₽"
          subtitle="0% от всех выплат"
          icon={XCircle}
          iconColor="#EF4444"
          iconBg="#FEE2E2"
        />
        <SmallStatCard
          title="Avg время обработки"
          value="24 ч"
          subtitle="среднее за неделю"
          icon={Clock}
          iconColor="#39B7FF"
          iconBg="#E0F2FE"
        />
      </div>
    </div>
  );
}

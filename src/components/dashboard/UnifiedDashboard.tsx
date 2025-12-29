import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { CEOMissionControl } from './CEOMissionControl';
import { KPICard } from './KPICard';
import { ChartContainer } from './ChartContainer';
import { AlertsList } from './AlertsList';
import { DataTable } from './DataTable';
import { DashboardMode, PeriodOption, DashboardState, DashboardPayload, DashboardData, DASHBOARD_MODES } from './types';
import { getMockDashboardData } from '../../mock/dashboardMock';
import * as api from '../../utils/api';

interface UnifiedDashboardProps {
  currentUser: any;
}

export function UnifiedDashboard({ currentUser }: UnifiedDashboardProps) {
  const [currentMode, setCurrentMode] = useState<DashboardMode>('ceo');
  const [period, setPeriod] = useState<PeriodOption>(30);
  const [state, setState] = useState<DashboardState>('loading');
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const userRole = useMemo(() => {
    const role = currentUser?.role || currentUser?.роль || currentUser?.id || 'partner';
    return role.toLowerCase();
  }, [currentUser]);

  const allowedModes = useMemo(() => {
    if (userRole === 'ceo' || currentUser?.isAdmin) {
      return DASHBOARD_MODES;
    }
    return DASHBOARD_MODES.filter(mode => mode.allowedRoles.includes(userRole));
  }, [userRole, currentUser?.isAdmin]);

  useEffect(() => {
    if (allowedModes.length > 0 && !allowedModes.find(m => m.id === currentMode)) {
      setCurrentMode(allowedModes[0].id);
    }
  }, [allowedModes, currentMode]);

  useEffect(() => {
    loadDashboardData();
  }, [currentMode, period]);

  const loadDashboardData = async () => {
    setState('loading');
    setIsDemo(false);

    try {
      let payload: DashboardPayload | null = null;

      switch (currentMode) {
        case 'ceo':
          try {
            const [financeRes, usersRes] = await Promise.all([
              api.getAdminStats().catch(() => null),
              api.getAllUsers().catch(() => null)
            ]);

            if (financeRes?.success || usersRes?.success) {
              const users = usersRes?.users || [];
              payload = {
                kpis: [
                  { id: 'revenue', title: 'Выручка', value: financeRes?.stats?.totalRevenue || 0, prefix: '₽' },
                  { id: 'partners', title: 'Партнёров', value: users.length || financeRes?.stats?.totalUsers || 0 },
                  { id: 'orders', title: 'Заказов', value: financeRes?.stats?.totalOrders || 0 },
                  { id: 'balance', title: 'Общий баланс', value: financeRes?.stats?.totalBalance || 0, prefix: '₽' },
                ],
                charts: [],
                alerts: []
              };
            }
          } catch (e) {
            console.error('CEO data fetch error:', e);
          }
          break;

        case 'admin':
          try {
            const usersRes = await api.getAllUsers().catch(() => null);
            if (usersRes?.success) {
              const users = usersRes.users || [];
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              
              const newToday = users.filter((u: any) => {
                const regDate = new Date(u.зарегистрирован || u.createdAt || 0);
                return regDate >= today;
              }).length;
              
              const newThisMonth = users.filter((u: any) => {
                const regDate = new Date(u.зарегистрирован || u.createdAt || 0);
                return regDate >= thisMonth;
              }).length;

              payload = {
                kpis: [
                  { id: 'total_users', title: 'Всего пользователей', value: users.length },
                  { id: 'new_today', title: 'Новых сегодня', value: newToday },
                  { id: 'active_month', title: 'Новых за месяц', value: newThisMonth },
                ],
                charts: [],
                table: users.length > 0 ? {
                  columns: [
                    { key: 'id', title: 'ID' },
                    { key: 'имя', title: 'Имя' },
                    { key: 'email', title: 'Email' },
                  ],
                  rows: users.slice(0, 5).map((u: any) => ({
                    id: u.id,
                    имя: `${u.имя || ''} ${u.фамилия || ''}`.trim() || 'Без имени',
                    email: u.email || u.почта || '-'
                  }))
                } : undefined
              };
            }
          } catch (e) {
            console.error('Admin data fetch error:', e);
          }
          break;

        case 'finance':
          try {
            const financeRes = await api.getAdminStats().catch(() => null);
            if (financeRes?.success) {
              payload = {
                kpis: [
                  { id: 'total_balance', title: 'Общий баланс', value: financeRes.stats?.totalBalance || 0, prefix: '₽' },
                  { id: 'total_earnings', title: 'Всего начислений', value: financeRes.stats?.totalEarnings || 0, prefix: '₽' },
                  { id: 'total_revenue', title: 'Выручка', value: financeRes.stats?.totalRevenue || 0, prefix: '₽' },
                ],
                charts: []
              };
            }
          } catch (e) {
            console.error('Finance data fetch error:', e);
          }
          break;

        default:
          break;
      }

      if (!payload || (payload.kpis.length === 0 && !payload.table)) {
        payload = getMockDashboardData(currentMode, period);
        setIsDemo(true);
      }

      if (payload.kpis.length === 0 && payload.charts.length === 0 && !payload.table) {
        setState('empty');
      } else {
        setData(payload);
        setState('success');
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
      const fallback = getMockDashboardData(currentMode, period);
      setData(fallback);
      setIsDemo(true);
      setState('success');
    }
  };

  const handleModeChange = (mode: DashboardMode) => {
    setCurrentMode(mode);
  };

  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod);
  };

  const toDashboardData = (payload: DashboardPayload): DashboardData => ({
    kpis: payload.kpis,
    charts: payload.charts,
    tables: payload.table ? [payload.table] : [],
    alerts: payload.alerts || [],
  });

  const renderModeContent = () => {
    if (!data) return null;

    if (currentMode === 'ceo') {
      return <CEOMissionControl data={toDashboardData(data)} period={period} />;
    }

    return (
      <div className="space-y-6">
        {data.kpis.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {data.kpis.map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}

        {data.alerts && data.alerts.length > 0 && (
          <AlertsList alerts={data.alerts} />
        )}

        {data.charts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.charts.map(chart => (
              <ChartContainer key={chart.id} chart={chart} />
            ))}
          </div>
        )}

        {data.table && (
          <DataTable title="Последние записи" data={data.table} />
        )}
      </div>
    );
  };

  return (
    <DashboardLayout
      currentMode={currentMode}
      onModeChange={handleModeChange}
      allowedModes={allowedModes}
      period={period}
      onPeriodChange={handlePeriodChange}
      state={state}
      isDemo={isDemo}
    >
      {data && renderModeContent()}
    </DashboardLayout>
  );
}

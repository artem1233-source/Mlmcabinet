import { useState, useEffect } from 'react';
import * as api from '../../utils/api';

interface ExampleContainerProps {
  currentUser: any;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalRevenue: number;
}

export function ExampleContainer({ currentUser }: ExampleContainerProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getAdminStats();
      if (response.success) {
        setStats({
          totalUsers: response.stats?.totalUsers || 0,
          activeUsers: response.stats?.activeUsers || 0,
          newUsersToday: response.stats?.newUsersToday || 0,
          totalRevenue: response.stats?.totalRevenue || 0,
        });
      } else {
        setError('Failed to load stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU') + ' ₽';
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('ru-RU');
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
        <button onClick={loadData} className="ml-4 text-blue-500 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Example Container</h2>
      <p className="text-gray-600">
        This is an example Container component. Replace this with UI from Figma Make.
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold">{formatNumber(stats?.totalUsers || 0)}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
        </div>
      </div>
      
      <button 
        onClick={loadData}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Refresh
      </button>
    </div>
  );
}

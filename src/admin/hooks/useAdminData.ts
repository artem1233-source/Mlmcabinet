import { useState, useEffect } from 'react';
import * as api from '../../utils/api';

// Hook для получения данных Owner Dashboard
export function useOwnerDashboardData(period: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Получаем реальные данные из API
        const [users, orders, products] = await Promise.all([
          api.fetchAllUsers(),
          api.fetchOrders(),
          api.fetchProducts()
        ]);

        // Вычисляем KPI
        const activePartners = users.filter((u: any) => u.rank && u.rank > 0).length;
        const totalRevenue = orders.reduce((sum: number, order: any) => {
          if (order.status === 'delivered' || order.status === 'shipped') {
            return sum + (order.total || 0);
          }
          return sum;
        }, 0);

        // Считаем комиссии (из истории начислений)
        const totalCommissions = orders.reduce((sum: number, order: any) => {
          const d1 = order.commission_d1 || 0;
          const d2 = order.commission_d2 || 0;
          const d3 = order.commission_d3 || 0;
          return sum + d1 + d2 + d3;
        }, 0);

        // Frozen комиссии (заказы младше 30 дней)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const frozenCommissions = orders.reduce((sum: number, order: any) => {
          const orderDate = new Date(order.created_at);
          if (orderDate > thirtyDaysAgo) {
            const d1 = order.commission_d1 || 0;
            const d2 = order.commission_d2 || 0;
            const d3 = order.commission_d3 || 0;
            return sum + d1 + d2 + d3;
          }
          return sum;
        }, 0);

        // Pending выплаты (из балансов пользователей)
        const pendingPayouts = users.reduce((sum: number, user: any) => {
          return sum + (user.balance || 0);
        }, 0);

        setData({
          kpis: {
            revenue: totalRevenue,
            commissions: totalCommissions,
            frozen: frozenCommissions,
            payouts: pendingPayouts,
            partners: activePartners,
            orders: orders.length
          },
          users,
          orders,
          products
        });
      } catch (err) {
        console.error('Error fetching owner dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  return { data, loading, error };
}

// Hook для получения данных AdminOps Dashboard
export function useAdminOpsData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const users = await api.fetchAllUsers();
        
        const totalPartners = users.length;
        const activePartners = users.filter((u: any) => u.rank && u.rank > 0).length;
        const blockedPartners = users.filter((u: any) => u.is_blocked).length;
        
        // Новые партнёры за последние 30 дней
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newPartners = users.filter((u: any) => {
          const createdAt = new Date(u.created_at);
          return createdAt > thirtyDaysAgo;
        }).length;

        setData({
          kpis: {
            total: totalPartners,
            new: newPartners,
            active: activePartners,
            blocked: blockedPartners
          },
          users
        });
      } catch (err) {
        console.error('Error fetching admin ops data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

// Hook для получения данных Finance Dashboard
export function useFinanceData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [users, orders] = await Promise.all([
          api.fetchAllUsers(),
          api.fetchOrders()
        ]);

        // Запросы на выплаты (пользователи с балансом > 0)
        const payoutRequests = users
          .filter((u: any) => u.balance > 0)
          .map((u: any) => ({
            id: `P-${u.id}`,
            user: u.full_name || u.email,
            amount: u.balance,
            status: u.balance > 50000 ? 'processing' : 'pending',
            date: new Date().toISOString().split('T')[0],
            frozen: 0, // TODO: Вычислить frozen комиссии
            available: u.balance
          }));

        // Возвраты (заказы со статусом refund_*)
        const refundRequests = orders
          .filter((o: any) => o.status?.includes('refund'))
          .map((o: any) => ({
            id: `R-${o.id}`,
            order: o.id,
            customer: o.customer_name || 'Неизвестно',
            amount: o.total || 0,
            type: 'full',
            status: o.status === 'refund_requested' ? 'requested' : 'processing',
            daysLeft: 14,
            hasFrozenCommissions: true
          }));

        const pendingPayouts = payoutRequests.reduce((sum, p) => sum + (p.status === 'pending' ? p.amount : 0), 0);
        const processingPayouts = payoutRequests.reduce((sum, p) => sum + (p.status === 'processing' ? p.amount : 0), 0);
        
        // Выплачено за период (нужен audit log)
        const completedPayouts = 0; // TODO: Из истории транзакций
        
        // Возвраты за период
        const totalRefunds = refundRequests.reduce((sum, r) => sum + r.amount, 0);

        setData({
          kpis: {
            pending: pendingPayouts,
            processing: processingPayouts,
            completed: completedPayouts,
            refunds: totalRefunds
          },
          payoutRequests,
          refundRequests
        });
      } catch (err) {
        console.error('Error fetching finance data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

// Hook для получения данных Warehouse Dashboard
export function useWarehouseData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [orders, products] = await Promise.all([
          api.fetchOrders(),
          api.fetchProducts()
        ]);

        // Фильтруем заказы по складским статусам
        const pickingOrders = orders.filter((o: any) => o.status === 'picking').length;
        const packedOrders = orders.filter((o: any) => o.status === 'packed').length;
        const shippedOrders = orders.filter((o: any) => o.status === 'shipped').length;
        const issueOrders = orders.filter((o: any) => o.status === 'address_issue').length;

        // Остатки товаров
        const stockItems = products.map((p: any) => ({
          name: p.name,
          qty: p.stock_quantity || 0,
          lowStock: (p.stock_quantity || 0) < 10
        }));

        // Форматируем заказы для таблицы
        const formattedOrders = orders
          .filter((o: any) => ['picking', 'packed', 'shipped', 'address_issue'].includes(o.status))
          .map((o: any) => ({
            id: o.id,
            customer: o.customer_name || 'Неизвестно',
            phone: o.customer_phone || '-',
            address: o.delivery_address || '-',
            product: o.items?.[0]?.name || 'Товар',
            status: o.status,
            track: o.track_number || ''
          }));

        setData({
          kpis: {
            picking: pickingOrders,
            packed: packedOrders,
            shipped: shippedOrders,
            issues: issueOrders
          },
          orders: formattedOrders,
          stockItems
        });
      } catch (err) {
        console.error('Error fetching warehouse data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

// Hook для получения заказов по роли
export function useRoleOrders(role: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const orders = await api.fetchOrders();
        
        // Фильтруем заказы в зависимости от роли
        let filteredOrders = orders;
        
        if (role === 'Warehouse') {
          filteredOrders = orders.filter((o: any) => 
            ['picking', 'packed', 'shipped', 'address_issue'].includes(o.status)
          );
        } else if (role === 'Finance') {
          filteredOrders = orders.filter((o: any) => 
            o.status?.includes('refund') || o.status === 'paid' || o.status === 'payment_failed'
          );
        } else if (role === 'Support') {
          filteredOrders = orders.filter((o: any) => 
            o.status?.includes('refund') || o.status === 'address_issue' || o.status === 'cancelled'
          );
        }
        
        setData(filteredOrders);
      } catch (err) {
        console.error('Error fetching role orders:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role]);

  return { data, loading, error };
}

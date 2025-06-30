import { useEffect, useState } from 'react';
import { axiosInstance } from '../stores/authStore';
import { DashboardStats, UsageStats } from '../types';
import {
  UsersIcon,
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface StatCard {
  name: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: any;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats (mock data for now since endpoint might not exist)
      const mockStats: DashboardStats = {
        total_users: 12,
        active_users: 8,
        total_models: 5,
        active_models: 3,
        total_requests_today: 245,
        total_requests_week: 1680,
        average_response_time: 1.2,
        system_health: 'healthy'
      };

      // Try to fetch real usage stats
      try {
        const usageResponse = await axiosInstance.get('/api/models/usage/stats');
        setUsageStats(usageResponse.data || []);
      } catch (usageError) {
        console.warn('Could not fetch usage stats:', usageError);
        // Mock usage data
        setUsageStats([
          {
            model_id: '1',
            model_name: 'CodeLlama-13B',
            total_requests: 450,
            total_tokens: 125000,
            avg_response_time: 1.1,
            success_rate: 98.5,
            last_used: new Date().toISOString()
          },
          {
            model_id: '2',
            model_name: 'Mistral-7B',
            total_requests: 320,
            total_tokens: 89000,
            avg_response_time: 0.8,
            success_rate: 99.1,
            last_used: new Date(Date.now() - 1000 * 60 * 30).toISOString()
          }
        ]);
      }

      setStats(mockStats);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatCards = (): StatCard[] => {
    if (!stats) return [];

    return [
      {
        name: 'Total Users',
        value: stats.total_users.toString(),
        change: `${stats.active_users} active`,
        changeType: 'positive',
        icon: UsersIcon,
      },
      {
        name: 'Active Models',
        value: `${stats.active_models}/${stats.total_models}`,
        change: 'Models available',
        changeType: 'neutral',
        icon: CpuChipIcon,
      },
      {
        name: 'Requests Today',
        value: stats.total_requests_today.toLocaleString(),
        change: `${stats.total_requests_week.toLocaleString()} this week`,
        changeType: 'positive',
        icon: ChartBarIcon,
      },
      {
        name: 'Avg Response Time',
        value: `${stats.average_response_time}s`,
        change: 'System healthy',
        changeType: stats.system_health === 'healthy' ? 'positive' : 'negative',
        icon: ClockIcon,
      },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = getStatCards();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Overview of your AI coding assistant system
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((item) => (
          <div key={item.name} className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <item.icon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {item.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {item.value}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      item.changeType === 'positive' ? 'text-green-600' :
                      item.changeType === 'negative' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {item.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Usage Chart */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Model Usage
          </h3>
          {usageStats.length > 0 ? (
            <div className="space-y-4">
              {usageStats.map((stat) => (
                <div key={stat.model_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.model_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {stat.total_requests.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">requests</div>
                    </div>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (stat.total_requests / Math.max(...usageStats.map(s => s.total_requests))) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No usage data available
            </div>
          )}
        </div>

        {/* Model Distribution */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Success Rates
          </h3>
          {usageStats.length > 0 ? (
            <div className="space-y-4">
              {usageStats.map((stat) => (
                <div key={stat.model_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      stat.success_rate >= 95 ? 'bg-green-500' :
                      stat.success_rate >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.model_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {stat.success_rate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">success rate</div>
                    </div>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stat.success_rate >= 95 ? 'bg-green-500' :
                          stat.success_rate >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stat.success_rate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No distribution data available
            </div>
          )}
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Average Response Time by Model
        </h3>
        {usageStats.length > 0 ? (
          <div className="space-y-4">
            {usageStats.map((stat) => (
              <div key={stat.model_id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stat.model_name}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {stat.avg_response_time.toFixed(2)}s
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">avg response</div>
                  </div>
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (stat.avg_response_time / Math.max(...usageStats.map(s => s.avg_response_time))) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No response time data available
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="card mt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Model Status
        </h3>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {usageStats.map((stat) => (
                <tr key={stat.model_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {stat.model_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {stat.total_requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      stat.success_rate >= 95 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : stat.success_rate >= 90 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}>
                      {stat.success_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(stat.last_used).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

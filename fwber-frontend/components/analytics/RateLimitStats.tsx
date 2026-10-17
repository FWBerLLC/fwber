'use client';

import { useState } from 'react';
import { useRateLimitStatistics } from '@/lib/hooks/use-admin-analytics';
import type { RateLimitTimeframe } from '@/lib/api/types';
import { exportRateLimitStatsToCSV } from '@/lib/utils/csv-export';

export default function RateLimitStats() {
  const [timeframe, setTimeframe] = useState<RateLimitTimeframe>('1h');

  const { data, isLoading: loading, error: queryError, refetch: fetchStats } = useRateLimitStatistics(
    timeframe,
    { refetchInterval: 60000 } // Refresh every minute
  );

  // Extract statistics from the response
  const stats = data?.statistics ?? null;
  const error = queryError ? (queryError as Error).message : null;

  if (loading && !stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-red-600 flex items-center space-x-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
        <button type="button" 
          onClick={() => fetchStats()}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">🚦 Rate Limit Statistics</h2>
          <p className="text-sm text-gray-500">System-wide rate limiting metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            aria-label="Select timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as RateLimitTimeframe)}
            className="text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
          </select>
          <button type="button"
            onClick={() => exportRateLimitStatsToCSV(stats)}
            className="p-2 text-green-600 hover:text-green-800"
            title="Export CSV"
          >
            📥
          </button>
          <button type="button"
            onClick={() => fetchStats()}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Active Buckets</p>
          <p className="text-2xl font-bold text-blue-900">{stats.total_keys}</p>
          <p className="text-xs text-blue-500 mt-1">Users currently tracked</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Monitored Actions</p>
          <p className="text-2xl font-bold text-purple-900">{Object.keys(stats.actions).length}</p>
          <p className="text-xs text-purple-500 mt-1">Distinct action types</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">System Status</p>
          <p className="text-2xl font-bold text-green-900">Healthy</p>
          <p className="text-xs text-green-500 mt-1">Rate limiting active</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Users</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refill Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Burst</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
            {Object.entries(stats.actions).map(([action, data]) => (
              <tr key={action}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                    {action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {data.active_buckets}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.config.capacity} reqs
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.config.refill_rate}/sec
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.config.burst_allowance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

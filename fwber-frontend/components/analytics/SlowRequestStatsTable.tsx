'use client';

import { useSlowRequestStats } from '@/lib/hooks/use-admin-analytics';
import { formatDistanceToNow } from 'date-fns';

export default function SlowRequestStatsTable() {
  const { data: stats, isLoading, error } = useSlowRequestStats();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">📊 Slow Request Stats</h2>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted dark:bg-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">📊 Slow Request Stats</h2>
        <p className="mt-2 text-sm text-red-600">Failed to load slow request stats.</p>
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">📊 Slow Request Stats</h2>
        <p className="mt-2 text-sm text-muted-foreground">No aggregated stats available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">📊 Slow Request Stats</h2>
        <span className="text-xs text-muted-foreground">Aggregated by Route</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Route / Action</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Count</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Duration</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Duration</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Queries</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Memory</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-card dark:bg-card">
            {stats.map((stat, index) => (
              <tr key={index} className="hover:bg-muted dark:bg-background">
                <td className="px-3 py-2 text-sm text-foreground dark:text-foreground">
                  <div className="font-medium">{stat.route_name || 'Unknown Route'}</div>
                  <div className="text-xs text-muted-foreground">{stat.action || 'Unknown Action'}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-foreground dark:text-foreground">
                  {stat.count}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-foreground dark:text-foreground font-mono">
                  {(stat.avg_duration / 1000).toFixed(2)}s
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-foreground dark:text-foreground font-mono">
                  {(stat.max_duration / 1000).toFixed(2)}s
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-foreground dark:text-foreground font-mono">
                  {stat.avg_queries ? Math.round(stat.avg_queries) : '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-foreground dark:text-foreground font-mono">
                  {stat.avg_memory ? `${(stat.avg_memory / 1024).toFixed(1)} MB` : '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(stat.last_occurrence), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

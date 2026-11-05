'use client';

import { useSlowRequests } from '@/lib/hooks/use-admin-analytics';
import { formatDistanceToNow } from 'date-fns';

export default function SlowRequestsTable() {
  const { data: slowRequests, isLoading, error } = useSlowRequests();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🐢 Slow Requests</h2>
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
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🐢 Slow Requests</h2>
        <p className="mt-2 text-sm text-red-600">Failed to load slow requests.</p>
      </div>
    );
  }

  if (!slowRequests || slowRequests.length === 0) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🐢 Slow Requests</h2>
        <p className="mt-2 text-sm text-muted-foreground">No slow requests detected recently. Great job!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🐢 Slow Requests</h2>
        <span className="text-xs text-muted-foreground">Last 24h (&gt;1000ms)</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-card dark:bg-card">
            {slowRequests.map((req) => (
              <tr key={req.id} className="hover:bg-muted dark:bg-background">
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-foreground dark:text-foreground">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    req.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                    req.method === 'POST' ? 'bg-green-100 text-green-800' :
                    req.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    req.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                    'bg-muted text-foreground'
                  }`}>
                    {req.method}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground max-w-xs truncate" title={req.url}>
                  {req.url}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-foreground dark:text-foreground font-mono">
                  {(req.duration_ms / 1000).toFixed(2)}s
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center text-sm">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    req.status_code >= 500 ? 'bg-red-100 text-red-800' :
                    req.status_code >= 400 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {req.status_code}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(req.occurred_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

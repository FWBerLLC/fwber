'use client';

import { useBoostAnalytics } from '@/lib/hooks/use-admin-analytics';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

export default function BoostAnalytics() {
  const { data: stats, isLoading, error } = useBoostAnalytics();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🚀 Boost Analytics</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted dark:bg-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🚀 Boost Analytics</h2>
        <p className="mt-4 text-sm text-red-600">Failed to load boost analytics.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🚀 Boost Analytics</h2>
      
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-indigo-50 p-4">
          <p className="text-sm text-indigo-600">Active Boosts</p>
          <p className="mt-2 text-3xl font-semibold text-indigo-900">
            {stats.active_total}
          </p>
          <div className="mt-1 flex gap-2 text-xs text-indigo-500">
            <span>Standard: {stats.active_standard}</span>
            <span>Super: {stats.active_super}</span>
          </div>
        </div>

        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Revenue Today</p>
          <p className="mt-2 text-3xl font-semibold text-green-900">
            {formatCurrency(stats.revenue_today)}
          </p>
        </div>

        <div className="rounded-lg bg-emerald-50 p-4">
          <p className="text-sm text-emerald-600">Total Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">
            {formatCurrency(stats.revenue_total)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-foreground dark:text-foreground">Recent Purchases</h3>
        <div className="mt-4 overflow-hidden rounded-lg border border-border dark:border-border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-muted dark:bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-card dark:bg-card">
              {stats.recent_purchases.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-muted-foreground">
                    No recent purchases found.
                  </td>
                </tr>
              ) : (
                stats.recent_purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground dark:text-foreground">
                      {purchase.user?.name || 'Unknown User'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {formatCurrency(purchase.amount)} {purchase.currency}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        purchase.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {new Date(purchase.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

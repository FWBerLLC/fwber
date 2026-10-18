'use client';

import { useSlowRequestAnalysis } from '@/lib/hooks/use-admin-analytics';

export default function SlowRequestAnalysis() {
  const { data: analysis, isLoading, error } = useSlowRequestAnalysis();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🔍 Performance Insights</h2>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-muted dark:bg-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🔍 Performance Insights</h2>
        <p className="mt-2 text-sm text-red-600">Failed to load analysis.</p>
      </div>
    );
  }

  if (!analysis || analysis.length === 0) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🔍 Performance Insights</h2>
        <p className="mt-2 text-sm text-muted-foreground">No critical performance issues detected.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🔍 Performance Insights</h2>
        <span className="text-xs text-muted-foreground">Actionable Recommendations</span>
      </div>
      <div className="mt-4 space-y-4">
        {analysis.map((insight, index) => (
          <div key={index} className="rounded-md border border-red-100 bg-red-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  {insight.endpoint} <span className="text-xs font-normal text-red-600">({insight.method})</span>
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {insight.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                  Impact: {Math.round(insight.impact_score).toLocaleString()}
                </span>
              </div>
            </div>
            
            {insight.sample_slow_queries && insight.sample_slow_queries.length > 0 && (
              <div className="mt-4 border-t border-red-100 pt-3">
                <p className="text-xs font-semibold text-red-800 mb-2">Slowest Query Sample:</p>
                <div className="bg-gray-900 rounded p-3 overflow-x-auto">
                  <code className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                    {insight.sample_slow_queries[0].sql}
                  </code>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Time: {insight.sample_slow_queries[0].time.toFixed(2)}ms</span>
                    <span>Connection: {insight.sample_slow_queries[0].connection}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

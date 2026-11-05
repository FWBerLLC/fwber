'use client';

import { useMemo, useState } from 'react';
import RateLimitStats from '@/components/analytics/RateLimitStats';
import SlowRequestsTable from '@/components/analytics/SlowRequestsTable';
import SlowRequestStatsTable from '@/components/analytics/SlowRequestStatsTable';
import SlowRequestAnalysis from '@/components/analytics/SlowRequestAnalysis';
import type { AnalyticsRange, PlatformAnalyticsResponse } from '@/lib/api/types';
import {
  useModerationInsights,
  usePlatformAnalytics,
  useRealtimeMetrics,
} from '@/lib/hooks/use-admin-analytics';
import { useSystemHealth } from '@/lib/hooks/use-config';
import { exportAllAnalyticsToCSV, exportPlatformAnalyticsToCSV } from '@/lib/utils/csv-export';
import BoostAnalytics from '@/components/analytics/BoostAnalytics';
import FeedbackStats from '@/components/analytics/FeedbackStats';
import { RetentionTable } from '@/components/analytics/RetentionTable';
import FailedJobsTable from '@/components/analytics/FailedJobsTable';
import './analytics-progress.css';

const RANGE_OPTIONS: Array<{ label: string; value: AnalyticsRange }> = [
  { label: '24h', value: '1d' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

const numberFormatter = new Intl.NumberFormat('en-US');

const formatNumber = (value?: number) =>
  typeof value === 'number' ? numberFormatter.format(value) : '—';

const formatPercent = (value?: number) =>
  typeof value === 'number' ? `${value.toFixed(1)}%` : '—';

function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`analytics-skeleton-${index}`} className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

const moderationKeys = ['approved', 'flagged', 'rejected', 'pending_review'] as const;

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('7d');

  const platformQuery = usePlatformAnalytics(range);
  const realtimeQuery = useRealtimeMetrics();
  const moderationQuery = useModerationInsights();
  const healthQuery = useSystemHealth();

  const analytics = platformQuery.data;
  const realtimeMetrics = realtimeQuery.data;
  const moderationInsights = moderationQuery.data;
  const systemHealth = healthQuery.data;

  const hourlyMaxMessages = useMemo(() => {
    if (!analytics?.trends?.hourly_activity?.length) {
      return 1;
    }

    return Math.max(...analytics.trends.hourly_activity.map((entry) => entry.messages), 1);
  }, [analytics]);

  const topCategoryMax = useMemo(() => {
    if (!analytics?.trends?.top_categories?.length) {
      return 1;
    }

    return Math.max(...analytics.trends.top_categories.map((entry) => entry.count), 1);
  }, [analytics]);

  const mostActiveAreas = analytics?.locations?.most_active ?? [];
  const analyticsError = platformQuery.error as Error | null;
  const loadingPlatform = platformQuery.isLoading && !analytics;

  if (analyticsError) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-800">Unable to load analytics</h1>
          <p className="mt-2 text-sm text-red-700">
            {analyticsError.message ?? 'An unexpected error occurred while requesting analytics.'}
          </p>
          <button type="button"
            onClick={() => platformQuery.refetch()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Admin Observatory</p>
          <h1 className="text-3xl font-semibold text-foreground dark:text-foreground">Platform Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unified snapshot of growth, engagement, and operational health.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-muted dark:bg-card p-1 text-sm font-medium">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-full px-3 py-1 ${
                  option.value === range
                    ? 'bg-card text-foreground dark:text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground dark:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => platformQuery.refetch()}
            disabled={platformQuery.isFetching}
            className="rounded-md border border-border dark:border-border px-4 py-2 text-sm font-medium text-foreground dark:text-muted-foreground hover:bg-muted dark:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {platformQuery.isFetching ? 'Refreshing…' : 'Refresh data'}
          </button>
          {analytics && (
            <button
              type="button"
              onClick={() => exportAllAnalyticsToCSV(analytics, moderationInsights ?? null, range)}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
            >
              📥 Export CSV
            </button>
          )}
        </div>

        </div>

        {analytics ? (
          <AnalyticsOverview
            analytics={analytics}
            hourlyMaxMessages={hourlyMaxMessages}
            topCategoryMax={topCategoryMax}
            mostActiveAreas={mostActiveAreas}
          />
        ) : (
          <AnalyticsSkeleton />
        )}

      <RetentionTable />

      {analytics?.feedback && <FeedbackStats stats={analytics.feedback} />}

      <BoostAnalytics />

      <RateLimitStats />
      <SlowRequestsTable />
      <SlowRequestStatsTable />
      <SlowRequestAnalysis />

      {/* System Health Status */}
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🩺 System Health</h2>
            <p className="text-sm text-muted-foreground">Backend services and infrastructure status</p>
          </div>
          {healthQuery.isFetching && <span className="text-xs text-muted-foreground">Checking…</span>}
        </div>
        {systemHealth ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Overall Status */}
            <div className={`rounded-lg p-4 text-center ${
              systemHealth.status === 'healthy' ? 'bg-green-50' : 
              systemHealth.status === 'degraded' ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <p className={`text-sm ${
                systemHealth.status === 'healthy' ? 'text-green-600' : 
                systemHealth.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
              }`}>Overall Status</p>
              <p className={`mt-2 text-2xl font-semibold capitalize ${
                systemHealth.status === 'healthy' ? 'text-green-900' : 
                systemHealth.status === 'degraded' ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {systemHealth.status === 'healthy' ? '✓ Healthy' : 
                 systemHealth.status === 'degraded' ? '⚠ Degraded' : '✕ Unhealthy'}
              </p>
            </div>

            {/* Database */}
            <div className={`rounded-lg p-4 text-center ${
              systemHealth.services?.database === 'up' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className={`text-sm ${
                systemHealth.services?.database === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>Database</p>
              <p className={`mt-2 text-2xl font-semibold ${
                systemHealth.services?.database === 'up' ? 'text-green-900' : 'text-red-900'
              }`}>
                {systemHealth.services?.database === 'up' ? '✓ Connected' : '✕ Down'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">MySQL/PostgreSQL</p>
            </div>

            {/* Cache */}
            <div className={`rounded-lg p-4 text-center ${
              systemHealth.services?.cache === 'up' ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              <p className={`text-sm ${
                systemHealth.services?.cache === 'up' ? 'text-green-600' : 'text-yellow-600'
              }`}>Cache</p>
              <p className={`mt-2 text-2xl font-semibold ${
                systemHealth.services?.cache === 'up' ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {systemHealth.services?.cache === 'up' ? '✓ Connected' : '⚠ Unavailable'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Redis</p>
            </div>

            {/* Mercure */}
            <div className={`rounded-lg p-4 text-center ${
              systemHealth.services?.reverb === 'up' ? 'bg-green-50' : 
              systemHealth.services?.reverb === 'down' ? 'bg-red-50' : 'bg-muted'
            }`}>
              <p className={`text-sm ${
                systemHealth.services?.reverb === 'up' ? 'text-green-600' : 
                systemHealth.services?.reverb === 'down' ? 'text-red-600' : 'text-muted-foreground'
              }`}>Reverb Hub</p>
              <p className={`mt-2 text-2xl font-semibold ${
                systemHealth.services?.reverb === 'up' ? 'text-green-900' : 
                systemHealth.services?.reverb === 'down' ? 'text-red-900' : 'text-foreground dark:text-foreground'
              }`}>
                {systemHealth.services?.reverb === 'up' ? '✓ Connected' : 
                 systemHealth.services?.reverb === 'down' ? '✕ Down' : '— N/A'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Real-time events</p>
            </div>
          </div>
        ) : healthQuery.isLoading ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`health-skeleton-${i}`} className="h-24 animate-pulse rounded-lg bg-muted dark:bg-card" />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-muted dark:bg-background p-4 text-center">
            <p className="text-sm text-muted-foreground">Health data unavailable.</p>
            <button type="button"
              onClick={() => healthQuery.refetch()}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <FailedJobsTable />

      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🔌 Live System Signals</h2>
            <p className="text-sm text-muted-foreground">Real-time Reverb + infra health</p>
          </div>
          {realtimeQuery.isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
        </div>
        {realtimeMetrics ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-sm text-blue-600">Active Connections</p>
              <p className="mt-2 text-3xl font-semibold text-blue-900">
                {formatNumber(realtimeMetrics.active_connections)}
              </p>
              <p className="text-xs text-blue-500">Reverb/WebSocket sessions</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-sm text-green-600">Messages / Minute</p>
              <p className="mt-2 text-3xl font-semibold text-green-900">
                {formatNumber(realtimeMetrics.messages_per_minute)}
              </p>
              <p className="text-xs text-green-500">Chatrooms + DMs</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 text-center">
              <p className="text-sm text-purple-600">System Load</p>
              <p className="mt-2 text-3xl font-semibold text-purple-900">
                {formatNumber(realtimeMetrics.system_load)}%
              </p>
              <p className="text-xs text-purple-500">Avg utilization</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
                Realtime metrics unavailable. Check Reverb/API health.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🧹 Moderation Insights</h2>
        {moderationQuery.isLoading && !moderationInsights ? (
          <div className="mt-4 h-24 animate-pulse rounded-lg bg-muted dark:bg-card" />
        ) : moderationInsights ? (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-sm text-blue-600">AI Accuracy</p>
                <p className="mt-2 text-3xl font-semibold text-blue-900">
                  {formatPercent(moderationInsights.ai_accuracy)}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-sm text-green-600">Human Review Rate</p>
                <p className="mt-2 text-3xl font-semibold text-green-900">
                  {formatPercent(moderationInsights.human_review_rate)}
                </p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4 text-center">
                <p className="text-sm text-yellow-600">False Positive Rate</p>
                <p className="mt-2 text-3xl font-semibold text-yellow-900">
                  {formatPercent(moderationInsights.false_positive_rate)}
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-sm text-purple-600">Avg Review Time</p>
                <p className="mt-2 text-3xl font-semibold text-purple-900">
                  {moderationInsights.average_review_time}s
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground dark:text-foreground">Top flagged categories</h3>
              <div className="mt-3 space-y-2">
                {moderationInsights.top_flagged_categories.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between rounded-lg bg-muted dark:bg-background px-4 py-2"
                  >
                    <span className="text-sm text-muted-foreground">{item.category}</span>
                    <span className="text-sm font-medium text-foreground dark:text-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Moderation insights will appear once the backend exposes data.
          </p>
        )}
      </div>
    </div>
  );
}

interface AnalyticsOverviewProps {
  analytics: PlatformAnalyticsResponse;
  hourlyMaxMessages: number;
  topCategoryMax: number;
  mostActiveAreas: PlatformAnalyticsResponse['locations']['most_active'];
}

type ProgressColor = 'blue' | 'green' | 'purple' | 'orange';

interface ValueProgressProps {
  value: number;
  max: number;
  color?: ProgressColor;
  label?: string;
}

function ValueProgress({ value, max, color = 'blue', label }: ValueProgressProps) {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(Math.max(value, 0), safeMax);

  return (
    <progress
      className={`analytics-progress ${color}`}
      value={safeValue}
      max={safeMax}
      aria-label={label}
    >
      {Math.round((safeValue / safeMax) * 100)}%
    </progress>
  );
}

function AnalyticsOverview({
  analytics,
  hourlyMaxMessages,
  topCategoryMax,
  mostActiveAreas,
}: AnalyticsOverviewProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Users</p>
          <p className="mt-3 text-3xl font-semibold text-foreground dark:text-foreground">
            {formatNumber(analytics.users.total)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPercent(analytics.users.growth_rate)} vs prior period
          </p>
        </div>
        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Active Users</p>
          <p className="mt-3 text-3xl font-semibold text-foreground dark:text-foreground">
            {formatNumber(analytics.users.active)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatNumber(analytics.users.new_today)} new in last 24h
          </p>
        </div>
        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Messages</p>
          <p className="mt-3 text-3xl font-semibold text-foreground dark:text-foreground">
            {formatNumber(analytics.messages.total)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatNumber(analytics.messages.average_per_user)} per user
          </p>
        </div>
        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Flagged Content</p>
          <p className="mt-3 text-3xl font-semibold text-foreground dark:text-foreground">
            {formatNumber(analytics.messages.moderation_stats.flagged)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pending {formatNumber(analytics.messages.moderation_stats.pending_review)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">User Activity</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active vs Total</p>
                <p className="text-lg font-medium text-foreground dark:text-foreground">
                  {formatNumber(analytics.users.active)} / {formatNumber(analytics.users.total)}
                </p>
              </div>
              <span className="text-sm text-green-600">
                {formatPercent(analytics.users.growth_rate)} growth
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">New users today</p>
              <div className="mt-2">
                <ValueProgress
                  value={analytics.users.new_today}
                  max={Math.max(analytics.users.total, 1)}
                  color="blue"
                  label="New users today"
                />
              </div>
              <p className="mt-1 text-sm font-medium text-foreground dark:text-muted-foreground">
                {formatNumber(analytics.users.new_today)} joined
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">Moderation Stats</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {moderationKeys.map((key) => (
              <div key={key} className="rounded-lg bg-muted dark:bg-background p-4">
                <p className="text-sm text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                <p className="text-2xl font-semibold text-foreground dark:text-foreground">
                  {formatNumber(analytics.messages.moderation_stats[key])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground dark:text-foreground">📈 Hourly Activity</h2>
            <span className="text-xs text-muted-foreground">UTC</span>
          </div>
          <div className="mt-4 space-y-2">
            {analytics.trends.hourly_activity.map((hour) => (
              <div key={`hour-${hour.hour}`} className="flex items-center gap-4">
                <span className="w-12 text-sm text-muted-foreground">{hour.hour}:00</span>
                <div className="flex-1">
                  <ValueProgress
                    value={hour.messages}
                    max={hourlyMaxMessages}
                    color="blue"
                    label={`Messages at ${hour.hour}:00`}
                  />
                </div>
                <span className="w-12 text-right text-sm font-medium text-foreground dark:text-foreground">{hour.messages}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🏷️ Top Categories</h2>
          <div className="mt-4 space-y-3">
            {analytics.trends.top_categories.map((category) => (
              <div key={category.category} className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{category.category}</span>
                <div className="flex flex-1 items-center gap-3">
                  <ValueProgress
                    value={category.count}
                    max={topCategoryMax}
                    color="green"
                    label={`${category.category} share`}
                  />
                  <span className="text-sm font-medium text-foreground dark:text-foreground">{category.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">🌍 Active Areas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {analytics.locations.active_areas} hot zones · coverage radius {analytics.locations.coverage_radius}km
          </p>
          <div className="mt-4 space-y-3">
            {mostActiveAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active areas detected for this range.</p>
            ) : (
              mostActiveAreas.map((area, index) => (
                <div
                  key={`${area.name}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-muted dark:bg-background p-4"
                >
                  <div>
                    <p className="font-medium text-foreground dark:text-foreground">{area.name}</p>
                    <p className="text-sm text-muted-foreground">{area.active_users} active users</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground dark:text-foreground">{area.message_count}</p>
                    <p className="text-xs text-muted-foreground">messages</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">⚙️ Performance</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-600">API Latency</p>
              <p className="text-2xl font-semibold text-blue-900">
                {analytics.performance.api_response_time} ms
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-sm text-purple-600">SSE Connections</p>
              <p className="text-2xl font-semibold text-purple-900">
                {formatNumber(analytics.performance.sse_connections)}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-600">Cache Hit Rate</p>
              <p className="text-2xl font-semibold text-green-900">
                {formatPercent(analytics.performance.cache_hit_rate)}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-600">Error Rate</p>
              <p className="text-2xl font-semibold text-red-900">
                {formatPercent(analytics.performance.error_rate)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


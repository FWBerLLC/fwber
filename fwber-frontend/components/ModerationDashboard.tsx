"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  useModerationDashboard,
  useFlaggedContent,
  useSpoofDetections,
  useThrottles,
  useActions,
  useReviewFlagMutation,
  useReviewSpoofMutation,
  useRemoveThrottleMutation,
  useUserModerationProfile,
} from '@/lib/hooks/use-moderation';
import { ShieldAlert, Flag, Gauge, Ban, CheckCircle2, Trash2, Zap, User, X, AlertTriangle, Clock, RefreshCw, Cpu } from 'lucide-react';

type Tab = 'flagged' | 'spoofs' | 'throttles' | 'actions' | 'autonomous';

export default function ModerationDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('flagged');
  const [flaggedPage, setFlaggedPage] = useState(1);
  const [spoofsPage, setSpoofsPage] = useState(1);
  const [throttlesPage, setThrottlesPage] = useState(1);
  const [actionsPage, setActionsPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const dashboard = useModerationDashboard(token);
  const flagged = useFlaggedContent(flaggedPage, token);
  const spoofs = useSpoofDetections(spoofsPage, token);
  const throttles = useThrottles(throttlesPage, token);
  const actions = useActions(actionsPage, token);
  const userProfile = useUserModerationProfile(selectedUserId, token);

  const reviewFlag = useReviewFlagMutation();
  const reviewSpoof = useReviewSpoofMutation();
  const removeThrottle = useRemoveThrottleMutation();

  if (!token) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold">Moderator access required</h2>
        <p className="text-muted-foreground">Log in with a moderator account to view the dashboard.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'flagged', label: 'Flagged Content', icon: <Flag className="h-4 w-4" />, count: dashboard.data?.stats.flagged_artifacts },
    { id: 'spoofs', label: 'Geo-Spoofs', icon: <Zap className="h-4 w-4" />, count: dashboard.data?.stats.pending_spoof_detections },
    { id: 'throttles', label: 'Throttles', icon: <Gauge className="h-4 w-4" />, count: dashboard.data?.stats.active_throttles },
    { id: 'actions', label: 'Actions', icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 'autonomous', label: 'Autonomous Monitor', icon: <Cpu className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-purple-600" /> Moderation Dashboard
        </h1>
        <button type="button"
          onClick={() => dashboard.refetch()}
          disabled={dashboard.isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground dark:text-muted-foreground bg-card dark:bg-card border rounded-lg hover:bg-muted dark:bg-background disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${dashboard.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Flagged Posts" value={dashboard.data?.stats.flagged_artifacts ?? '—'} icon={<Flag className="h-5 w-5 text-red-500" />} variant="danger" />
        <StatCard label="Active Throttles" value={dashboard.data?.stats.active_throttles ?? '—'} icon={<Gauge className="h-5 w-5 text-yellow-500" />} variant="warning" />
        <StatCard label="High-Risk Spoofs" value={dashboard.data?.stats.pending_spoof_detections ?? '—'} icon={<Zap className="h-5 w-5 text-orange-500" />} variant="warning" />
        <StatCard label="Actions Today" value={dashboard.data?.stats.moderation_actions_today ?? '—'} icon={<CheckCircle2 className="h-5 w-5 text-green-500" />} variant="success" />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border dark:border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-purple-100 text-purple-600' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-card dark:bg-card border rounded-lg shadow-sm">
        {activeTab === 'flagged' && (
          <FlaggedContentPanel
            data={flagged.data as any}
            isLoading={flagged.isLoading}
            page={flaggedPage}
            setPage={setFlaggedPage}
            onReview={(artifactId, action, reason, extras) => 
              reviewFlag.mutate({ artifactId, payload: { action, reason, ...extras }, token: token! })
            }
            onViewUser={setSelectedUserId}
            isPending={reviewFlag.isPending}
          />
        )}
        {activeTab === 'spoofs' && (
          <SpoofDetectionsPanel
            data={spoofs.data as any}
            isLoading={spoofs.isLoading}
            page={spoofsPage}
            setPage={setSpoofsPage}
            onReview={(detectionId, action, reason, applyThrottle) =>
              reviewSpoof.mutate({ detectionId, payload: { action, reason, apply_throttle: applyThrottle }, token: token! })
            }
            onViewUser={setSelectedUserId}
            isPending={reviewSpoof.isPending}
          />
        )}
        {activeTab === 'throttles' && (
          <ThrottlesPanel
            data={throttles.data as any}
            isLoading={throttles.isLoading}
            page={throttlesPage}
            setPage={setThrottlesPage}
            onRemove={(throttleId) => removeThrottle.mutate({ throttleId, token: token! })}
            onViewUser={setSelectedUserId}
            isPending={removeThrottle.isPending}
          />
        )}
        {activeTab === 'actions' && (
          <ActionsPanel
            data={dashboard.data?.recent_actions ?? []}
            isLoading={dashboard.isLoading}
            page={actionsPage}
            setPage={setActionsPage}
            onViewUser={setSelectedUserId}
          />
        )}
        {activeTab === 'autonomous' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" /> Autonomous Execution Protocol
              </h3>
              <a
                href="/admin/monitoring"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                Open Full Monitor
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              The autonomous protocol is managing dependency synchronization, versioning, and branch reconciliation.
            </p>
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          profile={userProfile.data}
          isLoading={userProfile.isLoading}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, variant }: { label: string; value: number | string; icon: React.ReactNode; variant: 'danger' | 'warning' | 'success' | 'info' }) {
  const bgColors = {
    danger: 'bg-red-50 border-red-100',
    warning: 'bg-yellow-50 border-yellow-100',
    success: 'bg-green-50 border-green-100',
    info: 'bg-blue-50 border-blue-100',
  };
  return (
    <div className={`${bgColors[variant]} border rounded-lg p-4`}>
      <div className="text-muted-foreground text-sm mb-1">{label}</div>
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}

interface PaginatedData<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

function Pagination({ page, lastPage, setPage }: { page: number; lastPage: number; setPage: (p: number) => void }) {
  if (lastPage <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <span className="text-sm text-muted-foreground">Page {page} of {lastPage}</span>
      <div className="flex gap-2">
        <button type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted dark:bg-background"
        >
          Previous
        </button>
        <button type="button"
          onClick={() => setPage(Math.min(lastPage, page + 1))}
          disabled={page === lastPage}
          className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted dark:bg-background"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function FlaggedContentPanel({
  data,
  isLoading,
  page,
  setPage,
  onReview,
  onViewUser,
  isPending,
}: {
  data: PaginatedData<any> | undefined;
  isLoading: boolean;
  page: number;
  setPage: (p: number) => void;
  onReview: (artifactId: number, action: string, reason: string, extras?: object) => void;
  onViewUser: (userId: number) => void;
  isPending: boolean;
}) {
  if (isLoading) return <LoadingState />;
  if (!data?.data?.length) return <EmptyState message="No flagged content" icon={<Flag className="h-8 w-8 text-muted-foreground" />} />;

  return (
    <div>
      <ul className="divide-y">
        {data.data.map((item: any) => (
          <li key={item.id} className="p-4 hover:bg-muted dark:bg-background">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground dark:text-foreground">#{item.id}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-muted dark:bg-card text-foreground dark:text-muted-foreground rounded">{item.type}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {item.flag_count} flags
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{item.content}</p>
                <button type="button"
                  onClick={() => onViewUser(item.user_id)}
                  className="text-xs text-purple-600 hover:underline mt-1 flex items-center gap-1"
                >
                  <User className="h-3 w-3" /> User #{item.user_id}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                  onClick={() => onReview(item.id, 'approve', 'Content approved')}
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button type="button"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                  onClick={() => onReview(item.id, 'remove', 'Policy violation')}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
                <button type="button"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-1"
                  onClick={() => onReview(item.id, 'throttle_user', 'Repeated abuse', { throttle_severity: 3, throttle_duration_hours: 24 })}
                >
                  <Gauge className="h-4 w-4" /> Throttle
                </button>
                <button type="button"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm dark:bg-card text-white rounded hover:dark:bg-background disabled:opacity-50 flex items-center gap-1"
                  onClick={() => onReview(item.id, 'ban_user', 'Extreme abuse')}
                >
                  <Ban className="h-4 w-4" /> Ban
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} lastPage={data.last_page ?? 1} setPage={setPage} />
    </div>
  );
}

function SpoofDetectionsPanel({
  data,
  isLoading,
  page,
  setPage,
  onReview,
  onViewUser,
  isPending,
}: {
  data: PaginatedData<any> | undefined;
  isLoading: boolean;
  page: number;
  setPage: (p: number) => void;
  onReview: (detectionId: number, action: string, reason: string, applyThrottle?: boolean) => void;
  onViewUser: (userId: number) => void;
  isPending: boolean;
}) {
  if (isLoading) return <LoadingState />;
  if (!data?.data?.length) return <EmptyState message="No pending geo-spoof detections" icon={<Zap className="h-8 w-8 text-muted-foreground" />} />;

  return (
    <div>
      <ul className="divide-y">
        {data.data.map((d: any) => (
          <li key={d.id} className="p-4 hover:bg-muted dark:bg-background">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => onViewUser(d.user_id)}
                    className="font-medium text-purple-600 hover:underline flex items-center gap-1"
                  >
                    <User className="h-4 w-4" /> User #{d.user_id}
                  </button>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    d.suspicion_score >= 80 ? 'bg-red-100 text-red-700' :
                    d.suspicion_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-muted text-foreground'
                  }`}>
                    Score: {d.suspicion_score}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Detected: {new Date(d.detected_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  onClick={() => onReview(d.id, 'confirm', 'Impossible velocity', true)}
                >
                  Confirm & Throttle
                </button>
                <button type="button"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm dark:bg-muted text-white rounded hover:dark:bg-muted disabled:opacity-50"
                  onClick={() => onReview(d.id, 'dismiss', 'Benign')}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} lastPage={data.last_page ?? 1} setPage={setPage} />
    </div>
  );
}

function ThrottlesPanel({
  data,
  isLoading,
  page,
  setPage,
  onRemove,
  onViewUser,
  isPending,
}: {
  data: PaginatedData<any> | undefined;
  isLoading: boolean;
  page: number;
  setPage: (p: number) => void;
  onRemove: (throttleId: number) => void;
  onViewUser: (userId: number) => void;
  isPending: boolean;
}) {
  if (isLoading) return <LoadingState />;
  if (!data?.data?.length) return <EmptyState message="No active throttles" icon={<Gauge className="h-8 w-8 text-muted-foreground" />} />;

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-100 text-red-700';
    if (severity >= 2) return 'bg-yellow-100 text-yellow-700';
    return 'bg-muted text-foreground';
  };

  return (
    <div>
      <ul className="divide-y">
        {data.data.map((t: any) => (
          <li key={t.id} className="p-4 hover:bg-muted dark:bg-background">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => onViewUser(t.user_id)}
                    className="font-medium text-purple-600 hover:underline flex items-center gap-1"
                  >
                    <User className="h-4 w-4" /> User #{t.user_id}
                  </button>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(t.severity)}`}>
                    Severity {t.severity}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Reason: {t.reason}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Started: {new Date(t.started_at).toLocaleString()} · 
                  Expires: {t.expires_at ? new Date(t.expires_at).toLocaleString() : 'Never'}
                </p>
              </div>
              <button type="button"
                disabled={isPending}
                className="px-3 py-1.5 text-sm dark:bg-card text-white rounded hover:dark:bg-background disabled:opacity-50 flex items-center gap-1"
                onClick={() => onRemove(t.id)}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} lastPage={data.last_page ?? 1} setPage={setPage} />
    </div>
  );
}

function ActionsPanel({
  data,
  isLoading,
  page,
  setPage,
  onViewUser,
}: {
  data: any[];
  isLoading: boolean;
  page: number;
  setPage: (p: number) => void;
  onViewUser: (userId: number) => void;
}) {
  if (isLoading) return <LoadingState />;
  if (!data.length) return <EmptyState message="No actions yet" icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />} />;

  const getActionColor = (actionType: string) => {
    if (actionType.includes('ban')) return 'bg-red-100 text-red-700';
    if (actionType.includes('throttle')) return 'bg-yellow-100 text-yellow-700';
    if (actionType.includes('approve')) return 'bg-green-100 text-green-700';
    if (actionType.includes('remove')) return 'bg-orange-100 text-orange-700';
    return 'bg-muted text-foreground';
  };

  return (
    <div>
      <ul className="divide-y">
        {data.map((a: any) => (
          <li key={a.id} className="p-4 hover:bg-muted dark:bg-background">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getActionColor(a.action_type)}`}>
                    {a.action_type}
                  </span>
                  <span className="text-xs text-muted-foreground">by Moderator #{a.moderator_id}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {a.target_user_id && (
                    <button type="button"
                      onClick={() => onViewUser(a.target_user_id)}
                      className="text-purple-600 hover:underline flex items-center gap-1"
                    >
                      <User className="h-3 w-3" /> Target User #{a.target_user_id}
                    </button>
                  )}
                  {a.target_artifact_id && (
                    <span>Artifact #{a.target_artifact_id}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserProfileModal({
  userId,
  profile,
  isLoading,
  onClose,
}: {
  userId: number;
  profile: any | undefined;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-card dark:bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-card dark:bg-card border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" /> User #{userId} Profile
            </h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-muted dark:bg-card rounded-full" aria-label="Close modal" title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted dark:bg-card rounded animate-pulse" />
                ))}
              </div>
            ) : profile ? (
              <div className="space-y-6">
                {/* User Info */}
                <div>
                  <h3 className="font-medium text-foreground dark:text-muted-foreground mb-2">Account Info</h3>
                  <div className="bg-muted dark:bg-background rounded-lg p-4 space-y-2">
                    <p><span className="text-muted-foreground">Email:</span> {profile.user?.email ?? '—'}</p>
                    <p><span className="text-muted-foreground">Created:</span> {profile.user?.created_at ? new Date(profile.user.created_at).toLocaleString() : '—'}</p>
                  </div>
                </div>

                {/* Moderation Stats */}
                <div>
                  <h3 className="font-medium text-foreground dark:text-muted-foreground mb-2">Moderation Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-red-600">Total Flags Received</p>
                      <p className="text-2xl font-bold text-red-700">{profile.moderation_stats?.total_flags_received ?? 0}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-yellow-600">Active Throttles</p>
                      <p className="text-2xl font-bold text-yellow-700">{profile.moderation_stats?.active_throttles ?? 0}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-orange-600">Confirmed Spoofs</p>
                      <p className="text-2xl font-bold text-orange-700">{profile.moderation_stats?.confirmed_spoofs ?? 0}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-purple-600">Moderation Actions</p>
                      <p className="text-2xl font-bold text-purple-700">{profile.moderation_stats?.moderation_actions ?? 0}</p>
                    </div>
                  </div>
                </div>

                {/* Throttle Stats */}
                {profile.throttle_stats && (
                  <div>
                    <h3 className="font-medium text-foreground dark:text-muted-foreground mb-2">Throttle Details</h3>
                    <div className="bg-muted dark:bg-background rounded-lg p-4 space-y-2">
                      <p><span className="text-muted-foreground">Cumulative Score:</span> {profile.throttle_stats.cumulative_score ?? 0}</p>
                      <p><span className="text-muted-foreground">Is Throttled:</span> {profile.throttle_stats.is_throttled ? 'Yes' : 'No'}</p>
                      <p><span className="text-muted-foreground">Current Severity:</span> {profile.throttle_stats.current_severity ?? 0}</p>
                    </div>
                  </div>
                )}

                {/* Recent Spoof Detections */}
                {profile.recent_spoof_detections?.length > 0 && (
                  <div>
                    <h3 className="font-medium text-foreground dark:text-muted-foreground mb-2">Recent Spoof Detections</h3>
                    <ul className="bg-muted dark:bg-background rounded-lg divide-y divide-gray-200">
                      {profile.recent_spoof_detections.slice(0, 5).map((s: any) => (
                        <li key={s.id} className="p-3 text-sm">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            s.is_confirmed_spoof ? 'bg-red-100 text-red-700' : 'bg-muted text-foreground'
                          }`}>
                            {s.is_confirmed_spoof ? 'Confirmed' : 'Pending'}
                          </span>
                          <span className="ml-2 text-muted-foreground">Score: {s.suspicion_score}</span>
                          <span className="ml-2 text-muted-foreground">{new Date(s.detected_at).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recent Moderation Actions */}
                {profile.recent_moderation_actions?.length > 0 && (
                  <div>
                    <h3 className="font-medium text-foreground dark:text-muted-foreground mb-2">Recent Actions Against User</h3>
                    <ul className="bg-muted dark:bg-background rounded-lg divide-y divide-gray-200">
                      {profile.recent_moderation_actions.slice(0, 5).map((a: any) => (
                        <li key={a.id} className="p-3 text-sm flex justify-between items-center">
                          <span className="font-medium text-foreground dark:text-muted-foreground">{a.action_type}</span>
                          <span className="text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Unable to load user profile.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-8 text-center">
      <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto animate-spin" />
      <p className="text-muted-foreground mt-2">Loading...</p>
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="p-8 text-center">
      {icon}
      <p className="text-muted-foreground mt-2">{message}</p>
    </div>
  );
}

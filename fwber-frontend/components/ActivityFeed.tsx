'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  MessageSquare, 
  Eye, 
  UserPlus, 
  Star, 
  Gift,
  Sparkles,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import UserAvatar from './UserAvatar';
import { api } from '@/lib/api/client';
import { PresenceIndicator, usePresenceContext } from './realtime/PresenceComponents';

interface ActivityItem {
  id: string;
  type: 'match' | 'message' | 'view' | 'like' | 'friend' | 'gift' | 'mutual_like';
  user: {
    id: number;
    name: string;
    avatar_url?: string;
  };
  timestamp: string;
  message?: string;
  matchScore?: number;
}

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
  showRefresh?: boolean;
}

export function ActivityFeed({ 
  className = '', 
  maxItems = 10,
  showRefresh = true 
}: ActivityFeedProps) {
  const { token } = useAuth();
  const { onlineUsers } = usePresenceContext();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a Set of online user IDs for efficient lookup
  const onlineUserIds = useMemo(() => {
    return new Set((onlineUsers || []).map(u => u.user_id));
  }, [onlineUsers]);

  // Fetch activities
  const fetchActivities = useCallback(async (showRefreshing = false) => {
    if (!token) return;

    if (showRefreshing) {
      setIsRefreshing(true);
    }

    try {
      const data = await api.get<ActivityItem[]>(`/dashboard/activity?limit=${maxItems}`);
      setActivities(Array.isArray(data) ? data : (data as any)?.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('Unable to load activity feed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, maxItems]);

  useEffect(() => {
    fetchActivities();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchActivities(), 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  // Get icon for activity type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'match':
      case 'mutual_like':
        return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'view':
        return <Eye className="w-4 h-4 text-purple-500" />;
      case 'like':
        return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
      case 'friend':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'gift':
        return <Gift className="w-4 h-4 text-orange-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Get activity description
  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'match':
        return 'matched with you!';
      case 'mutual_like':
        return 'It\'s a mutual match! 💕';
      case 'message':
        const msg = activity.message || '';
        return msg.length > 0 
          ? `sent you a message: "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}"`
          : 'sent you a message';
      case 'view':
        return 'viewed your profile';
      case 'like':
        return 'liked your profile';
      case 'friend':
        return 'sent you a friend request';
      case 'gift':
        return 'sent you a gift!';
      default:
        return 'interacted with you';
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return time.toLocaleDateString();
  };

  // Get background style based on activity type
  const getActivityBgStyle = (type: ActivityItem['type']) => {
    switch (type) {
      case 'match':
      case 'mutual_like':
        return 'bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border-pink-200 dark:border-pink-800';
      case 'message':
        return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-card dark:bg-card border-border dark:border-border';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-card dark:bg-card rounded-xl border border-border dark:border-border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3">
              <div className="w-10 h-10 bg-muted dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-muted dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card dark:bg-card rounded-xl border border-border dark:border-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-border">
        <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          Recent Activity
        </h3>
        {showRefresh && (
          <button type="button"
            onClick={() => fetchActivities(true)}
            disabled={isRefreshing}
            className="p-2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground rounded-lg hover:bg-muted dark:bg-card dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {error ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground dark:text-muted-foreground text-sm">{error}</p>
            <button type="button"
              onClick={() => fetchActivities()}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground dark:text-muted-foreground mb-2" />
            <p className="text-muted-foreground dark:text-muted-foreground text-sm">No recent activity</p>
            <p className="text-muted-foreground dark:text-muted-foreground text-xs mt-1">
              Your activity will appear here
            </p>
          </div>
        ) : (
          (Array.isArray(activities) ? activities : []).filter(a => a && a.user).map((activity) => (
            <Link
              key={activity.id}
              href={
                activity.type === 'message' 
                  ? `/messages?user=${activity.user.id}` 
                  : activity.type === 'match' || activity.type === 'mutual_like'
                    ? activity.user?.id
                      ? `/profile/${activity.user.id}`
                      : `/matches`
                    : activity.type === 'friend'
                      ? `/friends`
                      : `/profile/${activity.user.id}`
              }
              className={`flex items-start gap-3 p-4 hover:bg-muted dark:bg-background dark:hover:bg-gray-700/50 transition-colors ${getActivityBgStyle(activity.type)} border-l-4`}
            >
              {/* User Avatar with Presence */}
              <div className="relative flex-shrink-0">
                <UserAvatar
                        src={activity.user?.avatar_url}
                        name={activity.user?.name}
                        userId={activity.user?.id}
                        size={40}
                      />
                {/* Presence Indicator */}
                {activity.user?.id && (
                  <PresenceIndicator 
                    userId={String(activity.user.id)} 
                    size="sm" 
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                )}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {getActivityIcon(activity.type)}
                  <span className="font-medium text-foreground dark:text-foreground truncate">
                    {activity.user?.name || 'Anonymous User'}
                  </span>
                  {activity.user?.id && onlineUserIds.has(String(activity.user.id)) && (
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                      Online
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  {getActivityDescription(activity)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                  {activity.matchScore && (
                    <span className="text-xs text-pink-500 font-medium">
                      {activity.matchScore}% match
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* View All Link */}
      {activities.length > 0 && (
        <div className="p-3 bg-muted dark:bg-background dark:bg-gray-700/50 border-t border-border dark:border-border text-center">
          <Link 
            href="/activity"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}

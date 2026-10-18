'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, X, MessageSquare, Heart, UserPlus, Eye, AlertCircle, Gift, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { PresenceIndicator } from '@/components/realtime/PresenceComponents';

interface Notification {
  id: string;
  type: 'message' | 'match' | 'like' | 'friend_request' | 'view' | 'system' | 'gift' | 'event';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  data?: {
    user_id?: number;
    user_name?: string;
    match_id?: number;
    matched_user_id?: number;
    target_user_id?: number;
    conversation_id?: number;
    gift_id?: number;
    event_id?: number;
  };
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (authLoading || !isAuthenticated || !token) return;

    try {
      const data = await api.get<{ unread_count?: number }>('/notifications/count');
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, [authLoading, isAuthenticated, token]);

  const fetchNotifications = useCallback(async () => {
    if (authLoading || !isAuthenticated || !token) return;

    setIsLoading(true);
    try {
      const data = await api.get<{ notifications?: Notification[]; unread_count?: number }>('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, token]);

  const markAsRead = async (notificationId: string) => {
    if (!token) return;

    try {
      await api.post(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) {
      return;
    }

    const refresh = isOpen ? fetchNotifications : fetchUnreadCount;
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [authLoading, fetchNotifications, fetchUnreadCount, isAuthenticated, isOpen, token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-bell')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'match': return <Heart className="h-4 w-4 text-pink-500" />;
      case 'like': return <Heart className="h-4 w-4 text-red-500" />;
      case 'friend_request': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'view': return <Eye className="h-4 w-4 text-purple-500" />;
      case 'gift': return <Gift className="h-4 w-4 text-pink-400" />;
      case 'event': return <Calendar className="h-4 w-4 text-blue-400" />;
      case 'system': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationLink = (notification: Notification): string => {
    switch (notification.type) {
      case 'message':
        return `/messages?user=${notification.data?.user_id}`;
      case 'match': {
        const userId = notification.data?.user_id ?? notification.data?.matched_user_id ?? notification.data?.target_user_id;
        return userId ? `/profile/${userId}` : `/matches`;
      }
      case 'friend_request':
        return `/friends`;
      case 'view':
        return `/profile/${notification.data?.user_id}`;
      case 'gift':
        return `/wallet?tab=gifts`;
      case 'event':
        return `/events/${notification.data?.event_id ?? ''}`;
      default:
        return '#';
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`notification-bell relative ${className}`}>
      <button type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-muted dark:bg-card transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card dark:bg-card rounded-xl shadow-xl border border-border dark:border-border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-muted dark:bg-background">
            <h3 className="font-semibold text-foreground dark:text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-muted"
                aria-label="Close notifications"
                title="Close"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={getNotificationLink(notification)}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-start gap-3 p-4 hover:bg-muted dark:bg-background transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.data?.user_id ? (
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                            {notification.data.user_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator
                              userId={String(notification.data.user_id)}
                              size="sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-muted dark:bg-card rounded-full flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground dark:text-foreground truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>

                    {!notification.read && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3 bg-muted dark:bg-background">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NotificationDot({ className = '' }: { className?: string }) {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) return;

    const fetchCount = async () => {
      try {
        const data = await api.get<{ unread_count?: number }>('/notifications/count');
        setUnreadCount(data.unread_count || 0);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [authLoading, isAuthenticated, token]);

  if (unreadCount === 0) return null;

  return (
    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ${className}`}>
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}

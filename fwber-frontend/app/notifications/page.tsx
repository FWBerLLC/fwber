'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { api } from '@/lib/api/client'
import { getNotificationRoute, normalizeNotificationType } from '@/lib/notifications'
import { Bell, MessageSquare, Heart, UserPlus, Eye, AlertCircle, Gift, Calendar, CheckCheck, Sparkles } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  timestamp: string
  read: boolean
  data?: Record<string, unknown>
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = async () => {
    try {
      const data = await api.get<{ notifications?: Notification[] }>('/notifications')
      setNotifications(data.notifications || [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const markAsRead = async (notificationId: string) => {
    await api.post(`/notifications/${notificationId}/read`)
    setNotifications((current) => current.map((notification) => notification.id === notificationId ? { ...notification, read: true } : notification))
  }

  const markAllAsRead = async () => {
    await api.post('/notifications/read-all')
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }

  const getIcon = (type: string) => {
    switch (normalizeNotificationType(type)) {
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'match':
        return <Heart className="h-4 w-4 text-pink-500" />
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-green-500" />
      case 'view':
        return <Eye className="h-4 w-4 text-purple-500" />
      case 'gift':
        return <Gift className="h-4 w-4 text-orange-500" />
      case 'event':
        return <Calendar className="h-4 w-4 text-cyan-500" />
      case 'wingman_nudge':
        return <Sparkles className="h-4 w-4 text-purple-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Notifications" />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Notifications</h1>
              </div>
              <button type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border dark:border-border bg-card shadow-sm dark:dark:border-border dark:bg-background">
            {isLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Loading notifications…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={getNotificationRoute(notification)}
                    onClick={() => {
                      if (!notification.read) {
                        void markAsRead(notification.id)
                      }
                    }}
                    className={`block p-4 transition hover:bg-muted dark:bg-background dark:hover:dark:bg-card/50 ${notification.read ? '' : 'bg-blue-50/70 dark:bg-blue-950/20'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-full bg-muted p-2 dark:bg-card">
                        {getIcon(notification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="font-medium text-foreground dark:text-foreground">{notification.title}</h2>
                          {!notification.read ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">New</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{notification.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{new Date(notification.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { api } from '@/lib/api/client'
import { Clock, Heart, MessageSquare, Eye, UserPlus, Gift, Sparkles } from 'lucide-react'

interface ActivityItem {
  id?: string
  type: 'match' | 'message' | 'view' | 'like' | 'friend' | 'gift' | 'mutual_like'
  user: {
    id: number
    name: string
    avatar_url?: string | null
  }
  timestamp: string
  message?: string
  match_score?: number
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<ActivityItem[]>('/dashboard/activity?limit=50')
        setActivities(Array.isArray(data) ? data : [])
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'match':
      case 'mutual_like':
        return <Heart className="h-4 w-4 text-pink-500" />
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'view':
        return <Eye className="h-4 w-4 text-purple-500" />
      case 'friend':
        return <UserPlus className="h-4 w-4 text-green-500" />
      case 'gift':
        return <Gift className="h-4 w-4 text-orange-500" />
      default:
        return <Sparkles className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'match':
      case 'mutual_like':
        return 'matched with you'
      case 'message':
        return activity.message ? `sent a message: ${activity.message}` : 'sent you a message'
      case 'view':
        return 'viewed your profile'
      case 'like':
        return 'liked your profile'
      case 'friend':
        return 'sent you a friend request'
      case 'gift':
        return 'sent you a gift'
      default:
        return 'interacted with you'
    }
  }

  const getHref = (activity: ActivityItem) => {
    if (activity.type === 'message') {
      return `/messages?user=${activity.user.id}`
    }
    if (activity.type === 'friend') {
      return '/friends'
    }
    if (activity.type === 'match' || activity.type === 'mutual_like') {
      return activity.user?.id ? `/profile/${activity.user.id}` : '/matches'
    }
    return `/profile/${activity.user.id}`
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Activity" />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Activity</h1>
            <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
              The full-screen activity view so dashboard feed links and social surfaces land on a real page instead of a dead route.
            </p>
          </div>

          <div className="rounded-2xl border border-border dark:border-border bg-card shadow-sm dark:dark:border-border dark:bg-background">
            {isLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Loading activity…</div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground">No recent activity yet.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {(activities || []).map((activity, index) => (
                  <Link
                    key={`${activity.type}-${activity.user.id}-${activity.timestamp}-${index}`}
                    href={getHref(activity)}
                    className="block p-4 transition hover:bg-muted dark:bg-background dark:hover:dark:bg-card/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-full bg-muted p-2 dark:bg-card">
                        {getIcon(activity.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground dark:text-foreground">{activity.user.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{getDescription(activity)}</div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(activity.timestamp).toLocaleString()}
                          {activity.match_score ? <span>· {activity.match_score}% match</span> : null}
                        </div>
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

'use client'

import { useEffect, useState } from 'react'
import {
  Lock,
  CheckCircle2,
  Trophy,
  Flame,
  Heart,
  Eye,
  MessageCircle,
  Users,
  Zap,
  UserCheck,
} from 'lucide-react'
import { ApiError, apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

interface Achievement {
  id: number
  name: string
  description: string
  icon: string
  category: string
  reward_tokens: number
  is_unlocked: boolean
  unlocked_at: string | null
  is_hidden: boolean
}

interface AchievementsResponse {
  achievements: Achievement[]
}

const iconMap: Record<string, any> = {
  trophy: Trophy,
  flame: Flame,
  heart: Heart,
  eye: Eye,
  'message-circle': MessageCircle,
  users: Users,
  zap: Zap,
  'user-check': UserCheck,
}

export function AchievementsList() {
  const { token, isAuthenticated } = useAuth()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setAchievements([])
      setIsLoading(false)
      return
    }

    apiClient
      .get<AchievementsResponse>('/achievements')
      .then((res) => {
        setAchievements((res as any)?.data?.achievements || (res as any)?.achievements || [])
        setIsLoading(false)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.isAuthError) {
          setAchievements([])
          setIsLoading(false)
          return
        }
        console.error('Failed to fetch achievements', err)
        setIsLoading(false)
      })
  }, [isAuthenticated, token])

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted dark:bg-card" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {(achievements || []).map((achievement) => {
        const Icon = iconMap[achievement.icon] || Trophy

        if (achievement.is_hidden && !achievement.is_unlocked) {
          return null
        }

        return (
          <div
            key={achievement.id}
            className={`flex items-start gap-3 rounded-lg border p-3 transition-all duration-300 ${
              achievement.is_unlocked
                ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10'
                : 'border-border bg-muted opacity-70 dark:border-border dark:bg-card'
            }`}
          >
            <div
              className={`rounded-full p-2 ${
                achievement.is_unlocked
                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-muted text-muted-foreground dark:dark:bg-muted dark:text-muted-foreground'
              }`}
            >
              {achievement.is_unlocked ? (
                <Icon className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4
                  className={`text-sm font-semibold ${
                    achievement.is_unlocked
                      ? 'text-foreground dark:text-foreground'
                      : 'text-muted-foreground dark:text-muted-foreground'
                  }`}
                >
                  {achievement.name}
                </h4>
                {achievement.is_unlocked && (
                  <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Unlocked
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
                {achievement.description}
              </p>
              {achievement.reward_tokens > 0 && (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Trophy className="h-3 w-3" />+{achievement.reward_tokens} Tokens
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

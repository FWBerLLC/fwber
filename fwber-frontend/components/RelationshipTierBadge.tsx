'use client'

import { RelationshipTier, getTierInfo, getTierProgress, type TierProgress } from '@/lib/relationshipTiers'
import { Lock, Unlock, CheckCircle, Circle } from 'lucide-react'

interface RelationshipTierBadgeProps {
  tier: RelationshipTier
  messagesExchanged?: number
  daysConnected?: number
  hasMetInPerson?: boolean
  showProgress?: boolean
  compact?: boolean
  className?: string
}

export default function RelationshipTierBadge({
  tier,
  messagesExchanged = 0,
  daysConnected = 0,
  hasMetInPerson = false,
  showProgress = false,
  compact = false,
  className = ''
}: RelationshipTierBadgeProps) {
  const tierInfo = getTierInfo(tier, messagesExchanged, daysConnected, hasMetInPerson)
  const progress = getTierProgress(tier, messagesExchanged, daysConnected, hasMetInPerson)

  // Safety check for SSR
  if (!tierInfo || !tierInfo.color) {
    return null
  }

  const colorClasses = {
    gray: 'bg-muted dark:bg-card text-foreground dark:text-muted-foreground border-border dark:border-border',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600',
    pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-600',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600'
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${colorClasses[tierInfo.color as keyof typeof colorClasses]} ${className}`}>
        <span className="text-sm">{tierInfo.icon}</span>
        <span className="text-xs font-semibold">{tierInfo.name}</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[tierInfo.color as keyof typeof colorClasses]} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{tierInfo.icon}</span>
          <div>
            <h3 className="font-bold text-lg">{tierInfo.name}</h3>
            <p className="text-sm opacity-80">{tierInfo.description}</p>
          </div>
        </div>
        {progress.realPhotosVisible > 0 && (
          <div className="text-sm font-semibold">
            {progress.realPhotosVisible} {progress.realPhotosVisible === 1 ? 'photo' : 'photos'}
          </div>
        )}
      </div>

      {/* Unlocks */}
      <div className="mb-3">
        <p className="text-xs font-semibold mb-2 opacity-70">What&apos;s unlocked:</p>
        <ul className="space-y-1">
          {tierInfo.unlocks.map((unlock, i) => (
            <li key={i} className="text-xs flex items-start gap-2">
              <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{unlock}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Progress to next tier */}
      {showProgress && progress.nextTier && (
        <div className="mt-4 pt-4 border-t border-current/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold opacity-70">Progress to {getTierInfo(progress.nextTier).name}:</p>
            <Unlock className="w-3 h-3 opacity-50" />
          </div>
          <div className="space-y-1.5">
            {getTierInfo(progress.nextTier, messagesExchanged, daysConnected, hasMetInPerson).requirements.map((req, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {req.met ? (
                  <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="w-3 h-3 opacity-40" />
                )}
                <span className={req.met ? 'line-through opacity-60' : ''}>{req.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
